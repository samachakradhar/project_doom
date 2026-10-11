import hashlib
import time
import uuid
import threading
from typing import Dict, Any, Optional
from services.medical_record_repository import MedicalRecordRepository

class DocumentJob:
    """Represents an active document processing session."""
    def __init__(self, doc_id: str, filename: str, mime_type: str, user_id: str = "default_user"):
        self.doc_id = doc_id
        self.filename = filename
        self.mime_type = mime_type
        self.user_id = user_id
        self.status = "queued"  # queued | validating | ocr | extracting | completed | failed
        self.progress = 0
        self.error_message: Optional[str] = None
        self.created_at = time.time()
        self.updated_at = time.time()
        
        # Results
        self.pages = []
        self.full_raw_text = ""
        self.classification = None
        self.structured_extraction = None
        self.complete_report = None
        self.fingerprint = ""
        self.vault_path: Optional[str] = None
        self.file_size: int = 0

    def to_status_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.doc_id,
            "filename": self.filename,
            "status": self.status,
            "progress": self.progress,
            "error": self.error_message,
            "page_count": len(self.pages),
            "is_medical": self.classification.get("is_medical") if self.classification else True,
            "category": self.classification.get("category") if self.classification else "processing",
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }


class DocumentManager:
    """
    Thread-safe in-memory cache and document job tracker backed by SQLite MedicalRecordRepository.
    Provides SHA-256 caching to avoid redundant OCR computations and persistent storage.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DocumentManager, cls).__new__(cls)
                cls._instance._jobs: Dict[str, DocumentJob] = {}
                cls._instance._fingerprint_cache: Dict[str, str] = {}  # sha256 -> doc_id
                cls._instance._repo = MedicalRecordRepository()
        return cls._instance

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def create_job(self, filename: str, mime_type: str, content: bytes, user_id: str = "default_user") -> DocumentJob:
        fingerprint = self.compute_sha256(content)
        
        # Save file to private document vault
        vault_path, safe_name, file_size, _ = self._repo.save_file_to_vault(user_id, content, filename, mime_type)

        # Check cache
        with self._lock:
            if fingerprint in self._fingerprint_cache:
                existing_id = self._fingerprint_cache[fingerprint]
                if existing_id in self._jobs and self._jobs[existing_id].status == "completed":
                    # Reuse cached result under a new session reference
                    cached_job = self._jobs[existing_id]
                    new_doc_id = str(uuid.uuid4())
                    job = DocumentJob(new_doc_id, filename, mime_type, user_id)
                    job.status = "completed"
                    job.progress = 100
                    job.pages = cached_job.pages
                    job.full_raw_text = cached_job.full_raw_text
                    job.classification = cached_job.classification
                    job.structured_extraction = cached_job.structured_extraction
                    job.complete_report = cached_job.complete_report
                    job.fingerprint = fingerprint
                    job.vault_path = vault_path
                    job.file_size = file_size
                    self._jobs[new_doc_id] = job
                    
                    # Persist record in SQLite
                    self._persist_job(job)
                    return job

            doc_id = str(uuid.uuid4())
            job = DocumentJob(doc_id, filename, mime_type, user_id)
            job.fingerprint = fingerprint
            job.vault_path = vault_path
            job.file_size = file_size
            self._jobs[doc_id] = job
            self._fingerprint_cache[fingerprint] = doc_id
            
            # Initial persistence in SQLite
            self._persist_job(job)
            return job

    def get_job(self, doc_id: str, user_id: Optional[str] = None) -> Optional[DocumentJob]:
        with self._lock:
            job = self._jobs.get(doc_id)
            if job:
                if user_id and user_id != "admin" and job.user_id != user_id and job.user_id != "default_user" and user_id != "default_user":
                    return None  # Authorization check: restrict cross-user access
                return job

        # Fallback to persistent SQLite repository if not in memory
        rec = self._repo.get_record(doc_id, user_id=user_id)
        if rec:
            restored_job = DocumentJob(
                doc_id=rec["id"],
                filename=rec["filename"],
                mime_type=rec.get("mime_type", "application/pdf"),
                user_id=rec.get("user_id", "default_user")
            )
            restored_job.status = rec.get("status", "completed")
            restored_job.progress = 100 if restored_job.status == "completed" else 0
            restored_job.created_at = rec.get("created_at", time.time())
            restored_job.updated_at = rec.get("updated_at", time.time())
            restored_job.pages = rec.get("pages", [])
            restored_job.full_raw_text = rec.get("raw_text", "")
            restored_job.classification = rec.get("classification")
            restored_job.structured_extraction = rec.get("structured_extraction")
            restored_job.complete_report = rec.get("complete_report")
            restored_job.vault_path = rec.get("vault_path")
            restored_job.file_size = rec.get("file_size", 0)
            
            with self._lock:
                self._jobs[doc_id] = restored_job
            return restored_job

        return None

    def update_job_status(self, doc_id: str, status: str, progress: int = 0, error: Optional[str] = None):
        with self._lock:
            if doc_id in self._jobs:
                job = self._jobs[doc_id]
                job.status = status
                job.progress = progress
                job.error_message = error
                job.updated_at = time.time()
                self._persist_job(job)

    def _persist_job(self, job: DocumentJob):
        """Helper to write or update record in SQLite."""
        try:
            report_date = None
            patient_name = None
            facility = None
            if job.structured_extraction:
                report_date = job.structured_extraction.get("date_issued")
                patient_name = job.structured_extraction.get("patient_name")
                facility = job.structured_extraction.get("prescriber_or_facility")

            category = "other"
            is_med = True
            if job.classification:
                category = job.classification.get("category", "other")
                is_med = job.classification.get("is_medical", True)

            self._repo.save_record(
                record_id=job.doc_id,
                user_id=job.user_id,
                filename=job.filename,
                mime_type=job.mime_type,
                vault_path=job.vault_path,
                file_size=job.file_size,
                sha256_fingerprint=job.fingerprint,
                category=category,
                is_medical=is_med,
                status=job.status,
                upload_timestamp=job.created_at,
                report_date=report_date,
                patient_name=patient_name,
                facility_or_doctor=facility,
                raw_text=job.full_raw_text,
                pages=job.pages,
                classification=job.classification,
                structured_extraction=job.structured_extraction,
                complete_report=job.complete_report,
                error_message=job.error_message
            )
        except Exception as e:
            # Non-blocking persistence warning
            pass

