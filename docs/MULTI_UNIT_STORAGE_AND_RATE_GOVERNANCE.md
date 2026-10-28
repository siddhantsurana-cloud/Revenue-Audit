# Multi-Unit Central Audit Storage & Tariff Broadcast Governance Guide
**Platform**: Apollo Healthcare Revenue Assurance & Central Tariff Governance Platform  
**Release**: Enterprise V2.5.2 (Central Data Hub)  
**Author & Architect**: Siddhant Surana `<Siddhant@bihanico.in>`  
**Attribution**: Powered by BRC • Engineered by BRC_SID.AI

---

## 1. Multi-Unit Concurrent Deployment & Speed Architecture

### 1.1 Can 65+ Units Use the Same Tool Simultaneously Without Slowing Down?
**Yes — with zero impact on auditing speed.**

The platform uses a **Hybrid Edge-Browser + Central Hub Architecture**:

1. **100% Client-Side Bill Auditing Engine (`js/app.js`)**:
   - When an auditor at any hospital unit (Guwahati, Excelcare, Kolkata, Chennai, Hyderabad, Delhi, etc.) uploads a discharge bill Excel/CSV or PDF settlement letter and clicks **Run Audit**, all line-item matching, room-rent multiplier calculations, time-slab validations, and discount checks execute **inside that user's own browser memory (RAM)** on their local PC.
   - Because the server does not compute the bill rows during an audit run, **1 unit or 65+ units auditing 10,000-line bills at the exact same second run at the exact same sub-second speed**.

2. **Checksum-Cached Tariff Sync (`js/central_hub.js` + Browser `IndexedDB`)**:
   - On first login, a unit's browser downloads only its own unit's Schedules of Charges (SOCs) and Payer Agreements (`~200 KB – 2 MB` gzip-compressed) in `~0.1 – 0.5 seconds` and caches them in browser `IndexedDB` (`apollo_central_hub`) keyed by SHA-1 checksum (`<soc_id>:<checksum>`).
   - On every subsequent login, the browser checks `/api/hub/units/<unit_code>/bundle` (`~3 ms`) and only re-downloads a SOC if Head Office has published a new version.

3. **Benchmark Results (`python tools/scale_test.py`)**:
   - **Scale**: 65 Hospital Units × 25 SOCs × 6,000 service lines (`9,750,000` rate lines) + 55 agreements per unit (`3,575` agreements).
   - **Unit Login Bundle Response**: `3 ms`.
   - **Cold Load of All 25 SOCs for a Unit**: `0.5 seconds`.
   - **Warm Load (IndexedDB Cache Hit)**: `< 15 ms`.

---

## 2. Central Storage of Audit Results Across All Units

### 2.1 Overview of Possibilities
Because bill auditing runs in the browser, the server only receives the **final audited summary and exception rows** when an auditor clicks **"Save Audit"** (`POST /api/save_audits`).

You can deploy Central Audit Result Storage in **three ways** depending on Apollo's network topology:

| Deployment Option | How It Works | Best For | Impact on Speed |
| :--- | :--- | :--- | :--- |
| **Option A: Single Central Intranet Server (Recommended)** | Host one instance of `run_server.py` on an Apollo Central VM / Corporate Intranet server. Every unit opens the same URL (`http://<central-server-ip>:8500`), signs into their Unit card, audits bills locally in their browser, and clicks **Save Audit**. All saved audits are stored in the central SQLite database (`revenue_audit.db`) tagged with `businessUnit`. | All 65+ units connected via Apollo Corporate Intranet / VPN | **Zero impact.** Auditing is in-browser; saving an audit is a `10–50 ms` background POST. |
| **Option B: Distributed Unit Tools + Background Central Sync** | Units with intermittent connectivity run the tool locally (`Start_Webpage.bat`), saving audits to local storage/SQLite first and automatically pushing saved audit records (`POST /api/save_audits`) to the Central Head Office URL when online. | Remote units with unstable WAN links | **Zero impact.** Local auditing is offline-capable and instant. |
| **Option C: Enterprise RDBMS Backend (PostgreSQL / Azure SQL / MS SQL)** | Point `get_db_connection()` in `run_server.py` to an enterprise PostgreSQL or Azure SQL instance so corporate MIS / PowerBI dashboards can query live Pan-India audit KPIs directly. | Corporate Revenue Assurance BI & CXO Dashboards | **Zero impact** on bill checking speed. |

---

### 2.2 What Each Role Sees When Central Audit Storage Is Enabled

* **Hospital Unit Login (e.g., `excelcare`, `international`, `kolkata`, `chennai_greams`)**:
  - **Audit Workspace**: Locked to their unit.
  - **Audit Repository & Checking Console**: Displays **only their own unit's saved audits**, bills checked, short-billing (recovery), and excess-billing (leakage).
