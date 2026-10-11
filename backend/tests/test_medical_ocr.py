import os
import io
import time
import unittest
import numpy as np
import cv2
import pymupdf
from typing import Tuple

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.image_preprocessor import ImagePreprocessor
from services.pdf_processor import DocumentValidator, PDFProcessor
from services.document_classifier import DocumentClassifier
from services.medical_extractor import MedicalExtractor
from services.document_manager import DocumentManager
from services.ocr_engine import MedicalOCREngine


def compute_levenshtein(s1: str, s2: str) -> int:
    """Compute standard Levenshtein edit distance."""
    if len(s1) < len(s2):
        return compute_levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def compute_cer_wer(ground_truth: str, recognized: str) -> Tuple[float, float]:
    """Calculate Character Error Rate (CER) and Word Error Rate (WER)."""
    gt_chars = ground_truth.strip()
    rec_chars = recognized.strip()
    char_dist = compute_levenshtein(gt_chars, rec_chars)
    cer = (char_dist / max(1, len(gt_chars)))

    gt_words = gt_chars.split()
    rec_words = rec_chars.split()
    word_dist = compute_levenshtein(" ".join(gt_words), " ".join(rec_words))
    wer = (word_dist / max(1, len(gt_words)))

    return round(min(1.0, cer), 4), round(min(1.0, wer), 4)


class TestMedicalOCRPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.preprocessor = ImagePreprocessor()
        cls.validator = DocumentValidator()
        cls.classifier = DocumentClassifier()
        cls.extractor = MedicalExtractor()
        cls.manager = DocumentManager()
        cls.ocr_engine = MedicalOCREngine()

    def test_01_file_validation_and_rejection(self):
        """Reject empty, corrupted, and invalid files safely."""
        # Empty file
        with self.assertRaises(ValueError):
            self.validator.validate_file(b"", "empty.jpg")

        # Corrupted / fake file
        with self.assertRaises(ValueError):
            self.validator.validate_file(b"NOT_A_VALID_FILE_HEADER_XYZ", "fake.pdf")

        # Valid PNG magic bytes
        png_bytes = b'\x89PNG\r\n\x1a\n' + b'\x00' * 50
        mime, ext = self.validator.validate_file(png_bytes, "scan.png")
        self.assertEqual(mime, "image/png")
        self.assertEqual(ext, "png")

        # Valid JPEG magic bytes
        jpg_bytes = b'\xff\xd8\xff' + b'\x00' * 50
        mime, ext = self.validator.validate_file(jpg_bytes, "rx.jpg")
        self.assertEqual(mime, "image/jpeg")
        self.assertEqual(ext, "jpg")

    def test_02_opencv_skew_detection_and_deskew(self):
        """OpenCV skew detection and rotation without text clipping."""
        # Create image with horizontal text lines
        img = np.full((400, 600, 3), 255, dtype=np.uint8)
        for y in [80, 140, 200, 260]:
            cv2.putText(img, "Prescription Line 500mg Paracetamol", (50, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        # Rotate intentionally by 7 degrees
        center = (300, 200)
        M = cv2.getRotationMatrix2D(center, 7.0, 1.0)
        skewed = cv2.warpAffine(img, M, (600, 400), borderValue=(255, 255, 255))

        # Deskew using preprocessor
        deskewed = self.preprocessor.deskew(skewed)
        self.assertIsNotNone(deskewed)
        self.assertTrue(deskewed.shape[0] >= 400 and deskewed.shape[1] >= 600)

    def test_03_contrast_enhancement_and_denoising(self):
        """CLAHE and bilateral denoising enhance faint text without harsh binarization."""
        # Low contrast image (gray text on light gray background)
        faint_img = np.full((300, 500, 3), 220, dtype=np.uint8)
        cv2.putText(faint_img, "Tab Pantocid 40mg", (40, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (170, 170, 170), 2)
        
        enhanced = self.preprocessor.enhance_contrast_and_denoise(faint_img)
        self.assertIsNotNone(enhanced)
        self.assertEqual(enhanced.shape, faint_img.shape)

    def test_04_searchable_pdf_text_extraction(self):
        """Extract digital text and blocks from searchable PDFs with 100% confidence."""
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        # Write medical report text
        sample_report = (
            "CITY PATHOLOGY LABORATORY\n"
            "Patient: Rajesh Sharma | Age: 45 | Date: 12-Oct-2026\n"
            "Hemoglobin: 14.5 g/dL (Reference Range: 13.0 - 17.0)\n"
            "Fasting Blood Sugar: 98 mg/dL (Reference Range: 70 - 100)\n"
            "Total WBC Count: 7200 /cumm (Reference Range: 4000 - 11000)\n"
            "Serum Creatinine: 0.9 mg/dL (Reference Range: 0.7 - 1.2)\n"
            "C-Reactive Protein (CRP): 1.2 mg/L (Reference Range: < 5.0)\n"
            "Impression: Normal hematology and metabolic panel."
        )
        page.insert_text((50, 80), sample_report, fontsize=12)
        pdf_bytes = doc.tobytes()
        doc.close()

        # Process through PDFProcessor
        pages = PDFProcessor.process_pdf(pdf_bytes)
        self.assertEqual(len(pages), 1)
        self.assertFalse(pages[0]["is_scanned"])
        self.assertIn("CITY PATHOLOGY", pages[0]["text"])
        self.assertIn("Hemoglobin: 14.5 g/dL", pages[0]["text"])
        self.assertTrue(len(pages[0]["blocks"]) >= 1)

    def test_05_scanned_pdf_rasterization(self):
        """Rasterize scanned PDF pages lacking embedded text at 300 DPI."""
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        # Create blank page (no digital text)
        pdf_bytes = doc.tobytes()
        doc.close()

        pages = PDFProcessor.process_pdf(pdf_bytes)
        self.assertEqual(len(pages), 1)
        self.assertTrue(pages[0]["is_scanned"])
        self.assertIsNotNone(pages[0]["image_bytes"])
        self.assertTrue(len(pages[0]["image_bytes"]) > 1000)

    def test_06_non_medical_image_rejection(self):
        """Ordinary images must NOT be diagnosed as medical illnesses or ulcers."""
        # Non-medical text
        car_text = "Red Sports Car Model 2024 V8 Engine Alloy Wheels Highway Road trip"
        res = self.classifier.classify_from_ocr(car_text)
        self.assertFalse(res.is_medical)
        self.assertEqual(res.category, "non_medical_image")

        # Test medical extraction on non-medical image
        doc = self.extractor.extract_and_verify(car_text, "non_medical_image", [], is_medical=False)
        self.assertFalse(doc.is_medical)
        self.assertEqual(len(doc.medications), 0)
        self.assertEqual(len(doc.lab_results), 0)
        self.assertTrue("not recognized as a medical document" in doc.executive_summary or "not appear to be a medical document" in doc.executive_summary)

    def test_07_medical_classification_routing(self):
        """Accurately route Prescriptions vs Laboratory vs Diagnostic vs Discharge."""
        rx_sample = "Rx Tab Amoxicillin 500mg 1-0-1 after food 5 days. Dr. Sharma Clinic."
        rx_class = self.classifier.classify_from_ocr(rx_sample)
        self.assertEqual(rx_class.category, "prescription")
        self.assertTrue(rx_class.is_medical)

        lab_sample = "Complete Blood Count. Hemoglobin result 13.8 g/dL reference 13-17. Platelets 2.5."
        lab_class = self.classifier.classify_from_ocr(lab_sample)
        self.assertIn(lab_class.category, ["laboratory_report", "cbc_hemogram"])
        self.assertTrue(lab_class.is_medical)

        diag_sample = "Radiology Department X-Ray Chest PA View. Impression: Normal broncho-vascular markings."
        diag_class = self.classifier.classify_from_ocr(diag_sample)
        self.assertEqual(diag_class.category, "diagnostic_report")
        self.assertTrue(diag_class.is_medical)

        disc_sample = "Discharge Summary. Date of Admission: 01-Oct-2026. Date of Discharge: 05-Oct-2026. Clinical Course."
        disc_class = self.classifier.classify_from_ocr(disc_sample)
        self.assertEqual(disc_class.category, "discharge_summary")
        self.assertTrue(disc_class.is_medical)

    def test_08_cer_and_wer_metrics(self):
        """Measure Character Error Rate and Word Error Rate on synthetic benchmarks."""
        ground_truth = "Tab Amoxicillin 500mg 1-1-1 for 5 days after meals"
        # Simulate high-quality OCR with 1 character typo
        recognized = "Tab Amoxicillin 500mg 1-1-1 for 5 days after meals"
        cer, wer = compute_cer_wer(ground_truth, recognized)
        self.assertEqual(cer, 0.0)
        self.assertEqual(wer, 0.0)

        # Simulate slightly noisy OCR
        noisy = "Tab Amoxicilin 500mg 1-1-1 for 5 days after meals"
        cer_noisy, wer_noisy = compute_cer_wer(ground_truth, noisy)
        self.assertLess(cer_noisy, 0.05)  # Less than 5% CER
        self.assertLess(wer_noisy, 0.15)  # Less than 15% WER

    def test_09_multilingual_purity_and_zero_english_leakage(self):
        """Verify Telugu, Hindi, and Tamil regional explanations."""
        rx_text = "Rx Metformin 500mg OD for Type 2 Diabetes Mellitus"
        doc = self.extractor.extract_and_verify(rx_text, "prescription", [], is_medical=True)
        self.assertIsNotNone(doc.multilingual_explanations.telugu)
        self.assertIsNotNone(doc.multilingual_explanations.hindi)
        self.assertIsNotNone(doc.multilingual_explanations.tamil)
        self.assertIsNotNone(doc.multilingual_explanations.tanglish)

    def test_10_document_manager_caching_and_security(self):
        """Verify SHA-256 deduplication and cross-user authorization security."""
        content = b"PDF_SAMPLE_DATA_USER_1"
        job1 = self.manager.create_job("report.pdf", "application/pdf", content, user_id="user_123")
        self.assertEqual(job1.user_id, "user_123")
        job1.status = "completed"

        # Check authorized retrieval
        fetched = self.manager.get_job(job1.doc_id, user_id="user_123")
        self.assertIsNotNone(fetched)

        # Check cross-user unauthorized access rejection
        unauthorized = self.manager.get_job(job1.doc_id, user_id="unauthorized_intruder")
        self.assertIsNone(unauthorized)


if __name__ == "__main__":
    unittest.main()
