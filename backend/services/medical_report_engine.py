import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("DOOM_REPORT_ENGINE")


# =====================================================================
# 1. REPORT DATA MODELS
# =====================================================================

class MedicalReportSection(BaseModel):
    id: str
    number: int
    title: str
    content: str


class LanguageReport(BaseModel):
    language_code: str
    language_name: str
    sections: List[MedicalReportSection]
    patient_summary: str
    speech_text: str
    word_count: int
    full_markdown: str


class CompleteMedicalReport(BaseModel):
    document_type: str
    is_medical: bool
    patient_name: Optional[str] = None
    facility_or_doctor: Optional[str] = None
    date_issued: Optional[str] = None
    extracted_findings: List[Dict[str, Any]] = []
    medications: List[Dict[str, Any]] = []
    safety_alerts: List[Dict[str, Any]] = []
    uncertain_fields: List[str] = []
    sources: List[str] = []
    limitations: List[str] = []
    reports_by_language: Dict[str, LanguageReport] = {}


# =====================================================================
# 2. ACCURATE WORD COUNT & SPEECH SYNTHESIS CLEANERS
# =====================================================================

def calculate_patient_facing_words(text: str) -> int:
    """
    Measures the word count of the patient-facing explanation narrative,
    strictly excluding markdown headings, table pipes, dashed separators,
    internal metadata, IDs, citations, and numbers.
    """
    # Remove markdown headers (#, ##, ###, ####)
    cleaned = re.sub(r'#{1,6}\s+[^\n]+', '', text)
    # Remove table lines (| ... |)
    cleaned = re.sub(r'\|[^\n]+\|', '', cleaned)
    # Remove markdown table dividers (---, :---:)
    cleaned = re.sub(r'[-:]{3,}', '', cleaned)
    # Remove markdown bold, italic, code markers
    cleaned = re.sub(r'[*_`>~]', ' ', cleaned)
    # Remove links
    cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
    # Remove technical abbreviations, IDs and labels
    cleaned = re.sub(r'\b(ABHA|UHID|UID|JSON|OCR|API|DOOM_AI|ID|LLM)\b[:\w\-]*', '', cleaned, flags=re.I)
    
    # Split tokens and filter out numbers or single-character punctuation
    tokens = [w.strip() for w in cleaned.split() if len(w.strip()) > 0]
    words = [w for w in tokens if not re.match(r'^\d+[\.\)]?$', w)]
    return len(words)


def clean_for_speech_synthesis(text: str) -> str:
    """
    Builds a clean, natural spoken string starting directly with the explanation.
    Never includes headings, model names, ABHA identifiers, technical labels,
    section numbers, debug output, or formatting characters.
    """
    # 1. Remove all markdown headers and numbered titles
    cleaned = re.sub(r'#{1,6}\s*(?:\d+\.\s*)?[^\n]+', '', text)
    # 2. Remove formatting characters (*, _, `, >, ~)
    cleaned = re.sub(r'[*_`>~]', '', cleaned)
    # 3. Remove list bullet points and leading numbers
    cleaned = re.sub(r'^\s*[-•*+]\s*', '', cleaned, flags=re.M)
    cleaned = re.sub(r'^\s*\d+[\.\)]\s*', '', cleaned, flags=re.M)
    # 4. Remove metadata lines like "Patient ABHA ID: ...", "ABHA: ...", "UHID: ...", "ID: 91-..."
    cleaned = re.sub(r'(?i)(?:patient\s*)?(?:abha|uhid|uid|mrn|sample|abha\s*id|patient\s*id)?\s*[:=]?\s*[\d\-]{4,}', '', cleaned)
    cleaned = re.sub(r'(?i)\b(?:patient\s*)?(?:abha|uhid|uid)\b(?:\s*id)?\s*[:=]?', '', cleaned)
    # 5. Remove table dividers and pipes
    cleaned = re.sub(r'\|', ' ', cleaned)
    cleaned = re.sub(r'[-:]{3,}', '', cleaned)
    # 6. Replace newlines with full stop space
    cleaned = re.sub(r'\n+', '. ', cleaned)
    # 7. Collapse multiple spaces and dots
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    cleaned = re.sub(r'\.{2,}', '.', cleaned)
    cleaned = re.sub(r'\.\s*\.', '.', cleaned)
    return cleaned.strip(" .")


# =====================================================================
# 3. CLINICAL EXPLANATION & MULTILINGUAL BUILDER
# =====================================================================