* **Central Head Office Login (`Corporate Head Office` / `unit = 'all'`)**:
  - **Consolidated Pan-India Audit Repository**: Views all saved audits from all 65+ hospital units in one place, with unit filter dropdown (`All Units` or drill-down into any specific hospital unit).
  - **Consolidated Checking Console & Executive Dashboard**: Tracks Pan-India Bills Checked %, Total Bill Value Audited, Excess Charged, Short Charged, and Approval Status (`Draft` → `Validated` → `Approved` → `Saved`).

---

### 2.3 How to Enable & Operate Central Storage Functions (Step-by-Step Guide)

#### Step 1: Switch `config.json` from Local File Mode to SQLite Database Mode
By default, `run_server.py` supports two storage modes in `config.json`:
- `"local"`: Reads/writes flat JSON files (`saved_audits.json`, `customer_rate_overrides.json`, `saved_settlements.json`).
- `"sqlite"`: Stores all records in the transactional SQLite database (`revenue_audit.db` table `json_store`) with automatic migration of any existing `.json` files on first read.

To activate central SQLite storage, create or update `config.json` in the application root directory:

```json
{
  "STORAGE_MODE": "sqlite",
  "SQLITE_DB_PATH": "revenue_audit.db",
  "CENTRAL_HUB_DB_PATH": "data/central_hub.db",
  "AUTO_LOAD_TARIFF_LIBRARY": true,
  "OTP_ENABLED": false
}
```

#### Step 2: How the Built-In Storage Functions Work in Code

1. **Client-Side Save & Load Functions (`js/app.js`)**:
   - `window.saveAudit()` (triggered by clicking **"Save Audit"** in the Audit Workspace):
     - Packages the current audit run into a `savedRecord` object containing:
       - `auditId`, `uploadDate`, `businessUnit` (unit code), `customer`, `agreement`, `sourceFileName`
       - `totalBills`, `exceptions`, `leakage` (Overcharged sum), `recovery` (Undercharged sum)
       - `status` (`Draft` / `Validated` / `Approved` / `Saved`), `approvedBy`, `approvedDate`, `approvalComments`
       - `rows` (compact serialized line-item array) and `versionHistory`
     - Calls `saveAndSyncAudits(db)`:
       1. Saves to browser `localStorage.setItem('brc_v2_saved_audits', JSON.stringify(db))`
       2. Calls `syncDatabaseToServer(db)` which sends `POST /api/save_audits` to `run_server.py`.
   - `loadDatabaseFromServer()` (triggered on app startup):
     - Calls `GET /api/load_audits` on `run_server.py` and populates `brc_v2_saved_audits` for the Audit Repository, Checking Console, and Executive Dashboard.

2. **Server-Side Storage Functions (`run_server.py`)**:
   - `get_db_connection()`: Opens `revenue_audit.db` and ensures table `json_store (client_id TEXT, key TEXT, value TEXT, PRIMARY KEY (client_id, key))` exists.
   - `save_json_data(key, default_file_path, content_str)`: Writes `saved_audits`, `customer_rate_overrides`, `custom_agreements`, and `saved_settlements` into `revenue_audit.db`.
   - `load_json_data(key, default_file_path, default_fallback)`: Reads the stored JSON payload from `revenue_audit.db` (and auto-migrates `saved_audits.json` if running in SQLite mode for the first time).

3. **Upgrading `/api/save_audits` for Multi-Unit Concurrent Merging (When Deploying to Multiple Units)**:
   - In single-unit mode, `POST /api/save_audits` writes the full `saved_audits` array sent by the browser.
   - When multiple units save concurrently to one central server, update `do_POST` (`self.path == '/api/save_audits'`) in `run_server.py` to **merge by `auditId`** under a thread lock (`threading.RLock()`) so Unit A saving an audit updates/inserts only its `auditId` without overwriting Unit B's saved audits:
     ```python
     # Multi-unit concurrent merge pattern for run_server.py:
     existing = json.loads(load_json_data('saved_audits', 'saved_audits.json', '[]'))
     incoming = json.loads(post_data.decode('utf-8') or '[]')
     by_id = {a['auditId']: a for a in existing if isinstance(a, dict) and a.get('auditId')}
     for a in (incoming if isinstance(incoming, list) else [incoming]):
         if isinstance(a, dict) and a.get('auditId'):
             by_id[a['auditId']] = a
     save_json_data('saved_audits', 'saved_audits.json', json.dumps(list(by_id.values())))
     ```
   - And in `do_GET` (`self.path.startswith('/api/load_audits')`), filter by `?unit=<unit_code>` for unit users while returning all records when `unit=all` (Central Admin).

