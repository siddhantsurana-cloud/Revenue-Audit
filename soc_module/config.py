"""
Configurable Mapping Layer & Template Registry
Apollo Revenue Audit - SOC Data Processing Module
"""

import os
import json
import re
from typing import Dict, List, Any, Optional

# Default Synonyms / Aliases Dictionary for Heuristic Auto-Discovery
FIELD_ALIASES: Dict[str, List[str]] = {
    "service_code": [
        "serviceid", "service_id", "service_code", "servicecode", "code", 
        "item_code", "itemcode", "item_no", "itemno", "item_number", "itemnumber",
        "charge_code", "cpt_code", "sac_code", "tariff_code", "test_code", 
        "proc_code", "id", "service id", "service code", "service code no",
        "servicecode no", "item codeno", "investigation code", "procedure code",
        "hosp code", "hospcode", "package code", "billing code"
    ],
    "description": [
        "servicename", "service_name", "description", "service_description", 
        "item_name", "itemname", "item_description", "itemdescription", 
        "procedure_name", "test_name", "investigation", "investigation_name",
        "service_desc", "particulars", "service details", "service name", 
        "service description", "name of service", "test description", 
        "procedure description", "charge description", "package description",
        "service heading"
    ],
    "department": [
        "dept", "deptname", "dept_name", "department", "department_name", 
        "specialty", "specialty_group", "specialtygroup", "speciality", 
        "speciality_group", "specialitygroup", "group", "cost_center", 
        "sub_department", "discipline", "sub department", "dept desc", 
        "clinical department", "specialty name", "speciality name"
    ],
    "category": [
        "servicetypename", "service_type_name", "servicetype", "service_type", 
        "category", "sub_category", "type", "service_group", "classification",
        "head", "billing_head", "service type", "service classification", 
        "service category", "charge type", "service head", "service sub category"
    ],
    "rate": [
        "finaltariff", "final_tariff", "tariff", "rate", "amount", "price", 
        "standardrate", "standard_rate", "agreed_tariff", "agreed_rate", 
        "ppn_rate", "charge", "base_rate", "ip_rate", "op_rate", "mou_rate", 
        "rates", "tariff_2025_26", "tariff_2026_27", "fees", "fee", 
        "tariff_rate", "tariffrate", "tariff rate", "negotiated_rate", 
        "negotiatedrate", "negotiated rate", "negotiated_tariff", "agreed_price", 
        "op_tariff", "ip_tariff", "unit_price", "cost", "mrp", "standard_charges", 
        "charges", "gross amount", "gross tariff", "approved rate"
    ],
    "unit": [
        "unit", "uom", "charging_method", "chargingmethod", "unit_of_measure", 
        "frequency", "per", "measure_unit", "unit of measurement", "unit of measure"
    ],
    "effective_from": [
        "effective_from", "effectivefrom", "from_date", "fromdate", "valid_from", 
        "validfrom", "start_date", "startdate", "effective_date", "eff date"
    ],
    "effective_to": [
        "effective_to", "effectiveto", "to_date", "todate", "valid_to", 
        "validto", "end_date", "enddate", "expiry_date", "expiry"
    ],
    "quantity": [
        "quantity", "qty", "units", "default_qty", "count", "default quantity"
    ],
    "min_charge": [
        "min_charge", "minimum_charge", "min_rate", "minimum_rate", "min_amount"
    ],
    "max_charge": [
        "max_charge", "maximum_charge", "max_rate", "maximum_rate", "max_amount"
    ],
    "alias_code": [
        "aliascode", "alias_code", "his_code", "legacy_code", "alt_code", "old_code"
    ],
    "alias_name": [
        "aliasname", "alias_name", "his_name", "legacy_name", "alt_name", "old_name"
    ],
    "applicable_payer": [
        "applicable_payer", "payer", "tpa", "insurance_company", "corporate", "scheme", "payer_name"
    ],
    "room_category": [
        "room_category", "room_type", "ward", "bed_type", "accommodation", "room type"
    ],
    "conditions": [
        "conditions", "remarks", "rules", "notes", "clause", "applicability", "comments"
    ]
}

# Predefined Templates for Known Hospital & Insurance SOCs
DEFAULT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "apollo_cash_standard": {
        "name": "Apollo Cash Standard SOC",
        "description": "Standard Apollo Hospitals cash schedule of charges",
        "header_row_hint": 0,
        "mapping": {
            "TEMPLATENAME": "applicable_payer",
            "SERVICEID": "service_code",
            "SERVICENAME": "description",
            "SERVICETYPENAME": "category",
            "DEPTNAME": "department",
            "FINALTARIFF": "rate",
            "ALIASCODE": "alias_code",
            "ALIASNAME": "alias_name"
        },
        "default_currency": "INR",
        "default_unit": "Per Quantity"
    },
    "gipsa_ppn_tariff": {
        "name": "GIPSA PPN Agreed Tariff",
        "description": "General Insurance Public Sector Association Preferred Provider Network tariff",
        "header_row_hint": 2,
        "mapping": {
            "SERVICE ID": "service_code",
            "SERVICE NAME": "description",
            "DEPARTMENT NAME": "department",
            "SERVICE TYPE NAME": "category",
            "TARIFF 2025-26": "rate",
            "Agreed Tariff": "rate",
            "Discount %": "conditions"
        },
        "default_currency": "INR",
        "default_unit": "Per Procedure"
    },
    "excelcare_master_tariff": {
        "name": "Excelcare Master Tariff",
        "description": "Excelcare Hospital unit schedule of charges",
        "header_row_hint": 0,
        "mapping": {
            "SERVICEID": "service_code",
            "SERVICENAME": "description",
            "DEPT": "department",
            "DEPARTMENT": "department",
            "SERVICETYPENAME": "category",
            "Amount ": "rate",
            "Amount": "rate",
            "OP/EMERGENCY": "rate"
        },
        "default_currency": "INR",
        "default_unit": "Per Quantity"
    },
    "hdfc_ergo_agreed": {
        "name": "HDFC ERGO Agreed SOC",
        "description": "Centrally agreed HDFC ERGO negotiated hospital tariff",
        "header_row_hint": 0,
        "mapping": {
            "Item Code": "service_code",
            "Item Description": "description",
            "Department": "department",
            "Category": "category",
            "Negotiated Rate": "rate",
            "Approved Rate": "rate"
        },
        "default_currency": "INR",
        "default_unit": "Per Quantity"
    },
    "kolkata_multispeciality": {
        "name": "Apollo Kolkata Multispeciality SOC",
        "description": "Apollo Multispeciality Kolkata Tariff with room slabs",
        "header_row_hint": 0,
        "mapping": {
            "SERVICE_CODE": "service_code",
            "SERVICE_NAME": "description",
            "DEPARTMENT": "department",
            "SERVICE_TYPE": "category",
            "STANDARD_RATE": "rate"
        },
        "default_currency": "INR",
        "default_unit": "Per Quantity"
    }
}

