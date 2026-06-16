import os
import re
import json
import pdfplumber
import openpyxl

pdf_path = "S:\\Sid Work\\1. Apollo\\@ Apollo Guwahti\\Tarriff Working\\Tarrif Reporting Format\\Kolkata\\HDFC ERGO\\AMHL Tariff_2023-24.pdf"
excel_path = "S:\\Sid Work\\1. Apollo\\@ Apollo Guwahti\\Tarriff Working\\Tarrif Reporting Format\\Kolkata\\HDFC ERGO\\IP service discharge report HDFC May26.xlsx"

# 1. Read unique codes and names from the Excel discharge report
print("Reading discharge report for name-to-code mapping...")
wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))

header = rows[1]
data_rows = rows[2:]

def get_idx(col_name):
    return header.index(col_name)

service_idx = get_idx('serviceid')
sname_idx = get_idx('servicename')
dept_idx = get_idx('dept')

excel_services = {}
for r in data_rows:
    code = r[service_idx]
    name = r[sname_idx]
    dept = r[dept_idx]
    if code:
        code_clean = str(code).strip()
        name_clean = str(name).strip()
        dept_clean = str(dept).strip() if dept else ""
        excel_services[code_clean] = {
            "name": name_clean,
            "dept": dept_clean,
            "num_id": re.sub(r'^[a-zA-Z]', '', code_clean)
        }

# Normalization helper for matching
def normalize_name(name):
    if not name:
        return ""
    s = str(name).lower()
    s = re.sub(r'[^a-z0-9]', '', s)
    return s

excel_norm_map = {}
for code, info in excel_services.items():
    norm = normalize_name(info["name"])
    if norm:
        excel_norm_map[norm] = info

# Add some key manual synonyms for common mismatches
excel_norm_map[normalize_name("OT CHARGES")] = {"num_id": "2103", "name": "Operation Theatre Charges", "dept": "General Surgery"}
excel_norm_map[normalize_name("SURGEON FEES")] = {"num_id": "2121", "name": "Surgeon Fees", "dept": "General Surgery"}
excel_norm_map[normalize_name("ANAESTHESIOLOGIST FEES")] = {"num_id": "2122", "name": "Anaesthesiologist Fees", "dept": "Anaesthesiology"}

# 2. Parse the PDF
print("Opening PDF with pdfplumber...")
pdf = pdfplumber.open(pdf_path)

# 2.1 Room Rents (Page 1)
print("Parsing Page 1 - Room Rents...")
room_rent_table = pdf.pages[0].extract_tables()[0]
room_rents = []
for row in room_rent_table[1:]:
    if len(row) >= 4:
        sl, cat, rent, consult = row
        room_rents.append({
            "category": cat.strip() if cat else "",
            "rent": int(rent.replace(",", "").strip()) if rent and rent.replace(",", "").strip().isdigit() else 0,
            "consultation": int(consult.replace(",", "").strip()) if consult and consult.replace(",", "").strip().isdigit() else 0
        })

# 2.2 Slabs (Page 2)
print("Parsing Page 2 - Slabs (OT, Cathlab, Labour Room)...")
slab_tables = pdf.pages[1].extract_tables()
slabs = []
slab_names = ["OT CHARGES", "CATHLAB CHARGES", "LABOUR ROOM CHARGES"]
for t_idx, table in enumerate(slab_tables):
    name = slab_names[t_idx] if t_idx < len(slab_names) else f"SLAB_{t_idx}"
    for row in table[1:]:
        if len(row) >= 11:
            sl, sname, f_unit, t_unit, stnd, spvt, pvt, pvtdlx, dlx, suite, msuite = row
            def parse_rate(val):
                if not val: return 0
                val_clean = val.replace(",", "").replace(" ", "").strip()
                return int(val_clean) if val_clean.isdigit() else 0

            slabs.append({
                "type": name,
                "sl": sl,
                "service_name": sname.strip() if sname else name,
                "from_min": int(f_unit) if f_unit and f_unit.isdigit() else 0,
                "to_min": int(t_unit) if t_unit and t_unit.isdigit() else 9999,
                "rates": {
                    "STANDARD": parse_rate(stnd),
                    "SEMI-PRIVATE": parse_rate(spvt),
                    "PRIVATE": parse_rate(pvt),
                    "PRIVATE DELUXE": parse_rate(pvtdlx),
                    "DELUXE": parse_rate(dlx),
                    "SUITE": parse_rate(suite),
                    "MAHARAJA SUITE": parse_rate(msuite)
                }
            })

