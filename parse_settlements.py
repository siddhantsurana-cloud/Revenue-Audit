import os
import re
import json
import pdfplumber

def clean_num(val_str):
    if not val_str:
        return 0.0
    val_str = val_str.replace("Rs.", "").replace(",", "").strip()
    try:
        return float(val_str)
    except ValueError:
        return 0.0

def parse_pdf(pdf_path):
    filename = os.path.basename(pdf_path)
    file_id = os.path.splitext(filename)[0]
    
    data = {
        "id": file_id,
        "filename": filename,
        "claim_id": "",
        "patient_name": "",
        "member_id": "",
        "policy_number": "",
        "admission_date": "",
        "discharge_date": "",
        "claimed_amount": 0.0,
        "approved_amount": 0.0,
        "deducted_amount": 0.0,
        "tds_amount": 0.0,
        "utr_number": "",
        "utr_amount": 0.0,
        "line_items": []
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading PDF {filename}: {e}")
        return None

    # Extract Claim ID
    claim_match = re.search(r"Claim ID\s+(\d+)\s+settled", full_text, re.IGNORECASE)
    if claim_match:
        data["claim_id"] = claim_match.group(1)
    else:
        # Fallback
        claim_match = re.search(r"Claim ID\s*[:\-]?\s*(\d+)", full_text, re.IGNORECASE)
        if claim_match:
            data["claim_id"] = claim_match.group(1)
        else:
            data["claim_id"] = file_id

    # Extract Patient Name
    patient_match = re.search(r"Patient Name\s+([^\n]+)", full_text, re.IGNORECASE)
    if patient_match:
        data["patient_name"] = patient_match.group(1).strip()
    else:
        patient_match = re.search(r"Dear\s+([^\n,]+)", full_text, re.IGNORECASE)
        if patient_match:
            data["patient_name"] = patient_match.group(1).strip()

    # Extract Member ID
    member_match = re.search(r"Member ID\s+([^\n]+)", full_text, re.IGNORECASE)
    if member_match:
        member_val = member_match.group(1).strip()
        pt_m = re.search(r"(PT\d+)", member_val)
        data["member_id"] = pt_m.group(1) if pt_m else member_val

    # Extract Policy Number
    policy_match = re.search(r"Policy Number\s*(?:/\s*COI Number)?\s+([^\n]+)", full_text, re.IGNORECASE)
    if policy_match:
        policy_val = policy_match.group(1).strip()
        pol_m = re.search(r"(\d+-\d+-\d+-\d+)", policy_val)
        data["policy_number"] = pol_m.group(1) if pol_m else policy_val

    # Extract Admission and Discharge Dates
    adm_match = re.search(r"Date of Admission\s+([^\n]+)", full_text, re.IGNORECASE)
    if adm_match:
        adm_val = adm_match.group(1).strip()
        dt_m = re.search(r"(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)", adm_val)
        data["admission_date"] = dt_m.group(1) if dt_m else adm_val

    dis_match = re.search(r"Date of Discharge\s+([^\n]+)", full_text, re.IGNORECASE)
    if dis_match:
        dis_val = dis_match.group(1).strip()
        dt_m = re.search(r"(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)", dis_val)
        data["discharge_date"] = dt_m.group(1) if dt_m else dis_val

    # Extract Totals
    claimed_match = re.search(r"Claimed Amount\s*(?:Rs\.)?\s*([\d\.,]+)", full_text, re.IGNORECASE)
    if claimed_match:
        data["claimed_amount"] = clean_num(claimed_match.group(1))
    
    approved_match = re.search(r"Approved Amount\s*(?:Rs\.)?\s*([\d\.,]+)", full_text, re.IGNORECASE)
    if approved_match:
        data["approved_amount"] = clean_num(approved_match.group(1))

    deducted_match = re.search(r"Deducted Amount\s*(?:Rs\.)?\s*([\d\.,]+)", full_text, re.IGNORECASE)
    if deducted_match:
        data["deducted_amount"] = clean_num(deducted_match.group(1))

    tds_match = re.search(r"TDS\s*(?:Rs\.)?\s*([\d\.,]+)", full_text, re.IGNORECASE)
    if tds_match:
        data["tds_amount"] = clean_num(tds_match.group(1))

    # Payment UTR & Amount
    utr_match = re.search(r"(HDFCH\d+)", full_text, re.IGNORECASE)
    if utr_match:
        data["utr_number"] = utr_match.group(1).strip()
    else:
        # Generic backup UTR search
        utr_only = re.search(r"(?:UTR|UTR Number)\s*[:\-]?\s*(\S+)", full_text, re.IGNORECASE)
        if utr_only:
            data["utr_number"] = utr_only.group(1).strip()

    # Expense heads parser
    expense_heads = [
        "Investigation Charges",
        "Medicine And Consumable Charges",
        "Miscellaneous Charges",
        "OT Charges",
        "Package Charges",
        "Professional Fee Charges",
        "Room and Nursing Charges"
    ]

    lines = full_text.split("\n")
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        matched_head = None
        for head in expense_heads:
            if line_stripped.startswith(head):
                matched_head = head
                break
        
        if matched_head:
            # Parse figures
            rem = line_stripped[len(matched_head):].strip()
            # Find numbers
            num_matches = re.findall(r"([\d\.,]+)", rem)
            if len(num_matches) >= 3:
                claimed = clean_num(num_matches[0])
                approved = clean_num(num_matches[1])
                deducted = clean_num(num_matches[2])
                
                # Check for reason
                reason_part = rem
                for num in num_matches[:3]:
                    reason_part = reason_part.replace(num, "", 1)
                reason = reason_part.replace(",", "").strip()
                
                # Append next lines if they don't start with another head or section
                next_idx = i + 1
                while next_idx < len(lines):
                    next_line = lines[next_idx].strip()
                    if any(next_line.startswith(h) for h in expense_heads) or "Deduction Details" in next_line or "Deduction Type" in next_line:
                        break
                    if next_line:
                        reason += " " + next_line
                    next_idx += 1
                
                reason = re.sub(r"\s+", " ", reason).strip()
                
                data["line_items"].append({
                    "description": matched_head,
                    "claimed": claimed,
                    "approved": approved,
                    "deducted": deducted,
                    "reason": reason
                })

    return data

def main():
    pdf_dir = r"S:\Sid Work\1. Apollo\@ Apollo Guwahti\Tarriff Working\Settlement tracker"
    if not os.path.exists(pdf_dir):
        print(f"Directory not found: {pdf_dir}")
        return

    results = []
    for f in os.listdir(pdf_dir):
        if f.lower().endswith(".pdf"):
            pdf_path = os.path.join(pdf_dir, f)
            print(f"Parsing: {f}...")
            parsed = parse_pdf(pdf_path)
            if parsed:
                results.append(parsed)

    output_path = r"compiled_settlements.json"
    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(results, out, indent=4)
    print(f"Successfully compiled {len(results)} settlements to {output_path}")

if __name__ == "__main__":
    main()
