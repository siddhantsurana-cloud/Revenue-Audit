# Apollo Revenue Assurance - Live Meeting Speed Demo & Test Dataset
**Folder**: `Test Data/`  
**Purpose**: Showcase instant sub-second ingestion and bill auditing speed during management & IT review meetings.

---

## 1. Files Included in This Folder

| File / Folder Name | Description | Volume | How to Use in Live Meeting |
| :--- | :--- | :--- | :--- |
| **`Apollo_HIS_Billing_Dump_7000_Lines_Speed_Demo.xlsx`** | **Apollo HIS Itemized IP Billing Dump** across **50 Corporate/TPA Payers** and **6 Ward Categories** (`4 SHARING`, `2 SHARING`, `SINGLE PRIVATE`, `EXECUTIVE`, `SUITE`, `ICU`). | **`7,000 Service Lines`** (`175 IP Bills × 40 Services/Bill`) | Drag & drop directly into **Rate Audit & Bill Check** (`#panel-audit`) and click **Run Audit** -> Audits all 7,000 lines in **`< 0.25 seconds`**! |
| **`Apollo_HIS_Billing_Dump_Daily_200_Bills_8000_Lines.xlsx`** | **1 Full Day Hospital Billing Workload** (`200 IP Bills × 40 Services/Bill`) across 50 Payers. | **`8,000 Service Lines`** (`200 IP Bills`) | Showcases a full day's hospital audit completing in **`< 0.25 seconds`**. |
| **`Apollo_HIS_Billing_Dump_100_Bills_4000_Lines.xlsx`** | **100 IP Bills Batch** (`100 IP Bills × 40 Services/Bill`). | **`4,000 Service Lines`** (`100 IP Bills`) | Quick 100-bill batch demonstration (`< 0.15 seconds`). |
| **`Apollo_Master_Test_SOC_7000_Lines_Multi_Ward.xlsx`** | **7,000-Line Multi-Ward Schedule of Charges (SOC)** with Base Rate, OPD Rate, and all **6 Bed-Type Ward Tiers** (`GW`, `SEMI_PRIVATE`, `PRIVATE`, `EXECUTIVE`, `SUITE`, `ICU`). | **`7,000 Tariff Lines`** (`56,000` rate cells) | Upload in **SOC Ingestion Engine** (`#panel-soc`) or **Central Hub** (`#panel-central-hub`) to showcase 7,000-line multi-ward SOC parsing in **`< 0.5 seconds`**. |
| **`Apollo_65_Units_Master_Directory_and_50_Payer_Agreements.xlsx`** | 3-Sheet Master Workbook:<br>1. `65_Hospital_Units_Directory` (All 65 Apollo Units Pan-India)<br>2. `50_Payer_Agreements_Master` (50 Corporate/TPA/PSU Agreements)<br>3. `65_Units_Tariff_Multiplier_Map` | **65 Units + 50 Payers** | Open during the meeting to show the 65-unit Pan-India rollout directory and 50 Payer Agreement mappings. |
| **`65_Units_Individual_SOC_Files/`** | **65 Individual 7,000-Line SOC Files** (`U001_excelcare` through `U065_gurugram`), each customized with regional ward rates across all 6 bed categories. | **`65 Units × 7,000 Lines = 455,000 Lines`** | Upload any unit's SOC file into **Central Data Hub** or **SOC Ingestion Engine** during live Q&A. |

---

## 2. Step-by-Step 2-Minute Live Meeting Demo Script

### Demo Step 1: Showcase 7,000-Line Multi-Ward SOC Ingestion (`15 Seconds`)
1. Open the tool and click **SOC Ingestion Engine** (or **Central Hub & Rate Broadcast**).
2. Select **`Apollo_Master_Test_SOC_7000_Lines_Multi_Ward.xlsx`** (or any file from `65_Units_Individual_SOC_Files/`).
3. Point out that all **7,000 clinical services** with **6 Bed-Type Ward Rates** (`GW`, `Semi-Private`, `Single Private`, `Executive`, `Suite`, `ICU`) are parsed, normalized, and indexed in **under 0.5 seconds**.
4. Go to **SOC Explorer & Comparison** and click the **6 Ward Icons** (`GW`, `Semi`, `Single`, `Exec`, `Suite`, `ICU`) to show instant ward-tier rate switching across 7,000+ lines.

### Demo Step 2: Showcase 7,000-Line / 8,000-Line IP Bill Audit Speed (`30 Seconds`)
1. Go to **Rate Audit & Bill Check**.
2. Select Business Unit: **Apollo Excelcare Hospital - Guwahati** and Validation Source: **Apollo Excelcare SOC 2026-27 - Cash** (or **SOC 2025-26**).
3. Drag and drop **`Apollo_HIS_Billing_Dump_7000_Lines_Speed_Demo.xlsx`** (`175 Bills / 7,000 Lines`) or **`Apollo_HIS_Billing_Dump_Daily_200_Bills_8000_Lines.xlsx`** (`200 Bills / 8,000 Lines`).
4. Click **Run Audit**.
5. Point out how the engine completes the entire **7,000–8,000 line audit in `< 0.3 seconds`**, automatically:
   - Matching every service code against the 6-ward bed tariff for that patient's room category (`4 SHARING`, `2 SHARING`, `SINGLE PRIVATE`, `EXECUTIVE`, `SUITE`, `ICU`),
   - Applying the payer's agreed discount %,
   - Flagging **Exact Matches**, **Overcharged Lines** (missed discounts / excess rates), and **Undercharged Lines** (short-billing recovery).

### Demo Step 3: Showcase Manual Payer-Promoted Discount Override (`15 Seconds`)
1. In the **Rate Audit & Bill Check** panel, enter a custom **Manual Discount % Override** (e.g., `15%` on Room / Investigations / Procedures) for a payer-promoted offer.
2. Re-run to show instant recalculation across all 7,000 lines in milliseconds.
