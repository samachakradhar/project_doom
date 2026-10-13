import os
import re
import json
import logging
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

logger = logging.getLogger("DOOM_CLASSIFIER")

DOCUMENT_CATEGORIES = [
    "cbc_hemogram",
    "lipid_profile",
    "blood_glucose_hba1c",
    "liver_function_tests",
    "kidney_function_electrolytes",
    "thyroid_profile",
    "urine_stool_analysis",
    "vitamin_hormone_tests",
    "prescription",
    "diagnostic_report",
    "discharge_summary",
    "other_medical",
    "non_medical_image",
    "uncertain_degraded"
]

class ClassificationResult(BaseModel):
    category: str = Field(description="One of: 'cbc_hemogram', 'lipid_profile', 'blood_glucose_hba1c', 'liver_function_tests', 'kidney_function_electrolytes', 'thyroid_profile', 'urine_stool_analysis', 'vitamin_hormone_tests', 'prescription', 'diagnostic_report', 'discharge_summary', 'other_medical', 'non_medical_image', 'uncertain_degraded'")
    confidence: float = Field(description="Confidence of classification between 0.0 and 1.0")
    detected_features: List[str] = Field(description="Key document indicators detected (e.g. 'Rx symbol', 'CBC table', 'vehicle bumper')")
    is_medical: bool = Field(description="True if document is a genuine healthcare document; False if general image or non-medical")
    reasoning: str = Field(description="Clinical or visual explanation for the classification")


