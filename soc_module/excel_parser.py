"""
Conventional Excel SOC Parser
Apollo Revenue Audit - SOC Data Processing Module
"""

import os
import re
import datetime
from typing import Dict, List, Any, Optional, Tuple
import openpyxl
import pandas as pd

from .models import SOCRecord
from .config import MappingConfigManager

class ExcelSOCParser:
    """Conventional parser for Statement of Charges (SOC) Excel files (.xlsx, .xls)."""

    def __init__(self, mapping_manager: Optional[MappingConfigManager] = None):
        self.mapping_manager = mapping_manager or MappingConfigManager()

    @staticmethod
    def parse_numeric_rate(value: Any) -> Optional[float]:
        """Cleans and converts raw cell values to positive float rates."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        val_str = str(value).strip()
        if not val_str or val_str.lower() in ["n/a", "na", "-", "nil", "null", "none", "zero"]:
            return None
        
        # Remove currency symbols and word tokens without removing decimal points
        val_str = re.sub(r'(?i)\b(rs|inr|usd)\.?\b', '', val_str)
        val_str = re.sub(r'[₹\$€£,\s]', '', val_str)
        # Remove leading/trailing non-numeric chars except minus or leading dot before number
        val_str = re.sub(r'^[^\d\.-]+', '', val_str)
        val_str = re.sub(r'[^\d]+$', '', val_str)
        
        try:
            val_float = float(val_str)
            return val_float
        except ValueError:
            return None

    @staticmethod
    def parse_date_value(value: Any) -> Optional[str]:
        """Converts raw date values or Excel serial dates to ISO YYYY-MM-DD string."""
        if value is None:
            return None
        if isinstance(value, datetime.datetime) or isinstance(value, datetime.date):
            return value.strftime("%Y-%m-%d")
        
        val_str = str(value).strip()
        if not val_str or val_str.lower() in ["n/a", "na", "-", "null", "none"]:
            return None

        # Common formats: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
        date_patterns = [
            ("%Y-%m-%d", r"^\d{4}-\d{2}-\d{2}$"),
            ("%d-%m-%Y", r"^\d{1,2}-\d{1,2}-\d{4}$"),
            ("%d/%m/%Y", r"^\d{1,2}/\d{1,2}/\d{4}$"),
            ("%Y/%m/%d", r"^\d{4}/\d{2}/\d{2}$"),
            ("%d-%b-%Y", r"^\d{1,2}-[A-Za-z]{3}-\d{4}$"),
            ("%d-%b-%y", r"^\d{1,2}-[A-Za-z]{3}-\d{2}$")
        ]

        for fmt, pattern in date_patterns:
            if re.match(pattern, val_str):
                try:
                    dt = datetime.datetime.strptime(val_str, fmt)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass

        # Try parsing ISO strings with timestamps
        try:
            dt = pd.to_datetime(val_str, errors='coerce')
            if pd.notnull(dt):
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass

        return None

    def find_header_row(self, rows: List[Tuple[Any, ...]]) -> Tuple[int, List[str]]:
        """
        Heuristically identifies the real header row by checking which row contains
        the highest number of recognized tariff column keywords.
        Returns: (header_row_index, header_names)
        """
        best_row_idx = 0
        best_score = -1
        best_headers: List[str] = []

        for r_idx, row in enumerate(rows[:25]): # Search first 25 rows
            # Clean values
            cleaned_row = [self.mapping_manager.normalize_header(c) for c in row if c is not None]
            if not cleaned_row:
                continue

            # Calculate match score against aliases
            score = 0
            has_code = False
            has_name = False
            has_rate = False

            for cell in cleaned_row:
                cell_key = self.mapping_manager.clean_key(cell)
                for field_name, aliases in self.mapping_manager.templates.get("generic", {}).get("mapping", {}).items():
                    pass # checked below
                for canonical, aliases in self.mapping_manager.templates.items():
                    pass
                # Check directly in FIELD_ALIASES
                from .config import FIELD_ALIASES
                for canonical, aliases in FIELD_ALIASES.items():
                    for a in aliases:
                        if self.mapping_manager.clean_key(a) == cell_key:
                            score += 1
                            if canonical == "service_code": has_code = True
                            if canonical == "description": has_name = True
                            if canonical == "rate": has_rate = True
                            break

            # Prioritize rows with both (code or name) and rate
            if (has_code or has_name) and has_rate:
                score += 10

            if score > best_score:
                best_score = score
                best_row_idx = r_idx
                best_headers = [str(c) if c is not None else f"Column_{i+1}" for i, c in enumerate(row)]

        if best_score <= 0 and rows:
            # Fallback to first non-empty row
            for r_idx, row in enumerate(rows):
                if any(c is not None and str(c).strip() for c in row):
                    return r_idx, [str(c) if c is not None else f"Column_{i+1}" for i, c in enumerate(row)]
            return 0, [f"Column_{i+1}" for i in range(len(rows[0]))]

        return best_row_idx, best_headers

    def parse_file(self, file_path: str, sheet_name: Optional[str] = None, template_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses an Excel SOC file into raw extracted records and canonical SOC structure.
        """
        if not os.path.exists(file_path):
            return {
                "status": "error",
                "message": f"File not found: {file_path}",
                "records": [],
                "errors": [{"row": 0, "field": "file", "reason": "File does not exist"}]
            }

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".xlsx", ".xls", ".xlsm"]:
            return {
                "status": "error",
                "message": f"Unsupported Excel format '{ext}'. Expected .xlsx or .xls",
                "records": [],
                "errors": [{"row": 0, "field": "extension", "reason": f"Invalid extension {ext}"}]
            }

        try:
            # Read sheet names and data using openpyxl or pandas
            if ext == ".xlsx":
                wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
                available_sheets = wb.sheetnames
                target_sheet = sheet_name if sheet_name in available_sheets else available_sheets[0]
                ws = wb[target_sheet]
                raw_rows = list(ws.iter_rows(values_only=True))
                wb.close()
            else:
                # Use pandas for legacy .xls
                excel_file = pd.ExcelFile(file_path)
                available_sheets = excel_file.sheet_names
                target_sheet = sheet_name if sheet_name in available_sheets else available_sheets[0]
                df = pd.read_excel(file_path, sheet_name=target_sheet, header=None)
                raw_rows = [tuple(x) for x in df.values]

            if not raw_rows or all(not any(r) for r in raw_rows):
                return {
                    "status": "error",
                    "message": f"Excel worksheet '{target_sheet}' is empty.",
                    "records": [],
                    "errors": [{"row": 0, "field": "content", "reason": "Worksheet contains no data rows."}],
                    "metadata": {"source_file": filename, "sheet_name": target_sheet}
                }

            # Locate Header Row
            header_row_idx, raw_headers = self.find_header_row(raw_rows)
            headers = [self.mapping_manager.normalize_header(h) for h in raw_headers]

            # Resolve Column Mapping
            column_mapping = self.mapping_manager.resolve_column_mapping(headers, template_name)

            # Check if essential fields were mapped
            mapped_canonical = set(column_mapping.values())
            diagnostics: List[str] = []
            if "service_code" not in mapped_canonical and "description" not in mapped_canonical:
                diagnostics.append("Neither 'service_code' nor 'description' could be identified from column headers.")
            if "rate" not in mapped_canonical:
                diagnostics.append("Tariff 'rate' column could not be automatically identified.")

            # Iterate over data rows
            extracted_records: List[SOCRecord] = []
            row_errors: List[Dict[str, Any]] = []
            seen_codes: set = set()
            duplicate_count = 0

            for r_idx, row_values in enumerate(raw_rows[header_row_idx + 1:], start=header_row_idx + 2):
                # Skip blank rows
                if not any(v is not None and str(v).strip() for v in row_values):
                    continue

                # Build row dict from headers
                row_dict: Dict[str, Any] = {}
                for col_idx, h_name in enumerate(headers):
                    if col_idx < len(row_values):
                        row_dict[h_name] = row_values[col_idx]

                # Map to canonical attributes
                record_kwargs: Dict[str, Any] = {
                    "source_file": filename,
                    "source_row": r_idx,
                    "raw_data": row_dict
                }

                for src_header, canonical_field in column_mapping.items():
                    val = row_dict.get(src_header)
                    if val is not None:
                        record_kwargs[canonical_field] = val

                # Clean & Normalize Mandatory Fields
                raw_code = record_kwargs.get("service_code")
                raw_desc = record_kwargs.get("description")
                raw_rate = record_kwargs.get("rate")

                # If code is missing but description is present, generate fallback code from row
                code_str = str(raw_code).strip() if raw_code is not None else ""
                desc_str = str(raw_desc).strip() if raw_desc is not None else ""

                if not code_str and desc_str:
                    # Auto-generate deterministic identifier if code column is absent
                    code_str = f"AUTO_{r_idx}"

                parsed_rate = self.parse_numeric_rate(raw_rate)

                # Collect row-level validation warnings
                if not code_str and not desc_str:
                    row_errors.append({
                        "row": r_idx,
                        "field": "service_code/description",
                        "value": None,
                        "reason": "Both service code and description are missing."
                    })
                    continue

                if parsed_rate is None:
                    row_errors.append({
                        "row": r_idx,
                        "field": "rate",
                        "value": raw_rate,
                        "reason": f"Invalid or missing numeric rate: '{raw_rate}'"
                    })
                    continue

                if parsed_rate < 0:
                    row_errors.append({
                        "row": r_idx,
                        "field": "rate",
                        "value": raw_rate,
                        "reason": f"Negative rate values are not permitted: {parsed_rate}"
                    })
                    continue

                # Check Duplicate Code within file
                if code_str in seen_codes:
                    duplicate_count += 1
                seen_codes.add(code_str)

                # Parse dates
                eff_from = self.parse_date_value(record_kwargs.get("effective_from"))
                eff_to = self.parse_date_value(record_kwargs.get("effective_to"))

                soc_record = SOCRecord(
                    service_code=code_str,
                    description=desc_str or code_str,
                    rate=parsed_rate,
                    category=str(record_kwargs.get("category", "General")).strip() or "General",
                    department=str(record_kwargs.get("department", "General")).strip() or "General",
                    unit=str(record_kwargs.get("unit", "Per Quantity")).strip() or "Per Quantity",
                    currency=str(record_kwargs.get("currency", "INR")).strip() or "INR",
                    effective_from=eff_from,
                    effective_to=eff_to,
                    quantity=float(record_kwargs.get("quantity", 1.0)) if record_kwargs.get("quantity") is not None else 1.0,
                    min_charge=self.parse_numeric_rate(record_kwargs.get("min_charge")),
                    max_charge=self.parse_numeric_rate(record_kwargs.get("max_charge")),
                    alias_code=str(record_kwargs.get("alias_code", "")).strip() or None,
                    alias_name=str(record_kwargs.get("alias_name", "")).strip() or None,
                    applicable_payer=str(record_kwargs.get("applicable_payer", "")).strip() or None,
                    room_category=str(record_kwargs.get("room_category", "")).strip() or None,
                    conditions=str(record_kwargs.get("conditions", "")).strip() or None,
                    source_file=filename,
                    source_row=r_idx,
                    raw_data=row_dict
                )
                extracted_records.append(soc_record)

            return {
                "status": "success" if extracted_records else "warning",
                "message": f"Successfully parsed {len(extracted_records)} records from sheet '{target_sheet}'.",
                "metadata": {
                    "source_file": filename,
                    "sheet_name": target_sheet,
                    "available_sheets": available_sheets,
                    "header_row_index": header_row_idx + 1,
                    "total_rows_read": len(raw_rows),
                    "total_extracted": len(extracted_records),
                    "duplicate_codes_in_file": duplicate_count,
                    "diagnostics": diagnostics
                },
                "headers": headers,
                "column_mapping": column_mapping,
                "records": [r.to_dict() for r in extracted_records],
                "errors": row_errors
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to parse Excel file: {str(e)}",
                "records": [],
                "errors": [{"row": 0, "field": "exception", "reason": str(e)}],
                "metadata": {"source_file": filename}
            }
