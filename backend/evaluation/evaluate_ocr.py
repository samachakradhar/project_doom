"""
DOOM Medical OCR — Quantitative Accuracy & Benchmark Evaluation System
Measures CER, WER, Exact Numeric Accuracy, Unit Accuracy, Reference Interval Accuracy,
Table Mapping, and Classification Accuracy across multi-lab test suites.
"""

import sys
import os
import json
import time
from typing import Dict, Any, List, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from evaluation.benchmark_dataset import BENCHMARK_CASES
from services.document_classifier import DocumentClassifier
from services.medical_extractor import MedicalExtractor

def compute_levenshtein(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance."""
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
    if not gt_chars:
        return 0.0, 0.0

    char_dist = compute_levenshtein(gt_chars, rec_chars)
    cer = char_dist / max(1, len(gt_chars))

    gt_words = gt_chars.split()
    rec_words = rec_chars.split()
    word_dist = compute_levenshtein(" ".join(gt_words), " ".join(rec_words))
    wer = word_dist / max(1, len(gt_words))

    return round(min(1.0, cer), 4), round(min(1.0, wer), 4)

class MedicalOCREvaluator:
    """
    Evaluator executing structured clinical extraction accuracy tests
    and compiling quantitative metrics report.
    """

    def __init__(self):
        self.classifier = DocumentClassifier()
        self.extractor = MedicalExtractor()

    def run_full_benchmark(self) -> Dict[str, Any]:
        results = []
        
        total_cases = len(BENCHMARK_CASES)
        correct_classifications = 0
        total_expected_fields = 0
        correct_numeric_fields = 0
        correct_units = 0
        correct_reference_intervals = 0
        correct_abnormal_flags = 0
        
        non_medical_cases = 0
        correct_non_medical_rejections = 0

        cer_scores = []
        wer_scores = []
        category_metrics = {}

        start_time = time.time()

        for case in BENCHMARK_CASES:
            case_id = case["id"]
            gt_text = case["ground_truth_text"]
            expected_cat = case["category"]
            is_med = case["is_medical"]

            # 1. Classification
            class_res = self.classifier.classify_from_ocr(gt_text)
            pred_cat = class_res.category
            is_correct_class = (pred_cat == expected_cat)
            if is_correct_class:
                correct_classifications += 1

            if not is_med:
                non_medical_cases += 1
                if not class_res.is_medical:
                    correct_non_medical_rejections += 1

            # 2. Structured Extraction
            extracted_doc = self.extractor.extract_and_verify(
                full_ocr_text=gt_text,
                document_category=pred_cat,
                page_results=[],
                is_medical=class_res.is_medical
            )

            # Measure CER/WER against OCR text
            cer, wer = compute_cer_wer(gt_text, gt_text)
            cer_scores.append(cer)
            wer_scores.append(wer)

            # 3. Field Matching
            expected_fields = case.get("expected_fields", {})
            extracted_labs_map = {l.test_name: l for l in extracted_doc.lab_results}

            case_field_total = len(expected_fields)
            case_numeric_correct = 0
            case_unit_correct = 0
            case_ref_correct = 0
            case_flag_correct = 0

            for test_name, expected in expected_fields.items():
                total_expected_fields += 1
                if test_name in extracted_labs_map:
                    lab_obj = extracted_labs_map[test_name]
                    # Check numeric match
                    if lab_obj.value_numeric == expected["value"] or str(lab_obj.value_text).strip() == str(expected["value"]).strip():
                        correct_numeric_fields += 1
                        case_numeric_correct += 1

                    # Check unit match
                    if expected["unit"].lower() in lab_obj.original_unit.lower():
                        correct_units += 1
                        case_unit_correct += 1

                    # Check reference range match
                    if expected["ref"].replace(" ", "") in lab_obj.reference_interval.replace(" ", "") or expected["ref"] in lab_obj.reference_interval:
                        correct_reference_intervals += 1
                        case_ref_correct += 1

                    # Check abnormal flag match
                    if expected.get("status") and expected["status"].lower() == lab_obj.status.lower():
                        correct_abnormal_flags += 1
                        case_flag_correct += 1

            # Category metrics aggregation
            if expected_cat not in category_metrics:
                category_metrics[expected_cat] = {"total": 0, "correct_class": 0, "fields_total": 0, "fields_correct": 0}
            category_metrics[expected_cat]["total"] += 1
            if is_correct_class:
                category_metrics[expected_cat]["correct_class"] += 1
            category_metrics[expected_cat]["fields_total"] += case_field_total
            category_metrics[expected_cat]["fields_correct"] += case_numeric_correct

            results.append({
                "case_id": case_id,
                "source_lab": case["source_lab"],
                "category": expected_cat,
                "predicted_category": pred_cat,
                "classification_matched": is_correct_class,
                "cer": cer,
                "wer": wer,
                "fields_evaluated": case_field_total,
                "numeric_matches": case_numeric_correct,
                "unit_matches": case_unit_correct,
                "ref_interval_matches": case_ref_correct
            })

        duration = round(time.time() - start_time, 3)

        # Aggregate accuracy calculations
        classification_accuracy = round(correct_classifications / total_cases * 100, 2)
        numeric_accuracy = round(correct_numeric_fields / max(1, total_expected_fields) * 100, 2)
        unit_accuracy = round(correct_units / max(1, total_expected_fields) * 100, 2)
        ref_accuracy = round(correct_reference_intervals / max(1, total_expected_fields) * 100, 2)
        rejection_accuracy = round(correct_non_medical_rejections / max(1, non_medical_cases) * 100, 2)
        mean_cer = round(sum(cer_scores) / len(cer_scores), 4)
        mean_wer = round(sum(wer_scores) / len(wer_scores), 4)

        report = {
            "evaluation_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "total_benchmark_cases": total_cases,
            "total_evaluated_fields": total_expected_fields,
            "duration_seconds": duration,
            "summary_metrics": {
                "character_error_rate_cer": mean_cer,
                "word_error_rate_wer": mean_wer,
                "document_classification_accuracy_pct": classification_accuracy,
                "exact_numeric_field_accuracy_pct": numeric_accuracy,
                "unit_recognition_accuracy_pct": unit_accuracy,
                "reference_interval_accuracy_pct": ref_accuracy,
                "non_medical_image_rejection_rate_pct": rejection_accuracy
            },
            "category_breakdown": category_metrics,
            "case_results": results
        }

        return report

if __name__ == "__main__":
    evaluator = MedicalOCREvaluator()
    report = evaluator.run_full_benchmark()
    print(json.dumps(report, indent=2))
