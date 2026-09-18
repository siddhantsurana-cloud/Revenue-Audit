"""
Canonical SOC Data Model & Schema Definitions
Apollo Revenue Audit - SOC Data Processing Module
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List
import json
import re

@dataclass
class SOCRecord:
    service_code: str
    description: str
    rate: float
    category: str = "General"
    department: str = "General"
    unit: str = "Per Quantity"
    currency: str = "INR"
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    quantity: Optional[float] = 1.0
    min_charge: Optional[float] = None
    max_charge: Optional[float] = None
    alias_code: Optional[str] = None
    alias_name: Optional[str] = None
    applicable_payer: Optional[str] = None
    room_category: Optional[str] = None
    conditions: Optional[str] = None
    source_file: Optional[str] = None
    source_row: Optional[Any] = None
    raw_data: Optional[Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SOCRecord":
        return cls(
            service_code=str(data.get("service_code", "")).strip(),
            description=str(data.get("description", "")).strip(),
            rate=float(data.get("rate", 0.0)),
            category=str(data.get("category", "General")).strip() or "General",
            department=str(data.get("department", "General")).strip() or "General",
            unit=str(data.get("unit", "Per Quantity")).strip() or "Per Quantity",
            currency=str(data.get("currency", "INR")).strip() or "INR",
            effective_from=data.get("effective_from"),
            effective_to=data.get("effective_to"),
            quantity=float(data.get("quantity", 1.0)) if data.get("quantity") is not None else 1.0,
            min_charge=float(data.get("min_charge")) if data.get("min_charge") is not None else None,
            max_charge=float(data.get("max_charge")) if data.get("max_charge") is not None else None,
            alias_code=str(data.get("alias_code")).strip() if data.get("alias_code") is not None else None,
            alias_name=str(data.get("alias_name")).strip() if data.get("alias_name") is not None else None,
            applicable_payer=str(data.get("applicable_payer")).strip() if data.get("applicable_payer") is not None else None,
            room_category=str(data.get("room_category")).strip() if data.get("room_category") is not None else None,
            conditions=str(data.get("conditions")).strip() if data.get("conditions") is not None else None,
            source_file=data.get("source_file"),
            source_row=data.get("source_row"),
            raw_data=data.get("raw_data", {})
        )

# JSON Schema Definition for Standard SOC Package
SOC_JSON_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "StandardSOCDataset",
    "type": "object",
    "required": ["soc_records"],
    "properties": {
        "metadata": {
            "type": "object",
            "properties": {
                "source_file": {"type": "string"},
                "document_type": {"type": "string"},
                "template_name": {"type": "string"},
                "extracted_at": {"type": "string"},
                "total_extracted": {"type": "integer"},
                "currency": {"type": "string"}
            }
        },
        "soc_records": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["service_code", "description", "rate"],
                "properties": {
                    "service_code": {"type": "string", "minLength": 1},
                    "description": {"type": "string", "minLength": 1},
                    "rate": {"type": "number", "minimum": 0},
                    "category": {"type": "string"},
                    "department": {"type": "string"},
                    "unit": {"type": "string"},
                    "currency": {"type": "string"},
                    "effective_from": {"type": ["string", "null"]},
                    "effective_to": {"type": ["string", "null"]},
                    "quantity": {"type": ["number", "null"]},
                    "min_charge": {"type": ["number", "null"]},
                    "max_charge": {"type": ["number", "null"]},
                    "alias_code": {"type": ["string", "null"]},
                    "alias_name": {"type": ["string", "null"]},
                    "applicable_payer": {"type": ["string", "null"]},
                    "room_category": {"type": ["string", "null"]},
                    "conditions": {"type": ["string", "null"]},
                    "source_file": {"type": ["string", "null"]},
                    "source_row": {"type": ["integer", "string", "null"]}
                }
            }
        }
    }
}