class DocumentClassifier:
    """
    Production-grade Medical Document Classifier.
    Accurately classifies:
    - CBC and hemogram
    - Lipid profile
    - Blood glucose and HbA1c
    - Liver function tests (LFT)
    - Kidney function tests and electrolytes (KFT/RFT)
    - Thyroid profile
    - Urine and stool analysis
    - Vitamin and hormone tests
    - Prescriptions
    - Diagnostic reports (radiology, imaging, ECG)
    - Discharge summaries
    - Other medical documents
    - Non-medical image rejection (Distinguishes non-medical objects from health records without fabricating diseases).
    """

    # Domain keyword maps for high-precision heuristic routing
    CBC_KEYWORDS = ["complete blood count", "cbc", "hemogram", "haemoglobin", "hemoglobin", "wbc", "rbc", "platelet", "platelets", "neutrophil", "lymphocyte", "mcv", "mch", "mchc", "pcv", "hematocrit", "tlc", "dlc", "esr"]
    LIPID_KEYWORDS = ["lipid", "cholesterol", "triglycerides", "hdl", "ldl", "vldl", "non-hdl", "chol/hdl"]
    GLUCOSE_KEYWORDS = ["glucose", "fbs", "ppbs", "fasting blood sugar", "post prandial", "hba1c", "glycated hemoglobin", "estimated average glucose", "eag", "random blood sugar", "rbs"]
    LFT_KEYWORDS = ["liver function", "lft", "bilirubin", "sgot", "ast", "sgpt", "alt", "alkaline phosphatase", "alp", "total protein", "albumin", "globulin", "a/g ratio", "ggtp", "gamma gt"]
    KFT_KEYWORDS = ["kidney function", "kft", "rft", "renal function", "creatinine", "blood urea", "bun", "uric acid", "sodium", "potassium", "chloride", "calcium", "phosphorus", "electrolytes"]
    THYROID_KEYWORDS = ["thyroid", "tft", "t3", "t4", "tsh", "free t3", "free t4", "ft3", "ft4", "triiodothyronine", "thyroxine", "thyroid stimulating hormone"]
    URINE_STOOL_KEYWORDS = ["urine routine", "urine analysis", "urine examination", "pus cells", "epithelial cells", "urine glucose", "urine protein", "urobilinogen", "stool routine", "occult blood"]
    VITAMIN_HORMONE_KEYWORDS = ["vitamin d", "25-hydroxy", "vitamin b12", "cyanocobalamin", "ferritin", "folic acid", "iron profile", "testosterone", "cortisol", "prolactin", "insulin", "lh", "fsh", "estrogen"]
    PRESCRIPTION_KEYWORDS = ["rx", "tab", "tablet", "cap", "capsule", "syrup", "syp", "inj", "injection", "mg", "ml", "od", "bd", "tds", "qid", "sos", "after food", "before food", "dr.", "clinic", "dispense", "sig:", "prescribed", "diagnosis:", "advise:"]
    DIAGNOSTIC_KEYWORDS = ["radiology", "x-ray", "ultrasound", "usg", "mri", "ct scan", "ecg", "echo", "echocardiogram", "impression:", "findings:", "radiologist", "sonography", "computed tomography"]
    DISCHARGE_KEYWORDS = ["discharge summary", "date of admission", "date of discharge", "inpatient", "ip no", "uhid", "hospital course", "chief complaint", "discharge diagnosis", "condition at discharge"]
    
    NON_MEDICAL_KEYWORDS = ["car", "vehicle", "engine", "wheels", "road", "trip", "food", "recipe", "pizza", "burger", "landscape", "sunset", "cat", "dog", "pet", "selfie", "meme", "wallpaper", "screenshot", "fashion", "shoes", "game"]

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key) if self.api_key else None
        self.models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"]

    def classify_from_ocr(self, extracted_text: str, image_bytes: Optional[bytes] = None, mime_type: str = "image/jpeg") -> ClassificationResult:
        """
        Classifies document based on extracted text and optional visual analysis.
        """
        text_lower = (extracted_text or "").lower()
        words = text_lower.split()

        # Step 1: Check for explicit non-medical patterns using word boundary matching
        def count_kw_matches(kw_list: List[str], text: str) -> int:
            cnt = 0
            for kw in kw_list:
                pattern = r'\b' + re.escape(kw) + r'(?:s)?\b'
                if re.search(pattern, text, re.IGNORECASE):
                    cnt += 1
            return cnt

        non_med_score = count_kw_matches(self.NON_MEDICAL_KEYWORDS, text_lower)
        all_medical_keywords = (
            self.CBC_KEYWORDS + self.LIPID_KEYWORDS + self.GLUCOSE_KEYWORDS +
            self.LFT_KEYWORDS + self.KFT_KEYWORDS + self.THYROID_KEYWORDS +
            self.URINE_STOOL_KEYWORDS + self.VITAMIN_HORMONE_KEYWORDS +
            self.PRESCRIPTION_KEYWORDS + self.DIAGNOSTIC_KEYWORDS + self.DISCHARGE_KEYWORDS
        )
        med_score = count_kw_matches(all_medical_keywords, text_lower)

        if non_med_score >= 1 and med_score == 0:
            return ClassificationResult(
                category="non_medical_image",
                confidence=0.96,
                detected_features=["General non-medical vocabulary", "Zero healthcare terminology"],
                is_medical=False,
                reasoning="The text contains everyday non-medical terms and lacks clinical or prescription data."
            )

        # Step 2: Specific category score evaluation
        scores = {
            "cbc_hemogram": count_kw_matches(self.CBC_KEYWORDS, text_lower),
            "lipid_profile": count_kw_matches(self.LIPID_KEYWORDS, text_lower),
            "blood_glucose_hba1c": count_kw_matches(self.GLUCOSE_KEYWORDS, text_lower),
            "liver_function_tests": count_kw_matches(self.LFT_KEYWORDS, text_lower),
            "kidney_function_electrolytes": count_kw_matches(self.KFT_KEYWORDS, text_lower),
            "thyroid_profile": count_kw_matches(self.THYROID_KEYWORDS, text_lower),
            "urine_stool_analysis": count_kw_matches(self.URINE_STOOL_KEYWORDS, text_lower),
            "vitamin_hormone_tests": count_kw_matches(self.VITAMIN_HORMONE_KEYWORDS, text_lower),
            "prescription": count_kw_matches(self.PRESCRIPTION_KEYWORDS, text_lower),
            "diagnostic_report": count_kw_matches(self.DIAGNOSTIC_KEYWORDS, text_lower),
            "discharge_summary": count_kw_matches(self.DISCHARGE_KEYWORDS, text_lower)
        }

        best_category = max(scores, key=scores.get)
        best_score = scores[best_category]

        if best_score >= 1:
            return ClassificationResult(
                category=best_category,
                confidence=min(0.98, 0.75 + (best_score * 0.05)),
                detected_features=[f"Matches {best_category} clinical parameters (score: {best_score})"],
                is_medical=True,
                reasoning=f"Identified characteristic keywords and tabular metrics matching {best_category.replace('_', ' ').title()}."
            )

        # Step 3: Vision fallback if image is available
        if image_bytes and self.client:
            vision_result = self._classify_with_vision(image_bytes, extracted_text, mime_type)
            if vision_result:
                return vision_result

        # Step 4: Sparse text / ambiguous control
        if len(words) < 5 or med_score == 0:
            return ClassificationResult(
                category="non_medical_image",
                confidence=0.88,
                detected_features=["Sparse/Non-medical text"],
                is_medical=False,
                reasoning="The document does not contain recognizable clinical report structure or medical parameters."
            )

        return ClassificationResult(
            category="other_medical",
            confidence=0.60,
            detected_features=["General medical terminology"],
            is_medical=True,
            reasoning="Document contains healthcare text but does not match a standard single lab panel."
        )

    def _classify_with_vision(self, image_bytes: bytes, extracted_text: str, mime_type: str) -> Optional[ClassificationResult]:
        """Classify using vision to definitively distinguish specific panel types and non-medical images."""
        prompt = f"""
        Inspect the uploaded document image and classify its exact type from the following categories:
        1. 'cbc_hemogram' (Complete Blood Count, Platelets, RBC, WBC, Hemoglobin)
        2. 'lipid_profile' (Cholesterol, HDL, LDL, Triglycerides)
        3. 'blood_glucose_hba1c' (Fasting/PP Glucose, HbA1c)
        4. 'liver_function_tests' (Bilirubin, SGOT/AST, SGPT/ALT, Alkaline Phosphatase)
        5. 'kidney_function_electrolytes' (Creatinine, BUN, Urea, Electrolytes)
        6. 'thyroid_profile' (T3, T4, TSH)
        7. 'urine_stool_analysis' (Urine Routine/Microscopic, Stool)
        8. 'vitamin_hormone_tests' (Vitamin D, B12, Ferritin, Hormones)
        9. 'prescription' (Handwritten or printed doctor's medical prescription with medications and dosages)
        10. 'diagnostic_report' (X-Ray, Ultrasound, CT, MRI, ECG report)
        11. 'discharge_summary' (Hospital inpatient discharge summary)
        12. 'other_medical' (Medical bill, certificate, immunization card)
        13. 'non_medical_image' (A photograph of an everyday object, vehicle, food, pet, landscape, selfie, meme, or graphic)
        14. 'uncertain_degraded' (Completely illegible or degraded image)

        Extracted preliminary OCR text:
        \"\"\"{extracted_text[:800]}\"\"\"

        CRITICAL SAFETY RULE:
        An ordinary photo of a car, food, animal, landscape, or non-medical object MUST be classified as 'non_medical_image' with is_medical=false.
        Do NOT invent medical diseases for everyday images.
        """

        for model in self.models:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=[
                        prompt,
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ClassificationResult,
                        temperature=0.0
                    )
                )
                if response.text:
                    data = json.loads(response.text)
                    return ClassificationResult(**data)
            except Exception as e:
                logger.warning(f"Vision classification with {model} failed: {e}")
                continue

        return None