4. **1-Click Enterprise Snapshot Backup & Restore (`js/app.js`)**:
   - Administrators can also export or restore a full JSON snapshot of all browser state (`exportDatabaseSnapshot()` / `handleSnapshotFileImport()`) or back up the two SQLite files directly:
     - `data/central_hub.db` (All units, versioned SOCs, room-wise rates, agreements, admin users, and change logs)
     - `revenue_audit.db` (All saved bill audits, rate overrides, and settlement disallowance audits)

---

## 3. Unit-Wise Tariff Isolation vs. Central Rates (All Units or Selected Units)

### 3.1 Three-Tier Tariff & Agreement Governance Model

The Central Data Hub (`central_hub/`) supports a **Hub-and-Spoke Tariff Governance Model** across three scopes:

```
                   ┌──────────────────────────────────────────┐
                   │       HEAD OFFICE CENTRAL DATA HUB       │
                   │  (Master Admin Console / Tariff Ingester)│
                   └────────────────────┬─────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│  1. UNIT-SPECIFIC │         │ 2. SELECTED UNITS │         │  3. ALL UNITS     │
│     TARIFFS       │         │   (REGIONAL/TPA)  │         │  (CENTRAL RATES)  │
├───────────────────┤         ├───────────────────┤         ├───────────────────┤
│ • Unit Cash SOC   │         │ • Regional PSU    │         │ • Pan-India GIPSA │
│ • Local Corporate │         │   (e.g. OIL India │         │   Master Policy   │
│ • State Govt      │         │   for East units) │         │ • National TPA    │
│   Schemes         │         │ • Selected 5–10   │         │   Corporate Tie-up│
│                   │         │   Metro Units     │         │ • CGHS / ECHS     │
│ 👉 Goes ONLY to   │         │ 👉 Goes ONLY to   │         │ 👉 Broadcasts to  │
│    that 1 Unit    │         │    ticked Units   │         │    ALL 65+ Units  │
└───────────────────┘         └───────────────────┘         └───────────────────┘
```

### 3.2 How Each Scope Works

1. **Unit-Specific Tariffs (Single Unit Isolation)**:
   - Uploaded to a single `unit_code` (e.g., `excelcare`, `international`, `kolkata`, `chennai_greams`) via `POST /api/hub/admin/units/<unit_code>/socs` or `/agreements`.
   - When an auditor logs into that unit, `js/central_hub.js` calls `GET /api/hub/units/<unit_code>/bundle`.
   - The unit user **only** receives their unit's SOCs and Agreements. Other units' tariffs are never downloaded or visible in their dropdowns.

2. **Central Rates for Selected Units (Regional / Multi-Unit Broadcast)**:
   - Used when an agreement or rate schedule applies to a **specific subset of hospital units** (e.g., an *OIL India* or *Northeast PSU* rate card applying to `international` + `excelcare`, or a TPA rate applying to 8 Metro units).
   - Central Admin selects the target units (`target_units: ["international", "excelcare", ...]`) and publishes once. The Hub creates/updates the versioned SOC or Agreement in each selected unit's bundle and logs the deployment in `hub_change_log`.

3. **Central Rates for All Active Units (Pan-India Broadcast)**:
   - Used when a national corporate MOU, Pan-India TPA schedule, or standard benchmark rate applies across **all active Apollo units** (`target_units: "ALL"`).
   - Publishing once automatically distributes the SOC or Agreement to every active unit in `hub_units`.

4. **Priority & Local Override Resolution**:
   - Within any unit, each Agreement maps to one or more `soc_codes` in priority order (`hub_agreement_socs.priority`).
   - When auditing a bill:
     1. The engine checks the **1st priority SOC** mapped to the Agreement (e.g., a Unit-Specific Addendum or Payer-Specific SOC).
     2. If a service code is not in the 1st SOC, it checks the **2nd priority SOC** (e.g., a Central Rate SOC), and finally falls back to the **Unit Default SOC** (`is_default = 1`).
     3. It **never** crosses unit boundaries or uses another hospital unit's tariff.

---

### 3.3 How Multi-Unit Broadcast Is Wired (`central_hub/api.py`)

To broadcast a SOC or Agreement from Head Office to **Selected Units** or **All Active Units**, `upload_soc`, `save_agreement`, and `bulk_agreements` in `central_hub/api.py` resolve `body.get("target_units")`:

- `target_units: null` (default) → Deploys to `[unit_code]` (Single Unit).
- `target_units: "ALL"` → Queries `[u["unit_code"] for u in self.db.list_units(include_inactive=False)]` and deploys to every active unit.
- `target_units: ["excelcare", "international", "kolkata"]` → Iterates over the selected unit codes and calls `self.db.create_soc_version(u_code, meta, records, ctx["user"])` or `self.db.upsert_agreement(u_code, body, ctx["user"])` for each selected unit.
