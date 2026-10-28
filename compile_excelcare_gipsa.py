import openpyxl
import os
import json
import re

def parse_num(v):
    if v is None:
        return 0.0
    try:
        n = float(v)
        return n if n >= 0 else 0.0
    except (ValueError, TypeError):
        return 0.0

def compile_excelcare_gipsa():
    candidates = [
        r"S:\Sid Work\1. Apollo\@ Apollo Guwahti\Tarriff Working\Issues in Tool\Issues Reported on 281026\APL EXL HOSP_SOC GIPSA.xlsx",
        r"S:\Sid Work\1. Apollo\@ Apollo Guwahti\Tarriff Working\Tarrif Reporting Format\Excelcare\SOC's from Dipjyoti\APL EXL HOSP_SOC.xlsx"
    ]
    
    filepath = None
    for p in candidates:
        if os.path.exists(p):
            filepath = p
            break
            
    if not filepath:
        print(f"Warning: Neither GIPSA file found in {candidates}")
        return

    output_path = os.path.join(os.path.dirname(__file__), "excelcare_gipsa_2026.json")
    print(f"Loading workbook from {filepath}...")
    wb = openpyxl.load_workbook(filepath, data_only=True, read_only=True)
    items = {}

    # 1. Parse Other Tariff sheet
    if "Other Tariff" in wb.sheetnames:
        sheet_other = wb["Other Tariff"]
        rows_other = list(sheet_other.iter_rows(values_only=True))
        # Header is at row index 1 (row 2), data begins at index 2 (row 3)
        for r in rows_other[2:]:
            if len(r) < 6:
                continue
            raw_id = r[4]
            name = str(r[5]).strip() if r[5] is not None else ""
            if not raw_id or not name:
                continue
            sid = str(raw_id).strip()
            if sid.endswith('.0'):
                sid = sid[:-2]
            sid = sid.lstrip('#').strip()
            if not sid:
                continue
            
            stype = str(r[2]).strip() if r[2] is not None else "Investigations"
            dept = str(r[3]).strip() if r[3] is not None else "Others"
            
            opd = parse_num(r[7])
            gw = parse_num(r[8])
            semi = parse_num(r[9])
            private = parse_num(r[10])
            exec_rate = parse_num(r[11])
            suite = parse_num(r[12])
            icu = parse_num(r[13])
            disc = parse_num(r[14]) if len(r) > 14 else 0.05
            
            # Base rate prioritizes GW (standard ward rate), then OPD, then first positive rate
            base_rate = gw if gw > 0 else (opd if opd > 0 else (semi if semi > 0 else (private if private > 0 else icu)))
            
            rates = {
                "OPD": opd,
                "DAYCARE": opd if opd > 0 else gw,
                "DAY CARE": opd if opd > 0 else gw,
                "GW": gw,
                "4 SHARING": gw,
                "4-SHARING": gw,
                "GENERAL WARD": gw,
                "STANDARD WARD": gw,
                "STANDARD": gw,
                "SEMI PRIVATE": semi,
                "2 SHARING": semi,
                "2-SHARING": semi,
                "TWIN": semi,
                "DOUBLE": semi,
                "PRIVATE": private,
                "SINGLE ROOM": private,
                "SINGLE PRIVATE": private,
                "SINGLE": private,
                "EXECUTIVE": exec_rate,
                "EXECUTIVE ROOM": exec_rate,
                "SUITE": suite,
                "SUITE ROOM": suite,
                "ICU": icu,
                "ICCU": icu,
                "CCU": icu,
                "HDU": icu,
                "NICU": icu,
                "PICU": icu,
                "KTU": icu,
                "SDU": icu,
                "CARDIAC SDU": icu,
                "CTVS SDU": icu,
                "CTVS ICU": icu
            }
            
            item = {
                "id": sid,
                "code": sid,
                "name": name,
                "type": stype,
                "dept": dept,
                "rate": base_rate,
                "opd_rate": opd,
                "sharing_4": gw,
                "sharing_2": semi,
                "single": private,
                "executive": exec_rate,
                "suite": suite,
                "icu": icu,
                "discount": disc,
                "rates": rates,
                "template": "APOLLO EXCELCARE GIPSA TARIFF 2026"
            }
            
            if sid not in items:
                items[sid] = item
            else:
                # If existing has 0 base rate, replace with non-zero
                if items[sid]["rate"] == 0 and base_rate > 0:
                    items[sid] = item
        print(f"Parsed {len(items)} services from Other Tariff.")

    # 2. Add Consultation visits
    consult_visits = [
        {
            "id": "3044193", "code": "3044193", "name": "IPD VISIT - HOD/DIRECTOR AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1500.0, "sharing_4": 1500.0, "sharing_2": 1600.0, "single": 1900.0, "executive": 1900.0, "suite": 2100.0, "icu": 1900.0
        },
        {
            "id": "3044188", "code": "3044188", "name": "IPD VISIT - SPECIALIST AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1200.0, "sharing_4": 1200.0, "sharing_2": 1300.0, "single": 1400.0, "executive": 1400.0, "suite": 1500.0, "icu": 1400.0
        },
        {
            "id": "3044190", "code": "3044190", "name": "IPD VISIT - SUPERSPECIALIST AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1300.0, "sharing_4": 1300.0, "sharing_2": 1400.0, "single": 1500.0, "executive": 1500.0, "suite": 1600.0, "icu": 1500.0
        },
        {
            "id": "3044191", "code": "3044191", "name": "IPD VISIT (VISITING) - SPECIALIST AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1500.0, "sharing_4": 1500.0, "sharing_2": 1500.0, "single": 1500.0, "executive": 1500.0, "suite": 1500.0, "icu": 1500.0
        },
        {
            "id": "3044195", "code": "3044195", "name": "IPD VISIT (VISITING) - SUPERSPECIALIST AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 2000.0, "sharing_4": 2000.0, "sharing_2": 2000.0, "single": 2000.0, "executive": 2000.0, "suite": 2000.0, "icu": 2000.0
        },
        {
            "id": "3044189", "code": "3044189", "name": "IPD VISIT EMERGENCY AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1500.0, "sharing_4": 1500.0, "sharing_2": 1500.0, "single": 1500.0, "executive": 1500.0, "suite": 1500.0, "icu": 1500.0
        },
        {
            "id": "3044192", "code": "3044192", "name": "IPD VISIT TEAM AEH", "type": "Consultation fee", "dept": "Doctor Consultation",
            "opd_rate": 1500.0, "sharing_4": 1500.0, "sharing_2": 1700.0, "single": 1900.0, "executive": 1900.0, "suite": 2100.0, "icu": 1900.0
        }
    ]

    for cv in consult_visits:
        rates = {
            "OPD": cv["opd_rate"], "DAYCARE": cv["opd_rate"], "DAY CARE": cv["opd_rate"],
            "GW": cv["sharing_4"], "4 SHARING": cv["sharing_4"], "4-SHARING": cv["sharing_4"], "GENERAL WARD": cv["sharing_4"], "STANDARD WARD": cv["sharing_4"], "STANDARD": cv["sharing_4"],
            "SEMI PRIVATE": cv["sharing_2"], "2 SHARING": cv["sharing_2"], "2-SHARING": cv["sharing_2"], "TWIN": cv["sharing_2"], "DOUBLE": cv["sharing_2"],
            "PRIVATE": cv["single"], "SINGLE ROOM": cv["single"], "SINGLE PRIVATE": cv["single"], "SINGLE": cv["single"],
            "EXECUTIVE": cv["executive"], "EXECUTIVE ROOM": cv["executive"],
            "SUITE": cv["suite"], "SUITE ROOM": cv["suite"],
            "ICU": cv["icu"], "ICCU": cv["icu"], "CCU": cv["icu"], "HDU": cv["icu"], "NICU": cv["icu"], "PICU": cv["icu"], "KTU": cv["icu"], "SDU": cv["icu"],
            "CARDIAC SDU": cv["icu"], "CTVS SDU": cv["icu"], "CTVS ICU": cv["icu"]
        }
        item = {
            **cv,
            "rate": cv["sharing_4"],
            "discount": 0.05,
            "rates": rates,
            "template": "APOLLO EXCELCARE GIPSA TARIFF 2026"
        }
        items[cv["id"]] = item

    # 3. Add Bed Charges & Triage
    bed_items = [
        {
            "id": "1101600", "code": "1101600", "name": "TRIAGE CHARGE(1 TO 3 HOURS)", "type": "Emergency Bed Charge", "dept": "Emergency",
            "opd_rate": 1600.0, "sharing_4": 1600.0, "sharing_2": 1600.0, "single": 1600.0, "executive": 1600.0, "suite": 1600.0, "icu": 1600.0
        },
        {
            "id": "1101589", "code": "1101589", "name": "TRIAGE CHARGE(3 TO 6 HOURS)", "type": "Emergency Bed Charge", "dept": "Emergency",
            "opd_rate": 2100.0, "sharing_4": 2100.0, "sharing_2": 2100.0, "single": 2100.0, "executive": 2100.0, "suite": 2100.0, "icu": 2100.0
        },
        {
            "id": "1101590", "code": "1101590", "name": "TRIAGE CHARGE(6 TO 12 HOURS)", "type": "Emergency Bed Charge", "dept": "Emergency",
            "opd_rate": 2300.0, "sharing_4": 2300.0, "sharing_2": 2300.0, "single": 2300.0, "executive": 2300.0, "suite": 2300.0, "icu": 2300.0
        },
        {
            "id": "1101591", "code": "1101591", "name": "TRIAGE CHARGE(12 TO 23 HOURS)", "type": "Emergency Bed Charge", "dept": "Emergency",
            "opd_rate": 2850.0, "sharing_4": 2850.0, "sharing_2": 2850.0, "single": 2850.0, "executive": 2850.0, "suite": 2850.0, "icu": 2850.0
        },
        {
            "id": "3030481", "code": "3030481", "name": "OPD PROCEDURE ROOM CHARGE", "type": "Daycare Bed Charge", "dept": "Emergency",
            "opd_rate": 550.0, "sharing_4": 550.0, "sharing_2": 550.0, "single": 550.0, "executive": 550.0, "suite": 550.0, "icu": 550.0
        },
        {
            "id": "85569", "code": "85569", "name": "BED CHARGES (DAYCARE HOURLY)", "type": "Daycare Bed Charge", "dept": "Accomodation",
            "opd_rate": 350.0, "sharing_4": 350.0, "sharing_2": 350.0, "single": 350.0, "executive": 350.0, "suite": 350.0, "icu": 350.0
        },
        {
            "id": "2127", "code": "2127", "name": "ROOM RENT", "type": "Room Rent", "dept": "Accomodation",
            "opd_rate": 0.0, "sharing_4": 2900.0, "sharing_2": 5500.0, "single": 7500.0, "executive": 9000.0, "suite": 15000.0, "icu": 8500.0
        },
        {
            "id": "2126", "code": "2126", "name": "NURSING AND ALLIED CHARGES", "type": "Nursing Charges", "dept": "Accomodation",
            "opd_rate": 500.0, "sharing_4": 1000.0, "sharing_2": 1100.0, "single": 1200.0, "executive": 1300.0, "suite": 1400.0, "icu": 1500.0
        }
    ]

    for bi in bed_items:
        rates = {
            "OPD": bi["opd_rate"], "DAYCARE": bi["opd_rate"], "DAY CARE": bi["opd_rate"],
            "GW": bi["sharing_4"], "4 SHARING": bi["sharing_4"], "4-SHARING": bi["sharing_4"], "GENERAL WARD": bi["sharing_4"], "STANDARD WARD": bi["sharing_4"], "STANDARD": bi["sharing_4"],
            "SEMI PRIVATE": bi["sharing_2"], "2 SHARING": bi["sharing_2"], "2-SHARING": bi["sharing_2"], "TWIN": bi["sharing_2"], "DOUBLE": bi["sharing_2"],
            "PRIVATE": bi["single"], "SINGLE ROOM": bi["single"], "SINGLE PRIVATE": bi["single"], "SINGLE": bi["single"],
            "EXECUTIVE": bi["executive"], "EXECUTIVE ROOM": bi["executive"],
            "SUITE": bi["suite"], "SUITE ROOM": bi["suite"],
            "ICU": bi["icu"], "ICCU": bi["icu"], "CCU": bi["icu"], "HDU": bi["icu"], "NICU": bi["icu"], "PICU": bi["icu"], "KTU": bi["icu"], "SDU": bi["icu"],
            "CARDIAC SDU": bi["icu"], "CTVS SDU": bi["icu"], "CTVS ICU": bi["icu"]
        }
        item = {
            **bi,
            "rate": bi["sharing_4"] if bi["sharing_4"] > 0 else bi["opd_rate"],
            "discount": 0.05,
            "rates": rates,
            "template": "APOLLO EXCELCARE GIPSA TARIFF 2026"
        }
        items[bi["id"]] = item

    results = list(items.values())
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"Excelcare GIPSA 2026 compiled successfully to {output_path}. Total records: {len(results)}")

    # 4. Also update tariff_data.js directly
    tariff_data_path = os.path.join(os.path.dirname(__file__), "tariff_data.js")
    if os.path.exists(tariff_data_path):
        print(f"Injecting into {tariff_data_path}...")
        with open(tariff_data_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        start_idx = None
        end_idx = None
        for i, l in enumerate(lines):
            if "const TARIFF_EXCELCARE_GIPSA_2026 =" in l:
                start_idx = i
            elif start_idx is not None and l.startswith("const TARIFF_EXCELCARE_OIL_INDIA_2025_27 ="):
                end_idx = i
                break
                
        if start_idx is not None and end_idx is not None:
            new_block = "const TARIFF_EXCELCARE_GIPSA_2026 = " + json.dumps(results, indent=4) + ";\n\n"
            lines[start_idx:end_idx] = [new_block]
            with open(tariff_data_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            print("Successfully updated TARIFF_EXCELCARE_GIPSA_2026 in tariff_data.js!")
        else:
            print(f"Warning: Could not locate TARIFF_EXCELCARE_GIPSA_2026 boundaries in tariff_data.js (start={start_idx}, end={end_idx})")

if __name__ == "__main__":
    compile_excelcare_gipsa()