# 2.3 Medical Equipment (Pages 3-4)
print("Parsing Pages 3-4 - Medical Equipment...")
equipment = []
for p_idx in [2, 3]:
    tables = pdf.pages[p_idx].extract_tables()
    for table in tables:
        for row in table[1:]:
            if len(row) >= 6:
                sl, sname, f_unit, t_unit, rate, policy = row
                rate_clean = rate.replace(",", "").replace(" ", "").strip() if rate else "0"
                equipment.append({
                    "sl": sl.strip() if sl else "",
                    "name": sname.strip().replace("\n", " ") if sname else "",
                    "rate": int(rate_clean) if rate_clean.isdigit() else 0,
                    "policy": policy.strip() if policy else ""
                })

# 2.4 Packages (Pages 5-8)
print("Parsing Pages 5-8 - Packages...")
packages = []
for p_idx in range(4, 8):
    tables = pdf.pages[p_idx].extract_tables()
    for table in tables:
        for row in table[1:]:
            if len(row) >= 11:
                sl, dept, sname, days, stnd, sp, pvt, pvtdlx, dlx, suite, msuite = row
                def parse_rate(val):
                    if not val: return 0
                    val_clean = val.replace(",", "").replace(" ", "").strip()
                    if val_clean.isdigit(): return int(val_clean)
                    return val_clean # e.g. "In Actuals"

                packages.append({
                    "sl": sl.strip() if sl else "",
                    "department": dept.strip() if dept else "",
                    "name": sname.strip().replace("\n", " ") if sname else "",
                    "days": int(days) if days and str(days).isdigit() else 1,
                    "rates": {
                        "STANDARD": parse_rate(stnd),
                        "SEMI-PRIVATE": parse_rate(sp),
                        "PRIVATE": parse_rate(pvt),
                        "PRIVATE DELUXE": parse_rate(pvtdlx),
                        "DELUXE": parse_rate(dlx),
                        "SUITE": parse_rate(suite),
                        "MAHARAJA SUITE": parse_rate(msuite)
                    }
                })

# 2.5 IP Services (Pages 9-64)
print("Parsing Pages 9-64 - IP Services...")
ip_services = []
for p_idx in range(8, 64):
    tables = pdf.pages[p_idx].extract_tables()
    for table in tables:
        for row in table[1:]:
            if len(row) >= 11:
                sl, stype, dept, sname, stnd, sp, pvt, pvtdlx, dlx, suite, msuite = row
                def parse_rate(val):
                    if not val: return 0
                    val_clean = val.replace(",", "").replace(" ", "").strip()
                    return int(val_clean) if val_clean.isdigit() else 0

                ip_services.append({
                    "sl": sl.strip() if sl else "",
                    "type": stype.strip() if stype else "Investigations",
                    "department": dept.strip() if dept else "",
                    "name": sname.strip().replace("\n", " ") if sname else "",
                    "rates": {
                        "STANDARD": parse_rate(stnd),
                        "SEMI-PRIVATE": parse_rate(sp),
                        "PRIVATE": parse_rate(pvt),
                        "PRIVATE DELUXE": parse_rate(pvtdlx),
                        "DELUXE": parse_rate(dlx),
                        "SUITE": parse_rate(suite),
                        "MAHARAJA SUITE": parse_rate(msuite)
                    }
                })

# 2.6 OP Services (Pages 65-120)
print("Parsing Pages 65-120 - OP Services...")
op_services = []
for p_idx in range(64, 120):
    tables = pdf.pages[p_idx].extract_tables()
    for table in tables:
        for row in table[1:]:
            if len(row) >= 5:
                sl, stype, dept, sname, rate = row
                rate_clean = rate.replace(",", "").replace(" ", "").strip() if rate else "0"
                op_services.append({
                    "sl": sl.strip() if sl else "",
                    "type": stype.strip() if stype else "Investigations",
                    "department": dept.strip() if dept else "",
                    "name": sname.strip().replace("\n", " ") if sname else "",
                    "rate": int(rate_clean) if rate_clean.isdigit() else 0
                })

