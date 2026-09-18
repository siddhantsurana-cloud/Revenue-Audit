"""
Apollo Revenue Audit - SOC Data Processing Module
"""

from .models import SOCRecord, SOC_JSON_SCHEMA
from .config import MappingConfigManager, DEFAULT_TEMPLATES, FIELD_ALIASES
from .excel_parser import ExcelSOCParser
from .pdf_parser import PDFSOCParser
from .validator import SOCValidator
from .tariff_integrator import TariffIntegrator
from .soc_manager import SOCProcessingManager

__all__ = [
    "SOCRecord",
    "SOC_JSON_SCHEMA",
    "MappingConfigManager",
    "DEFAULT_TEMPLATES",
    "FIELD_ALIASES",
    "ExcelSOCParser",
    "PDFSOCParser",
    "SOCValidator",
    "TariffIntegrator",
    "SOCProcessingManager"
]
