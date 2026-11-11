# Apollo Hospitals Enterprise Handover & Azure AD Setup Guide
### Application: Revenue Assurance & Tariff Intelligence Engine
### Baseline Version: `v2.5.0 Enterprise Multi-Unit`

This document provides complete instructions for transferring the GitHub repository to the **Apollo Hospitals GitHub Organization** and subsequently configuring **Microsoft Azure AD / Microsoft Entra ID Single Sign-On (SSO)**.

---

## Part 1: GitHub Repository Transfer to Apollo Organization

Transferring the repository preserves all commit history, release tags, branches, and code integrity.

### Step 1: Prerequisite Permissions
- **Transferrer**: Must have administrative ownership of the current repository (`Revenue-Audit`).
- **Target Organization Owner**: An Apollo Organization administrator must have permission to create repositories within the Apollo GitHub Organization (e.g., `apollo-hospitals` or designated corporate org).

### Step 2: Initiating Transfer on GitHub
1. Navigate to the repository on GitHub:
   ```text
   https://github.com/siddhantsurana-cloud/Revenue-Audit
   ```
2. Click **Settings** in the top navigation bar.
3. Scroll to the bottom to the **Danger Zone** section.
4. Click **Transfer ownership**.
5. In the modal:
   - Enter the target Apollo username or Organization name (e.g. `apollo-hospitals` or Apollo IT designated account).
   - Confirm by typing the repository name: `Revenue-Audit`.
   - Click **I understand, transfer this repository**.

### Step 3: Accepting Transfer (Apollo Organization Admin)
1. The Apollo Organization owner receives an email and notification on GitHub.
2. In GitHub Organization settings -> **Pending repository transfers**, click **Accept Transfer**.
3. Once accepted, the new canonical repository URL becomes:
   ```text
   https://github.com/<apollo-organization>/Revenue-Audit
   ```

### Step 4: Updating Local Development Workstations
After the transfer is completed, existing developers and auditors should update their local git remote:
```bash
git remote set-url origin https://github.com/<apollo-organization>/Revenue-Audit.git
git fetch origin
git branch -u origin/main main
```

---

## Part 2: Microsoft Azure AD / Entra ID Single Sign-On (SSO) Configuration

The application is pre-configured to support enterprise SSO via **Microsoft Azure AD (Entra ID)** using either modern **OpenID Connect (OIDC)** or **SAML 2.0**.

### Method A: Modern OpenID Connect (Recommended for Web Portals)
This method allows instant browser-based SSO across hospital networks and remote audits without requiring backend certificate handling.

