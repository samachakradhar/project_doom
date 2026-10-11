import os
import sys
import unittest
import json
from typing import Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.document_classifier import DocumentClassifier
from services.medical_extractor import MedicalExtractor
from services.medical_report_engine import (
    MedicalReportGenerator,
    calculate_patient_facing_words,
    clean_for_speech_synthesis,
    CompleteMedicalReport
)
from services.document_service import DocumentService
from services.document_manager import DocumentManager


class TestAccurateMedicalReportSystem(unittest.TestCase):
    """
    Comprehensive test suite validating:
    1. CBC upload produces meaningful explanations of verified findings.
    2. Missing medication information does not generate fabricated prescriptions.
    3. All 8 sections are present with correct numbers and titles in order.
    4. Full multilingual coverage (English, Telugu, Hindi, Tamil, Tenglish).
    5. >= 150 words measured strictly on patient-facing narrative text.
    6. Non-medical document rejection with zero fabricated diagnoses.
    7. Clean speech synthesis starting at the explanation, omitting ABHA, model names, and metadata.
    8. Language switching alters both displayed sections and speech text.
    """

    @classmethod
    def setUpClass(cls):
        cls.classifier = DocumentClassifier()
        cls.extractor = MedicalExtractor()
        cls.manager = DocumentManager()
        cls.doc_service = DocumentService()

    def test_01_cbc_report_meaningful_explanations(self):
        """1. A CBC upload produces meaningful explanations of verified extracted findings."""
        cbc_text = (
            "METROPOLIS HEALTHCARE LABS\n"
            "Patient: Suresh Kumar | Age: 42 | Date: 12-Oct-2026\n"
            "Hemoglobin: 11.2 g/dL (Reference Range: 13.0 - 17.0)\n"
            "Total WBC Count: 6800 /cumm (Reference Range: 4000 - 11000)\n"
            "Platelet Count: 2.40 Lakhs/cumm (Reference Range: 1.50 - 4.50)\n"
            "Fasting Blood Sugar: 108.0 mg/dL (Reference Range: 70.0 - 100.0)\n"
            "Serum Creatinine: 0.92 mg/dL (Reference Range: 0.70 - 1.20)\n"
            "Impression: Mild anemia."
        )

        classification = self.classifier.classify_from_ocr(cbc_text)
        self.assertTrue(classification.is_medical)
        self.assertIn(classification.category, ["cbc_hemogram", "laboratory_report", "blood_glucose_hba1c"])

        extracted = self.extractor.extract_and_verify(
            full_ocr_text=cbc_text,
            document_category="cbc_hemogram",
            page_results=[],
            is_medical=True
        )
        self.assertTrue(len(extracted.lab_results) >= 3)
        
        # Verify literal values preserved
        hb = next((l for l in extracted.lab_results if "hemoglobin" in l.test_name.lower()), None)
        self.assertIsNotNone(hb)
        self.assertEqual(hb.value_numeric, 11.2)
        self.assertEqual(hb.status, "Low")

        # Generate full 8-section report
        report = MedicalReportGenerator.generate_full_report(
            document_category="cbc_hemogram",
            is_medical=True,
            extracted_data=extracted.model_dump(),
            raw_ocr_text=cbc_text
        )

        eng_rep = report.reports_by_language["english"]
        self.assertIn("Hemoglobin", eng_rep.full_markdown)
        self.assertIn("11.2", eng_rep.full_markdown)
        self.assertIn("oxygen", eng_rep.full_markdown.lower())

    def test_02_missing_medication_does_not_fabricate(self):
        """2. Missing medication information does not generate fabricated prescriptions."""
        lab_only_text = (
            "DIAGNOSTIC PATHOLOGY REPORT\n"
            "Hemoglobin: 14.2 g/dL (Reference: 13.0 - 17.0)\n"
            "Platelet Count: 2.5 Lakhs/cumm (Reference: 1.5 - 4.5)"
        )
        extracted = self.extractor.extract_and_verify(lab_only_text, "cbc_hemogram", [], is_medical=True)
        self.assertEqual(len(extracted.medications), 0)

        report = MedicalReportGenerator.generate_full_report("cbc_hemogram", True, extracted.model_dump(), lab_only_text)
        
        # Section 4 must explicitly state absence of medications
        sec_4 = report.reports_by_language["english"].sections[3]
        self.assertEqual(sec_4.id, "medications")
        self.assertIn("No prescription information was found", sec_4.content)
        self.assertNotIn("Amoxicillin", sec_4.content)
        self.assertNotIn("Paracetamol", sec_4.content)

    def test_03_all_8_sections_present_in_order(self):
        """3. No sections disappear or receive incorrect numbering."""
        sample_data = {
            "lab_results": [{"test_name": "Hemoglobin", "value_text": "12.0", "original_unit": "g/dL", "reference_interval": "13-17", "status": "Low"}],
            "medications": [],
            "safety_alerts": []
        }
        report = MedicalReportGenerator.generate_full_report("cbc_hemogram", True, sample_data)

        expected_ids = [
            "overview",
            "findings",
            "explanation",
            "medications",
            "nutrition",
            "follow_up",
            "patient_summary",
            "safety_notice"
        ]

        for lang_key, rep in report.reports_by_language.items():
            self.assertEqual(len(rep.sections), 8, f"Language {lang_key} must have exactly 8 sections")
            for idx, sec in enumerate(rep.sections, 1):
                self.assertEqual(sec.number, idx, f"Section numbering must be {idx} in {lang_key}")
                self.assertEqual(sec.id, expected_ids[idx - 1], f"Section id must match {expected_ids[idx - 1]}")
                self.assertTrue(len(sec.content.strip()) > 10, f"Section {sec.id} in {lang_key} must not be empty")

    def test_04_genuine_multilingual_coverage(self):
        """4. Every supported language produces a complete, appropriately translated answer."""
        sample_data = {
            "lab_results": [
                {"test_name": "Hemoglobin", "value_text": "11.5", "original_unit": "g/dL", "reference_interval": "13.0 - 17.0", "status": "Low"},
                {"test_name": "Fasting Blood Sugar", "value_text": "105.0", "original_unit": "mg/dL", "reference_interval": "70 - 100", "status": "High"}
            ],
            "medications": [
                {"name": "Tab Iron Folic", "dosage": "1-0-0", "timing": "After meals", "purpose": "Iron supplementation"}
            ],
            "safety_alerts": []
        }

        report = MedicalReportGenerator.generate_full_report("cbc_hemogram", True, sample_data)
        
        # English
        eng = report.reports_by_language["english"]
        self.assertIn("Document Overview", eng.sections[0].title)
        
        # Telugu
        te = report.reports_by_language["telugu"]
        self.assertIn("పత్రం అవలోకనం", te.sections[0].title)
        self.assertIn("హిమోగ్లోబిన్", te.full_markdown)
        self.assertIn("ఆహారం", te.full_markdown)

        # Hindi
        hi = report.reports_by_language["hindi"]
        self.assertIn("दस्तावेज़", hi.sections[0].title)
        self.assertIn("हीमोग्लोबिन", hi.full_markdown)
        self.assertIn("आहार", hi.full_markdown)

        # Tamil
        ta = report.reports_by_language["tamil"]
        self.assertIn("ஆவண", ta.sections[0].title)
        self.assertIn("ஹீமோகுளோபின்", ta.full_markdown)
        self.assertIn("உணவு", ta.full_markdown)

        # Tenglish (Telugu in Latin alphabet)
        teng = report.reports_by_language["tanglish"]
        self.assertIn("Tenglish", teng.language_name)
        self.assertIn("Mee", teng.full_markdown)
        self.assertIn("Hemoglobin", teng.full_markdown)
        self.assertIn("takkuva", teng.full_markdown)

    def test_05_word_count_target_150_words_excluding_headers(self):
        """5. The 150-word target is measured on patient-facing explanation text, excluding headings and metadata."""
        sample_data = {
            "lab_results": [
                {"test_name": "Hemoglobin", "value_text": "11.2", "original_unit": "g/dL", "reference_interval": "13.0 - 17.0", "status": "Low"},
                {"test_name": "Platelet Count", "value_text": "2.4", "original_unit": "Lakhs/cumm", "reference_interval": "1.5 - 4.5", "status": "Normal"},
                {"test_name": "Fasting Blood Sugar", "value_text": "110", "original_unit": "mg/dL", "reference_interval": "70 - 100", "status": "High"}
            ],
            "medications": [],
            "safety_alerts": []
        }

        report = MedicalReportGenerator.generate_full_report("cbc_hemogram", True, sample_data)

        for lang_code, rep in report.reports_by_language.items():
            self.assertGreaterEqual(
                rep.word_count,
                150,
                f"Language '{lang_code}' word count ({rep.word_count}) must meet or exceed 150 words threshold"
            )

    def test_06_non_medical_image_handling(self):
        """6. Insufficient evidence & non-medical images trigger an honest limitation without fabricated medical content."""
        car_text = "Red Sports Car Model 2024 V8 Engine Wheels Road Trip"
        cls_res = self.classifier.classify_from_ocr(car_text)
        self.assertFalse(cls_res.is_medical)
        self.assertEqual(cls_res.category, "non_medical_image")

        report = MedicalReportGenerator.generate_full_report("non_medical_image", False, {}, car_text)
        self.assertFalse(report.is_medical)
        self.assertEqual(len(report.extracted_findings), 0)
        self.assertEqual(len(report.medications), 0)
        self.assertIn("could not be identified as a medical report", report.reports_by_language["english"].patient_summary)

    def test_07_speech_text_clean_starting_sentence(self):
        """7 & 8. Speech starts at the first sentence of the actual explanation and never reads ABHA, model names, or headers."""
        sample_data = {
            "patient_name": "Rajesh Sharma",
            "lab_results": [{"test_name": "Hemoglobin", "value_text": "11.2", "original_unit": "g/dL", "reference_interval": "13.0 - 17.0", "status": "Low"}],
            "medications": [],
            "safety_alerts": []
        }

        report = MedicalReportGenerator.generate_full_report("cbc_hemogram", True, sample_data)
        eng_speech = report.reports_by_language["english"].speech_text

        # Must start with explanation sentence
        self.assertTrue(
            eng_speech.startswith("This healthcare document") or eng_speech.startswith("Hemoglobin is") or eng_speech.startswith("Based on"),
            f"Speech must start with explanation, got: {eng_speech[:60]}"
        )

        # Must NOT contain technical metadata or provider names
        self.assertNotIn("Medical Record Analysis", eng_speech)
        self.assertNotIn("Gemini Vision", eng_speech)
        self.assertNotIn("Multimodal OCR", eng_speech)
        self.assertNotIn("ABHA ID", eng_speech)
        self.assertNotIn("91-8493-2948-1092", eng_speech)
        self.assertNotIn("###", eng_speech)
        self.assertNotIn("####", eng_speech)
        self.assertNotIn("1.", eng_speech[:10])

    def test_08_speech_text_cleaner_function(self):
        """Verify clean_for_speech_synthesis removes headers, markdown and metadata."""
        dirty = (
            "### 📋 Medical Record Analysis (Gemini Vision Multimodal OCR)\n"
            "**Patient ABHA ID:** `91-8493-2948-1092`\n\n"
            "#### 1. Document Overview\n"
            "This document confirms your blood test results.\n"
            "• Hemoglobin level is 12.0 g/dL."
        )
        cleaned = clean_for_speech_synthesis(dirty)
        self.assertNotIn("###", cleaned)
        self.assertNotIn("ABHA", cleaned)
        self.assertNotIn("91-8493-2948-1092", cleaned)
        self.assertIn("This document confirms your blood test results", cleaned)


if __name__ == "__main__":
    unittest.main()
