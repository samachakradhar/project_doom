import logging
import asyncio
from typing import Dict, Any, List
from services.pdf_processor import DocumentValidator, PDFProcessor
from services.image_preprocessor import ImagePreprocessor
from services.ocr_engine import MedicalOCREngine, OCRPageResult
from services.document_classifier import DocumentClassifier
from services.medical_extractor import MedicalExtractor, StructuredMedicalDocument
from services.medical_report_engine import MedicalReportGenerator, CompleteMedicalReport
from services.document_manager import DocumentManager, DocumentJob

logger = logging.getLogger("DOOM_DOC_SERVICE")

class DocumentService:
    """
    Master pipeline orchestrator:
    Upload -> Validation -> PDF text extraction / OpenCV Preprocessing -> OCR ->
    Classification -> Structured Extraction -> Clinical Verification -> Multilingual Grounding.
    """

    def __init__(self):
        self.ocr_engine = MedicalOCREngine()
        self.classifier = DocumentClassifier()
        self.extractor = MedicalExtractor()
        self.manager = DocumentManager()

    async def process_document_async(self, doc_id: str, file_bytes: bytes, filename: str):
        """Executes the full pipeline in a thread or task without blocking the server."""
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._process_sync, doc_id, file_bytes, filename)

    def _process_sync(self, doc_id: str, file_bytes: bytes, filename: str):
        try:
            self.manager.update_job_status(doc_id, "validating", 10)
            mime_type, ext = DocumentValidator.validate_file(file_bytes, filename)

            pages_data = []
            full_text_parts = []
            preview_image_bytes = None

            # 1. Document ingestion and OCR
            self.manager.update_job_status(doc_id, "ocr", 30)

            if ext == "pdf":
                raw_pages = PDFProcessor.process_pdf(file_bytes)
                for p in raw_pages:
                    page_num = p["page_number"]
                    if not p["is_scanned"]:
                        # Embedded digital text
                        p_res = {
                            "page_number": page_num,
                            "full_text": p["text"],
                            "lines": p["blocks"],
                            "mean_confidence": 1.0,
                            "words_count": len(p["text"].split()),
                            "engine": "PyMuPDF-Digital"
                        }
                    else:
                        # Scanned page: Preprocess with OpenCV and run OCR
                        preprocessed_bgr = ImagePreprocessor.preprocess_image(p["image_bytes"])
                        prep_jpeg = ImagePreprocessor.to_jpeg_bytes(preprocessed_bgr)
                        if preview_image_bytes is None:
                            preview_image_bytes = prep_jpeg
                        ocr_res = self.ocr_engine.ocr_image(prep_jpeg, page_number=page_num)
                        p_res = ocr_res.model_dump()

                    pages_data.append(p_res)
                    if p_res.get("full_text"):
                        full_text_parts.append(p_res["full_text"])
            else:
                # Image document (JPG, PNG, WebP)
                preprocessed_bgr = ImagePreprocessor.preprocess_image(file_bytes)
                prep_jpeg = ImagePreprocessor.to_jpeg_bytes(preprocessed_bgr)
                preview_image_bytes = prep_jpeg
                ocr_res = self.ocr_engine.ocr_image(prep_jpeg, page_number=1, mime_type="image/jpeg")
                p_res = ocr_res.model_dump()
                pages_data.append(p_res)
                if p_res.get("full_text"):
                    full_text_parts.append(p_res["full_text"])

            full_ocr_text = "\n\n".join(full_text_parts).strip()

            # 2. Document Classification
            self.manager.update_job_status(doc_id, "classifying", 65)
            classification = self.classifier.classify_from_ocr(
                extracted_text=full_ocr_text,
                image_bytes=preview_image_bytes,
                mime_type="image/jpeg"
            )

            # 3. Structured Clinical Extraction and Verification
            self.manager.update_job_status(doc_id, "extracting", 80)
            structured_doc = self.extractor.extract_and_verify(
                full_ocr_text=full_ocr_text,
                document_category=classification.category,
                page_results=pages_data,
                is_medical=classification.is_medical
            )

            # 4. Generate 8-Section Multilingual Report
            self.manager.update_job_status(doc_id, "generating_report", 92)
            complete_report = MedicalReportGenerator.generate_full_report(
                document_category=classification.category,
                is_medical=classification.is_medical,
                extracted_data=structured_doc.model_dump(),
                raw_ocr_text=full_ocr_text
            )

            # 5. Finalize Job
            job = self.manager.get_job(doc_id)
            if job:
                job.pages = pages_data
                job.full_raw_text = full_ocr_text
                job.classification = classification.model_dump()
                job.structured_extraction = structured_doc.model_dump()
                job.complete_report = complete_report.model_dump()
                job.status = "completed"
                job.progress = 100
                logger.info(f"Document {doc_id} processed successfully as {classification.category}.")

        except Exception as e:
            logger.error(f"Error processing document {doc_id}: {e}", exc_info=True)
            self.manager.update_job_status(doc_id, "failed", 0, str(e))
