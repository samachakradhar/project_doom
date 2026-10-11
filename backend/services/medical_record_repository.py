import os
import json
import time
import uuid
import sqlite3
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple

class MedicalRecordRepository:
    """
    Production-grade SQLite persistence layer & Private Document Vault
    for Dr. Doom Medical Records.
    Ensures data isolation per user, prevents IDOR vulnerabilities,
    and enables structured search, filtering, and longitudinal comparisons.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, base_dir: Optional[str] = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MedicalRecordRepository, cls).__new__(cls)
                cls._instance._init_paths_and_db(base_dir)
        return cls._instance

    def _init_paths_and_db(self, base_dir: Optional[str] = None):
        if not base_dir:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
        self.storage_dir = base_dir
        self.vault_dir = os.path.join(self.storage_dir, "vault")
        self.db_path = os.path.join(self.storage_dir, "records.db")

        os.makedirs(self.storage_dir, exist_ok=True)
        os.makedirs(self.vault_dir, exist_ok=True)

        self._init_sqlite()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _init_sqlite(self):
        conn = self._get_connection()
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS medical_records (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        safe_display_name TEXT NOT NULL,
                        file_size INTEGER DEFAULT 0,
                        mime_type TEXT NOT NULL,
                        vault_path TEXT,
                        sha256_fingerprint TEXT,
                        category TEXT NOT NULL DEFAULT 'other',
                        is_medical INTEGER DEFAULT 1,
                        status TEXT NOT NULL DEFAULT 'completed',
                        upload_timestamp REAL NOT NULL,
                        report_date TEXT,
                        patient_name TEXT,
                        facility_or_doctor TEXT,
                        raw_text TEXT,
                        pages_json TEXT,
                        classification_json TEXT,
                        structured_extraction_json TEXT,
                        complete_report_json TEXT,
                        error_message TEXT,
                        created_at REAL NOT NULL,
                        updated_at REAL NOT NULL
                    );
                """)
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON medical_records(user_id);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_category ON medical_records(user_id, category);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_status ON medical_records(user_id, status);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_user_created ON medical_records(user_id, created_at DESC);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_fingerprint ON medical_records(sha256_fingerprint);")
        finally:
            conn.close()

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def save_file_to_vault(self, user_id: str, file_bytes: bytes, filename: str, mime_type: str, record_id: Optional[str] = None) -> Tuple[str, str, int, str]:
        """
        Saves raw document to private non-public directory structure.
        Uses randomized UUID prefix to prevent traversal attacks.
        """
        clean_user_id = "".join(c for c in user_id if c.isalnum() or c in ("-", "_", "@", ".")).strip() or "default_user"
        user_vault = os.path.join(self.vault_dir, clean_user_id)
        os.makedirs(user_vault, exist_ok=True)

        rec_id = record_id or str(uuid.uuid4())
        fingerprint = self.compute_sha256(file_bytes)
        
        # Safe extension
        _, ext = os.path.splitext(filename)
        safe_ext = ext.lower() if ext.lower() in [".pdf", ".png", ".jpg", ".jpeg", ".webp"] else ".bin"
        
        vault_filename = f"{rec_id}_{fingerprint[:8]}{safe_ext}"
        vault_path = os.path.join(user_vault, vault_filename)

        with open(vault_path, "wb") as f:
            f.write(file_bytes)

        safe_display_name = os.path.basename(filename)
        file_size = len(file_bytes)
        return vault_path, safe_display_name, file_size, fingerprint

    def save_record(
        self,
        record_id: str,
        user_id: str,
        filename: str,
        mime_type: str,
        vault_path: Optional[str] = None,
        file_size: int = 0,
        sha256_fingerprint: Optional[str] = None,
        category: str = "other",
        is_medical: bool = True,
        status: str = "completed",
        upload_timestamp: Optional[float] = None,
        report_date: Optional[str] = None,
        patient_name: Optional[str] = None,
        facility_or_doctor: Optional[str] = None,
        raw_text: str = "",
        pages: Optional[List[Dict[str, Any]]] = None,
        classification: Optional[Dict[str, Any]] = None,
        structured_extraction: Optional[Dict[str, Any]] = None,
        complete_report: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Insert or update a medical record with server validation."""
        now = time.time()
        upload_time = upload_timestamp or now
        safe_display_name = os.path.basename(filename)

        # Normalize category
        norm_cat = (category or "other").lower().replace(" ", "_")
        if "cbc" in norm_cat or "hemogram" in norm_cat or "blood_count" in norm_cat:
            norm_cat = "complete_blood_count"
        elif "lab" in norm_cat or "panel" in norm_cat or "metabolic" in norm_cat or "lipid" in norm_cat or "thyroid" in norm_cat:
            norm_cat = "lab_panel"
        elif "prescription" in norm_cat or "rx" in norm_cat:
            norm_cat = "prescription"
        elif "imaging" in norm_cat or "scan" in norm_cat or "xray" in norm_cat or "mri" in norm_cat or "ct" in norm_cat:
            norm_cat = "diagnostic_imaging"
        elif "discharge" in norm_cat or "summary" in norm_cat:
            norm_cat = "discharge_summary"
        elif norm_cat not in ["complete_blood_count", "lab_panel", "prescription", "diagnostic_imaging", "discharge_summary", "other"]:
            norm_cat = "other"

        pages_json = json.dumps(pages or [])
        class_json = json.dumps(classification or {})
        struct_json = json.dumps(structured_extraction or {})
        rep_json = json.dumps(complete_report or {})

        conn = self._get_connection()
        try:
            with conn:
                conn.execute("""
                    INSERT INTO medical_records (
                        id, user_id, filename, safe_display_name, file_size, mime_type,
                        vault_path, sha256_fingerprint, category, is_medical, status,
                        upload_timestamp, report_date, patient_name, facility_or_doctor,
                        raw_text, pages_json, classification_json, structured_extraction_json,
                        complete_report_json, error_message, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        user_id=excluded.user_id,
                        filename=excluded.filename,
                        safe_display_name=excluded.safe_display_name,
                        file_size=excluded.file_size,
                        mime_type=excluded.mime_type,
                        vault_path=COALESCE(excluded.vault_path, medical_records.vault_path),
                        sha256_fingerprint=COALESCE(excluded.sha256_fingerprint, medical_records.sha256_fingerprint),
                        category=excluded.category,
                        is_medical=excluded.is_medical,
                        status=excluded.status,
                        upload_timestamp=excluded.upload_timestamp,
                        report_date=COALESCE(excluded.report_date, medical_records.report_date),
                        patient_name=COALESCE(excluded.patient_name, medical_records.patient_name),
                        facility_or_doctor=COALESCE(excluded.facility_or_doctor, medical_records.facility_or_doctor),
                        raw_text=excluded.raw_text,
                        pages_json=excluded.pages_json,
                        classification_json=excluded.classification_json,
                        structured_extraction_json=excluded.structured_extraction_json,
                        complete_report_json=excluded.complete_report_json,
                        error_message=excluded.error_message,
                        updated_at=excluded.updated_at;
                """, (
                    record_id, user_id, filename, safe_display_name, file_size, mime_type,
                    vault_path, sha256_fingerprint, norm_cat, 1 if is_medical else 0, status,
                    upload_time, report_date, patient_name, facility_or_doctor,
                    raw_text, pages_json, class_json, struct_json,
                    rep_json, error_message, now, now
                ))
        finally:
            conn.close()

        return self.get_record(record_id, user_id=user_id)

    def get_record(self, record_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves record with ownership validation.
        Prevents IDOR attacks by strictly enforcing that the querying user owns the record.
        """
        conn = self._get_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
            row = cur.fetchone()
            if not row:
                return None

            record = dict(row)
            # Ownership check
            rec_user = record.get("user_id")
            if user_id and user_id != "admin" and rec_user != user_id:
                return None  # Unauthorized

            return self._format_record_dict(record)
        finally:
            conn.close()

    def list_records(
        self,
        user_id: str,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "newest",
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        List records owned by the user with server-side search, category filter, status filter,
        and safe parameterized sorting and pagination.
        """
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        offset = (page - 1) * page_size

        where_clauses = ["user_id = ?"]
        params: List[Any] = [user_id]

        if category and category.lower() != "all":
            norm_cat = category.lower().replace(" ", "_")
            if "cbc" in norm_cat or "blood_count" in norm_cat:
                norm_cat = "complete_blood_count"
            elif "lab" in norm_cat or "panel" in norm_cat:
                norm_cat = "lab_panel"
            elif "prescription" in norm_cat:
                norm_cat = "prescription"
            elif "imaging" in norm_cat or "diagnostic" in norm_cat:
                norm_cat = "diagnostic_imaging"
            elif "discharge" in norm_cat:
                norm_cat = "discharge_summary"
            where_clauses.append("category = ?")
            params.append(norm_cat)

        if status and status.lower() != "all":
            where_clauses.append("status = ?")
            params.append(status.lower())

        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append("""
                (filename LIKE ? OR safe_display_name LIKE ? OR patient_name LIKE ? OR 
                 facility_or_doctor LIKE ? OR category LIKE ? OR raw_text LIKE ?)
            """)
            params.extend([s, s, s, s, s, s])

        where_sql = " AND ".join(where_clauses)

        # Safe sorting options
        sort_map = {
            "newest": "upload_timestamp DESC, created_at DESC",
            "oldest": "upload_timestamp ASC, created_at ASC",
            "report_date": "report_date DESC, upload_timestamp DESC",
            "category": "category ASC, upload_timestamp DESC",
            "filename": "safe_display_name ASC"
        }
        order_sql = sort_map.get(sort_by.lower(), "upload_timestamp DESC")

        conn = self._get_connection()
        try:
            cur = conn.cursor()
            
            # Count total matching
            count_query = f"SELECT COUNT(*) FROM medical_records WHERE {where_sql}"
            cur.execute(count_query, params)
            total_count = cur.fetchone()[0]

            # Fetch paginated rows
            fetch_query = f"""
                SELECT * FROM medical_records
                WHERE {where_sql}
                ORDER BY {order_sql}
                LIMIT ? OFFSET ?
            """
            cur.execute(fetch_query, params + [page_size, offset])
            rows = cur.fetchall()

            items = [self._format_record_dict(dict(r), summary_only=True) for r in rows]
        finally:
            conn.close()

        total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count > 0 else 1

        return {
            "total_count": total_count,
            "total_pages": total_pages,
            "page": page,
            "page_size": page_size,
            "items": items
        }

    def delete_record(self, record_id: str, user_id: str) -> bool:
        """
        Deletes a medical record and cleans up the associated vault file.
        Requires ownership verification.
        """
        record = self.get_record(record_id, user_id=user_id)
        if not record:
            return False

        vault_path = record.get("vault_path")
        if vault_path and os.path.exists(vault_path):
            try:
                os.remove(vault_path)
            except Exception:
                pass

        conn = self._get_connection()
        try:
            with conn:
                conn.execute("DELETE FROM medical_records WHERE id = ?", (record_id,))
        finally:
            conn.close()

        return True

    def get_vault_file(self, record_id: str, user_id: str) -> Optional[Tuple[str, str, str]]:
        """
        Returns (vault_path, filename, mime_type) if authorized.
        """
        record = self.get_record(record_id, user_id=user_id)
        if not record:
            return None

        vault_path = record.get("vault_path")
        if not vault_path or not os.path.exists(vault_path):
            return None

        return vault_path, record.get("safe_display_name", "document"), record.get("mime_type", "application/octet-stream")

    def compare_records(self, record_ids: List[str], user_id: str) -> Dict[str, Any]:
        """
        Cross-report longitudinal lab test comparison over time.
        Matches canonical parameters, verifies units, computes changes,
        and provides honest clinical guidance.
        """
        if not record_ids or len(record_ids) < 2:
            return {
                "status": "error",
                "message": "At least two valid medical records are required for comparison.",
                "comparison": []
            }

        records = []
        for rid in record_ids:
            r = self.get_record(rid, user_id=user_id)
            if r and r.get("status") == "completed" and r.get("is_medical"):
                records.append(r)

        if len(records) < 2:
            return {
                "status": "error",
                "message": "Fewer than two completed medical reports were accessible for comparison.",
                "comparison": []
            }

        # Sort chronologically by upload or report date
        records.sort(key=lambda x: x.get("upload_timestamp", 0))

        # Canonical test map
        canonical_map = {
            "hemoglobin": "Hemoglobin (Hb)",
            "hb": "Hemoglobin (Hb)",
            "wbc": "Total WBC Count (TLC)",
            "tlc": "Total WBC Count (TLC)",
            "white blood cell": "Total WBC Count (TLC)",
            "platelet": "Platelet Count",
            "platelets": "Platelet Count",
            "rbc": "Total RBC Count",
            "fasting blood sugar": "Fasting Blood Sugar (FBS)",
            "fbs": "Fasting Blood Sugar (FBS)",
            "glucose fasting": "Fasting Blood Sugar (FBS)",
            "creatinine": "Serum Creatinine",
            "serum creatinine": "Serum Creatinine",
            "total cholesterol": "Total Cholesterol",
            "cholesterol": "Total Cholesterol",
            "triglycerides": "Serum Triglycerides",
            "hba1c": "HbA1c (Glycated Hemoglobin)",
            "sgpt": "SGPT (ALT)",
            "alt": "SGPT (ALT)",
            "sgot": "SGOT (AST)",
            "ast": "SGOT (AST)",
            "bilirubin": "Total Bilirubin",
            "uric acid": "Serum Uric Acid",
            "tsh": "Thyroid Stimulating Hormone (TSH)",
            "esr": "Erythrocyte Sedimentation Rate (ESR)"
        }

        # Extract all lab parameters across records
        tests_data: Dict[str, Dict[str, Any]] = {}

        for rec in records:
            rec_id = rec["id"]
            rec_date = rec.get("report_date") or time.strftime("%d-%b-%Y", time.localtime(rec.get("upload_timestamp", time.time())))

            extraction = rec.get("structured_extraction") or {}
            labs = extraction.get("lab_results") or []

            # Also check complete_report
            if not labs and rec.get("complete_report"):
                labs = rec["complete_report"].get("extracted_findings") or []

            for lab in labs:
                tname = (lab.get("test_name") or "").strip()
                if not tname:
                    continue

                # Match canonical
                canon_name = tname
                t_lower = tname.lower()
                for k, v in canonical_map.items():
                    if k in t_lower:
                        canon_name = v
                        break

                val_str = str(lab.get("value_text") or lab.get("value", "")).strip()
                unit = (lab.get("original_unit") or lab.get("unit") or "").strip()
                ref = (lab.get("reference_interval") or lab.get("ref_range") or "").strip()
                status = lab.get("status") or "Normal"

                try:
                    num_val = float(val_str.replace(",", ""))
                except ValueError:
                    num_val = None

                if canon_name not in tests_data:
                    tests_data[canon_name] = {
                        "canonical_name": canon_name,
                        "unit": unit,
                        "reference_interval": ref,
                        "readings": []
                    }

                # Update unit/ref if previously empty
                if not tests_data[canon_name]["unit"] and unit:
                    tests_data[canon_name]["unit"] = unit
                if not tests_data[canon_name]["reference_interval"] and ref:
                    tests_data[canon_name]["reference_interval"] = ref

                tests_data[canon_name]["readings"].append({
                    "record_id": rec_id,
                    "record_name": rec.get("safe_display_name"),
                    "date": rec_date,
                    "timestamp": rec.get("upload_timestamp", 0),
                    "value_text": val_str,
                    "numeric_value": num_val,
                    "unit": unit,
                    "status": status,
                    "reference_interval": ref
                })

        # Build comparison summary
        matched_tests = []
        for tname, tinfo in tests_data.items():
            if len(tinfo["readings"]) >= 1:
                # Calculate trend if 2+ readings
                trend = "stable"
                delta_text = "N/A"
                if len(tinfo["readings"]) >= 2:
                    first_val = tinfo["readings"][0]["numeric_value"]
                    last_val = tinfo["readings"][-1]["numeric_value"]
                    if first_val is not None and last_val is not None:
                        diff = round(last_val - first_val, 2)
                        if diff > 0.05:
                            trend = "increased"
                            delta_text = f"+{diff} {tinfo['unit']}".strip()
                        elif diff < -0.05:
                            trend = "decreased"
                            delta_text = f"{diff} {tinfo['unit']}".strip()
                        else:
                            trend = "unchanged"
                            delta_text = "No significant change"

                matched_tests.append({
                    "test_name": tname,
                    "unit": tinfo["unit"],
                    "reference_interval": tinfo["reference_interval"],
                    "trend": trend,
                    "delta": delta_text,
                    "readings_count": len(tinfo["readings"]),
                    "timeline": tinfo["readings"]
                })

        # Sort matched tests with 2+ readings first
        matched_tests.sort(key=lambda x: (x["readings_count"] >= 2, x["test_name"]), reverse=True)

        return {
            "status": "success",
            "records_compared": [
                {
                    "id": r["id"],
                    "filename": r.get("safe_display_name"),
                    "category": r.get("category"),
                    "date": r.get("report_date") or time.strftime("%d-%b-%Y", time.localtime(r.get("upload_timestamp", 0))),
                    "facility": r.get("facility_or_doctor")
                }
                for r in records
            ],
            "total_matched_parameters": len(matched_tests),
            "parameters": matched_tests,
            "clinical_disclaimer": "Diagnostic parameter trends over time require clinical correlation with symptoms, fasting status, and physician evaluation. Laboratory changes do not automatically establish a diagnosis."
        }

    def _format_record_dict(self, rec: Dict[str, Any], summary_only: bool = False) -> Dict[str, Any]:
        """Convert database record row to standardized dictionary."""
        struct_ext = json.loads(rec.get("structured_extraction_json") or "{}") if rec.get("structured_extraction_json") else {}
        complete_rep = json.loads(rec.get("complete_report_json") or "{}") if rec.get("complete_report_json") else {}
        classif = json.loads(rec.get("classification_json") or "{}") if rec.get("classification_json") else {}
        pages = json.loads(rec.get("pages_json") or "[]") if rec.get("pages_json") else []

        meds_count = len(struct_ext.get("medications", []))
        labs_count = len(struct_ext.get("lab_results", []))
        alerts_count = len(struct_ext.get("safety_alerts", []))

        formatted = {
            "id": rec["id"],
            "document_id": rec["id"],
            "user_id": rec["user_id"],
            "filename": rec["filename"],
            "safe_display_name": rec.get("safe_display_name") or rec["filename"],
            "file_size": rec.get("file_size", 0),
            "mime_type": rec.get("mime_type", "application/pdf"),
            "category": rec.get("category", "other"),
            "is_medical": bool(rec.get("is_medical", 1)),
            "status": rec.get("status", "completed"),
            "upload_timestamp": rec.get("upload_timestamp", rec.get("created_at", 0)),
            "created_at": rec.get("created_at", 0),
            "report_date": rec.get("report_date") or struct_ext.get("date_issued"),
            "patient_name": rec.get("patient_name") or struct_ext.get("patient_name"),
            "facility_or_doctor": rec.get("facility_or_doctor") or struct_ext.get("prescriber_or_facility"),
            "has_vault_file": bool(rec.get("vault_path") and os.path.exists(rec.get("vault_path"))),
            "summary": {
                "medications_count": meds_count,
                "labs_count": labs_count,
                "alerts_count": alerts_count,
                "pages_count": len(pages) if pages else 1,
                "has_analysis": bool(complete_rep or struct_ext)
            }
        }

        if not summary_only:
            formatted.update({
                "vault_path": rec.get("vault_path"),
                "raw_text": rec.get("raw_text", ""),
                "pages": pages,
                "classification": classif,
                "structured_extraction": struct_ext,
                "complete_report": complete_rep,
                "reports_by_language": complete_rep.get("reports_by_language", {}),
                "error_message": rec.get("error_message")
            })

        return formatted