# 3. Compile everything and reconcile codes
print("Deduplicating and mapping codes...")
compiled_soc = []
matched_ids = set()

# Index PDF items by normalized name
pdf_ip_norm = {normalize_name(item["name"]): item for item in ip_services if normalize_name(item["name"])}
pdf_op_norm = {normalize_name(item["name"]): item for item in op_services if normalize_name(item["name"])}
pdf_eq_norm = {normalize_name(item["name"]): item for item in equipment if normalize_name(item["name"])}

# 3.1 Reconcile Excel service codes
for code, info in excel_services.items():
    name = info["name"]
    norm = normalize_name(name)
    num_id = info["num_id"]
    
    # 1. Check IP services
    if norm in pdf_ip_norm:
        pdf_item = pdf_ip_norm[norm]
        compiled_soc.append({
            "id": num_id,
            "name": name,
            "type": pdf_item["type"],
            "dept": pdf_item["department"],
            "rates": pdf_item["rates"]
        })
        matched_ids.add(code)
    # 2. Check OP services
    elif norm in pdf_op_norm:
        pdf_item = pdf_op_norm[norm]
        compiled_soc.append({
            "id": num_id,
            "name": name,
            "type": pdf_item["type"],
            "dept": pdf_item["department"],
            "rates": {
                "STANDARD": pdf_item["rate"],
                "SEMI-PRIVATE": pdf_item["rate"],
                "PRIVATE": pdf_item["rate"],
                "PRIVATE DELUXE": pdf_item["rate"],
                "DELUXE": pdf_item["rate"],
                "SUITE": pdf_item["rate"],
                "MAHARAJA SUITE": pdf_item["rate"]
            }
        })
        matched_ids.add(code)
    # 3. Check Equipment
    elif norm in pdf_eq_norm:
        pdf_item = pdf_eq_norm[norm]
        compiled_soc.append({
            "id": num_id,
            "name": name,
            "type": "Equipment",
            "dept": info["dept"] or "Medical Equipment",
            "rates": {
                "STANDARD": pdf_item["rate"],
                "SEMI-PRIVATE": pdf_item["rate"],
                "PRIVATE": pdf_item["rate"],
                "PRIVATE DELUXE": pdf_item["rate"],
                "DELUXE": pdf_item["rate"],
                "SUITE": pdf_item["rate"],
                "MAHARAJA SUITE": pdf_item["rate"]
            }
        })
        matched_ids.add(code)

# 3.2 Add Custom/Special codes
# Consultation Room-wise charges
compiled_soc.append({
    "id": "19631",
    "name": "IP CONSULTATION CHARGES",
    "type": "Consultation",
    "dept": "Consultation",
    "rates": {r["category"]: r["consultation"] for r in room_rents if r["consultation"] > 0}
})

# Add Room Rent itself into the SOC
compiled_soc.append({
    "id": "2127",
    "name": "Room Rent",
    "type": "Room Rent",
    "dept": "Room Rent",
    "rates": {r["category"]: r["rent"] for r in room_rents if r["rent"] > 0}
})

# Add Sterilization Charges (A2126) -> zero rated
compiled_soc.append({
    "id": "2126",
    "name": "STERLZTN CH-STANDARD CONS",
    "type": "Nursing and Hospitals Utilities",
    "dept": "Nursing",
    "rates": {cat: 0 for cat in ["STANDARD", "SEMI-PRIVATE", "PRIVATE", "PRIVATE DELUXE", "DELUXE", "SUITE", "MAHARAJA SUITE"]}
})

# Add Recovery Room Charges (A8875) -> zero rated
compiled_soc.append({
    "id": "8875",
    "name": "RECOVERY ROOM CHARGES",
    "type": "Room Rent",
    "dept": "Recovery Room",
    "rates": {cat: 0 for cat in ["STANDARD", "SEMI-PRIVATE", "PRIVATE", "PRIVATE DELUXE", "DELUXE", "SUITE", "MAHARAJA SUITE"]}
})

# Add OT Charges base code
compiled_soc.append({
    "id": "2103",
    "name": "Operation Theatre Charges",
    "type": "OT Charges",
    "dept": "General Surgery",
    "rates": {cat: 0 for cat in ["STANDARD", "SEMI-PRIVATE", "PRIVATE", "PRIVATE DELUXE", "DELUXE", "SUITE", "MAHARAJA SUITE"]}
})

