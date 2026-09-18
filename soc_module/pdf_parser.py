"""
Conventional PDF SOC Parser
Apollo Revenue Audit - SOC Data Processing Module
"""

import os
import re
import datetime
from typing import Dict, List, Any, Optional, Tuple
import pdfplumber
import fitz  # PyMuPDF

from .models import SOCRecord
from .config import MappingConfigManager
from .excel_parser import ExcelSOCParser

class PDFSOCParser:
    """Conventional parser for Statement of Charges (SOC) PDF files."""

    def __init__(self, mapping_manager: Optional[MappingConfigManager] = None):
        self.mapping_manager = mapping_manager or MappingConfigManager()

    @staticmethod
    def is_pdf_machine_readable(file_path: str) -> Tuple[bool, int, str]:
        """
        Inspects the PDF to check if text streams or vector tables exist.
        Returns: (is_readable, total_chars, preview_text)
        """
        try:
            doc = fitz.open(file_path)
            total_chars = 0
            first_page_text = ""
            for i, page in enumerate(doc):
                text = page.get_text()
                total_chars += len(text.strip())
                if i == 0:
                    first_page_text = text.strip()
            doc.close()
            return (total_chars > 30, total_chars, first_page_text)
        except Exception as e:
            return (False, 0, str(e))

    def extract_tables_with_pdfplumber(self, file_path: str) -> List[Tuple[int, List[List[Any]]]]:
        """
        Extracts structured tables from each page using pdfplumber's table detection.
        Returns list of (page_number, table_matrix).
        """
        tables_by_page: List[Tuple[int, List[List[Any]]]] = []
        with pdfplumber.open(file_path) as pdf:
            for page_idx, page in enumerate(pdf.pages, start=1):
                # Try lattice / explicit lines first, then stream / text alignment
                page_tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 3,
                    "join_tolerance": 3
                })
                if not page_tables:
                    page_tables = page.extract_tables({
                        "vertical_strategy": "text",
                        "horizontal_strategy": "text",
                        "snap_tolerance": 4,
                        "join_tolerance": 4
                    })
                
                for tbl in page_tables:
                    if tbl and len(tbl) >= 2: # At least header + 1 row
                        tables_by_page.append((page_idx, tbl))
        return tables_by_page

    def extract_records_from_text_fallback(self, file_path: str) -> List[Tuple[int, List[str]]]:
        """
        Fallback parser for text-based PDFs where cell gridlines are absent.
        Extracts lines matching code/description/rate regular expressions.
        """
        extracted_rows: List[Tuple[int, List[str]]] = []
        doc = fitz.open(file_path)

        # Pattern: [Service Code] [Description...] [Numeric Rate]
        # Example: "1001 COMPLETE BLOOD COUNT 450.00"
        line_pattern = re.compile(r'^([A-Z0-9\-\.\_]{2,15})\s+(.+?)\s+([₹\$Rs\.INR\s]*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*$', re.IGNORECASE)

        for page_idx, page in enumerate(doc, start=1):
            text = page.get_text("text")
            lines = text.split("\n")
            for line in lines:
                line_str = line.strip()
                if not line_str or len(line_str) < 5:
                    continue
                match = line_pattern.match(line_str)
                if match:
                    code, desc, rate = match.groups()
                    extracted_rows.append((page_idx, [code, desc, rate]))
        doc.close()
        return extracted_rows

    def parse_file(self, file_path: str, template_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Parses a PDF SOC file into raw extracted records and canonical SOC structure.
        """
        if not os.path.exists(file_path):
            return {
                "status": "error",
                "message": f"File not found: {file_path}",
                "records": [],
                "errors": [{"page": 0, "field": "file", "reason": "File does not exist"}]
            }

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        if ext != ".pdf":
            return {
                "status": "error",
                "message": f"Unsupported format '{ext}'. Expected .pdf",
                "records": [],
                "errors": [{"page": 0, "field": "extension", "reason": f"Invalid extension {ext}"}]
            }

        # Step 1: Check machine-readability
        is_readable, char_count, preview = self.is_pdf_machine_readable(file_path)
        if not is_readable:
            return {
                "status": "warning",
                "is_scanned": True,
                "message": "Scanned or Image-only PDF detected. Contains 0 extractable text characters. To process scanned documents, please provide a machine-readable digital PDF or use an optical document pipeline.",
                "metadata": {
                    "source_file": filename,
                    "total_characters": char_count,
                    "pages_scanned": True
                },
                "records": [],
                "errors": [{
                    "page": 1,
                    "field": "pdf_content",
                    "reason": "Document has no embedded text streams or extractable tabular glyphs."
                }]
            }

        try:
            # Step 2: Attempt Table Extraction
            tables = self.extract_tables_with_pdfplumber(file_path)
            extracted_records: List[SOCRecord] = []
            row_errors: List[Dict[str, Any]] = []
            seen_codes: set = set()
            duplicate_count = 0
            parsed_headers: List[str] = []
            column_mapping: Dict[str, str] = {}

            if tables:
                # Process Tables across all pages
                for page_num, table_matrix in tables:
                    if not table_matrix:
                        continue
                    
                    # Clean and find headers
                    header_row_idx, raw_headers = ExcelSOCParser(self.mapping_manager).find_header_row(
                        [tuple(r) for r in table_matrix]
                    )
                    headers = [self.mapping_manager.normalize_header(h) for h in raw_headers]
                    if not parsed_headers:
                        parsed_headers = headers
                        column_mapping = self.mapping_manager.resolve_column_mapping(headers, template_name)

                    for r_idx, row_values in enumerate(table_matrix[header_row_idx + 1:], start=header_row_idx + 2):
                        if not any(v is not None and str(v).strip() for v in row_values):
                            continue

                        row_dict: Dict[str, Any] = {}
                        for col_idx, h_name in enumerate(headers):
                            if col_idx < len(row_values):
                                row_dict[h_name] = row_values[col_idx]

                        record_kwargs: Dict[str, Any] = {
                            "source_file": filename,
                            "source_row": f"Page {page_num}, Row {r_idx}",
                            "raw_data": row_dict
                        }

                        for src_header, canonical_field in column_mapping.items():
                            val = row_dict.get(src_header)
                            if val is not None:
                                record_kwargs[canonical_field] = val

                        raw_code = record_kwargs.get("service_code")
                        raw_desc = record_kwargs.get("description")
                        raw_rate = record_kwargs.get("rate")

                        code_str = str(raw_code).strip() if raw_code is not None else ""
                        desc_str = str(raw_desc).strip() if raw_desc is not None else ""
                        if not code_str and desc_str:
                            code_str = f"PDF_P{page_num}_R{r_idx}"

                        parsed_rate = ExcelSOCParser.parse_numeric_rate(raw_rate)

                        if not code_str and not desc_str:
                            continue

                        if parsed_rate is None or parsed_rate < 0:
                            row_errors.append({
                                "page": page_num,
                                "row": r_idx,
                                "field": "rate",
                                "value": raw_rate,
                                "reason": f"Invalid numeric rate: '{raw_rate}'"
                            })
                            continue

                        if code_str in seen_codes:
                            duplicate_count += 1
                        seen_codes.add(code_str)

                        soc_record = SOCRecord(
                            service_code=code_str,
                            description=desc_str or code_str,
                            rate=parsed_rate,
                            category=str(record_kwargs.get("category", "General")).strip() or "General",
                            department=str(record_kwargs.get("department", "General")).strip() or "General",
                            unit=str(record_kwargs.get("unit", "Per Quantity")).strip() or "Per Quantity",
                            currency=str(record_kwargs.get("currency", "INR")).strip() or "INR",
                            effective_from=ExcelSOCParser.parse_date_value(record_kwargs.get("effective_from")),
                            effective_to=ExcelSOCParser.parse_date_value(record_kwargs.get("effective_to")),
                            quantity=float(record_kwargs.get("quantity", 1.0)) if record_kwargs.get("quantity") is not None else 1.0,
                            min_charge=ExcelSOCParser.parse_numeric_rate(record_kwargs.get("min_charge")),
                            max_charge=ExcelSOCParser.parse_numeric_rate(record_kwargs.get("max_charge")),
                            alias_code=str(record_kwargs.get("alias_code", "")).strip() or None,
                            alias_name=str(record_kwargs.get("alias_name", "")).strip() or None,
                            applicable_payer=str(record_kwargs.get("applicable_payer", "")).strip() or None,
                            room_category=str(record_kwargs.get("room_category", "")).strip() or None,
                            conditions=str(record_kwargs.get("conditions", "")).strip() or None,
                            source_file=filename,
                            source_row=f"Page {page_num}, Row {r_idx}",
                            raw_data=row_dict
                        )
                        extracted_records.append(soc_record)

            # Step 3: If no tables extracted, try text line regex fallback
            if not extracted_records:
                text_rows = self.extract_records_from_text_fallback(file_path)
                parsed_headers = ["Service Code", "Description", "Rate"]
                column_mapping = {"Service Code": "service_code", "Description": "description", "Rate": "rate"}

                for page_num, values in text_rows:
                    code_str, desc_str, rate_str = values
                    parsed_rate = ExcelSOCParser.parse_numeric_rate(rate_str)
                    if parsed_rate is not None and parsed_rate >= 0:
                        if code_str in seen_codes:
                            duplicate_count += 1
                        seen_codes.add(code_str)

                        soc_record = SOCRecord(
                            service_code=code_str,
                            description=desc_str,
                            rate=parsed_rate,
                            category="General",
                            department="General",
                            unit="Per Quantity",
                            currency="INR",
                            source_file=filename,
                            source_row=f"Page {page_num}",
                            raw_data={"code": code_str, "desc": desc_str, "rate": rate_str}
                        )
                        extracted_records.append(soc_record)

            return {
                "status": "success" if extracted_records else "warning",
                "message": f"Successfully extracted {len(extracted_records)} tariff records from PDF '{filename}'.",
                "metadata": {
                    "source_file": filename,
                    "tables_found": len(tables),
                    "total_extracted": len(extracted_records),
                    "duplicate_codes_in_file": duplicate_count
                },
                "headers": parsed_headers,
                "column_mapping": column_mapping,
                "records": [r.to_dict() for r in extracted_records],
                "errors": row_errors
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to parse PDF document: {str(e)}",
                "records": [],
                "errors": [{"page": 0, "field": "exception", "reason": str(e)}],
                "metadata": {"source_file": filename}
            }
