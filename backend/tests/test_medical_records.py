import os
import io
import time
import unittest
import tempfile
import json
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from services.medical_record_repository import MedicalRecordRepository

import cv2
import numpy as np

class TestMedicalRecordsBackend(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.repo = MedicalRecordRepository()

    def test_01_upload_and_record_persistence(self):
        """Uploading a document creates a persistent SQLite record and vault file."""
        # Create synthetic valid PNG image of CBC report
        img = np.full((500, 700, 3), 255, dtype=np.uint8)
        cv2.putText(img, "METROPOLIS CLINICAL LABS", (50, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 100, 0), 2)
        cv2.putText(img, "Patient: Test User", (50, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        cv2.putText(img, "Hemoglobin: 14.5 g/dL (13.0 - 17.0)", (50, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        cv2.putText(img, "Total WBC Count: 7500 /cumm", (50, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        _, png_bytes = cv2.imencode(".png", img)

        files = {"file": ("test_cbc_panel.png", png_bytes.tobytes(), "image/png")}
        
        # Test upload endpoint with user_id
        res = self.client.post("/api/extract-record?user_id=user_dr_sharma", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        doc_id = data.get("document_id")
        self.assertIsNotNone(doc_id)

        # Verify persistent record in repository
        record = self.repo.get_record(doc_id, user_id="user_dr_sharma")
        self.assertIsNotNone(record)
        self.assertEqual(record["user_id"], "user_dr_sharma")
        self.assertEqual(record["filename"], "test_cbc_panel.png")
        self.assertTrue(record["has_vault_file"])

    def test_02_user_isolation_and_idor_prevention(self):
        """User A cannot access or delete User B's medical records."""
        # Create record for user_alice
        rec_alice = self.repo.save_record(
            record_id="rec-alice-101",
            user_id="user_alice",
            filename="alice_blood_test.pdf",
            mime_type="application/pdf",
            category="complete_blood_count",
            is_medical=True,
            status="completed",
            raw_text="Hemoglobin 12.0 g/dL",
            structured_extraction={"patient_name": "Alice", "lab_results": [{"test_name": "Hemoglobin", "value_text": "12.0", "original_unit": "g/dL"}]}
        )
        self.assertIsNotNone(rec_alice)

        # Alice can fetch her record
        res_alice = self.client.get("/api/records/rec-alice-101?user_id=user_alice")
        self.assertEqual(res_alice.status_code, 200)
        self.assertEqual(res_alice.json()["record"]["id"], "rec-alice-101")

        # Bob attempts to access Alice's record -> MUST BE 404 / Unauthorized
        res_bob = self.client.get("/api/records/rec-alice-101?user_id=user_bob")
        self.assertEqual(res_bob.status_code, 404)

        # Bob attempts to download Alice's record -> MUST BE 404 / Unauthorized
        res_bob_dl = self.client.get("/api/records/rec-alice-101/download?user_id=user_bob")
        self.assertEqual(res_bob_dl.status_code, 404)

        # Bob attempts to delete Alice's record -> MUST BE 404 / Unauthorized
        res_bob_del = self.client.delete("/api/records/rec-alice-101?user_id=user_bob")
        self.assertEqual(res_bob_del.status_code, 404)

        # Verify Alice's record still exists
        record_check = self.repo.get_record("rec-alice-101", user_id="user_alice")
        self.assertIsNotNone(record_check)

    def test_03_search_filter_sort_and_pagination(self):
        """Search by keyword, filter by category and status, and sort correctly."""
        user_id = f"user_filter_test_{int(time.time() * 1000)}"

        # Create multiple test records
        self.repo.save_record(
            record_id="rec-filter-cbc",
            user_id=user_id,
            filename="CBC_Complete_Panel_Jan.pdf",
            mime_type="application/pdf",
            category="complete_blood_count",
            status="completed",
            upload_timestamp=1700000000,
            report_date="15-Jan-2026",
            patient_name="John Doe",
            facility_or_doctor="Apollo Clinic"
        )
        self.repo.save_record(
            record_id="rec-filter-rx",
            user_id=user_id,
            filename="Prescription_Antibiotic_Feb.pdf",
            mime_type="application/pdf",
            category="prescription",
            status="completed",
            upload_timestamp=1705000000,
            report_date="20-Feb-2026",
            patient_name="John Doe",
            facility_or_doctor="Dr. K. Rao"
        )
        self.repo.save_record(
            record_id="rec-filter-imaging",
            user_id=user_id,
            filename="Chest_XRay_Report_Mar.pdf",
            mime_type="application/pdf",
            category="diagnostic_imaging",
            status="failed",
            upload_timestamp=1710000000,
            report_date="10-Mar-2026",
            patient_name="John Doe",
            error_message="Image illegible"
        )

        # 1. Search keyword "Antibiotic"
        res_search = self.client.get(f"/api/records?user_id={user_id}&search=Antibiotic")
        self.assertEqual(res_search.status_code, 200)
        items = res_search.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], "rec-filter-rx")

        # 2. Category filter "complete_blood_count"
        res_cat = self.client.get(f"/api/records?user_id={user_id}&category=complete_blood_count")
        self.assertEqual(res_cat.status_code, 200)
        items_cat = res_cat.json()["items"]
        self.assertEqual(len(items_cat), 1)
        self.assertEqual(items_cat[0]["id"], "rec-filter-cbc")

        # 3. Status filter "failed"
        res_status = self.client.get(f"/api/records?user_id={user_id}&status=failed")
        self.assertEqual(res_status.status_code, 200)
        items_status = res_status.json()["items"]
        self.assertEqual(len(items_status), 1)
        self.assertEqual(items_status[0]["id"], "rec-filter-imaging")

        # 4. Sorting newest first
        res_sort = self.client.get(f"/api/records?user_id={user_id}&sort_by=newest")
        self.assertEqual(res_sort.status_code, 200)
        items_sort = res_sort.json()["items"]
        self.assertGreaterEqual(len(items_sort), 3)
        self.assertEqual(items_sort[0]["id"], "rec-filter-imaging")

    def test_04_cross_report_comparison(self):
        """Compare 2 reports chronologically with matched canonical lab parameters."""
        user_id = "user_compare_test"

        # Report 1: Baseline CBC
        self.repo.save_record(
            record_id="rec-comp-1",
            user_id=user_id,
            filename="CBC_Jan.pdf",
            mime_type="application/pdf",
            category="complete_blood_count",
            is_medical=True,
            status="completed",
            upload_timestamp=1700000000,
            report_date="10-Jan-2026",
            structured_extraction={
                "lab_results": [
                    {"test_name": "Hemoglobin (Hb)", "value_text": "11.2", "original_unit": "g/dL", "status": "Low", "reference_interval": "13.0 - 17.0"},
                    {"test_name": "Fasting Blood Sugar (FBS)", "value_text": "115.0", "original_unit": "mg/dL", "status": "High", "reference_interval": "70 - 100"}
                ]
            }
        )

        # Report 2: Follow-up CBC 3 months later
        self.repo.save_record(
            record_id="rec-comp-2",
            user_id=user_id,
            filename="CBC_Apr.pdf",
            mime_type="application/pdf",
            category="complete_blood_count",
            is_medical=True,
            status="completed",
            upload_timestamp=1710000000,
            report_date="15-Apr-2026",
            structured_extraction={
                "lab_results": [
                    {"test_name": "Hemoglobin", "value_text": "13.8", "original_unit": "g/dL", "status": "Normal", "reference_interval": "13.0 - 17.0"},
                    {"test_name": "FBS (Glucose)", "value_text": "98.0", "original_unit": "mg/dL", "status": "Normal", "reference_interval": "70 - 100"}
                ]
            }
        )

        # Execute comparison
        res = self.client.post("/api/records/compare", json={
            "record_ids": ["rec-comp-1", "rec-comp-2"],
            "user_id": user_id
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["records_compared"]), 2)
        
        # Check matched parameters
        params = {p["test_name"]: p for p in data["parameters"]}
        self.assertIn("Hemoglobin (Hb)", params)
        hb_param = params["Hemoglobin (Hb)"]
        self.assertEqual(hb_param["trend"], "increased")
        self.assertEqual(len(hb_param["timeline"]), 2)

        self.assertIn("Fasting Blood Sugar (FBS)", params)
        fbs_param = params["Fasting Blood Sugar (FBS)"]
        self.assertEqual(fbs_param["trend"], "decreased")

        # Clinical disclaimer present
        self.assertTrue(
            "clinical" in data["clinical_disclaimer"].lower() or "diagnosis" in data["clinical_disclaimer"].lower()
        )

    def test_05_delete_record_and_vault_cleanup(self):
        """Deleting a record removes database row and physical vault file."""
        user_id = "user_delete_test"
        file_bytes = b"Sample record file to delete"
        vault_path, _, _, _ = self.repo.save_file_to_vault(user_id, file_bytes, "delete_me.pdf", "application/pdf")
        self.assertTrue(os.path.exists(vault_path))

        rec = self.repo.save_record(
            record_id="rec-to-delete",
            user_id=user_id,
            filename="delete_me.pdf",
            mime_type="application/pdf",
            vault_path=vault_path,
            status="completed"
        )
        self.assertIsNotNone(rec)

        # Delete via API
        res = self.client.delete(f"/api/records/rec-to-delete?user_id={user_id}")
        self.assertEqual(res.status_code, 200)

        # Verify not found in DB
        self.assertIsNone(self.repo.get_record("rec-to-delete", user_id=user_id))
        # Verify vault file was removed
        self.assertFalse(os.path.exists(vault_path))


if __name__ == "__main__":
    unittest.main()