# Add Surgeon Fees base code
compiled_soc.append({
    "id": "2121",
    "name": "Surgeon Fees",
    "type": "Professional Charges",
    "dept": "General Surgery",
    "rates": {cat: 0 for cat in ["STANDARD", "SEMI-PRIVATE", "PRIVATE", "PRIVATE DELUXE", "DELUXE", "SUITE", "MAHARAJA SUITE"]}
})

# Add Anaesthesiologist Fees base code
compiled_soc.append({
    "id": "2122",
    "name": "Anaesthesiologist Fees",
    "type": "Professional Charges",
    "dept": "Anaesthesiology",
    "rates": {cat: 0 for cat in ["STANDARD", "SEMI-PRIVATE", "PRIVATE", "PRIVATE DELUXE", "DELUXE", "SUITE", "MAHARAJA SUITE"]}
})

# 3.3 Add all remaining PDF items that were NOT matched so we have a complete repository
# Add remaining IP services
for idx, item in enumerate(ip_services):
    norm = normalize_name(item["name"])
    # If not already mapped under any code, append as generated code
    if norm not in excel_norm_map:
        sl_val = item["sl"] if item["sl"] else str(idx)
        compiled_soc.append({
            "id": f"KOL_IP_{sl_val}",
            "name": item["name"],
            "type": item["type"],
            "dept": item["department"],
            "rates": item["rates"]
        })

# Add remaining OP services
for idx, item in enumerate(op_services):
    norm = normalize_name(item["name"])
    if norm not in excel_norm_map:
        sl_val = item["sl"] if item["sl"] else str(idx)
        compiled_soc.append({
            "id": f"KOL_OP_{sl_val}",
            "name": item["name"],
            "type": item["type"],
            "dept": item["department"],
            "rates": {
                "STANDARD": item["rate"],
                "SEMI-PRIVATE": item["rate"],
                "PRIVATE": item["rate"],
                "PRIVATE DELUXE": item["rate"],
                "DELUXE": item["rate"],
                "SUITE": item["rate"],
                "MAHARAJA SUITE": item["rate"]
            }
        })

# Add remaining equipment
for idx, item in enumerate(equipment):
    norm = normalize_name(item["name"])
    if norm not in excel_norm_map:
        sl_val = item["sl"] if item["sl"] else str(idx)
        compiled_soc.append({
            "id": f"KOL_EQ_{sl_val}",
            "name": item["name"],
            "type": "Equipment",
            "dept": "Medical Equipment",
            "rates": {
                "STANDARD": item["rate"],
                "SEMI-PRIVATE": item["rate"],
                "PRIVATE": item["rate"],
                "PRIVATE DELUXE": item["rate"],
                "DELUXE": item["rate"],
                "SUITE": item["rate"],
                "MAHARAJA SUITE": item["rate"]
            }
        })

# 3.4 Compile Packages repository
compiled_packages = []
for idx, item in enumerate(packages):
    sl_val = item["sl"] if item["sl"] else str(idx)
    compiled_packages.append({
        "id": f"KOL_PKG_{sl_val}",
        "name": item["name"],
        "department": item["department"],
        "days": item["days"],
        "rates": item["rates"]
    })

