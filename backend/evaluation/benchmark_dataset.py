"""
DOOM Medical OCR — Synthetic & De-identified Benchmark Dataset Generator
Generates realistic multi-laboratory clinical documents and ground truth annotations
split by patient/source to avoid data leakage.
"""

from typing import List, Dict, Any

# Ground truth benchmark cases representing major Indian & international laboratory chains
BENCHMARK_CASES: List[Dict[str, Any]] = [
    {
        "id": "CASE_CBC_001",
        "source_lab": "Apollo Diagnostics, Hyderabad",
        "patient_id": "PT_AP_1001",
        "split": "test",
        "category": "cbc_hemogram",
        "is_medical": True,
        "language": "en",
        "quality": "high_digital_pdf",
        "ground_truth_text": (
            "APOLLO DIAGNOSTICS - CLINICAL HEMATOLOGY REPORT\n"
            "Patient Name: Ananya Reddy | Age: 34 Y / Female | Date: 10-Oct-2026\n"
            "Test Name                   Result    Unit        Reference Interval\n"
            "Hemoglobin                  11.8      g/dL        12.0 - 15.0 (Low)\n"
            "Total WBC Count             6800      /cumm       4000 - 11000\n"
            "RBC Count                   4.1       mil/uL      3.8 - 4.8\n"
            "PCV / Packed Cell Volume    36.2      %           36.0 - 46.0\n"
            "MCV                         84.5      fL          80.0 - 100.0\n"
            "Platelet Count              2.40      Lakhs/cumm  1.50 - 4.50\n"
            "Neutrophils                 62        %           40 - 75\n"
            "Lymphocytes                 30        %           20 - 45"
        ),
        "expected_fields": {
            "Hemoglobin": {"value": 11.8, "unit": "g/dL", "ref": "12.0 - 15.0", "status": "Low"},
            "Total WBC Count": {"value": 6800, "unit": "/cumm", "ref": "4000 - 11000", "status": "Normal"},
            "Platelet Count": {"value": 2.40, "unit": "Lakhs/cumm", "ref": "1.50 - 4.50", "status": "Normal"}
        }
    },
    {
        "id": "CASE_LIPID_002",
        "source_lab": "Dr. Lal PathLabs, New Delhi",
        "patient_id": "PT_LAL_2002",
        "split": "test",
        "category": "lipid_profile",
        "is_medical": True,
        "language": "en",
        "quality": "scanned_rotated_7deg",
        "ground_truth_text": (
            "DR. LAL PATHLABS - LIPID PROFILE FASTING\n"
            "Patient: Ramesh Verma | Age: 52 Y / Male | Date: 08-Oct-2026\n"
            "Total Cholesterol: 228.0 mg/dL (Reference Range: < 200)\n"
            "Triglycerides: 185.0 mg/dL (Reference Range: < 150)\n"
            "HDL Cholesterol: 38.0 mg/dL (Reference Range: > 40)\n"
            "LDL Cholesterol: 153.0 mg/dL (Reference Range: < 100)\n"
            "VLDL Cholesterol: 37.0 mg/dL (Reference Range: < 30)"
        ),
        "expected_fields": {
            "Total Cholesterol": {"value": 228.0, "unit": "mg/dL", "ref": "< 200", "status": "High"},
            "Triglycerides": {"value": 185.0, "unit": "mg/dL", "ref": "< 150", "status": "High"},
            "HDL Cholesterol": {"value": 38.0, "unit": "mg/dL", "ref": "> 40", "status": "Low"},
            "LDL Cholesterol": {"value": 153.0, "unit": "mg/dL", "ref": "< 100", "status": "High"}
        }
    },
    {
        "id": "CASE_GLUCOSE_003",
        "source_lab": "Thyrocare Technologies, Mumbai",
        "patient_id": "PT_THY_3003",
        "split": "test",
        "category": "blood_glucose_hba1c",
        "is_medical": True,
        "language": "en",
        "quality": "faint_ink_mobile_photo",
        "ground_truth_text": (
            "THYROCARE - DIABETIC MONITORING PROFILE\n"
            "Patient: Smt. Lakshmi Bai | Age: 58 Y | Date: 11-Oct-2026\n"
            "Fasting Blood Sugar: 142.0 mg/dL (Ref: 70.0 - 100.0)\n"
            "Post Prandial Blood Sugar: 218.0 mg/dL (Ref: 70.0 - 140.0)\n"
            "HbA1c Glycated Hemoglobin: 7.8 % (Ref: < 5.7)\n"
            "Estimated Average Glucose (eAG): 177.0 mg/dL"
        ),
        "expected_fields": {
            "Fasting Blood Sugar": {"value": 142.0, "unit": "mg/dL", "ref": "70.0 - 100.0", "status": "High"},
            "Post Prandial Blood Sugar": {"value": 218.0, "unit": "mg/dL", "ref": "70.0 - 140.0", "status": "High"},
            "HbA1c": {"value": 7.8, "unit": "%", "ref": "< 5.7", "status": "High"}
        }
    },
    {
        "id": "CASE_LFT_004",
        "source_lab": "Metropolis Healthcare, Chennai",
        "patient_id": "PT_MET_4004",
        "split": "test",
        "category": "liver_function_tests",
        "is_medical": True,
        "language": "en",
        "quality": "high_digital_pdf",
        "ground_truth_text": (
            "METROPOLIS HEALTHCARE - LIVER FUNCTION TEST (LFT)\n"
            "Patient: Karthik Nathan | Age: 42 Y / Male | Date: 09-Oct-2026\n"
            "Total Bilirubin: 0.85 mg/dL (Ref: 0.20 - 1.20)\n"
            "Direct Bilirubin: 0.22 mg/dL (Ref: 0.00 - 0.30)\n"
            "SGOT (AST): 32.0 U/L (Ref: < 40)\n"
            "SGPT (ALT): 38.0 U/L (Ref: < 45)\n"
            "Alkaline Phosphatase: 88.0 U/L (Ref: 30 - 120)\n"
            "Total Protein: 7.2 g/dL (Ref: 6.0 - 8.3)\n"
            "Serum Albumin: 4.4 g/dL (Ref: 3.5 - 5.2)"
        ),
        "expected_fields": {
            "SGPT (ALT)": {"value": 38.0, "unit": "U/L", "ref": "< 45", "status": "Normal"},
            "SGOT (AST)": {"value": 32.0, "unit": "U/L", "ref": "< 40", "status": "Normal"}
        }
    },
    {
        "id": "CASE_KFT_005",
        "source_lab": "Max Super Speciality Hospital, Gurugram",
        "patient_id": "PT_MAX_5005",
        "split": "test",
        "category": "kidney_function_electrolytes",
        "is_medical": True,
        "language": "en",
        "quality": "high_digital_pdf",
        "ground_truth_text": (
            "MAX HEALTHCARE - RENAL FUNCTION PANEL & ELECTROLYTES\n"
            "Patient: Sunita Devi | Age: 61 Y / Female | Date: 07-Oct-2026\n"
            "Serum Creatinine: 0.95 mg/dL (Ref: 0.70 - 1.20)\n"
            "Blood Urea Nitrogen: 16.0 mg/dL (Ref: 8.0 - 20.0)\n"
            "Serum Uric Acid: 5.2 mg/dL (Ref: 3.5 - 7.0)\n"
            "Sodium: 139.0 mmol/L (Ref: 136 - 145)\n"
            "Potassium: 4.2 mmol/L (Ref: 3.5 - 5.1)"
        ),
        "expected_fields": {
            "Serum Creatinine": {"value": 0.95, "unit": "mg/dL", "ref": "0.70 - 1.20", "status": "Normal"}
        }
    },
    {
        "id": "CASE_THYROID_006",
        "source_lab": "SRL Diagnostics, Bengaluru",
        "patient_id": "PT_SRL_6006",
        "split": "test",
        "category": "thyroid_profile",
        "is_medical": True,
        "language": "en",
        "quality": "scanned_pdf",
        "ground_truth_text": (
            "SRL DIAGNOSTICS - THYROID FUNCTION TEST\n"
            "Patient: Priya Sundaram | Age: 29 Y / Female | Date: 10-Oct-2026\n"
            "Total T3: 1.15 ng/mL (Ref: 0.80 - 2.00)\n"
            "Total T4: 7.80 ug/dL (Ref: 5.10 - 14.10)\n"
            "TSH: 2.45 uIU/mL (Ref: 0.27 - 4.20)"
        ),
        "expected_fields": {
            "TSH": {"value": 2.45, "unit": "uIU/mL", "ref": "0.27 - 4.20", "status": "Normal"}
        }
    },
    {
        "id": "CASE_VITAMIN_007",
        "source_lab": "Thyrocare Technologies, Kolkata",
        "patient_id": "PT_THY_7007",
        "split": "test",
        "category": "vitamin_hormone_tests",
        "is_medical": True,
        "language": "en",
        "quality": "high_digital_pdf",
        "ground_truth_text": (
            "THYROCARE - VITAMIN DEFICIENCY PROFILE\n"
            "Patient: Amitava Ghosh | Age: 38 Y / Male | Date: 05-Oct-2026\n"
            "Vitamin D (25-OH): 18.5 ng/mL (Ref: 30.0 - 100.0) (Deficient)\n"
            "Vitamin B12: 340.0 pg/mL (Ref: 200 - 900)"
        ),
        "expected_fields": {
            "Vitamin D (25-OH)": {"value": 18.5, "unit": "ng/mL", "ref": "30.0 - 100.0", "status": "Low"}
        }
    },
    {
        "id": "CASE_RX_008",
        "source_lab": "Dr. Sharma Family Clinic, Pune",
        "patient_id": "PT_CLI_8008",
        "split": "test",
        "category": "prescription",
        "is_medical": True,
        "language": "en",
        "quality": "handwritten_prescription",
        "ground_truth_text": (
            "DR. V. SHARMA CLINIC\n"
            "Rx\n"
            "1. Tab Amoxicillin 500mg 1-0-1 after food 5 days\n"
            "2. Tab Pantocid 40mg 1-0-0 before breakfast 5 days\n"
            "3. Tab Paracetamol 650mg SOS for fever"
        ),
        "expected_medications": ["Amoxicillin", "Pantocid", "Paracetamol"]
    },
    {
        "id": "CASE_NON_MED_009",
        "source_lab": "Control Set - Automotive Photo",
        "patient_id": "CTRL_AUTO_001",
        "split": "test",
        "category": "non_medical_image",
        "is_medical": False,
        "language": "en",
        "quality": "photo",
        "ground_truth_text": "Red sports car cruising along coastal highway road trip summer vacation 2026",
        "expected_fields": {}
    },
    {
        "id": "CASE_NON_MED_010",
        "source_lab": "Control Set - Food Menu",
        "patient_id": "CTRL_FOOD_002",
        "split": "test",
        "category": "non_medical_image",
        "is_medical": False,
        "language": "en",
        "quality": "photo",
        "ground_truth_text": "Italian Pizza & Pasta Menu Classic Margherita Garlic Bread Tomato Soup",
        "expected_fields": {}
    }
]

def get_benchmark_splits():
    """Return train, validation, and test dataset partitions grouped by patient source."""
    train_set = [c for c in BENCHMARK_CASES if c["split"] == "train"]
    val_set = [c for c in BENCHMARK_CASES if c["split"] == "val"]
    test_set = [c for c in BENCHMARK_CASES if c["split"] == "test"]
    return train_set, val_set, test_set
