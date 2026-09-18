"""
Central SOC Processing Manager & Pipeline Orchestrator
Apollo Revenue Audit - SOC Data Processing Module
"""

import os
from typing import Dict, List, Any, Optional

from .models import SOCRecord
from .config import MappingConfigManager
from .excel_parser import ExcelSOCParser
from .pdf_parser import PDFSOCParser
from .validator import SOCValidator
from .tariff_integrator import TariffIntegrator

class SOCProcessingManager:
    """End-to-end processing pipeline for Statement of Charges (SOC) documents."""

    def __init__(self, db_path: str = "revenue_audit.db"):
        self.mapping_manager = MappingConfigManager()
        self.excel_parser = ExcelSOCParser(self.mapping_manager)
        self.pdf_parser = PDFSOCParser(self.mapping_manager)
        self.validator = SOCValidator()
        self.integrator = TariffIntegrator(db_path=db_path)

    def process_file(
        self, 
        file_path: str, 
        sheet_name: Optional[str] = None, 
        template_name: Optional[str] = None,
        custom_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Executes the extraction and validation pipeline on an Excel or PDF file.
        Returns extracted data, column mappings, validation report, and standard JSON representation.
        """
        if not os.path.exists(file_path):
            return {
                "status": "error",
                "message": f"File does not exist: {file_path}",
                "records": [],
                "validation": {"is_valid": False, "errors": ["File not found"]}
            }

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()

        # Route to Excel or PDF parser
        if ext in [".xlsx", ".xls", ".xlsm"]:
            parse_result = self.excel_parser.parse_file(file_path, sheet_name=sheet_name, template_name=template_name)
        elif ext == ".pdf":
            parse_result = self.pdf_parser.parse_file(file_path, template_name=template_name)
        else:
            return {
                "status": "error",
                "message": f"Unsupported file extension '{ext}'. Only Excel (.xlsx, .xls) and PDF (.pdf) are supported.",
                "records": [],
                "validation": {"is_valid": False, "errors": [f"Invalid file extension: {ext}"]}
            }

        if parse_result.get("status") == "error":
            return parse_result

        raw_records = parse_result.get("records", [])

        # If custom mapping provided by user in UI, re-map records
        if custom_mapping and raw_records:
            remapped_records: List[Dict[str, Any]] = []
            for rec in raw_records:
                raw_data = rec.get("raw_data", {})
                new_rec_dict = dict(rec)
                for src_col, canon_f in custom_mapping.items():
                    if src_col in raw_data and raw_data[src_col] is not None:
                        new_rec_dict[canon_f] = raw_data[src_col]
                remapped_records.append(new_rec_dict)
            raw_records = remapped_records

        # Step 4: Validate Data
        validation_report = self.validator.validate_batch(raw_records)

        # Step 5: Format Canonical JSON Response
        standard_json = {
            "metadata": {
                "source_file": filename,
                "document_type": "Excel" if ext in [".xlsx", ".xls", ".xlsm"] else "PDF",
                "template_name": template_name or "Auto-Detect",
                "total_extracted": len(raw_records),
                "valid_count": validation_report.get("valid_count", 0),
                "invalid_count": validation_report.get("invalid_count", 0)
            },
            "soc_records": validation_report.get("valid_records", [])
        }

        valid_records = validation_report.get("valid_records", [])
        invalid_count = validation_report.get("invalid_count", 0)
        valid_count = validation_report.get("valid_count", 0)

        status = "success" if valid_count > 0 and invalid_count == 0 else ("warning" if valid_count > 0 else "error")

        return {
            "status": status,
            "message": f"Extracted {len(raw_records)} records ({valid_count} valid, {invalid_count} invalid).",
            "metadata": parse_result.get("metadata", {}),
            "headers": parse_result.get("headers", []),
            "column_mapping": custom_mapping or parse_result.get("column_mapping", {}),
            "validation": validation_report,
            "standard_json": standard_json,
            "records": valid_records if valid_count > 0 else raw_records,
            "preview_records": raw_records[:100] # First 100 for UI table preview
        }

    def commit_to_tariff_module(
        self, 
        valid_records: List[Dict[str, Any]], 
        file_name: str, 
        user: str = "Administrator",
        soc_name: str = "IMPORTED_SOC"
    ) -> Dict[str, Any]:
        """
        Commits validated records to Tariff Module and returns confirmation summary.
        """
        return self.integrator.commit_soc_records(valid_records, file_name, user=user, soc_name=soc_name)