class MappingConfigManager:
    """Manages configurable mapping templates and column resolution."""
    
    def __init__(self, custom_config_path: Optional[str] = "soc_mapping_config.json"):
        self.custom_config_path = custom_config_path
        self.templates = dict(DEFAULT_TEMPLATES)
        self.load_custom_templates()

    def load_custom_templates(self):
        if self.custom_config_path and os.path.exists(self.custom_config_path):
            try:
                with open(self.custom_config_path, "r", encoding="utf-8") as f:
                    custom_data = json.load(f)
                    if isinstance(custom_data, dict):
                        self.templates.update(custom_data)
            except Exception as e:
                print(f"[MappingConfigManager] Error loading custom templates from {self.custom_config_path}: {e}")

    def save_custom_template(self, template_key: str, template_data: Dict[str, Any]) -> bool:
        self.templates[template_key] = template_data
        if self.custom_config_path:
            try:
                with open(self.custom_config_path, "w", encoding="utf-8") as f:
                    json.dump(self.templates, f, indent=2)
                return True
            except Exception as e:
                print(f"[MappingConfigManager] Error saving custom template: {e}")
                return False
        return True

    @staticmethod
    def normalize_header(header: Any) -> str:
        """Standardizes column header strings by trimming, stripping newlines and lowercasing."""
        if header is None:
            return ""
        h_str = str(header).strip()
        h_str = re.sub(r'[\r\n\t]+', ' ', h_str)
        h_str = re.sub(r'\s+', ' ', h_str)
        return h_str

    @staticmethod
    def clean_key(text: str) -> str:
        """Converts header string to clean alphanumeric lowercase key for lookup."""
        return re.sub(r'[^a-z0-9]', '', str(text).lower())

    def resolve_column_mapping(self, source_headers: List[str], template_name: Optional[str] = None) -> Dict[str, str]:
        """
        Maps source column names to canonical SOC fields.
        If a template is specified and found, it uses explicit template mapping.
        Otherwise, it falls back to heuristic matching against FIELD_ALIASES.
        Returns a dict: { source_header: canonical_field_name }
        """
        resolved: Dict[str, str] = {}
        assigned_canonical: set = set()

        # 1. Template-based mapping if template specified
        if template_name and template_name in self.templates:
            tpl = self.templates[template_name]
            tpl_mapping = tpl.get("mapping", {})
            for src_h in source_headers:
                cleaned_src = self.normalize_header(src_h)
                for tpl_src, canonical_f in tpl_mapping.items():
                    if self.clean_key(tpl_src) == self.clean_key(cleaned_src):
                        resolved[src_h] = canonical_f
                        assigned_canonical.add(canonical_f)
                        break

        # 2. Heuristic resolution for unmapped headers or auto-detect mode
        for src_h in source_headers:
            if src_h in resolved:
                continue
            cleaned = self.clean_key(src_h)
            if not cleaned:
                continue

            best_match = None
            for canonical_field, aliases in FIELD_ALIASES.items():
                if canonical_field in assigned_canonical and canonical_field in ["service_code", "description", "rate"]:
                    # Avoid duplicate assignment of critical unique fields if already mapped
                    continue
                
                # Check exact clean alias match
                for alias in aliases:
                    if self.clean_key(alias) == cleaned:
                        best_match = canonical_field
                        break
                if best_match:
                    break

            # Secondary token-based fallback matching
            if not best_match:
                if "service_code" not in assigned_canonical and any(t in cleaned for t in ["servicecode", "serviceid", "itemcode", "itemno", "itemnum", "chargecode"]):
                    best_match = "service_code"
                elif "description" not in assigned_canonical and any(t in cleaned for t in ["servicename", "itemname", "description", "particular", "testname"]):
                    best_match = "description"
                elif "rate" not in assigned_canonical and any(t in cleaned for t in ["tariff", "rate", "amount", "price", "fee"]):
                    best_match = "rate"
                elif "department" not in assigned_canonical and any(t in cleaned for t in ["dept", "specialty", "speciality"]):
                    best_match = "department"
                elif "category" not in assigned_canonical and any(t in cleaned for t in ["category", "classification", "servicetype"]):
                    best_match = "category"
                elif "unit" not in assigned_canonical and any(t in cleaned for t in ["uom", "unit"]):
                    best_match = "unit"

            if best_match:
                resolved[src_h] = best_match
                assigned_canonical.add(best_match)

        return resolved
