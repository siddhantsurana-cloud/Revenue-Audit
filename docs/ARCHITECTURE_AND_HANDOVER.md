# Enterprise Architecture, Security & Handover Specification
**Platform**: Apollo Healthcare Revenue Assurance & Central Data Hub  
**Baseline Release**: Enterprise Multi-Unit Baseline (v2.5.2 / Central Data Hub)  
**Engineering & Handover**: BRC (`BRC_SID.AI`)

---

## 1. Technology Stack & System Architecture

### 1.1 High-Level Architecture
The platform uses a lightweight, zero-external-dependency **3-Tier Client–Server / Standalone Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT TIER (Browser / Intranet)                     │
│  • Single Page Application: HTML5 + CSS3 + Modular Vanilla JS (ES6+)    │
│  • Client Cache: IndexedDB (apollo_central_hub) keyed by SHA checksum   │
│  • Document Engines: SheetJS (Excel), PDF.js (Contracts), Chart.js      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP / REST JSON (/api/hub/*, /api/soc/*)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   APPLICATION TIER (run_server.py)                      │
│  • Runtime: Python 3.10+ ThreadingHTTPServer + Gzip Compression         │
│  • Central Data Hub API: central_hub/api.py & central_hub/auth.py       │
│  • Smart SOC & Contract Parser: soc_module/ (openpyxl + pdfplumber)     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ SQLite 3 (WAL Mode, Foreign Keys)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA TIER (On-Premise Storage)                    │
│  • Central Hub Store: data/central_hub.db (Units, Versioned SOCs,       │
│    Room-Wise Rate Lines, Agreements, RBAC Users, Sessions, Change Log)  │
│  • Audit Store: revenue_audit.db (Saved Audits, Overrides, Settlements) │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Stack
* **Frontend**: Vanilla HTML5, CSS3, ES6+ JavaScript (`index.html`, `js/app.js`, `js/central_hub.js`, `js/central_hub_admin.js`). No Node.js/React/Angular build step required.
* **Backend**: Python 3.10+ standard library (`http.server.ThreadingHTTPServer`, `sqlite3`, `hashlib`, `hmac`, `gzip`) plus `central_hub/` and `soc_module/`.
* **Database**: Embedded SQLite 3 (`data/central_hub.db`, `revenue_audit.db`) with standard portable SQL schema ready for direct migration to PostgreSQL/MS SQL Server if clustered High Availability is required.

---

## 2. Infrastructure & Licensing

### 2.1 Infrastructure Requirements
* **Central Server / VM**: 2–4 vCPUs, 4–8 GB RAM, 10–20 GB SSD storage (Windows Server, Windows 10/11, or Linux).
* **Client Workstations**: Any modern web browser (Microsoft Edge, Google Chrome, Mozilla Firefox). Zero client-side installation required.
* **Network**: Operates 100% on-premises / hospital intranet (`http://<server-ip>:8500`). Works in completely air-gapped environments with zero internet connectivity.

### 2.2 Open-Source Licensing & Recurring Costs
* **Zero Recurring Costs**: ₹0 / $0 cloud, SaaS, or third-party subscription fees.
* **Permissive Open-Source Only**: Every third-party library is licensed under **MIT, Apache 2.0, or PSF** (see `SBOM.md`). Zero GPL/AGPL/copyleft obligations.

---

## 3. Security, Data Privacy & Governance

* **Data Localization**: Processes Schedules of Charges (SOCs), payer agreements, and discharge billing line items strictly inside the hospital intranet and local browser memory. No PHI or pricing data is transmitted externally.
* **Multi-Tenant Unit Quarantine**: Central Team administers all 65+ hospital units from the Master Console. Individual hospital units receive only their own unit's SOCs and agreements (`/api/hub/units/<unit_code>/bundle`), with zero cross-unit visibility.
* **Authentication & Cryptography**: Central Admin credentials use **PBKDF2-HMAC-SHA256 (240,000 iterations)** with random salt and server-side bearer session tokens (`central_hub/auth.py`).
* **Static Path Hardening**: `run_server.py` actively blocks direct HTTP downloads of `*.db`, `*.py`, `*.json`, `config.json`, `saved_users.json`, and internal directories (`/data/`, `/central_hub/`, `/soc_module/`).
* **Immutable Audit Trail**: Every unit creation, SOC version upload, agreement update, and user action is logged in `hub_change_log` with operator ID and UTC timestamp.

---

## 4. Apollo IT Takeover & Future Extension Guide

### 4.1 Azure DevOps (ADO) CI/CD Pipeline Integration
The repository is structured for standard ADO pipeline automation:
1. **Install Dependencies**: `pip install -r requirements.txt`
2. **Run Automated Test Suite**: `python -m unittest discover -s tests -v`
3. **Seed / Update Built-in Tariff Library**: `python -m central_hub.tariff_library`
4. **Start Service**: `python run_server.py`

### 4.2 Extending for Scheduled Daily Pan-India API Push (`X-API-Key`)
To allow Apollo central ETL jobs to push daily unit SOCs or agreements automatically:
* In `central_hub/auth.py` (`require_admin`), add a check for an `X-API-Key` header validated against a hashed service key in `config.json` or environment variable `APOLLO_HUB_API_KEY`.
* Central cron/ADO jobs can then `POST /api/hub/units/<unit_code>/socs` or `POST /api/hub/units/<unit_code>/agreements/bulk` daily.

### 4.3 Extending for Azure AD (Entra ID) SSO Authentication
Authentication is decoupled in `central_hub/auth.py` and `js/central_hub.js`:
* Replace or augment `POST /api/hub/auth/login` with an OIDC token validation handler verifying Azure AD JWT tokens (`iss`, `aud`, `groups`/`roles` claims).
* Map Azure AD group claims to `CENTRAL_ADMIN` or unit-specific roles (`Administrator`, `Approver`, `Auditor`, `Viewer`).