# 3.5 Create Kolkata Agreement details (26 agreements)
tpa_list = [
    ("FAMILY HEALTH PLAN INSURANCE TPA LTD (HDFC ERGO) IP AGREEMENT", "295422595", "295420177"),
    ("MEDI ASSIST INSURANCE TPA PRIVATE LTD (HDFC ERGO) IP AGREEMENT", "295422596", "295420178"),
    ("PARAMOUNT HEALTH SERVICES AND INSURANCE TPA PVT LTD (HDFC ERGO) IP AGREEMENT", "295422597", "295420179"),
    ("RAKSHA HEALTH INSURANCE TPA PVTLTD (HDFC ERGO) IP AGREEMENT", "295422598", "295420180"),
    ("HEALTH INDIA INSURANCE TPA SERVICES PVT LTD (HDFC ERGO) IP AGREEMENT", "295422599", "295420181"),
    ("FAMILY HEALTH PLAN INSURANCE TPA LTD (HDFC ERGO) OP AGREEMENT", "295422600", "295420177"),
    ("MEDI ASSIST INSURANCE TPA PRIVATE LTD (HDFC ERGO) OP AGREEMENT", "295422601", "295420178"),
    ("PARAMOUNT HEALTH SERVICES & INSURANCE TPA PVT LTD (HDFC ERGO) OP AGREEMENT", "295422602", "295420179"),
    ("RAKSHA HEALTH INSURANCE TPA PVTLTD (HDFC ERGO) OP AGREEMENT", "295422603", "295420180"),
    ("HEALTH INDIA INSURANCE TPA SERVICES PVT LTD (HDFC ERGO) OP AGREEMENT", "295422604", "295420181"),
    ("HDFC ERGO GENERAL INSURANCE NEW IP AGREEMENT", "571", "8764"),
    ("HDFC ERGO GENERAL INSURANCE NEW OP AGREEMENT", "71540", "8764"),
    ("HDFC ERGO GENERAL INSURANCE IP AGREEMENT", "295429203", "8764"),
    ("HDFC ERGO GENERAL INSURANCE OP AGREEMENT", "295429204", "8764"),
    ("MD INDIA (HDFC ERGO) IP AGREEEMENT", "295429205", "295430889"),
    ("MD INDIA (HDFC ERGO) OP AGREEMENT", "295429206", "295430889"),
    ("VIDAL HEALTH INSURANCE (HDFC ERGO) IP AGREEMENT", "295429207", "295430890"),
    ("VIDAL HEALTH INSURANCE (HDFC ERGO) OP AGREEMENT", "295429208", "295430890"),
    ("SAFEWAY INSURANCE TPA PVT LTD (HDFC ERGO) IP AGREEMENT", "295429209", "295430891"),
    ("SAFEWAY INSURANCE TPA PVT LTD (HDFC ERGO) OP AGREEMENT", "295429210", "295430891"),
    ("GENINS INDIA INSURANCE (HDFC ERGO) IP AGREEMENT", "295429211", "295430892"),
    ("GENINS INDIA INSURANCE (HDFC ERGO) OP AGREEMENT", "295429212", "295430892"),
    ("HERITAGE HEALTH INSURANCE (HDFC ERGO) IP AGREEMENT", "295429213", "295430892"),
    ("HERITAGE HEALTH INSURANCE (HDFC ERGO) OP AGREEMENT", "295429214", "295430892"),
    ("EAST WEST TPA (HDFC ERGO) IP AGREEMENT", "295441616", "295436991"),
    ("EAST WEST TPA (HDFC ERGO) OP AGREEMENT", "295441624", "295436991")
]

compiled_agreements = []
for ag_name, ag_id, cust_id in tpa_list:
    compiled_agreements.append({
        "customerType": "Insurance" if "NEW IP" not in ag_name else "TPA",
        "agreementName": ag_name,
        "tariffMapped": "TARIFF_KOLKATA_SOC",
        "discountMapped": "12% Room/OT/Nursing/Investigations",
        "status": "Available/Valid",
        "fromDate": "27-05-2025",
        "toDate": "30-06-2025",
        "discountAgreed": "12% Room/OT/Nursing/Investigations, 20% Health Checks",
        "locations": "Kolkata - Apollo Multispeciality",
        "agreementId": ag_id,
        "customerId": cust_id,
        "extensionRemarks": "Extended by CEO/Indrajit D. until June 30, 2025, pending negotiation of new central agreement."
    })

# 4. Save JSON files
print(f"Saving {len(compiled_soc)} SOC records to kolkata_soc.json...")
with open("kolkata_soc.json", "w", encoding="utf-8") as f:
    json.dump(compiled_soc, f, indent=2, ensure_ascii=False)

print(f"Saving {len(compiled_packages)} Package records to kolkata_pkg.json...")
with open("kolkata_pkg.json", "w", encoding="utf-8") as f:
    json.dump(compiled_packages, f, indent=2, ensure_ascii=False)

print(f"Saving {len(compiled_agreements)} Agreement records to kolkata_agreements.json...")
with open("kolkata_agreements.json", "w", encoding="utf-8") as f:
    json.dump(compiled_agreements, f, indent=2, ensure_ascii=False)

print("Kolkata master compilation completed successfully!")