class _ReportLanguageBuilder:
    def __init__(
        self,
        lang: str,
        doc_type: str,
        labs: List[Dict[str, Any]],
        meds: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]],
        facility: Optional[str],
        patient_name: Optional[str],
        date_issued: Optional[str],
        uncertain: List[str]
    ):
        self.lang = lang.lower()
        self.doc_type = doc_type
        self.labs = labs or []
        self.meds = meds or []
        self.alerts = alerts or []
        self.facility = facility or "Diagnostic Healthcare Center"
        self.patient_name = patient_name or "Patient"
        self.date_issued = date_issued or "Current Record"
        self.uncertain = uncertain or []

        # Map language codes and names
        lang_map = {
            "english": ("en", "English"),
            "telugu": ("te", "Telugu (తెలుగు)"),
            "hindi": ("hi", "Hindi (हिन्दी)"),
            "tamil": ("ta", "Tamil (தமிழ்)"),
            "tanglish": ("te-Latn", "Tenglish (Telugu in English Script)"),
        }
        self.lang_code, self.lang_name = lang_map.get(self.lang, ("en", "English"))

    def build_sections(self) -> List[MedicalReportSection]:
        if self.lang == "telugu":
            return self._build_telugu_sections()
        elif self.lang == "hindi":
            return self._build_hindi_sections()
        elif self.lang == "tamil":
            return self._build_tamil_sections()
        elif self.lang == "tanglish":
            return self._build_tanglish_sections()
        else:
            return self._build_english_sections()

    def build_full_markdown(self, sections: List[MedicalReportSection]) -> str:
        parts = []
        for s in sections:
            parts.append(f"### {s.title}\n\n{s.content}")
        return "\n\n---\n\n".join(parts)

    def build_speech_text(self, sections: List[MedicalReportSection]) -> str:
        """
        Extracts narrative paragraphs starting directly with the patient situation & condition
        (Section 7: patient_summary, followed by Section 3: explanation, Section 5: nutrition, Section 6: follow_up).
        Completely excludes Section 1 overview so speech begins directly on the patient's medical situation and test findings.
        """
        priority_ids = ["patient_summary", "explanation", "medications", "nutrition", "follow_up"]
        narrative_sections = []
        for pid in priority_ids:
            found = next((s for s in sections if s.id == pid), None)
            if found and found.content:
                narrative_sections.append(found)

        combined_text = " ".join([s.content for s in narrative_sections])
        speech = clean_for_speech_synthesis(combined_text)
        return speech

    # -----------------------------------------------------------------
    # ENGLISH BUILDER
    # -----------------------------------------------------------------
    def _build_english_sections(self) -> List[MedicalReportSection]:
        formatted_type = self.doc_type.replace('_', ' ').title()
        has_labs = len(self.labs) > 0
        has_meds = len(self.meds) > 0

        # Section 1: Document Overview
        overview = (
            f"This healthcare document has been identified and verified as a **{formatted_type}** "
            f"issued by **{self.facility}** on **{self.date_issued}**. "
            f"Our clinical extraction engine processed this record and identified {len(self.labs)} diagnostic laboratory parameter(s) "
            f"and {len(self.meds)} prescribed medication record(s). "
            f"All values, printed units, and reference intervals have been preserved verbatim from the original report."
        )

        # Section 2: Detected Findings and Test Results
        if has_labs:
            findings_rows = ["| Test Name | Extracted Value | Unit | Reference Interval | Status |",
                             "| :--- | :--- | :--- | :--- | :--- |"]
            for l in self.labs:
                t_name = l.get("test_name", "Test")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                ref = l.get("reference_interval", "Standard")
                status = l.get("status", "Normal")
                findings_rows.append(f"| **{t_name}** | {val} | {unit} | {ref} | `{status}` |")
            findings_content = "\n".join(findings_rows)
        else:
            findings_content = "No clinical laboratory test values were found in the uploaded document."

        # Section 3: Explanation of Each Important Result
        if has_labs:
            exp_lines = []
            for l in self.labs:
                t_name = l.get("test_name", "Test")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                status = l.get("status", "Normal")
                ref = l.get("reference_interval", "")
                
                exp = f"• **{t_name} ({val} {unit}):** "
                if "hemoglobin" in t_name.lower():
                    exp += (
                        f"Hemoglobin is the essential protein inside red blood cells responsible for transporting oxygen throughout your body. "
                        f"Your recorded value of {val} {unit} is categorized as **{status}** compared to the reference range of {ref}. "
                    )
                    if status.lower() == "low":
                        exp += "A lower hemoglobin level may be associated with mild anemia, fatigue, or reduced iron stores."
                    elif status.lower() == "high":
                        exp += "An elevated hemoglobin reading can occur with dehydration or secondary physiological responses."
                    else:
                        exp += "This indicates adequate oxygen-carrying capacity in the bloodstream."
                elif "glucose" in t_name.lower() or "fbs" in t_name.lower() or "ppbs" in t_name.lower() or "hba1c" in t_name.lower():
                    exp += (
                        f"This parameter evaluates glucose metabolism and blood sugar regulation. "
                        f"Your result of {val} {unit} is **{status}** relative to the expected reference interval of {ref}. "
                    )
                    if "high" in status.lower():
                        exp += "Elevated glucose levels suggest glycemic variability requiring dietary moderation and clinician review."
                    else:
                        exp += "This reflects balanced glycemic control within the expected laboratory parameters."
                elif "platelet" in t_name.lower():
                    exp += (
                        f"Platelets are specialized blood cell fragments that enable normal blood clotting and tissue repair. "
                        f"Your measurement of {val} {unit} is **{status}** compared to the reference range of {ref}. "
                    )
                    if "low" in status.lower():
                        exp += "A reduced platelet count warrants monitoring to ensure effective clotting function."
                    else:
                        exp += "This indicates normal physiological clotting capability."
                elif "creatinine" in t_name.lower():
                    exp += (
                        f"Serum creatinine is a metabolic byproduct filtered by the kidneys, serving as a primary marker of renal filtration efficiency. "
                        f"Your value of {val} {unit} is **{status}** (Reference range: {ref}). "
                    )
                    if "high" in status.lower():
                        exp += "Elevated levels may indicate reduced kidney clearance or dehydration."
                    else:
                        exp += "This demonstrates normal renal filtration and excretory function."
                elif "wbc" in t_name.lower() or "tlc" in t_name.lower():
                    exp += (
                        f"Total White Blood Cell count reflects the state of your body's immune and defense mechanism against infections. "
                        f"Your reading of {val} {unit} is **{status}** against the standard interval of {ref}."
                    )
                else:
                    exp += (
                        f"This laboratory parameter reflects metabolic activity and tissue function. "
                        f"The extracted reading of {val} {unit} falls into the **{status}** range when compared against the stated reference interval ({ref})."
                    )
                exp_lines.append(exp)
            explanation_content = "\n\n".join(exp_lines)
        elif has_meds:
            explanation_content = (
                f"This prescription document outlines an active therapeutic regimen containing {len(self.meds)} medication(s). "
                f"The clinical focus is directed toward symptom management, antimicrobial treatment, or chronic condition control as prescribed by your attending doctor."
            )
        else:
            explanation_content = "The document provides clinical health information without individual laboratory diagnostic intervals."

        # Section 4: Prescribed Medications and Dosage Information
        if has_meds:
            med_lines = []
            for idx, m in enumerate(self.meds, 1):
                name = m.get("name", "Prescribed Medicine")
                strength = m.get("strength", "")
                dosage = m.get("dosage", "As directed")
                timing = m.get("timing", "After meals")
                purpose = m.get("purpose") or "Clinical therapy"
                uncertain_warn = " *(Requires confirmation due to handwriting ambiguity)*" if m.get("is_uncertain") else ""
                med_lines.append(
                    f"{idx}. **{name} {strength}**{uncertain_warn}\n"
                    f"   • **Dosage / Schedule:** `{dosage}`\n"
                    f"   • **Administration Timing:** {timing} with adequate water\n"
                    f"   • **Therapeutic Purpose:** {purpose}"
                )
            medications_content = "\n\n".join(med_lines)
        else:
            medications_content = "No prescription information was found in the uploaded document. No medications have been prescribed in this record."

        # Section 5: Diet and Nutrition Information
        nutrition_points = []
        if any("hemoglobin" in l.get("test_name", "").lower() for l in self.labs):
            nutrition_points.append("• **Iron & Micronutrient Support:** Include iron-rich natural whole foods such as spinach, legumes, lentils, beetroot, dates, and pomegranate. Pair with vitamin C sources (lemons, oranges) to enhance dietary iron absorption.")
        if any("glucose" in l.get("test_name", "").lower() or "hba1c" in l.get("test_name", "").lower() for l in self.labs):
            nutrition_points.append("• **Glycemic Balance:** Prioritize high-fiber vegetables, whole grains, and complex carbohydrates while moderating refined sugars, sweetened beverages, and processed carbohydrates.")
        if any("creatinine" in l.get("test_name", "").lower() or "kft" in self.doc_type for l in self.labs):
            nutrition_points.append("• **Hydration & Renal Health:** Maintain regular hydration with plain water throughout the day unless your physician has advised fluid restriction.")
        
        nutrition_points.append("• **Balanced Daily Wellness:** Ensure balanced intake of fresh seasonal fruits, leafy greens, lean proteins, and adequate water. Limit excessive sodium, deep-fried snacks, and ultra-processed food items.")
        nutrition_points.append("• **Dietary Limitation:** These nutritional suggestions are educational and general in nature. Specific restrictive diets must only be adopted under the guidance of your treating doctor or a registered clinical dietitian.")
        nutrition_content = "\n\n".join(nutrition_points)

        # Section 6: Recommended Follow-up and Precautions
        followup_points = [
            "• **Clinical Correlation:** Share this complete laboratory report with your treating physician for comprehensive evaluation in conjunction with your physical examination and medical history.",
            "• **Medication Safety:** Never initiate, discontinue, or alter prescribed medication dosages without explicit medical consultation.",
            "• **Re-Testing Schedule:** Repeat follow-up laboratory testing as recommended by your physician to track biomarker trends.",
            "• **Urgent Medical Attention:** Seek prompt medical evaluation if you experience acute symptoms such as severe dizziness, persistent chest discomfort, breathing difficulty, extreme fatigue, or high fever."
        ]
        followup_content = "\n\n".join(followup_points)

        # Section 7: Multilingual Patient-Friendly Summary
        abnormal_labs = [l for l in self.labs if l.get("status", "").lower() in ["high", "low", "critical", "borderline"]]
        if abnormal_labs:
            abn_desc = ", ".join([f"{l.get('test_name')} is {l.get('status')} at {l.get('value_text') or l.get('value')} {l.get('original_unit') or l.get('unit', '')}" for l in abnormal_labs[:3]])
            summary_content = (
                f"Based on your diagnostic laboratory results, your primary health findings indicate that {abn_desc}. "
                f"Overall, {len(self.labs)} test parameter(s) and {len(self.meds)} prescribed medication(s) were clinically evaluated. "
                f"The remaining parameters fall within standard reference limits. "
                f"Please follow the recommended dietary adjustments, take any prescribed medications as instructed, and discuss these results with your attending doctor."
            )
        elif self.labs:
            summary_content = (
                f"Based on your diagnostic laboratory results, all {len(self.labs)} evaluated parameters, including your blood cell counts and metabolic markers, are within normal healthy reference intervals. "
                f"Continue maintaining balanced nutrition and wellness habits, and share this report with your physician during your next routine consultation."
            )
        elif self.meds:
            summary_content = (
                f"Your medical prescription outlines {len(self.meds)} prescribed medication(s) for your active clinical therapy. "
                f"Please adhere strictly to the recommended dosages and timing, and consult your attending physician with any questions."
            )
        else:
            summary_content = (
                f"Your healthcare record has been reviewed. Please consult your physician for clinical correlation with your ongoing symptoms and health goals."
            )

        # Section 8: Sources, Limitations, and Safety Notice
        safety_content = (
            "• **Information Sources:** Extracted directly from your uploaded medical document using optical character recognition and cross-referenced with standard diagnostic reference intervals (NABL/WHO).\n"
            "• **AI Educational Limitations:** This automated analysis is designed solely for educational interpretation and patient understanding. It does not constitute a definitive medical diagnosis, nor does it replace an in-person consultation with a qualified healthcare professional.\n"
            "• **Patient Safety Rule:** Always consult your registered medical practitioner before making any clinical decisions or changing your treatment plan."
        )

        return [
            MedicalReportSection(id="overview", number=1, title="1. Document Overview", content=overview),
            MedicalReportSection(id="findings", number=2, title="2. Detected Findings and Test Results", content=findings_content),
            MedicalReportSection(id="explanation", number=3, title="3. Explanation of Each Important Result", content=explanation_content),
            MedicalReportSection(id="medications", number=4, title="4. Prescribed Medications and Dosage Information", content=medications_content),
            MedicalReportSection(id="nutrition", number=5, title="5. Diet and Nutrition Information", content=nutrition_content),
            MedicalReportSection(id="follow_up", number=6, title="6. Recommended Follow-up and Precautions", content=followup_content),
            MedicalReportSection(id="patient_summary", number=7, title="7. Multilingual Patient-Friendly Summary", content=summary_content),
            MedicalReportSection(id="safety_notice", number=8, title="8. Sources, Limitations, and Safety Notice", content=safety_content),
        ]

    # -----------------------------------------------------------------
    # TELUGU BUILDER (తెలుగు)
    # -----------------------------------------------------------------
    def _build_telugu_sections(self) -> List[MedicalReportSection]:
        has_labs = len(self.labs) > 0
        has_meds = len(self.meds) > 0

        # Section 1: Document Overview
        overview = (
            f"ఈ ఆరోగ్య పత్రం **{self.facility}** ద్వారా **{self.date_issued}** తేదీన జారీ చేయబడిన వైద్య నివేదికగా ధృవీకరించబడింది. "
            f"మా క్లినికల్ అనాలిసిస్ సిస్టమ్ ఈ పత్రం నుండి {len(self.labs)} ప్రయోగశాల పరీక్షల వివరాలను మరియు {len(self.meds)} సూచించిన మందుల వివరాలను సేకరించింది. "
            f"అసలు నివేదికలో ముద్రించిన పరీక్షల విలువలు, యూనిట్లు మరియు ప్రమాణ పరిమితులు ఖచ్చితంగా భద్రపరచబడ్డాయి."
        )

        # Section 2: Detected Findings and Test Results
        if has_labs:
            findings_rows = ["| పరీక్ష పేరు | వచ్చిన విలువ | యూనిట్ | సాధారణ పరిమితి | స్థితి |",
                             "| :--- | :--- | :--- | :--- | :--- |"]
            for l in self.labs:
                t_name = l.get("test_name", "పరీక్ష")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                ref = l.get("reference_interval", "సాధారణం")
                status = l.get("status", "Normal")
                st_te = "సాధారణం (Normal)" if status == "Normal" else ("ఎక్కువ (High)" if "High" in status else "తక్కువ (Low)")
                findings_rows.append(f"| **{t_name}** | {val} | {unit} | {ref} | `{st_te}` |")
            findings_content = "\n".join(findings_rows)
        else:
            findings_content = "ఈ అప్‌లోడ్ చేసిన పత్రంలో ఎటువంటి క్లినికల్ ల్యాబ్ పరీక్షల విలువలు కనుగొనబడలేదు."

        # Section 3: Explanation of Each Important Result
        if has_labs:
            exp_lines = []
            for l in self.labs:
                t_name = l.get("test_name", "పరీక్ష")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                status = l.get("status", "Normal")
                ref = l.get("reference_interval", "")

                exp = f"• **{t_name} ({val} {unit}):** "
                if "hemoglobin" in t_name.lower():
                    exp += (
                        f"హిమోగ్లోబిన్ అనేది శరీరంలోని అన్ని భాగాలకు ఆక్సిజన్‌ను మోసుకెళ్లే ఎర్ర రక్త కణాలలోని ముఖ్యమైన ప్రొటీన్. "
                        f"మీ నివేదికలో నమోదైన విలువ {val} {unit}, ఇది సాధారణ పరిమితి ({ref}) తో పోల్చితే **{status}** గా ఉంది. "
                    )
                    if status.lower() == "low":
                        exp += "హిమోగ్లోబిన్ తక్కువగా ఉండటం రక్తహీనత (Anemia) లేదా ఐరన్ లోపాన్ని సూచించవచ్చు, దీనివల్ల నీరసం లేదా అలసట రావచ్చు."
                    else:
                        exp += "ఇది శరీరంలో తగినంత ఆక్సిజన్ సరఫరా సామర్థ్యాన్ని సూచిస్తుంది."
                elif "glucose" in t_name.lower() or "fbs" in t_name.lower() or "ppbs" in t_name.lower() or "hba1c" in t_name.lower():
                    exp += (
                        f"ఈ పరీక్ష రక్తంలో చక్కెర శాతాన్ని మరియు జీవక్రియ నియంత్రణను కొలుస్తుంది. "
                        f"మీ ఫలితం {val} {unit} సాధారణ పరిమితి ({ref}) ప్రకారం **{status}** గా ఉంది. ఆహార నియమాలు మరియు వ్యాయామం పాటించడం ముఖ్యం."
                    )
                elif "platelet" in t_name.lower():
                    exp += (
                        f"ప్లేట్‌లెట్స్ రక్తం గడ్డకట్టడానికి మరియు గాయాలు నయం కావడానికి అవసరమైన రక్త కణాలు. "
                        f"మీ విలువ {val} {unit} సాధారణ పరిమితి ({ref}) కి అనుగుణంగా **{status}** గా నమోదైంది."
                    )
                elif "creatinine" in t_name.lower():
                    exp += (
                        f"సీరం క్రియాటినిన్ అనేది మూత్రపిండాల వడపోత సామర్థ్యాన్ని సూచించే ముఖ్యమైన పరీక్ష. "
                        f"మీ ఫలితం {val} {unit} సాధారణ పరిమితి ({ref}) తో పోలిస్తే **{status}** గా ఉంది."
                    )
                else:
                    exp += (
                        f"ఈ ప్రయోగశాల పరీక్ష మీ శరీర జీవక్రియలను మరియు ఆరోగ్య స్థితిని ప్రతిబింబిస్తుంది. "
                        f"నమోదైన విలువ {val} {unit} సాధారణ పరిమితి ({ref}) తో పోలిస్తే **{status}** పరిధిలో ఉంది."
                    )
                exp_lines.append(exp)
            explanation_content = "\n\n".join(exp_lines)
        elif has_meds:
            explanation_content = (
                f"ఈ ప్రిస్క్రిప్షన్ పత్రంలో మీ వైద్యులు {len(self.meds)} రకాల మందులను సూచించారు. "
                f"ఇవి వ్యాధి నివారణకు మరియు శారీరక స్వస్థతకు ఉద్దేశించినవి. వైద్యుల సలహా ప్రకారం వీటిని సకాలంలో వాడాలి."
            )
        else:
            explanation_content = "ఈ పత్రంలో వ్యక్తిగత రోగ నిర్ధారణ పరీక్షల పరిమితులు లేకుండా సాధారణ ఆరోగ్య సమాచారం అందించబడింది."

        # Section 4: Prescribed Medications and Dosage Information
        if has_meds:
            med_lines = []
            for idx, m in enumerate(self.meds, 1):
                name = m.get("name", "మందు")
                strength = m.get("strength", "")
                dosage = m.get("dosage", "వైద్యుల సూచన ప్రకారం")
                timing = m.get("timing", "భోజనం తర్వాత")
                purpose = m.get("purpose") or "చికిత్స కొరకు"
                med_lines.append(
                    f"{idx}. **{name} {strength}**\n"
                    f"   • **మోతాదు / సమయం:** `{dosage}`\n"
                    f"   • **తీసుకోవలసిన విధానం:** {timing} తగినంత మంచినీటితో\n"
                    f"   • **ఉపయోగం:** {purpose}"
                )
            medications_content = "\n\n".join(med_lines)
        else:
            medications_content = "ఈ అప్‌లోడ్ చేసిన పత్రంలో ఎటువంటి మందుల ప్రిస్క్రిప్షన్ సమాచారం కనుగొనబడలేదు. ఈ రికార్డులో ఎటువంటి మందులు సూచించబడలేదు."

        # Section 5: Diet and Nutrition Information
        nutrition_points = [
            "• **సమతుల్య పోషకాహారం:** ప్రతిరోజూ ఆకుకూరలు (పాలకూర, తోటకూర), తాజా కూరగాయలు, కాయధాన్యాలు, పప్పుదినుసులు మరియు తగినంత ప్రొటీన్లు ఉండే ఆహారాన్ని తీసుకోండి.",
            "• **రక్తవృద్ధి ఆహారాలు:** ఐరన్ మరియు విటమిన్ సి సమృద్ధిగా ఉండే దానిమ్మ, ఖర్జూరం, ఎండుద్రాక్ష, నిమ్మకాయ రసం వంటి ఆహారాలను ఆహారంలో చేర్చుకోండి.",
            "• **మంచినీటి వినియోగం:** శరీరంలో తేమను కాపాడుకోవడానికి మరియు కిడ్నీల పనితీరు మెరుగుపడటానికి రోజంతా తగినంత మంచినీరు త్రాగండి.",
            "• **పరిమితి హెచ్చరిక:** ఈ ఆహార సూచనలు సాధారణ అవగాహన కొరకు మాత్రమే. ప్రత్యేకమైన లేదా కఠినమైన ఆహార నియమాలను మీ వైద్యుల అనుమతితో మాత్రమే ప్రారంభించండి."
        ]
        nutrition_content = "\n\n".join(nutrition_points)

        # Section 6: Recommended Follow-up and Precautions
        followup_points = [
            "• **వైద్యుల సంప్రదింపులు:** ఈ పూర్తి ల్యాబ్ నివేదికను మీ వ్యక్తిగత వైద్యుడికి చూపించి సరైన వైద్య సలహాను పొందండి.",
            "• **మందుల భద్రత:** వైద్యుల సలహా లేకుండా సూచించిన మందుల మోతాదులను మార్చడం లేదా ఆపడం చేయకండి.",
            "• **పునఃపరీక్షలు:** రక్త విలువల మార్పులను గమనించడానికి వైద్యులు సూచించిన సమయానికి పునఃపరీక్షలు చేయించుకోండి.",
            "• **అత్యవసర జాగ్రత్త:** తీవ్రమైన కళ్ళు తిరగడం, శ్వాస తీసుకోవడంలో ఇబ్బంది లేదా నిరంతర జ్వరం వంటి లక్షణాలు కనిపిస్తే వెంటనే ఆసుపత్రికి వెళ్ళండి."
        ]
        followup_content = "\n\n".join(followup_points)

        # Section 7: Multilingual Patient-Friendly Summary (Telugu)
        abnormal_labs = [l for l in self.labs if l.get("status", "").lower() in ["high", "low", "critical", "borderline"]]
        if abnormal_labs:
            abn_items = []
            for l in abnormal_labs[:3]:
                t = l.get("test_name")
                v = l.get("value_text") or str(l.get("value", ""))
                u = l.get("original_unit") or l.get("unit", "")
                st = "తక్కువగా" if "low" in l.get("status", "").lower() else "ఎక్కువగా"
                abn_items.append(f"{t} ({v} {u}) {st}")
            abn_str = ", ".join(abn_items)
            summary_content = (
                f"మీ రక్త పరీక్షల ఫలితాల ప్రకారం, ప్రధానంగా {abn_str} నమోదైంది. "
                f"మొత్తం {len(self.labs)} ల్యాబ్ పరీక్షలు మరియు {len(self.meds)} మందుల వివరాలు విశ్లేషించబడ్డాయి. "
                f"మిగిలిన పరీక్షా విలువలు సాధారణ ఆరోగ్యకర పరిధిలోనే ఉన్నాయి. "
                f"సరైన పోషకాహారాన్ని తీసుకోండి, మందులను సకాలంలో వాడండి మరియు సమగ్ర వైద్య సలహా కొరకు మీ వైద్యుడిని సంప్రదించండి."
            )
        elif self.labs:
            summary_content = (
                f"మీ రక్త పరీక్షల ఫలితాల ప్రకారం, అన్ని {len(self.labs)} పరీక్షా కొలమానాలు సాధారణ ఆరోగ్యకర పరిమితిలోనే ఉన్నాయి. "
                f"ఆరోగ్యకరమైన జీవనశైలిని కొనసాగించండి మరియు సాధారణ తనిఖీ కోసం మీ వైద్యుడిని సంప్రదించండి."
            )
        elif self.meds:
            summary_content = (
                f"ఈ ప్రిస్క్రిప్షన్‌లో మీకు {len(self.meds)} రకాల మందులు సూచించబడ్డాయి. "
                f"వైద్యులు నిర్దేశించిన సమయాల్లో మరియు సరైన మోతాదుల్లో మందులను వాడండి."
            )
        else:
            summary_content = (
                f"మీ వైద్య సమాచారం విశ్లేషించబడింది. సమగ్ర వైద్య మార్గదర్శకత్వం కొరకు మీ వైద్యుడిని సంప్రదించండి."
            )

        # Section 8: Sources, Limitations, and Safety Notice
        safety_content = (
            "• **సమాచార మూలాలు:** మీరు అప్‌లోడ్ చేసిన వైద్య పత్రం యొక్క ఆప్టికల్ క్యారెక్టర్ రికగ్నిషన్ (OCR) ఆధారంగా మరియు ప్రామాణిక క్లినికల్ సూచనల ద్వారా రూపొందించబడింది.\n"
            "• **AI విశ్లేషణ పరిమితులు:** ఈ కంప్యూటర్ ఆధారిత విశ్లేషణ కేవలం మీ అవగాహన కొరకు మాత్రమే అందించబడింది. ఇది అర్హత కలిగిన వైద్యుల ప్రత్యక్ష పరీక్షకు లేదా రోగ నిర్ధారణకు ప్రత్యామ్నాయం కాదు.\n"
            "• **భద్రతా నియమం:** ఏదైనా వైద్య నిర్ణయం తీసుకునే ముందు ఎల్లప్పుడూ మీ వైద్యుడిని సంప్రదించండి."
        )

        return [
            MedicalReportSection(id="overview", number=1, title="1. పత్రం అవలోకనం", content=overview),
            MedicalReportSection(id="findings", number=2, title="2. గుర్తించిన ఫలితాలు మరియు పరీక్షా వివరాలు", content=findings_content),
            MedicalReportSection(id="explanation", number=3, title="3. ముఖ్యమైన ఫలితాల వివరణ", content=explanation_content),
            MedicalReportSection(id="medications", number=4, title="4. సూచించిన మందులు మరియు మోతాదు సమాచారం", content=medications_content),
            MedicalReportSection(id="nutrition", number=5, title="5. ఆహారం మరియు పోషకాహార సమాచారం", content=nutrition_content),
            MedicalReportSection(id="follow_up", number=6, title="6. సిఫార్సు చేసిన ఫాలో-అప్ మరియు జాగ్రత్తలు", content=followup_content),
            MedicalReportSection(id="patient_summary", number=7, title="7. రోగికి అనుకూలమైన సమగ్ర సారాంశం", content=summary_content),
            MedicalReportSection(id="safety_notice", number=8, title="8. మూలాలు, పరిమితులు మరియు భద్రతా సమాచారం", content=safety_content),
        ]

    # -----------------------------------------------------------------
    # HINDI BUILDER (हिन्दी)
    # -----------------------------------------------------------------
    def _build_hindi_sections(self) -> List[MedicalReportSection]:
        has_labs = len(self.labs) > 0
        has_meds = len(self.meds) > 0

        # Section 1: Document Overview
        overview = (
            f"यह स्वास्थ्य दस्तावेज़ **{self.facility}** द्वारा **{self.date_issued}** को जारी की गई एक प्रामाणिक मेडिकल रिपोर्ट के रूप में सत्यापित किया गया है। "
            f"हमारे क्लिनिकल एक्सट्रैक्शन सिस्टम ने इस दस्तावेज़ से {len(self.labs)} प्रयोगशाला परीक्षणों और {len(self.meds)} दवाओं के रिकॉर्ड का विश्लेषण किया है। "
            f"मूल रिपोर्ट में दिए गए परीक्षण मान, इकाइयाँ और संदर्भ अंतराल पूरी सटीकता के साथ संरक्षित किए गए हैं।"
        )

        # Section 2: Detected Findings and Test Results
        if has_labs:
            findings_rows = ["| परीक्षण का नाम | प्राप्त मान | इकाई | सामान्य संदर्भ सीमा | स्थिति |",
                             "| :--- | :--- | :--- | :--- | :--- |"]
            for l in self.labs:
                t_name = l.get("test_name", "परीक्षण")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                ref = l.get("reference_interval", "सामान्य")
                status = l.get("status", "Normal")
                st_hi = "सामान्य (Normal)" if status == "Normal" else ("अधिक (High)" if "High" in status else "कम (Low)")
                findings_rows.append(f"| **{t_name}** | {val} | {unit} | {ref} | `{st_hi}` |")
            findings_content = "\n".join(findings_rows)
        else:
            findings_content = "अपलोड किए गए दस्तावेज़ में कोई नैदानिक प्रयोगशाला परीक्षण मान नहीं मिले हैं।"

        # Section 3: Explanation of Each Important Result
        if has_labs:
            exp_lines = []
            for l in self.labs:
                t_name = l.get("test_name", "परीक्षण")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                status = l.get("status", "Normal")
                ref = l.get("reference_interval", "")

                exp = f"• **{t_name} ({val} {unit}):** "
                if "hemoglobin" in t_name.lower():
                    exp += (
                        f"हीमोग्लोबिन लाल रक्त कोशिकाओं में मौजूद वह महत्वपूर्ण प्रोटीन है जो पूरे शरीर में ऑक्सीजन पहुंचाने का कार्य करता है। "
                        f"आपकी रिपोर्ट में दर्ज मान {val} {unit} सामान्य सीमा ({ref}) की तुलना में **{status}** है। "
                    )
                    if status.lower() == "low":
                        exp += "कम हीमोग्लोबिन स्तर एनीमिया या आयरन की कमी का संकेत हो सकता है, जिससे थकान या कमजोरी महसूस हो सकती है।"
                    else:
                        exp += "यह रक्त में ऑक्सीजन वहन करने की सामान्य और स्वस्थ क्षमता को दर्शाता है।"
                elif "glucose" in t_name.lower() or "fbs" in t_name.lower() or "ppbs" in t_name.lower() or "hba1c" in t_name.lower():
                    exp += (
                        f"यह परीक्षण रक्त में शर्करा (शुगर) के स्तर और चयापचय नियंत्रण को मापता है। "
                        f"आपका परिणाम {val} {unit} सामान्य सीमा ({ref}) के सापेक्ष **{status}** श्रेणी में है।"
                    )
                elif "platelet" in t_name.lower():
                    exp += (
                        f"प्लेटलेट्स रक्त के थक्के जमने और घाव भरने के लिए आवश्यक रक्त घटक हैं। "
                        f"आपका मान {val} {unit} संदर्भ सीमा ({ref}) के अनुसार **{status}** स्थिति में है।"
                    )
                elif "creatinine" in t_name.lower():
                    exp += (
                        f"सीरम क्रिएटिनिन गुर्दे (किडनी) की कार्यप्रणाली और रक्त शोधन क्षमता को जांचने का प्रमुख परीक्षण है। "
                        f"आपका मान {val} {unit} सामान्य सीमा ({ref}) के अनुसार **{status}** है।"
                    )
                else:
                    exp += (
                        f"यह प्रयोगशाला परीक्षण आपके शरीर की आंतरिक कार्यप्रणाली को दर्शाता है। "
                        f"दर्ज किया गया मान {val} {unit} मानक संदर्भ सीमा ({ref}) के अनुसार **{status}** है।"
                    )
                exp_lines.append(exp)
            explanation_content = "\n\n".join(exp_lines)
        elif has_meds:
            explanation_content = (
                f"इस मेडिकल पर्चे में आपके चिकित्सक द्वारा {len(self.meds)} दवाएं निर्धारित की गई हैं। "
                f"इन दवाओं का मुख्य उद्देश्य स्वास्थ्य लाभ और बीमारी का उचित उपचार करना है।"
            )
        else:
            explanation_content = "इस दस्तावेज़ में व्यक्तिगत प्रयोगशाला सीमाओं के बिना सामान्य स्वास्थ्य जानकारी दी गई है।"

        # Section 4: Prescribed Medications and Dosage Information
        if has_meds:
            med_lines = []
            for idx, m in enumerate(self.meds, 1):
                name = m.get("name", "दवा")
                strength = m.get("strength", "")
                dosage = m.get("dosage", "चिकित्सक के निर्देशानुसार")
                timing = m.get("timing", "भोजन के बाद")
                purpose = m.get("purpose") or "उपचार हेतु"
                med_lines.append(
                    f"{idx}. **{name} {strength}**\n"
                    f"   • **खुराक / समय:** `{dosage}`\n"
                    f"   • **लेने का तरीका:** {timing} पर्याप्त पानी के साथ\n"
                    f"   • **उपयोग:** {purpose}"
                )
            medications_content = "\n\n".join(med_lines)
        else:
            medications_content = "अपलोड किए गए दस्तावेज़ में कोई दवा पर्ची या नुस्खे की जानकारी नहीं मिली है। इस रिकॉर्ड में कोई दवाएं निर्धारित नहीं की गई हैं।"

        # Section 5: Diet and Nutrition Information
        nutrition_points = [
            "• **संतुलित आहार:** अपने दैनिक भोजन में हरी पत्तेदार सब्जियां (पालक, मेथी), दालें, मौसमी फल, साबुत अनाज और पर्याप्त प्रोटीन शामिल करें।",
            "• **आयरन और विटामिन:** खून की कमी से बचने के लिए अनार, खजूर, चुकंदर और खट्टे फल (विटामिन सी) का सेवन लाभकारी होता है।",
            "• **जल संतुलन:** गुर्दों को स्वस्थ रखने और शरीर को हाइड्रेटेड रखने के लिए दिनभर में पर्याप्त मात्रा में स्वच्छ पानी पिएं।",
            "• **आहार सीमाएं:** ये पोषण संबंधी सलाह केवल सामान्य स्वास्थ्य जागरूकता के लिए हैं। किसी भी विशेष आहार योजना को शुरू करने से पहले अपने डॉक्टर से सलाह लें।"
        ]
        nutrition_content = "\n\n".join(nutrition_points)

        # Section 6: Recommended Follow-up and Precautions
        followup_points = [
            "• **चिकित्सक से परामर्श:** इस पूरी लैब रिपोर्ट को अपने डॉक्टर को अवश्य दिखाएं ताकि वे आपके शारीरिक लक्षणों के साथ इसका सही मूल्यांकन कर सकें।",
            "• **दवाइयों की सुरक्षा:** डॉक्टर की सलाह के बिना कभी भी किसी दवा की खुराक में बदलाव न करें और न ही दवा बंद करें।",
            "• **फॉलो-अप परीक्षण:** बायोमार्कर में सुधार देखने के लिए डॉक्टर द्वारा सुझाए गए समय पर दोबारा जांच कराएं।",
            "• **आपातकालीन संकेत:** यदि आपको अत्यधिक चक्कर आना, सांस लेने में कठिनाई या तेज बुखार जैसे लक्षण महसूस हों, तो तुरंत नजदीकी चिकित्सा केंद्र जाएं।"
        ]
        followup_content = "\n\n".join(followup_points)

        # Section 7: Multilingual Patient-Friendly Summary (Hindi)
        abnormal_labs = [l for l in self.labs if l.get("status", "").lower() in ["high", "low", "critical", "borderline"]]
        if abnormal_labs:
            abn_items = []
            for l in abnormal_labs[:3]:
                t = l.get("test_name")
                v = l.get("value_text") or str(l.get("value", ""))
                u = l.get("original_unit") or l.get("unit", "")
                st = "कम (Low)" if "low" in l.get("status", "").lower() else "अधिक (High)"
                abn_items.append(f"{t} ({v} {u}) {st}")
            abn_str = ", ".join(abn_items)
            summary_content = (
                f"आपकी लैब रिपोर्ट के अनुसार, आपकी मुख्य स्वास्थ्य स्थिति में {abn_str} दर्ज किया गया है। "
                f"कुल {len(self.labs)} परीक्षणों और {len(self.meds)} दवाओं की समीक्षा की गई है। "
                f"अन्य सभी परीक्षण परिणाम सामान्य सीमा में हैं। "
                f"कृपया अनुशंसित आहार संबंधी सावधानियों का पालन करें, दवाएं समय पर लें और अपने डॉक्टर से परामर्श करें।"
            )
        elif self.labs:
            summary_content = (
                f"आपकी मेडिकल रिपोर्ट के अनुसार, आपके सभी {len(self.labs)} परीक्षण मान सामान्य और स्वस्थ सीमा के भीतर हैं। "
                f"संतुलित आहार और दिनचर्या बनाए रखें और नियमित जांच के लिए अपने डॉक्टर से संपर्क करें।"
            )
        elif self.meds:
            summary_content = (
                f"आपके पर्चे में सक्रिय उपचार के लिए {len(self.meds)} दवाएं लिखी गई हैं। "
                f"कृपया डॉक्टर के निर्देशानुसार समय पर दवाएं लें।"
            )
        else:
            summary_content = (
                f"आपके स्वास्थ्य रिकॉर्ड की समीक्षा कर ली गई है। विस्तृत मार्गदर्शन के लिए डॉक्टर से परामर्श लें।"
            )

        # Section 8: Sources, Limitations, and Safety Notice
        safety_content = (
            "• **सूचना स्रोत:** यह रिपोर्ट आपके द्वारा अपलोड किए गए दस्तावेज़ के ऑप्टिकल कैरेक्टर रिकॉग्निशन (OCR) और मानक क्लिनिकल संदर्भ सीमाओं (NABL/WHO) पर आधारित है।\n"
            "• **एआई विश्लेषण की सीमाएं:** यह स्वचालित विश्लेषण केवल मरीज की समझ और शैक्षणिक उद्देश्य के लिए तैयार किया गया है। यह किसी योग्य डॉक्टर के प्रत्यक्ष चिकित्सकीय परामर्श का विकल्प नहीं है।\n"
            "• **सुरक्षा नियम:** कोई भी चिकित्सकीय निर्णय लेने से पहले हमेशा अपने डॉक्टर से परामर्श अवश्य लें।"
        )

        return [
            MedicalReportSection(id="overview", number=1, title="1. दस्तावेज़ का संक्षिप्त विवरण", content=overview),
            MedicalReportSection(id="findings", number=2, title="2. पहचाने गए परिणाम और परीक्षण विवरण", content=findings_content),
            MedicalReportSection(id="explanation", number=3, title="3. महत्वपूर्ण परीक्षण परिणामों की विस्तृत व्याख्या", content=explanation_content),
            MedicalReportSection(id="medications", number=4, title="4. निर्धारित दवाएं और खुराक संबंधी जानकारी", content=medications_content),
            MedicalReportSection(id="nutrition", number=5, title="5. आहार और पोषण संबंधी मार्गदर्शन", content=nutrition_content),
            MedicalReportSection(id="follow_up", number=6, title="6. अनुशंसित फॉलो-अप और स्वास्थ्य सावधानियां", content=followup_content),
            MedicalReportSection(id="patient_summary", number=7, title="7. मरीज के अनुकूल संपूर्ण सारांश", content=summary_content),
            MedicalReportSection(id="safety_notice", number=8, title="8. स्रोत, सीमाएं और महत्वपूर्ण सुरक्षा सूचना", content=safety_content),
        ]

    # -----------------------------------------------------------------
    # TAMIL BUILDER (தமிழ்)
    # -----------------------------------------------------------------
    def _build_tamil_sections(self) -> List[MedicalReportSection]:
        has_labs = len(self.labs) > 0
        has_meds = len(self.meds) > 0

        # Section 1: Document Overview
        overview = (
            f"இந்த மருத்துவ ஆவணம் **{self.facility}** மூலம் **{self.date_issued}** அன்று வழங்கப்பட்ட அறிக்கையாக சரிபார்க்கப்பட்டது. "
            f"எங்கள் மருத்துவ பகுப்பாய்வு அமைப்பு இந்த ஆவணத்திலிருந்து {len(self.labs)} ஆய்வக சோதனை அளவுகளையும் {len(self.meds)} மருந்து விவரங்களையும் பிரித்தெடுத்துள்ளது. "
            f"அசல் அறிக்கையில் உள்ள அனைத்து அளவுகளும், அலகுகளும் மற்றும் குறிப்பு வரம்புகளும் துல்லியமாக பாதுகாக்கப்பட்டுள்ளன."
        )

        # Section 2: Detected Findings and Test Results
        if has_labs:
            findings_rows = ["| பரிசோதனை பெயர் | பெறப்பட்ட அளவு | அலகு | வழக்கமான வரம்பு | நிலை |",
                             "| :--- | :--- | :--- | :--- | :--- |"]
            for l in self.labs:
                t_name = l.get("test_name", "பரிசோதனை")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                ref = l.get("reference_interval", "இயல்பானது")
                status = l.get("status", "Normal")
                st_ta = "இயல்பானது (Normal)" if status == "Normal" else ("அதிகம் (High)" if "High" in status else "குறைவு (Low)")
                findings_rows.append(f"| **{t_name}** | {val} | {unit} | {ref} | `{st_ta}` |")
            findings_content = "\n".join(findings_rows)
        else:
            findings_content = "பதிவேற்றப்பட்ட ஆவணத்தில் எந்த மருத்துவ ஆய்வக சோதனை மதிப்புகளும் காணப்படவில்லை."

        # Section 3: Explanation of Each Important Result
        if has_labs:
            exp_lines = []
            for l in self.labs:
                t_name = l.get("test_name", "பரிசோதனை")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                status = l.get("status", "Normal")
                ref = l.get("reference_interval", "")

                exp = f"• **{t_name} ({val} {unit}):** "
                if "hemoglobin" in t_name.lower():
                    exp += (
                        f"ஹீமோகுளோபின் என்பது உடலில் உள்ள அனைத்து உறுப்புகளுக்கும் ஆக்ஸிஜனை எடுத்துச் செல்லும் இரத்த சிவப்பணுக்களின் முக்கியமான புரதமாகும். "
                        f"உங்கள் அறிக்கையில் உள்ள அளவு {val} {unit}, வழக்கமான வரம்போடு ({ref}) ஒப்பிடும்போது **{status}** நிலையில் உள்ளது. "
                    )
                    if status.lower() == "low":
                        exp += "ஹீமோகுளோபின் குறைவாக இருப்பது இரத்த சோகை அல்லது இரும்புச்சத்து குறைபாட்டைக் குறிக்கலாம்."
                    else:
                        exp += "இது உடலில் சரியான ஆக்ஸிஜன் விநியோகத்தை குறிக்கிறது."
                elif "glucose" in t_name.lower() or "fbs" in t_name.lower() or "ppbs" in t_name.lower() or "hba1c" in t_name.lower():
                    exp += (
                        f"இந்த பரிசோதனை இரத்தத்தில் உள்ள சர்க்கரை அளவை அளவிடுகிறது. "
                        f"உங்கள் முடிவு {val} {unit} வழக்கமான வரம்பிற்குள் ({ref}) **{status}** ஆக உள்ளது."
                    )
                elif "platelet" in t_name.lower():
                    exp += (
                        f"பிளேட்லெட்டுகள் இரத்த உறைதலுக்கும் காயங்கள் ஆறுவதற்கும் அவசியமான இரத்த அணுக்கள் ஆகும். "
                        f"உங்கள் அளவு {val} {unit} வரம்பிற்குள் ({ref}) **{status}** நிலையில் உள்ளது."
                    )
                elif "creatinine" in t_name.lower():
                    exp += (
                        f"சீரம் கிரியேட்டினின் என்பது சிறுநீரகங்களின் வடிகட்டும் திறனை காட்டும் பரிசோதனை ஆகும். "
                        f"உங்கள் அளவு {val} {unit} வரம்பிற்குள் ({ref}) **{status}** ஆக உள்ளது."
                    )
                else:
                    exp += (
                        f"இந்த ஆய்வக பரிசோதனை உங்கள் உடலின் செயல்பாடுகளை காட்டுகிறது. "
                        f"பதிவான அளவு {val} {unit} வரம்பிற்குள் ({ref}) **{status}** ஆக உள்ளது."
                    )
                exp_lines.append(exp)
            explanation_content = "\n\n".join(exp_lines)
        elif has_meds:
            explanation_content = (
                f"இந்த மருத்துவ ஆவணத்தில் உங்கள் மருத்துவர் {len(self.meds)} மருந்துகளை பரிந்துரைத்துள்ளார். "
                f"இவை உங்கள் உடல்நலனை மீட்டெடுக்க உதவும். மருத்துவரின் அறிவுரைப்படி இவற்றை உட்கொள்ளவும்."
            )
        else:
            explanation_content = "இந்த ஆவணத்தில் ஆய்வக வரம்புகள் ஏதுமின்றி பொதுவான மருத்துவ தகவல் வழங்கப்பட்டுள்ளது."

        # Section 4: Prescribed Medications and Dosage Information
        if has_meds:
            med_lines = []
            for idx, m in enumerate(self.meds, 1):
                name = m.get("name", "மருந்து")
                strength = m.get("strength", "")
                dosage = m.get("dosage", "மருத்துவர் அறிவுரைப்படி")
                timing = m.get("timing", "உணவுக்கு பின்")
                purpose = m.get("purpose") or "சிகிச்சைக்காக"
                med_lines.append(
                    f"{idx}. **{name} {strength}**\n"
                    f"   • **அளவு / நேரம்:** `{dosage}`\n"
                    f"   • **உட்கொள்ளும் முறை:** {timing} போதுமான தண்ணீருடன்\n"
                    f"   • **பயன்பாடு:** {purpose}"
                )
            medications_content = "\n\n".join(med_lines)
        else:
            medications_content = "பதிவேற்றப்பட்ட ஆவணத்தில் எந்த மருந்துச் சீட்டு தகவலும் காணப்படவில்லை. இந்த பதிவில் எந்த மருந்துகளும் பரிந்துரைக்கப்படவில்லை."

        # Section 5: Diet and Nutrition Information
        nutrition_points = [
            "• **சத்தான உணவு:** தினமும் கீரைகள், காய்கறிகள், பருப்பு வகைகள், முழு தானியங்கள் மற்றும் பழங்களை உணவில் சேர்த்துக் கொள்ளுங்கள்.",
            "• **இரத்த விருத்தி உணவுகள்:** மாதுளை, பேரீச்சம்பழம், திராட்சை போன்ற இரும்புச்சத்து நிறைந்த உணவுகளை உட்கொள்வது இரத்தத்தை அதிகரிக்க உதவும்.",
            "• **போதுமான தண்ணீர்:** சிறுநீரகங்கள் சிறப்பாக செயல்பட தினமும் போதுமான அளவு சுத்தமான குடிநீர் குடிக்கவும்.",
            "• **உணவு கட்டுப்பாடு குறிப்பு:** இந்த ஊட்டச்சத்து வழிகாட்டுதல் பொதுவான புரிதலுக்கானது மட்டுமே. சிறப்பு உணவு முறைகளை மருத்துவரின் ஆலோசனையுடன் தொடங்கவும்."
        ]
        nutrition_content = "\n\n".join(nutrition_points)

        # Section 6: Recommended Follow-up and Precautions
        followup_points = [
            "• **மருத்துவர் ஆலோசனை:** இந்த முழு அறிக்கையையும் உங்கள் மருத்துவரிடம் காட்டி தகுந்த சிகிச்சை ஆலோசனையை பெறவும்.",
            "• **மருந்து பாதுகாப்பு:** மருத்துவர் அனுமதி இல்லாமல் மருந்துகளின் அளவை மாற்றவோ அல்லது நிறுத்தவோ கூடாது.",
            "• **மறுபரிசோதனை:** உடல்நிலை மாற்றங்களை கண்காணிக்க மருத்துவர் பரிந்துரைத்த நேரத்தில் மீண்டும் பரிசோதனை செய்து கொள்ளவும்.",
            "• **அவசர எச்சரிக்கை:** கடுமையான தலைச்சுற்றல், மூச்சுத்திணறல் அல்லது தொடர் காய்ச்சல் ஏற்பட்டால் உடனடியாக மருத்துவமனைக்கு செல்லவும்."
        ]
        followup_content = "\n\n".join(followup_points)

        # Section 7: Multilingual Patient-Friendly Summary (Tamil)
        abnormal_labs = [l for l in self.labs if l.get("status", "").lower() in ["high", "low", "critical", "borderline"]]
        if abnormal_labs:
            abn_items = []
            for l in abnormal_labs[:3]:
                t = l.get("test_name")
                v = l.get("value_text") or str(l.get("value", ""))
                u = l.get("original_unit") or l.get("unit", "")
                st = "குறைவாக (Low)" if "low" in l.get("status", "").lower() else "அதிகமாக (High)"
                abn_items.append(f"{t} ({v} {u}) {st}")
            abn_str = ", ".join(abn_items)
            summary_content = (
                f"உங்கள் மருத்துவ பரிசோதனை முடிவுகளின்படி, முக்கியமாக {abn_str} பதிவாகியுள்ளது. "
                f"மொத்தம் {len(self.labs)} ஆய்வக அளவுகளும் {len(self.meds)} மருந்துகளும் பகுப்பாய்வு செய்யப்பட்டன. "
                f"மற்ற அனைத்து அளவுகளும் வழக்கமான ஆரோக்கிய வரம்பிற்குள் உள்ளன. "
                f"பரிந்துரைக்கப்பட்ட உணவு முறைகளை பின்பற்றி, மருந்துகளை சரியான நேரத்தில் உட்கொண்டு, மருத்துவரிடம் ஆலோசனை பெறவும்."
            )
        elif self.labs:
            summary_content = (
                f"உங்கள் மருத்துவ பரிசோதனை முடிவுகளின்படி, அனைத்து {len(self.labs)} சோதனைகளும் வழக்கமான ஆரோக்கிய வரம்பிற்குள் உள்ளன. "
                f"சத்தான உணவு முறைகளை தொடர்ந்து கடைப்பிடித்து, மருத்துவரிடம் வழக்கமான பரிசோதனை செய்து கொள்ளவும்."
            )
        elif self.meds:
            summary_content = (
                f"இந்த மருத்துவ சீட்டில் உங்களுக்கு {len(self.meds)} மருந்துகள் பரிந்துரைக்கப்பட்டுள்ளன. "
                f"மருத்துவர் கூறியவாறு மருந்துகளை சரியான நேரத்தில் உட்கொள்ளவும்."
            )
        else:
            summary_content = (
                f"உங்கள் மருத்துவ தகவல் பகுப்பாய்வு செய்யப்பட்டது. விரிவான ஆலோசனைக்கு மருத்துவரை அணுகவும்."
            )

        # Section 8: Sources, Limitations, and Safety Notice
        safety_content = (
            "• **தகவல் மூலங்கள்:** உங்கள் மருத்துவ ஆவணத்தின் OCR மற்றும் உலக சுகாதார அமைப்பின் (WHO/NABL) தரநிலைகளின் அடிப்படையில் உருவாக்கப்பட்டது.\n"
            "• **AI வரம்புகள்:** இந்த கணினி பகுப்பாய்வு உங்களின் கல்வி மற்றும் புரிதலுக்காக மட்டுமே. இது மருத்துவருக்கு மாற்றாகாது.\n"
            "• **பாதுகாப்பு விதி:** எந்தவொரு மருத்துவ முடிவையும் எடுப்பதற்கு முன் எப்போதும் உங்கள் மருத்துவரை அணுகவும்."
        )

        return [
            MedicalReportSection(id="overview", number=1, title="1. ஆவண சுருக்கம்", content=overview),
            MedicalReportSection(id="findings", number=2, title="2. கண்டறியப்பட்ட சோதனை முடிவுகள்", content=findings_content),
            MedicalReportSection(id="explanation", number=3, title="3. முக்கியமான முடிவுகளின் விளக்கம்", content=explanation_content),
            MedicalReportSection(id="medications", number=4, title="4. பரிந்துரைக்கப்பட்ட மருந்துகள் மற்றும் அளவு", content=medications_content),
            MedicalReportSection(id="nutrition", number=5, title="5. உணவு மற்றும் ஊட்டச்சத்து வழிகாட்டுதல்", content=nutrition_content),
            MedicalReportSection(id="follow_up", number=6, title="6. முன்னெச்சரிக்கைகள் மற்றும் அடுத்த கட்ட படிகள்", content=followup_content),
            MedicalReportSection(id="patient_summary", number=7, title="7. நோயாளிக்கான எளிய முழு சுருக்கம்", content=summary_content),
            MedicalReportSection(id="safety_notice", number=8, title="8. ஆதாரங்கள், வரம்புகள் மற்றும் பாதுகாப்பு அறிவிப்பு", content=safety_content),
        ]

    # -----------------------------------------------------------------
    # TENGLISH BUILDER (Telugu in Latin / English script)
    # -----------------------------------------------------------------
    def _build_tanglish_sections(self) -> List[MedicalReportSection]:
        has_labs = len(self.labs) > 0
        has_meds = len(self.meds) > 0

        # Section 1: Document Overview
        overview = (
            f"Ee health document **{self.facility}** dwara **{self.date_issued}** rojuna issue chesina genuine medical report ga verify cheyabadindi. "
            f"Maa clinical extraction system ee report nundi {len(self.labs)} lab test values mariyu {len(self.meds)} prescribed medicines vivaraalu extract chesindi. "
            f"Original report-lo unna test values, units mariyu reference intervals ni exact ga preserve cheyadam jarigindi."
        )

        # Section 2: Detected Findings and Test Results
        if has_labs:
            findings_rows = ["| Test Name | Extracted Value | Unit | Normal Range | Status |",
                             "| :--- | :--- | :--- | :--- | :--- |"]
            for l in self.labs:
                t_name = l.get("test_name", "Test")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                ref = l.get("reference_interval", "Normal")
                status = l.get("status", "Normal")
                st_teng = "Normal" if status == "Normal" else ("High (Ekkuva)" if "High" in status else "Low (Takkuva)")
                findings_rows.append(f"| **{t_name}** | {val} | {unit} | {ref} | `{st_teng}` |")
            findings_content = "\n".join(findings_rows)
        else:
            findings_content = "Ee upload chesina document-lo elanti clinical lab test values kanipinchaledu."

        # Section 3: Explanation of Each Important Result
        if has_labs:
            exp_lines = []
            for l in self.labs:
                t_name = l.get("test_name", "Test")
                val = l.get("value_text") or str(l.get("value", ""))
                unit = l.get("original_unit") or l.get("unit", "")
                status = l.get("status", "Normal")
                ref = l.get("reference_interval", "")

                exp = f"• **{t_name} ({val} {unit}):** "
                if "hemoglobin" in t_name.lower():
                    exp += (
                        f"Hemoglobin anedi body motham oxygen transport chese red blood cells-lo unna key protein. "
                        f"Mee report-lo unna value {val} {unit}, idi normal reference range ({ref}) tho compare cheste **{status}** ga undi. "
                    )
                    if status.lower() == "low":
                        exp += "Hemoglobin takkuva unte anemia leda iron deficiency valla tiredness mariyu weakness anipinchochu."
                    else:
                        exp += "Idi blood-lo manchi oxygen carrying capacity-ni chupistondi."
                elif "glucose" in t_name.lower() or "fbs" in t_name.lower() or "ppbs" in t_name.lower() or "hba1c" in t_name.lower():
                    exp += (
                        f"Ee test blood sugar levels mariyu metabolism-ni measure chestundi. "
                        f"Mee result {val} {unit} reference range ({ref}) prakaram **{status}** ga undi."
                    )
                elif "platelet" in t_name.lower():
                    exp += (
                        f"Platelets anevi blood clotting mariyu healing-ki chala avasaramaina blood cells. "
                        f"Mee reading {val} {unit} reference interval ({ref}) tho compare cheste **{status}** ga undi."
                    )
                elif "creatinine" in t_name.lower():
                    exp += (
                        f"Serum Creatinine anedi kidneys filtration efficiency-ni chupinche main test marker. "
                        f"Mee value {val} {unit} normal range ({ref}) tho **{status}** ga undi."
                    )
                else:
                    exp += (
                        f"Ee lab test mee body metabolism mariyu internal health-ni reflect chestundi. "
                        f"Report value {val} {unit} reference interval ({ref}) tho **{status}** range-lo undi."
                    )
                exp_lines.append(exp)
            explanation_content = "\n\n".join(exp_lines)
        elif has_meds:
            explanation_content = (
                f"Ee prescription document-lo mee doctor {len(self.meds)} medicines prescribe chesaaru. "
                f"Ivi mee treatment mariyu recovery kosam uddeshinchinavi. Doctor advice prakaram vadandi."
            )
        else:
            explanation_content = "Ee document-lo specific lab ranges lekunda general clinical health information undi."

        # Section 4: Prescribed Medications and Dosage Information
        if has_meds:
            med_lines = []
            for idx, m in enumerate(self.meds, 1):
                name = m.get("name", "Medicine")
                strength = m.get("strength", "")
                dosage = m.get("dosage", "Doctor direction prakaram")
                timing = m.get("timing", "Meals tarvata")
                purpose = m.get("purpose") or "Treatment kosam"
                med_lines.append(
                    f"{idx}. **{name} {strength}**\n"
                    f"   • **Dosage / Schedule:** `{dosage}`\n"
                    f"   • **Taking Time:** {timing} water tho tiskondi\n"
                    f"   • **Purpose:** {purpose}"
                )
            medications_content = "\n\n".join(med_lines)
        else:
            medications_content = "Ee upload chesina document-lo elanti prescription leda medicines vivaraalu levu. Ee record-lo ye vidhamaina mandhulu prescribe cheyabadaledu."

        # Section 5: Diet and Nutrition Information
        nutrition_points = [
            "• **Balanced Diet:** Daily aakukuralu (palak, thotakura), fresh vegetables, dals, lentils, mariyu protein foods teesukondi.",
            "• **Iron & Energy Foods:** Hemoglobin mariyu blood strength penchadaniki dates, pomegranate, raisins, beetroot, mariyu vitamin C rich lemon juice teesukondi.",
            "• **Proper Hydration:** Kidneys clean ga undadaniki mariyu body hydrated ga undadaniki daily saripada manchi neellu tagandi.",
            "• **Diet Limitation Notice:** Ee nutrition tips general awareness kosam matrame. Strict diet changes chese mundu mee treating doctor-ni consult cheyandi."
        ]
        nutrition_content = "\n\n".join(nutrition_points)

        # Section 6: Recommended Follow-up and Precautions
        followup_points = [
            "• **Doctor Consultation:** Ee complete lab report-ni mee personal doctor-ki chupinchi proper clinical advice teesukondi.",
            "• **Medication Safety:** Doctor cheppakunda medicines dosage marchadam leda sudden ga stop cheyadam cheyakandi.",
            "• **Follow-up Tests:** Lab values trend thelusukovadaniki doctor advise chesina time-ki re-test cheyinchukondi.",
            "• **Emergency Precaution:** Severe dizziness, breathing difficulty, leda continuous high fever unte ventane hospital-ki vellandi."
        ]
        followup_content = "\n\n".join(followup_points)

        # Section 7: Multilingual Patient-Friendly Summary (Tenglish)
        abnormal_labs = [l for l in self.labs if l.get("status", "").lower() in ["high", "low", "critical", "borderline"]]
        if abnormal_labs:
            abn_items = []
            for l in abnormal_labs[:3]:
                t = l.get("test_name")
                v = l.get("value_text") or str(l.get("value", ""))
                u = l.get("original_unit") or l.get("unit", "")
                st = "takkuvaga (Low)" if "low" in l.get("status", "").lower() else "ekkuvaga (High)"
                abn_items.append(f"{t} ({v} {u}) {st}")
            abn_str = ", ".join(abn_items)
            summary_content = (
                f"Mee diagnostic lab report prakaram, main findings-lo {abn_str} record ayindi. "
                f"Total ga {len(self.labs)} lab parameters mariyu {len(self.meds)} medicines evaluate cheyabaddayi. "
                f"Migilina readings normal standard reference limits-lo unnaayi. "
                f"Proper diet precautions follow avvandi, prescribed medicines regular ga teesukondi, mariyu comprehensive review kosam mee doctor-ni consult cheyandi."
            )
        elif self.labs:
            summary_content = (
                f"Mee lab test results prakaram, all {len(self.labs)} parameters normal and healthy limits-lo unnaayi. "
                f"Healthy lifestyle continue cheyandi, mariyu regular health checkup kosam mee doctor-ni kalavandi."
            )
        elif self.meds:
            summary_content = (
                f"Ee prescription-lo meeku {len(self.meds)} medicines prescribe chesaaru. "
                f"Doctor cheppina dosage mariyu timings prakaram vadandi."
            )
        else:
            summary_content = (
                f"Mee health record review cheyabadindi. Complete clinical guidance kosam mee doctor-ni consult avvandi."
            )

        # Section 8: Sources, Limitations, and Safety Notice
        safety_content = (
            "• **Information Sources:** Upload chesina document OCR text mariyu WHO/NABL standard reference ranges base chesukuni generate cheyabadindi.\n"
            "• **AI Educational Limitations:** Ee computerized analysis patient understanding mariyu education kosam matrame. Idi licensed doctor in-person consultation-ki alternate kaadu.\n"
            "• **Safety Rule:** Treatment leda health decisions theesukune mundu always mee registered doctor-ni consult avvandi."
        )

        return [
            MedicalReportSection(id="overview", number=1, title="1. Document Overview (Aavalonam)", content=overview),
            MedicalReportSection(id="findings", number=2, title="2. Detected Findings & Test Results", content=findings_content),
            MedicalReportSection(id="explanation", number=3, title="3. Detailed Explanation of Important Results", content=explanation_content),
            MedicalReportSection(id="medications", number=4, title="4. Prescribed Medications & Dosage Guide", content=medications_content),
            MedicalReportSection(id="nutrition", number=5, title="5. Diet & Nutrition Guidance", content=nutrition_content),
            MedicalReportSection(id="follow_up", number=6, title="6. Follow-up & Safety Precautions", content=followup_content),
            MedicalReportSection(id="patient_summary", number=7, title="7. Complete Patient-Friendly Summary (Tenglish)", content=summary_content),
            MedicalReportSection(id="safety_notice", number=8, title="8. Sources, Limitations & Safety Rules", content=safety_content),
        ]


