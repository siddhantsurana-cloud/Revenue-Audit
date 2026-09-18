"""
Validation Layer for Standard SOC Data
Apollo Revenue Audit - SOC Data Processing Module
"""

import re
import datetime
from typing import Dict, List, Any, Optional, Tuple
from .models import SOCRecord

class SOCValidator:
    """Comprehensive schema and business rule validator for SOC records."""

    @staticmethod
    def validate_record(record_dict: Dict[str, Any], seen_codes: set) -> Tuple[bool, List[str], List[str]]:
        """
        Validates a single SOC record dictionary.
        Returns: (is_valid, error_messages, warning_messages)
        """
        errors: List[str] = []
        warnings: List[str] = []

        # 1. Mandatory Fields
        code = str(record_dict.get("service_code", "")).strip()
        desc = str(record_dict.get("description", "")).strip()
        raw_rate = record_dict.get("rate")

        if not code:
            errors.append("Mandatory field 'service_code' is missing or empty.")
        if not desc:
            errors.append("Mandatory field 'description' is missing or empty.")

        # 2. Rate Validation
        if raw_rate is None:
            errors.append("Mandatory field 'rate' is missing.")
        else:
            try:
                rate_val = float(raw_rate)
                if rate_val < 0:
                    errors.append(f"Rate cannot be negative ({rate_val}).")
                elif rate_val == 0:
                    warnings.append("Zero rate charged for service. Ensure this is intentional (e.g. inside package or complementary).")
            except (ValueError, TypeError):
                errors.append(f"Invalid rate value '{raw_rate}'. Must be a valid numeric amount.")

        # 3. Duplicate Detection
        if code:
            if code in seen_codes:
                warnings.append(f"Duplicate service code '{code}' detected within the imported dataset. Subsequent occurrence will override previous definition.")
            seen_codes.add(code)

        # 4. Date Validations
        eff_from = record_dict.get("effective_from")
        eff_to = record_dict.get("effective_to")

        dt_from = None
        dt_to = None

        if eff_from:
            try:
                dt_from = datetime.datetime.strptime(str(eff_from).strip(), "%Y-%m-%d").date()
            except ValueError:
                errors.append(f"Invalid 'effective_from' date format '{eff_from}'. Expected ISO YYYY-MM-DD.")

        if eff_to:
            try:
                dt_to = datetime.datetime.strptime(str(eff_to).strip(), "%Y-%m-%d").date()
            except ValueError:
                errors.append(f"Invalid 'effective_to' date format '{eff_to}'. Expected ISO YYYY-MM-DD.")

        if dt_from and dt_to:
            if dt_from > dt_to:
                errors.append(f"Effective date conflict: 'effective_from' ({dt_from}) cannot be after 'effective_to' ({dt_to}).")

        # 5. Quantity / Limits Validation
        min_c = record_dict.get("min_charge")
        max_c = record_dict.get("max_charge")
        if min_c is not None and max_c is not None:
            try:
                if float(min_c) > float(max_c):
                    errors.append(f"Minimum charge ({min_c}) cannot exceed maximum charge ({max_c}).")
            except (ValueError, TypeError):
                pass

        return (len(errors) == 0, errors, warnings)

    def validate_batch(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validates an entire batch of SOC records and produces a structured validation report.
        """
        valid_records: List[Dict[str, Any]] = []
        invalid_records: List[Dict[str, Any]] = []
        all_warnings: List[Dict[str, Any]] = []
        seen_codes: set = set()

        for idx, rec in enumerate(records):
            is_valid, errs, warns = self.validate_record(rec, seen_codes)
            row_id = rec.get("source_row") or f"Record #{idx+1}"

            if is_valid:
                valid_records.append(rec)
            else:
                invalid_records.append({
                    "record_index": idx + 1,
                    "source_row": row_id,
                    "record": rec,
                    "reasons": errs
                })

            if warns:
                all_warnings.append({
                    "record_index": idx + 1,
                    "source_row": row_id,
                    "service_code": rec.get("service_code"),
                    "warnings": warns
                })

        total = len(records)
        valid_cnt = len(valid_records)
        invalid_cnt = len(invalid_records)

        return {
            "is_valid": invalid_cnt == 0 and total > 0,
            "total_records": total,
            "valid_count": valid_cnt,
            "invalid_count": invalid_cnt,
            "warning_count": len(all_warnings),
            "valid_records": valid_records,
            "invalid_records": invalid_records,
            "warnings": all_warnings,
            "summary": f"Validation complete: {valid_cnt} valid, {invalid_cnt} invalid out of {total} total records."
        }
