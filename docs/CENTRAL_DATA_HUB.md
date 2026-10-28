# Central Data Hub (V2.5.0)

The Central Data Hub is the single place where Head Office loads every hospital unit's
**SOCs** (Schedules of Charges) and **agreements**. When a unit team signs in, the platform
loads only that unit's tariffs and agreements, and the audit engine checks bills against them.

It is built for **65+ units × 20–30 SOCs × 50–60 agreements per unit**. A volume test at
that size passed (see [Volume test](#volume-test)).

---

## 1. How it works

```
 Head Office (Master Console, Central Admin ID)
        │  create units · upload SOCs · load agreements   (server-verified login)
        ▼
 ┌────────────────────── data/central_hub.db ──────────────────────┐
 │ hub_units ──< hub_socs (versioned) ──< hub_soc_lines             │
 │     └─────< hub_agreements ──< hub_agreement_socs (SOC codes)   │
 │ hub_users · hub_sessions · hub_change_log                        │
 └─────────────────────────────────────────────────────────────────┘
        │  GET /api/hub/units/<unit>/bundle  +  /api/hub/socs/<id>/lines
        ▼
 Unit team signs in → their SOCs + agreements are loaded (and cached in the
 browser by checksum) → Audit Workspace validates bills against them
```

| Piece | File |
|---|---|
| Storage, validation, versioning | `central_hub/db.py` |
| Central Admin login (PBKDF2, sessions) | `central_hub/auth.py` |
| HTTP endpoints (`/api/hub/...`) | `central_hub/api.py`, wired in `run_server.py` |
| Built-in tariff library loader (first start) | `central_hub/tariff_library.py` |
| Browser runtime (unit loading, engine hooks) | `js/central_hub.js` |
| Head Office console UI | `js/central_hub_admin.js`, `css/central_hub.css` |
| Tests | `tests/test_central_hub.py` |
| Volume test | `tools/scale_test.py` |

### Engine profiles

| Profile | Units | Where the audit gets its tariffs |
|---|---|---|
| `central` | every new unit | 100 % from the hub |
| `library_international`, `library_excelcare`, `library_kolkata` | Guwahati/International, Excelcare, Kolkata | the built-in tariff library and rule set (`tariff_data.js`), **plus** any SOC/agreement created or edited in the hub |

The built-in library is also loaded into the hub, so Head Office sees and maintains every unit in one place.

---

## 2. Head Office workflow

1. Open the Master Console (facility card **Corporate Head Office**). Sign in with a Central Admin ID.
   On first start, the ID `admin` accepts the existing Master Console password. It is re-hashed
   (PBKDF2) the first time it is used.
2. Open **Central Data Hub** in the sidebar.
3. **Add units**: use **+ New unit**, or **Template → Bulk upload** to add all 65 at once
   (columns: Unit Code, Unit Name, Short Name, Region, State, City, Address, Billing Email).
4. **Upload SOCs** for a unit (**SOCs → Upload SOC**):
   * *Standard template / simple sheet*: read in the browser. Download it with **Download SOC template**.
     Room-wise rates go in columns named `Rate: <ROOM CATEGORY>`.
   * *Smart parser*: any Apollo SOC layout or a PDF, using the existing `soc_module` parser on the server.
   * *Use last Tariff Ingester file*: publishes whatever was last parsed in the Tariff Ingester.
     The Tariff Ingester also has its own **Publish to Central Data Hub** box.
   * Re-uploading an existing SOC code creates **version N+1**. The old version is kept as `SUPERSEDED`
     and agreements switch to the new version automatically.
   * Mark one SOC per unit as the **default**. It is used when a bill's customer has no agreement,
     and as a fallback when a service is missing from the agreement's SOC.
5. **Load agreements** (**Agreements → Bulk upload** or **Add agreement**). Each agreement lists one or
   more **SOC codes** in priority order. The first SOC that has the service wins.
   Rows with unknown SOC codes are rejected and reported row by row. The valid rows are still saved.
6. **Activity** shows every change: who did it, when, and what.
7. **Central Admin IDs**: add more Head Office IDs, reset passwords, disable IDs.
   At least one ID must stay active.

Unit user IDs (Viewer / Auditor / Approver / Administrator per unit) are still created in
**Administration → Credential Registry**. New hub units appear in its unit list automatically.

## 3. Unit team workflow

1. On the login screen, search for the unit (the directory has a search box for 65+ units),
   then sign in.
2. A progress bar shows the unit's SOCs loading. After the first login they come from the browser
   cache and only re-download when Head Office publishes a change.
3. **Audit Workspace**
   * *Customer-specific mapping*: the bill's customer is matched to the unit's agreements.
     The agreement's SOC(s) and discount are applied. Unmatched customers use the unit default SOC.
   * *Single tariff*: pick any of the unit's SOCs. SOCs are split into "SOC" and "Tariff Template"
     by category: GIPSA/TPA/Insurance/Corporate/PSU/Government/International are listed under
     Tariff Template.
   * *Room-wise mapping*: each room class can point to a different SOC.
   * Room-wise rates are matched to the billed room category (exact match first, then by room
     family: ward / semi-private / private / suite / ICU / day care).
   * A service that isn't in the unit's SOCs is reported as **Not Found in Master**. It never
     falls back to another unit's tariffs.

---

## 4. Running it

```bash
pip install -r requirements.txt     # parsers; the hub itself needs only the standard library
python run_server.py                # or Start_Webpage.bat → http://localhost:8500
```

* First start creates `data/central_hub.db` and loads the built-in tariff library from `tariff_data.js`.
  It takes about 2 s. Set `"AUTO_LOAD_TARIFF_LIBRARY": false` in `config.json` to skip this.
* Back up `data/central_hub.db` regularly. It is in `.gitignore` because it holds tariffs,
  agreements and admin password hashes.
* Without the server (static hosting) the hub is hidden and the built-in tariff library is used.

`config.json` keys:

| Key | Default | Meaning |
|---|---|---|
| `CENTRAL_HUB_DB_PATH` | `data/central_hub.db` | hub database file |
| `HUB_BOOTSTRAP_ADMIN_SHA256` | existing master fingerprint | used only to create the first `admin` hub ID |
| `AUTO_LOAD_TARIFF_LIBRARY` | `true` | load the built-in tariff library into the hub when it is empty |
| `OTP_ENABLED` | `false` | OTP second factor. Off in this release; `/api/send_otp` returns 403 |

## 5. API

Read endpoints, used by every unit at login:

| Method | Path | Returns |
|---|---|---|
| GET | `/api/hub/health` | status + counts |
| GET | `/api/hub/units` | active units for the login directory |
| GET | `/api/hub/units/<unit>/bundle` | unit, active SOC list, agreements |
| GET | `/api/hub/socs/<soc_id>/lines` | rate lines of one SOC version |

Central Admin endpoints (header `Authorization: Bearer <token>` from `POST /api/hub/auth/login`):
`/api/hub/admin/overview`, `/units`, `/units/<u>/socs`, `/socs/<id>`, `/units/<u>/agreements`,
`/units/<u>/agreements/bulk`, `/agreements/<id>/status`, `/changelog`, `/users`.
See the docstring at the top of `central_hub/api.py` for the full list and payloads.

Responses over 2 KB are gzip-compressed. API responses are never cached by the service worker.

## 6. Security

* Hub writes require a server-issued session. There is no browser-side bypass.
* Central Admin passwords use PBKDF2-SHA256 (240k iterations) with a policy of 10+ characters
  and 3 character classes.
* The web server never serves `*.db`, `config.json`, `saved_users.json`, Python source, `data/`
  or other internal files.
* Threaded server (`ThreadingHTTPServer`) so many units can sign in at once.

## 7. Volume test

`python tools/scale_test.py` (65 units × 25 SOCs × 6,000 lines + 55 agreements per unit):

| Measure | Result |
|---|---|
| Rate lines stored | 9,750,000 |
| Database size | 869 MB |
| Upload of one 6,000-line SOC | 0.07 s |
| Unit login bundle (SOC list + agreements) | 3 ms |
| Reading all 25 SOCs of a unit | 0.5 s (16.5 MB JSON, ~2–3 MB gzipped) |

## 8. Known limits / next steps

1. **Unit user logins are still browser-side.** Unit IDs come from `saved_users.json` (plain text)
   and are checked in JavaScript. Next step: move unit IDs into `hub_users` with roles per unit, and
   issue server sessions for every login. The Central Admin login already works this way.
2. **The hub read endpoints are open to anyone who can reach the server.** Today's
   `tariff_data.js` is equally open. Lock them down together with step 1.
3. `tariff_data.js` (17 MB) loads for every unit because the engine's built-in rule set uses it.
   It can be loaded only for the three library units, and later replaced by hub data entirely.
4. SQLite works well for a single server. For multi-server or HA deployment, move to PostgreSQL.
   The SQL is portable; only `HubDB.connect()` needs to change.
5. Unit-specific engine rules (Guwahati OT slabs, Excelcare nursing tables, Kolkata time-based
   rates) are built into the engine for the three library units. Other units use their SOC lines directly.
   Configurable rule sets per unit would be the next engine enhancement.