# =====================================================================
# 4. MASTER REPORT GENERATOR CLASS
# =====================================================================

class MedicalReportGenerator:
    @classmethod
    def generate_full_report(
        cls,
        document_category: str,
        is_medical: bool,
        extracted_data: Dict[str, Any],
        raw_ocr_text: str = ""
    ) -> CompleteMedicalReport:
        """
        Builds complete 8-section reports across English, Telugu, Hindi, Tamil, and Tenglish.
        Guarantees accurate findings, zero hallucinations, >=150 words per language,
        and speech-ready audio scripts.
        """
        if not is_medical or document_category == "non_medical_image":
            return cls._build_non_medical_report(document_category, raw_ocr_text)

        labs = extracted_data.get("lab_results", [])
        meds = extracted_data.get("medications", [])
        alerts = extracted_data.get("safety_alerts", [])
        patient_name = extracted_data.get("patient_name")
        facility = extracted_data.get("prescriber_or_facility") or extracted_data.get("facility_name")
        date_issued = extracted_data.get("date_issued") or extracted_data.get("report_date")
        uncertain = extracted_data.get("unclear_fields", [])

        reports = {}
        for lang_code in ["english", "telugu", "hindi", "tamil", "tanglish"]:
            rep = cls._build_language_report(
                lang=lang_code,
                doc_type=document_category,
                labs=labs,
                meds=meds,
                alerts=alerts,
                facility=facility,
                patient_name=patient_name,
                date_issued=date_issued,
                uncertain=uncertain
            )
            reports[lang_code] = rep

        return CompleteMedicalReport(
            document_type=document_category,
            is_medical=True,
            patient_name=patient_name,
            facility_or_doctor=facility,
            date_issued=date_issued,
            extracted_findings=labs,
            medications=meds,
            safety_alerts=alerts,
            uncertain_fields=uncertain,
            sources=["Uploaded Document OCR Transcript", "Standard Clinical Reference Ranges (NABL/WHO)"],
            limitations=[
                "Educational interpretation based solely on visible OCR text.",
                "Does not replace in-person diagnostic evaluation by a licensed healthcare professional.",
                "Handwriting ambiguities must be verified with the prescribing doctor or dispensing pharmacist."
            ],
            reports_by_language=reports
        )

    @classmethod
    def _build_non_medical_report(cls, category: str, text: str) -> CompleteMedicalReport:
        languages = {
            "english": ("English", "en", "The uploaded file could not be identified as a medical report or healthcare document. No clinical parameters, diagnoses, medications, or lab abnormalities have been assigned."),
            "telugu": ("Telugu", "te", "అప్‌లోడ్ చేసిన పత్రం వైద్య నివేదిక లేదా ఆరోగ్య పత్రంగా గుర్తించబడలేదు. దీనికి ఎటువంటి వైద్య నిర్ధారణ, మందులు లేదా ప్రయోగశాల లోపాలు కేటాయించబడలేదు."),
            "hindi": ("Hindi", "hi", "अपलोड किया गया दस्तावेज़ किसी मेडिकल रिपोर्ट या स्वास्थ्य दस्तावेज़ के रूप में पहचाना नहीं गया है। कोई नैदानिक निष्कर्ष, दवाएं या प्रयोगशाला असामान्यताएं नहीं दी गई हैं।"),
            "tamil": ("Tamil", "ta", "பதிவேற்றப்பட்ட கோப்பு மருத்துவ அறிக்கை அல்லது சுகாதார ஆவணமாக அடையாளம் காணப்படவில்லை. எந்தவொரு மருத்துவ நோயறிதலும், மருந்துகளும் அல்லது ஆய்வக மாறுபாடுகளும் ஒதுக்கப்படவில்லை."),
            "tanglish": ("Tenglish", "te-Latn", "Upload chesina file medical report or healthcare document ga gurtinchabadaledu. Deeniki ectuwanti medical diagnosis, medicines or lab abnormalities assign cheyaledu.")
        }

        reports = {}
        for l_key, (l_name, l_code, l_desc) in languages.items():
            sections = [
                MedicalReportSection(id="overview", number=1, title="1. Document Overview", content=f"Status: Non-Medical File Detected ({category}). {l_desc}"),
                MedicalReportSection(id="findings", number=2, title="2. Detected Findings and Test Results", content="No clinical laboratory test values were found in this document."),
                MedicalReportSection(id="explanation", number=3, title="3. Explanation of Each Important Result", content="No medical interpretations apply to general non-clinical images or everyday files."),
                MedicalReportSection(id="medications", number=4, title="4. Prescribed Medications and Dosage Information", content="No prescription information was found in the uploaded document."),
                MedicalReportSection(id="nutrition", number=5, title="5. Diet and Nutrition Information", content="General balanced nutrition applies for daily wellness. No medical diet restrictions are indicated."),
                MedicalReportSection(id="follow_up", number=6, title="6. Recommended Follow-up and Precautions", content="If you intended to evaluate health records, please upload a clear, legible prescription or diagnostic lab report."),
                MedicalReportSection(id="patient_summary", number=7, title="7. Multilingual Patient-Friendly Summary", content=l_desc),
                MedicalReportSection(id="safety_notice", number=8, title="8. Sources, Limitations, and Safety Notice", content="Safety Rule: Dr. Doom AI strictly analyzes genuine healthcare records and never invents medical conditions for non-medical files.")
            ]
            full_md = "\n\n".join([f"#### {s.title}\n{s.content}" for s in sections])
            reports[l_key] = LanguageReport(
                language_code=l_code,
                language_name=l_name,
                sections=sections,
                patient_summary=l_desc,
                speech_text=l_desc,
                word_count=len(l_desc.split()),
                full_markdown=full_md
            )

        return CompleteMedicalReport(
            document_type="non_medical_image",
            is_medical=False,
            extracted_findings=[],
            medications=[],
            safety_alerts=[],
            uncertain_fields=[],
            sources=["Uploaded Image Content"],
            limitations=["Document is not a medical file."],
            reports_by_language=reports
        )

    @classmethod
    def _build_language_report(
        cls,
        lang: str,
        doc_type: str,
        labs: List[Dict[str, Any]],
        meds: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]],
        facility: Optional[str],
        patient_name: Optional[str],
        date_issued: Optional[str],
        uncertain: List[str]
    ) -> LanguageReport:
        builder = _ReportLanguageBuilder(lang, doc_type, labs, meds, alerts, facility, patient_name, date_issued, uncertain)
        sections = builder.build_sections()
        
        narrative_parts = [s.content for s in sections if s.id in ["overview", "explanation", "medications", "nutrition", "follow_up", "patient_summary"]]
        combined_narrative = " ".join(narrative_parts)
        word_count = calculate_patient_facing_words(combined_narrative)
        full_md = builder.build_full_markdown(sections)
        speech_text = builder.build_speech_text(sections)

        return LanguageReport(
            language_code=builder.lang_code,
            language_name=builder.lang_name,
            sections=sections,
            patient_summary=sections[6].content,
            speech_text=speech_text,
            word_count=word_count,
            full_markdown=full_md
        )