#### 1. Register Application in Azure AD Portal
1. Sign in to the [Microsoft Entra Admin Center](https://entra.microsoft.com/) or Azure Portal as an Application Administrator.
2. Navigate to **Identity** > **Applications** > **App registrations** > **New registration**.
3. Fill out the registration form:
   - **Name**: `Apollo Revenue Assurance & Tariff Audit Portal`
   - **Supported account types**: `Accounts in this organizational directory only (Apollo Hospitals Group only - Single tenant)`
   - **Redirect URI**:
     - Platform: **Single-page application (SPA)** (or **Web**)
     - URL: `https://<YOUR-APPLICATION-URL>/index.html` (or `http://localhost:8500/index.html` for local/intranet testing)
4. Click **Register**.

#### 2. Configure Token Issuance
1. In the registered app, go to **Authentication**.
2. Under **Implicit grant and hybrid flows**, check:
   - [x] **ID tokens (used for implicit and hybrid flows)**
3. Under **Advanced settings**, set **Allow public client flows** to `Yes`.
4. Click **Save**.

#### 3. Note Configuration Identifiers
Copy the following two values from the **Overview** blade:
- **Application (client) ID**: e.g., `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: e.g., `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy`

---

### Method B: SAML 2.0 Enterprise Application (For Corporate IdP Hub)
If Apollo Infosec prefers a classical SAML 2.0 integration:

1. In Microsoft Entra, go to **Enterprise applications** > **New application** > **Create your own application**.
2. Select **Integrate any other application you don't find in the gallery (Non-gallery)**.
3. Name it `Apollo Revenue Assurance Portal` and click **Create**.
4. In the left menu, select **Single sign-on**, then select **SAML**.
5. In **Basic SAML Configuration**, enter:
   - **Identifier (Entity ID)**: `https://<YOUR-APPLICATION-URL>/saml/metadata`
   - **Reply URL (Assertion Consumer Service URL)**: `https://<YOUR-APPLICATION-URL>/api/saml/acs`
   - **Sign on URL**: `https://<YOUR-APPLICATION-URL>/index.html`
   - **Logout URL**: `https://<YOUR-APPLICATION-URL>/index.html`
6. In **Attributes & Claims**, ensure the following claims are mapped:
   - `Unique User Identifier`: `user.userprincipalname` (or `user.mail`)
   - `email`: `user.mail`
   - `name`: `user.displayname`
   - `role`: `user.assignedroles` (or default to `Auditor`)
7. In **SAML Certificates**, copy the **App Federation Metadata URL** or download **Certificate (Base64)**.

---

## Part 3: Activating Azure AD SSO in the Application

### Option 1: Via Configuration File (`config.json`)
Open or create `config.json` in the root of the project:
```json
{
  "STORAGE_MODE": "local",
  "SQLITE_DB_PATH": "revenue_audit.db",
  "OTP_PROVIDER": "mock",
  "AZURE_AD_CONFIG": {
    "enabled": true,
    "tenant_id": "<PASTE-YOUR-DIRECTORY-TENANT-ID>",
    "client_id": "<PASTE-YOUR-APPLICATION-CLIENT-ID>",
    "redirect_uri": "https://<YOUR-APPLICATION-URL>/index.html",
    "saml_acs_url": "https://<YOUR-APPLICATION-URL>/api/saml/acs",
    "default_unit": "excelcare",
    "default_role": "Auditor"
  }
}
```

### Option 2: Via In-Portal Setup Modal
1. Open the portal in your browser (`http://localhost:8500/index.html` or your hosted domain).
2. Click **"Sign in with Apollo SSO (Azure AD)"**.
3. A configuration setup window will display your detected **Redirect / ACS URI**.
4. Paste your **Tenant ID** and **Client ID**, then click **Save Azure AD Settings**.
5. Single Sign-On is activated immediately.

---

## Part 4: Role-Based Access Control (RBAC) Mapping

When Apollo employees log in through Azure AD, their permissions map to the platform's four tiers:

| Enterprise Role | Azure AD Group / Claim | Platform Permissions |
| :--- | :--- | :--- |
| **Viewer** | `Apollo-Revenue-Viewers` | Read-only inspection of reports and dashboards. |
| **Auditor** *(Default)* | `Apollo-Revenue-Auditors` | Full operational audit execution, custom SOC ingestion, rate checks. |
| **Approver** | `Apollo-Revenue-Approvers` | Financial dispute sign-off, rate variance approval, audit exports. |
| **Administrator** | `Apollo-Revenue-Admins` | Multi-Unit Deployment Hub, tariff publishing across 65+ units, user administration. |

---

## Part 5: Production Deployment Options

1. **Internal Hospital Server / On-Premise VM (Recommended)**:
   - Deploy on an Apollo Windows or Linux virtual machine.
   - Run `python run_server.py` or host behind IIS / NGINX reverse proxy on port 8500.
   - Accessible to all hospital nodes on the Apollo Intranet / VPN.
2. **Azure App Service / Container Instance**:
   - Host as a lightweight Node.js/Python container in Apollo's Azure subscription with custom domain and SSL.
3. **Static Content Distribution**:
   - The application frontend is self-contained and can be distributed via internal storage accounts or intranet web servers.
