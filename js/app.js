// Global Storage Interceptor for Sandbox Environment
    window.sandboxEnvironment = false;
    const originalGetItem = localStorage.getItem;
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.getItem = function(key) {
        if (window.sandboxEnvironment) {
            if (key === 'brc_v2_saved_audits') return originalGetItem.call(localStorage, 'saved_audits_sandbox');
            if (key === 'brc_v2_customer_rate_overrides') return originalGetItem.call(localStorage, 'customer_rate_overrides_sandbox');
            if (key.startsWith('customDeptDiscounts_')) return originalGetItem.call(localStorage, key + '_sandbox');
            if (key.startsWith('customItemDiscounts_')) return originalGetItem.call(localStorage, key + '_sandbox');
        }
        return originalGetItem.call(localStorage, key);
    };

    localStorage.setItem = function(key, value) {
        if (window.sandboxEnvironment) {
            if (key === 'brc_v2_saved_audits') return originalSetItem.call(localStorage, 'saved_audits_sandbox', value);
            if (key === 'brc_v2_customer_rate_overrides') return originalSetItem.call(localStorage, 'customer_rate_overrides_sandbox', value);
            if (key.startsWith('customDeptDiscounts_')) return originalSetItem.call(localStorage, key + '_sandbox', value);
            if (key.startsWith('customItemDiscounts_')) return originalSetItem.call(localStorage, key + '_sandbox', value);
        }
        return originalSetItem.call(localStorage, key, value);
    };

    localStorage.removeItem = function(key) {
        if (window.sandboxEnvironment) {
            if (key === 'brc_v2_saved_audits') return originalRemoveItem.call(localStorage, 'saved_audits_sandbox');
            if (key === 'brc_v2_customer_rate_overrides') return originalRemoveItem.call(localStorage, 'customer_rate_overrides_sandbox');
            if (key.startsWith('customDeptDiscounts_')) return originalRemoveItem.call(localStorage, key + '_sandbox');
            if (key.startsWith('customItemDiscounts_')) return originalRemoveItem.call(localStorage, key + '_sandbox');
        }
        return originalRemoveItem.call(localStorage, key);
    };

    // State management variables
    let UNIFIED_TARIFFS = [];
    let map2026 = {};
    let map2021 = {};
    let map2021_iocl = {};
    let map2023 = {};
    let map2023_v2 = {};
    let map2024 = {};
    let map2025 = {};
    let mapExcelcare = {};
    let mapExcelcareCash = {};
    let mapCash2025 = {};
    let mapCash2026 = {};
    let mapExcelcare2024 = {};
    let mapExcelcareGipsa2026 = {};
    let mapKolkata = {};       // Standard Kolkata SOC (no payer-specific entries)
    let mapKolkataHdfc = {};   // Kolkata SOC + HDFC ERGO package entries (applicablePayer = HDFC_ERGO)
    let mapHdfc = {}; // id -> Array of HDFC records (Excelcare templates)
    let mapHdfcAgreed2026 = {}; // id -> reconciled HDFC Ergo Agreed 2026 record

    const KOLKATA_OT_SLABS = [
        { from: 0, to: 30, rates: { "STANDARD": 15000, "SEMI-PRIVATE": 25000, "PRIVATE": 30000, "PRIVATE DELUXE": 30000, "DELUXE": 30000, "SUITE": 40000, "MAHARAJA SUITE": 45000 } },
        { from: 31, to: 60, rates: { "STANDARD": 30000, "SEMI-PRIVATE": 60000, "PRIVATE": 80000, "PRIVATE DELUXE": 80000, "DELUXE": 80000, "SUITE": 100000, "MAHARAJA SUITE": 120000 } },
        { from: 61, to: 90, rates: { "STANDARD": 40000, "SEMI-PRIVATE": 80000, "PRIVATE": 110000, "PRIVATE DELUXE": 110000, "DELUXE": 110000, "SUITE": 140000, "MAHARAJA SUITE": 165000 } },
        { from: 91, to: 120, rates: { "STANDARD": 45000, "SEMI-PRIVATE": 90000, "PRIVATE": 120000, "PRIVATE DELUXE": 120000, "DELUXE": 120000, "SUITE": 150000, "MAHARAJA SUITE": 180000 } },
        { from: 121, to: 150, rates: { "STANDARD": 50000, "SEMI-PRIVATE": 95000, "PRIVATE": 125000, "PRIVATE DELUXE": 125000, "DELUXE": 125000, "SUITE": 155000, "MAHARAJA SUITE": 190000 } },
        { from: 151, to: 180, rates: { "STANDARD": 55000, "SEMI-PRIVATE": 100000, "PRIVATE": 130000, "PRIVATE DELUXE": 130000, "DELUXE": 130000, "SUITE": 165000, "MAHARAJA SUITE": 195000 } },
        { from: 181, to: 210, rates: { "STANDARD": 60000, "SEMI-PRIVATE": 110000, "PRIVATE": 140000, "PRIVATE DELUXE": 140000, "DELUXE": 140000, "SUITE": 180000, "MAHARAJA SUITE": 215000 } },
        { from: 211, to: 240, rates: { "STANDARD": 65000, "SEMI-PRIVATE": 115000, "PRIVATE": 145000, "PRIVATE DELUXE": 145000, "DELUXE": 145000, "SUITE": 185000, "MAHARAJA SUITE": 220000 } },
        { from: 241, to: 270, rates: { "STANDARD": 70000, "SEMI-PRIVATE": 120000, "PRIVATE": 150000, "PRIVATE DELUXE": 150000, "DELUXE": 150000, "SUITE": 190000, "MAHARAJA SUITE": 230000 } },
        { from: 271, to: 300, rates: { "STANDARD": 75000, "SEMI-PRIVATE": 125000, "PRIVATE": 155000, "PRIVATE DELUXE": 155000, "DELUXE": 155000, "SUITE": 195000, "MAHARAJA SUITE": 240000 } },
        { from: 301, to: 330, rates: { "STANDARD": 80000, "SEMI-PRIVATE": 130000, "PRIVATE": 175000, "PRIVATE DELUXE": 175000, "DELUXE": 175000, "SUITE": 215000, "MAHARAJA SUITE": 260000 } },
        { from: 331, to: 360, rates: { "STANDARD": 85000, "SEMI-PRIVATE": 135000, "PRIVATE": 180000, "PRIVATE DELUXE": 180000, "DELUXE": 180000, "SUITE": 220000, "MAHARAJA SUITE": 265000 } },
        { from: 361, to: 390, rates: { "STANDARD": 90000, "SEMI-PRIVATE": 145000, "PRIVATE": 195000, "PRIVATE DELUXE": 195000, "DELUXE": 195000, "SUITE": 240000, "MAHARAJA SUITE": 290000 } },
        { from: 391, to: 420, rates: { "STANDARD": 95000, "SEMI-PRIVATE": 150000, "PRIVATE": 200000, "PRIVATE DELUXE": 200000, "DELUXE": 200000, "SUITE": 245000, "MAHARAJA SUITE": 300000 } }
    ];

    // Safe Utility Parsers to prevent crash on corrupt data
    function safeJsonParse(str, fallback = null) {
        try {
            return str ? JSON.parse(str) : fallback;
        } catch (e) {
            console.error("JSON parsing error:", e);
            return fallback;
        }
    }

    function safeForEach(arr, callback) {
        if (arr && Array.isArray(arr)) {
            arr.forEach(callback);
        }
    }

    // OneDrive Database Sync API Methods
    async function loadDatabaseFromServer() {
        if (window.sandboxEnvironment) {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            return safeJsonParse(stored, []);
        }
        try {
            const res = await fetch('/api/load_audits');
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('brc_v2_saved_audits', JSON.stringify(data));
                console.log('Successfully loaded audits from server.');
                return data;
            }
        } catch (e) {
            console.warn('Could not load audits from server, using localStorage:', e);
        }
        const stored = localStorage.getItem('brc_v2_saved_audits');
        return safeJsonParse(stored, []);
    }

    async function loadOverridesFromServer() {
        if (window.sandboxEnvironment) {
            const stored = localStorage.getItem('brc_v2_customer_rate_overrides');
            return safeJsonParse(stored, {});
        }
        try {
            const res = await fetch('/api/load_overrides');
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('brc_v2_customer_rate_overrides', JSON.stringify(data));
                console.log('Successfully loaded customer overrides from server.');
                return data;
            }
        } catch (e) {
            console.warn('Could not load customer overrides from server, using localStorage:', e);
        }
        const stored = localStorage.getItem('brc_v2_customer_rate_overrides');
        return safeJsonParse(stored, {});
    }

    async function syncDatabaseToServer(db) {
        if (window.sandboxEnvironment) {
            console.log('Sandbox environment active: Skipping server db sync.');
            return;
        }
        try {
            await fetch('/api/save_audits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(db)
            });
            console.log('Successfully synced audits to server.');
        } catch (e) {
            console.error('Failed to sync audits to server:', e);
        }
    }

    async function syncOverridesToServer(overrides) {
        if (window.sandboxEnvironment) {
            console.log('Sandbox environment active: Skipping server overrides sync.');
            return;
        }
        try {
            await fetch('/api/save_overrides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(overrides)
            });
            console.log('Successfully synced customer overrides to server.');
        } catch (e) {
            console.error('Failed to sync customer overrides to server:', e);
        }
    }

    function saveAndSyncAudits(db) {
        localStorage.setItem('brc_v2_saved_audits', JSON.stringify(db));
        syncDatabaseToServer(db);
    }

    function saveAndSyncOverrides(overrides) {
        localStorage.setItem('brc_v2_customer_rate_overrides', JSON.stringify(overrides));
        syncOverridesToServer(overrides);
    }

    // Default Access Permissions Rules
    const DEFAULT_ROLE_PERMISSIONS = {
        'Viewer': [
            'tab-dashboard-btn',
            'tab-checking-btn',
            'tab-manual-btn',
            'tab-infra-btn',
            'tab-settlement-btn'
        ],
        'Auditor': [
            'tab-dashboard-btn',
            'tab-ingester-btn',
            'tab-audit-btn',
            'tab-exceptions-btn',
            'tab-reports-btn',
            'tab-repository-btn',
            'tab-checking-btn',
            'tab-manual-btn',
            'tab-infra-btn',
            'tab-settlement-btn'
        ],
        'Approver': [
            'tab-dashboard-btn',
            'tab-ingester-btn',
            'tab-audit-btn',
            'tab-exceptions-btn',
            'tab-reports-btn',
            'tab-repository-btn',
            'tab-checking-btn',
            'tab-manual-btn',
            'tab-infra-btn',
            'tab-settlement-btn'
        ],
        'Administrator': [
            'tab-dashboard-btn',
            'tab-ingester-btn',
            'tab-master-btn',
            'tab-audit-btn',
            'tab-agreement-btn',
            'tab-exceptions-btn',
            'tab-reports-btn',
            'tab-repository-btn',
            'tab-checking-btn',
            'tab-manual-btn',
            'tab-infra-btn',
            'tab-admin-btn',
            'tab-settlement-btn'
        ]
    };

    const SYSTEM_TABS = [
        { id: 'tab-dashboard-btn', name: 'Dashboard' },
        { id: 'tab-checking-btn', name: 'Checking Console' },
        { id: 'tab-ingester-btn', name: 'Tariff Ingester' },
        { id: 'tab-audit-btn', name: 'Audit Workspace' },
        { id: 'tab-exceptions-btn', name: 'Exception Command Centre' },
        { id: 'tab-reports-btn', name: 'Reports & Exports' },
        { id: 'tab-agreement-btn', name: 'Agreement Repository' },
        { id: 'tab-master-btn', name: 'Tariff Repository' },
        { id: 'tab-manual-btn', name: 'Process Manual' },
        { id: 'tab-infra-btn', name: 'Platform Infrastructure' },
        { id: 'tab-admin-btn', name: 'Administration Center' },
        { id: 'tab-settlement-btn', name: 'Settlement Auditor' }
    ];

    const storedPerms = safeJsonParse(localStorage.getItem('brc_v2_role_permissions'), {});
    const mergedPerms = {};
    for (const [role, defaultTabs] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        const storedTabs = storedPerms[role] || [];
        mergedPerms[role] = Array.from(new Set([...storedTabs, ...defaultTabs]));
    }
    window.rolePermissions = mergedPerms;
    localStorage.setItem('brc_v2_role_permissions', JSON.stringify(mergedPerms));

    function renderPermissionsMatrix() {
        const tbody = document.getElementById('permissions-matrix-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const roles = ['Viewer', 'Auditor', 'Approver', 'Administrator'];
        
        SYSTEM_TABS.forEach(tab => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            
            const tdName = document.createElement('td');
            tdName.style.padding = '0.75rem 0.5rem';
            tdName.style.fontWeight = '600';
            tdName.style.color = 'var(--text-main)';
            tdName.textContent = tab.name;
            tr.appendChild(tdName);
            
            roles.forEach(role => {
                const tdCheck = document.createElement('td');
                tdCheck.style.padding = '0.75rem 0.5rem';
                tdCheck.style.textAlign = 'center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.dataset.tab = tab.id;
                checkbox.dataset.role = role;
                checkbox.style.cursor = 'pointer';
                checkbox.style.width = '16px';
                checkbox.style.height = '16px';
                
                // Keep Admin role checking dashboard & admin tabs enabled for safety
                if (role === 'Administrator' && (tab.id === 'tab-admin-btn' || tab.id === 'tab-dashboard-btn')) {
                    checkbox.checked = true;
                    checkbox.disabled = true;
                } else {
                    const hasAccess = window.rolePermissions[role] && window.rolePermissions[role].includes(tab.id);
                    checkbox.checked = !!hasAccess;
                }
                
                tdCheck.appendChild(checkbox);
                tr.appendChild(tdCheck);
            });
            
            tbody.appendChild(tr);
        });
    }

    function savePermissionsMatrix() {
        const tbody = document.getElementById('permissions-matrix-tbody');
        if (!tbody) return;
        
        const roles = ['Viewer', 'Auditor', 'Approver', 'Administrator'];
        const newPermissions = {
            'Viewer': [],
            'Auditor': [],
            'Approver': [],
            'Administrator': []
        };
        
        const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const role = cb.dataset.role;
            const tabId = cb.dataset.tab;
            if (cb.checked || cb.disabled) {
                if (!newPermissions[role].includes(tabId)) {
                    newPermissions[role].push(tabId);
                }
            }
        });
        
        window.rolePermissions = newPermissions;
        localStorage.setItem('brc_v2_role_permissions', JSON.stringify(newPermissions));
        
        // Sync with backend if central API integration is live
        if (!window.sandboxEnvironment) {
            fetch('/api/save_permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPermissions)
            }).catch(e => console.error("Failed to sync permissions matrix to server:", e));
        }
        
        showToast('Access control rules saved successfully!', 'success');
        updateUIForRole();
    }

    window.customAgreements = [];

    async function loadCustomAgreementsFromServer() {
        let loaded = [];
        if (window.sandboxEnvironment) {
            const stored = localStorage.getItem('brc_v2_custom_customer_agreements');
            loaded = safeJsonParse(stored, []);
        } else {
            try {
                const res = await fetch('/api/load_custom_agreements');
                if (res.ok) {
                    const data = await res.json();
                    loaded = data || [];
                    localStorage.setItem('brc_v2_custom_customer_agreements', JSON.stringify(loaded));
                    console.log('Successfully loaded custom agreements from server.');
                }
            } catch (e) {
                console.warn('Could not load custom agreements from server, using localStorage:', e);
                const stored = localStorage.getItem('brc_v2_custom_customer_agreements');
                loaded = safeJsonParse(stored, []);
            }
        }
        window.customAgreements = loaded;
        mergeCustomAgreementsIntoDetails(loaded);

        // Trigger UI updates
        if (typeof populateDropdowns === 'function') {
            populateDropdowns();
        }
        if (typeof updateTabBadges === 'function') {
            updateTabBadges();
        }
        if (typeof renderAgreementsTable === 'function') {
            renderAgreementsTable();
        }

        return window.customAgreements;
    }

    async function syncCustomAgreementsToServer(agreements) {
        if (window.sandboxEnvironment) {
            console.log('Sandbox environment active: Skipping server agreements sync.');
            return;
        }
        try {
            await fetch('/api/save_custom_agreements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agreements)
            });
            console.log('Successfully synced custom agreements to server.');
        } catch (e) {
            console.error('Failed to sync custom agreements to server:', e);
        }
    }

    window.saveAndSyncCustomAgreements = function(agreements) {
        window.customAgreements = agreements;
        localStorage.setItem('brc_v2_custom_customer_agreements', JSON.stringify(agreements));
        syncCustomAgreementsToServer(agreements);
        mergeCustomAgreementsIntoDetails(agreements);
        if (typeof populateDropdowns === 'function') {
            populateDropdowns();
        }
        renderAgreementManager(); // Refresh table
    };

    let filteredData = [];
    let currentPage = 1;
    let pageSize = 100;
    let currentSortColumn = 'id';
    let currentSortDirection = 'asc'; 
    let currentFilterCategory = 'all'; 

    // Audit State Variables
    let rawBillData = []; // loaded from Excel files
    let auditedRows = []; // after auditing completes
    let filteredAuditData = []; // currently active audit rows in view
    let currentAuditPage = 1;
    let auditPageSize = 100;
    let currentAuditSortColumn = 'diff';
    let currentAuditSortDirection = 'desc'; // discrepancies default desc
    let selectedBillFiles = []; // array of selected files
    let uploadedDiscountMap = null; // parsed discount map
    let customerChartInstance = null;
    let discrepancyChartInstance = null;
    let dbYearsChartInstance = null;
    let dbUnitsChartInstance = null;

    // Exception State Variables
    let currentExceptionPage = 1;
    let exceptionPageSize = 100;

    // Agreement State Variables
    let currentAgreementFilter = 'all';

    // Tab view selectors
    const tabDashboardBtn = document.getElementById('tab-dashboard-btn');
    const tabMasterBtn = document.getElementById('tab-master-btn');
    const tabAuditBtn = document.getElementById('tab-audit-btn');
    const tabAgreementBtn = document.getElementById('tab-agreement-btn');
    const tabExceptionsBtn = document.getElementById('tab-exceptions-btn');
    const tabReportsBtn = document.getElementById('tab-reports-btn');
    const tabRepositoryBtn = document.getElementById('tab-repository-btn');
    const tabManualBtn = document.getElementById('tab-manual-btn');
    const tabCheckingBtn = document.getElementById('tab-checking-btn');
    const tabAdminBtn = document.getElementById('tab-admin-btn');
    const tabInfraBtn = document.getElementById('tab-infra-btn');
    const tabIngesterBtn = document.getElementById('tab-ingester-btn');
    const tabSettlementBtn = document.getElementById('tab-settlement-btn');

    const panelDashboard = document.getElementById('panel-dashboard');
    const panelMaster = document.getElementById('panel-master');
    const panelAudit = document.getElementById('panel-audit');
    const panelAgreement = document.getElementById('panel-agreement');
    const panelExceptions = document.getElementById('panel-exceptions');
    const panelReports = document.getElementById('panel-reports');
    const panelRepository = document.getElementById('panel-repository');
    const panelManual = document.getElementById('panel-manual');
    const panelChecking = document.getElementById('panel-checking');
    const panelAdmin = document.getElementById('panel-admin');
    const panelInfra = document.getElementById('panel-infra');
    const panelIngester = document.getElementById('panel-ingester');
    const panelSettlement = document.getElementById('panel-settlement');

    // HDFC Agreed Board State Variables
    let hdfcAgreedCurrentPage = 1;
    let hdfcAgreedPageSize = 25;
    let hdfcAgreedFilteredRows = [];
    let hdfcComparisonChartInstance = null;
    let hdfcDistributionChartInstance = null;

    // Checking Console State Variables
    let checkingLedgerCurrentPage = 1;
    let checkingLedgerPageSize = 25;
    let checkingLedgerFilteredBills = [];
    let checkingCoverageChartInstance = null;
    let checkingDiscrepancyChartInstance = null;

    // Workflow & Role State Variables
    window.currentUserRole = 'Auditor'; // Default role
    window.previousUserRole = 'Auditor';
    window.pendingUserRoleChange = null;
    let currentAuditId = '';
    let workflowStatus = 'Draft'; // Draft / Validated / Approved / Saved / Archived
    window.currentApprovalDetails = null;
    window.currentAuditVersionHistory = [];
    let uploadedFilesRowsMap = {}; // Maps filename to { rows: array of arrays, headerRowIdx: int }
    let originalUploadedFilesRowsMap = {};
    let revisedToOriginalFileMap = {};
    let isReuploadAuditRun = false;
    let reuploadStats = { corrected: 0, pending: 0, remarksImported: 0, overridesImported: 0 };

    // DOM Elements - Master Tab
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear');
    const masterBuSelect = document.getElementById('master-bu-select');
    const masterSourceSelect = document.getElementById('master-source-select');
    const masterCustomerSelect = document.getElementById('master-customer-select');
    const filterPills = document.getElementById('filter-pills');
    const exportCsvBtn = document.getElementById('export-csv');
    const resultsCountEl = document.getElementById('results-count');
    const totalCountEl = document.getElementById('total-count');
    const activeFiltersBadgesEl = document.getElementById('active-filters-badges');
    const tariffTbody = document.getElementById('tariff-tbody');
    const emptyState = document.getElementById('empty-state');
    const pageSizeSelect = document.getElementById('page-size');
    const pageRangeDisplay = document.getElementById('page-range-display');
    const paginationButtons = document.getElementById('pagination-buttons');
    const detailsModal = document.getElementById('details-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Metrics elements - Master Tab
    const statTotalEl = document.getElementById('stat-total');
    const statSharedEl = document.getElementById('stat-shared');
    const statDiscrepancyEl = document.getElementById('stat-discrepancy');
    const statCheaperEl = document.getElementById('stat-cheaper');

    // DOM Elements - Audit Tab
    const uploadDropzone = document.getElementById('upload-dropzone');
    const billFileInput = document.getElementById('bill-file-input');
    const fileMetaDisplay = document.getElementById('file-meta-display');
    const metaFilename = document.getElementById('meta-filename');
    const metaFilesize = document.getElementById('meta-filesize');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const btnRunAudit = document.getElementById('btn-run-audit');
    const auditResultsArea = document.getElementById('audit-table-area');

    // Audit Table & Filters
    const auditSearchInput = document.getElementById('audit-search-input');
    const auditSearchClearBtn = document.getElementById('audit-search-clear');
    const auditStatusSelect = document.getElementById('audit-status-select');
    const auditRoomSelect = document.getElementById('audit-room-select');
    const auditCaseSelect = document.getElementById('audit-case-select');
    const auditExportCsvBtn = document.getElementById('audit-export-csv');
    const auditTbody = document.getElementById('audit-tbody');
    const auditEmptyState = document.getElementById('audit-empty-state');
    const auditPageSizeSelect = document.getElementById('audit-page-size');
    const auditPageRangeDisplay = document.getElementById('audit-page-range-display');
    const auditPaginationButtons = document.getElementById('audit-pagination-buttons');

    // Config inputs
    const chkExcludePharmacy = document.getElementById('chk-exclude-pharmacy');
    const chkExcludePackage = document.getElementById('chk-exclude-package');
    const chkExcludeConsumables = document.getElementById('chk-exclude-consumables');
    const chkExcludeZero = document.getElementById('chk-exclude-zero');
    const auditBuSelect = document.getElementById('audit-bu-select');
    const auditTypeSelect = document.getElementById('audit-type-select');
    const auditSourceTypeSelect = document.getElementById('audit-source-type-select');
    const auditSourceSelect = document.getElementById('audit-source-select');
    const auditMappingMethodSelect = document.getElementById('audit-mapping-method-select');

    // Theme logic toggle
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        if (newTheme === 'light') {
            themeToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 18.36l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
            `;
        } else {
            themeToggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            `;
        }
        
        // Redraw database overview charts
        updateDatabaseDashboard();
        
        if (auditedRows.length > 0) {
            updateAuditCharts();
        }

        if (typeof updateCheckingDashboard === 'function') {
            updateCheckingDashboard();
        }
    });

    // Environment Toggle Event Listener
    const btnToggleEnv = document.getElementById('btn-toggle-env');
    const envBadge = document.getElementById('env-badge');
    if (btnToggleEnv && envBadge) {
        btnToggleEnv.addEventListener('click', async () => {
            window.sandboxEnvironment = !window.sandboxEnvironment;
            if (window.sandboxEnvironment) {
                // Update badge to Sandbox mode
                envBadge.style.color = '#d97706'; // warm gold
                envBadge.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; background: #d97706; border-radius: 50%; animation: pulse 1.5s infinite;"></span>
                    TEST SANDBOX
                `;
                btnToggleEnv.textContent = 'Switch to Prod';
                btnToggleEnv.style.borderColor = 'rgba(217, 119, 6, 0.3)';
                btnToggleEnv.style.color = '#d97706';
                
                // Add class to body to show sandbox indicator banner at the top
                document.body.classList.add('sandbox-active');
                
                // Update version UI
                const vBadge = document.getElementById('app-version-badge');
                if (vBadge) vBadge.textContent = 'TEST VERSION: V1.3.0';
                const vStatus = document.getElementById('version-card-status');
                if (vStatus) {
                    vStatus.textContent = 'TESTING';
                    vStatus.style.background = '#d97706';
                }
                const vTitle = document.getElementById('version-card-title');
                if (vTitle) {
                    vTitle.style.color = '#d97706';
                    vTitle.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        VERSION V1.3.0
                    `;
                }
                
                showToast('Switched to Test Sandbox Environment (V1.3.0). Changes are kept in local test storage and will not be pushed to production databases.', 'warning');
            } else {
                // Update badge to Production mode
                envBadge.style.color = 'var(--primary)';
                envBadge.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; background: var(--primary); border-radius: 50%;"></span>
                    PRODUCTION
                `;
                btnToggleEnv.textContent = 'Switch to Test';
                btnToggleEnv.style.borderColor = 'var(--border)';
                btnToggleEnv.style.color = 'var(--text-main)';
                
                // Remove class from body
                document.body.classList.remove('sandbox-active');
                
                // Reset version UI
                const vBadge = document.getElementById('app-version-badge');
                if (vBadge) vBadge.textContent = 'LOCKED VERSION: V1.3.0';
                const vStatus = document.getElementById('version-card-status');
                if (vStatus) {
                    vStatus.textContent = 'LOCKED';
                    vStatus.style.background = 'var(--success)';
                }
                const vTitle = document.getElementById('version-card-title');
                if (vTitle) {
                    vTitle.style.color = 'var(--success)';
                    vTitle.innerHTML = `
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        VERSION V1.3.0
                    `;
                }
                
                showToast('Switched back to Production Environment.', 'success');
            }
            
            // Reload all audits and overrides state from correct storage namespace!
            try {
                // 1. Reload audits
                const loadedAudits = await loadDatabaseFromServer();
                // Find and update current audits if rendering repository
                if (typeof renderRepositoryTable === 'function') {
                    renderRepositoryTable();
                }
                
                // 2. Reload overrides and refresh custom department discounts
                await loadOverridesFromServer();
                await loadCustomAgreementsFromServer();
                if (typeof window.loadUnitCustomDiscounts === 'function') {
                    window.loadUnitCustomDiscounts();
                }
                
                // 3. Update dashboard metrics
                if (typeof updateDatabaseDashboard === 'function') {
                    updateDatabaseDashboard();
                }
            } catch (e) {
                console.error("Error toggling sandbox environment state reload:", e);
            }
        });
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast-alert';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = '8px';
        toast.style.color = '#ffffff';
        toast.style.fontSize = '0.82rem';
        toast.style.fontWeight = '700';
        toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15)';
        toast.style.zIndex = '999999';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '0.5rem';
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
        toast.style.backdropFilter = 'blur(8px)';
        
        let bgColor = 'rgba(30, 41, 59, 0.95)'; // default dark slate
        let icon = '';
        if (type === 'success') {
            bgColor = 'rgba(16, 185, 129, 0.95)'; // emerald green
            icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>';
        } else if (type === 'warning') {
            bgColor = 'rgba(217, 119, 6, 0.95)'; // amber yellow
            icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v2m0 4h.01M3 21h18L12 3z"/></svg>';
        } else if (type === 'danger') {
            bgColor = 'rgba(239, 68, 68, 0.95)'; // rose red
            icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>';
        } else {
            bgColor = 'rgba(59, 130, 246, 0.95)'; // blue info
            icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
        }
        
        toast.style.backgroundColor = bgColor;
        toast.innerHTML = icon + `<span>${message}</span>`;
        
        document.body.appendChild(toast);
        
        // Trigger reflow
        toast.offsetHeight;
        
        // Slide up & fade in
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 350);
        }, 5000);
    }
    window.showToast = showToast;

    // Tab Selector clicks
    const tabsList = [
        { btn: tabDashboardBtn, panel: panelDashboard, onShow: () => { updateDashboardView(); } },
        { btn: tabIngesterBtn, panel: panelIngester, onShow: () => { initIngesterPanel(); } },
        { btn: tabMasterBtn, panel: panelMaster, onShow: () => { applyFiltersAndSort(); } },
        { btn: tabAuditBtn, panel: panelAudit, onShow: () => { } },
        { btn: tabAgreementBtn, panel: panelAgreement, onShow: () => { renderAgreementManager(); } },
        { btn: tabExceptionsBtn, panel: panelExceptions, onShow: () => { renderExceptionsTable(); } },
        { btn: tabReportsBtn, panel: panelReports, onShow: () => { renderReportsPanel(); } },
        { btn: tabRepositoryBtn, panel: panelRepository, onShow: () => { renderRepositoryTable(); } },
        { btn: tabManualBtn, panel: panelManual, onShow: () => { } },
        { btn: tabCheckingBtn, panel: panelChecking, onShow: () => { updateCheckingDashboard(); } },
        { btn: tabAdminBtn, panel: panelAdmin, onShow: () => { window.renderAdminCenter(); } },
        { btn: tabInfraBtn, panel: panelInfra, onShow: () => { if (window.renderInfraDashboard) window.renderInfraDashboard(); } },
        { btn: tabSettlementBtn, panel: panelSettlement, onShow: () => { if (window.initSettlementAuditor) window.initSettlementAuditor(); } }
    ];

    tabsList.forEach(tab => {
        if (tab.btn) {
            tab.btn.addEventListener('click', () => {
                // Access permission guards from dynamic permissions map
                const activePerms = window.rolePermissions[window.currentUserRole] || [];
                const tabId = tab.btn.id;
                const isAuthorized = activePerms.includes(tabId) && (tabId !== 'tab-master-btn' || window.currentUserUnit === 'all');

                if (!isAuthorized) {
                    showToast('Access Denied: You do not have permission to view this section.', 'danger');
                    return;
                }

                tabsList.forEach(t => {
                    if (t.btn) t.btn.classList.remove('active');
                    if (t.panel) t.panel.classList.remove('active');
                });
                tab.btn.classList.add('active');
                if (tab.panel) tab.panel.classList.add('active');
                
                // Update header title dynamically
                const headerTitle = document.getElementById('main-header-title');
                if (headerTitle) {
                    let text = "";
                    tab.btn.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            text += node.textContent;
                        } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('tab-badge') && node.tagName !== 'svg') {
                            text += node.textContent;
                        }
                    });
                    headerTitle.textContent = text.trim();
                }
                
                if (tab.onShow) tab.onShow();
            });
        }
    });

    // COLLAPSIBLE SIDEBAR & SYNCED NAVIGATION & CONTEXT SELECTOR LOGIC
    
    // Sidebar state initialization
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (localStorage.getItem('brc_v2_sidebar-collapsed') === 'true') {
        if (sidebar) sidebar.classList.add('collapsed');
    }
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('brc_v2_sidebar-collapsed', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Sync Navigation Links Filtering with Search
    const navSearch = document.getElementById('nav-search');
    if (navSearch) {
        navSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const tabButtons = document.querySelectorAll('.sidebar-nav .tab-btn');
            tabButtons.forEach(btn => {
                const textSpan = btn.querySelector('span');
                if (textSpan) {
                    const text = textSpan.textContent.toLowerCase();
                    if (text.includes(query)) {
                        btn.style.display = 'flex';
                    } else {
                        btn.style.display = 'none';
                    }
                }
            });
        });
    }

    // Select Hospital Unit Context function
    window.selectContextUnit = function(unitName) {
        const clientSpan = document.getElementById('context-client');
        const unitSpan = document.getElementById('context-unit');
        const unitSelect = document.getElementById('context-unit-select');
        const locationSpan = document.getElementById('context-location');
        const periodSpan = document.getElementById('context-period');
        const statusSpan = document.getElementById('context-status');
        const lastUpdatedSpan = document.getElementById('context-last-updated');

        if (clientSpan) {
            clientSpan.textContent = 'Apollo International';
        }
        
        if (unitSpan) {
            unitSpan.textContent = unitName;
        }

        if (unitSelect) {
            unitSelect.value = unitName;
        }
        
        // Populate context details based on selected unit
        if (unitName === 'Excelcare') {
            if (locationSpan) locationSpan.textContent = 'Guwahati';
            if (periodSpan) periodSpan.textContent = 'FY 2026-27';
            if (statusSpan) {
                statusSpan.textContent = 'Audit In Progress';
                statusSpan.className = 'status-badge status-approved';
                statusSpan.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                statusSpan.style.color = 'var(--primary)';
            }
        } else if (unitName === 'Christian Basti') {
            if (locationSpan) locationSpan.textContent = 'Guwahati';
            if (periodSpan) periodSpan.textContent = 'FY 2025-26';
            if (statusSpan) {
                statusSpan.textContent = 'MOU Verified';
                statusSpan.className = 'status-badge status-approved';
                statusSpan.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                statusSpan.style.color = 'var(--success)';
            }
        } else {
            // General or other unit
            if (locationSpan) locationSpan.textContent = 'Assam';
            if (periodSpan) periodSpan.textContent = 'FY 2026-27';
            if (statusSpan) {
                statusSpan.textContent = 'Unknown';
                statusSpan.className = 'status-badge';
                statusSpan.style.backgroundColor = 'var(--bg-app)';
                statusSpan.style.color = 'var(--text-muted)';
            }
        }

        if (lastUpdatedSpan) {
            const now = new Date();
            lastUpdatedSpan.textContent = now.toLocaleTimeString();
        }

        // Show a helpful toast notification
        if (typeof window.showToast === 'function') {
            window.showToast(`Switched active audit unit to: ${unitName} (Apollo International)`, 'success');
        }
    };

    function updateDashboardView() {
        updateDatabaseDashboard();
    }

    // Build Unified Tariffs on startup for Master Explorer
    function buildUnifiedTariffs() {
        // Build maps safely using safeForEach
        safeForEach(TARIFF_DATA, item => { map2026[item.id] = item; });
        
        if (typeof TARIFF_2021 !== 'undefined') safeForEach(TARIFF_2021, item => { map2021[item.id] = item; });
        if (typeof TARIFF_2021_IOCL !== 'undefined') safeForEach(TARIFF_2021_IOCL, item => { map2021_iocl[item.id] = item; });
        if (typeof TARIFF_2023 !== 'undefined') safeForEach(TARIFF_2023, item => { map2023[item.id] = item; });
        if (typeof TARIFF_2023_V2 !== 'undefined') safeForEach(TARIFF_2023_V2, item => { map2023_v2[item.id] = item; });
        if (typeof TARIFF_2024 !== 'undefined') safeForEach(TARIFF_2024, item => { map2024[item.id] = item; });
        if (typeof TARIFF_2025 !== 'undefined') safeForEach(TARIFF_2025, item => { map2025[item.id] = item; });
        if (typeof TARIFF_EXCELCARE_2025 !== 'undefined') {
            safeForEach(TARIFF_EXCELCARE_2025, item => { mapExcelcare[item.id] = item; });
        }
        if (typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined') {
            safeForEach(TARIFF_EXCELCARE_CASH_2025, item => { mapExcelcareCash[item.id] = item; });
        }
        if (typeof TARIFF_CASH_2025 !== 'undefined') {
            safeForEach(TARIFF_CASH_2025, item => { mapCash2025[item.id] = item; });
        }
        if (typeof TARIFF_CASH_2026 !== 'undefined') {
            safeForEach(TARIFF_CASH_2026, item => { mapCash2026[item.id] = item; });
        }
        if (typeof TARIFF_EXCELCARE_2024 !== 'undefined') {
            safeForEach(TARIFF_EXCELCARE_2024, item => { mapExcelcare2024[item.id] = item; });
        }
        if (typeof TARIFF_EXCELCARE_GIPSA_2026 !== 'undefined') {
            safeForEach(TARIFF_EXCELCARE_GIPSA_2026, item => { mapExcelcareGipsa2026[item.id] = item; });
        }
        if (typeof TARIFF_KOLKATA_SOC !== 'undefined') {
            safeForEach(TARIFF_KOLKATA_SOC, item => {
                // Standard map: only entries without a payer restriction
                if (!item.applicablePayer) {
                    mapKolkata[item.id] = item;
                }
                // HDFC map: all standard entries + HDFC_ERGO-tagged package entries
                mapKolkataHdfc[item.id] = item;
            });
        }
        if (typeof TARIFF_HDFC_ERGO_2024 !== 'undefined') {
            safeForEach(TARIFF_HDFC_ERGO_2024, item => {
                if (!mapHdfc[item.id]) mapHdfc[item.id] = [];
                mapHdfc[item.id].push(item);
            });
        }
        if (typeof TARIFF_HDFC_ERGO_AGREED_2026 !== 'undefined') {
            safeForEach(TARIFF_HDFC_ERGO_AGREED_2026, item => {
                Object.defineProperty(item, 'rate', {
                    get: function() {
                        const currentBU = document.getElementById('audit-bu-select')?.value || 'excelcare';
                        return currentBU === 'international' ? this.intl_rate : this.excl_rate;
                    },
                    configurable: true
                });
                mapHdfcAgreed2026[item.id] = item;
            });
        }

        // Collect all unique IDs across all sets
        let allIds = new Set();
        TARIFF_DATA.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2021 !== 'undefined') TARIFF_2021.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2021_IOCL !== 'undefined') TARIFF_2021_IOCL.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2023 !== 'undefined') TARIFF_2023.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2023_V2 !== 'undefined') TARIFF_2023_V2.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2024 !== 'undefined') TARIFF_2024.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_2025 !== 'undefined') TARIFF_2025.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_EXCELCARE_2025 !== 'undefined') TARIFF_EXCELCARE_2025.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined') TARIFF_EXCELCARE_CASH_2025.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_CASH_2025 !== 'undefined') TARIFF_CASH_2025.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_CASH_2026 !== 'undefined') TARIFF_CASH_2026.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_EXCELCARE_2024 !== 'undefined') TARIFF_EXCELCARE_2024.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_EXCELCARE_GIPSA_2026 !== 'undefined') TARIFF_EXCELCARE_GIPSA_2026.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_KOLKATA_SOC !== 'undefined') TARIFF_KOLKATA_SOC.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_HDFC_ERGO_2024 !== 'undefined') TARIFF_HDFC_ERGO_2024.forEach(item => allIds.add(item.id));
        if (typeof TARIFF_HDFC_ERGO_AGREED_2026 !== 'undefined') TARIFF_HDFC_ERGO_AGREED_2026.forEach(item => allIds.add(item.id));

        UNIFIED_TARIFFS = [];
        allIds.forEach(id => {
            let name = '';
            let dept = '';
            let type = '';
            let aliasCode = '';
            let aliasName = '';

            let m26 = map2026[id];
            let m25 = map2025[id];
            let m24 = map2024[id];
            let m23 = map2023[id];
            let m23_v2 = map2023_v2[id];
            let m21 = map2021[id];
            let mEc = mapExcelcare[id];
            let mEcCash = mapExcelcareCash[id];
            let mEc24 = mapExcelcare2024[id];
            let mEcGipsa2026 = mapExcelcareGipsa2026[id];
            let mKol = mapKolkata[id];
            let mHdfcList = mapHdfc[id] || [];
            let mHdfc = mHdfcList.length > 0 ? mHdfcList[0] : null;
            let mHdfcAgreed = mapHdfcAgreed2026[id];

            // Priority order for descriptions
            if (m26) {
                name = m26.name; dept = m26.dept; type = m26.type;
                aliasCode = m26.aliasCode; aliasName = m26.aliasName;
            } else if (m25) {
                name = m25.name; dept = m25.dept; type = m25.type;
            } else if (m24) {
                name = m24.name; dept = m24.dept; type = m24.type;
            } else if (m23) {
                name = m23.name; dept = m23.dept; type = m23.type;
            } else if (m23_v2) {
                name = m23_v2.name; dept = m23_v2.dept; type = m23_v2.type;
            } else if (m21) {
                name = m21.name; dept = m21.dept; type = m21.type;
            } else if (mKol) {
                name = mKol.name; dept = mKol.dept; type = mKol.type;
            } else if (mEcGipsa2026) {
                name = mEcGipsa2026.name; dept = 'Excelcare SOC'; type = 'Excelcare GIPSA';
            } else if (mEc) {
                name = mEc.name; dept = 'Excelcare SOC'; type = 'Excelcare Room/Bed';
            } else if (mEcCash) {
                name = mEcCash.name; dept = 'Excelcare SOC'; type = 'Excelcare Room/Bed';
            } else if (mEc24) {
                name = mEc24.name; dept = 'Excelcare SOC'; type = 'Excelcare Room/Bed';
            } else if (mHdfc) {
                name = mHdfc.name; dept = 'HDFC ERGO Template'; type = 'HDFC Room Specific';
            } else if (mHdfcAgreed) {
                name = mHdfcAgreed.name; dept = mHdfcAgreed.department; type = 'HDFC Centrally Agreed';
            }

            UNIFIED_TARIFFS.push({
                id: id,
                name: name || '',
                dept: dept || 'Others',
                type: type || 'Others',
                aliasCode: aliasCode || '0',
                aliasName: aliasName || '0',
                rate2026: m26 ? { gipsa: m26.gipsa_rate, tpa: m26.tpa_rate, gipsa_template: m26.gipsa_template, tpa_template: m26.tpa_template } : null,
                rate2025: m25 ? m25.rate : null,
                rate2024: m24 ? m24.rate : null,
                rate2023: m23 ? m23.rate : null,
                rate2023_v2: m23_v2 ? m23_v2.rate : null,
                rate2021: m21 ? m21.rate : null,
                rateExcelcare: mEc ? mEc.rate : null,
                rateExcelcareCash: mEcCash ? mEcCash.rate : null,
                rateExcelcare2024: mEc24 ? mEc24.rate : null,
                rateExcelcareGipsa2026: mEcGipsa2026 ? mEcGipsa2026.rate : null,
                rateKolkata: mKol ? mKol.rates : null,
                rateHdfcAgreed2026: mHdfcAgreed ? { intl_rate: mHdfcAgreed.intl_rate, excl_rate: mHdfcAgreed.excl_rate, variance: mHdfcAgreed.variance } : null
            });
        });
    }

    // App Initialization
    function init() {
        if (typeof TARIFF_DATA === 'undefined') {
            console.error('TARIFF_DATA is not defined. Make sure tariff_data.js is compiled.');
            tariffTbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: var(--danger); font-weight: 700; padding: 2rem;">Error: tariff_data.js not found. Please compile the files first.</td></tr>';
            return;
        }

        // Merge Kolkata agreements into AGREEMENT_DETAILS
        if (typeof AGREEMENT_KOLKATA !== 'undefined' && typeof AGREEMENT_DETAILS !== 'undefined') {
            AGREEMENT_KOLKATA.forEach(ag => {
                if (!AGREEMENT_DETAILS.some(x => x.agreementName === ag.agreementName)) {
                    AGREEMENT_DETAILS.push(ag);
                }
            });
        }

        // Load database & overrides from server (with LocalStorage fallbacks) asynchronously
        loadDatabaseFromServer().then(() => {
            renderRepositoryTable();
            updateDatabaseDashboard();
        });
        loadOverridesFromServer();
        loadCustomAgreementsFromServer();

        // Build unified tariffs list and lookups
        buildUnifiedTariffs();

        // Calculate and show summary metrics
        calculateMetrics();

        // Populate dynamic dropdown filters
        populateDropdowns();

        // Update audit selector default values based on Business Unit
        updateValidationSourceOptions();
        populateRoomMappingSelects();

        // Setup Event Listeners
        setupEventListeners();
        setupAuditEventListeners();
        initIngesterPanel();

        // Run filter first time
        applyFiltersAndSort();
        updateTabBadges();
        
        // Initialize Checking Console settings
        initCheckingDashboard();

        // Initialize Custom Overrides UI and data
        initCustomOverrides();

        // Initialize User Credentials and Admin Center
        if (typeof initUserCredentials === 'function') {
            initUserCredentials();
        }
        if (typeof initAdminCenterEventListeners === 'function') {
            initAdminCenterEventListeners();
        }

        // Initialize Portal Login Screen
        if (typeof initPortalLoginListeners === 'function') {
            initPortalLoginListeners();
        }
        if (typeof checkUserLoginState === 'function') {
            // Auto Signout on reload/refresh: clear the active session
            localStorage.removeItem('brc_v2_logged_in_user');
            checkUserLoginState();
        }
        if (typeof setupInactivityListeners === 'function') {
            setupInactivityListeners();
        }

        // Draw startup database dashboard charts
        updateDatabaseDashboard();

        // Register PWA Service Worker with auto-refresh on update
        if ("serviceWorker" in navigator) {
            // For local development and test mode (index_v2_test.html), unregister Service Worker to prevent caching and ERR_FAILED errors
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.pathname.includes('index_v2_test')) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister().then(success => {
                            if (success) {
                                console.log("Service Worker unregistered successfully for local testing.");
                            }
                        });
                    }
                });
            } else {
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });
                window.addEventListener("load", () => {
                    navigator.serviceWorker.register("./sw.js")
                        .then(reg => {
                            console.log("Service Worker registered successfully:", reg.scope);
                            reg.addEventListener('updatefound', () => {
                                const newWorker = reg.installing;
                                if (newWorker) {
                                    newWorker.addEventListener('statechange', () => {
                                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                            console.log("New content available. Refreshing...");
                                            window.location.reload();
                                        }
                                    });
                                }
                            });
                        })
                        .catch(err => console.error("Service Worker registration failed:", err));
                });
            }
        }
    }

    // Dynamic Database overview counts and charts
    function updateDatabaseDashboard() {
        let count2021 = 0;
        let count2021_iocl = 0;
        let count2023 = 0;
        let count2023_v2 = 0;
        let count2024 = 0;
        let count2025 = 0;
        let countExcelcare = 0;
        let countExcelcareCash = 0;
        let countExcelcare2024 = 0;
        let countExcelcareGipsa2026 = 0;
        let count2026 = 0;
        let countKolkataSoc = 0;
        let countKolkataPkg = 0;

        if (typeof TARIFF_2021 !== 'undefined') count2021 = TARIFF_2021.length;
        if (typeof TARIFF_2021_IOCL !== 'undefined') count2021_iocl = TARIFF_2021_IOCL.length;
        if (typeof TARIFF_2023 !== 'undefined') count2023 = TARIFF_2023.length;
        if (typeof TARIFF_2023_V2 !== 'undefined') count2023_v2 = TARIFF_2023_V2.length;
        if (typeof TARIFF_2024 !== 'undefined') count2024 = TARIFF_2024.length;
        if (typeof TARIFF_2025 !== 'undefined') count2025 = TARIFF_2025.length;
        if (typeof TARIFF_EXCELCARE_2025 !== 'undefined') countExcelcare = TARIFF_EXCELCARE_2025.length;
        if (typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined') countExcelcareCash = TARIFF_EXCELCARE_CASH_2025.length;
        if (typeof TARIFF_EXCELCARE_2024 !== 'undefined') countExcelcare2024 = TARIFF_EXCELCARE_2024.length;
        if (typeof TARIFF_EXCELCARE_GIPSA_2026 !== 'undefined') countExcelcareGipsa2026 = TARIFF_EXCELCARE_GIPSA_2026.length;
        if (typeof TARIFF_DATA !== 'undefined') count2026 = TARIFF_DATA.length;
        if (typeof TARIFF_KOLKATA_SOC !== 'undefined') countKolkataSoc = TARIFF_KOLKATA_SOC.length;
        if (typeof TARIFF_KOLKATA_PKG !== 'undefined') countKolkataPkg = TARIFF_KOLKATA_PKG.length;

        let cbCount = 0;
        let ecCount = 0;
        let centralisedCount = 0;
        let kolCount = 0;
        let totalMOUs = 0;

        if (typeof AGREEMENT_DETAILS !== 'undefined') {
            totalMOUs = AGREEMENT_DETAILS.length;
            AGREEMENT_DETAILS.forEach(ag => {
                const loc = (ag.locations || '').toLowerCase();
                const hasExcelcare = loc.includes('excelcare');
                const hasGuwahatiOrSubham = loc.includes('guwahati') || loc.includes('subham');
                const hasKolkata = loc.includes('kolkata') || (ag.tariffMapped && ag.tariffMapped.toLowerCase().includes('kolkata'));
                
                if (hasKolkata) {
                    kolCount++;
                } else if (hasExcelcare && hasGuwahatiOrSubham) {
                    centralisedCount++;
                } else if (hasExcelcare) {
                    ecCount++;
                } else if (hasGuwahatiOrSubham) {
                    cbCount++;
                } else {
                    cbCount++;
                }
            });
        }

        // Update card metrics
        const dbMouEl = document.getElementById('db-mou-count');
        const dbMasterEl = document.getElementById('db-master-codes-count');
        const dbCbEl = document.getElementById('db-cb-count');
        const dbEcEl = document.getElementById('db-ec-count');

        const activeUnit = window.currentUserUnit || 'all';
        if (activeUnit === 'kolkata') {
            if (dbMouEl) dbMouEl.textContent = kolCount.toLocaleString();
            if (dbMasterEl) dbMasterEl.textContent = countKolkataSoc.toLocaleString();
            if (dbCbEl) dbCbEl.textContent = "0";
            if (dbEcEl) dbEcEl.textContent = "0";
        } else if (activeUnit === 'excelcare') {
            if (dbMouEl) dbMouEl.textContent = ecCount.toLocaleString();
            if (dbMasterEl) dbMasterEl.textContent = (countExcelcare + countExcelcareCash + countExcelcare2024 + countExcelcareGipsa2026).toLocaleString();
            if (dbCbEl) dbCbEl.textContent = "0";
            if (dbEcEl) dbEcEl.textContent = ecCount.toLocaleString();
        } else if (activeUnit === 'international') {
            if (dbMouEl) dbMouEl.textContent = cbCount.toLocaleString();
            if (dbMasterEl) dbMasterEl.textContent = (count2021 + count2021_iocl + count2023 + count2023_v2 + count2024 + count2025).toLocaleString();
            if (dbCbEl) dbCbEl.textContent = cbCount.toLocaleString();
            if (dbEcEl) dbEcEl.textContent = "0";
        } else {
            if (dbMouEl) dbMouEl.textContent = totalMOUs.toLocaleString();
            if (dbMasterEl) dbMasterEl.textContent = (count2026 + countKolkataSoc).toLocaleString();
            if (dbCbEl) dbCbEl.textContent = cbCount.toLocaleString();
            if (dbEcEl) dbEcEl.textContent = ecCount.toLocaleString();
        }

        // Chart styling depending on theme
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#1e293b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

        // 1. Tariffs by Year Chart
        let labels = [];
        let data = [];
        if (activeUnit === 'kolkata') {
            labels = ['Kolkata SOC', 'Kolkata Pkg'];
            data = [countKolkataSoc, countKolkataPkg];
        } else if (activeUnit === 'excelcare') {
            labels = ['Excelcare 24', 'Excelcare 25', 'Excelcare Cash', 'Excelcare GIPSA'];
            data = [countExcelcare2024, countExcelcare, countExcelcareCash, countExcelcareGipsa2026];
        } else if (activeUnit === 'international') {
            labels = ['2021-22', '2021-22 IOCL', '2023-24', '2023-24 V2', '2024-25', '2025-26'];
            data = [count2021, count2021_iocl, count2023, count2023_v2, count2024, count2025];
        } else {
            labels = ['2021-22', '2021-22 IOCL', '2023-24', '2023-24 V2', '2024-25', '2025-26', 'Excelcare 24', 'Excelcare 25', 'Excelcare Cash', 'Excelcare GIPSA', 'Kolkata SOC', 'Kolkata Pkg', '2026 Master'];
            data = [count2021, count2021_iocl, count2023, count2023_v2, count2024, count2025, countExcelcare2024, countExcelcare, countExcelcareCash, countExcelcareGipsa2026, countKolkataSoc, countKolkataPkg, count2026];
        }

        const ctxYears = document.getElementById('chart-db-years');
        if (ctxYears) {
            if (dbYearsChartInstance) {
                dbYearsChartInstance.destroy();
            }
            dbYearsChartInstance = new Chart(ctxYears.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tariff Codes',
                        data: data,
                        backgroundColor: isDark ? 'rgba(13, 148, 136, 0.8)' : 'rgba(15, 118, 110, 0.85)',
                        borderColor: isDark ? '#0d9488' : '#0f766e',
                        borderWidth: 1.5,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { family: 'inherit', size: 10 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'inherit', size: 10 } }
                        }
                    }
                }
            });
        }

        // 2. Agreement Distribution by Category Chart
        const catMap = {};
        if (typeof AGREEMENT_DETAILS !== 'undefined') {
            AGREEMENT_DETAILS.forEach(ag => {
                const scope = getAgreementScope(ag);
                let match = false;
                if (activeUnit === 'all') {
                    match = true;
                } else if (activeUnit === 'kolkata' && scope === 'kolkata') {
                    match = true;
                } else if (activeUnit === 'excelcare' && (scope === 'excelcare' || scope === 'centralised')) {
                    match = true;
                } else if (activeUnit === 'international' && (scope === 'international' || scope === 'centralised')) {
                    match = true;
                }
                
                if (match) {
                    const cType = ag.customerType || 'Other';
                    catMap[cType] = (catMap[cType] || 0) + 1;
                }
            });
        }

        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const unitLabels = sortedCats.map(x => x[0]);
        const unitData = sortedCats.map(x => x[1]);
        
        const catColors = {
            'Corporate': 'rgba(59, 130, 246, 0.8)',
            'Insurance Company': 'rgba(16, 185, 129, 0.8)',
            'Bank': 'rgba(245, 158, 11, 0.8)',
            'State Govt. Organization': 'rgba(139, 92, 246, 0.8)',
            'TPA': 'rgba(236, 72, 153, 0.8)'
        };
        const unitColors = unitLabels.map(l => catColors[l] || 'rgba(107, 114, 128, 0.8)');

        const ctxUnits = document.getElementById('chart-db-units');
        if (ctxUnits) {
            if (dbUnitsChartInstance) {
                dbUnitsChartInstance.destroy();
            }
            dbUnitsChartInstance = new Chart(ctxUnits.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: unitLabels,
                    datasets: [{
                        data: unitData,
                        backgroundColor: unitColors,
                        borderColor: isDark ? '#1c2541' : '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor,
                                font: { family: 'inherit', size: 10 },
                                boxWidth: 12
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1
                        }
                    },
                    cutout: '65%'
                }
            });
        }
    }
    // Editable Expected Tariff handler
    window.updateRowTariff = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = null;

        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawExpectedTariffStr = value;
            row.expectedTariff = valNum;
            row.isManuallyOverridden = true; // flag it
            
            const excludeZero = document.getElementById('chk-exclude-zero') ? document.getElementById('chk-exclude-zero').checked : true;
            
            if (valNum !== null) {
                if (excludeZero && row.billedRate === 0) {
                    row.status = "Ignored (Zero Rated)";
                    row.explanation = "Zero rated service items are excluded from checking.";
                    row.isIgnored = true;
                    row.diff = null;
                } else {
                    if (row.status === "Not Found in Master" || row.status === "Ignored (Zero Rated)") {
                        row.status = "Matching";
                    }
                    row.isIgnored = false;

                    const discountApplied = row.discountApplied || 0;
                    const billedRate = row.billedRate || 0;
                    const expectedDiscountedRate = valNum * (1 - discountApplied / 100);
                    row.expectedDiscountedRate = expectedDiscountedRate;
                    const diff = billedRate - expectedDiscountedRate;
                    row.diff = diff;

                    let status = "Matching";
                    let explanation = row.baseExplanation || "";

                    if (Math.abs(diff) < 0.1) {
                        status = "Matching";
                    } else if (Math.abs(diff) <= 1) {
                        status = "Round Off Difference";
                        explanation += ` Minor rate difference (within ±₹1).`;
                    } else if (diff > 0) {
                        status = "Overcharged";
                        if (billedRate === valNum && discountApplied > 0) {
                            explanation = `Billed at full rate (₹${valNum}) without contract discount (${discountApplied}%) expected ₹${expectedDiscountedRate}.`;
                        }
                    } else {
                        status = "Undercharged";
                    }
                    row.status = status;
                    row.explanation = explanation;
                }
            } else {
                if (excludeZero && row.billedRate === 0) {
                    row.status = "Ignored (Zero Rated)";
                    row.explanation = "Zero rated service items are excluded from checking.";
                    row.isIgnored = true;
                    row.diff = null;
                } else {
                    row.expectedDiscountedRate = null;
                    row.diff = null;
                    row.status = "Not Found in Master";
                }
            }

            // Refresh UI views
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();

            if (panelReports.classList.contains('active')) {
                renderReportsPanel();
            }
        }
    };

    // Remarks editing handler
    window.updateRowRemarks = function(uid, value) {
        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.userRemarks = value;
        }
    };

    window.updateRowBilledRate = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = 0;
        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawBilledRateStr = value;
            row.billedRate = valNum;
            if (!row.isIgnored && row.status !== "Not Found in Master") {
                computeRowAuditStatusAndDiff(row);
            } else if (row.status === "Not Found in Master") {
                row.diff = valNum;
            }
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();
        }
    };

    window.updateRowBilledPreDisc = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = 0;
        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawBilledPreDiscStr = value;
            row.billedRatePreDiscount = valNum;
            if (!row.isIgnored && row.status !== "Not Found in Master") {
                computeRowAuditStatusAndDiff(row);
            }
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();
        }
    };

    window.updateRowSocRate = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = 0;
        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawSocRateStr = value;
            row.socRate = valNum;
            computeRowAuditStatusAndDiff(row);
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();
        }
    };

    window.updateRowTariffRate = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = 0;
        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawTariffRateStr = value;
            row.tariffRate = valNum;
            computeRowAuditStatusAndDiff(row);
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();
        }
    };

    // Brick-style filter selecting handler
    window.selectAuditBrickFilter = function(statusVal) {
        if (auditStatusSelect) {
            auditStatusSelect.value = statusVal;

            document.querySelectorAll('.filter-brick').forEach(brick => {
                brick.classList.remove('active');
            });
            const brickMap = {
                'all': 'brick-all',
                'matching': 'brick-matching',
                'overcharged': 'brick-overcharged',
                'undercharged': 'brick-undercharged',
                'notfound': 'brick-notfound',
                'ignored': 'brick-ignored',
                'errors': 'brick-errors'
            };
            const activeBrick = document.querySelector(`.filter-brick.${brickMap[statusVal]}`);
            if (activeBrick) {
                activeBrick.classList.add('active');
            }

            applyAuditFiltersAndSort();
        }
    };

    // Expandable card toggle handlers for mobile tables
    window.toggleCardExpand = function(uid) {
        const rowEl = document.getElementById(`audit-row-${uid}`);
        if (rowEl) {
            const isCollapsed = rowEl.classList.contains('collapsed-card');
            if (isCollapsed) {
                rowEl.classList.remove('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'Hide Details';
            } else {
                rowEl.classList.add('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'View Details';
            }
        }
    };

    window.toggleTariffCardExpand = function(id) {
        const rowEl = document.getElementById(`tariff-row-${id}`);
        if (rowEl) {
            const isCollapsed = rowEl.classList.contains('collapsed-card');
            if (isCollapsed) {
                rowEl.classList.remove('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'Hide Details';
            } else {
                rowEl.classList.add('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'View Details';
            }
        }
    };

    window.toggleExceptionCardExpand = function(uid) {
        const rowEl = document.getElementById(`exception-row-${uid}`);
        if (rowEl) {
            const isCollapsed = rowEl.classList.contains('collapsed-card');
            if (isCollapsed) {
                rowEl.classList.remove('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'Hide Details';
            } else {
                rowEl.classList.add('collapsed-card');
                rowEl.querySelector('.card-expand-toggle').textContent = 'View Details';
            }
        }
    };

    // Mobile nav tab switching
    window.switchMobileTab = function(tabName) {
        const btnIdMap = {
            'dashboard': 'tab-dashboard-btn',
            'master': 'tab-master-btn',
            'audit': 'tab-audit-btn',
            'agreement': 'tab-agreement-btn',
            'exceptions': 'tab-exceptions-btn',
            'repository': 'tab-repository-btn',
            'manual': 'tab-manual-btn',
            'checking': 'tab-checking-btn'
        };
        const desktopBtn = document.getElementById(btnIdMap[tabName]);
        if (desktopBtn) {
            desktopBtn.click();
        }

        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeMobileBtn = document.getElementById(`mob-nav-${tabName}`);
        if (activeMobileBtn) {
            activeMobileBtn.classList.add('active');
        }
    };

    // Calculations for upper statistics card
    function calculateMetrics() {
        // Total Master Codes 2026
        statTotalEl.textContent = TARIFF_DATA.length.toLocaleString();

        // Historical SOC Codes unique count
        let histIds = new Set();
        if (typeof TARIFF_2021 !== 'undefined') TARIFF_2021.forEach(x => histIds.add(x.id));
        if (typeof TARIFF_2021_IOCL !== 'undefined') TARIFF_2021_IOCL.forEach(x => histIds.add(x.id));
        if (typeof TARIFF_2023 !== 'undefined') TARIFF_2023.forEach(x => histIds.add(x.id));
        if (typeof TARIFF_2023_V2 !== 'undefined') TARIFF_2023_V2.forEach(x => histIds.add(x.id));
        if (typeof TARIFF_2024 !== 'undefined') TARIFF_2024.forEach(x => histIds.add(x.id));
        if (typeof TARIFF_2025 !== 'undefined') TARIFF_2025.forEach(x => histIds.add(x.id));
        statSharedEl.textContent = histIds.size.toLocaleString();

        // HDFC ERGO 2024 records
        const hdfcCount = typeof TARIFF_HDFC_ERGO_2024 !== 'undefined' ? TARIFF_HDFC_ERGO_2024.length : 0;
        statDiscrepancyEl.textContent = hdfcCount.toLocaleString();

        // MOU Customer Agreements
        const agreementsCount = typeof AGREEMENT_DETAILS !== 'undefined' ? AGREEMENT_DETAILS.length : 14;
        statCheaperEl.textContent = agreementsCount.toLocaleString();
    }

    // Dynamic dropdown values extraction from data
    function populateDropdowns() {
        // Populate Sources based on Business Unit
        updateMasterSourceOptions();
    }

    function getBaseRateForAgreement(item, ag) {
        if (!ag || !ag.tariffMapped) return null;
        const tariffUpper = ag.tariffMapped.toUpperCase();
        if (tariffUpper.includes("HDFC") || tariffUpper.includes("ERGO")) {
            const hdfcList = mapHdfc[item.id];
            if (!hdfcList || hdfcList.length === 0) return null;
            const rates = hdfcList.map(r => r.rate).filter(v => v !== null && v !== undefined);
            if (rates.length === 0) return null;
            const min = Math.min(...rates);
            const max = Math.max(...rates);
            if (min === max) return min;
            return { min, max };
        }
        if (tariffUpper.includes("GIPSA")) {
            return item.rate2026 ? item.rate2026.gipsa : null;
        }
        if (tariffUpper.includes("DELUXE") || tariffUpper.includes("TPA")) {
            return item.rate2026 ? item.rate2026.tpa : null;
        }
        if (tariffUpper.includes("2021")) {
            return item.rate2021;
        }
        if (tariffUpper.includes("2023")) {
            return item.rate2023;
        }
        if (tariffUpper.includes("2024") || tariffUpper.includes("2024-25")) {
            return item.rate2024;
        }
        if (tariffUpper.includes("2025")) {
            return item.rate2025;
        }
        if (tariffUpper.includes("EXCELCARE")) {
            if (tariffUpper.includes("2024") || tariffUpper.includes("24-25")) {
                return item.rateExcelcare2024;
            }
            return item.rateExcelcare;
        }
        return null;
    }

    function updateMasterSourceOptions() {
        const bu = masterBuSelect.value;
        const sourceSelect = masterSourceSelect;
        const custSelect = masterCustomerSelect;
        
        const currentSource = sourceSelect.value || 'all';
        const currentCust = custSelect.value || 'all';
        
        // Populate Source Options
        sourceSelect.innerHTML = '<option value="all">All Years/Templates</option>';
        if (bu === 'all' || bu === 'international') {
            sourceSelect.innerHTML += `
                <option value="soc2025">2025-26 SOC (International)</option>
                <option value="soc2024">2024-25 SOC (International)</option>
                <option value="soc2023">2023-24 SOC (International)</option>
                <option value="soc2021">2021-22 SOC (International)</option>
                <option value="gipsa">2026 GIPSA Template</option>
                <option value="tpa">2024 TPA Deluxe Template</option>
            `;
        }
        if (bu === 'all' || bu === 'excelcare') {
            sourceSelect.innerHTML += `
                <option value="socexcelcare">2025-26 SOC (Excelcare)</option>
                <option value="socexcelcarecash">2026 - Cash (Excelcare)</option>
                <option value="socexcelcare2024">2024-25 SOC (Excelcare)</option>
                <option value="hdfcergo">2024 HDFC ERGO Template</option>
            `;
        }
        if (bu === 'all' || bu === 'kolkata') {
            sourceSelect.innerHTML += `
                <option value="sockolkata">2023-24 SOC (Kolkata)</option>
                <option value="pkgkolkata">2023-24 Packages (Kolkata)</option>
            `;
        }
        
        // Restore selected value if still exists in the new options list
        const optionExists = Array.from(sourceSelect.options).some(opt => opt.value === currentSource);
        if (optionExists) {
            sourceSelect.value = currentSource;
        } else {
            sourceSelect.value = 'all';
        }

        // Populate Customers based on Business Unit
        custSelect.innerHTML = '<option value="all">All Customers/Agreements</option>';
        if (typeof AGREEMENT_DETAILS !== 'undefined') {
            AGREEMENT_DETAILS.forEach(ag => {
                const mappedTariffUpper = ag.tariffMapped.toUpperCase();
                const isExcelcareAg = mappedTariffUpper.includes("HDFC") || mappedTariffUpper.includes("ERGO") || mappedTariffUpper.includes("EXCELCARE");
                const isKolkataAg = mappedTariffUpper.includes("KOLKATA") || (ag.locations && ag.locations.includes("Kolkata"));
                
                if (bu === 'all' || (bu === 'excelcare' && isExcelcareAg && !isKolkataAg) || (bu === 'international' && !isExcelcareAg && !isKolkataAg) || (bu === 'kolkata' && isKolkataAg)) {
                    const opt = document.createElement('option');
                    opt.value = ag.agreementName;
                    opt.textContent = ag.agreementName;
                    custSelect.appendChild(opt);
                }
            });
        }

        // Restore customer selection if still exists
        const custExists = Array.from(custSelect.options).some(opt => opt.value === currentCust);
        if (custExists) {
            custSelect.value = currentCust;
        } else {
            custSelect.value = 'all';
        }
    }

    // Set up standard event listeners (Master Panel)
    function setupEventListeners() {
        searchInput.addEventListener('input', () => {
            searchClearBtn.style.display = searchInput.value.trim().length > 0 ? 'flex' : 'none';
            currentPage = 1;
            applyFiltersAndSort();
        });

        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.style.display = 'none';
            currentPage = 1;
            searchInput.focus();
            applyFiltersAndSort();
        });

        masterBuSelect.addEventListener('change', () => {
            updateMasterSourceOptions();
            currentPage = 1;
            applyFiltersAndSort();
        });

        masterSourceSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });

        masterCustomerSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFiltersAndSort();
        });

        filterPills.addEventListener('click', (e) => {
            const btn = e.target.closest('.pill-btn');
            if (!btn) return;

            filterPills.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilterCategory = btn.getAttribute('data-filter');
            currentPage = 1;
            applyFiltersAndSort();
        });

        pageSizeSelect.addEventListener('change', () => {
            pageSize = parseInt(pageSizeSelect.value, 10);
            currentPage = 1;
            renderTable();
        });

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                if (currentSortColumn === column) {
                    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSortColumn = column;
                    currentSortDirection = 'asc';
                }
                updateSortHeadersUI();
                sortData();
                renderTable();
            });
        });

        closeModalBtn.addEventListener('click', closeModal);
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && detailsModal.classList.contains('show')) closeModal();
        });

        exportCsvBtn.addEventListener('click', exportToCSV);

        // Agreements sub-tabs click handlers
        const agSubtabs = document.querySelectorAll('.ag-subtab-btn');
        agSubtabs.forEach(btn => {
            btn.addEventListener('click', () => {
                agSubtabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentAgreementFilter = btn.getAttribute('data-filter');
                renderAgreementManager();
            });
        });

        // Agreements search and select filters
        const agreementSearch = document.getElementById('agreement-search-input');
        const agreementTariff = document.getElementById('agreement-tariff-select');
        const agreementStatus = document.getElementById('agreement-status-select');

        if (agreementSearch) {
            agreementSearch.addEventListener('input', renderAgreementManager);
        }
        if (agreementTariff) {
            agreementTariff.addEventListener('change', renderAgreementManager);
        }
        if (agreementStatus) {
            agreementStatus.addEventListener('change', renderAgreementManager);
        }
    }

    // Update the sorting indicator arrows in the UI
    function updateSortHeadersUI() {
        document.querySelectorAll('th[data-sort] .sort-indicator').forEach(indicator => {
            indicator.textContent = '';
        });
        const activeIndicator = document.getElementById(`sort-${currentSortColumn}`);
        if (activeIndicator) {
            activeIndicator.textContent = currentSortDirection === 'asc' ? '▲' : '▼';
        }
    }

    // Filter and sort core algorithm
    function applyFiltersAndSort() {
        const query = searchInput.value.toLowerCase().trim();
        const bu = masterBuSelect.value;
        const source = masterSourceSelect.value;
        const customer = masterCustomerSelect.value;
        const queryWords = query.split(/\s+/).filter(w => w.length > 0);

        // Update Filter Pills visibility based on Business Unit selection
        const pill2021 = document.querySelector('.pill-btn[data-filter="soc2021"]');
        const pill2023 = document.querySelector('.pill-btn[data-filter="soc2023"]');
        const pill2024 = document.querySelector('.pill-btn[data-filter="soc2024"]');
        const pill2025 = document.querySelector('.pill-btn[data-filter="soc2025"]');
        const pillExcelcare = document.querySelector('.pill-btn[data-filter="socexcelcare"]');
        const pillExcelcareCash = document.querySelector('.pill-btn[data-filter="socexcelcarecash"]');
        const pillExcelcare2024 = document.querySelector('.pill-btn[data-filter="socexcelcare2024"]');
        const pillHdfc = document.querySelector('.pill-btn[data-filter="hdfcergo"]');

        const isAllOrInt = (bu === 'all' || bu === 'international');
        const isAllOrEc = (bu === 'all' || bu === 'excelcare');

        if (pill2021) pill2021.style.display = isAllOrInt ? '' : 'none';
        if (pill2023) pill2023.style.display = isAllOrInt ? '' : 'none';
        if (pill2024) pill2024.style.display = isAllOrInt ? '' : 'none';
        if (pill2025) pill2025.style.display = isAllOrInt ? '' : 'none';
        if (pillExcelcare) pillExcelcare.style.display = isAllOrEc ? '' : 'none';
        if (pillExcelcareCash) pillExcelcareCash.style.display = isAllOrEc ? '' : 'none';
        if (pillExcelcare2024) pillExcelcare2024.style.display = isAllOrEc ? '' : 'none';
        if (pillHdfc) pillHdfc.style.display = isAllOrEc ? '' : 'none';

        // Reset filter tab if it was hidden
        if ((!isAllOrInt && ['soc2021', 'soc2023', 'soc2024', 'soc2025'].includes(currentFilterCategory)) ||
            (!isAllOrEc && ['socexcelcare', 'socexcelcare2024', 'socexcelcarecash', 'hdfcergo'].includes(currentFilterCategory))) {
            currentFilterCategory = 'all';
            document.querySelectorAll('#filter-pills .pill-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === 'all') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Determine column visibility
        const show2021 = isAllOrInt && (source === 'all' || source === 'soc2021');
        const show2023 = isAllOrInt && (source === 'all' || source === 'soc2023');
        const show2024 = isAllOrInt && (source === 'all' || source === 'soc2024');
        const show2025 = isAllOrInt && (source === 'all' || source === 'soc2025');
        const showExcelcare = isAllOrEc && (source === 'all' || source === 'socexcelcare');
        const showExcelcareCash = isAllOrEc && (source === 'all' || source === 'socexcelcarecash');
        const showExcelcare2024 = isAllOrEc && (source === 'all' || source === 'socexcelcare2024');
        const show2026Master = isAllOrInt && (source === 'all' || source === 'gipsa' || source === 'tpa');
        const showHdfc = isAllOrEc && (source === 'all' || source === 'hdfcergo');
        const showContract = (customer !== 'all');

        // Reset sorting column if it gets hidden
        if (currentSortColumn === 'rate2021' && !show2021) currentSortColumn = 'id';
        if (currentSortColumn === 'rate2023' && !show2023) currentSortColumn = 'id';
        if (currentSortColumn === 'rate2024' && !show2024) currentSortColumn = 'id';
        if (currentSortColumn === 'rate2025' && !show2025) currentSortColumn = 'id';
        if (currentSortColumn === 'rateExcelcare' && !showExcelcare) currentSortColumn = 'id';
        if (currentSortColumn === 'rateExcelcareCash' && !showExcelcareCash) currentSortColumn = 'id';
        if (currentSortColumn === 'rateExcelcare2024' && !showExcelcare2024) currentSortColumn = 'id';
        if (currentSortColumn === 'rate2026' && !show2026Master) currentSortColumn = 'id';
        if (currentSortColumn === 'rateHdfc' && !showHdfc) currentSortColumn = 'id';
        if (currentSortColumn === 'contractRate' && !showContract) currentSortColumn = 'id';

        filteredData = UNIFIED_TARIFFS.filter(item => {
            if (queryWords.length > 0) {
                const idString = item.id.toLowerCase();
                const nameString = item.name.toLowerCase();
                const aliasCodeString = (item.aliasCode || '').toLowerCase();
                const aliasNameString = (item.aliasName || '').toLowerCase();
                
                const matchesAllWords = queryWords.every(word => 
                    idString.includes(word) || 
                    nameString.includes(word) ||
                    aliasCodeString.includes(word) ||
                    aliasNameString.includes(word)
                );
                if (!matchesAllWords) return false;
            }

            // 1. Business Unit Filter
            if (bu !== 'all') {
                if (bu === 'international') {
                    const hasInternationalRate = item.rate2021 !== null || 
                                                 item.rate2023 !== null || 
                                                 item.rate2024 !== null || 
                                                 item.rate2025 !== null || 
                                                 (item.rate2026 && (item.rate2026.gipsa !== null || item.rate2026.tpa !== null));
                    if (!hasInternationalRate) return false;
                } else if (bu === 'excelcare') {
                    const hasExcelcareRate = item.rateExcelcare !== null || 
                                             item.rateExcelcare2024 !== null ||
                                             (mapHdfc[item.id] !== undefined && mapHdfc[item.id].length > 0);
                    if (!hasExcelcareRate) return false;
                } else if (bu === 'kolkata') {
                    const hasKolkataRate = item.rateKolkata !== null || (typeof TARIFF_KOLKATA_SOC !== 'undefined' && mapKolkata[item.id] !== undefined);
                    if (!hasKolkataRate) return false;
                }
            }

            // 2. Validation Source / Tariff Year Filter
            if (source !== 'all') {
                if (source === 'soc2025' && item.rate2025 === null) return false;
                if (source === 'soc2024' && item.rate2024 === null) return false;
                if (source === 'soc2023' && item.rate2023 === null) return false;
                if (source === 'soc2021' && item.rate2021 === null) return false;
                if (source === 'gipsa' && (!item.rate2026 || item.rate2026.gipsa === null)) return false;
                if (source === 'tpa' && (!item.rate2026 || item.rate2026.tpa === null)) return false;
                if (source === 'socexcelcare' && item.rateExcelcare === null) return false;
                if (source === 'socexcelcarecash' && item.rateExcelcareCash === null) return false;
                if (source === 'socexcelcare2024' && item.rateExcelcare2024 === null) return false;
                if (source === 'hdfcergo' && (!mapHdfc[item.id] || mapHdfc[item.id].length === 0)) return false;
                if (source === 'sockolkata' && item.rateKolkata === null) return false;
                if (source === 'pkgkolkata' && (typeof TARIFF_KOLKATA_PKG === 'undefined' || !TARIFF_KOLKATA_PKG.some(pkg => pkg.id === item.id))) return false;
            }

            // 3. Customer Agreement Filter
            if (customer !== 'all') {
                const ag = AGREEMENT_DETAILS.find(x => x.agreementName === customer);
                if (ag) {
                    const baseRate = getBaseRateForAgreement(item, ag);
                    if (baseRate === null) return false;
                }
            }

            // 4. Category Tab filter (from filter pills)
            switch (currentFilterCategory) {
                case 'soc2021':
                    return item.rate2021 !== null;
                case 'soc2023':
                    return item.rate2023 !== null;
                case 'soc2024':
                    return item.rate2024 !== null;
                case 'soc2025':
                    return item.rate2025 !== null;
                case 'socexcelcare':
                    return item.rateExcelcare !== null;
                case 'socexcelcarecash':
                    return item.rateExcelcareCash !== null;
                case 'socexcelcare2024':
                    return item.rateExcelcare2024 !== null;
                case 'hdfcergo':
                    return mapHdfc[item.id] !== undefined;
                case 'all':
                default:
                    return true;
            }
        });

        // Show/hide headers dynamically based on column visibility rules
        const th2021 = document.querySelector('th[data-sort="rate2021"]');
        const th2023 = document.querySelector('th[data-sort="rate2023"]');
        const th2024 = document.querySelector('th[data-sort="rate2024"]');
        const th2025 = document.querySelector('th[data-sort="rate2025"]');
        const thExcelcare = document.querySelector('th[data-sort="rateExcelcare"]');
        const thExcelcareCash = document.querySelector('th[data-sort="rateExcelcareCash"]');
        const thExcelcare2024 = document.querySelector('th[data-sort="rateExcelcare2024"]');
        const th2026Master = document.querySelector('th[data-sort="rate2026"]');
        const thHdfc = document.querySelector('th[data-sort="rateHdfc"]');
        const thContract = document.querySelector('th[data-sort="contractRate"]');

        if (th2021) th2021.style.display = show2021 ? '' : 'none';
        if (th2023) th2023.style.display = show2023 ? '' : 'none';
        if (th2024) th2024.style.display = show2024 ? '' : 'none';
        if (th2025) th2025.style.display = show2025 ? '' : 'none';
        if (thExcelcare) thExcelcare.style.display = showExcelcare ? '' : 'none';
        if (thExcelcareCash) thExcelcareCash.style.display = showExcelcareCash ? '' : 'none';
        if (thExcelcare2024) thExcelcare2024.style.display = showExcelcare2024 ? '' : 'none';
        if (th2026Master) th2026Master.style.display = show2026Master ? '' : 'none';
        if (thHdfc) thHdfc.style.display = showHdfc ? '' : 'none';
        if (thContract) thContract.style.display = showContract ? '' : 'none';

        // Save visibility flags globally so renderTable can access them
        window.activeColumnVisibility = {
            show2021, show2023, show2024, show2025, showExcelcare, showExcelcareCash, showExcelcare2024, show2026Master, showHdfc, showContract
        };

        sortData();
        renderTable();
        updateFilterBadges();
        updateSortHeadersUI();
    }

    // Sorting algorithm
    function sortData() {
        filteredData.sort((a, b) => {
            let valA, valB;
            switch (currentSortColumn) {
                case 'id':
                    valA = parseInt(a.id, 10);
                    valB = parseInt(b.id, 10);
                    if (isNaN(valA)) valA = a.id;
                    if (isNaN(valB)) valB = b.id;
                    break;
                case 'name':
                    valA = a.name || '';
                    valB = b.name || '';
                    break;
                case 'dept':
                    valA = a.dept || '';
                    valB = b.dept || '';
                    break;
                case 'rate2021':
                    valA = a.rate2021 !== null ? Number(a.rate2021) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rate2021 !== null ? Number(b.rate2021) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rate2023':
                    valA = a.rate2023 !== null ? Number(a.rate2023) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rate2023 !== null ? Number(b.rate2023) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rate2024':
                    valA = a.rate2024 !== null ? Number(a.rate2024) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rate2024 !== null ? Number(b.rate2024) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rate2025':
                    valA = a.rate2025 !== null ? Number(a.rate2025) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rate2025 !== null ? Number(b.rate2025) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rateExcelcare':
                    valA = a.rateExcelcare !== null ? Number(a.rateExcelcare) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rateExcelcare !== null ? Number(b.rateExcelcare) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rateExcelcareCash':
                    valA = a.rateExcelcareCash !== null ? Number(a.rateExcelcareCash) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rateExcelcareCash !== null ? Number(b.rateExcelcareCash) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rateExcelcare2024':
                    valA = a.rateExcelcare2024 !== null ? Number(a.rateExcelcare2024) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.rateExcelcare2024 !== null ? Number(b.rateExcelcare2024) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rate2026':
                    const r26A = a.rate2026 ? (a.rate2026.gipsa !== null ? a.rate2026.gipsa : a.rate2026.tpa) : null;
                    const r26B = b.rate2026 ? (b.rate2026.gipsa !== null ? b.rate2026.gipsa : b.rate2026.tpa) : null;
                    valA = r26A !== null ? Number(r26A) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = r26B !== null ? Number(r26B) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'rateHdfc':
                    const hA = mapHdfc[a.id] ? mapHdfc[a.id][0].rate : null;
                    const hB = mapHdfc[b.id] ? mapHdfc[b.id][0].rate : null;
                    valA = hA !== null ? Number(hA) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = hB !== null ? Number(hB) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'contractRate':
                    const selectedCustName = masterCustomerSelect.value;
                    const ag = (selectedCustName !== 'all') ? AGREEMENT_DETAILS.find(x => x.agreementName === selectedCustName) : null;
                    
                    const getContractVal = (item) => {
                        if (!ag) return null;
                        const base = getBaseRateForAgreement(item, ag);
                        if (base === null) return null;
                        const disc = parseAgreementDiscountForCategory(ag, item.dept.toLowerCase(), item.name.toUpperCase());
                        if (typeof base === 'object' && base.min !== undefined) {
                            return base.min * (1 - disc / 100);
                        }
                        return base * (1 - disc / 100);
                    };

                    const valRateA = getContractVal(a);
                    const valRateB = getContractVal(b);
                    
                    valA = valRateA !== null ? Number(valRateA) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = valRateB !== null ? Number(valRateB) : (currentSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                default:
                    valA = a.id;
                    valB = b.id;
            }
            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Dynamic Filter Badges
    function updateFilterBadges() {
        activeFiltersBadgesEl.innerHTML = '';
        const createBadge = (text) => {
            const badge = document.createElement('span');
            badge.className = 'active-filter-badge';
            badge.style.marginLeft = '0.5rem';
            badge.textContent = text;
            activeFiltersBadgesEl.appendChild(badge);
        };

        const bu = masterBuSelect.value;
        const source = masterSourceSelect.value;
        const customer = masterCustomerSelect.value;

        if (bu !== 'all') {
            createBadge(`Unit: ${bu.charAt(0).toUpperCase() + bu.slice(1)}`);
        }
        if (source !== 'all') {
            const sourceLabels = {
                'soc2025': '2025-26 SOC (Intl)',
                'soc2024': '2024-25 SOC (Intl)',
                'soc2023': '2023-24 SOC (Intl)',
                'soc2021': '2021-22 SOC (Intl)',
                'gipsa': '2026 GIPSA',
                'tpa': '2024 TPA Deluxe',
                'socexcelcare': '2025-26 SOC (Excelcare)',
                'socexcelcare2024': '2024-25 SOC (Excelcare)',
                'hdfcergo': '2024 HDFC ERGO'
            };
            createBadge(`Source: ${sourceLabels[source] || source}`);
        }
        if (customer !== 'all') {
            createBadge(`Customer: ${customer}`);
        }

        if (currentFilterCategory !== 'all') {
            const labelMap = {
                'soc2021': 'In 2021-22 SOC',
                'soc2023': 'In 2023-24 SOC',
                'soc2024': 'In 2024-25 SOC',
                'soc2025': 'In 2025-26 SOC',
                'socexcelcare': 'In Excelcare 2025',
                'socexcelcare2024': 'In Excelcare 2024',
                'hdfcergo': 'In HDFC ERGO 2024'
            };
            createBadge(labelMap[currentFilterCategory]);
        }
    }

    function formatCurrency(val) {
        if (val === null || val === undefined) return '<span class="rate-na">N/A</span>';
        return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatHdfcRange(id) {
        const rates = mapHdfc[id];
        if (!rates || rates.length === 0) return '<span class="rate-na">N/A</span>';
        const vals = rates.map(r => r.rate).filter(v => v !== null && v !== undefined);
        if (vals.length === 0) return '<span class="rate-na">N/A</span>';
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        if (min === max) return '₹' + min.toLocaleString('en-IN');
        return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
    }

    function formatMaster2026(item) {
        const r26 = item.rate2026;
        if (!r26 || (r26.gipsa === null && r26.tpa === null)) return '<span class="rate-na">N/A</span>';
        if (r26.gipsa !== null && r26.tpa !== null) {
            if (Number(r26.gipsa) === Number(r26.tpa)) return '₹' + Number(r26.gipsa).toLocaleString('en-IN');
            return `<div style="font-size:0.75rem; line-height:1.2;">G: ₹${Number(r26.gipsa).toLocaleString('en-IN')}<br>T: ₹${Number(r26.tpa).toLocaleString('en-IN')}</div>`;
        }
        if (r26.gipsa !== null) return `G: ₹${Number(r26.gipsa).toLocaleString('en-IN')}`;
        return `T: ₹${Number(r26.tpa).toLocaleString('en-IN')}`;
    }

    // Render Table row contents
    function renderTable() {
        resultsCountEl.textContent = filteredData.length.toLocaleString();
        if (totalCountEl) {
            totalCountEl.textContent = UNIFIED_TARIFFS.length.toLocaleString();
        }

        if (filteredData.length === 0) {
            tariffTbody.innerHTML = '';
            emptyState.style.display = 'flex';
            pageRangeDisplay.textContent = '0-0 of 0';
            paginationButtons.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / pageSize);
        
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRecords);

        pageRangeDisplay.textContent = `${startIndex + 1}-${endIndex} of ${totalRecords}`;
        const pageData = filteredData.slice(startIndex, endIndex);

        let html = '';
        const selectedCustName = masterCustomerSelect.value;
        const ag = (selectedCustName !== 'all') ? AGREEMENT_DETAILS.find(x => x.agreementName === selectedCustName) : null;

        const vis = window.activeColumnVisibility || {
            show2021: true, show2023: true, show2024: true, show2025: true, showExcelcare: true, showExcelcareCash: true, showExcelcare2024: true, show2026Master: true, showHdfc: true, showContract: true
        };

        pageData.forEach(item => {
            let contractRateHtml = '<span class="rate-na">—</span>';
            if (ag) {
                const baseRate = getBaseRateForAgreement(item, ag);
                if (baseRate === null) {
                    contractRateHtml = '<span class="rate-na">N/A</span>';
                } else {
                    const discount = parseAgreementDiscountForCategory(ag, item.dept.toLowerCase(), item.name.toUpperCase());
                    if (typeof baseRate === 'object' && baseRate.min !== undefined) {
                        const minContract = baseRate.min * (1 - discount / 100);
                        const maxContract = baseRate.max * (1 - discount / 100);
                        contractRateHtml = `<div style="font-size:0.8rem; line-height:1.2;">₹${Math.round(minContract).toLocaleString('en-IN')} - ₹${Math.round(maxContract).toLocaleString('en-IN')}<br><span style="font-size:0.7rem; color:var(--text-muted);">${discount}% disc</span></div>`;
                    } else {
                        const contractRate = baseRate * (1 - discount / 100);
                        contractRateHtml = `<div style="font-size:0.8rem; line-height:1.2;">₹${Math.round(contractRate).toLocaleString('en-IN')}<br><span style="font-size:0.7rem; color:var(--text-muted);">${discount}% disc</span></div>`;
                    }
                }
            }

            html += `
                <tr onclick="showDetails('${item.id}')" class="collapsed-card" id="tariff-row-${item.id}">
                    <td class="always-visible" data-label="ID"><span class="service-id">${item.id}</span></td>
                    <td class="always-visible" data-label="Description"><div class="service-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div></td>
                    <td class="always-visible" data-label="Department"><div class="dept-tag" title="${escapeHtml(item.dept)}">${escapeHtml(item.dept || 'Others')}</div></td>
                    <td data-label="2021 SOC" class="rate-cell" style="text-align: right; display: ${vis.show2021 ? '' : 'none'};">${formatCurrency(item.rate2021)}</td>
                    <td data-label="2023 SOC" class="rate-cell" style="text-align: right; display: ${vis.show2023 ? '' : 'none'};">${formatCurrency(item.rate2023)}</td>
                    <td data-label="2024 SOC" class="rate-cell" style="text-align: right; display: ${vis.show2024 ? '' : 'none'};">${formatCurrency(item.rate2024)}</td>
                    <td data-label="2025 SOC" class="rate-cell" style="text-align: right; display: ${vis.show2025 ? '' : 'none'};">${formatCurrency(item.rate2025)}</td>
                    <td data-label="Excelcare 2024" class="rate-cell" style="text-align: right; display: ${vis.showExcelcare2024 ? '' : 'none'};">${formatCurrency(item.rateExcelcare2024)}</td>
                    <td data-label="Excelcare 2025" class="rate-cell" style="text-align: right; display: ${vis.showExcelcare ? '' : 'none'};">${formatCurrency(item.rateExcelcare)}</td>
                    <td data-label="Excelcare 2026 - Cash" class="rate-cell" style="text-align: right; display: ${vis.showExcelcareCash ? '' : 'none'};">${formatCurrency(item.rateExcelcareCash)}</td>
                    <td data-label="2026 Master" class="rate-cell" style="text-align: right; display: ${vis.show2026Master ? '' : 'none'};">${formatMaster2026(item)}</td>
                    <td data-label="HDFC ERGO" class="rate-cell" style="text-align: right; font-size: 0.8rem; line-height: 1.2; display: ${vis.showHdfc ? '' : 'none'};">${formatHdfcRange(item.id)}</td>
                    <td data-label="Contract Rate" class="rate-cell" style="text-align: right; font-size: 0.85rem; display: ${vis.showContract ? '' : 'none'};">${contractRateHtml}</td>
                    <td class="action-cell always-visible">
                        <button class="view-btn" onclick="event.stopPropagation(); showDetails('${item.id}')">
                            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </td>
                    <td class="action-cell mobile-only-block" style="display: none;">
                        <button class="card-expand-toggle" onclick="event.stopPropagation(); window.toggleTariffCardExpand('${item.id}')">View Details</button>
                    </td>
                </tr>
            `;
        });
        tariffTbody.innerHTML = html;
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        paginationButtons.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
        prevBtn.addEventListener('click', () => {
            currentPage--;
            renderTable();
            document.querySelector('.table-wrapper').scrollTop = 0;
        });
        paginationButtons.appendChild(prevBtn);

        const pageNumbers = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            pageNumbers.push(1);
            if (currentPage > 3) pageNumbers.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pageNumbers.includes(i)) pageNumbers.push(i);
            }
            if (currentPage < totalPages - 2) pageNumbers.push('...');
            if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
        }

        pageNumbers.forEach(page => {
            if (page === '...') {
                const dot = document.createElement('span');
                dot.textContent = '...';
                dot.style.padding = '0 0.5rem';
                dot.style.color = 'var(--text-muted)';
                dot.style.fontWeight = '700';
                paginationButtons.appendChild(dot);
            } else {
                const btn = document.createElement('button');
                btn.className = `page-btn ${page === currentPage ? 'active' : ''}`;
                btn.textContent = page;
                btn.addEventListener('click', () => {
                    currentPage = page;
                    renderTable();
                    document.querySelector('.table-wrapper').scrollTop = 0;
                });
                paginationButtons.appendChild(btn);
            }
        });

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
        nextBtn.addEventListener('click', () => {
            currentPage++;
            renderTable();
            document.querySelector('.table-wrapper').scrollTop = 0;
        });
        paginationButtons.appendChild(nextBtn);
    }

    function generateRateEvolutionHTML(item) {
        const years = [
            { label: '2021-22 SOC', rate: item.rate2021 },
            { label: '2023-24 SOC', rate: item.rate2023 },
            { label: '2024-25 SOC', rate: item.rate2024 },
            { label: '2025-26 SOC (Intl)', rate: item.rate2025 },
            { label: '2024-25 SOC (Excelcare)', rate: item.rateExcelcare2024 },
            { label: '2025-26 SOC (Excelcare)', rate: item.rateExcelcare },
            { label: '2026 - Cash (Excelcare)', rate: item.rateExcelcareCash },
            { label: '2026 Master (GIPSA)', rate: item.rate2026 ? item.rate2026.gipsa : null },
            { label: '2026 Master (TPA)', rate: item.rate2026 ? item.rate2026.tpa : null }
        ].filter(y => y.rate !== null && y.rate !== undefined);

        if (years.length <= 1) {
            return `
                <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
                    <div class="modal-section-title" style="margin-bottom: 0.5rem;">Grouped Rate Evolution Timeline</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Insufficient historical SOC records to plot timeline.</div>
                </div>
            `;
        }

        let html = `
            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1.5rem;">
                <div class="modal-section-title" style="margin-bottom: 1rem;">Grouped Rate Evolution Timeline (YoY Trends)</div>
                <div style="display: flex; flex-direction: column; gap: 1.25rem; position: relative; padding-left: 1.5rem; margin-top: 0.5rem;">
                    <div style="position: absolute; left: 4px; top: 8px; bottom: 8px; width: 2px; background-color: var(--border);"></div>
        `;

        let lastRate = null;

        years.forEach((y, idx) => {
            let rateVal = Number(y.rate);
            let rateText = `₹${rateVal.toLocaleString('en-IN')}`;
            let changeText = '';
            let dotColor = 'var(--primary)';
            let dotBorder = 'var(--primary)';

            if (lastRate !== null && lastRate > 0) {
                const diffPct = ((rateVal - lastRate) / lastRate) * 100;
                if (Math.abs(diffPct) > 0.01) {
                    const formattedPct = Math.abs(diffPct).toFixed(1) + '%';
                    if (diffPct > 0) {
                        changeText = `<span style="color: var(--success); font-weight: 700; font-size: 0.75rem; margin-left: 0.5rem; display: inline-flex; align-items: center; gap: 0.15rem;">▲ +${formattedPct} YoY</span>`;
                    } else {
                        changeText = `<span style="color: var(--danger); font-weight: 700; font-size: 0.75rem; margin-left: 0.5rem; display: inline-flex; align-items: center; gap: 0.15rem;">▼ -${formattedPct} YoY</span>`;
                    }
                } else {
                    changeText = `<span style="color: var(--text-muted); font-size: 0.75rem; margin-left: 0.5rem;">0% YoY</span>`;
                }
            }
            lastRate = rateVal;

            html += `
                <div style="display: flex; align-items: center; position: relative;">
                    <div style="position: absolute; left: -24px; top: 5px; width: 10px; height: 10px; border-radius: 50%; background-color: ${dotColor}; border: 2px solid ${dotBorder}; box-shadow: 0 0 8px ${dotColor};"></div>
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; font-size: 0.85rem;">
                        <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(y.label)}</span>
                        <span style="font-family: 'Book Antiqua', serif; font-weight: 700; color: var(--text-main);">${rateText} ${changeText}</span>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        return html;
    }

    function formatKolkataRatesHTML(rateKolkata) {
        if (!rateKolkata) return '';
        let html = `
            <div class="modal-section">
                <div class="modal-section-title">Kolkata SOC Category-Specific Rates</div>
                <table class="summary-report-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; background-color: var(--bg-page); border-radius: 8px; border: 1px solid var(--border);">
                    <thead>
                        <tr style="background-color: var(--bg-hover);">
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.75rem; text-align: left;">Room Category</th>
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-size: 0.75rem;">Rate (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        for (const room in rateKolkata) {
            const val = rateKolkata[room];
            html += `
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem; text-align: left;">\${escapeHtml(room)}</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">₹\${Number(val).toLocaleString('en-IN')}</td>
                        </tr>
            `;
        }
        html += `
                    </tbody>
                </table>
            </div>
        `;
        return html;
    }

    // Modal popup details
    function showDetails(id) {
        const item = UNIFIED_TARIFFS.find(x => x.id === id);
        if (!item) return;

        document.getElementById('modal-title-id').textContent = `Service Details: Code #${item.id}`;

        const val2021 = item.rate2021;
        const val2023 = item.rate2023;
        const val2024 = item.rate2024;
        const val2025 = item.rate2025;
        const valExcelcare2024 = item.rateExcelcare2024;
        const valExcelcare = item.rateExcelcare;
        const valExcelcareCash = item.rateExcelcareCash;
        const val26G = item.rate2026 ? item.rate2026.gipsa : null;
        const val26T = item.rate2026 ? item.rate2026.tpa : null;
        const hdfcRates = getHdfcRatesForId(item.id);

        const formatRate = (val) => {
            if (val === null || val === undefined) return '<span class="rate-na">N/A</span>';
            return '₹' + Number(val).toLocaleString('en-IN');
        };

        const evolutionHtml = generateRateEvolutionHTML(item);

        modalContent.innerHTML = `
            <div class="modal-section">
                <div class="modal-section-title">Service Description</div>
                <div class="modal-name">${escapeHtml(item.name)}</div>
            </div>
            <div class="modal-section">
                <div class="modal-section-title">Department & Category</div>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Department</span>
                        <span class="meta-val">${escapeHtml(item.dept || 'Others')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Service Type</span>
                        <span class="meta-val">${escapeHtml(item.type || 'Others')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Alias Code</span>
                        <span class="meta-val">${escapeHtml(item.aliasCode || 'None')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Alias Name</span>
                        <span class="meta-val">${escapeHtml(item.aliasName || 'None')}</span>
                    </div>
                </div>
            </div>
            <div class="modal-section">
                <div class="modal-section-title">Comparative Rates Grid</div>
                <table class="summary-report-table" style="width:100%; border-collapse:collapse; margin-top:0.5rem; background-color: var(--bg-page); border-radius: 8px; border: 1px solid var(--border);">
                    <thead>
                        <tr style="background-color: var(--bg-hover);">
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.75rem;">Dataset / Tariff Year</th>
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-size: 0.75rem;">Rate (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2021-22 SOC</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val2021)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2023-24 SOC</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val2023)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2024-25 SOC</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val2024)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2025-26 SOC (International)</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val2025)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2024-25 SOC (Excelcare)</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(valExcelcare2024)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2025-26 SOC (Excelcare)</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(valExcelcare)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2026 - Cash (Excelcare)</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(valExcelcareCash)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.8rem;">2026 Master (GIPSA)</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val26G)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 2px solid var(--border); font-size: 0.8rem;">2026 Master (TPA)</td>
                            <td style="padding: 0.5rem; border-bottom: 2px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(val26T)}</td>
                        </tr>
                        <tr style="background-color: var(--bg-hover); font-weight: 700;">
                            <td colspan="2" style="padding: 0.4rem 0.5rem; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">HDFC ERGO Excelcare Templates (2024)</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); padding-left: 1.5rem; font-size: 0.8rem;">General / 4 Sharing</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(hdfcRates['Gen/4 Sharing'])}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); padding-left: 1.5rem; font-size: 0.8rem;">Twin sharing / 2 Sharing</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(hdfcRates['2 Sharing'])}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); padding-left: 1.5rem; font-size: 0.8rem;">Single / ICU / Executive</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(hdfcRates['Single/ICU/Executive'])}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); padding-left: 1.5rem; font-size: 0.8rem;">Suite</td>
                            <td style="padding: 0.5rem; border-bottom: 1px solid var(--border); text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(hdfcRates['Suite'])}</td>
                        </tr>
                        <tr>
                            <td style="padding: 0.5rem; padding-left: 1.5rem; font-size: 0.8rem;">Day Care</td>
                            <td style="padding: 0.5rem; text-align: right; font-family: monospace; font-size: 0.85rem; font-weight: 700;">${formatRate(hdfcRates['Daycare'])}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            ${evolutionHtml}
            ${formatKolkataRatesHTML(item.rateKolkata)}
        `;
        detailsModal.classList.add('show');
    }

    function getHdfcRatesForId(id) {
        const list = mapHdfc[id] || [];
        const rates = {
            'Gen/4 Sharing': null,
            '2 Sharing': null,
            'Single/ICU/Executive': null,
            'Suite': null,
            'Daycare': null
        };
        list.forEach(item => {
            const temp = item.template.toUpperCase();
            if (temp.includes('GEN/4 SHARING') || temp.includes('GEN/ 4 SHARING') || temp.includes('4 SHARING')) rates['Gen/4 Sharing'] = item.rate;
            else if (temp.includes('2 SHARING')) rates['2 Sharing'] = item.rate;
            else if (temp.includes('SINGLE/ ICU/EXECUTIVE') || temp.includes('SINGLE/ICU')) rates['Single/ICU/Executive'] = item.rate;
            else if (temp.includes('SUITE')) rates['Suite'] = item.rate;
            else if (temp.includes('DAYCARE') || temp.includes('DAY CARE')) rates['Daycare'] = item.rate;
        });
        return rates;
    }

    function closeModal() {
        detailsModal.classList.remove('show');
    }

    // Export current filtered master grid results as CSV
    function exportToCSV() {
        if (filteredData.length === 0) {
            alert('No records to export!');
            return;
        }
        let csvContent = '\uFEFF'; 
        const headers = [
            'Service ID', 'Description', 'Department', 'Service Type', 
            '2021-22 SOC', '2023-24 SOC', '2024-25 SOC', '2025-26 SOC International', '2024-25 SOC Excelcare', '2025-26 SOC Excelcare', '2026 - Cash Excelcare', 
            '2026 Master GIPSA', '2026 Master TPA', 
            'HDFC Gen/4 Sharing', 'HDFC 2 Sharing', 'HDFC Single/ICU/Exec', 'HDFC Suite', 'HDFC Daycare',
            'Alias Code', 'Alias Name', 'Contracted Customer', 'Contracted Rate'
        ];
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

        filteredData.forEach(item => {
            const hdfc = getHdfcRatesForId(item.id);
            
            let contractCust = 'None';
            let contractRate = 'N/A';
            const selectedCustName = masterCustomerSelect.value;
            if (selectedCustName !== 'all') {
                contractCust = selectedCustName;
                const ag = AGREEMENT_DETAILS.find(x => x.agreementName === selectedCustName);
                if (ag) {
                    const baseRate = getBaseRateForAgreement(item, ag);
                    if (baseRate !== null) {
                        const disc = parseAgreementDiscountForCategory(ag, item.dept.toLowerCase(), item.name.toUpperCase());
                        if (typeof baseRate === 'object' && baseRate.min !== undefined) {
                            contractRate = `${Math.round(baseRate.min * (1 - disc / 100))} - ${Math.round(baseRate.max * (1 - disc / 100))} (${disc}% disc)`;
                        } else {
                            contractRate = `${Math.round(baseRate * (1 - disc / 100))} (${disc}% disc)`;
                        }
                    }
                }
            }

            const row = [
                item.id,
                item.name || '',
                item.dept || '',
                item.type || '',
                item.rate2021 !== null ? item.rate2021 : 'N/A',
                item.rate2023 !== null ? item.rate2023 : 'N/A',
                item.rate2024 !== null ? item.rate2024 : 'N/A',
                item.rate2025 !== null ? item.rate2025 : 'N/A',
                item.rateExcelcare2024 !== null ? item.rateExcelcare2024 : 'N/A',
                item.rateExcelcare !== null ? item.rateExcelcare : 'N/A',
                item.rateExcelcareCash !== null ? item.rateExcelcareCash : 'N/A',
                item.rate2026 ? (item.rate2026.gipsa !== null ? item.rate2026.gipsa : 'N/A') : 'N/A',
                item.rate2026 ? (item.rate2026.tpa !== null ? item.rate2026.tpa : 'N/A') : 'N/A',
                hdfc['Gen/4 Sharing'] !== null ? hdfc['Gen/4 Sharing'] : 'N/A',
                hdfc['2 Sharing'] !== null ? hdfc['2 Sharing'] : 'N/A',
                hdfc['Single/ICU/Executive'] !== null ? hdfc['Single/ICU/Executive'] : 'N/A',
                hdfc['Suite'] !== null ? hdfc['Suite'] : 'N/A',
                hdfc['Daycare'] !== null ? hdfc['Daycare'] : 'N/A',
                item.aliasCode || '0',
                item.aliasName || '0',
                contractCust,
                contractRate
            ];
            csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
        });

        triggerDownload(csvContent, 'tariff_master_export.csv');
    }

    function triggerDownload(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* =========================================================================
       MM BILL AUDITOR LOGIC SECTION (EXCEL UPLOAD AND PARSING)
       ========================================================================= */

    // Setup drag-and-drop & file selection events
    function setupAuditEventListeners() {
        uploadDropzone.addEventListener('click', () => billFileInput.click());
        
        uploadDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropzone.style.borderColor = 'var(--primary)';
            uploadDropzone.style.backgroundColor = 'var(--bg-hover)';
        });

        uploadDropzone.addEventListener('dragleave', () => {
            uploadDropzone.style.borderColor = 'var(--border)';
            uploadDropzone.style.backgroundColor = 'transparent';
        });

        uploadDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropzone.style.borderColor = 'var(--border)';
            uploadDropzone.style.backgroundColor = 'transparent';
            if (e.dataTransfer.files.length > 0) {
                handleBillFilesSelected(e.dataTransfer.files);
            }
        });

        billFileInput.addEventListener('change', () => {
            if (billFileInput.files.length > 0) {
                handleBillFilesSelected(billFileInput.files);
            }
        });

        btnRemoveFile.addEventListener('click', () => {
            removeAllBillFiles();
        });

        btnRunAudit.addEventListener('click', () => {
            if (selectedBillFiles.length > 0) {
                runBillingAudit();
            }
        });

        // Business Unit selector change listener
        auditBuSelect.addEventListener('change', () => {
            updateValidationSourceOptions();
            populateRoomMappingSelects();
            if (typeof window.loadUnitCustomDiscounts === 'function') {
                window.loadUnitCustomDiscounts();
            }
        });

        if (auditTypeSelect) {
            auditTypeSelect.addEventListener('change', () => {
                localStorage.setItem('brc_v2_audit_type', auditTypeSelect.value);
            });
            const savedAuditType = localStorage.getItem('brc_v2_audit_type');
            if (savedAuditType) {
                auditTypeSelect.value = savedAuditType;
            }
        }

        // Validation Source Type selector change listener
        auditSourceTypeSelect.addEventListener('change', () => {
            updateValidationSourceOptions();
        });

        // Discount Master upload has been removed from UI

        // Tariff Mapping Method selector toggle
        auditMappingMethodSelect.addEventListener('change', (e) => {
            const method = e.target.value;
            const grid = document.getElementById('room-mapping-grid');
            if (method === 'room') {
                grid.style.display = 'flex';
            } else {
                grid.style.display = 'none';
            }
        });

        // Audit Search
        auditSearchInput.addEventListener('input', () => {
            auditSearchClearBtn.style.display = auditSearchInput.value.trim().length > 0 ? 'flex' : 'none';
            currentAuditPage = 1;
            applyAuditFiltersAndSort();
        });

        auditSearchClearBtn.addEventListener('click', () => {
            auditSearchInput.value = '';
            auditSearchClearBtn.style.display = 'none';
            currentAuditPage = 1;
            auditSearchInput.focus();
            applyAuditFiltersAndSort();
        });

        // Audit Dropdown filters
        auditStatusSelect.addEventListener('change', () => {
            currentAuditPage = 1;
            applyAuditFiltersAndSort();
        });

        auditRoomSelect.addEventListener('change', () => {
            currentAuditPage = 1;
            applyAuditFiltersAndSort();
        });

        if (auditCaseSelect) {
            auditCaseSelect.addEventListener('change', () => {
                currentAuditPage = 1;
                applyAuditFiltersAndSort();
            });
        }

        auditPageSizeSelect.addEventListener('change', () => {
            auditPageSize = parseInt(auditPageSizeSelect.value, 10);
            currentAuditPage = 1;
            renderAuditTable();
        });

        // Sorting for Audit columns
        document.querySelectorAll('th[data-asort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-asort');
                if (currentAuditSortColumn === column) {
                    currentAuditSortDirection = currentAuditSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    currentAuditSortColumn = column;
                    currentAuditSortDirection = 'asc';
                }
                updateAuditSortHeadersUI();
                sortAuditData();
                renderAuditTable();
            });
        });

        auditExportCsvBtn.addEventListener('click', exportAuditCSV);

        // Reports Panel Export Buttons
        const repExpDisc = document.getElementById('reports-export-discrepancies');
        const repExpFull = document.getElementById('reports-export-full');
        if (repExpDisc) {
            repExpDisc.addEventListener('click', exportAuditCSV);
        }
        if (repExpFull) {
            repExpFull.addEventListener('click', exportFullAuditCSV);
        }

        // Phase 2 Workflow and Role selector listeners
        const userRoleSelect = document.getElementById('user-role-select');
        if (userRoleSelect) {
            userRoleSelect.value = window.currentUserRole;
            userRoleSelect.addEventListener('change', (e) => {
                const targetRole = e.target.value;
                if (targetRole === window.previousUserRole) return;
                window.showRoleLoginModal(targetRole);
            });
        }

        // Role Switch Login Modal Logic
        const roleLoginModal = document.getElementById('role-login-modal');
        const roleLoginSubtitle = document.getElementById('role-login-subtitle');
        const rolePasswordInput = document.getElementById('role-password-input');
        const roleLoginError = document.getElementById('role-login-error');
        const btnSubmitRoleLogin = document.getElementById('btn-submit-role-login');
        const btnCancelRoleLogin = document.getElementById('btn-cancel-role-login');
        const closeRoleLoginModal = document.getElementById('close-role-login-modal');
        const toggleRolePassword = document.getElementById('toggle-role-password');

        window.showRoleLoginModal = function(targetRole) {
            window.pendingUserRoleChange = targetRole;
            roleLoginSubtitle.textContent = `Switching to ${targetRole} Mode`;
            
            const roleUsernameInput = document.getElementById('role-username-input');
            if (roleUsernameInput) {
                roleUsernameInput.value = '';
            }
            rolePasswordInput.value = '';
            roleLoginError.style.display = 'none';
            rolePasswordInput.type = 'password';
            
            // Render guidance matching target role
            const helpDiv = document.getElementById('role-login-accounts-help');
            if (helpDiv) {
                helpDiv.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem; line-height: 1.45;">
                    Please enter your registered BRC Guwahati credentials for <strong>${targetRole}</strong> access.
                </div>`;
            }

            roleLoginModal.classList.add('show');
            setTimeout(() => {
                if (roleUsernameInput) roleUsernameInput.focus();
                else rolePasswordInput.focus();
            }, 100);
        };

        function dismissRoleLogin() {
            roleLoginModal.classList.remove('show');
            if (userRoleSelect) {
                userRoleSelect.value = window.previousUserRole;
            }
            window.pendingUserRoleChange = null;
        }

        async function verifyRolePassword() {
            const roleUsernameInput = document.getElementById('role-username-input');
            const username = roleUsernameInput ? roleUsernameInput.value.trim() : '';
            const pwd = rolePasswordInput.value;
            const role = window.pendingUserRoleChange;
            
            if (!username) {
                alert('Please enter a username.');
                if (roleUsernameInput) roleUsernameInput.focus();
                return;
            }

            let isValid = false;
            let currentUnit = window.currentUserUnit || 'all';

            // Master Admin check
            const pwdHash = await sha256(pwd);
            if (username.toLowerCase() === 'admin' && pwdHash === '10846d83f5348390f15ec3367789410cd5a4e33b7a3fb5dc8676d2182b47705a') {
                if (role === 'Administrator') {
                    isValid = true;
                    currentUnit = 'all'; // Elevate/maintain global access
                }
            }
            
            // Standard registry check
            if (!isValid && window.userCredentials) {
                const getNormalizedRole = (r) => (r === 'Approver' || r === 'Approval') ? 'Approver' : r;
                const normTarget = getNormalizedRole(role);
                
                for (const u of window.userCredentials) {
                    const isPwdValid = await checkPassword(pwd, u.password);
                    if (u.username.toLowerCase() === username.toLowerCase() && 
                        isPwdValid && 
                        getNormalizedRole(u.role) === normTarget &&
                        u.unit === currentUnit) {
                        isValid = true;
                        break;
                    }
                }
            }

            if (isValid) {
                const updatedSession = {
                    username: username,
                    role: role,
                    unit: currentUnit
                };
                localStorage.setItem('brc_v2_logged_in_user', JSON.stringify(updatedSession));
                roleLoginModal.classList.remove('show');
                checkUserLoginState();
                if (typeof window.resetInactivityTimers === 'function') {
                    window.resetInactivityTimers();
                }
            } else {
                roleLoginError.style.display = 'block';
                rolePasswordInput.focus();
            }
        }

        if (btnCancelRoleLogin) btnCancelRoleLogin.addEventListener('click', dismissRoleLogin);
        if (closeRoleLoginModal) closeRoleLoginModal.addEventListener('click', dismissRoleLogin);
        if (btnSubmitRoleLogin) btnSubmitRoleLogin.addEventListener('click', verifyRolePassword);

        const roleUsernameInput = document.getElementById('role-username-input');
        if (roleUsernameInput) {
            roleUsernameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (rolePasswordInput) rolePasswordInput.focus();
                }
            });
        }

        if (rolePasswordInput) {
            rolePasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    verifyRolePassword();
                }
            });
        }

        if (toggleRolePassword) {
            toggleRolePassword.addEventListener('click', () => {
                if (rolePasswordInput.type === 'password') {
                    rolePasswordInput.type = 'text';
                } else {
                    rolePasswordInput.type = 'password';
                }
            });
        }
        
        const btnDownloadExcel = document.getElementById('btn-download-excel');
        if (btnDownloadExcel) {
            btnDownloadExcel.addEventListener('click', () => {
                exportAuditExcel();
            });
        }

        const btnValidate = document.getElementById('btn-validate-audit');
        if (btnValidate) {
            btnValidate.addEventListener('click', () => {
                window.validateAudit();
            });
        }
        
        const btnApprove = document.getElementById('btn-approve-audit');
        if (btnApprove) {
            btnApprove.addEventListener('click', () => {
                const isValid = window.validateAudit();
                if (isValid) {
                    showApprovalModal();
                } else {
                    alert('Approval Blocked: Please resolve alphanumeric/formatting errors displayed under the table first.');
                }
            });
        }
        
        const btnSave = document.getElementById('btn-save-audit');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const isValid = window.validateAudit();
                if (isValid) {
                    window.saveAudit();
                } else {
                    alert('Save Blocked: Please resolve alphanumeric/formatting errors displayed under the table first.');
                }
            });
        }

        // Close approval modal event listeners
        document.getElementById('close-approval-modal')?.addEventListener('click', closeApprovalModal);
        document.getElementById('btn-cancel-approval')?.addEventListener('click', closeApprovalModal);
        document.getElementById('btn-submit-approval')?.addEventListener('click', submitApproval);
    }

    function updateValidationSourceOptions() {
        const bu = auditBuSelect.value;
        const type = auditSourceTypeSelect.value;
        const sourceSelect = document.getElementById('audit-source-select');
        const currentSource = sourceSelect ? sourceSelect.value : '';
        
        sourceSelect.innerHTML = '';
        
        if (bu === 'international') {
            if (type === 'soc') {
                sourceSelect.innerHTML = `
                    <option value="2025">2025-26 SOC (International)</option>
                    <option value="2025_cash">2025-26 SOC - Cash (International)</option>
                    <option value="2026_cash">2026-27 SOC - Cash (International)</option>
                    <option value="2024" selected>2024-25 SOC (International)</option>
                    <option value="soc_2023_v2">SOC - 2023-24_V2 (International)</option>
                    <option value="2023">2023-24 SOC (International)</option>
                    <option value="2021">2021-22 SOC (International)</option>
                    <option value="soc_2021_iocl">SOC - 2021-22_IOCL (International)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            } else {
                sourceSelect.innerHTML = `
                    <option value="gipsa">2026 GIPSA Tariff Template</option>
                    <option value="tpa" selected>2024 TPA Deluxe Tariff Template</option>
                    <option value="hdfc_agreed_2026">HDFC ERGO Centrally Agreed (2026)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            }
        } else if (bu === 'kolkata') {
            if (type === 'soc') {
                sourceSelect.innerHTML = `
                    <option value="sockolkata" selected>2023-24 SOC (Kolkata)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            } else {
                sourceSelect.innerHTML = `
                    <option value="pkgkolkata" selected>2023-24 Packages (Kolkata)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            }
        } else {
            // excelcare
            if (type === 'soc') {
                sourceSelect.innerHTML = `
                    <option value="excelcare_2025" selected>2025-26 SOC (Excelcare)</option>
                    <option value="excelcare_cash_2025">2026 - Cash (Excelcare)</option>
                    <option value="excelcare_gipsa_2026">SOC - GIPSA 2026 (Excelcare)</option>
                    <option value="excelcare_2024">2024-25 SOC (Excelcare)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            } else {
                sourceSelect.innerHTML = `
                    <option value="excelcare_soc">Standard Excelcare SOC Template (Credit)</option>
                    <option value="excelcare_soc_cash">Standard Excelcare SOC Template (Cash)</option>
                    <option value="hdfc_single" selected>HDFC ERGO Single/ICU/Exec Template</option>
                    <option value="hdfc_gen">HDFC ERGO General/4 Sharing Template</option>
                    <option value="hdfc_twin">HDFC ERGO Twin/2 Sharing Template</option>
                    <option value="hdfc_suite">HDFC ERGO Suite Template</option>
                    <option value="hdfc_daycare">HDFC ERGO Daycare Template</option>
                    <option value="hdfc_agreed_2026">HDFC ERGO Centrally Agreed (2026)</option>
                    <option value="custom_ingested">Custom Ingested SOC (Session)</option>
                `;
            }
        }
        
        // Restore selected value if still exists in the new options list
        const optionExists = Array.from(sourceSelect.options).some(opt => opt.value === currentSource);
        if (optionExists && currentSource) {
            sourceSelect.value = currentSource;
        } else {
            // Otherwise fire change for default selected
            sourceSelect.dispatchEvent(new Event('change'));
        }
    }

    function populateRoomMappingSelects() {
        const bu = auditBuSelect.value;
        const selects = ['map-room-ward', 'map-room-semi', 'map-room-private', 'map-room-suite', 'map-room-daycare'];
        
        let html = '';
        if (bu === 'kolkata') {
            html = `
                <option value="sockolkata" selected>2023-24 SOC (Kolkata)</option>
                <option value="pkgkolkata">2023-24 Packages (Kolkata)</option>
            `;
        } else if (bu === 'international') {
            html = `
                <option value="gipsa">GIPSA Tariff (2026)</option>
                <option value="tpa">TPA Deluxe Tariff (2024)</option>
                <option value="soc_2025">2025-26 SOC (Intl)</option>
                <option value="soc_2024" selected>2024-25 SOC (Intl)</option>
                <option value="soc_2023">2023-24 SOC (Intl)</option>
                <option value="soc_2021">2021-22 SOC (Intl)</option>
            `;
        } else {
            html = `
                <option value="excelcare_soc">Standard Excelcare SOC 2025</option>
                <option value="excelcare_gipsa_2026">SOC - GIPSA 2026 (Excelcare)</option>
                <option value="excelcare_soc_2024">Standard Excelcare SOC 2024</option>
                <option value="hdfc_gen">HDFC ERGO General/4 Sharing</option>
                <option value="hdfc_twin">HDFC ERGO Twin/2 Sharing</option>
                <option value="hdfc_single" selected>HDFC ERGO Single/ICU/Exec</option>
                <option value="hdfc_suite">HDFC ERGO Suite</option>
                <option value="hdfc_daycare">HDFC ERGO Daycare</option>
            `;
        }
        
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = html;
            }
        });
    }

    function handleBillFilesSelected(filesList) {
        for (let i = 0; i < filesList.length; i++) {
            const file = filesList[i];
            const existingIdx = selectedBillFiles.findIndex(f => f.name === file.name);
            if (existingIdx !== -1) {
                selectedBillFiles[existingIdx] = file;
            } else {
                selectedBillFiles.push(file);
            }
        }
        
        // Auto-detect HDFC Ergo files to set validation source
        let detectedHdfc = false;
        let detectedUnit = null; // 'international' or 'excelcare'
        
        for (let i = 0; i < filesList.length; i++) {
            const nameUpper = filesList[i].name.toUpperCase();
            if (nameUpper.includes("HDFC") || nameUpper.includes("ERGO")) {
                detectedHdfc = true;
                if (nameUpper.includes("EXCEL") || nameUpper.includes("CARE")) {
                    detectedUnit = 'excelcare';
                } else if (nameUpper.includes("ASSAM") || nameUpper.includes("INT") || nameUpper.includes("GUWAHATI") || nameUpper.includes("INTERNATIONAL")) {
                    detectedUnit = 'international';
                }
            }
        }
        
        if (detectedHdfc) {
            const buSelect = document.getElementById('audit-bu-select');
            const typeSelect = document.getElementById('audit-source-type-select');
            
            let changed = false;
            
            if (detectedUnit && buSelect && buSelect.value !== detectedUnit) {
                buSelect.value = detectedUnit;
                changed = true;
            }
            
            if (typeSelect && typeSelect.value !== 'tpa') {
                typeSelect.value = 'tpa';
                changed = true;
            }
            
            // Re-populate the validation source select list based on unit and type
            if (typeof updateValidationSourceOptions === 'function') {
                updateValidationSourceOptions();
            }
            
            const sourceSelect = document.getElementById('audit-source-select');
            if (sourceSelect && sourceSelect.value !== 'hdfc_agreed_2026') {
                // Verify option exists, otherwise add it
                const optionExists = Array.from(sourceSelect.options).some(opt => opt.value === 'hdfc_agreed_2026');
                if (!optionExists) {
                    const opt = document.createElement('option');
                    opt.value = 'hdfc_agreed_2026';
                    opt.textContent = 'HDFC ERGO Centrally Agreed (2026)';
                    sourceSelect.appendChild(opt);
                }
                sourceSelect.value = 'hdfc_agreed_2026';
                changed = true;
            }
            
            if (changed && typeof showToast === 'function') {
                showToast(`Auto-configured audit validation source: HDFC ERGO Centrally Agreed (2026) for ${detectedUnit === 'international' ? 'International Unit' : 'Excelcare Unit'}.`, 'success');
            }
        }

        updateBillFilesUI();
    }

    function updateBillFilesUI() {
        if (selectedBillFiles.length === 0) {
            uploadDropzone.style.display = 'flex';
            fileMetaDisplay.style.display = 'none';
            btnRunAudit.disabled = true;
            const h3 = uploadDropzone.querySelector('h3');
            const p = uploadDropzone.querySelector('p');
            if (h3) h3.textContent = 'Select or Drag Customer Billing Files Here';
            if (p) p.textContent = 'Accepts multiple Excel workbooks (.xlsx). Processes all selected files in a single run.';
        } else {
            uploadDropzone.style.display = 'flex';
            fileMetaDisplay.style.display = 'flex';
            btnRunAudit.disabled = false;
            const h3 = uploadDropzone.querySelector('h3');
            const p = uploadDropzone.querySelector('p');
            if (h3) h3.textContent = 'Choose or Drag to Add/Replace Billing Files';
            if (p) p.textContent = 'Will add/replace logs in the active audit comparison.';
            
            metaFilename.textContent = `${selectedBillFiles.length} Billing File(s) Selected`;
            const totalSize = selectedBillFiles.reduce((acc, f) => acc + f.size, 0);
            const sizeKB = totalSize / 1024;
            if (sizeKB > 1024) {
                metaFilesize.textContent = (sizeKB / 1024).toFixed(2) + ' MB total';
            } else {
                metaFilesize.textContent = sizeKB.toFixed(1) + ' KB total';
            }
            
            let fileListContainer = document.getElementById('file-list-names');
            if (!fileListContainer) {
                fileListContainer = document.createElement('div');
                fileListContainer.id = 'file-list-names';
                fileListContainer.style.display = 'flex';
                fileListContainer.style.flexDirection = 'column';
                fileListContainer.style.gap = '0.2rem';
                fileListContainer.style.fontSize = '0.75rem';
                fileListContainer.style.color = 'var(--text-muted)';
                fileListContainer.style.textAlign = 'left';
                fileListContainer.style.maxHeight = '100px';
                fileListContainer.style.overflowY = 'auto';
                fileListContainer.style.width = '100%';
                fileListContainer.style.marginTop = '0.5rem';
                fileListContainer.style.borderTop = '1px solid var(--border)';
                fileListContainer.style.paddingTop = '0.5rem';
                fileMetaDisplay.appendChild(fileListContainer);
            }
            
            fileListContainer.innerHTML = '';
            selectedBillFiles.forEach((file, idx) => {
                const item = document.createElement('div');
                item.style.display = 'flex';
                item.style.justifyContent = 'space-between';
                item.style.alignItems = 'center';
                item.style.padding = '0.15rem 0';
                item.innerHTML = `
                    <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; color: var(--text-main);">${file.name}</span>
                    <span style="color: var(--danger); cursor: pointer; font-weight: 700; font-size: 1.1rem; padding: 0 0.5rem;" onclick="removeBillFileAt(${idx}); event.stopPropagation();">×</span>
                `;
                fileListContainer.appendChild(item);
            });
        }
    }

    function removeBillFileAt(idx) {
        selectedBillFiles.splice(idx, 1);
        updateBillFilesUI();
    }

    function removeAllBillFiles() {
        selectedBillFiles = [];
        billFileInput.value = '';
        updateBillFilesUI();
    }

    // Discount Master Excel upload functions removed as it's not required/included in UI

    // Map IOCL room category to the three categories in the DOCX tariff
    function mapIOCLRoomCategory(roomCat, cleanedRoom) {
        let u = roomCat ? roomCat.toUpperCase().trim() : "";
        if (!u && cleanedRoom) {
            if (cleanedRoom === "STANDARD WARD") return "GENERAL";
            if (cleanedRoom === "SEMI PRIVATE") return "SEMI CABIN/ NON AC CABIN";
            return "AC CABIN TO SUPER DELUXE AND CRITICAL CARE";
        }
        if (u.includes("GENERAL WARD") || u === "GENERAL" || u === "GENERAL WARD" || u === "AC GENERAL WARD" || u.includes("GENERAL")) {
            return "GENERAL";
        }
        if (u.includes("SEMI CABIN") || u.includes("SEMI-PRIVATE") || u.includes("SEMI PRIVATE") || u.includes("SEMI PRIVATE WARD") || u.includes("SEMI PRIVATE-AC") || u.includes("SEMI PRIVATE AC")) {
            return "SEMI CABIN/ NON AC CABIN";
        }
        return "AC CABIN TO SUPER DELUXE AND CRITICAL CARE";
    }

    // Clean room type string to match keys
    function cleanRoomCategory(cat) {
        if (!cat) return "STANDARD WARD";
        cat = cat.toUpperCase().trim();
        
        if (cat.includes("SUITE") || cat.includes("PLATINUM SUITE")) {
            return "SUITE";
        }
        if (cat.includes("4 SHARING") || cat.includes("4-SHARING") || cat.includes("GENERAL WARD") || cat.includes("WARD") || cat.includes("STANDARD WARD")) {
            return "STANDARD WARD";
        }
        if (cat.includes("2 SHARING") || cat.includes("2-SHARING") || cat.includes("TWIN") || cat.includes("DOUBLE BEDDED") || cat.includes("SEMI PRIVATE") || cat.includes("SEMI-PRIVATE") || cat.includes("DOUBLE BED")) {
            return "SEMI PRIVATE";
        }
        if (cat.includes("DELUXE")) {
            return "DELUXE";
        }
        if (cat.includes("SINGLE") || cat.includes("PRIVATE")) {
            return "SINGLE PRIVATE";
        }
        if (cat.includes("EXECUTIVE")) {
            return "EXECUTIVE";
        }
        if (cat.includes("CCU") || cat.includes("ICCU")) {
            return "ICCU";
        }
        if (cat.includes("NICU") || cat.includes("NEONATAL ICU")) {
            return "NEONATAL ICU";
        }
        if (cat.includes("PICU") || cat.includes("PEDIATRIC ICU")) {
            return "PICU";
        }
        if (cat.includes("SDU") || cat.includes("HDU") || cat.includes("STEP DOWN")) {
            return "HDU";
        }
        if (cat.includes("ICU") || cat.includes("INTENSIVE") || cat.includes("KTU")) {
            return "ICU";
        }
        if (cat.includes("DAYCARE") || cat.includes("DAY CARE")) {
            return "DAYCARE";
        }
        return cat;
    }

    function parseNumberCell(val) {
        if (val === undefined || val === null) return null;
        const str = String(val).trim();
        if (str === "" || str === "-" || str.toUpperCase() === "N/A" || str.toUpperCase() === "NULL") return null;
        const num = Number(str.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    // Helper to resolve active SOC array and map from tariffMapped string on agreement
    function getSOCFromTariffMapped(tariffMapped, customerName) {
        if (!tariffMapped) return { activeSOC: TARIFF_DATA, activeSOCMap: map2026 };
        const u = tariffMapped.toUpperCase();
        const custUpper = customerName ? customerName.toUpperCase() : "";
        
        if (u.includes("CUSTOM_INGESTED")) {
            const activeSOC = window.TARIFF_CUSTOM_INGESTED || [];
            const activeSOCMap = window.mapCustomIngested || {};
            return { activeSOC, activeSOCMap };
        }
        if (u.includes("HDFC_AGREED_2026")) {
            return { activeSOC: TARIFF_HDFC_ERGO_AGREED_2026, activeSOCMap: mapHdfcAgreed2026 };
        }
        if (custUpper.includes("IOCL") || u.includes("IOCL") || custUpper.includes("INDIAN OIL") || u.includes("INDIAN OIL")) {
            return { activeSOC: TARIFF_2021_IOCL, activeSOCMap: map2021_iocl };
        }
        if (u.includes("KOLKATA")) {
            return { activeSOC: TARIFF_KOLKATA_SOC, activeSOCMap: mapKolkata };
        }
        if (u.includes("EXCELCARE")) {
            if (u.includes("2024") || u.includes("24-25")) {
                return { activeSOC: TARIFF_EXCELCARE_2024, activeSOCMap: mapExcelcare2024 };
            }
            if (u.includes("CASH")) {
                return { activeSOC: TARIFF_EXCELCARE_CASH_2025, activeSOCMap: mapExcelcareCash };
            }
            if (u.includes("GIPSA")) {
                return { activeSOC: TARIFF_EXCELCARE_GIPSA_2026, activeSOCMap: mapExcelcareGipsa2026 };
            }
            return { activeSOC: TARIFF_EXCELCARE_2025, activeSOCMap: mapExcelcare };
        }
        if (u.includes("2025")) {
            return { activeSOC: TARIFF_2025, activeSOCMap: map2025 };
        }
        if (u.includes("2024")) {
            return { activeSOC: TARIFF_2024, activeSOCMap: map2024 };
        }
        if (u.includes("2023")) {
            if (u.includes("V2") || u.includes("2023-24 V2")) {
                return { activeSOC: TARIFF_2023_V2, activeSOCMap: map2023_v2 };
            }
            return { activeSOC: TARIFF_2023, activeSOCMap: map2023 };
        }
        if (u.includes("2021")) {
            return { activeSOC: TARIFF_2021, activeSOCMap: map2021 };
        }
        return { activeSOC: TARIFF_DATA, activeSOCMap: map2026 };
    }

    // Helper to find matching agreement (scoped by business unit to prevent cross-unit matching)
    function findMatchingAgreement(customerStr, targetUnit) {
        if (!customerStr || typeof AGREEMENT_DETAILS === 'undefined' || !AGREEMENT_DETAILS.length) return null;
        
        const unit = targetUnit || document.getElementById('audit-bu-select')?.value || 'excelcare';
        const filteredAgreements = AGREEMENT_DETAILS.filter(ag => {
            const scope = getAgreementScope(ag);
            if (unit === 'kolkata') {
                return scope === 'kolkata';
            } else if (unit === 'excelcare') {
                return scope === 'excelcare';
            } else if (unit === 'international') {
                return scope === 'international' || scope === 'centralised';
            }
            return true;
        });

        let cleanCustomer = customerStr.toUpperCase().replace(/[.,()\-]/g, ' ');
        cleanCustomer = cleanCustomer.replace(/\bALLIANCE\b/g, 'ALLIANZ');
        if (cleanCustomer.includes("INDIAN OIL") || cleanCustomer.includes("INDIAN OIL CORPORATION")) {
            cleanCustomer += " IOCL";
        }
        
        const stopwords = [
            "LTD", "PVT", "LIMITED", "PRIVATE", "AGREEMENT", "COMPANY", "INSURANCE", 
            "GENERAL", "HEALTH", "TPA", "SERVICES", "INDIA", "CORP", "CORPORATION", 
            "OF", "AND", "THE", "FOR", "IN", "CO", "ASSOCIATES", "PLANTATIONS", 
            "NATIONAL", "STATE", "CENTRAL", "MUTUAL", "TRUST", "GOVT", "GOVERNMENT", 
            "GROUP", "SYSTEMS", "ENTERPRISES", "PARTNERS", "AHC", "BENEFICIARY", "CARD"
        ];
        
        const customerWords = cleanCustomer.split(/\s+/).map(w => w.trim()).filter(w => {
            return w.length > 2 && !stopwords.includes(w);
        });

        if (customerWords.length === 0) {
            const custUpper = customerStr.toUpperCase().trim();
            for (const ag of filteredAgreements) {
                if (custUpper === ag.agreementName.toUpperCase().trim()) {
                    return ag;
                }
            }
            return null;
        }

        let bestAg = null;
        let maxScore = 0;
        let bestAgLengthRatio = 0;

        for (const ag of filteredAgreements) {
            const agName = ag.agreementName.toUpperCase();
            if (agName.trim() === customerStr.toUpperCase().trim()) {
                return ag;
            }
            
            let cleanAgName = agName.replace(/[.,()\-]/g, ' ');
            cleanAgName = cleanAgName.replace(/\bALLIANCE\b/g, 'ALLIANZ');
            
            const agWords = cleanAgName.split(/\s+/).map(w => w.trim()).filter(w => {
                return w.length > 2 && !stopwords.includes(w);
            });
            
            if (agWords.length === 0) continue;
            
            let matches = 0;
            for (const w of agWords) {
                if (customerWords.includes(w)) {
                    matches++;
                }
            }
            
            if (matches > 0) {
                const score = matches;
                const ratio = matches / agWords.length;
                if (score > maxScore) {
                    maxScore = score;
                    bestAg = ag;
                    bestAgLengthRatio = ratio;
                } else if (score === maxScore) {
                    if (ratio > bestAgLengthRatio) {
                        bestAg = ag;
                        bestAgLengthRatio = ratio;
                    }
                }
            }
        }
        
        return bestAg;
    }

    function getHdfcErgoTemplateName(cleanedRoom, isDayCare) {
        if (isDayCare) {
            return "HDFC ERGO EXCELCARE DAYCARE TARIFF 2024";
        }
        switch (cleanedRoom) {
            case "STANDARD WARD":
                return "HDFC ERGO EXCELCARE GEN/4 SHARING TARIFF 2024";
            case "SEMI PRIVATE":
                return "HDFC ERGO EXCELCARE 2 SHARING TARIFF 2024";
            case "SUITE":
                return "HDFC ERGO EXCELCARE SUITE TARIFF 2024";
            case "SINGLE PRIVATE":
            case "ICU":
            case "EXECUTIVE":
            default:
                return "HDFC ERGO EXCELCARE SINGLE/ ICU/EXECUTIVE TARIFF 2024";
        }
    }

    function getHdfcTemplateNameFromValue(val) {
        switch(val) {
            case "hdfc_gen":
                return "HDFC ERGO EXCELCARE GEN/4 SHARING TARIFF 2024";
            case "hdfc_twin":
                return "HDFC ERGO EXCELCARE 2 SHARING TARIFF 2024";
            case "hdfc_single":
                return "HDFC ERGO EXCELCARE SINGLE/ ICU/EXECUTIVE TARIFF 2024";
            case "hdfc_suite":
                return "HDFC ERGO EXCELCARE SUITE TARIFF 2024";
            case "hdfc_daycare":
                return "HDFC ERGO EXCELCARE DAYCARE TARIFF 2024";
            default:
                return "HDFC ERGO EXCELCARE SINGLE/ ICU/EXECUTIVE TARIFF 2024";
        }
    }

    function getRoomWiseMappedTemplate(cleanedRoom, isDayCare) {
        if (isDayCare) {
            return document.getElementById('map-room-daycare').value;
        }
        switch(cleanedRoom) {
            case "STANDARD WARD":
                return document.getElementById('map-room-ward').value;
            case "SEMI PRIVATE":
                return document.getElementById('map-room-semi').value;
            case "SUITE":
                return document.getElementById('map-room-suite').value;
            case "SINGLE PRIVATE":
            case "EXECUTIVE":
            case "ICU":
            case "ICCU":
            case "HDU":
            case "NEONATAL ICU":
            case "PICU":
            default:
                return document.getElementById('map-room-private').value;
        }
    }

    function serializeRows(rows) {
        return rows.map(r => r.map(val => {
            if (val === null || val === undefined) return '';
            return String(val).replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n');
        }).join('\t')).join('\n');
    }

    function deserializeRows(str) {
        if (!str) return [];
        return str.split('\n').map(line => line.split('\t').map(val => {
            const unescaped = val.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
            if (unescaped === '') return null;
            if (unescaped === 'true') return true;
            if (unescaped === 'false') return false;
            if (!isNaN(unescaped) && unescaped !== '') {
                return Number(unescaped);
            }
            return unescaped;
        }));
    }

    function getSavedRecordRows(record) {
        if (!record || !record.rows) return [];
        let rawRows = record.rows;
        if (typeof rawRows === 'string') {
            rawRows = deserializeRows(rawRows);
        }
        return rawRows.map(arr => {
            if (Array.isArray(arr)) {
                const r = {
                    patientName: arr[0],
                    ipNo: arr[1],
                    billNo: arr[2],
                    serviceId: arr[3],
                    serviceName: arr[4],
                    dept: arr[5],
                    roomCategory: arr[6],
                    rateType: arr[7],
                    customer: arr[8],
                    doctor: arr[9],
                    billedRatePreDiscount: arr[10],
                    billedRate: arr[11],
                    expectedTariff: arr[12],
                    discountApplied: arr[13],
                    userRemarks: arr[14],
                    fileName: arr[15],
                    isIgnored: arr[16],
                    isManuallyOverridden: arr[17] || false
                };
                
                // Recalculate computed fields on the fly
                const expectedDiscounted = r.expectedTariff !== null ? r.expectedTariff * (1 - (r.discountApplied || 0) / 100) : null;
                r.expectedDiscountedRate = expectedDiscounted;
                r.diff = r.expectedDiscountedRate !== null ? (r.billedRate - r.expectedDiscountedRate) : 0;
                
                r.status = "Matching";
                r.explanation = "";
                
                const excludeZero = document.getElementById('chk-exclude-zero') ? document.getElementById('chk-exclude-zero').checked : true;
                if (r.isIgnored) {
                    const nameUpper = (r.serviceName || '').toUpperCase();
                    const deptLower = (r.dept || '').toLowerCase();
                    const rateTypeLower = (r.rateType || '').toLowerCase();
                    
                    if (deptLower === 'consumables' || nameUpper.includes('CONSUMABLE') || deptLower.includes('material') || nameUpper.includes('CONSU:') || nameUpper.includes('PULSE GENERATOR') || nameUpper.includes('PPI') || nameUpper.includes('PACEMAKER') || nameUpper.includes('IMPLANT') || nameUpper.includes('STENT') || nameUpper.includes('BALLOON') || nameUpper.includes('CATHETER') || nameUpper.includes('GUIDEWIRE')) {
                        r.status = "Ignored (Consumables)";
                        r.explanation = "Consumables are excluded from checking.";
                    } else if (deptLower.includes('pharmacy') || nameUpper.includes('HSN:') || nameUpper.includes('PHARMACY') || deptLower.includes('drug')) {
                        r.status = "Ignored (Pharmacy)";
                        r.explanation = "Pharmacy services are excluded from checking.";
                    } else if (rateTypeLower.includes('inside package') || nameUpper.includes('INSIDE PACKAGE') || nameUpper.includes('PACKAGE') || nameUpper.includes('(GIPSA)') || nameUpper.includes('(STAR HEALTH)') || nameUpper.includes('-STAR HEALTH') || nameUpper.includes('TONSILLECTOMY') || nameUpper.includes('LSCS')) {
                        r.status = "Ignored (Inside Package)";
                        r.explanation = "Package items are bundled; ignore rate checks.";
                    } else {
                        r.status = "Ignored (editable)";
                        r.explanation = "Editable rate item; ignore checks.";
                    }
                } else if (excludeZero && r.billedRate === 0) {
                    r.status = "Ignored (Zero Rated)";
                    r.explanation = "Zero rated service items are excluded from checking.";
                    r.isIgnored = true;
                    r.diff = null;
                } else if (r.expectedTariff === null) {
                    r.status = "Not Found in Master";
                    r.explanation = "No matching service code or SOC rate found in contract master.";
                } else {
                    const diffVal = r.diff;
                    if (Math.abs(diffVal) < 0.1) {
                        r.status = "Matching";
                    } else if (Math.abs(diffVal) <= 1) {
                        r.status = "Round Off Difference";
                        r.explanation = "Minor rate difference (within ±₹1).";
                    } else if (diffVal > 0) {
                        r.status = "Overcharged";
                        if (r.billedRate === r.expectedTariff && r.discountApplied > 0) {
                            r.explanation = `Billed at full rate (₹${r.expectedTariff}) without contract discount (${r.discountApplied}%) expected ₹${expectedDiscounted}.`;
                        } else {
                            r.explanation = `Billed rate ₹${r.billedRate} is higher than contract rate ₹${expectedDiscounted} (Tariff ₹${r.expectedTariff} less ${r.discountApplied}% discount).`;
                        }
                    } else {
                        r.status = "Undercharged";
                        r.explanation = `Billed rate ₹${r.billedRate} is lower than contract rate ₹${expectedDiscounted} (Tariff ₹${r.expectedTariff} less ${r.discountApplied}% discount).`;
                    }
                }
                r.uid = 'row_' + Math.random().toString(36).substr(2, 9);
                return r;
            } else {
                return arr;
            }
        });
    }

    function getDiscountCategory(deptLower, nameUpper) {
        if (deptLower === 'consumables' || nameUpper.includes('CONSUMABLE') || deptLower.includes('material')) {
            return "Pharmacy"; // or Consumables
        }
        if (deptLower.includes('laboratory') || deptLower.includes('pathology') || deptLower.includes('microbiology') || deptLower.includes('biochemistry') || deptLower.includes('bio-chemistry') || deptLower.includes('bio chemistry') || deptLower.includes('biochem') || deptLower.includes('hematology') || deptLower.includes('lab') || deptLower.includes('path') || deptLower.includes('investigation') || deptLower.includes('inv')) {
            return "Lab";
        }
        if (deptLower.includes('radiology') || deptLower.includes('imaging') || deptLower.includes('scan') || deptLower.includes('ultrasound') || deptLower.includes('usg') || deptLower.includes('mri') || deptLower.includes('ct ') || deptLower.includes('ct-') || deptLower.includes('x-ray') || deptLower.includes('xray')) {
            return "Radiology";
        }
        if (deptLower.includes('pharmacy') || nameUpper.includes('HSN:') || nameUpper.includes('PHARMACY') || deptLower.includes('drug')) {
            return "Pharmacy";
        }
        if (deptLower.includes('bed') || deptLower.includes('room') || deptLower.includes('ward') || deptLower.includes('nursing') || deptLower.includes('monitoring')) {
            return "Room";
        }
        if (deptLower.includes('visit') || nameUpper.includes('VISIT') || nameUpper.includes('CONSULTATION') || deptLower.includes('consultation')) {
            return "Consultations";
        }
        if (deptLower.includes('procedure') || deptLower.includes('ot') || deptLower.includes('surgery') || deptLower.includes('operation') || deptLower.includes('anesthesia')) {
            return "Procedures";
        }
        return "Others";
    }

    function getManualDiscountForCategory(serviceCat) {
        if (serviceCat === "Room") return Number(document.getElementById('disc-room').value) || 0;
        if (serviceCat === "Lab") return Number(document.getElementById('disc-investigations').value) || 0;
        if (serviceCat === "Radiology") return Number(document.getElementById('disc-investigations').value) || 0;
        if (serviceCat === "Consultations") return Number(document.getElementById('disc-consultations').value) || 0;
        if (serviceCat === "Procedures") return Number(document.getElementById('disc-procedures').value) || 0;
        return 0;
    }

    function parseAgreementDiscountForCategory(ag, deptLower, nameUpper) {
        if (!ag) return 0;
        const isKolkata = (ag.locations && ag.locations.includes("Kolkata")) || (ag.tariffMapped && ag.tariffMapped.toUpperCase().includes("KOLKATA"));
        if (isKolkata) {
            if (deptLower.includes("health check") || deptLower.includes("ahc") || nameUpper.includes("HEALTH CHECK") || nameUpper.includes("AHC") || deptLower.includes("package")) {
                return 20;
            }
            const serviceCat = getDiscountCategory(deptLower, nameUpper);
            if (
                serviceCat === "Room" || 
                serviceCat === "Procedures" || 
                serviceCat === "Lab" || 
                serviceCat === "Radiology" ||
                deptLower.includes("nursing") ||
                deptLower.includes("room rent") ||
                deptLower.includes("operation theatre") ||
                deptLower.includes("investigation")
            ) {
                return 12;
            }
            return 0;
        }

        if (!ag.discountAgreed) return 0;
        const discStr = ag.discountAgreed.toUpperCase();
        const serviceCat = getDiscountCategory(deptLower, nameUpper);
        
        if (serviceCat === "Room") {
            if (discStr.includes("BED") || discStr.includes("ROOM") || discStr.includes("NURS")) {
                const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:ALL\s*)?(?:BED|ROOM|NURS)/);
                if (match) return Number(match[1]);
            }
        }
        if (serviceCat === "Lab") {
            if (discStr.includes("LAB") || discStr.includes("INVESTIGATION")) {
                const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:INHOUSE\s*)?(?:LAB|INVESTIGATION)/);
                if (match) return Number(match[1]);
            }
        }
        if (serviceCat === "Radiology") {
            if (discStr.includes("RAD") || discStr.includes("INVESTIGATION") || discStr.includes("X-RAY")) {
                const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:INHOUSE\s*)?(?:RAD|INVESTIGATION|X-RAY)/);
                if (match) return Number(match[1]);
            }
        }
        if (serviceCat === "Procedures") {
            if (discStr.includes("PROC") || discStr.includes("OT") || discStr.includes("SURG") || discStr.includes("FEES")) {
                const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:PROC|OT|SURG|FEES)/);
                if (match) return Number(match[1]);
            }
        }
        
        const matchAll = discStr.match(/(?:DISCOUNT|LESS)\s*-?\s*(\d+)\s*%/);
        if (matchAll) return Number(matchAll[1]);
        return 0;
    }
    const detailedToSimpleMap = {
        "GENERAL WARD": "STANDARD WARD",
        "AC GENERAL WARD": "STANDARD WARD",
        "NON AC SEMI CABIN": "SEMI PRIVATE",
        "AC SEMI CABIN": "SEMI PRIVATE",
        "AC CABIN": "SINGLE PRIVATE",
        "PRIVATE CABIN (NON AC)": "SINGLE PRIVATE",
        "DELUXE CABIN": "DELUXE",
        "SUPER DELUXE": "DELUXE",
        "CRITICAL CARE UNIT": "ICU",
        "NICU/PICU": "NEONATAL ICU",
        "STEP DOWN ICU": "HDU",
        "CTVS ICU": "ICU",
        "NEURO ICU": "ICU",
        "CORONARY CARE UNIT (HCC)": "ICCU",
        "CATH RECOVERY": "ICCU",
        "CRITICAL CARE ISOLATION (ICU)": "ICU",
        "EMERGENCY WARD": "STANDARD WARD",
        "MOTHER OCCUPIED": "STANDARD WARD",
        "NURSERY CARE": "NEONATAL ICU",
        "DAYCARE": "DAYCARE"
    };

    function toSimpleRoom(roomKey) {
        if (!roomKey) return "STANDARD WARD";
        const upperKey = roomKey.toUpperCase().trim();
        return detailedToSimpleMap[upperKey] || upperKey;
    }

    const simpleToDetailedMap = {
        "STANDARD WARD": "GENERAL WARD",
        "DELUXE": "DELUXE CABIN",
        "ICU": "CRITICAL CARE UNIT",
        "NICU": "NICU/PICU",
        "HDU": "STEP DOWN ICU",
        "ICCU": "CORONARY CARE UNIT (HCC)"
    };

    function toDetailedRoom(roomKey) {
        if (!roomKey) return "GENERAL WARD";
        const upperKey = roomKey.toUpperCase().trim();
        return simpleToDetailedMap[upperKey] || upperKey;
    }

    function lookupExcelcareRoomRent(cleanedRoom, activeSourceVal) {
        const ratesGipsa2026 = {
            "SUITE": 14250,
            "SUITE ROOM": 14250,
            "EXECUTIVE": 8550,
            "EXECUTIVE ROOM": 8550,
            "SINGLE PRIVATE": 7125,
            "SINGLE ROOM": 7125,
            "SEMI PRIVATE": 5225,
            "2 BEDDED ROOM": 5225,
            "STANDARD WARD": 2755,
            "4 BEDDED ROOM": 2755,
            "GENERAL WARD": 2755,
            "ICU": 8075,
            "ICCU": 8075,
            "CCU": 8075,
            "KTU- INTENSIVE CARE UNIT": 8075,
            "KTU INTENSIVE CARE UNIT": 8075,
            "CTVS ICU": 8075,
            "CARDIAC SDU": 5225,
            "CTVS SDU": 5225,
            "HDU": 5225,
            "NICU": 4560,
            "PICU": 4560,
            "DAYCARE": 332.5
        };
        const rates2025 = {
            "SUITE": 13500,
            "EXECUTIVE": 7800,
            "SINGLE PRIVATE": 6800,
            "SEMI PRIVATE": 3400,
            "STANDARD WARD": 1600,
            "ICU": 7200,
            "ICCU": 6800,
            "HDU": 4400,
            "NEONATAL ICU": 3700,
            "PICU": 3700,
            "DAYCARE": 1600
        };
        const rates2024 = {
            "SUITE": 12700,
            "EXECUTIVE": 7400,
            "SINGLE PRIVATE": 6400,
            "SEMI PRIVATE": 3200,
            "STANDARD WARD": 1500,
            "ICU": 6800,
            "ICCU": 6400,
            "HDU": 4150,
            "NEONATAL ICU": 3500,
            "PICU": 3500,
            "DAYCARE": 1500
        };
        const is2024 = (activeSourceVal === "excelcare_2024" || activeSourceVal === "socexcelcare2024" || activeSourceVal === "excelcare_soc_2024");
        const isGipsa26 = (activeSourceVal === "excelcare_gipsa_2026");
        const rates = isGipsa26 ? ratesGipsa2026 : (is2024 ? rates2024 : rates2025);
        const simpleRoom = toSimpleRoom(cleanedRoom);
        if (rates[cleanedRoom] !== undefined) return rates[cleanedRoom];
        if (rates[simpleRoom] !== undefined) return rates[simpleRoom];
        return isGipsa26 ? 7125 : (is2024 ? 1500 : 1600);
    }

    function lookupExcelcareNursing(cleanedRoom, activeSourceVal) {
        const ratesGipsa2026 = {
            "SUITE": 1400,
            "SUITE ROOM": 1400,
            "EXECUTIVE": 1300,
            "EXECUTIVE ROOM": 1300,
            "SINGLE PRIVATE": 1200,
            "SINGLE ROOM": 1200,
            "SEMI PRIVATE": 1100,
            "2 BEDDED ROOM": 1100,
            "STANDARD WARD": 1000,
            "4 BEDDED ROOM": 1000,
            "GENERAL WARD": 1000,
            "ICU": 1500,
            "ICCU": 1500,
            "HDU": 1500,
            "SDU": 1500,
            "NICU": 1500,
            "PICU": 1500,
            "DAYCARE": 500
        };
        const ratesStandard = {
            "SUITE": 2000,
            "EXECUTIVE": 1500,
            "SINGLE PRIVATE": 1000,
            "SEMI PRIVATE": 750,
            "STANDARD WARD": 500,
            "ICU": 1000,
            "ICCU": 1000,
            "HDU": 1000,
            "NEONATAL ICU": 1000,
            "PICU": 1000,
            "DAYCARE": 500
        };
        const isGipsa26 = (activeSourceVal === "excelcare_gipsa_2026");
        const rates = isGipsa26 ? ratesGipsa2026 : ratesStandard;
        const simpleRoom = toSimpleRoom(cleanedRoom);
        return rates[cleanedRoom] !== undefined ? rates[cleanedRoom] : (rates[simpleRoom] !== undefined ? rates[simpleRoom] : (isGipsa26 ? 1200 : 500));
    }

    const ROOM_RENT_2025 = {
        "STANDARD WARD": 1600,
        "SEMI PRIVATE": 2800,
        "SINGLE PRIVATE": 3650,
        "DELUXE": 5900,
        "SUITE": 13500,
        "ICU": 8500,
        "ICCU": 8500,
        "HDU": 4200,
        "NICU": 3300,
        "PICU": 3300,
        "DAYCARE": 2100
    };

    const ROOM_RENT_2024 = {
        // Detailed Bed Categories from SOC 2024-25
        "GENERAL WARD": 1200,
        "AC GENERAL WARD": 1500,
        "NON AC SEMI CABIN": 1800,
        "AC SEMI CABIN": 2600,
        "AC CABIN": 3400,
        "PRIVATE CABIN (NON AC)": 2700,
        "DELUXE CABIN": 5500,
        "SUPER DELUXE": 7000,
        "CRITICAL CARE UNIT": 6700,
        "NICU/PICU": 3100,
        "STEP DOWN ICU": 3800,
        "CTVS ICU": 6600,
        "NEURO ICU": 6700,
        "CORONARY CARE UNIT (HCC)": 4700,
        "CATH RECOVERY": 4700,
        "CRITICAL CARE ISOLATION (ICU)": 7500,
        "EMERGENCY WARD": 3400,
        "MOTHER OCCUPIED": 1200,
        "NURSERY CARE": 1000,
        "DAY CARE 0 TO 1 HOUR": 300,
        "DAY CARE 1 TO 2 HOURS": 600,
        "DAY CARE 2 TO 3 HOURS": 900,
        "DAY CARE 3 TO 4 HOURS": 1200,
        "DAY CARE 4 TO 5 HOURS": 1500,
        "DAY CARE 5 TO 6 HOURS": 1800,
        "DAY CARE 5 TO 24 HOURS": 2100,
        
        // Standard simplified fallbacks
        "STANDARD WARD": 1200,
        "SEMI PRIVATE": 2600,
        "SINGLE PRIVATE": 3400,
        "DELUXE": 5500,
        "SUITE": 13500,
        "ICU": 6700,
        "ICCU": 6700,
        "HDU": 3800,
        "NICU": 3100,
        "PICU": 3100,
        "DAYCARE": 2100
    };

    const ROOM_RENT_2023 = {
        // Detailed Bed Categories from SOC 2023-24
        "GENERAL WARD": 1200,
        "AC GENERAL WARD": 1500,
        "NURSERY BED": 1200,
        "PRIVATE-NON AC": 2700,
        "SEMI PRIVATE -NON AC": 1800,
        "SEMI PRIVATE-AC": 2600,
        "DELUXE": 6200,
        "PRIVATE -AC": 3400,
        "ICU": 6700,
        "SDU": 3800,
        "CATH RECOVERY": 4700,
        "HCC": 4700,
        "NEURO ICU": 6700,
        "CTVS ICU": 6600,
        "SUPER DELUXE": 8000,
        "NICU": 3100,
        "PICU": 3100,
        "DAY CARE 0 TO 1 HOUR": 300,
        "DAY CARE 1 TO 2 HOURS": 600,
        "DAY CARE 2 TO 3 HOURS": 900,
        "DAY CARE 3 TO 4 HOURS": 1200,
        "DAY CARE 4 TO 5 HOURS": 1500,
        "DAY CARE 5 TO 6 HOURS": 1800,
        "DAY CARE 5 TO 24 HOURS": 2100,
        
        // Standard simplified fallbacks
        "STANDARD WARD": 1200,
        "SEMI PRIVATE": 2600,
        "SINGLE PRIVATE": 3400,
        "SUITE": 13500,
        "ICCU": 6700,
        "HDU": 3800,
        "NEONATAL ICU": 3100,
        "DAYCARE": 2100
    };

    const ROOM_RENT_2021_ACTIVE = (typeof ROOM_RENT_2021 !== 'undefined') ? ROOM_RENT_2021 : {};

    function parseExcelDate(val) {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (typeof val === 'number') {
            // Excel serial date to JS Date (25569 days between 1900 and 1970)
            return new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        if (typeof val === 'string') {
            const parsed = Date.parse(val.replace(/-/g, '/')); // replace dash with slash for browser compat
            if (!isNaN(parsed)) return new Date(parsed);
        }
        return null;
    }

    const ROOM_RENT_SBI = {
        "AC GENERAL WARD": 1500,
        "DELUXE": 5500,
        "DELUXE CABIN": 5500,
        "HCC": 5000,
        "CORONARY CARE UNIT (HCC)": 5000,
        "ICU": 6000,
        "CRITICAL CARE UNIT": 6000,
        "NEURO ICU": 6000,
        "PICU": 3100,
        "NICU/PICU": 3100,
        "PRIVATE -AC": 3400,
        "AC CABIN": 3400,
        "SDU": 3800,
        "STEP DOWN ICU": 3800,
        "SEMI PRIVATE-AC": 2600,
        "AC SEMI CABIN": 2600,
        "GENERAL WARD": 1200
    };

    function lookupActiveRoomRent(activeSourceVal, activeSOC, cleanedRoom, isGipsa, originalRoomCategory, agreement) {
        // Kolkata room rent lookup
        if (activeSourceVal === "sockolkata" || activeSOC === TARIFF_KOLKATA_SOC || (window.currentUserUnit === 'kolkata' && activeSOC === undefined)) {
            if (typeof TARIFF_KOLKATA_SOC !== 'undefined' && mapKolkata && mapKolkata["2127"]) {
                let normRoom = originalRoomCategory ? originalRoomCategory.toUpperCase().trim() : "";
                const rates = mapKolkata["2127"].rates;
                if (rates && rates[normRoom] === undefined) {
                    if (normRoom.includes("STANDARD")) normRoom = "STANDARD";
                    else if (normRoom.includes("SEMI") || normRoom.includes("SEMI-PRIVATE") || normRoom.includes("SEMI PRIVATE")) normRoom = "SEMI-PRIVATE";
                    else if (normRoom.includes("PRIVATE DELUXE")) normRoom = "PRIVATE DELUXE";
                    else if (normRoom.includes("DELUXE")) normRoom = "DELUXE";
                    else if (normRoom.includes("PRIVATE")) normRoom = "PRIVATE";
                    else if (normRoom.includes("MAHARAJA")) normRoom = "MAHARAJA SUITE";
                    else if (normRoom.includes("SUITE")) normRoom = "SUITE";
                    else if (normRoom.includes("DAY CARE") || normRoom.includes("DAYCARE")) normRoom = "DAY CARE";
                    else if (normRoom.includes("ISOLATION")) normRoom = "ISOLATION";
                    else if (normRoom.includes("STROKE")) normRoom = "STROKE WARD";
                }

                if (rates[normRoom] !== undefined) {
                    return rates[normRoom];
                }
                for (const key in rates) {
                    if (normRoom.includes(key) || key.includes(normRoom)) {
                        return rates[key];
                    }
                }
                const cleanedUpper = cleanedRoom ? cleanedRoom.toUpperCase().trim() : "";
                if (rates[cleanedUpper] !== undefined) return rates[cleanedUpper];
                return rates["STANDARD"] || 4400;
            }
        }

        const getRate = (rentMap, roomKey) => {
            if (rentMap[roomKey] !== undefined) return rentMap[roomKey];
            const simpleKey = toSimpleRoom(roomKey);
            if (simpleKey && rentMap[simpleKey] !== undefined) return rentMap[simpleKey];
            const detailedKey = toDetailedRoom(roomKey) || toDetailedRoom(simpleKey);
            if (detailedKey && rentMap[detailedKey] !== undefined) return rentMap[detailedKey];
            return null;
        };

        let year = "2024";
        const sourceVal = activeSourceVal || "";

        if (agreement && agreement.agreementName && (agreement.agreementName.toUpperCase().includes("SBI") || agreement.agreementName.toUpperCase().includes("STATE BANK"))) {
            const normRoom = originalRoomCategory ? originalRoomCategory.toUpperCase().trim().replace(/[-\s]+/g, ' ') : "";
            if (normRoom) {
                const rate = getRate(ROOM_RENT_SBI, normRoom);
                if (rate !== null) return rate;
            }
            const rate = getRate(ROOM_RENT_SBI, cleanedRoom);
            if (rate !== null) return rate;
            return ROOM_RENT_SBI["DELUXE"] || 5500;
        }
        
        if (sourceVal === "2025" || sourceVal === "excelcare_soc" || sourceVal === "excelcare_2025" || sourceVal === "excelcare_cash_2025" || sourceVal === "excelcare_soc_cash" || sourceVal === "2025_cash") {
            year = "2025";
        } else if (sourceVal === "2026_cash") {
            year = "2026";
        } else if (sourceVal === "excelcare_2024" || sourceVal === "excelcare_soc_2024") {
            year = "2024";
        } else if (sourceVal === "2024") {
            year = "2024";
        } else if (sourceVal === "soc_2023_v2") {
            year = "2023_v2";
        } else if (sourceVal === "2023") {
            year = "2023";
        } else if (sourceVal === "2021" || sourceVal === "soc_2021_iocl") {
            year = "2021";
        } else {
            if (activeSOC === TARIFF_2025 || activeSOC === TARIFF_EXCELCARE_2025 || activeSOC === TARIFF_EXCELCARE_CASH_2025) {
                year = "2025";
            } else if (activeSOC === TARIFF_2024) {
                year = "2024";
            } else if (activeSOC === TARIFF_2023) {
                year = "2023";
            } else if (activeSOC === TARIFF_2023_V2) {
                year = "2023_v2";
            } else if (activeSOC === TARIFF_2021 || activeSOC === TARIFF_2021_IOCL) {
                year = "2021";
            } else {
                if (isGipsa) {
                    const simpleRoom = toSimpleRoom(cleanedRoom);
                    return ROOM_RENT_GIPSA[cleanedRoom] || ROOM_RENT_GIPSA[simpleRoom] || ROOM_RENT_GIPSA["DELUXE"] || 1600;
                } else {
                    const simpleRoom = toSimpleRoom(cleanedRoom);
                    return ROOM_RENT_TPA[cleanedRoom] || ROOM_RENT_TPA[simpleRoom] || ROOM_RENT_TPA["DELUXE"] || 1600;
                }
            }
        }

        const normRoom = originalRoomCategory ? originalRoomCategory.toUpperCase().trim().replace(/[-\s]+/g, ' ') : "";

        if (year === "2025" || year === "2026") {
            if (normRoom) {
                const rate = getRate(ROOM_RENT_2025, normRoom);
                if (rate !== null) return rate;
            }
            const rate = getRate(ROOM_RENT_2025, cleanedRoom);
            if (rate !== null) return rate;
            return ROOM_RENT_2025["DELUXE"] || 1650;
        } else if (year === "2024") {
            if (normRoom) {
                const rate = getRate(ROOM_RENT_2024, normRoom);
                if (rate !== null) return rate;
            }
            const rate = getRate(ROOM_RENT_2024, cleanedRoom);
            if (rate !== null) return rate;
            return ROOM_RENT_2024["DELUXE"] || 1600;
        } else if (year === "2023" || year === "2023_v2") {
            if (normRoom) {
                const rate = getRate(ROOM_RENT_2023, normRoom);
                if (rate !== null) return rate;
            }
            const rate = getRate(ROOM_RENT_2023, cleanedRoom);
            if (rate !== null) return rate;
            return ROOM_RENT_2023["DELUXE"] || 1400;
        } else if (year === "2021") {
            if (normRoom) {
                const rate = getRate(ROOM_RENT_2021_ACTIVE, normRoom);
                if (rate !== null) return rate;
            }
            const rate = getRate(ROOM_RENT_2021_ACTIVE, cleanedRoom);
            if (rate !== null) return rate;
            return ROOM_RENT_2021_ACTIVE["DELUXE"] || ROOM_RENT_2021_ACTIVE["DELUXE CABIN"] || 1600;
        }
        return 1600;
    }
    function lookupSOCRoomRent(socArray, cleanedRoom, originalRoomCategory) {
        return lookupActiveRoomRent("", socArray, cleanedRoom, false, originalRoomCategory);
    }

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = err => reject(err);
            reader.readAsArrayBuffer(file);
        });
    }

    function getMatchingOriginalFileName(revisedRecord, originalUploadedFilesRowsMap, tempRowsMap) {
        const candidates = {};
        
        const getColIndexFromMapping = (colMapping, keysList) => {
            for (let key of keysList) {
                if (colMapping[key] !== undefined) return colMapping[key];
            }
            for (let cleanHeader in colMapping) {
                for (let key of keysList) {
                    if (cleanHeader.includes(key) || key.includes(cleanHeader)) return colMapping[cleanHeader];
                }
            }
            return undefined;
        };

        const cleanName = fn => fn.toLowerCase().replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/g, "");
        const revisedNameClean = cleanName(revisedRecord.file.name);

        for (let name in originalUploadedFilesRowsMap) {
            candidates[name] = originalUploadedFilesRowsMap[name];
        }
        for (let name in tempRowsMap) {
            candidates[name] = tempRowsMap[name];
        }

        let bestMatchName = null;
        let highestScore = -1;

        const revIpCol = getColIndexFromMapping(revisedRecord.colMapping, ['ipno', 'ipnumber', 'ip', 'admissionno']);
        const revBillCol = getColIndexFromMapping(revisedRecord.colMapping, ['billno', 'billnumber', 'bill', 'invoice']);
        const revPatientCol = getColIndexFromMapping(revisedRecord.colMapping, ['patientname', 'patientname(ip)', 'patient', 'name']);

        const sampleIps = new Set();
        const sampleBills = new Set();
        const samplePatients = new Set();

        const revRows = revisedRecord.rows;
        const revHeader = revisedRecord.headerRowIdx;
        for (let i = revHeader + 1; i < Math.min(revRows.length, revHeader + 100); i++) {
            const row = revRows[i];
            if (!row || row.length <= 1) continue;
            if (revIpCol !== undefined && row[revIpCol]) sampleIps.add(String(row[revIpCol]).trim().toUpperCase());
            if (revBillCol !== undefined && row[revBillCol]) sampleBills.add(String(row[revBillCol]).trim().toUpperCase());
            if (revPatientCol !== undefined && row[revPatientCol]) samplePatients.add(String(row[revPatientCol]).trim().toUpperCase());
        }

        for (let candName in candidates) {
            let score = 0;
            const candClean = cleanName(candName);

            // 1. Filename similarity
            if (revisedNameClean.includes(candClean) || candClean.includes(revisedNameClean)) {
                score += 50 + Math.min(revisedNameClean.length, candClean.length);
            }

            // 2. Content similarity
            const cand = candidates[candName];
            const candColIdx = cand.colIdx || {
                ipno: getColIndexFromMapping(cand.colMapping, ['ipno', 'ipnumber', 'ip', 'admissionno']),
                billno: getColIndexFromMapping(cand.colMapping, ['billno', 'billnumber', 'bill', 'invoice']),
                patient: getColIndexFromMapping(cand.colMapping, ['patientname', 'patientname(ip)', 'patient', 'name'])
            };

            const candRows = cand.rows;
            const candHeader = cand.headerRowIdx;
            let matchesCount = 0;

            for (let i = candHeader + 1; i < Math.min(candRows.length, candHeader + 150); i++) {
                const row = candRows[i];
                if (!row || row.length <= 1) continue;

                if (candColIdx.ipno !== undefined && row[candColIdx.ipno]) {
                    const val = String(row[candColIdx.ipno]).trim().toUpperCase();
                    if (sampleIps.has(val)) matchesCount += 10;
                }
                if (candColIdx.billno !== undefined && row[candColIdx.billno]) {
                    const val = String(row[candColIdx.billno]).trim().toUpperCase();
                    if (sampleBills.has(val)) matchesCount += 10;
                }
                if (candColIdx.patient !== undefined && row[candColIdx.patient]) {
                    const val = String(row[candColIdx.patient]).trim().toUpperCase();
                    if (samplePatients.has(val)) matchesCount += 5;
                }
            }

            score += matchesCount;

            if (score > highestScore) {
                highestScore = score;
                bestMatchName = candName;
            }
        }

        if (highestScore > 0) {
            return bestMatchName;
        }

        const keys = Object.keys(candidates);
        return keys.length > 0 ? keys[0] : null;
    }

    // Run the actual Audit Comparison
    async function runBillingAudit() {
        if (selectedBillFiles.length === 0) return;

        // Display spinner inside run button
        btnRunAudit.disabled = true;
        btnRunAudit.innerHTML = '<span class="spinner"></span> Reading Excel...';

        rawBillData = [];
        uploadedFilesRowsMap = {};
        isReuploadAuditRun = false;
        reuploadStats = { corrected: 0, pending: 0, remarksImported: 0, overridesImported: 0 };
        revisedToOriginalFileMap = {};
        let tempRowsMap = {};

        try {
            // Build the files list and pre-scan their headers to identify which are re-uploads
            let originalFilesInfo = [];
            let revisedFilesInfo = [];
            
            let anyOPFile = false;
            for (let fIdx = 0; fIdx < selectedBillFiles.length; fIdx++) {
                const file = selectedBillFiles[fIdx];
                const fileData = await readFileAsArrayBuffer(file);
                const workbook = XLSX.read(fileData, { type: 'array' });
                
                let targetSheet = null;
                let targetSheetName = "";
                let maxRows = 0;
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
                    const rowsCount = range.e.r - range.s.r + 1;
                    const nameLower = sheetName.toLowerCase();
                    if (nameLower.includes('ip services') || nameLower.includes('discharge') || nameLower.includes('report') || nameLower.includes('billing') || nameLower.includes('op services') || nameLower.includes('outpatient') || nameLower.includes('op bill')) {
                        targetSheet = sheet;
                        targetSheetName = sheetName;
                    }
                    if (rowsCount > maxRows) {
                        maxRows = rowsCount;
                        if (!targetSheet) {
                            targetSheet = sheet;
                            targetSheetName = sheetName;
                        }
                    }
                });

                if (!targetSheet) continue;

                const rows = XLSX.utils.sheet_to_json(targetSheet, { header: 1 });
                let headerRowIdx = -1;
                let colMapping = {};

                for (let i = 0; i < Math.min(30, rows.length); i++) {
                    const row = rows[i];
                    if (row) {
                        let hasServiceId = false;
                        let basicHeaderMatchCount = 0;
                        row.forEach(cell => {
                            if (!cell) return;
                            const cleaned = String(cell).toLowerCase().trim().replace(/[\s_]/g, '');
                            if (cleaned === 'serviceid' || cleaned === 'servicecode' || cleaned === 'code' || cleaned === 'codeid') {
                                hasServiceId = true;
                            }
                            if (cleaned === 'servicename' || cleaned === 'servicedescription' || cleaned === 'description') {
                                basicHeaderMatchCount++;
                            }
                            if (cleaned === 'patientname' || cleaned === 'patient' || cleaned === 'uhid' || cleaned === 'oppno') {
                                basicHeaderMatchCount++;
                            }
                            if (cleaned === 'billno' || cleaned === 'billnumber' || cleaned === 'bill') {
                                basicHeaderMatchCount++;
                            }
                        });

                        if (hasServiceId || basicHeaderMatchCount >= 3) {
                            headerRowIdx = i;
                            row.forEach((cell, idx) => {
                                if (cell) {
                                    const cleanCell = String(cell).toLowerCase().trim().replace(/[\s_]/g, '');
                                    colMapping[cleanCell] = idx;
                                }
                            });
                            break;
                        }
                    }
                }

                if (headerRowIdx === -1) continue;

                let isOPFile = false;
                if (targetSheetName.toLowerCase().includes('op') || targetSheetName.toLowerCase().includes('outpatient')) {
                    isOPFile = true;
                }
                if (colMapping['oppno'] !== undefined || (colMapping['uhid'] !== undefined && colMapping['ipno'] === undefined && colMapping['admissionno'] === undefined)) {
                    isOPFile = true;
                }
                if (isOPFile) {
                    anyOPFile = true;
                }

                let fileIsReupload = false;
                if (colMapping['matchedservicecode'] !== undefined || colMapping['expectedrate'] !== undefined || colMapping['remarks'] !== undefined) {
                    fileIsReupload = true;
                }

                const fileRecord = { file, rows, headerRowIdx, colMapping };
                if (fileIsReupload) {
                    revisedFilesInfo.push(fileRecord);
                } else {
                    originalFilesInfo.push(fileRecord);
                }
            }

            // Auto-select Audit Type dropdown based on detected format
            const typeSelect = document.getElementById('audit-type-select');
            if (typeSelect) {
                if (anyOPFile) {
                    if (typeSelect.value !== 'op') {
                        typeSelect.value = 'op';
                        typeSelect.dispatchEvent(new Event('change'));
                        alert('OP Billing format detected. Automatically switched Audit Type to OP Audit.');
                    }
                } else {
                    if (typeSelect.value !== 'ip') {
                        typeSelect.value = 'ip';
                        typeSelect.dispatchEvent(new Event('change'));
                    }
                }
            }

            // Adjust files groups:
            if (originalFilesInfo.length === 0) {
                if (Object.keys(originalUploadedFilesRowsMap).length > 0) {
                    // Populate rawBillData from original cache
                    for (let fn in originalUploadedFilesRowsMap) {
                        const origData = originalUploadedFilesRowsMap[fn];
                        const origRows = origData.rows;
                        const origColIdx = origData.colIdx;
                        for (let i = origData.headerRowIdx + 1; i < origRows.length; i++) {
                            const row = origRows[i];
                            if (!row || row.length <= 1) continue;
                            const serviceIdRaw = String(row[origColIdx.serviceid] || '').trim();
                            const serviceNameRaw = String(row[origColIdx.servicename] || '').trim();
                            if (!serviceIdRaw && !serviceNameRaw) continue;
                            rawBillData.push({
                                row: row,
                                colIdx: origColIdx,
                                fileName: fn,
                                rowIndex: i,
                                reuploadFields: null
                            });
                        }
                    }
                    isReuploadAuditRun = true;
                } else {
                    // No original files and no cache: treat revised files as original base
                    originalFilesInfo = [...revisedFilesInfo];
                    revisedFilesInfo = [];
                    isReuploadAuditRun = true;
                }
            }

            // Process all original files
            for (let fIdx = 0; fIdx < originalFilesInfo.length; fIdx++) {
                const { file, rows, headerRowIdx, colMapping } = originalFilesInfo[fIdx];
                
                uploadedFilesRowsMap[file.name] = { rows: rows, headerRowIdx: headerRowIdx, colMapping: colMapping };

                const getMappedColIndex = (keysList, defaultIdx) => {
                    for (let key of keysList) {
                        if (colMapping[key] !== undefined) return colMapping[key];
                    }
                    for (let cleanHeader in colMapping) {
                        for (let key of keysList) {
                            // Prevent false positive loose matches for short keywords
                            if (key === 'to' && cleanHeader !== 'to' && !cleanHeader.startsWith('to')) continue;
                            if (key === 'end' && cleanHeader !== 'end' && !cleanHeader.startsWith('end')) continue;
                            if (key === 'from' && cleanHeader !== 'from' && !cleanHeader.startsWith('from')) continue;
                            if (key === 'start' && cleanHeader !== 'start' && !cleanHeader.startsWith('start')) continue;
                            if (key === 'ip' && cleanHeader !== 'ip' && !cleanHeader.startsWith('ip')) continue;

                            if (cleanHeader.includes(key) || key.includes(cleanHeader)) return colMapping[cleanHeader];
                        }
                    }
                    return defaultIdx;
                };

                const colIdx = {
                    patient: getMappedColIndex(['patientname', 'patientname(ip)', 'patient', 'name'], 4),
                    ipno: getMappedColIndex(['ipno', 'ipnumber', 'ip', 'admissionno', 'uhid', 'oppno', 'opno'], 3),
                    billno: getMappedColIndex(['billno', 'billnumber', 'bill', 'invoice'], 7),
                    type: getMappedColIndex(['servicetype', 'rateclause', 'type', 'billingtype'], 23), 
                    category: getMappedColIndex(['categoryname', 'category', 'roomcategory', 'roomtype', 'room'], 16), 
                    serviceid: getMappedColIndex(['serviceid', 'servicecode', 'code'], -1),
                    servicename: getMappedColIndex(['servicename', 'servicedescription', 'description', 'service'], 18),
                    dept: getMappedColIndex(['dept', 'department', 'deptname'], 19),
                    rate: getMappedColIndex(['individualrate', 'billedrate', 'billedrates', 'rate', 'amount', 'charges', 'charge', 'price'], 21),
                    customer: getMappedColIndex(['customer', 'customertype', 'payer', 'sponsor', 'insurance', 'tpa'], 24),
                    agreement: getMappedColIndex(['agreementname', 'agreement', 'contractname', 'contract'], -1),
                    doctor: getMappedColIndex(['primarydoctor', 'doctor', 'physician', 'docname', 'doctorid', 'doctorname'], 8),
                    template: getMappedColIndex(['templatename', 'tarifftemplate', 'template'], 0),
                    ratePreDiscount: getMappedColIndex(['grosstariffbilled', 'grossbilled', 'grosstariff', 'grossrate', 'billedrateprediscount', 'rateprediscount', 'prediscount'], -1),
                    manualTariff: getMappedColIndex(['expectedrate', 'expectedtariff', 'expected', 'tariffrate', 'tariff', 'socrate'], -1),
                    manualDiscount: getMappedColIndex(['discount%', 'discountpercent', 'discountapplied', 'discount'], -1),
                    manualRemarks: getMappedColIndex(['remarks', 'userremarks', 'comments', 'remark'], -1),
                    startdate: getMappedColIndex(['otstart', 'otstarttime', 'otstartdate', 'surgerystart', 'otdatefrom', 'datefrom', 'starttime', 'startdate', 'start', 'fromdate', 'from'], -1),
                    enddate: getMappedColIndex(['otend', 'otendtime', 'otenddate', 'surgeryend', 'otdateto', 'dateto', 'endtime', 'enddate', 'end', 'todate', 'to'], -1),
                    quantity: getMappedColIndex(['quantity', 'qty', 'billedqty', 'units', 'vol', 'count', 'days', 'hours', 'duration'], -1)
                };

                tempRowsMap[file.name] = { 
                    rows: rows.map(r => r ? [...r] : null), 
                    headerRowIdx: headerRowIdx, 
                    colMapping: { ...colMapping },
                    colIdx: { ...colIdx }
                };

                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length <= 1) continue;

                    const serviceIdRaw = String(row[colIdx.serviceid] || '').trim();
                    const serviceNameRaw = String(row[colIdx.servicename] || '').trim();
                    if (!serviceIdRaw && !serviceNameRaw) continue;

                    rawBillData.push({
                        row: row,
                        colIdx: colIdx,
                        fileName: file.name,
                        rowIndex: i,
                        reuploadFields: null
                    });
                }
            }

            // Deduplicate revised files to keep only the latest per original file
            if (revisedFilesInfo.length > 0) {
                const latestRevisedByOriginal = {};
                for (let fIdx = 0; fIdx < revisedFilesInfo.length; fIdx++) {
                    const record = revisedFilesInfo[fIdx];
                    const matchedOrigName = getMatchingOriginalFileName(record, originalUploadedFilesRowsMap, tempRowsMap);
                    record.matchedOrigName = matchedOrigName;
                    
                    const existing = latestRevisedByOriginal[matchedOrigName];
                    if (!existing || !existing.file.lastModified || !record.file.lastModified || record.file.lastModified >= existing.file.lastModified) {
                        latestRevisedByOriginal[matchedOrigName] = record;
                    }
                }
                
                revisedFilesInfo = Object.values(latestRevisedByOriginal);
                
                // Sync selectedBillFiles and update UI
                const newSelectedBillFiles = [];
                originalFilesInfo.forEach(orig => {
                    newSelectedBillFiles.push(orig.file);
                });
                revisedFilesInfo.forEach(rev => {
                    newSelectedBillFiles.push(rev.file);
                });
                selectedBillFiles = newSelectedBillFiles;
                updateBillFilesUI();
            }

            // Process all revised files (if any) to overlay onto base rawBillData
            if (revisedFilesInfo.length > 0) {
                isReuploadAuditRun = true;
                
                for (let fIdx = 0; fIdx < revisedFilesInfo.length; fIdx++) {
                    const record = revisedFilesInfo[fIdx];
                    const { file, rows, headerRowIdx, colMapping, matchedOrigName } = record;
                    
                    if (matchedOrigName) {
                        revisedToOriginalFileMap[file.name] = matchedOrigName;
                    } else {
                        const origKeys = Object.keys(originalUploadedFilesRowsMap).length > 0 
                            ? Object.keys(originalUploadedFilesRowsMap) 
                            : Object.keys(tempRowsMap);
                        revisedToOriginalFileMap[file.name] = origKeys[0] || file.name;
                    }

                    uploadedFilesRowsMap[file.name] = { rows: rows, headerRowIdx: headerRowIdx, colMapping: colMapping };

                    const getReuploadColIndex = (keysList) => {
                        for (let key of keysList) {
                            if (colMapping[key] !== undefined) return colMapping[key];
                        }
                        for (let cleanHeader in colMapping) {
                            for (let key of keysList) {
                                if (cleanHeader.includes(key) || key.includes(cleanHeader)) return colMapping[cleanHeader];
                            }
                        }
                        return undefined;
                    };

                    const idxDiscount = getReuploadColIndex(['discount%', 'discountpercent', 'discountapplied', 'discount']);
                    const idxExpected = getReuploadColIndex(['expectedrate', 'expectedtariff', 'expected']);
                    const idxRemarks = getReuploadColIndex(['remarks', 'userremarks', 'comments', 'remark']);
                    const idxSocRate = getReuploadColIndex(['socrate']);
                    const idxTariffRate = getReuploadColIndex(['tariffrate', 'tariff']);
                    const idxVariance = getReuploadColIndex(['variance']);
                    const idxVariancePercent = getReuploadColIndex(['variance%', 'variancepercent']);
                    const idxAuditStatus = getReuploadColIndex(['auditstatus', 'status']);
                    const idxExceptionCategory = getReuploadColIndex(['exceptioncategory', 'exception']);
                    const idxValidationStatus = getReuploadColIndex(['validationstatus', 'validation']);
                    const idxApprovalStatus = getReuploadColIndex(['approvalstatus', 'approval']);
                    const idxMatchedCode = getReuploadColIndex(['matchedservicecode', 'matchedservice', 'matchedcode']);

                    for (let i = headerRowIdx + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length <= 1) continue;

                        const reuploadFields = {
                            matchedServiceCode: idxMatchedCode !== undefined ? String(row[idxMatchedCode] || '').trim() : '',
                            socRate: idxSocRate !== undefined ? parseNumberCell(row[idxSocRate]) : null,
                            tariffRate: idxTariffRate !== undefined ? parseNumberCell(row[idxTariffRate]) : null,
                            discountPercent: idxDiscount !== undefined ? parseNumberCell(row[idxDiscount]) : null,
                            expectedRate: idxExpected !== undefined ? parseNumberCell(row[idxExpected]) : null,
                            variance: idxVariance !== undefined ? parseNumberCell(row[idxVariance]) : null,
                            variancePercent: idxVariancePercent !== undefined ? String(row[idxVariancePercent] || '').trim() : '',
                            auditStatus: idxAuditStatus !== undefined ? String(row[idxAuditStatus] || '').trim() : '',
                            exceptionCategory: idxExceptionCategory !== undefined ? String(row[idxExceptionCategory] || '').trim() : '',
                            validationStatus: idxValidationStatus !== undefined ? String(row[idxValidationStatus] || '').trim() : '',
                            approvalStatus: idxApprovalStatus !== undefined ? String(row[idxApprovalStatus] || '').trim() : '',
                            remarks: idxRemarks !== undefined ? String(row[idxRemarks] || '').trim() : ''
                        };

                        const origFileName = revisedToOriginalFileMap[file.name] || file.name;
                        const origItem = rawBillData.find(item => item.rowIndex === i && (item.fileName === origFileName || item.fileName === file.name));
                        if (origItem) {
                            origItem.reuploadFields = reuploadFields;
                            origItem.colIdx_discountPercent = idxDiscount;
                            origItem.colIdx_expectedRate = idxExpected;
                            origItem.colIdx_tariffRate = idxTariffRate;
                            origItem.colIdx_socRate = idxSocRate;
                        }
                    }
                }
            }

            if (originalFilesInfo.length > 0 && !isReuploadAuditRun) {
                originalUploadedFilesRowsMap = tempRowsMap;
            }

            if (rawBillData.length === 0) {
                alert('No valid billing rows found in the uploaded file(s)!');
                resetAuditBtn();
                return;
            }

            btnRunAudit.innerHTML = '<span class="spinner"></span> Auditing Billing Rates...';
            
            // Run actual audit check
            await executeActualAudit();

        } catch (err) {
            console.error(err);
            alert('Error processing file(s):\n' + err.message + '\n\nStack:\n' + err.stack);
            resetAuditBtn();
        }
    }
    function computeRowAuditStatusAndDiff(row) {
        const excludeZero = document.getElementById('chk-exclude-zero') ? document.getElementById('chk-exclude-zero').checked : true;
        if (excludeZero && row.billedRate === 0) {
            row.status = "Ignored (Zero Rated)";
            row.explanation = "Zero rated service items are excluded from checking.";
            row.isIgnored = true;
            row.diff = null;
            return;
        }

        if (row.isIgnored && row.status !== "Round Off Difference") {
            return;
        }
        if (row.status === "Not Found in Master") {
            return;
        }

        const billedRate = row.billedRate;
        const expectedTariff = row.expectedTariff;
        const discountApplied = row.discountApplied || 0;

        if (expectedTariff !== null) {
            const expectedDiscountedRate = expectedTariff * (1 - discountApplied / 100);
            row.expectedDiscountedRate = expectedDiscountedRate;
            const diff = billedRate - expectedDiscountedRate;
            row.diff = diff;

            let status = "Matching";
            let explanation = row.baseExplanation || "";

            if (Math.abs(diff) < 0.1) {
                status = "Matching";
            } else if (Math.abs(diff) <= 1) {
                status = "Round Off Difference";
                explanation += ` Minor rate difference (within ±₹1).`;
            } else if (diff > 0) {
                status = "Overcharged";
                if (billedRate === expectedTariff && discountApplied > 0) {
                    explanation = `Billed at full rate (₹${expectedTariff}) without contract discount (${discountApplied}%) expected ₹${expectedDiscountedRate}.`;
                }
            } else {
                status = "Undercharged";
            }

            row.status = status;
            row.explanation = explanation;
        }
    }

    window.updateRowDiscount = function(uid, value) {
        let valNum = parseFloat(value);
        if (isNaN(valNum)) valNum = 0;
        if (valNum < 0) valNum = 0;
        if (valNum > 100) valNum = 100;

        const row = auditedRows.find(x => x.uid === uid);
        if (row) {
            row.rawDiscountAppliedStr = value;
            row.discountApplied = valNum;
            row.isManuallyOverridden = true;
            computeRowAuditStatusAndDiff(row);
            
            // Auto-save/update this discount override to the respective custom agreement
            if (row.customer && row.serviceId) {
                if (!window.customAgreements) window.customAgreements = [];
                let targetAg = null;
                const matchedAg = findMatchingAgreement(row.customer, document.getElementById('audit-bu-select')?.value);
                
                if (matchedAg) {
                    targetAg = window.customAgreements.find(x => x.agreementName.toUpperCase() === matchedAg.agreementName.toUpperCase());
                    if (!targetAg) {
                        // Clone static agreement into custom agreements
                        targetAg = {
                            agreementName: matchedAg.agreementName,
                            payerName: matchedAg.payerName || matchedAg.agreementName,
                            businessUnit: matchedAg.businessUnit || getAgreementScope(matchedAg) || 'both',
                            fromDate: matchedAg.fromDate || '01-04-2026',
                            toDate: matchedAg.toDate || '31-03-2027',
                            status: matchedAg.status || 'Available/Valid',
                            remarks: matchedAg.remarks || 'Auto-created from audit override',
                            departments: JSON.parse(JSON.stringify(matchedAg.departments || [])),
                            services: JSON.parse(JSON.stringify(matchedAg.services || [])),
                            rooms: JSON.parse(JSON.stringify(matchedAg.rooms || [])),
                            packages: JSON.parse(JSON.stringify(matchedAg.packages || { inclusions: [], exclusions: [] })),
                            chargingMethods: JSON.parse(JSON.stringify(matchedAg.chargingMethods || [])),
                            rules: JSON.parse(JSON.stringify(matchedAg.rules || []))
                        };
                        window.customAgreements.push(targetAg);
                    }
                } else {
                    const targetName = row.customer.trim();
                    targetAg = window.customAgreements.find(x => x.agreementName.toUpperCase() === targetName.toUpperCase());
                    if (!targetAg) {
                        targetAg = {
                            agreementName: targetName,
                            payerName: targetName,
                            businessUnit: window.currentUserUnit || 'both',
                            fromDate: '01-04-2026',
                            toDate: '31-03-2027',
                            status: 'Available/Valid',
                            remarks: 'Auto-created from audit override',
                            departments: [],
                            services: [],
                            rooms: [],
                            packages: { inclusions: [], exclusions: [] },
                            chargingMethods: [],
                            rules: []
                        };
                        window.customAgreements.push(targetAg);
                    }
                }

                if (targetAg) {
                    if (!targetAg.services) targetAg.services = [];
                    const sId = String(row.serviceId).trim();
                    const sIndex = targetAg.services.findIndex(s => String(s.serviceId).trim() === sId);
                    if (sIndex !== -1) {
                        targetAg.services[sIndex].discount = valNum;
                        if (row.serviceName) {
                            targetAg.services[sIndex].serviceName = row.serviceName.trim();
                        }
                    } else {
                        targetAg.services.push({
                            serviceId: sId,
                            serviceName: (row.serviceName || '').trim(),
                            rate: null,
                            discount: valNum
                        });
                    }
                    window.saveAndSyncCustomAgreements(window.customAgreements);
                }
            }

            // Refresh views
            resetAuditBtn();
            updateAuditCharts();
            renderAuditTable();
            updateTabBadges();
            
            if (panelReports.classList.contains('active')) {
                renderReportsPanel();
            }
        }
    };

    async function executeActualAudit() {
        auditedRows = [];

        if (window.MigrationConfig && window.MigrationConfig.getFeatureFlag('useAgreementEngine')) {
            try {
                // Resolve active SOC array
                const socSelect = document.getElementById('audit-soc-select');
                const selectedSocName = socSelect ? socSelect.value : '';
                let activeSOCArray = [];
                if (selectedSocName === '2025') activeSOCArray = TARIFF_2025;
                else if (selectedSocName === '2024') activeSOCArray = TARIFF_2024;
                else if (selectedSocName === '2023') activeSOCArray = TARIFF_2023;
                else if (selectedSocName === '2023_v2') activeSOCArray = TARIFF_2023_V2;
                else if (selectedSocName === '2021') activeSOCArray = TARIFF_2021;
                else if (selectedSocName === '2021_iocl') activeSOCArray = TARIFF_2021_IOCL;
                else if (selectedSocName === 'excelcare') activeSOCArray = typeof TARIFF_EXCELCARE_2025 !== 'undefined' ? TARIFF_EXCELCARE_2025 : [];
                else if (selectedSocName === 'excelcare_cash') activeSOCArray = typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined' ? TARIFF_EXCELCARE_CASH_2025 : [];
                else if (selectedSocName === 'cash_2025') activeSOCArray = typeof TARIFF_CASH_2025 !== 'undefined' ? TARIFF_CASH_2025 : [];
                else if (selectedSocName === 'cash_2026') activeSOCArray = typeof TARIFF_CASH_2026 !== 'undefined' ? TARIFF_CASH_2026 : [];
                else if (selectedSocName === 'excelcare_2024') activeSOCArray = typeof TARIFF_EXCELCARE_2024 !== 'undefined' ? TARIFF_EXCELCARE_2024 : [];
                else if (selectedSocName === 'excelcare_gipsa_2026') activeSOCArray = typeof TARIFF_EXCELCARE_GIPSA_2026 !== 'undefined' ? TARIFF_EXCELCARE_GIPSA_2026 : [];
                else if (selectedSocName === 'kolkata') activeSOCArray = typeof TARIFF_KOLKATA_SOC !== 'undefined' ? TARIFF_KOLKATA_SOC : [];
                else activeSOCArray = TARIFF_2026;

                const agreementSelect = document.getElementById('audit-agreement-select');
                const agreementName = agreementSelect ? agreementSelect.value : '';

                // Format raw bill data rows for UnifiedAuditEngine
                const formattedRows = rawBillData.map(item => {
                    const row = item.row;
                    const colIdx = item.colIdx;
                    return {
                        serviceId: String(row[colIdx.serviceid] || '').trim(),
                        serviceName: String(row[colIdx.servicename] || '').trim(),
                        patientName: String(row[colIdx.patient] || '').trim(),
                        ipNo: String(row[colIdx.ipno] || '').trim(),
                        billNo: String(row[colIdx.billno] || '').trim(),
                        dept: String(row[colIdx.dept] || '').trim(),
                        billedRate: Number(row[colIdx.rate]) || 0,
                        row: row,
                        colIdx: colIdx,
                        rowIndex: item.rowIndex,
                        fileName: item.fileName
                    };
                });

                const auditResult = await window.UnifiedAuditEngine.auditBillRows(formattedRows, agreementName, activeSOCArray);
                
                // Map the results back to auditedRows structure expected by the legacy UI
                auditResult.auditedResults.forEach(res => {
                    const rowObj = {
                        ipNo: res.row.ipNo,
                        patientName: res.row.patientName,
                        billNo: res.row.billNo,
                        serviceId: res.row.serviceId,
                        serviceName: res.row.serviceName,
                        dept: res.row.dept,
                        billedRate: res.row.billedRate,
                        expectedRate: res.expectedRate,
                        variance: res.variance,
                        status: res.status,
                        severity: res.severity,
                        explanation: res.ruleUsed,
                        fileName: res.row.fileName,
                        rowIndex: res.row.rowIndex,
                        isIgnored: false
                    };
                    auditedRows.push(rowObj);
                });
            } catch (err) {
                console.error("Platform Audit Engine failed. Falling back to legacy:", err);
                showToast("Platform Audit Engine failed. Falling back to legacy.", "danger");
                auditedRows = [];
            }
        }

        function getActiveSOCMap(socArray, useHdfcKolkata) {
            if (typeof TARIFF_KOLKATA_SOC !== 'undefined' && socArray === TARIFF_KOLKATA_SOC) {
                // Use the HDFC-extended map when explicitly requested (Kolkata + HDFC Ergo audits)
                return useHdfcKolkata ? mapKolkataHdfc : mapKolkata;
            }
            if (socArray === TARIFF_2025) return map2025;
            if (socArray === TARIFF_2024) return map2024;
            if (socArray === TARIFF_2023) return map2023;
            if (socArray === TARIFF_2023_V2) return map2023_v2;
            if (socArray === TARIFF_2021) return map2021;
            if (socArray === TARIFF_2021_IOCL) return map2021_iocl;
            if (typeof TARIFF_EXCELCARE_2025 !== 'undefined' && socArray === TARIFF_EXCELCARE_2025) return mapExcelcare;
            if (typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined' && socArray === TARIFF_EXCELCARE_CASH_2025) return mapExcelcareCash;
            if (typeof TARIFF_CASH_2025 !== 'undefined' && socArray === TARIFF_CASH_2025) return mapCash2025;
            if (typeof TARIFF_CASH_2026 !== 'undefined' && socArray === TARIFF_CASH_2026) return mapCash2026;
            if (typeof TARIFF_EXCELCARE_2024 !== 'undefined' && socArray === TARIFF_EXCELCARE_2024) return mapExcelcare2024;
            if (typeof TARIFF_EXCELCARE_GIPSA_2026 !== 'undefined' && socArray === TARIFF_EXCELCARE_GIPSA_2026) return mapExcelcareGipsa2026;
            return map2026;
        }
        
        function lookupSOCItemByName(activeSOCMap, keyword) {
            if (!activeSOCMap) return null;
            keyword = keyword.toUpperCase();
            for (let id in activeSOCMap) {
                const item = activeSOCMap[id];
                if (item && item.name && item.name.toUpperCase().includes(keyword)) {
                    return item;
                }
            }
            return null;
        }

        function isPediatricConsultation(serviceName, dept, doctor, serviceId) {
            const nameUpper = (serviceName || '').toUpperCase();
            const deptUpper = (dept || '').toUpperCase();
            const docUpper = (doctor || '').toUpperCase();
            const idStr = String(serviceId || '');
            
            const isPed = nameUpper.includes('PAED') || nameUpper.includes('PEDIAT') || nameUpper.includes('(PAE') ||
                          deptUpper.includes('PAED') || deptUpper.includes('PEDIAT') || deptUpper.includes('(PAE') ||
                          docUpper.includes('PAED') || docUpper.includes('PEDIAT');
                          
            if (!isPed) return false;
            
            const isConsult = nameUpper.includes('CONSULT') || nameUpper.includes('VISIT') || nameUpper.includes('FEE') || nameUpper.includes('CHARGE') ||
                              deptUpper.includes('CONSULT') || deptUpper.includes('VISIT') || deptUpper.includes('FEE') || deptUpper.includes('CHARGE') ||
                              idStr.includes('INDOOR_CONSULTATION_FEE') || idStr === '1116888' || idStr === '1116889';
                              
            return isConsult;
        }

        function findPediatricSpecialtyRate(nameUpper, activeSOCArray) {
            if (!activeSOCArray || !Array.isArray(activeSOCArray)) return null;
            const isGroup = nameUpper.includes("GROUP");
            
            let matchedItem = null;
            if (isGroup) {
                matchedItem = activeSOCArray.find(x => {
                    const n = (x.name || '').toUpperCase().trim();
                    const id = (x.id || '').toUpperCase().trim();
                    return n === "PAEDIATRIC GROUP" || n === "PEDIATRIC GROUP" || n === "PAEDIATRICS GROUP" ||
                           id === "PAEDIATRIC GROUP" || id === "PEDIATRIC GROUP" || id === "PAEDIATRICS GROUP";
                });
            } else {
                matchedItem = activeSOCArray.find(x => {
                    const n = (x.name || '').toUpperCase().trim();
                    const id = (x.id || '').toUpperCase().trim();
                    return n === "PAEDIATRICS INDIVIDUAL" || n === "PAEDIATRIC INDIVIDUAL" || n === "PAEDIATRICS" || n === "PEDIATRICS" || n === "PAEDIATRICS SURGERY" ||
                           id === "PAEDIATRICS INDIVIDUAL" || id === "PAEDIATRIC INDIVIDUAL" || id === "PAEDIATRICS" || id === "PEDIATRICS" || id === "PAEDIATRICS SURGERY";
                });
            }
            
            if (!matchedItem) {
                matchedItem = activeSOCArray.find(x => {
                    const n = (x.name || '').toUpperCase();
                    const id = (x.id || '').toUpperCase();
                    const isPedName = n.includes("PAED") || n.includes("PEDIAT") || id.includes("PAED") || id.includes("PEDIAT");
                    if (!isPedName) return false;
                    
                    const isConsult = n.includes("CONSULT") || n.includes("VISIT") || n.includes("INDIVIDUAL") || n.includes("GROUP") || n.includes("FEE") || n.includes("SURGERY") || 
                                      id.includes("CONSULT") || id.includes("VISIT") || id.includes("INDIVIDUAL") || id.includes("GROUP") || id.includes("FEE") || id.includes("SURGERY") ||
                                      x.type === "Indoor consultation fee";
                    if (!isConsult) return false;
                    
                    if (isGroup) {
                        return n.includes("GROUP") || id.includes("GROUP");
                    } else {
                        return !(n.includes("GROUP") || id.includes("GROUP"));
                    }
                });
            }
            
            return matchedItem ? matchedItem.rate : null;
        }

        function getCashSOCForYear(unit, year) {
            if (unit === 'excelcare') {
                if ((year === '2025' || year === '2026') && typeof TARIFF_EXCELCARE_CASH_2025 !== 'undefined') {
                    return { array: TARIFF_EXCELCARE_CASH_2025, map: mapExcelcareCash, name: "Excelcare 2026 - Cash" };
                }
                if (year === '2024' && typeof TARIFF_EXCELCARE_CASH_2024 !== 'undefined') {
                    return { array: TARIFF_EXCELCARE_CASH_2024, map: mapExcelcareCash2024, name: "Excelcare 2024 - Cash" };
                }
            } else if (unit === 'international') {
                if (year === '2026' && typeof TARIFF_CASH_2026 !== 'undefined') {
                    return { array: TARIFF_CASH_2026, map: mapCash2026, name: "International 2026 - Cash" };
                }
                if (year === '2025' && typeof TARIFF_CASH_2025 !== 'undefined') {
                    return { array: TARIFF_CASH_2025, map: mapCash2025, name: "International 2025 - Cash" };
                }
                if (year === '2024' && typeof TARIFF_CASH_2024 !== 'undefined') {
                    return { array: TARIFF_CASH_2024, map: mapCash2024, name: "International 2024 - Cash" };
                }
                if (year === '2023' && typeof TARIFF_CASH_2023 !== 'undefined') {
                    return { array: TARIFF_CASH_2023, map: mapCash2023, name: "International 2023 - Cash" };
                }
                if (year === '2021' && typeof TARIFF_CASH_2021 !== 'undefined') {
                    return { array: TARIFF_CASH_2021, map: mapCash2021, name: "International 2021 - Cash" };
                }
            } else if (unit === 'kolkata') {
                if (year === '2023' && typeof TARIFF_KOLKATA_CASH_SOC !== 'undefined') {
                    return { array: TARIFF_KOLKATA_CASH_SOC, map: mapKolkataCash, name: "Kolkata Cash SOC" };
                }
            }
            return null;
        }
        
        const excludePharmacy = chkExcludePharmacy.checked;
        const excludePackage = chkExcludePackage.checked;
        const excludeConsumables = chkExcludeConsumables.checked;
        const excludeZero = chkExcludeZero.checked;
        
        const activeBU = auditBuSelect.value;
        const activeSourceType = auditSourceTypeSelect.value;
        const activeSourceVal = document.getElementById('audit-source-select').value;
        const mappingMethod = auditMappingMethodSelect.value;

        // Detect Agreement from the bill (first 25 rows) of first file for the top MOU display card
        let detectedAgreement = null;
        if (rawBillData.length > 0) {
            const firstItem = rawBillData[0];
            const row = firstItem.row;
            const colIdx = firstItem.colIdx;
            
            for (let i = 0; i < Math.min(25, rawBillData.length); i++) {
                const item = rawBillData[i].row;
                if (item && item[colIdx.customer]) {
                    const custVal = String(item[colIdx.customer]).trim();
                    if (custVal) {
                        detectedAgreement = findMatchingAgreement(custVal, activeBU);
                        if (detectedAgreement) break;
                    }
                }
            }
        }

        // Display MOU details card
        const mouCard = document.getElementById('agreement-verification-card');
        if (detectedAgreement) {
            mouCard.style.display = 'flex';
            document.getElementById('ag-payer-selected').textContent = detectedAgreement.agreementName;
            document.getElementById('ag-mou-status').textContent = detectedAgreement.status || 'Valid';
            document.getElementById('ag-mou-period').textContent = `${detectedAgreement.fromDate} to ${detectedAgreement.toDate}`;
            document.getElementById('ag-soc-expected').textContent = detectedAgreement.tariffMapped;
            
            let actualTemplate = 'Not found in bill';
            if (rawBillData.length > 0) {
                const row = rawBillData[0].row;
                const colIdx = rawBillData[0].colIdx;
                if (row && row[colIdx.template]) {
                    actualTemplate = String(row[colIdx.template]).trim();
                }
            }
            document.getElementById('ag-mou-mapped').textContent = actualTemplate;
            document.getElementById('ag-mou-discount').textContent = detectedAgreement.discountAgreed || 'None';
        } else {
            mouCard.style.display = 'none';
        }

        // Process all raw billing rows
        if (auditedRows.length === 0) {
            rawBillData.forEach(item => {
            const row = item.row;
            const colIdx = item.colIdx;
            const fileName = item.fileName;

            let rowToUse = row;
            let colIdxToUse = colIdx;

            if (isReuploadAuditRun) {
                const origFileName = revisedToOriginalFileMap[fileName] || fileName;
                const origData = originalUploadedFilesRowsMap[origFileName];
                if (origData && origData.rows && origData.rows[item.rowIndex]) {
                    rowToUse = origData.rows[item.rowIndex];
                    colIdxToUse = origData.colIdx;
                }
            }

            const serviceIdRaw = String(rowToUse[colIdxToUse.serviceid] || '').trim();
            const serviceId = serviceIdRaw.replace(/^[a-zA-Z]+-?/, '');

            const serviceName = String(rowToUse[colIdxToUse.servicename] || '').trim();
            const patientName = String(rowToUse[colIdxToUse.patient] || '').trim();
            const ipNo = String(rowToUse[colIdxToUse.ipno] || '').trim();
            const billNo = String(rowToUse[colIdxToUse.billno] || '').trim();
            const dept = String(rowToUse[colIdxToUse.dept] || '').trim();
            const rateType = String(rowToUse[colIdxToUse.type] || '').trim(); 
            const roomCategory = String(rowToUse[colIdxToUse.category] || '').trim();
            const customer = String(rowToUse[colIdxToUse.customer] || '').trim();
            const doctor = String(rowToUse[colIdxToUse.doctor] || '').trim();
            const agreementName = colIdxToUse.agreement !== undefined && colIdxToUse.agreement !== -1 && rowToUse[colIdxToUse.agreement] !== undefined ? String(rowToUse[colIdxToUse.agreement] || '').trim() : '';
            const billedRate = Number(rowToUse[colIdxToUse.rate]) || 0;
            const billedRatePreDiscount = colIdxToUse.ratePreDiscount !== undefined && rowToUse[colIdxToUse.ratePreDiscount] !== undefined ? (Number(rowToUse[colIdxToUse.ratePreDiscount]) || billedRate) : billedRate;
            const quantity = colIdxToUse.quantity !== undefined && colIdxToUse.quantity !== -1 && rowToUse[colIdxToUse.quantity] !== undefined ? (Number(rowToUse[colIdxToUse.quantity]) || 1) : 1;

            // Extract manual feed values from sheet columns (if present)
            let manualExcelTariff = null;
            let manualExcelDiscount = null;
            let manualExcelRemarks = null;
            let startDateVal = null;
            let endDateVal = null;

            if (colIdxToUse.manualTariff !== undefined && colIdxToUse.manualTariff !== -1 && rowToUse[colIdxToUse.manualTariff] !== undefined) {
                manualExcelTariff = parseNumberCell(rowToUse[colIdxToUse.manualTariff]);
            }
            if (colIdxToUse.manualDiscount !== undefined && colIdxToUse.manualDiscount !== -1 && rowToUse[colIdxToUse.manualDiscount] !== undefined) {
                manualExcelDiscount = parseNumberCell(rowToUse[colIdxToUse.manualDiscount]);
            }
            if (colIdxToUse.manualRemarks !== undefined && colIdxToUse.manualRemarks !== -1 && rowToUse[colIdxToUse.manualRemarks] !== undefined) {
                manualExcelRemarks = String(rowToUse[colIdxToUse.manualRemarks] || '').trim();
            }
            if (colIdxToUse.startdate !== undefined && colIdxToUse.startdate !== -1 && rowToUse[colIdxToUse.startdate] !== undefined) {
                startDateVal = rowToUse[colIdxToUse.startdate];
            }
            if (colIdxToUse.enddate !== undefined && colIdxToUse.enddate !== -1 && rowToUse[colIdxToUse.enddate] !== undefined) {
                endDateVal = rowToUse[colIdxToUse.enddate];
            }

            // Overlay reuploadFields if present
            if (item.reuploadFields) {
                if (item.reuploadFields.tariffRate !== null) manualExcelTariff = item.reuploadFields.tariffRate;
                else if (item.reuploadFields.expectedRate !== null) manualExcelTariff = item.reuploadFields.expectedRate;
                else if (item.reuploadFields.socRate !== null) manualExcelTariff = item.reuploadFields.socRate;

                if (item.reuploadFields.discountPercent !== null) manualExcelDiscount = item.reuploadFields.discountPercent;
                if (item.reuploadFields.remarks) manualExcelRemarks = item.reuploadFields.remarks;
            }

            let status = "Matching";
            let expectedTariff = null;
            let expectedDiscountedRate = null;
            let appliedDiscountPercent = 0;
            let explanation = "";
            let isIgnored = false;

            const nameUpper = serviceName.toUpperCase();
            const deptLower = dept.toLowerCase();

            // 1. Audit Exclusions Check
            if (excludeConsumables && (
                deptLower === 'consumables' || 
                nameUpper.includes('CONSUMABLE') || 
                deptLower.includes('material') || 
                nameUpper.includes('CONSU:') ||
                nameUpper.includes('PULSE GENERATOR') ||
                nameUpper.includes('PPI') ||
                nameUpper.includes('PACEMAKER') ||
                nameUpper.includes('IMPLANT') ||
                nameUpper.includes('STENT') ||
                nameUpper.includes('BALLOON') ||
                nameUpper.includes('CATHETER') ||
                nameUpper.includes('GUIDEWIRE')
            )) {
                status = "Ignored (Consumables)";
                explanation = "Consumables are excluded from checking.";
                isIgnored = true;
            } else if (excludePharmacy && (deptLower.includes('pharmacy') || nameUpper.includes('HSN:') || nameUpper.includes('PHARMACY') || deptLower.includes('drug'))) {
                status = "Ignored (Pharmacy)";
                explanation = "Pharmacy services are excluded from checking.";
                isIgnored = true;
            } else if (excludePackage && (
                rateType.toLowerCase().includes('inside package') || 
                nameUpper.includes('INSIDE PACKAGE') || 
                nameUpper.includes('PACKAGE') || 
                nameUpper.includes('(GIPSA)') || 
                nameUpper.includes('(STAR HEALTH)') || 
                nameUpper.includes('-STAR HEALTH') ||
                nameUpper.includes('TONSILLECTOMY') ||
                nameUpper.includes('LSCS')
            )) {
                status = "Ignored (Inside Package)";
                explanation = "Package items are bundled; ignore rate checks.";
                isIgnored = true;
            } else if (nameUpper.includes('EDITABLE') || nameUpper.includes('VARIABLE') || nameUpper.includes('MANUAL')) {
                status = "Ignored (editable)";
                explanation = "Editable rate item; ignore checks.";
                isIgnored = true;
            }

            // 2. Lookup Expected Rate
            let isOverriddenByLearning = false;
            if (!isIgnored) {
                // Check for persistent learned overrides for this customer (scoped by unit)
                let learnedOverride = null;
                try {
                    const storedOverrides = localStorage.getItem('brc_v2_customer_rate_overrides');
                    if (storedOverrides) {
                        const overridesDb = JSON.parse(storedOverrides);
                        const custKey = customer || 'General';
                        const activeUnit = window.currentUserUnit || 'excelcare';
                        
                        // Check unit-scoped first
                        if (overridesDb[activeUnit] && overridesDb[activeUnit][custKey] && overridesDb[activeUnit][custKey][serviceIdRaw]) {
                            learnedOverride = overridesDb[activeUnit][custKey][serviceIdRaw];
                        } 
                        // Fallback to legacy global override if activeUnit structure doesn't exist
                        else if (overridesDb[custKey] && overridesDb[custKey][serviceIdRaw]) {
                            learnedOverride = overridesDb[custKey][serviceIdRaw];
                        }
                    }
                } catch(e) {
                    console.error("Error checking customer overrides:", e);
                }

                if (learnedOverride) {
                    expectedTariff = learnedOverride.tariff;
                    appliedDiscountPercent = learnedOverride.discount;
                    explanation = "Learned override applied: Tariff ₹" + expectedTariff + ", Discount " + appliedDiscountPercent + "%" + (learnedOverride.remarks ? " (" + learnedOverride.remarks + ")" : "");
                    isOverriddenByLearning = true;
                } else {
                    let agreementHandled = false;
                    const cleanedRoom = cleanRoomCategory(roomCategory);
                    const isDayCare = cleanedRoom === "DAYCARE" || deptLower.includes("day care") || rateType.toLowerCase().includes("day care") || nameUpper.includes("DAY CARE") || nameUpper.includes("DAYCARE");

                    let isGipsa = false;
                    let isHdfc = false;
                    let isKolkataHdfc = false; // true when Kolkata + HDFC ERGO → use mapKolkataHdfc
                    let targetTemplateName = "";
                    let activeSOC = TARIFF_DATA;
                    let activeSOCMap = map2026;

                    if (mappingMethod === "single") {
                        if (activeSourceVal === "sockolkata") {
                            activeSOC = TARIFF_KOLKATA_SOC;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "pkgkolkata") {
                            activeSOC = TARIFF_KOLKATA_PKG;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2025") {
                            activeSOC = TARIFF_2025;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2025_cash") {
                            activeSOC = TARIFF_CASH_2025;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2026_cash") {
                            activeSOC = TARIFF_CASH_2026;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2024") {
                            activeSOC = TARIFF_2024;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "soc_2023_v2") {
                            activeSOC = TARIFF_2023_V2;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2023") {
                            activeSOC = TARIFF_2023;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "2021") {
                            activeSOC = TARIFF_2021;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "soc_2021_iocl") {
                            activeSOC = TARIFF_2021_IOCL;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "excelcare_2025") {
                            activeSOC = TARIFF_EXCELCARE_2025;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "excelcare_cash_2025") {
                            activeSOC = TARIFF_EXCELCARE_CASH_2025;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "excelcare_2024") {
                            activeSOC = TARIFF_EXCELCARE_2024;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "excelcare_gipsa_2026") {
                            activeSOC = TARIFF_EXCELCARE_GIPSA_2026;
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        } else if (activeSourceVal === "gipsa") {
                            isGipsa = true;
                            activeSOC = TARIFF_DATA;
                            explanation = "Billed against GIPSA Template.";
                        } else if (activeSourceVal === "tpa") {
                            isGipsa = false;
                            activeSOC = TARIFF_DATA;
                            explanation = "Billed against TPA Deluxe Template.";
                        } else if (activeSourceVal.startsWith("hdfc_")) {
                            isHdfc = true;
                            targetTemplateName = getHdfcTemplateNameFromValue(activeSourceVal);
                            explanation = `Billed against HDFC Template: ${targetTemplateName}.`;
                        } else if (activeSourceVal === "excelcare_soc") {
                            activeSOC = TARIFF_EXCELCARE_2025;
                            explanation = "Billed against Excelcare SOC.";
                        } else if (activeSourceVal === "excelcare_soc_cash") {
                            activeSOC = TARIFF_EXCELCARE_CASH_2025;
                            explanation = "Billed against Excelcare 2026 - Cash SOC.";
                        } else if (activeSourceVal === "excelcare_soc_2024") {
                            activeSOC = TARIFF_EXCELCARE_2024;
                            explanation = "Billed against Excelcare SOC 2024.";
                        } else {
                            explanation = `Billed against SOC: ${activeSourceVal}.`;
                        }
                    } else if (mappingMethod === "room") {
                        const mappedSource = getRoomWiseMappedTemplate(cleanedRoom, isDayCare);
                        if (mappedSource === "gipsa") {
                            isGipsa = true;
                            activeSOC = TARIFF_DATA;
                            explanation = `Room-wise: ${cleanedRoom} -> GIPSA.`;
                        } else if (mappedSource === "tpa") {
                            isGipsa = false;
                            activeSOC = TARIFF_DATA;
                            explanation = `Room-wise: ${cleanedRoom} -> TPA.`;
                        } else if (mappedSource.startsWith("hdfc_")) {
                            isHdfc = true;
                            targetTemplateName = getHdfcTemplateNameFromValue(mappedSource);
                            explanation = `Room-wise: ${cleanedRoom} -> ${targetTemplateName}.`;
                        } else if (mappedSource === "excelcare_soc") {
                            activeSOC = TARIFF_EXCELCARE_2025;
                            explanation = `Room-wise: ${cleanedRoom} -> Excelcare SOC.`;
                        } else if (mappedSource === "excelcare_soc_cash") {
                            activeSOC = TARIFF_EXCELCARE_CASH_2025;
                            explanation = `Room-wise: ${cleanedRoom} -> Excelcare 2026 - Cash SOC.`;
                        } else if (mappedSource === "excelcare_soc_2024") {
                            activeSOC = TARIFF_EXCELCARE_2024;
                            explanation = `Room-wise: ${cleanedRoom} -> Excelcare SOC 2024.`;
                        } else if (mappedSource === "excelcare_gipsa_2026") {
                            activeSOC = TARIFF_EXCELCARE_GIPSA_2026;
                            explanation = `Room-wise: ${cleanedRoom} -> Excelcare GIPSA 2026.`;
                        } else {
                            if (activeBU === "kolkata") {
                                activeSOC = TARIFF_KOLKATA_SOC;
                            } else {
                                activeSOC = activeBU === "excelcare" ? (activeSourceVal === "excelcare_2024" ? TARIFF_EXCELCARE_2024 : (activeSourceVal === "excelcare_cash_2025" ? TARIFF_EXCELCARE_CASH_2025 : (activeSourceVal === "excelcare_gipsa_2026" ? TARIFF_EXCELCARE_GIPSA_2026 : TARIFF_EXCELCARE_2025))) : TARIFF_2024;
                            }
                            explanation = `Room-wise fallback SOC applied.`;
                        }
                    } else if (mappingMethod === "manual") {
                        expectedTariff = manualExcelTariff;
                        appliedDiscountPercent = manualExcelDiscount !== null ? manualExcelDiscount : 0;
                        explanation = "Billed against manual rate feed.";
                        if (manualExcelRemarks) {
                            item.userRemarks = manualExcelRemarks;
                        }
                    } else {
                        // Customer-specific agreement mapping
                        const ag = findMatchingAgreement(customer, activeBU);
                        if (ag) {
                            const resolvedSOC = getSOCFromTariffMapped(ag.tariffMapped, customer);
                            const pipelineResult = runAgreementPipeline({
                                row: rowToUse,
                                colIdx: colIdxToUse,
                                serviceId: serviceIdRaw,
                                serviceName: serviceName,
                                dept: dept,
                                roomCategory: roomCategory,
                                rateType: rateType,
                                customer: customer,
                                billedRate: billedRate,
                                quantity: quantity,
                                startDateVal: startDateVal,
                                endDateVal: endDateVal
                            }, ag, resolvedSOC.activeSOCMap, resolvedSOC.activeSOC);

                            expectedTariff = pipelineResult.expectedTariff;
                            expectedDiscountedRate = pipelineResult.expectedDiscountedRate;
                            appliedDiscountPercent = pipelineResult.discountApplied;
                            explanation = pipelineResult.explanation;
                            status = pipelineResult.status;
                            isIgnored = pipelineResult.isIgnored;
                            item.exceptionCode = pipelineResult.exceptionCode;
                            agreementHandled = true;
                        } else {
                            if (activeBU === "kolkata") {
                                activeSOC = TARIFF_KOLKATA_SOC;
                                explanation = `No contract matching ${customer}. Defaulting to Kolkata SOC.`;
                            } else if (activeBU === "excelcare") {
                                isHdfc = true;
                                targetTemplateName = getHdfcErgoTemplateName(cleanedRoom, isDayCare);
                                explanation = `No contract matching ${customer}. Defaulting to Excelcare HDFC template: ${targetTemplateName}.`;
                            } else {
                                isGipsa = false;
                                activeSOC = TARIFF_2024;
                                explanation = `No contract matching ${customer}. Defaulting to 2024-25 SOC.`;
                            }
                        }
                    }

                    if (!agreementHandled) {
                        // Resolve rate
                    if (mappingMethod === "manual") {
                        if (expectedTariff === null) {
                            status = "Not Found in Master";
                            explanation = "Manual rate not provided in spreadsheet. Please enter manually.";
                        }
                    } else if (isHdfc && typeof TARIFF_HDFC_ERGO_2024 !== 'undefined') {
                        // ── Kolkata HDFC Ergo: Use Unified SOC (with package entries) ──────────
                        // For Kolkata + HDFC ERGO, we no longer use the TARIFF_HDFC_ERGO_2024
                        // template lookup. Instead we use the Kolkata SOC 23-24 which now contains
                        // HDFC-tagged package entries (applicablePayer = HDFC_ERGO). The rate
                        // resolution goes through the standard SOC path below using mapKolkataHdfc.
                        // For Excelcare HDFC Ergo (non-Kolkata), the original template lookup applies.
                        if (activeBU === 'kolkata') {
                            activeSOC = TARIFF_KOLKATA_SOC;
                            // Signal to getActiveSOCMap to use the HDFC-extended map
                            isHdfc = false;  // clear flag so we fall through to standard SOC path
                            isKolkataHdfc = true; // remember to use mapKolkataHdfc for lookups
                            explanation += ` [HDFC ERGO] Using Kolkata SOC 23-24 (incl. HDFC package rates) for ${targetTemplateName}.`;
                        } else {
                            // Excelcare: keep original HDFC Ergo template lookup
                            const match = TARIFF_HDFC_ERGO_2024.find(x => x.id === serviceId && x.template === targetTemplateName);
                            if (match) {
                                expectedTariff = match.rate;
                            } else {
                                expectedTariff = null;
                            }
                        }
                    } else {
                        const isDayCareItem = isDayCare || nameUpper.includes("DAY CARE") || nameUpper.includes("DAYCARE");
                        const isTriageItem = nameUpper.includes("TRIAGE") || deptLower.includes("triage") || rateType.toLowerCase().includes("triage");

                        if ((activeSOC === TARIFF_2021 || activeSOC === TARIFF_2021_IOCL) && (isDayCareItem || isTriageItem)) {
                            let start = parseExcelDate(startDateVal);
                            let end = parseExcelDate(endDateVal);
                            let durationHours = null;
                            if (start && end && end >= start) {
                                durationHours = (end - start) / (3600 * 1000);
                            }
                            if (isDayCareItem) {
                                if (durationHours !== null) {
                                    if (durationHours <= 1) expectedTariff = 300;
                                    else if (durationHours <= 2) expectedTariff = 600;
                                    else if (durationHours <= 3) expectedTariff = 900;
                                    else if (durationHours <= 4) expectedTariff = 1200;
                                    else if (durationHours <= 5) expectedTariff = 1500;
                                    else if (durationHours <= 6) expectedTariff = 1800;
                                    else expectedTariff = 2100;
                                    explanation += ` Resolved 2021-22 Day Care hourly charge: ${durationHours.toFixed(1)} hours.`;
                                } else {
                                    expectedTariff = 2100;
                                    explanation += " Resolved 2021-22 Day Care flat charge (no duration).";
                                }
                            } else {
                                if (durationHours !== null) {
                                    if (durationHours <= 1) expectedTariff = 0;
                                    else if (durationHours <= 3) expectedTariff = 1500;
                                    else if (durationHours <= 6) expectedTariff = 2000;
                                    else if (durationHours <= 12) expectedTariff = 2200;
                                    else expectedTariff = 2700;
                                    explanation += ` Resolved 2021-22 Triage hourly charge: ${durationHours.toFixed(1)} hours.`;
                                } else {
                                    expectedTariff = 2700;
                                    explanation += " Resolved 2021-22 Triage flat charge (no duration).";
                                }
                            }
                        } else if (serviceId === "2127" || nameUpper.includes("ROOM RENT") || nameUpper.includes("BED CHARGE") || deptLower.includes("room rent") || deptLower.includes("bed charge") || deptLower === "room" || nameUpper.includes("DELUXE CABIN") || nameUpper.includes("PRIVATE CABIN") || nameUpper.includes("SEMI CABIN") || isDayCareItem || isTriageItem) {
                            if (activeBU === "excelcare") {
                                expectedTariff = lookupExcelcareRoomRent(cleanedRoom, activeSourceVal);
                                explanation += ` Resolved Excelcare Room Rent for ${cleanedRoom}.`;
                            } else {
                                expectedTariff = lookupActiveRoomRent(activeSourceVal, activeSOC, cleanedRoom, isGipsa, roomCategory, { agreementName: agreementName });
                                explanation += ` Resolved Room Rent for ${cleanedRoom}.`;
                            }
                        } else if (serviceId === "2126" || nameUpper.includes("NURSING AND ALLIED CHARGES")) {
                            if (activeSOC === TARIFF_EXCELCARE_2025 || activeSOC === TARIFF_EXCELCARE_CASH_2025 || activeSOC === TARIFF_EXCELCARE_2024 || activeSOC === TARIFF_EXCELCARE_GIPSA_2026) {
                                expectedTariff = lookupExcelcareNursing(cleanedRoom, activeSourceVal);
                                explanation += ` Resolved Excelcare Nursing for ${cleanedRoom}.`;
                            } else {
                                const simpleRoom = toSimpleRoom(cleanedRoom);
                                expectedTariff = NURSING_CHARGES[cleanedRoom] || NURSING_CHARGES[simpleRoom];
                                explanation += ` Resolved Nursing for ${cleanedRoom}.`;
                            }
                        } else if ((serviceId === "1077592" || nameUpper.includes("MONITORING CHARGES")) && activeBU !== "kolkata") {
                            const simpleRoom = toSimpleRoom(cleanedRoom);
                            expectedTariff = MONITORING_CHARGES[cleanedRoom] || MONITORING_CHARGES[simpleRoom];
                            explanation += ` Resolved Monitoring for ${cleanedRoom}.`;
                        } else if (serviceId === "1087262" || nameUpper.includes("CARDIAC MONITOR") || nameUpper.includes("CARDIAC-MONITOR") || nameUpper.includes("CARDIAC MONITORING")) {
                            let start = parseExcelDate(startDateVal);
                            let end = parseExcelDate(endDateVal);
                            
                            const activeSOCMap = getActiveSOCMap(activeSOC);
                            const nameMatch = lookupSOCItemByName(activeSOCMap, "CARDIAC MONITOR") || lookupSOCItemByName(activeSOCMap, "CARDIAC-MONITOR") || lookupSOCItemByName(activeSOCMap, "CARDIAC MONITORING");
                            const baseMatch = activeSOCMap["1087262"] || nameMatch;
                            const baseRate = baseMatch ? ((activeSOC === TARIFF_DATA) ? (isGipsa ? baseMatch.gipsa_rate : baseMatch.tpa_rate) : baseMatch.rate) : 90;
                            
                            if (start && end && end >= start) {
                                let durationHours = (end - start) / (3600 * 1000);
                                let roundedHours = Math.ceil(durationHours);
                                if (roundedHours < 1) roundedHours = 1;
                                
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (roundedHours * baseRate));
                                
                                if (diffUnit < diffTotal) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved Cardiac Monitor unit rate: ₹${baseRate}/hour (Duration: ${roundedHours} hours).`;
                                } else {
                                    expectedTariff = roundedHours * baseRate;
                                    explanation += ` Resolved Cardiac Monitor: ${roundedHours} hours at ₹${baseRate}/hour.`;
                                }
                                if (Math.abs(quantity - roundedHours) > 0.1) {
                                    explanation += ` [Note: Billed Qty ${quantity} vs Duration ${roundedHours}h].`;
                                }
                            } else {
                                let checkQty = (quantity > 0) ? quantity : 1;
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (checkQty * baseRate));
                                
                                if (diffUnit < diffTotal && checkQty > 1) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved Cardiac Monitor unit rate: ₹${baseRate}/hour (Qty: ${checkQty}).`;
                                } else {
                                    expectedTariff = checkQty * baseRate;
                                    explanation += ` Resolved Cardiac Monitor: ${checkQty} hours at ₹${baseRate}/hour.`;
                                }
                            }
                        } else if (serviceId === "1087267" || nameUpper.includes("BIPAP")) {
                            let start = parseExcelDate(startDateVal);
                            let end = parseExcelDate(endDateVal);
                            
                            const activeSOCMap = getActiveSOCMap(activeSOC);
                            const nameMatch = lookupSOCItemByName(activeSOCMap, "BIPAP");
                            const baseMatch = activeSOCMap["1087267"] || nameMatch;
                            const baseRate = baseMatch ? ((activeSOC === TARIFF_DATA) ? (isGipsa ? baseMatch.gipsa_rate : baseMatch.tpa_rate) : baseMatch.rate) : 80;
                            
                            if (start && end && end >= start) {
                                let durationHours = (end - start) / (3600 * 1000);
                                let roundedHours = Math.ceil(durationHours);
                                if (roundedHours < 1) roundedHours = 1;
                                
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (roundedHours * baseRate));
                                
                                if (diffUnit < diffTotal) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved BIPAP unit rate: ₹${baseRate}/hour (Duration: ${roundedHours} hours).`;
                                } else {
                                    expectedTariff = roundedHours * baseRate;
                                    explanation += ` Resolved BIPAP: ${roundedHours} hours at ₹${baseRate}/hour.`;
                                }
                                if (Math.abs(quantity - roundedHours) > 0.1) {
                                    explanation += ` [Note: Billed Qty ${quantity} vs Duration ${roundedHours}h].`;
                                }
                            } else {
                                let checkQty = (quantity > 0) ? quantity : 1;
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (checkQty * baseRate));
                                
                                if (diffUnit < diffTotal && checkQty > 1) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved BIPAP unit rate: ₹${baseRate}/hour (Qty: ${checkQty}).`;
                                } else {
                                    expectedTariff = checkQty * baseRate;
                                    explanation += ` Resolved BIPAP: ${checkQty} hours at ₹${baseRate}/hour.`;
                                }
                            }
                        } else if (serviceId === "1045742" || nameUpper.includes("OXYGEN CHARGE") || nameUpper.includes("OXYGEN CHARGES")) {
                            let start = parseExcelDate(startDateVal);
                            let end = parseExcelDate(endDateVal);
                            
                            const activeSOCMap = getActiveSOCMap(activeSOC);
                            const nameMatch = lookupSOCItemByName(activeSOCMap, "OXYGEN CHARGE") || lookupSOCItemByName(activeSOCMap, "OXYGEN CHARGES");
                            const baseMatch = activeSOCMap["1045742"] || nameMatch;
                            const baseRate = baseMatch ? ((activeSOC === TARIFF_DATA) ? (isGipsa ? baseMatch.gipsa_rate : baseMatch.tpa_rate) : baseMatch.rate) : 135;
                            
                            if (start && end && end >= start) {
                                let durationHours = (end - start) / (3600 * 1000);
                                let roundedHours = Math.ceil(durationHours);
                                if (roundedHours < 1) roundedHours = 1;
                                
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (roundedHours * baseRate));
                                
                                if (diffUnit < diffTotal) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved Oxygen unit rate: ₹${baseRate}/hour (Duration: ${roundedHours} hours).`;
                                } else {
                                    expectedTariff = roundedHours * baseRate;
                                    explanation += ` Resolved Oxygen: ${roundedHours} hours at ₹${baseRate}/hour.`;
                                }
                                if (Math.abs(quantity - roundedHours) > 0.1) {
                                    explanation += ` [Note: Billed Qty ${quantity} vs Duration ${roundedHours}h].`;
                                }
                            } else {
                                let checkQty = (quantity > 0) ? quantity : 1;
                                let diffUnit = Math.abs(billedRate - baseRate);
                                let diffTotal = Math.abs(billedRate - (checkQty * baseRate));
                                
                                if (diffUnit < diffTotal && checkQty > 1) {
                                    expectedTariff = baseRate;
                                    explanation += ` Resolved Oxygen unit rate: ₹${baseRate}/hour (Qty: ${checkQty}).`;
                                } else {
                                    expectedTariff = checkQty * baseRate;
                                    explanation += ` Resolved Oxygen: ${checkQty} hours at ₹${baseRate}/hour.`;
                                }
                            }
                        } else if (serviceId === "2103" || nameUpper.includes("OPERATION THEATRE CHARGES") || nameUpper.includes("OPERATION THEATRE CHARGE")) {
                            if (activeBU === "kolkata") {
                                let start = parseExcelDate(startDateVal);
                                let end = parseExcelDate(endDateVal);
                                if (start && end && end >= start) {
                                    let durationMins = Math.round((end - start) / (60 * 1000));
                                    let matchedSlab = KOLKATA_OT_SLABS.find(s => durationMins >= s.from && durationMins <= s.to);
                                    if (!matchedSlab) {
                                        matchedSlab = KOLKATA_OT_SLABS[KOLKATA_OT_SLABS.length - 1];
                                    }
                                    let normRoom = roomCategory ? roomCategory.toUpperCase().trim() : "";
                                    if (matchedSlab.rates && matchedSlab.rates[normRoom] === undefined) {
                                        if (normRoom.includes("STANDARD")) normRoom = "STANDARD";
                                        else if (normRoom.includes("SEMI") || normRoom.includes("SEMI-PRIVATE") || normRoom.includes("SEMI PRIVATE")) normRoom = "SEMI-PRIVATE";
                                        else if (normRoom.includes("PRIVATE DELUXE")) normRoom = "PRIVATE DELUXE";
                                        else if (normRoom.includes("DELUXE")) normRoom = "DELUXE";
                                        else if (normRoom.includes("PRIVATE")) normRoom = "PRIVATE";
                                        else if (normRoom.includes("MAHARAJA")) normRoom = "MAHARAJA SUITE";
                                        else if (normRoom.includes("SUITE")) normRoom = "SUITE";
                                        else if (normRoom.includes("DAY CARE") || normRoom.includes("DAYCARE")) normRoom = "DAY CARE";
                                        else if (normRoom.includes("ISOLATION")) normRoom = "ISOLATION";
                                        else if (normRoom.includes("STROKE")) normRoom = "STROKE WARD";
                                    }
                                    
                                    let rate = matchedSlab.rates[normRoom] || matchedSlab.rates["STANDARD"];
                                    expectedTariff = rate;
                                    explanation += ` Resolved Kolkata OT slab rate for ${durationMins} minutes [${normRoom}].`;
                                } else {
                                    const activeSOCMap = getActiveSOCMap(activeSOC);
                                    const match = activeSOCMap[serviceId];
                                    if (match && match.rates) {
                                        let normRoom = roomCategory ? roomCategory.toUpperCase().trim() : "";
                                        if (match.rates && match.rates[normRoom] === undefined) {
                                            if (normRoom.includes("STANDARD")) normRoom = "STANDARD";
                                            else if (normRoom.includes("SEMI") || normRoom.includes("SEMI-PRIVATE") || normRoom.includes("SEMI PRIVATE")) normRoom = "SEMI-PRIVATE";
                                            else if (normRoom.includes("PRIVATE DELUXE")) normRoom = "PRIVATE DELUXE";
                                            else if (normRoom.includes("DELUXE")) normRoom = "DELUXE";
                                            else if (normRoom.includes("PRIVATE")) normRoom = "PRIVATE";
                                            else if (normRoom.includes("MAHARAJA")) normRoom = "MAHARAJA SUITE";
                                            else if (normRoom.includes("SUITE")) normRoom = "SUITE";
                                            else if (normRoom.includes("DAY CARE") || normRoom.includes("DAYCARE")) normRoom = "DAY CARE";
                                            else if (normRoom.includes("ISOLATION")) normRoom = "ISOLATION";
                                            else if (normRoom.includes("STROKE")) normRoom = "STROKE WARD";
                                        }
                                        
                                        expectedTariff = match.rates[normRoom] || match.rates["STANDARD"] || null;
                                    }
                                }
                            } else {
                                let start = parseExcelDate(startDateVal);
                                let end = parseExcelDate(endDateVal);
                                if (start && end && end >= start) {
                                    let durationMins = Math.round((end - start) / (60 * 1000));
                                    let baseOT = (activeSOC === TARIFF_2021 || activeSOC === TARIFF_2021_IOCL) ? 6400 : 10000;
                                    let slabRate = (activeSOC === TARIFF_2021 || activeSOC === TARIFF_2021_IOCL) ? 1600 : 2000;
                                    
                                    if (durationMins <= 60) {
                                        expectedTariff = baseOT;
                                    } else {
                                        let extraMins = durationMins - 60;
                                        let extraSlabs = Math.ceil(extraMins / 15);
                                        expectedTariff = baseOT + (extraSlabs * slabRate);
                                    }
                                    explanation += ` Resolved OT Charges dynamically: ${durationMins} minutes [Base: ₹${baseOT} + ₹${slabRate}/15m extra].`;
                                } else {
                                    const activeSOCMap = getActiveSOCMap(activeSOC);
                                    const match = activeSOCMap[serviceId];
                                    expectedTariff = match ? ((activeSOC === TARIFF_DATA) ? (isGipsa ? match.gipsa_rate : match.tpa_rate) : match.rate) : null;
                                }
                            }
                        } else if (serviceId === "3044188" || serviceId === "3044189" || nameUpper.includes("IP VISIT CHARGES") || nameUpper.includes("IPD VISIT")) {
                            const simpleRoom = toSimpleRoom(cleanedRoom);
                            expectedTariff = VISIT_CHARGES[cleanedRoom] || VISIT_CHARGES[simpleRoom];
                            explanation += ` Resolved Visit Charge for ${cleanedRoom}.`;
                        } else {
                            // Standard SOC lookup
                            // Pass isKolkataHdfc so HDFC-tagged package entries are included
                            const activeSOCMap = getActiveSOCMap(activeSOC, isKolkataHdfc);
                            const match = activeSOCMap[serviceId];
                            if (match) {
                                if (activeSOCMap === mapKolkata || activeSOCMap === mapKolkataHdfc) {
                                    let normRoom = roomCategory ? roomCategory.toUpperCase().trim() : "";
                                    if (match.rates && match.rates[normRoom] === undefined) {
                                        if (normRoom.includes("STANDARD")) normRoom = "STANDARD";
                                        else if (normRoom.includes("SEMI") || normRoom.includes("SEMI-PRIVATE") || normRoom.includes("SEMI PRIVATE")) normRoom = "SEMI-PRIVATE";
                                        else if (normRoom.includes("PRIVATE DELUXE")) normRoom = "PRIVATE DELUXE";
                                        else if (normRoom.includes("DELUXE")) normRoom = "DELUXE";
                                        else if (normRoom.includes("PRIVATE")) normRoom = "PRIVATE";
                                        else if (normRoom.includes("MAHARAJA")) normRoom = "MAHARAJA SUITE";
                                        else if (normRoom.includes("SUITE")) normRoom = "SUITE";
                                        else if (normRoom.includes("DAY CARE") || normRoom.includes("DAYCARE")) normRoom = "DAY CARE";
                                        else if (normRoom.includes("ISOLATION")) normRoom = "ISOLATION";
                                        else if (normRoom.includes("STROKE")) normRoom = "STROKE WARD";
                                    }

                                    if (match.rates) {
                                        if (match.rates[normRoom] !== undefined) {
                                            expectedTariff = match.rates[normRoom];
                                        } else {
                                            let foundRate = null;
                                            for (const key in match.rates) {
                                                if (normRoom.includes(key) || key.includes(normRoom)) {
                                                    foundRate = match.rates[key];
                                                    break;
                                                }
                                            }
                                            expectedTariff = (foundRate !== null) ? foundRate : (match.rates["STANDARD"] !== undefined ? match.rates["STANDARD"] : null);
                                        }
                                    } else {
                                        expectedTariff = null;
                                    }
                                    if (expectedTariff !== null) {
                                        explanation += ` Resolved Kolkata room-specific rate (${normRoom}).`;
                                    }

                                    // ── Time-Based Rate Detection (Kolkata) ──────────────────────────
                                    // If the matched SOC item's name contains per-hour / per-day / per-minute
                                    // indicators, the resolved rate is a UNIT rate. We apply the billed
                                    // quantity as the duration multiplier so the expected total is correct.
                                    if (expectedTariff !== null && activeBU === 'kolkata') {
                                        const socItemName = (match.name || '').toUpperCase();
                                        const isPerHour  = /\/\s*HOUR|PER\s+HOUR|CHG\/HR|CHG\s*\/\s*HOUR/.test(socItemName);
                                        const isPerDay   = /\/\s*DAY|PER\s+DAY|PER\s+NURSE\s+PER\s+DAY/.test(socItemName);
                                        const isPerMin   = /\/\s*MIN|PER\s+MIN/.test(socItemName);

                                        if ((isPerHour || isPerDay || isPerMin) && quantity > 1) {
                                            const unitLabel = isPerMin ? 'min' : (isPerDay ? 'day' : 'hr');
                                            const unitRate  = expectedTariff;
                                            expectedTariff  = unitRate * quantity;
                                            explanation += ` [TIME-BASED] ${quantity} ${unitLabel} × ₹${unitRate}/unit = ₹${expectedTariff}.`;
                                        } else if (isPerHour || isPerDay || isPerMin) {
                                            const unitLabel = isPerMin ? '/min' : (isPerDay ? '/day' : '/hr');
                                            explanation += ` [TIME-BASED: unit rate ${unitLabel} – qty=${quantity}]`;
                                        }
                                    }
                                    // ─────────────────────────────────────────────────────────────────

                                } else {
                                    if (match.rates) {
                                        const mappedCat = mapIOCLRoomCategory(roomCategory, cleanedRoom);
                                        expectedTariff = match.rates[mappedCat];
                                        if (expectedTariff === undefined || expectedTariff === null) {
                                            expectedTariff = match.rate;
                                        } else {
                                            explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                                        }
                                    } else {
                                        expectedTariff = (activeSOC === TARIFF_DATA) ? (isGipsa ? match.gipsa_rate : match.tpa_rate) : match.rate;
                                    }
                                }
                            } else {
                                expectedTariff = null;
                            }

                            // Try description match on activeSOC
                            if (expectedTariff === null) {
                                const cleanBillName = nameUpper.trim();
                                let descMatches = activeSOC.filter(x => {
                                    const nameVal = (x.name || '').toUpperCase().trim();
                                    const aliasNameVal = (x.aliasName || '').toUpperCase().trim();
                                    return nameVal === cleanBillName || (aliasNameVal && aliasNameVal === cleanBillName);
                                });
                                
                                // Normalized description fallback for OP Audits (or general fallback)
                                if (descMatches.length === 0) {
                                    const normalizeDesc = str => str.replace(/[-\s_(),]+/g, ' ').replace(/\b(OP|IP|CASH|SUBHAM|CHRISTIANBASTI|APHC)\b/gi, '').trim().toUpperCase();
                                    const normBillName = normalizeDesc(cleanBillName);
                                    if (normBillName.length > 2) {
                                        descMatches = activeSOC.filter(x => {
                                            const nameVal = (x.name || '').toUpperCase();
                                            const aliasNameVal = (x.aliasName || '').toUpperCase();
                                            return normalizeDesc(nameVal) === normBillName || (aliasNameVal && normalizeDesc(aliasNameVal) === normBillName);
                                        });
                                    }
                                }

                                if (descMatches.length > 0) {
                                    const matchedItem = descMatches[0];
                                    if (matchedItem.rates) {
                                        const mappedCat = mapIOCLRoomCategory(roomCategory, cleanedRoom);
                                        expectedTariff = matchedItem.rates[mappedCat];
                                        if (expectedTariff === undefined || expectedTariff === null) {
                                            expectedTariff = matchedItem.rate;
                                        } else {
                                            explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                                        }
                                    } else {
                                        expectedTariff = (activeSOC === TARIFF_DATA) ? (isGipsa ? matchedItem.gipsa_rate : matchedItem.tpa_rate) : matchedItem.rate;
                                    }
                                    explanation += " Matched by description in active SOC.";
                                }
                            }

                            // If still not matched, check if it is a pediatric consultation and resolve specialty rate from activeSOC
                            if (expectedTariff === null) {
                                if (isPediatricConsultation(serviceName, dept, doctor, serviceIdRaw)) {
                                    const pedRate = findPediatricSpecialtyRate(nameUpper, activeSOC);
                                    if (pedRate !== null) {
                                        expectedTariff = pedRate;
                                        explanation += ` Resolved pediatric specialty rate (₹${pedRate}) from active SOC.`;
                                    }
                                }
                            }
                        }
                    }

                    // Fallback lookup: if expectedTariff is null or not found in the Template, fetch from That Year's SOC
                    if (expectedTariff === null && !isIgnored) {
                        let activeYear = "2024"; // default fallback year
                        if (activeSourceVal === "2025" || activeSourceVal === "2024" || activeSourceVal === "2023" || activeSourceVal === "2021" || activeSourceVal === "soc_2023_v2" || activeSourceVal === "soc_2021_iocl" || activeSourceVal === "2025_cash" || activeSourceVal === "2026_cash") {
                            activeYear = activeSourceVal === "soc_2023_v2" ? "2023_v2" : (activeSourceVal === "soc_2021_iocl" ? "2021_iocl" : activeSourceVal);
                        } else if (activeSourceVal === "excelcare_2025" || activeSourceVal === "excelcare_cash_2025" || activeSourceVal === "excelcare_gipsa_2026" || activeSourceVal === "excelcare_soc" || activeSourceVal === "excelcare_soc_cash") {
                            activeYear = "2025";
                        } else if (activeSourceVal === "excelcare_2024" || activeSourceVal === "excelcare_soc_2024") {
                            activeYear = "2024";
                        } else {
                            if (activeSOC === TARIFF_2025 || activeSOC === TARIFF_EXCELCARE_2025 || activeSOC === TARIFF_EXCELCARE_CASH_2025 || activeSOC === TARIFF_EXCELCARE_GIPSA_2026) activeYear = "2025";
                            else if (activeSOC === TARIFF_2024 || activeSOC === TARIFF_EXCELCARE_2024) activeYear = "2024";
                            else if (activeSOC === TARIFF_2023) activeYear = "2023";
                            else if (activeSOC === TARIFF_2023_V2) activeYear = "2023_v2";
                            else if (activeSOC === TARIFF_2021) activeYear = "2021";
                            else activeYear = "2025"; // default to 2025-26
                        }

                        let isKolkata = (activeBU === "kolkata" || activeSourceVal === "sockolkata" || activeSourceVal === "pkgkolkata" || activeSourceVal.toLowerCase().includes("kolkata"));
                        let isExcelcare = (activeBU === "excelcare" || activeSourceVal.startsWith("excelcare_") || activeSourceVal.startsWith("socexcelcare") || activeSourceVal === "hdfcergo");
                        
                        let fallbackSOCArray, fallbackSOCMap;
                        const unitKey = isExcelcare ? 'excelcare' : (isKolkata ? 'kolkata' : 'international');
                        const yearNum = activeYear.split('_')[0]; // Extract numeric year (e.g., '2021' from '2021_iocl')
                        
                        const cashSoc = getCashSOCForYear(unitKey, yearNum);
                        if (cashSoc) {
                            fallbackSOCArray = cashSoc.array;
                            fallbackSOCMap = cashSoc.map;
                            activeYear = cashSoc.name;
                        } else {
                            // Default to standard SOC of that year if no Cash SOC is uploaded yet
                            if (isKolkata) {
                                fallbackSOCArray = TARIFF_KOLKATA_SOC;
                                fallbackSOCMap = mapKolkata;
                                activeYear = "Kolkata SOC";
                            } else if (isExcelcare) {
                                const use24 = (activeSourceVal === "excelcare_2024" || activeSourceVal === "socexcelcare2024" || activeYear === "2024");
                                if (use24) {
                                    fallbackSOCArray = TARIFF_EXCELCARE_2024;
                                    fallbackSOCMap = mapExcelcare2024;
                                    activeYear = "Excelcare 2024-25";
                                } else {
                                    fallbackSOCArray = TARIFF_EXCELCARE_2025;
                                    fallbackSOCMap = mapExcelcare;
                                    activeYear = "Excelcare 2025-26";
                                }
                            } else {
                                fallbackSOCArray = TARIFF_2025;
                                fallbackSOCMap = map2025;
                                if (activeYear === "2024") { fallbackSOCArray = TARIFF_2024; fallbackSOCMap = map2024; }
                                else if (activeYear === "2023") { fallbackSOCArray = TARIFF_2023; fallbackSOCMap = map2023; }
                                else if (activeYear === "2023_v2") { fallbackSOCArray = TARIFF_2023_V2; fallbackSOCMap = map2023_v2; }
                                else if (activeYear === "2021") { fallbackSOCArray = TARIFF_2021; fallbackSOCMap = map2021; }
                                else if (activeYear === "2021_iocl") { fallbackSOCArray = TARIFF_2021_IOCL; fallbackSOCMap = map2021_iocl; }
                            }
                        }

                        let fallbackMatch = fallbackSOCMap[serviceId];
                        let fallbackMatchedByDesc = false;

                        if (!fallbackMatch) {
                            const cleanBillName = nameUpper.trim();
                            const descMatches = fallbackSOCArray.filter(x => {
                                const nameVal = (x.name || '').toUpperCase().trim();
                                const aliasNameVal = (x.aliasName || '').toUpperCase().trim();
                                return nameVal === cleanBillName || (aliasNameVal && aliasNameVal === cleanBillName);
                            });
                            if (descMatches.length > 0) {
                                fallbackMatch = descMatches[0];
                                fallbackMatchedByDesc = true;
                            }
                        }

                        // Try pediatric specialty rate lookup in fallback SOC if not matched by ID/Description
                        if (!fallbackMatch) {
                            if (isPediatricConsultation(serviceName, dept, doctor, serviceIdRaw)) {
                                const pedRate = findPediatricSpecialtyRate(nameUpper, fallbackSOCArray);
                                if (pedRate !== null) {
                                    fallbackMatch = { rate: pedRate, name: "Pediatric Specialty Rate Fallback" };
                                    fallbackMatchedByDesc = true;
                                }
                            }
                        }

                        if (fallbackMatch) {
                            if (isKolkata) {
                                let normRoom = roomCategory ? roomCategory.toUpperCase().trim() : "";
                                if (fallbackMatch.rates && fallbackMatch.rates[normRoom] === undefined) {
                                    if (normRoom.includes("STANDARD")) normRoom = "STANDARD";
                                    else if (normRoom.includes("SEMI") || normRoom.includes("SEMI-PRIVATE") || normRoom.includes("SEMI PRIVATE")) normRoom = "SEMI-PRIVATE";
                                    else if (normRoom.includes("PRIVATE DELUXE")) normRoom = "PRIVATE DELUXE";
                                    else if (normRoom.includes("DELUXE")) normRoom = "DELUXE";
                                    else if (normRoom.includes("PRIVATE")) normRoom = "PRIVATE";
                                    else if (normRoom.includes("MAHARAJA")) normRoom = "MAHARAJA SUITE";
                                    else if (normRoom.includes("SUITE")) normRoom = "SUITE";
                                    else if (normRoom.includes("DAY CARE") || normRoom.includes("DAYCARE")) normRoom = "DAY CARE";
                                    else if (normRoom.includes("ISOLATION")) normRoom = "ISOLATION";
                                    else if (normRoom.includes("STROKE")) normRoom = "STROKE WARD";
                                }

                                if (fallbackMatch.rates) {
                                    if (fallbackMatch.rates[normRoom] !== undefined) {
                                        expectedTariff = fallbackMatch.rates[normRoom];
                                    } else {
                                        let foundRate = null;
                                        for (const key in fallbackMatch.rates) {
                                            if (normRoom.includes(key) || key.includes(normRoom)) {
                                                foundRate = fallbackMatch.rates[key];
                                                break;
                                            }
                                        }
                                        expectedTariff = (foundRate !== null) ? foundRate : (fallbackMatch.rates["STANDARD"] !== undefined ? fallbackMatch.rates["STANDARD"] : null);
                                    }
                                } else {
                                    expectedTariff = null;
                                }
                            } else {
                                if (fallbackMatch.rates) {
                                    const mappedCat = mapIOCLRoomCategory(roomCategory, cleanedRoom);
                                    expectedTariff = fallbackMatch.rates[mappedCat];
                                    if (expectedTariff === undefined || expectedTariff === null) {
                                        expectedTariff = fallbackMatch.rate;
                                    } else {
                                        explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                                    }
                                } else {
                                    expectedTariff = fallbackMatch.rate;
                                }
                            }
                            status = "Matching"; // reset status from Not Found
                            explanation += ` Not found in Template; fetched ₹${expectedTariff} from ${activeYear} SOC` + (fallbackMatchedByDesc ? ` (Matched by Description: ${fallbackMatch.name})` : "") + ".";
                        } else {
                            // If it's a pediatric consultation, skip fallback to 2026 GIPSA/TPA Master
                            if (isPediatricConsultation(serviceName, dept, doctor, serviceIdRaw)) {
                                status = "Not Found in Master";
                                explanation += ` Service not found in Template or ${activeYear} SOC. Fallback to 2026 GIPSA Master bypassed.`;
                            } else {
                                // As a final fallback, check the 2026 GIPSA/TPA Master database (TARIFF_DATA)
                                let masterMatch = map2026[serviceId];
                                let masterMatchedByDesc = false;
                                if (!masterMatch) {
                                    const cleanBillName = nameUpper.trim();
                                    const descMatches = TARIFF_DATA.filter(x => {
                                        const nameVal = (x.name || '').toUpperCase().trim();
                                        const aliasNameVal = (x.aliasName || '').toUpperCase().trim();
                                        return nameVal === cleanBillName || (aliasNameVal && aliasNameVal === cleanBillName);
                                    });
                                    if (descMatches.length > 0) {
                                        masterMatch = descMatches[0];
                                        masterMatchedByDesc = true;
                                    }
                                }
                                if (masterMatch) {
                                    expectedTariff = isGipsa ? masterMatch.gipsa_rate : masterMatch.tpa_rate;
                                    if (expectedTariff !== null && expectedTariff !== undefined) {
                                        status = "Matching";
                                        explanation += ` Not found in Template or ${activeYear} SOC; fetched ₹${expectedTariff} from 2026 Master (TPA/GIPSA)` + (masterMatchedByDesc ? ` (Matched by Description: ${masterMatch.name})` : "") + ".";
                                    } else {
                                        status = "Not Found in Master";
                                        explanation += ` Service Code found in 2026 Master but has no valid rate.`;
                                    }
                                } else {
                                    status = "Not Found in Master";
                                    explanation += ` Service Code not found in Template or ${activeYear} SOC.`;
                                }
                            }
                        }
                    }
                } // close else of if (learnedOverride)
            } // close if (!isIgnored)

            // Exclude Zero-Rated check
            if (!isIgnored && excludeZero && billedRate === 0) {
                status = "Ignored (Zero Rated)";
                explanation = "Zero rated service items are excluded from checking.";
                isIgnored = true;
            }

            // Resolve Discount
            if (!isIgnored && status !== "Not Found in Master" && !isOverriddenByLearning) {
                if (mappingMethod === "manual" && manualExcelDiscount !== null) {
                    explanation += " (Manual Discount from Excel: " + appliedDiscountPercent + "%)";
                } else {
                    let customApplied = false;
                    
                    // 1. Item-specific custom override
                    if (window.customItemDiscounts) {
                        const customItem = window.customItemDiscounts[serviceId] !== undefined ? 
                            window.customItemDiscounts[serviceId] : 
                            window.customItemDiscounts[serviceIdRaw];
                        if (customItem !== undefined) {
                            appliedDiscountPercent = customItem.discount || 0;
                            explanation += " (Custom Item Discount: " + appliedDiscountPercent + "%)";
                            customApplied = true;
                        }
                    }
                    
                    // 2. Department-specific custom override
                    if (!customApplied && window.customDeptDiscounts && window.customDeptDiscounts[dept] !== undefined) {
                        appliedDiscountPercent = window.customDeptDiscounts[dept];
                        explanation += " (Custom Dept Discount: " + appliedDiscountPercent + "% for " + dept + ")";
                        customApplied = true;
                    }
                    
                    if (!customApplied) {
                        const serviceCat = getDiscountCategory(deptLower, nameUpper);
                        
                        if (uploadedDiscountMap && uploadedDiscountMap[serviceCat] !== undefined) {
                            appliedDiscountPercent = uploadedDiscountMap[serviceCat];
                            explanation += " (Discount Master: " + appliedDiscountPercent + "% for " + serviceCat + ")";
                        } else if (mappingMethod !== "customer") {
                            appliedDiscountPercent = getManualDiscountForCategory(serviceCat);
                            if (appliedDiscountPercent > 0) {
                                explanation += " (Manual Discount: " + appliedDiscountPercent + "% for " + serviceCat + ")";
                            }
                        } else {
                            if (appliedDiscountPercent > 0) {
                                explanation += " (Contract Discount: " + appliedDiscountPercent + "%)";
                            } else {
                                // Fallback to Category-wise MOU Discount entered in the UI
                                const fallbackDisc = getManualDiscountForCategory(serviceCat);
                                if (fallbackDisc > 0) {
                                    appliedDiscountPercent = fallbackDisc;
                                    explanation += " (MOU Category Discount: " + appliedDiscountPercent + "% for " + serviceCat + ")";
                                }
                            }
                        }
                    }
                }
            }
            }

            let baseExplanation = explanation;

            // Extract raw string values for validation
            let rawBilledRateStr = colIdx.rate !== undefined && item.row[colIdx.rate] !== undefined ? String(item.row[colIdx.rate]).trim() : String(billedRate);
            let rawBilledPreDiscStr = colIdx.ratePreDiscount !== undefined && item.row[colIdx.ratePreDiscount] !== undefined ? String(item.row[colIdx.ratePreDiscount]).trim() : String(billedRatePreDiscount);
            let rawDiscountAppliedStr = String(appliedDiscountPercent);
            let rawExpectedTariffStr = expectedTariff !== null ? String(expectedTariff) : '';

            let rowObj = {
                uid: 'r_' + auditedRows.length,
                patientName,
                ipNo,
                billNo,
                serviceId: serviceIdRaw,
                serviceName,
                dept,
                roomCategory,
                rateType,
                customer,
                doctor,
                billedRatePreDiscount,
                billedRate,
                expectedTariff,
                expectedDiscountedRate,
                discountApplied: appliedDiscountPercent,
                diff: null,
                status,
                explanation,
                baseExplanation,
                isIgnored,
                fileName,
                rowIndex: item.rowIndex,
                userRemarks: "",
                rawBilledRateStr: rawBilledRateStr,
                rawBilledPreDiscStr: rawBilledPreDiscStr,
                rawDiscountAppliedStr: rawDiscountAppliedStr,
                rawExpectedTariffStr: rawExpectedTariffStr
            };

            if (!isIgnored && status !== "Not Found in Master") {
                computeRowAuditStatusAndDiff(rowObj);
            } else {
                if (isIgnored) {
                    rowObj.diff = null;
                } else if (status === "Not Found in Master") {
                    rowObj.diff = billedRate;
                }
            }

            // Apply Reupload overrides
            if (isReuploadAuditRun && item.reuploadFields) {
                const rf = item.reuploadFields;
                
                // Store raw reuploaded strings for validation
                if (item.colIdx_discountPercent !== undefined && item.row[item.colIdx_discountPercent] !== undefined) {
                    rowObj.rawDiscountAppliedStr = String(item.row[item.colIdx_discountPercent]).trim();
                }
                if (item.colIdx_expectedRate !== undefined && item.row[item.colIdx_expectedRate] !== undefined) {
                    rowObj.rawExpectedTariffStr = String(item.row[item.colIdx_expectedRate]).trim();
                }
                if (item.colIdx_tariffRate !== undefined && item.row[item.colIdx_tariffRate] !== undefined) {
                    rowObj.rawTariffRateStr = String(item.row[item.colIdx_tariffRate]).trim();
                }
                if (item.colIdx_socRate !== undefined && item.row[item.colIdx_socRate] !== undefined) {
                    rowObj.rawSocRateStr = String(item.row[item.colIdx_socRate]).trim();
                }
                
                let isOverridden = false;
                let originalTariff = rowObj.expectedTariff;
                let originalDiscount = rowObj.discountApplied;
                let originalExpected = rowObj.expectedDiscountedRate !== null ? rowObj.expectedDiscountedRate : rowObj.expectedTariff;

                let editedDiscount = (rf.discountPercent !== null && !isNaN(rf.discountPercent) && rf.discountPercent !== originalDiscount);
                let editedTariff = (rf.tariffRate !== null && !isNaN(rf.tariffRate) && rf.tariffRate !== originalTariff) || 
                                     (rf.socRate !== null && !isNaN(rf.socRate) && rf.socRate !== originalTariff);
                let editedExpectedDirectly = (rf.expectedRate !== null && !isNaN(rf.expectedRate) && rf.expectedRate !== originalExpected);

                if (editedDiscount) {
                    rowObj.discountApplied = rf.discountPercent;
                    isOverridden = true;
                }

                if (editedTariff) {
                    const newTariff = (rf.tariffRate !== null && !isNaN(rf.tariffRate) && rf.tariffRate !== originalTariff) ? rf.tariffRate : rf.socRate;
                    rowObj.expectedTariff = newTariff;
                    isOverridden = true;
                }

                if (editedTariff || editedDiscount) {
                    // Recalculate default discounted rate based on new base tariff and discount
                    rowObj.expectedDiscountedRate = rowObj.expectedTariff * (1 - rowObj.discountApplied / 100);
                }

                // If user edited Expected Rate directly and it doesn't match the new recalculated expected rate
                if (editedExpectedDirectly) {
                    rowObj.expectedDiscountedRate = rf.expectedRate;
                    isOverridden = true;
                }

                if (isOverridden) {
                    reuploadStats.overridesImported++;
                    // Recompute diff and status after overrides
                    const netExpected = rowObj.expectedDiscountedRate !== null ? rowObj.expectedDiscountedRate : rowObj.expectedTariff;
                    if (netExpected !== null) {
                        rowObj.diff = rowObj.billedRate - netExpected;
                        if (Math.abs(rowObj.diff) < 0.1) {
                            rowObj.status = "Matching";
                        } else if (Math.abs(rowObj.diff) <= 1) {
                            rowObj.status = "Round Off Difference";
                        } else if (rowObj.diff > 0) {
                            rowObj.status = "Overcharged";
                        } else {
                            rowObj.status = "Undercharged";
                        }
                    }
                }

                // 3. Import remarks if any entered
                if (rf.remarks) {
                    rowObj.userRemarks = rf.remarks;
                    rowObj.explanation = rf.remarks;
                    reuploadStats.remarksImported++;
                }

                // 4. Calculate corrected vs pending discrepancies
                const isPreviousException = ["Overcharged", "Undercharged", "Unauthorized Discount", "Not Found in Master"].includes(rf.auditStatus);
                if (isPreviousException) {
                    const isCurrentlyResolved = (rowObj.status === "Matching" || rowObj.status === "Round Off Difference" || rowObj.status.startsWith("Ignored") || rowObj.userRemarks !== "");
                    if (isCurrentlyResolved) {
                        reuploadStats.corrected++;
                    } else {
                        reuploadStats.pending++;
                    }
                }
            }

            auditedRows.push(rowObj);
            });
        }

        // -------------------------------------------------------------
        // ANESTHESIOLOGIST 35% FEE CROSS-VERIFICATION PROCESSOR
        // -------------------------------------------------------------
        const ipGroups = {};
        auditedRows.forEach(row => {
            if (row.isIgnored) return;
            const ip = (row.ipNo || '').trim().toUpperCase();
            if (!ip) return;
            if (!ipGroups[ip]) ipGroups[ip] = [];
            ipGroups[ip].push(row);
        });

        Object.keys(ipGroups).forEach(ip => {
            const group = ipGroups[ip];

            // 1. Identify Anesthesiologist fee rows
            const anesthesiaRows = group.filter(row => {
                const nameUpper = (row.serviceName || '').toUpperCase();
                const code = (row.serviceId || '').replace(/^[a-zA-Z]+-?/, '');
                return code === '2122' || nameUpper.includes('ANAESTHESIOLOGIST FEES') || nameUpper.includes('ANAESTHETIST FEES');
            });

            if (anesthesiaRows.length === 0) return;

            // 2. Identify Surgeon fee rows
            const surgeonRows = group.filter(row => {
                const nameUpper = (row.serviceName || '').toUpperCase();
                const code = (row.serviceId || '').replace(/^[a-zA-Z]+-?/, '');
                return code === '2121' || nameUpper.includes('SURGEON FEES') || nameUpper.includes('SURGERY FEES');
            });

            // 3. Resolve the base surgeon/surgery fee for this case
            let baseSurgeonBilled = 0;
            let baseSurgeonExpected = 0;
            let hasSurgeonFee = false;

            // Try to get rates from Surgeon Fee rows (code 2121)
            surgeonRows.forEach(row => {
                if (row.billedRate > 0) {
                    baseSurgeonBilled += row.billedRate;
                    hasSurgeonFee = true;
                }
                if (row.expectedTariff > 0) {
                    baseSurgeonExpected += row.expectedTariff;
                }
            });

            // If Surgeon Fee is 0 or missing in the bill, look for surgery procedure rows in this case
            if (!hasSurgeonFee || baseSurgeonBilled === 0) {
                const surgeryProcRows = group.filter(row => {
                    const nameUpper = (row.serviceName || '').toUpperCase();
                    const code = (row.serviceId || '').replace(/^[a-zA-Z]+-?/, '');
                    const deptLower = (row.dept || '').toLowerCase();
                    const isOT = code === '2103' || nameUpper.includes('THEATRE') || nameUpper.includes('OT CHARGE');
                    const isAnes = code === '2122' || nameUpper.includes('ANAES') || nameUpper.includes('ANESTH');
                    const isConsumable = deptLower.includes('consumable') || nameUpper.includes('HSN:') || nameUpper.includes('DRUG') || nameUpper.includes('IMPLANT');
                    const isConsult = nameUpper.includes('CONSULTATION') || nameUpper.includes('PAC CHARGE');
                    const isSurgeryWord = nameUpper.includes('SURGERY') || nameUpper.includes('SURGICAL') || nameUpper.includes('OPERATION') || row.rateType === 'Surgery Charges';
                    
                    return isSurgeryWord && !isOT && !isAnes && !isConsumable && !isConsult;
                });

                surgeryProcRows.forEach(row => {
                    baseSurgeonBilled += row.billedRate;
                    if (row.expectedTariff > 0) {
                        baseSurgeonExpected += row.expectedTariff;
                    }
                });
            }

            // If we found a base surgery/surgeon charge, verify anesthesia rows against 35%
            if (baseSurgeonBilled > 0 || baseSurgeonExpected > 0) {
                anesthesiaRows.forEach(row => {
                    const targetAnesBilled = Math.round(baseSurgeonBilled * 0.35);
                    const targetAnesExpected = Math.round(baseSurgeonExpected * 0.35);

                    // Update expected rate for anesthesia if logic says it's 35% of expected surgeon fees
                    if (targetAnesExpected > 0) {
                        row.expectedTariff = targetAnesExpected;
                        row.rawExpectedTariffStr = String(targetAnesExpected);
                        if (row.expectedDiscountedRate !== null) {
                            row.expectedDiscountedRate = targetAnesExpected * (1 - row.discountApplied / 100);
                        }
                    }

                    // Recalculate status and difference with the new expected rate
                    const netExpected = row.expectedDiscountedRate !== null ? row.expectedDiscountedRate : row.expectedTariff;
                    if (netExpected !== null) {
                        row.diff = row.billedRate - netExpected;
                        if (Math.abs(row.diff) < 0.1) {
                            row.status = "Matching";
                        } else if (Math.abs(row.diff) <= 1) {
                            row.status = "Round Off Difference";
                        } else if (row.diff > 0) {
                            row.status = "Overcharged";
                        } else {
                            row.status = "Undercharged";
                        }
                    }

                    // Add detailed verification remark
                    let remark = ` [Anesthesia Audit] Verified 35% rate logic. Surgeon/Surgery Fee: Billed ₹${baseSurgeonBilled} (Expected ₹${baseSurgeonExpected}). Expected Anesthesia (35%): ₹${targetAnesExpected}.`;
                    
                    if (Math.abs(row.billedRate - targetAnesBilled) > 1) {
                        remark += ` ⚠️ Billed Anesthesia ₹${row.billedRate} does not match 35% of Surgeon/Surgery Fee (₹${targetAnesBilled}).`;
                    } else {
                        remark += ` Check Passed: Billed Anesthesia matches 35% of Surgeon/Surgery Fee.`;
                    }
                    
                    row.explanation += remark;
                    row.baseExplanation += remark;
                });
            } else {
                // We found anesthesia charges but no surgeon fee / surgery procedure at all!
                anesthesiaRows.forEach(row => {
                    const remark = ` [Anesthesia Audit] ⚠️ No surgeon fees or surgery procedures found for this case (${ip}). Cannot verify 35% logic.`;
                    row.explanation += remark;
                    row.baseExplanation += remark;
                });
            }
        });

        updateAuditCharts();
        resetAuditBtn();
        updateTabBadges();

        // Update Reupload Summary Banner
        const reuploadBanner = document.getElementById('reupload-summary-banner');
        if (reuploadBanner) {
            if (isReuploadAuditRun) {
                reuploadBanner.style.display = 'block';
                document.getElementById('reupload-corrected-count').textContent = reuploadStats.corrected;
                document.getElementById('reupload-pending-count').textContent = reuploadStats.pending;
                document.getElementById('reupload-remarks-count').textContent = reuploadStats.remarksImported;
                document.getElementById('reupload-overrides-count').textContent = reuploadStats.overridesImported;
            } else {
                reuploadBanner.style.display = 'none';
            }
        }

        updateUIForRole();
    }

    function resetAuditBtn() {
        btnRunAudit.disabled = false;
        btnRunAudit.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/></svg>
            Run Billing Audit
        `;
        let totalCount = auditedRows.length;
        let matchesCount = 0;
        let mismatchesCount = 0;
        let ignoredCount = 0;
        let totalOvercharged = 0;
        const uniqueRooms = new Set();
        const uniqueCases = new Map();

        // Summary calculations variables
        const uniqueBillNos = new Set();
        auditedRows.forEach(row => {
            const billId = String(row.billNo || row.ipNo || '').trim();
            if (billId) uniqueBillNos.add(billId);
        });
        let raisedNos = uniqueBillNos.size > 0 ? uniqueBillNos.size : auditedRows.length;
        let raisedVal = 0;
        
        let verifiedNos = uniqueBillNos.size > 0 ? uniqueBillNos.size : auditedRows.length;
        let verifiedVal = 0;
        
        let shortNos = 0;
        let shortVal = 0;
        
        let excessNos = 0;
        let excessVal = 0;
        
        let notfoundNos = 0;
        let notfoundVal = 0;
        
        let roundNos = 0;
        let roundVal = 0;
        
        let packageNos = 0;
        let packageVal = 0;
        
        let consumablesNos = 0;
        let consumablesVal = 0;
        
        let zeroNos = 0;
        let zeroVal = 0;
        
        let editableNos = 0;
        let editableVal = 0;
        
        let pharmacyNos = 0;
        let pharmacyVal = 0;
        
        let nodiscNos = 0;

        auditedRows.forEach(row => {
            if (row.roomCategory) uniqueRooms.add(row.roomCategory.trim());
            if (row.ipNo) uniqueCases.set(row.ipNo.trim(), row.patientName ? row.patientName.trim() : 'Unknown');
            
            raisedVal += row.billedRate;
            verifiedVal += row.billedRate;

            if (row.status === "Matching") {
                matchesCount++;
                nodiscNos++;
            } else if (row.status === "Overcharged") {
                mismatchesCount++;
                excessNos++;
                excessVal += row.diff;
                if (row.diff !== null) {
                    totalOvercharged += row.diff;
                }
            } else if (row.status === "Undercharged") {
                mismatchesCount++;
                shortNos++;
                shortVal += Math.abs(row.diff);
            } else if (row.status === "Not Found in Master") {
                mismatchesCount++;
                notfoundNos++;
                notfoundVal += row.billedRate;
            } else if (row.status === "Round Off Difference") {
                ignoredCount++;
                roundNos++;
                roundVal += Math.abs(row.diff);
            } else if (row.status === "Ignored (Inside Package)") {
                ignoredCount++;
                packageNos++;
            } else if (row.status === "Ignored (Consumables)") {
                ignoredCount++;
                consumablesNos++;
            } else if (row.status === "Ignored (Zero Rated)") {
                ignoredCount++;
                zeroNos++;
            } else if (row.status === "Ignored (editable)") {
                ignoredCount++;
                editableNos++;
            } else if (row.status === "Ignored (Pharmacy)") {
                ignoredCount++;
                pharmacyNos++;
            }
        });

        // Set top dashboard CFO metrics
        const activeAuditedCount = totalCount - ignoredCount;
        const assuranceRate = activeAuditedCount > 0 ? Math.round((matchesCount / activeAuditedCount) * 100) : 100;
        const auditCoverage = totalCount > 0 ? Math.round(((totalCount - ignoredCount) / totalCount) * 100) : 0;

        document.getElementById('cfo-verification-accuracy').textContent = `${assuranceRate}%`;
        document.getElementById('cfo-compliance-leakage').textContent = '₹' + Math.round(excessVal).toLocaleString('en-IN');
        document.getElementById('cfo-recovery-potential').textContent = '₹' + Math.round(shortVal).toLocaleString('en-IN');
        document.getElementById('cfo-audit-coverage').textContent = `${auditCoverage}%`;

        // Update counts inside the brick filters
        const brickAll = document.getElementById('brick-val-all');
        const brickMatching = document.getElementById('brick-val-matching');
        const brickOvercharged = document.getElementById('brick-val-overcharged');
        const brickUndercharged = document.getElementById('brick-val-undercharged');
        const brickNotfound = document.getElementById('brick-val-notfound');
        const brickIgnored = document.getElementById('brick-val-ignored');
        const brickErrors = document.getElementById('brick-val-errors');

        let errorsNos = 0;
        auditedRows.forEach(row => {
            if (window.hasValidationError(row)) {
                errorsNos++;
            }
        });

        if (brickAll) brickAll.textContent = totalCount.toLocaleString();
        if (brickMatching) brickMatching.textContent = matchesCount.toLocaleString();
        if (brickOvercharged) brickOvercharged.textContent = excessNos.toLocaleString();
        if (brickUndercharged) brickUndercharged.textContent = shortNos.toLocaleString();
        if (brickNotfound) brickNotfound.textContent = notfoundNos.toLocaleString();
        if (brickIgnored) {
            const totalExceptionsNos = roundNos + packageNos + consumablesNos + zeroNos + editableNos + pharmacyNos;
            brickIgnored.textContent = totalExceptionsNos.toLocaleString();
        }
        if (brickErrors) brickErrors.textContent = errorsNos.toLocaleString();

        // Hide empty state and show dashboard layer
        const dbEmpty = document.getElementById('dashboard-empty-state');
        const dbResults = document.getElementById('dashboard-results-area');
        if (dbEmpty) dbEmpty.style.display = 'none';
        if (dbResults) dbResults.style.display = 'flex';

        // Populate summary replica cells
        document.getElementById('sum-raised-nos').textContent = raisedNos.toLocaleString();
        document.getElementById('sum-raised-val').textContent = '₹' + Math.round(raisedVal).toLocaleString('en-IN');
        document.getElementById('sum-verified-nos').textContent = verifiedNos.toLocaleString();
        document.getElementById('sum-verified-val').textContent = '₹' + Math.round(verifiedVal).toLocaleString('en-IN');
        
        document.getElementById('sum-short-nos').textContent = shortNos.toLocaleString();
        document.getElementById('sum-short-val').textContent = '₹' + Math.round(shortVal).toLocaleString('en-IN');
        document.getElementById('sum-excess-nos').textContent = excessNos.toLocaleString();
        document.getElementById('sum-excess-val').textContent = '₹' + Math.round(excessVal).toLocaleString('en-IN');
        document.getElementById('sum-notfound-nos').textContent = notfoundNos.toLocaleString();
        document.getElementById('sum-notfound-val').textContent = '₹' + Math.round(notfoundVal).toLocaleString('en-IN');
        
        document.getElementById('sum-round-nos').textContent = roundNos.toLocaleString();
        document.getElementById('sum-round-val').textContent = '₹' + Math.round(roundVal).toLocaleString('en-IN');
        document.getElementById('sum-package-nos').textContent = packageNos.toLocaleString();
        document.getElementById('sum-package-val').textContent = '₹0';
        document.getElementById('sum-consumables-nos').textContent = consumablesNos.toLocaleString();
        document.getElementById('sum-consumables-val').textContent = '₹0';
        document.getElementById('sum-zero-nos').textContent = zeroNos.toLocaleString();
        document.getElementById('sum-zero-val').textContent = '₹0';
        document.getElementById('sum-editable-nos').textContent = editableNos.toLocaleString();
        document.getElementById('sum-editable-val').textContent = '₹0';
        document.getElementById('sum-pharmacy-nos').textContent = pharmacyNos.toLocaleString();
        document.getElementById('sum-pharmacy-val').textContent = '₹0';

        const totalExceptionsNos = roundNos + packageNos + consumablesNos + zeroNos + editableNos + pharmacyNos;
        document.getElementById('sum-tolexcept-nos').textContent = totalExceptionsNos.toLocaleString();
        document.getElementById('sum-tolexcept-val').textContent = '₹' + Math.round(roundVal).toLocaleString('en-IN');

        document.getElementById('sum-nodisc-nos').textContent = nodiscNos.toLocaleString();
        document.getElementById('sum-nodisc-val').textContent = '—';

        // Audit check verification: verified == short + excess + notfound + exceptions + nodisc
        const totalCategoriesNos = shortNos + excessNos + notfoundNos + totalExceptionsNos + nodiscNos;
        const diffNos = totalCount - totalCategoriesNos;
        
        const checkStatusEl = document.getElementById('sum-check-status');
        if (diffNos === 0) {
            checkStatusEl.innerHTML = '<span class="comparison-badge badge-match">MATCH OK</span>';
        } else {
            checkStatusEl.innerHTML = '<span class="comparison-badge badge-diff">MISMATCH</span>';
        }
        document.getElementById('sum-check-val-diff').textContent = `Deviations: ${diffNos}`;

        // Populate room dropdown
        auditRoomSelect.innerHTML = '<option value="">All Room Categories</option>';
        Array.from(uniqueRooms).sort().forEach(room => {
            if (room) {
                const opt = document.createElement('option');
                opt.value = room;
                opt.textContent = room;
                auditRoomSelect.appendChild(opt);
            }
        });

        // Populate case dropdown
        const auditCaseSelect = document.getElementById('audit-case-select');
        if (auditCaseSelect) {
            auditCaseSelect.innerHTML = `<option value="">All Cases (${uniqueCases.size})</option>`;
            Array.from(uniqueCases.keys()).sort().forEach(ipNo => {
                const opt = document.createElement('option');
                opt.value = ipNo;
                opt.textContent = `${ipNo} (${uniqueCases.get(ipNo)})`;
                auditCaseSelect.appendChild(opt);
            });
        }

        // Show table area
        auditResultsArea.style.display = 'flex';

        // Apply filters
        currentAuditPage = 1;
        applyAuditFiltersAndSort();
    }

    function updateAuditCharts() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e2e8f0' : '#1e293b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

        // 1. Aggregate Customer Counts
        const customerCounts = {};
        auditedRows.forEach(row => {
            const cust = row.customer || 'Unknown Payer';
            customerCounts[cust] = (customerCounts[cust] || 0) + 1;
        });

        const customerLabels = Object.keys(customerCounts);
        const customerData = Object.values(customerCounts);

        // Aggregate Discrepancy Types
        const discrepancyCounts = {
            "Excess Billing": 0,
            "Short Billing": 0,
            "Not in SOC/Templates": 0,
            "Unauthorized Discount": 0
        };

        auditedRows.forEach(row => {
            if (row.status === "Overcharged") {
                discrepancyCounts["Excess Billing"]++;
            } else if (row.status === "Undercharged") {
                discrepancyCounts["Short Billing"]++;
            } else if (row.status === "Not Found in Master") {
                discrepancyCounts["Not in SOC/Templates"]++;
            } else if (row.status === "Unauthorized Discount") {
                discrepancyCounts["Unauthorized Discount"]++;
            }
        });

        const discLabels = Object.keys(discrepancyCounts);
        const discData = Object.values(discrepancyCounts);
        const totalDiscrepancies = discData.reduce((a, b) => a + b, 0);

        // 2. Render / Update Customer Chart
        const ctxCustomers = document.getElementById('chart-customers').getContext('2d');
        if (customerChartInstance) {
            customerChartInstance.destroy();
        }

        customerChartInstance = new Chart(ctxCustomers, {
            type: 'bar',
            data: {
                labels: customerLabels,
                datasets: [{
                    label: 'Rows Checked',
                    data: customerData,
                    backgroundColor: 'rgba(0, 95, 115, 0.85)', // Peacock Green
                    borderColor: '#005f73',
                    borderWidth: 1.5,
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#cbd5e1' : '#334155',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                        title: {
                            display: true,
                            text: 'Number of Rows',
                            color: textColor,
                            font: { size: 10, weight: 'bold' }
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor,
                            callback: function(value, index) {
                                const label = customerLabels[index] || '';
                                return label.length > 20 ? label.substring(0, 18) + '..' : label;
                            }
                        },
                        grid: { display: false }
                    }
                }
            }
        });

        // 3. Render / Update Discrepancy Chart
        const ctxDiscrepancies = document.getElementById('chart-discrepancies').getContext('2d');
        if (discrepancyChartInstance) {
            discrepancyChartInstance.destroy();
        }

        discrepancyChartInstance = new Chart(ctxDiscrepancies, {
            type: 'doughnut',
            data: {
                labels: discLabels,
                datasets: [{
                    data: discData,
                    backgroundColor: [
                        '#8b0000', // Excess Billing: Royal Red
                        '#ca6702', // Short Billing: Amber/Orange
                        '#9b5de5', // Not in SOC/Templates: Purple
                        '#e07a5f'  // Unauthorized Discount: Coral/Orange
                    ],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { size: 11, family: 'Book Antiqua' },
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#cbd5e1' : '#334155',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const val = context.raw || 0;
                                const pct = totalDiscrepancies > 0 ? Math.round((val / totalDiscrepancies) * 100) : 0;
                                return ` ${context.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    window.getRowValidationErrors = function(row) {
        let errs = {};
        const isOpAudit = document.getElementById('audit-type-select')?.value === 'op';

        // Zero-rated or already-ignored rows: suppress all field-level validation.
        // These rows are already excluded from the audit comparison, so rate-format
        // errors are noise (e.g. Kolkata package items billed at ₹0 with 'Included'
        // or 'N/A' in the SOC rate column).
        if (row.isIgnored || row.billedRate === 0) {
            // Only keep mandatory-field check so truly broken rows are still flagged
            if (!row.patientName || !row.ipNo || (!isOpAudit && !row.serviceId)) {
                errs.mandatory = 'Mandatory fields missing.';
            }
            return errs;
        }
        
        // Helper to check numeric format after removing formatting characters (commas, currency, %, spaces)
        const checkNumericFormat = (rawVal) => {
            if (rawVal === undefined || rawVal === null) return true;
            const cleaned = String(rawVal).replace(new RegExp("[₹$,%\\s]", "g"), '').trim();
            if (cleaned === '') return true;
            return new RegExp("^-?[0-9]+(\\.[0-9]+)?$").test(cleaned);
        };

        const getCleanedNumber = (rawVal) => {
            if (rawVal === undefined || rawVal === null) return null;
            const cleaned = String(rawVal).replace(new RegExp("[₹$,%\\s]", "g"), '').trim();
            return cleaned === '' ? null : Number(cleaned);
        };
        
        // Validate Discount Applied
        if (row.rawDiscountAppliedStr !== undefined && row.rawDiscountAppliedStr !== null) {
            const rawVal = String(row.rawDiscountAppliedStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.discount = `Discount % '${rawVal}' contains invalid alphanumeric characters.`;
            } else if (rawVal !== '') {
                const v = getCleanedNumber(rawVal);
                if (v !== null && (v < 0 || v > 100)) {
                    errs.discount = `Discount % must be 0-100 (got ${v}%).`;
                }
            }
        }
        
        // Validate Expected Tariff (Expected Rate)
        if (row.rawExpectedTariffStr !== undefined && row.rawExpectedTariffStr !== null) {
            const rawVal = String(row.rawExpectedTariffStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.expected = `Expected Rate '${rawVal}' contains invalid alphanumeric characters.`;
            }
        }
        
        // Validate Tariff Rate (Base Tariff Rate)
        if (row.rawTariffRateStr !== undefined && row.rawTariffRateStr !== null) {
            const rawVal = String(row.rawTariffRateStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.tariff = `Tariff Rate '${rawVal}' contains invalid alphanumeric characters.`;
            }
        }
        
        // Validate SOC Rate (Base SOC Rate)
        if (row.rawSocRateStr !== undefined && row.rawSocRateStr !== null) {
            const rawVal = String(row.rawSocRateStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.soc = `SOC Rate '${rawVal}' contains invalid alphanumeric characters.`;
            }
        }
        
        // Validate Billed Rate
        if (row.rawBilledRateStr !== undefined && row.rawBilledRateStr !== null) {
            const rawVal = String(row.rawBilledRateStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.billed = `Billed Rate '${rawVal}' contains invalid alphanumeric characters.`;
            }
        }
        
        // Validate Billed Pre-Discount Rate
        if (row.rawBilledPreDiscStr !== undefined && row.rawBilledPreDiscStr !== null) {
            const rawVal = String(row.rawBilledPreDiscStr).trim();
            if (rawVal !== '' && !checkNumericFormat(rawVal)) {
                errs.preDisc = `Billed Pre-Discount Rate '${rawVal}' contains invalid alphanumeric characters.`;
            }
        }
        
        // Mandatory fields check
        if (!row.patientName || !row.ipNo || (!isOpAudit && !row.serviceId) || row.billedRate === null) {
            errs.mandatory = `Mandatory fields missing.`;
        }
        
        return errs;
    };

    window.hasValidationError = function(row) {
        const errs = window.getRowValidationErrors(row);
        return Object.keys(errs).length > 0;
    };

    // Filters for Audit results
    function applyAuditFiltersAndSort() {
        const query = auditSearchInput.value.toLowerCase().trim();
        const status = auditStatusSelect.value;
        const room = auditRoomSelect.value;
        const selectedCase = auditCaseSelect ? auditCaseSelect.value : '';

        filteredAuditData = auditedRows.filter(row => {
            // Text search (matches Patient name, IP No, Bill No, Service ID, Service Name)
            if (query) {
                const pat = (row.patientName || '').toLowerCase();
                const ip = (row.ipNo || '').toLowerCase();
                const bill = (row.billNo || '').toLowerCase();
                const id = (row.serviceId || '').toLowerCase();
                const sname = (row.serviceName || '').toLowerCase();
                if (!pat.includes(query) && !ip.includes(query) && !bill.includes(query) && !id.includes(query) && !sname.includes(query)) {
                    return false;
                }
            }

            // Case filter
            if (selectedCase && row.ipNo !== selectedCase) return false;

            // Room type filter
            if (room && row.roomCategory !== room) return false;

            // Status filter
            if (status !== 'all') {
                if (status === 'discrepancies') {
                    return row.status === "Overcharged" || row.status === "Undercharged" || row.status === "Not Found in Master";
                }
                if (status === 'overcharged') return row.status === "Overcharged";
                if (status === 'undercharged') return row.status === "Undercharged";
                if (status === 'matching') return row.status === "Matching";
                if (status === 'notfound') return row.status === "Not Found in Master";
                if (status === 'ignored') return row.status.startsWith("Ignored") || row.status === "Round Off Difference";
                if (status === 'errors') return window.hasValidationError(row);
            }

            return true;
        });

        sortAuditData();
        renderAuditTable();
    }

    // Sort audited rows array based on column selection
    function sortAuditData() {
        filteredAuditData.sort((a, b) => {
            let valA, valB;
            switch (currentAuditSortColumn) {
                case 'patient':
                    valA = a.patientName || '';
                    valB = b.patientName || '';
                    break;
                case 'id':
                    valA = parseInt(a.serviceId.replace(/[^0-9]/g, ''), 10) || 0;
                    valB = parseInt(b.serviceId.replace(/[^0-9]/g, ''), 10) || 0;
                    break;
                case 'name':
                    valA = a.serviceName || '';
                    valB = b.serviceName || '';
                    break;
                case 'room':
                    valA = a.roomCategory || '';
                    valB = b.roomCategory || '';
                    break;
                case 'billed':
                    valA = Number(a.billedRate);
                    valB = Number(b.billedRate);
                    break;
                case 'expected':
                    valA = a.expectedTariff !== null ? Number(a.expectedTariff) : (currentAuditSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.expectedTariff !== null ? Number(b.expectedTariff) : (currentAuditSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'diff':
                    valA = a.diff !== null ? Number(a.diff) : (currentAuditSortDirection === 'asc' ? Infinity : -Infinity);
                    valB = b.diff !== null ? Number(b.diff) : (currentAuditSortDirection === 'asc' ? Infinity : -Infinity);
                    break;
                case 'diff_pct':
                    {
                        const pctA = (a.expectedTariff && a.expectedTariff > 0) ? (a.diff / a.expectedTariff) * 100 : 0;
                        const pctB = (b.expectedTariff && b.expectedTariff > 0) ? (b.diff / b.expectedTariff) * 100 : 0;
                        valA = pctA;
                        valB = pctB;
                    }
                    break;
                case 'status':
                    valA = a.status || '';
                    valB = b.status || '';
                    break;
                default:
                    valA = a.diff !== null ? Number(a.diff) : 0;
                    valB = b.diff !== null ? Number(b.diff) : 0;
            }
            if (valA < valB) return currentAuditSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentAuditSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Update the sorting indicators in header
    function updateAuditSortHeadersUI() {
        document.querySelectorAll('th[data-asort] .sort-indicator').forEach(indicator => {
            indicator.textContent = '';
        });
        const activeIndicator = document.getElementById(`asort-${currentAuditSortColumn}`);
        if (activeIndicator) {
            activeIndicator.textContent = currentAuditSortDirection === 'asc' ? '▲' : '▼';
        }
    }

    // Render Audit Table page content
    function renderAuditTable() {
        if (filteredAuditData.length === 0) {
            auditTbody.innerHTML = '';
            auditEmptyState.style.display = 'flex';
            auditPageRangeDisplay.textContent = '0-0 of 0';
            auditPaginationButtons.innerHTML = '';
            return;
        }

        auditEmptyState.style.display = 'none';
        const totalRecords = filteredAuditData.length;
        const totalPages = Math.ceil(totalRecords / auditPageSize);
        
        if (currentAuditPage > totalPages) currentAuditPage = totalPages;
        if (currentAuditPage < 1) currentAuditPage = 1;

        const startIndex = (currentAuditPage - 1) * auditPageSize;
        const endIndex = Math.min(startIndex + auditPageSize, totalRecords);

        auditPageRangeDisplay.textContent = `${startIndex + 1}-${endIndex} of ${totalRecords}`;
        const pageData = filteredAuditData.slice(startIndex, endIndex);

        const isEditDisabled = window.currentUserRole === 'Viewer' || workflowStatus === 'Approved' || workflowStatus === 'Saved' || workflowStatus === 'Archived';

        let html = '';
        pageData.forEach(row => {
            let badgeClass = 'badge-match';
            let rowClass = '';
            let diffHtml = '—';
            let diffPctVal = '—';

            // Get validation errors
            const errors = window.getRowValidationErrors(row);
            const hasErr = Object.keys(errors).length > 0;

            if (hasErr) {
                rowClass = 'validation-error-row';
            } else if (row.status === "Overcharged") {
                badgeClass = 'badge-danger';
                rowClass = 'discrepancy-row';
                diffHtml = `+₹${Math.round(row.diff).toLocaleString('en-IN')}`;
                if (row.expectedTariff > 0) {
                    diffPctVal = `+${((row.diff / row.expectedTariff) * 100).toFixed(1)}%`;
                }
            } else if (row.status === "Undercharged") {
                badgeClass = 'badge-diff';
                rowClass = 'discrepancy-row';
                diffHtml = `-₹${Math.round(Math.abs(row.diff)).toLocaleString('en-IN')}`;
                if (row.expectedTariff > 0) {
                    diffPctVal = `-${((Math.abs(row.diff) / row.expectedTariff) * 100).toFixed(1)}%`;
                }
            } else if (row.status.startsWith("Ignored") || row.status === "Round Off Difference") {
                badgeClass = 'badge-gray';
            } else if (row.status === "Not Found in Master") {
                badgeClass = 'badge-danger badge-gray'; 
            }

            // Description HTML (with SOC/Tariff Rate errors if any)
            let descHtml = `<div class="service-name" title="${escapeHtml(row.serviceName)}" style="max-width: 200px;">${escapeHtml(row.serviceName)}</div>`;
            if (errors.soc && !isEditDisabled) {
                descHtml += `
                    <div style="margin-top: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                        <span style="font-size: 0.7rem; color: var(--text-muted);">SOC Rate:</span>
                        <input type="text" class="inline-disc-input input-error" style="width: 65px; text-align: left;" value="${escapeHtml(row.rawSocRateStr)}" onchange="window.updateRowSocRate('${row.uid}', this.value)" onclick="event.stopPropagation()">
                    </div>
                    <div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.1rem; font-weight: 700;">${escapeHtml(errors.soc)}</div>
                `;
            } else if (errors.soc) {
                descHtml += `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700;">SOC Rate: ${escapeHtml(errors.soc)}</div>`;
            }

            if (errors.tariff && !isEditDisabled) {
                descHtml += `
                    <div style="margin-top: 0.25rem; display: flex; align-items: center; gap: 0.25rem;">
                        <span style="font-size: 0.7rem; color: var(--text-muted);">Tariff Rate:</span>
                        <input type="text" class="inline-disc-input input-error" style="width: 65px; text-align: left;" value="${escapeHtml(row.rawTariffRateStr)}" onchange="window.updateRowTariffRate('${row.uid}', this.value)" onclick="event.stopPropagation()">
                    </div>
                    <div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.1rem; font-weight: 700;">${escapeHtml(errors.tariff)}</div>
                `;
            } else if (errors.tariff) {
                descHtml += `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700;">Tariff Rate: ${escapeHtml(errors.tariff)}</div>`;
            }

            // Discount Input HTML
            const rawDiscount = row.rawDiscountAppliedStr !== undefined && row.rawDiscountAppliedStr !== null ? row.rawDiscountAppliedStr : row.discountApplied;
            const discountInputHtml = `
                <input type="text" class="inline-disc-input ${errors.discount ? 'input-error' : ''}" value="${escapeHtml(rawDiscount)}" onclick="event.stopPropagation()" onchange="window.updateRowDiscount('${row.uid}', this.value)" ${isEditDisabled ? 'disabled' : ''}>
                ${errors.discount ? `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; max-width: 90px; word-break: break-all;" title="${escapeHtml(errors.discount)}">${escapeHtml(errors.discount)}</div>` : ''}
            `;

            // Billed Rate HTML
            let billedRateHtml = '';
            if (errors.billed && !isEditDisabled) {
                billedRateHtml = `
                    <input type="text" class="inline-disc-input input-error" style="width: 70px; text-align: right;" value="${escapeHtml(row.rawBilledRateStr)}" onchange="window.updateRowBilledRate('${row.uid}', this.value)" onclick="event.stopPropagation()">
                    <div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; text-align: right; word-break: break-all;">${escapeHtml(errors.billed)}</div>
                `;
            } else {
                billedRateHtml = formatCurrency(row.billedRate);
                if (errors.billed) {
                    billedRateHtml += `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; text-align: right;">${escapeHtml(errors.billed)}</div>`;
                }
            }

            // Billed Pre Discount HTML
            let billedPreDiscHtml = '';
            if (errors.preDisc && !isEditDisabled) {
                billedPreDiscHtml = `
                    <input type="text" class="inline-disc-input input-error" style="width: 70px; text-align: right;" value="${escapeHtml(row.rawBilledPreDiscStr)}" onchange="window.updateRowBilledPreDisc('${row.uid}', this.value)" onclick="event.stopPropagation()">
                    <div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; text-align: right; word-break: break-all;">${escapeHtml(errors.preDisc)}</div>
                `;
            } else {
                billedPreDiscHtml = formatCurrency(row.billedRatePreDiscount);
                if (errors.preDisc) {
                    billedPreDiscHtml += `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; text-align: right;">${escapeHtml(errors.preDisc)}</div>`;
                }
            }

            // Expected Tariff Input HTML
            const rawExpected = row.rawExpectedTariffStr !== undefined && row.rawExpectedTariffStr !== null ? row.rawExpectedTariffStr : (row.expectedTariff !== null ? Math.round(row.expectedTariff) : '');
            const expectedInputHtml = `
                <input type="text" class="inline-disc-input ${errors.expected ? 'input-error' : ''}" style="width: 75px;" value="${escapeHtml(rawExpected)}" onclick="event.stopPropagation()" onchange="window.updateRowTariff('${row.uid}', this.value)" ${isEditDisabled ? 'disabled' : ''}>
                ${errors.expected ? `<div style="color: var(--danger); font-size: 0.65rem; margin-top: 0.2rem; font-weight: 700; max-width: 90px; word-break: break-all;" title="${escapeHtml(errors.expected)}">${escapeHtml(errors.expected)}</div>` : ''}
            `;

            // Result Badge HTML
            let resultBadgeHtml = '';
            if (hasErr) {
                resultBadgeHtml = `<span class="comparison-badge badge-danger">Validation Error</span>`;
            } else {
                resultBadgeHtml = `<span class="comparison-badge ${badgeClass}">${row.status}</span>`;
            }

            html += `
                <tr class="${rowClass} collapsed-card" id="audit-row-${row.uid}">
                    <td class="always-visible" data-label="Patient Info">
                        <div style="font-weight: 700;">${escapeHtml(row.patientName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.ipNo)}</div>
                        ${errors.mandatory ? `<div style="color: var(--danger); font-size: 0.65rem; font-weight: 700; margin-top: 0.15rem;">${escapeHtml(errors.mandatory)}</div>` : ''}
                    </td>
                    <td class="always-visible" data-label="Service Code"><span class="service-id">${row.serviceId}</span></td>
                    <td class="always-visible" data-label="Description">${descHtml}</td>
                    <td data-label="Room Type"><div class="dept-tag" title="${escapeHtml(row.roomCategory)}" style="max-width: 100px;">${escapeHtml(row.roomCategory || 'Others')}</div></td>
                    <td data-label="Discount %" style="text-align: center;">
                        ${discountInputHtml}
                    </td>
                    <td data-label="Billed Rates" class="rate-cell" style="text-align: right; font-family: 'Book Antiqua', serif;">
                        ${billedRateHtml}
                    </td>
                    <td data-label="Billed Pre Disc" class="rate-cell" style="text-align: right; font-family: 'Book Antiqua', serif;">
                        ${billedPreDiscHtml}
                    </td>
                    <td data-label="Tariff" class="rate-cell" style="text-align: right;">
                        ${expectedInputHtml}
                    </td>
                    <td data-label="Difference" class="rate-cell" style="text-align: right; font-weight: 700; font-family: 'Book Antiqua', serif; color: ${row.status === "Overcharged" ? 'var(--danger)' : (row.status === "Undercharged" ? 'var(--warning)' : 'inherit')}">${diffHtml}</td>
                    <td data-label="Diff %" class="rate-cell" style="text-align: right; font-family: 'Book Antiqua', serif; color: ${row.status === "Overcharged" ? 'var(--danger)' : (row.status === "Undercharged" ? 'var(--warning)' : 'inherit')}">${diffPctVal}</td>
                    <td data-label="Audit Results" style="text-align: center;" class="always-visible">${resultBadgeHtml}</td>
                    <td data-label="Details" class="always-visible" style="text-align: center;">
                        <button class="view-btn" onclick="event.stopPropagation(); showAuditDetails('${row.uid}')">
                            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Audit
                        </button>
                    </td>
                    <td data-label="Remarks" style="text-align: center;">
                        <input type="text" class="form-control" style="font-size: 0.8rem; padding: 0.25rem 0.4rem; min-width: 120px;" placeholder="Add remarks..." value="${escapeHtml(row.userRemarks || '')}" onclick="event.stopPropagation()" onchange="window.updateRowRemarks('${row.uid}', this.value)" ${isEditDisabled ? 'disabled' : ''}>
                    </td>
                    <td class="action-cell mobile-only-block" style="display: none;">
                        <button class="card-expand-toggle" onclick="event.stopPropagation(); window.toggleCardExpand('${row.uid}')">View Details</button>
                    </td>
                </tr>
            `;
        });
        auditTbody.innerHTML = html;
        renderAuditPagination(totalPages);
    }

    function renderAuditPagination(totalPages) {
        auditPaginationButtons.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.disabled = currentAuditPage === 1;
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
        prevBtn.addEventListener('click', () => {
            currentAuditPage--;
            renderAuditTable();
            document.querySelector('#panel-audit .table-wrapper').scrollTop = 0;
        });
        auditPaginationButtons.appendChild(prevBtn);

        const pageNumbers = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            pageNumbers.push(1);
            if (currentAuditPage > 3) pageNumbers.push('...');
            const start = Math.max(2, currentAuditPage - 1);
            const end = Math.min(totalPages - 1, currentAuditPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pageNumbers.includes(i)) pageNumbers.push(i);
            }
            if (currentAuditPage < totalPages - 2) pageNumbers.push('...');
            if (!pageNumbers.includes(totalPages)) pageNumbers.push(totalPages);
        }

        pageNumbers.forEach(page => {
            if (page === '...') {
                const dot = document.createElement('span');
                dot.textContent = '...';
                dot.style.padding = '0 0.5rem';
                dot.style.color = 'var(--text-muted)';
                dot.style.fontWeight = '700';
                auditPaginationButtons.appendChild(dot);
            } else {
                const btn = document.createElement('button');
                btn.className = `page-btn ${page === currentAuditPage ? 'active' : ''}`;
                btn.textContent = page;
                btn.addEventListener('click', () => {
                    currentAuditPage = page;
                    renderAuditTable();
                    document.querySelector('#panel-audit .table-wrapper').scrollTop = 0;
                });
                auditPaginationButtons.appendChild(btn);
            }
        });

        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.disabled = currentAuditPage === totalPages;
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
        nextBtn.addEventListener('click', () => {
            currentAuditPage++;
            renderAuditTable();
            document.querySelector('#panel-audit .table-wrapper').scrollTop = 0;
        });
        auditPaginationButtons.appendChild(nextBtn);
    }

    // Modal popup detail for audited row
    function showAuditDetails(uid) {
        const row = auditedRows.find(x => x.uid === uid);
        if (!row) return;

        document.getElementById('modal-title-id').textContent = `MM Bill Audit: Service Code #${row.serviceId}`;

        let statusClass = 'var(--success)';
        let statusBg = 'var(--success-bg)';
        if (row.status === "Overcharged") {
            statusClass = 'var(--danger)';
            statusBg = 'var(--danger-bg)';
        } else if (row.status === "Undercharged") {
            statusClass = 'var(--warning)';
            statusBg = 'var(--warning-bg)';
        } else if (row.status.startsWith("Ignored") || row.status === "Round Off Difference" || row.status === "Not Found in Master") {
            statusClass = 'var(--text-muted)';
            statusBg = 'var(--bg-hover)';
        }

        const netExpected = row.expectedDiscountedRate !== null ? row.expectedDiscountedRate : row.expectedTariff;
        const maxRate = Math.max(row.billedRate || 0, netExpected || 0);
        const billedPct = maxRate > 0 ? Math.round((row.billedRate / maxRate) * 100) : 0;
        const expectedPct = maxRate > 0 ? Math.round((netExpected / maxRate) * 100) : 0;

        let vizHtml = '';
        if (netExpected !== null) {
            vizHtml = `
                <div class="comparison-viz" style="margin-top: 1rem;">
                    <div class="viz-row">
                        <div class="viz-label-price">
                            <span>Billed Net Rate (MM Module)</span>
                            <span>${formatCurrency(row.billedRate)}</span>
                        </div>
                        <div class="viz-bar-container">
                            <div class="viz-bar" id="bar-billed" style="--bar-color: ${row.status === "Overcharged" ? 'var(--danger)' : 'var(--success)'}; font-family: 'Book Antiqua';"></div>
                        </div>
                    </div>
                    <div class="viz-row">
                        <div class="viz-label-price">
                            <span>Expected Net Rate (with Discount)</span>
                            <span>${formatCurrency(netExpected)}</span>
                        </div>
                        <div class="viz-bar-container">
                            <div class="viz-bar" id="bar-expected" style="--bar-color: var(--primary); font-family: 'Book Antiqua';"></div>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => {
                const bBar = document.getElementById('bar-billed');
                const eBar = document.getElementById('bar-expected');
                if (bBar) bBar.style.width = billedPct + '%';
                if (eBar) eBar.style.width = expectedPct + '%';
            }, 100);
        }

        // Fetch comparative rate stepper if code exists in unified tariff master
        const unifiedItem = UNIFIED_TARIFFS.find(x => x.id === row.serviceId);
        let evolutionHtml = '';
        if (unifiedItem) {
            evolutionHtml = generateRateEvolutionHTML(unifiedItem);
        }

        modalContent.innerHTML = `
            <div class="modal-section">
                <div class="modal-section-title">Audit Status</div>
                <div class="discrepancy-card" style="background-color: ${statusBg}; color: ${statusClass};">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    ${row.status}: ${row.explanation}
                </div>
                ${vizHtml}
            </div>
            
            <div class="modal-section">
                <div class="modal-section-title">Billed Item Description</div>
                <div class="modal-name">${escapeHtml(row.serviceName)}</div>
            </div>

            <div class="modal-section">
                <div class="modal-section-title">Patient & Bill Context</div>
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Patient Name</span>
                        <span class="meta-val">${escapeHtml(row.patientName)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">IP Number</span>
                        <span class="meta-val">${escapeHtml(row.ipNo)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Bill Number</span>
                        <span class="meta-val">${escapeHtml(row.billNo)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Billed Room Category</span>
                        <span class="meta-val">${escapeHtml(row.roomCategory || 'Not Specific')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Doctor</span>
                        <span class="meta-val">${escapeHtml(row.doctor || 'REFERRAL')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Department</span>
                        <span class="meta-val">${escapeHtml(row.dept || 'Others')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Agreement/Customer type</span>
                        <span class="meta-val">${escapeHtml(row.customer)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Package Clause</span>
                        <span class="meta-val">${escapeHtml(row.rateType)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Source Billing File</span>
                        <span class="meta-val" style="color: var(--primary); font-weight: bold;">${escapeHtml(row.fileName || 'N/A')}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Billed Rate Pre-Discount</span>
                        <span class="meta-val" style="font-family: 'Book Antiqua';">${row.billedRatePreDiscount !== undefined ? formatCurrency(row.billedRatePreDiscount) : 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Billed Rate Net</span>
                        <span class="meta-val" style="font-family: 'Book Antiqua';">${formatCurrency(row.billedRate)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Base Expected Rate</span>
                        <span class="meta-val" style="font-family: 'Book Antiqua';">${row.expectedTariff !== null ? formatCurrency(row.expectedTariff) : 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Mapped Discount %</span>
                        <span class="meta-val">${row.discountApplied !== undefined ? row.discountApplied + '%' : '0%'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Expected Net Rate</span>
                        <span class="meta-val" style="font-weight: bold; font-family: 'Book Antiqua';">${netExpected !== null ? formatCurrency(netExpected) : 'N/A'}</span>
                    </div>
                </div>
            </div>
            ${evolutionHtml}
            ${formatKolkataRatesHTML(unifiedItem ? unifiedItem.rateKolkata : null)}
        `;
        detailsModal.classList.add('show');
    }

    // Export Audit discrepancies as CSV
    function exportAuditCSV() {
        if (auditedRows.length === 0) {
            alert('No audited data to export!');
            return;
        }

        const exportRows = auditedRows.filter(r => r.status === "Overcharged" || r.status === "Undercharged" || r.status === "Not Found in Master");
        if (exportRows.length === 0) {
            alert('No billing discrepancies found to export! All billed items match tariffs.');
            return;
        }

        let csvContent = '\uFEFF'; 
        const headers = [
            'Source Billing File',
            'Patient Name', 
            'IP Number', 
            'Bill Number', 
            'Service ID', 
            'Service Name', 
            'Department', 
            'Billed Room Category', 
            'Billed Rate Pre Discount (INR)',
            'Billed Rate Net (INR)', 
            'Base Expected Tariff (INR)', 
            'Discount Applied (%)',
            'Expected Net Rate (INR)',
            'Difference (INR)', 
            'Audit Status', 
            'Reason',
            'User Remarks'
        ];
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

        exportRows.forEach(row => {
            const netExpected = row.expectedDiscountedRate !== null ? row.expectedDiscountedRate : row.expectedTariff;
            const csvRow = [
                row.fileName || 'N/A',
                row.patientName,
                row.ipNo,
                row.billNo,
                row.serviceId,
                row.serviceName,
                row.dept,
                row.roomCategory || '',
                row.billedRatePreDiscount !== undefined ? row.billedRatePreDiscount : row.billedRate,
                row.billedRate,
                row.expectedTariff !== null ? row.expectedTariff : 'N/A',
                row.discountApplied !== undefined ? row.discountApplied : 0,
                netExpected !== null ? netExpected : 'N/A',
                row.diff !== null ? row.diff : 'N/A',
                row.status,
                row.explanation,
                row.userRemarks || ''
            ];
            csvContent += csvRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
        });

        triggerDownload(csvContent, 'billing_audit_discrepancies.csv');
    }

    // Export Full Audit log as CSV
    function exportFullAuditCSV() {
        if (auditedRows.length === 0) {
            alert('No audited data to export!');
            return;
        }

        let csvContent = '\uFEFF'; 
        const headers = [
            'Source Billing File',
            'Patient Name', 
            'IP Number', 
            'Bill Number', 
            'Service ID', 
            'Service Name', 
            'Department', 
            'Billed Room Category', 
            'Billed Rate Pre Discount (INR)',
            'Billed Rate Net (INR)', 
            'Base Expected Tariff (INR)', 
            'Discount Applied (%)',
            'Expected Net Rate (INR)',
            'Difference (INR)', 
            'Audit Status', 
            'Reason',
            'User Remarks'
        ];
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

        auditedRows.forEach(row => {
            const netExpected = row.expectedDiscountedRate !== null ? row.expectedDiscountedRate : row.expectedTariff;
            const csvRow = [
                row.fileName || 'N/A',
                row.patientName,
                row.ipNo,
                row.billNo,
                row.serviceId,
                row.serviceName,
                row.dept,
                row.roomCategory || '',
                row.billedRatePreDiscount !== undefined ? row.billedRatePreDiscount : row.billedRate,
                row.billedRate,
                row.expectedTariff !== null ? row.expectedTariff : 'N/A',
                row.discountApplied !== undefined ? row.discountApplied : 0,
                netExpected !== null ? netExpected : 'N/A',
                row.diff !== null ? row.diff : 'N/A',
                row.status,
                row.explanation,
                row.userRemarks || ''
            ];
            csvContent += csvRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
        });

        triggerDownload(csvContent, 'billing_audit_full_log.csv');
    }

    // =========================================================================
    // BRC PHASE 2 AUDIT LIFECYCLE PLATFORM FUNCTIONS
    // =========================================================================

    // 1. Role-Based Access UI Controller
    function updateUIForRole() {
        const role = window.currentUserRole;
        
        // Sync role select value
        const roleSelect = document.getElementById('user-role-select');
        if (roleSelect) roleSelect.value = role;

        const isViewer = role === 'Viewer';
        const isAuditor = role === 'Auditor';
        const isReviewer = role === 'Reviewer';
        const isApprover = role === 'Approver' || role === 'Approval';
        const isAdmin = role === 'Administrator';
        const isGlobalAdmin = isAdmin && window.currentUserUnit === 'all';

        // Dropzone interactions
        if (isViewer) {
            uploadDropzone.style.pointerEvents = 'none';
            uploadDropzone.style.opacity = '0.5';
            btnRemoveFile.disabled = true;
        } else {
            uploadDropzone.style.pointerEvents = 'auto';
            uploadDropzone.style.opacity = '1';
            btnRemoveFile.disabled = false;
        }

        // Action button states
        if (btnRunAudit) btnRunAudit.disabled = isViewer || selectedBillFiles.length === 0;

        const btnDownloadExcel = document.getElementById('btn-download-excel');
        const btnValidate = document.getElementById('btn-validate-audit');
        const btnApprove = document.getElementById('btn-approve-audit');
        const btnSave = document.getElementById('btn-save-audit');

        if (btnDownloadExcel) {
            btnDownloadExcel.disabled = auditedRows.length === 0;
        }

        if (btnValidate) {
            btnValidate.disabled = isViewer || auditedRows.length === 0 || 
                                   ['Approved', 'Saved', 'Archived'].includes(workflowStatus);
        }

        if (btnApprove) {
            const hasApprovePerm = isApprover || isAdmin;
            btnApprove.disabled = !hasApprovePerm || workflowStatus !== 'Validated';
        }

        if (btnSave) {
            btnSave.disabled = isViewer || auditedRows.length === 0;
        }

        // Table Redraw to reflect locked inputs
        if (auditedRows.length > 0) {
            renderAuditTable();
        }

        // Hide/Show delete buttons in repository based on role
        document.querySelectorAll('.btn-repo-delete').forEach(btn => {
            btn.style.display = isAdmin ? 'inline-block' : 'none';
        });

        // Hide/Show clear button in repository based on role
        document.querySelectorAll('.btn-repo-clear').forEach(btn => {
            btn.style.display = isAdmin ? 'flex' : 'none';
        });

        // Dynamic Role-Based Access Enforcement
        const activePermissions = window.rolePermissions[role] || [];
        
        SYSTEM_TABS.forEach(tab => {
            const btn = document.getElementById(tab.id);
            if (btn) {
                let hasPerm = activePermissions.includes(tab.id);
                if (tab.id === 'tab-master-btn' && window.currentUserUnit !== 'all') {
                    hasPerm = false;
                }
                
                if (hasPerm) {
                    btn.classList.remove('disabled-tab');
                    btn.style.display = 'flex';
                } else {
                    btn.classList.add('disabled-tab');
                    if (tab.id === 'tab-admin-btn') {
                        btn.style.display = 'none';
                    } else {
                        btn.style.display = 'flex';
                    }
                }
            }
        });
        
        // If current active tab is hidden, switch back to dashboard (or first authorized tab)
        const activeTabBtn = document.querySelector('.tab-btn.active');
        if (activeTabBtn) {
            const tabId = activeTabBtn.id;
            const hasAccess = activePermissions.includes(tabId) && (tabId !== 'tab-master-btn' || window.currentUserUnit === 'all');
            if (!hasAccess) {
                const fallbackTab = activePermissions.find(tId => {
                    const btn = document.getElementById(tId);
                    return btn && btn.style.display !== 'none';
                }) || 'tab-dashboard-btn';
                const fallbackBtn = document.getElementById(fallbackTab);
                if (fallbackBtn) fallbackBtn.click();
            }
        }
    }

    // 2. Approval Modal handlers
    function showApprovalModal() {
        const modal = document.getElementById('approval-modal');
        if (modal) {
            document.getElementById('approve-by-input').value = '';
            document.getElementById('approve-remarks-input').value = '';
            modal.classList.add('show');
        }
    }

    function closeApprovalModal() {
        const modal = document.getElementById('approval-modal');
        if (modal) modal.classList.remove('show');
    }

    function submitApproval() {
        const approvedBy = document.getElementById('approve-by-input').value.trim();
        const remarks = document.getElementById('approve-remarks-input').value.trim();

        if (!approvedBy || !remarks) {
            alert('Approved By and Comments are mandatory fields.');
            return;
        }

        window.currentApprovalDetails = {
            approvedBy: approvedBy,
            approvedDate: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            remarks: remarks
        };

        workflowStatus = 'Approved';
        updateWorkflowDisplay();
        logHistoryAction('Approved', `Approved by ${approvedBy}. Remarks: ${remarks}`);

        closeApprovalModal();
        updateUIForRole();
    }

    // 3. Validation Button Check
    window.validateAudit = function() {
        if (auditedRows.length === 0) return false;

        let errors = [];
        let missingFields = 0;

        auditedRows.forEach((row, idx) => {
            const rowLabel = `Row ${idx + 1} (Patient: ${row.patientName || 'N/A'}, IP: ${row.ipNo || 'N/A'})`;
            const rowErrs = window.getRowValidationErrors(row);
            
            for (const key in rowErrs) {
                if (key === 'mandatory') {
                    missingFields++;
                } else {
                    errors.push(`${rowLabel}: ${rowErrs[key]}`);
                }
            }
        });

        if (missingFields > 0) {
            errors.push(`Mandatory fields are missing in ${missingFields} records.`);
        }

        const reportBox = document.getElementById('validation-report-box');
        if (reportBox) {
            reportBox.style.display = 'block';
            if (errors.length > 0) {
                reportBox.style.backgroundColor = 'var(--danger-bg)';
                reportBox.style.border = '1px solid var(--danger)';
                reportBox.style.color = 'var(--danger)';
                reportBox.innerHTML = `<strong>Validation Failed:</strong><br>${errors.join('<br>')}`;
                workflowStatus = 'Draft';
                logHistoryAction('Validation Run', `Validation failed with ${errors.length} errors.`);
                updateWorkflowDisplay();
                updateUIForRole();
                return false;
            } else {
                reportBox.style.backgroundColor = 'var(--success-bg)';
                reportBox.style.border = '1px solid var(--success)';
                reportBox.style.color = 'var(--success)';
                reportBox.innerHTML = `<strong>Validation Passed:</strong> No alphanumeric format errors or missing fields detected in numeric cells. Ready for approval/saving.`;
                workflowStatus = 'Validated';
                logHistoryAction('Validated', 'Validation checks completed successfully.');
                updateWorkflowDisplay();
                updateUIForRole();
                return true;
            }
        }

        updateWorkflowDisplay();
        updateUIForRole();
        return errors.length === 0;
    };

    // 4. Save Audit to Database
    window.saveAudit = function() {
        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading saved audits:', e);
        }

        const uniqueBillsSet = new Set();
        auditedRows.forEach(r => {
            const billId = String(r.billNo || r.ipNo || '').trim();
            if (billId) uniqueBillsSet.add(billId);
        });
        const uniqueBillsCount = uniqueBillsSet.size > 0 ? uniqueBillsSet.size : auditedRows.length;

        const existingIdx = db.findIndex(x => x.auditId === currentAuditId);
        const customerVal = document.getElementById('ag-payer-selected')?.textContent || 'General';
        const fileNames = selectedBillFiles.map(f => f.name).join(', ');

        const targetStatus = workflowStatus === 'Approved' ? 'Saved' : workflowStatus;

        // Save manual overrides to customer overrides registry
        let overridesDb = {};
        try {
            const storedOverrides = localStorage.getItem('brc_v2_customer_rate_overrides');
            if (storedOverrides) overridesDb = JSON.parse(storedOverrides);
        } catch (e) {
            console.error('Error loading customer overrides:', e);
        }

        const activeUnit = window.currentUserUnit || 'excelcare';
        auditedRows.forEach(r => {
            if (r.isManuallyOverridden) {
                const custKey = r.customer || 'General';
                const unitKey = r.unit || activeUnit;
                if (!overridesDb[unitKey]) overridesDb[unitKey] = {};
                if (!overridesDb[unitKey][custKey]) overridesDb[unitKey][custKey] = {};
                overridesDb[unitKey][custKey][r.serviceId] = {
                    tariff: r.expectedTariff,
                    discount: r.discountApplied,
                    remarks: r.userRemarks || r.explanation || ''
                };
            }
        });

        try {
            saveAndSyncOverrides(overridesDb);
        } catch (e) {
            console.error('Error saving customer overrides:', e);
        }

        const savedRecord = {
            auditId: currentAuditId,
            uploadDate: new Date().toISOString(),
            businessUnit: auditBuSelect.value,
            customer: customerVal,
            agreement: customerVal,
            sourceFileName: fileNames,
            totalBills: uniqueBillsCount,
            exceptions: auditedRows.filter(r => r.isIgnored || r.status === 'Round Off Difference').length,
            leakage: auditedRows.filter(r => r.status === 'Overcharged').reduce((acc, r) => acc + (r.diff || 0), 0),
            recovery: auditedRows.filter(r => r.status === 'Undercharged').reduce((acc, r) => acc + Math.abs(r.diff || 0), 0),
            status: targetStatus,
            approvedBy: window.currentApprovalDetails ? window.currentApprovalDetails.approvedBy : 'N/A',
            approvedDate: window.currentApprovalDetails ? window.currentApprovalDetails.approvedDate : 'N/A',
            approvalComments: window.currentApprovalDetails ? window.currentApprovalDetails.remarks : 'N/A',
            rows: serializeRows(auditedRows.map(r => [
                r.patientName,                  // 0
                r.ipNo,                         // 1
                r.billNo,                       // 2
                r.serviceId,                    // 3
                r.serviceName,                  // 4
                r.dept,                         // 5
                r.roomCategory,                 // 6
                r.rateType,                     // 7
                r.customer,                     // 8
                r.doctor,                       // 9
                r.billedRatePreDiscount,        // 10
                r.billedRate,                   // 11
                r.expectedTariff,               // 12
                r.discountApplied,              // 13
                r.userRemarks,                  // 14
                r.fileName,                     // 15
                r.isIgnored,                    // 16
                r.isManuallyOverridden || false // 17
            ])),
            versionHistory: window.currentAuditVersionHistory
        };

        if (existingIdx > -1) {
            db[existingIdx] = savedRecord;
        } else {
            db.push(savedRecord);
        }

        try {
            saveAndSyncAudits(db);
            if (workflowStatus === 'Approved') {
                workflowStatus = 'Saved';
            }
            updateWorkflowDisplay();
            logHistoryAction('Saved', `Saved audit run successfully to database with status: ${targetStatus}.`);

            renderRepositoryTable();
            updateDashboardMetrics();
            if (typeof updateCheckingDashboard === 'function') updateCheckingDashboard();
            updateUIForRole();

            if (confirm(`Audit ${currentAuditId} saved successfully as ${targetStatus}!\n\nDo you want to download the final Excel report now?`)) {
                exportAuditExcel();
            }
        } catch (err) {
            console.error(err);
            if (confirm('Failed to save: LocalStorage is full.\n\nWould you like to clear all historical saved audits to free up space and save this audit?')) {
                try {
                    localStorage.removeItem('brc_v2_saved_audits');
                    saveAndSyncAudits([savedRecord]);
                    if (workflowStatus === 'Approved') {
                        workflowStatus = 'Saved';
                    }
                    updateWorkflowDisplay();
                    logHistoryAction('Saved', `Saved audit run successfully to database with status: ${targetStatus} after clearing old cache.`);

                    renderRepositoryTable();
                    updateDashboardMetrics();
                    updateUIForRole();

                    alert(`Repository cleared and Audit ${currentAuditId} saved successfully!`);
                    if (confirm(`Do you want to download the final Excel report now?`)) {
                        exportAuditExcel();
                    }
                } catch (retryErr) {
                    alert('Failed to save: Clearing history did not free enough space. Please check browser settings or upload smaller files.');
                }
            } else {
                alert('Failed to save: LocalStorage is full. Please delete old runs.');
            }
        }
    };

    // Helper Action Timestamps & History Log
    function logHistoryAction(action, details) {
        const timestamp = new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const user = window.currentUserRole;

        let vMajor = 1;
        let vMinor = window.currentAuditVersionHistory.length;
        if (action === 'Approved' || action === 'Saved') {
            vMajor = 1;
            vMinor = 2; // Fixed v1.2 for approved/saved
        }
        const verStr = `Version ${vMajor}.${vMinor}`;

        window.currentAuditVersionHistory.push({
            version: verStr,
            action: action,
            user: user,
            timestamp: timestamp,
            details: details
        });

        renderAuditHistoryTable();
    }

    function renderAuditHistoryTable() {
        const box = document.getElementById('audit-history-box');
        if (!box) return;

        if (window.currentAuditVersionHistory.length === 0) {
            box.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; padding:0.5rem 0;">No history events logged.</div>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem; margin-top: 0.5rem;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight:700;">
                        <th style="padding: 0.35rem 0.5rem;">Version</th>
                        <th style="padding: 0.35rem 0.5rem;">Timestamp</th>
                        <th style="padding: 0.35rem 0.5rem;">Action</th>
                        <th style="padding: 0.35rem 0.5rem;">User Role</th>
                        <th style="padding: 0.35rem 0.5rem;">Details</th>
                    </tr>
                </thead>
                <tbody>
        `;

        window.currentAuditVersionHistory.forEach(h => {
            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.35rem 0.5rem; font-weight:700; color:var(--primary);">${escapeHtml(h.version)}</td>
                    <td style="padding: 0.35rem 0.5rem; color:var(--text-muted);">${escapeHtml(h.timestamp)}</td>
                    <td style="padding: 0.35rem 0.5rem; font-weight:600;">${escapeHtml(h.action)}</td>
                    <td style="padding: 0.35rem 0.5rem; color:var(--text-main); font-weight:600;">${escapeHtml(h.user)}</td>
                    <td style="padding: 0.35rem 0.5rem; color:var(--text-muted);">${escapeHtml(h.details)}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        box.innerHTML = html;
    }

    function updateWorkflowDisplay() {
        const badge = document.getElementById('workflow-status-badge');
        if (badge) {
            badge.textContent = workflowStatus;
            badge.className = 'comparison-badge';
            if (workflowStatus === 'Draft') {
                badge.style.backgroundColor = 'var(--primary-bg)';
                badge.style.color = 'var(--primary)';
            } else if (workflowStatus === 'Validated') {
                badge.style.backgroundColor = 'var(--info-bg)';
                badge.style.color = 'var(--info)';
            } else if (workflowStatus === 'Approved') {
                badge.style.backgroundColor = '#fae8ff';
                badge.style.color = '#d946ef';
            } else if (workflowStatus === 'Saved') {
                badge.style.backgroundColor = 'var(--success-bg)';
                badge.style.color = 'var(--success)';
            }
        }

        const approveDetailsBox = document.getElementById('approval-details-box');
        if (approveDetailsBox) {
            if (['Approved', 'Saved'].includes(workflowStatus)) {
                approveDetailsBox.style.display = 'flex';
                document.getElementById('approval-display-by').textContent = window.currentApprovalDetails?.approvedBy || '--';
                document.getElementById('approval-display-date').textContent = window.currentApprovalDetails?.approvedDate || '--';
                document.getElementById('approval-display-comments').textContent = window.currentApprovalDetails?.remarks || '--';
            } else {
                approveDetailsBox.style.display = 'none';
            }
        }
    }

    // 5. Preservation-Based Excel Exporter Appending Audit Columns
    function exportAuditExcel() {
        if (auditedRows.length === 0) {
            alert('No audited data to export!');
            return;
        }

        const useOriginal = Object.keys(originalUploadedFilesRowsMap).length > 0;
        const sourceMap = useOriginal ? originalUploadedFilesRowsMap : uploadedFilesRowsMap;
        const fileNames = Object.keys(sourceMap);

        if (fileNames.length === 0) {
            exportFullAuditCSV(); // Fallback
            return;
        }

        const wb = XLSX.utils.book_new();

        // 12 standard audit columns mapping rules
        const auditColsRules = [
            { key: 'matchedservicecode', header: 'Matched Service Code', valFunc: r => r.serviceId || '', keys: ['matchedservicecode', 'matchedservice'] },
            { key: 'socrate', header: 'SOC Rate', valFunc: r => r.expectedTariff !== null ? r.expectedTariff : '', keys: ['socrate'] },
            { key: 'tariffrate', header: 'Tariff Rate', valFunc: r => r.expectedTariff !== null ? r.expectedTariff : '', keys: ['tariffrate', 'tariff', 'tariffrate'] },
            { key: 'discountpercent', header: 'Discount %', valFunc: r => r.discountApplied !== undefined ? r.discountApplied : 0, keys: ['discount%', 'discount', 'discountapplied'] },
            { key: 'expectedrate', header: 'Expected Rate', valFunc: r => {
                const netExpected = r.expectedDiscountedRate !== null ? r.expectedDiscountedRate : r.expectedTariff;
                return netExpected !== null ? netExpected : '';
            }, keys: ['expectedrate', 'expectedtariff'] },
            { key: 'variance', header: 'Variance', valFunc: r => r.diff !== null ? r.diff : '', keys: ['variance'] },
            { key: 'variancepercent', header: 'Variance %', valFunc: r => {
                const netExpected = r.expectedDiscountedRate !== null ? r.expectedDiscountedRate : r.expectedTariff;
                const variance = r.diff !== null ? r.diff : 0;
                if (netExpected && netExpected !== 0) {
                    return ((variance / netExpected) * 100).toFixed(1) + '%';
                } else if (r.expectedTariff && r.expectedTariff !== 0) {
                    return ((variance / r.expectedTariff) * 100).toFixed(1) + '%';
                }
                return '0%';
            }, keys: ['variance%', 'variancepercent'] },
            { key: 'auditstatus', header: 'Audit Status', valFunc: r => r.status || '', keys: ['auditstatus', 'status'] },
            { key: 'exceptioncategory', header: 'Exception Category', valFunc: r => r.isIgnored ? r.status : '', keys: ['exceptioncategory', 'exception'] },
            { key: 'validationstatus', header: 'Validation Status', valFunc: r => workflowStatus, keys: ['validationstatus', 'validation'] },
            { key: 'approvalstatus', header: 'Approval Status', valFunc: r => window.currentApprovalDetails ? 'Approved' : 'Pending', keys: ['approvalstatus', 'approval'] },
            { key: 'remarks', header: 'Remarks', valFunc: r => r.userRemarks || '', keys: ['remarks', 'userremarks', 'comments'] }
        ];

        fileNames.forEach(fn => {
            const data = sourceMap[fn];
            const originalRows = data.rows;
            const headerRowIdx = data.headerRowIdx;
            const colMap = data.colMapping || {};

            const exportRows = [];
            const auditedMap = {};
            auditedRows.filter(r => r.fileName === fn || revisedToOriginalFileMap[r.fileName] === fn).forEach(r => {
                auditedMap[r.rowIndex] = r;
            });

            // Find maximum length of any row in the original sheet
            let maxOrigLen = 0;
            originalRows.forEach(r => {
                if (r && r.length > maxOrigLen) {
                    maxOrigLen = r.length;
                }
            });

            // Determine target index for each of the 12 audit columns (reuse index if it exists in colMap, else append)
            let nextAppendIdx = maxOrigLen;
            const targetCols = auditColsRules.map(col => {
                let idx = -1;
                for (let k of col.keys) {
                    if (colMap[k] !== undefined) {
                        idx = colMap[k];
                        break;
                    }
                }
                if (idx === -1) {
                    idx = nextAppendIdx;
                    nextAppendIdx++;
                }
                return { header: col.header, valFunc: col.valFunc, index: idx };
            });

            // Find max index we will write to, to size each row array properly
            let maxWriteIdx = maxOrigLen;
            targetCols.forEach(tc => {
                if (tc.index > maxWriteIdx) {
                    maxWriteIdx = tc.index;
                }
            });

            originalRows.forEach((rowArray, rIdx) => {
                const newRow = [...rowArray];

                // Pad the row so it has enough elements to write all target audit columns without holes
                while (newRow.length <= maxWriteIdx) {
                    newRow.push('');
                }

                if (rIdx === headerRowIdx) {
                    // Overwrite the headers at their target indices
                    targetCols.forEach(tc => {
                        newRow[tc.index] = tc.header;
                    });
                } else if (rIdx > headerRowIdx) {
                    const audRow = auditedMap[rIdx];
                    if (audRow) {
                        // Overwrite/Write audit values at target indices
                        targetCols.forEach(tc => {
                            newRow[tc.index] = tc.valFunc(audRow);
                        });
                    } else {
                        // Pad audit indices with empty strings for non-audited rows
                        targetCols.forEach(tc => {
                            newRow[tc.index] = '';
                        });
                    }
                } else {
                    // Pad audit indices with empty strings for metadata rows above header
                    targetCols.forEach(tc => {
                        newRow[tc.index] = '';
                    });
                }

                exportRows.push(newRow);
            });

            const ws = XLSX.utils.aoa_to_sheet(exportRows);
            let sheetName = fn.replace(/\.xlsx?$/i, '').substring(0, 30).replace(/[\[\]\*\?\/\\:]/g, '_');
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, `${currentAuditId || 'billing_audit'}_output.xlsx`);
    }

    // 6. Audit Repository Manager
    window.filterRepository = function() {
        renderRepositoryTable();
    };

    function renderRepositoryTable() {
        const tbody = document.getElementById('repo-tbody');
        if (!tbody) return;

        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        const buFilter = document.getElementById('repo-filter-bu').value;
        const statusFilter = document.getElementById('repo-filter-status').value;
        const monthFilter = document.getElementById('repo-filter-month').value;
        const yearFilter = document.getElementById('repo-filter-year').value;
        const searchCust = document.getElementById('repo-search-customer').value.toLowerCase().trim();

        let filtered = db;
        if (window.currentUserUnit && window.currentUserUnit !== 'all') {
            filtered = filtered.filter(x => x.businessUnit === window.currentUserUnit);
        }

        if (buFilter !== 'all') {
            filtered = filtered.filter(x => x.businessUnit === buFilter);
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(x => x.status === statusFilter);
        }
        if (monthFilter !== 'all') {
            filtered = filtered.filter(x => {
                const date = new Date(x.uploadDate);
                const m = String(date.getMonth() + 1).padStart(2, '0');
                return m === monthFilter;
            });
        }
        if (yearFilter !== 'all') {
            filtered = filtered.filter(x => {
                const date = new Date(x.uploadDate);
                return String(date.getFullYear()) === yearFilter;
            });
        }
        if (searchCust) {
            filtered = filtered.filter(x => (x.customer || '').toLowerCase().includes(searchCust));
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 3rem;">No matching saved audits found.</td></tr>';
            return;
        }

        const isAdmin = window.currentUserRole === 'Administrator';
        let html = '';
        filtered.forEach(x => {
            const date = new Date(x.uploadDate);
            const dateStr = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 1rem; font-weight:700; color:var(--text-main);">${escapeHtml(x.auditId)}</td>
                    <td style="padding: 1rem; color:var(--text-muted); font-size:0.8rem;">${dateStr}</td>
                    <td style="padding: 1rem; text-transform: capitalize;">${escapeHtml(x.businessUnit)}</td>
                    <td style="padding: 1rem; font-weight:600;">${escapeHtml(x.customer)}</td>
                    <td style="padding: 1rem; text-align:right;">${x.totalBills.toLocaleString()}</td>
                    <td style="padding: 1rem; text-align:right; color:var(--warning); font-weight:600;">${x.exceptions.toLocaleString()}</td>
                    <td style="padding: 1rem;"><span class="comparison-badge badge-match">${escapeHtml(x.status)}</span></td>
                    <td style="padding: 1rem; font-weight:600;">${escapeHtml(x.approvedBy)}</td>
                    <td style="padding: 1rem; color:var(--text-muted); font-size:0.8rem;">${escapeHtml(x.approvedDate)}</td>
                    <td style="padding: 1rem; text-align:center;">
                        <button class="view-btn" onclick="window.loadSavedAudit('${x.auditId}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            Load
                        </button>
                        <button class="view-btn btn-repo-delete" onclick="window.deleteSavedAudit('${x.auditId}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background-color: var(--danger-bg); color: var(--danger); border-color: var(--danger); display: ${isAdmin ? 'inline-block' : 'none'}; margin-left: 0.25rem;">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    window.loadSavedAudit = function(auditId) {
        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        const record = db.find(x => x.auditId === auditId);
        if (!record) {
            alert('Saved audit record not found.');
            return;
        }

        // Map rows back to objects, supporting flat string, array format, and legacy object format
        auditedRows = getSavedRecordRows(record);

        currentAuditId = record.auditId;
        workflowStatus = record.status;
        window.currentApprovalDetails = {
            approvedBy: record.approvedBy,
            approvedDate: record.approvedDate,
            remarks: record.approvalComments
        };
        window.currentAuditVersionHistory = record.versionHistory || [];

        // Update workflow action bar display
        document.getElementById('workflow-audit-id-display').textContent = `Audit ID: ${currentAuditId}`;
        document.getElementById('workflow-meta-info').textContent = `Loaded from repository | BU: ${record.businessUnit.toUpperCase()} | Files: ${record.sourceFileName}`;
        document.getElementById('validation-report-box').style.display = 'none';

        updateWorkflowDisplay();
        renderAuditHistoryTable();

        // Switch to Bill Audit tab
        const desktopBtn = document.getElementById('tab-audit-btn');
        if (desktopBtn) desktopBtn.click();

        // Show table
        auditResultsArea.style.display = 'flex';
        applyAuditFiltersAndSort();
        updateUIForRole();
    };

    window.deleteSavedAudit = function(auditId) {
        if (window.currentUserRole !== 'Administrator') {
            alert('Only Administrators can delete repository audits.');
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete Audit ${auditId} from the repository?`)) {
            return;
        }

        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        const filtered = db.filter(x => x.auditId !== auditId);
        saveAndSyncAudits(filtered);

        renderRepositoryTable();
        updateDashboardMetrics();
    };

    window.clearAllSavedAudits = function() {
        if (window.currentUserRole !== 'Administrator') {
            alert('Only Administrators can clear the database repository.');
            return;
        }
        if (confirm('Are you sure you want to permanently clear ALL saved audits from the repository database? This action cannot be undone.')) {
            localStorage.removeItem('brc_v2_saved_audits');
            syncDatabaseToServer([]);
            renderRepositoryTable();
            updateDashboardMetrics();
            alert('Repository database cleared successfully.');
        }
    };

    // 7. Reports Sub-tab Navigation
    let activeReportsSubtab = 'mtdytd';
    window.switchReportsSubtab = function(subtab) {
        activeReportsSubtab = subtab;
        
        document.querySelectorAll('.ag-subtab-btn').forEach(btn => {
            if (btn.id === `rep-subtab-${subtab}`) {
                btn.style.backgroundColor = 'var(--primary-bg)';
                btn.style.color = 'var(--primary)';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text-muted)';
            }
        });

        document.querySelectorAll('.rep-sub-area').forEach(area => {
            area.style.display = (area.id === `rep-area-${subtab}`) ? 'flex' : 'none';
        });

        if (subtab === 'mtdytd') {
            updateMTDAndYTDMetrics();
        } else if (subtab === 'party') {
            window.renderPartyReport();
        } else if (subtab === 'bill') {
            window.renderBillVerificationReport();
        }
    };

    function renderReportsPanel() {
        window.switchReportsSubtab(activeReportsSubtab);

        const emptyState = document.getElementById('reports-empty-state');
        const resultsArea = document.getElementById('reports-results-area');
        
        if (!emptyState || !resultsArea) return;

        if (auditedRows.length === 0) {
            emptyState.style.display = 'flex';
            resultsArea.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        resultsArea.style.display = 'flex';

        let totalCount = auditedRows.length;
        let matchesCount = auditedRows.filter(r => r.status === "Matching").length;
        let leakageVal = auditedRows.filter(r => r.status === "Overcharged").reduce((acc, r) => acc + (r.diff || 0), 0);
        let shortVal = auditedRows.filter(r => r.status === "Undercharged").reduce((acc, r) => acc + Math.abs(r.diff || 0), 0);
        let exceptionsCount = auditedRows.filter(r => r.isIgnored || r.status === "Round Off Difference").length;

        const activeAuditedCount = totalCount - exceptionsCount;
        const accuracyRate = activeAuditedCount > 0 ? Math.round((matchesCount / activeAuditedCount) * 100) : 100;
        const exceptionsRate = totalCount > 0 ? Math.round((exceptionsCount / totalCount) * 100) : 0;

        document.getElementById('report-accuracy-rate').textContent = accuracyRate + "%";
        document.getElementById('report-leakage-rate').textContent = "₹" + Math.round(leakageVal).toLocaleString('en-IN');
        document.getElementById('report-short-billed').textContent = "₹" + Math.round(shortVal).toLocaleString('en-IN');
        document.getElementById('report-exceptions-rate').textContent = exceptionsRate + "%";
    }

    function updateMTDAndYTDMetrics() {
        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        // MTD Filter (Audits uploaded in current month/year)
        const mtdAudits = db.filter(x => {
            const date = new Date(x.uploadDate);
            return date.getMonth() === curMonth && date.getFullYear() === curYear;
        });

        // YTD Filter (Audits uploaded in current year)
        const ytdAudits = db.filter(x => {
            const date = new Date(x.uploadDate);
            return date.getFullYear() === curYear;
        });

        // Compute MTD
        let mtdBills = 0, mtdValue = 0, mtdExceptions = 0, mtdLeakage = 0, mtdApproved = 0;
        mtdAudits.forEach(x => {
            mtdBills += x.totalBills;
            mtdExceptions += x.exceptions;
            mtdLeakage += x.leakage;
            if (['Approved', 'Saved'].includes(x.status)) mtdApproved++;
            
            // Sum billing value from raw rows if saved
            const rows = getSavedRecordRows(x);
            rows.forEach(r => { mtdValue += (r.billedRate || 0); });
        });

        // Compute YTD
        let ytdAuditsCount = ytdAudits.length;
        let ytdBills = 0, ytdRevenue = 0, ytdExceptions = 0, ytdRecovery = 0;
        ytdAudits.forEach(x => {
            ytdBills += x.totalBills;
            ytdExceptions += x.exceptions;
            ytdRecovery += x.recovery;
            const rows = getSavedRecordRows(x);
            rows.forEach(r => { ytdRevenue += (r.billedRate || 0); });
        });

        // Update MTD DOM Elements
        document.getElementById('mtd-bills-audited').textContent = mtdBills.toLocaleString();
        document.getElementById('mtd-audit-value').textContent = `₹${Math.round(mtdValue).toLocaleString('en-IN')}`;
        document.getElementById('mtd-exceptions').textContent = mtdExceptions.toLocaleString();
        document.getElementById('mtd-leakage').textContent = `₹${Math.round(mtdLeakage).toLocaleString('en-IN')}`;
        document.getElementById('mtd-approved').textContent = mtdApproved.toLocaleString();

        // Update YTD DOM Elements
        document.getElementById('ytd-total-audits').textContent = ytdAuditsCount.toLocaleString();
        document.getElementById('ytd-bills-audited').textContent = ytdBills.toLocaleString();
        document.getElementById('ytd-revenue-audited').textContent = `₹${Math.round(ytdRevenue).toLocaleString('en-IN')}`;
        document.getElementById('ytd-exceptions').textContent = ytdExceptions.toLocaleString();
        document.getElementById('ytd-recovery').textContent = `₹${Math.round(ytdRecovery).toLocaleString('en-IN')}`;
    }

    // Party-wise Compliance Summary Report
    window.renderPartyReport = function() {
        const tbody = document.getElementById('party-report-tbody');
        if (!tbody) return;

        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        const typeFilter = document.getElementById('party-type-filter').value;

        // Group rows across all saved audits by payer
        const partyMap = {};
        db.forEach(x => {
            const rows = getSavedRecordRows(x);
            rows.forEach(row => {
                const payer = row.customer || 'General';
                
                // Classify category
                const cleanP = payer.toUpperCase();
                let category = 'Corporate';
                if (cleanP.includes('INSURANCE') || cleanP.includes('HEALTH') || cleanP.includes('TATA AIG') || cleanP.includes('SBI GENERAL')) {
                    category = 'Insurance Company';
                } else if (cleanP.includes('TPA') || cleanP.includes('MEDI ASSIST') || cleanP.includes('MDINDIA') || cleanP.includes('VIDAL')) {
                    category = 'TPA';
                } else if (cleanP.includes('GOVT') || cleanP.includes('RAILWAY') || cleanP.includes('ONGC') || cleanP.includes('ECHS')) {
                    category = 'State Govt. Organization';
                }

                if (!partyMap[payer]) {
                    partyMap[payer] = {
                        name: payer,
                        category: category,
                        billsAudited: 0,
                        exceptions: 0,
                        leakage: 0,
                        recovery: 0,
                        status: x.status
                    };
                }

                const entry = partyMap[payer];
                entry.billsAudited++;
                if (row.isIgnored || row.status === 'Round Off Difference') {
                    entry.exceptions++;
                }
                if (row.status === 'Overcharged') {
                    entry.leakage += (row.diff || 0);
                } else if (row.status === 'Undercharged') {
                    entry.recovery += Math.abs(row.diff || 0);
                }
            });
        });

        let list = Object.values(partyMap);
        if (typeFilter !== 'all') {
            list = list.filter(x => x.category === typeFilter);
        }

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">No party compliance records compiled.</td></tr>';
            return;
        }

        let html = '';
        list.forEach(x => {
            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.8rem 1rem; font-weight:700; color:var(--text-main);">${escapeHtml(x.name)}</td>
                    <td style="padding: 0.8rem 1rem; color:var(--text-muted); font-size:0.85rem;">${escapeHtml(x.category)}</td>
                    <td style="padding: 0.8rem 1rem; text-align:right; font-weight:600;">${x.billsAudited.toLocaleString()}</td>
                    <td style="padding: 0.8rem 1rem; text-align:right; color:var(--warning); font-weight:600;">${x.exceptions.toLocaleString()}</td>
                    <td style="padding: 0.8rem 1rem; text-align:right; color:var(--danger); font-weight:600;">₹${Math.round(x.leakage).toLocaleString('en-IN')}</td>
                    <td style="padding: 0.8rem 1rem; text-align:right; color:var(--info); font-weight:600;">₹${Math.round(x.recovery).toLocaleString('en-IN')}</td>
                    <td style="padding: 0.8rem 1rem; text-align:center;"><span class="comparison-badge badge-match">${escapeHtml(x.status)}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    };

    // Bill-wise Verification Report Grid
    window.renderBillVerificationReport = function() {
        const tbody = document.getElementById('bill-report-tbody');
        if (!tbody) return;

        if (auditedRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">No audited rows found. Please run or load a saved audit first.</td></tr>';
            return;
        }

        const query = document.getElementById('report-bill-search').value.toLowerCase().trim();

        let filtered = auditedRows;
        if (query) {
            filtered = filtered.filter(r => {
                const bill = (r.billNo || '').toLowerCase();
                const pat = (r.patientName || '').toLowerCase();
                const uhid = (r.ipNo || '').toLowerCase();
                const desc = (r.serviceName || '').toLowerCase();
                const code = (r.serviceId || '').toLowerCase();
                return bill.includes(query) || pat.includes(query) || uhid.includes(query) || desc.includes(query) || code.includes(query);
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 3rem;">No matching transactions found.</td></tr>';
            return;
        }

        let html = '';
        filtered.forEach(r => {
            let badgeClass = 'badge-match';
            let diffHtml = '—';

            if (r.status === 'Overcharged') {
                badgeClass = 'badge-danger';
                diffHtml = `+₹${Math.round(r.diff)}`;
            } else if (r.status === 'Undercharged') {
                badgeClass = 'badge-diff';
                diffHtml = `-₹${Math.round(Math.abs(r.diff))}`;
            } else if (r.isIgnored) {
                badgeClass = 'badge-gray';
            }

            const expectedRate = r.expectedDiscountedRate !== null ? r.expectedDiscountedRate : (r.expectedTariff !== null ? r.expectedTariff : 0);

            html += `
                <tr style="border-bottom: 1px solid var(--border); font-size:0.82rem;">
                    <td style="padding: 0.75rem 1rem; font-weight:700;">${escapeHtml(r.billNo)}</td>
                    <td style="padding: 0.75rem 1rem;">
                        <div style="font-weight: 600;">${escapeHtml(r.patientName)}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(r.ipNo)}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem;">
                        <span class="service-id">${escapeHtml(r.serviceId)}</span>
                        <div style="font-size:0.75rem; color:var(--text-muted); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(r.serviceName)}">${escapeHtml(r.serviceName)}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; text-align:right; font-family: 'Book Antiqua', serif;">${formatCurrency(r.billedRate)}</td>
                    <td style="padding: 0.75rem 1rem; text-align:right; font-family: 'Book Antiqua', serif;">${formatCurrency(expectedRate)}</td>
                    <td style="padding: 0.75rem 1rem; text-align:right; font-weight:600; color:${r.status === 'Overcharged' ? 'var(--danger)' : (r.status === 'Undercharged' ? 'var(--warning)' : 'inherit')}">${diffHtml}</td>
                    <td style="padding: 0.75rem 1rem; text-align:center;"><span class="comparison-badge ${badgeClass}">${escapeHtml(r.status)}</span></td>
                    <td style="padding: 0.75rem 1rem; text-align:center;"><span class="comparison-badge badge-match">${workflowStatus}</span></td>
                    <td style="padding: 0.75rem 1rem; color:var(--text-muted); font-size:0.75rem; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(r.userRemarks || '')}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    };

    window.exportReportsExcel = function() {
        if (auditedRows.length === 0) return;

        const wb = XLSX.utils.book_new();
        const headers = [
            'Bill Number', 'Patient Name', 'IP/UHID', 'Service Code', 
            'Service Description', 'Billed Rate', 'Expected Rate', 
            'Variance', 'Audit Status', 'Approval Status', 'Remarks'
        ];

        const dataRows = [headers];
        auditedRows.forEach(r => {
            const expected = r.expectedDiscountedRate !== null ? r.expectedDiscountedRate : (r.expectedTariff !== null ? r.expectedTariff : 0);
            dataRows.push([
                r.billNo || '',
                r.patientName || '',
                r.ipNo || '',
                r.serviceId || '',
                r.serviceName || '',
                r.billedRate || 0,
                expected || 0,
                r.diff || 0,
                r.status || '',
                workflowStatus,
                r.userRemarks || ''
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(dataRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Verification Report');
        XLSX.writeFile(wb, `bill_verification_report_${currentAuditId || 'billing'}.xlsx`);
    };

    window.printReportPDF = function() {
        window.print();
    };

    // 8. Main Dashboard Refresh & Dynamic Metrics Updates
    window.refreshDashboardData = function() {
        const btn = document.getElementById('btn-refresh-dashboard');
        const icon = document.getElementById('refresh-icon');
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Syncing...';
        }
        if (icon) icon.style.animation = 'spin 1s linear infinite';

        setTimeout(() => {
            // Recalculate everything
            calculateMetrics();
            updateDatabaseDashboard();
            updateDashboardMetrics();
            
            // Set refresh timestamp label
            const now = new Date();
            const timeStr = now.toLocaleDateString('en-IN') + ' ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const lastRefreshEl = document.getElementById('last-refresh-time');
            if (lastRefreshEl) lastRefreshEl.textContent = `Last Refreshed On: ${timeStr}`;

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" id="refresh-icon"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Refresh Data
                `;
            }
            if (icon) icon.style.animation = 'none';
        }, 1200);
    };

    function updateDashboardMetrics() {
        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {}

        if (window.currentUserUnit && window.currentUserUnit !== 'all') {
            db = db.filter(x => x.businessUnit === window.currentUserUnit);
        }

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();

        const curMonthAudits = db.filter(x => {
            const date = new Date(x.uploadDate);
            return date.getMonth() === curMonth && date.getFullYear() === curYear;
        });

        const curYearAudits = db.filter(x => {
            const date = new Date(x.uploadDate);
            return date.getFullYear() === curYear;
        });

        // Helper to set text content safely if element exists
        const setSafeText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        // 1. Conducted Count
        setSafeText('kpi-total-audits', db.length.toLocaleString());

        // 2. Pending Validation (Draft state)
        const pendingValCount = db.filter(x => x.status === 'Draft').length;
        setSafeText('kpi-pending-validation', pendingValCount.toLocaleString());

        // 3. Pending Approval (Validated state)
        const pendingAppCount = db.filter(x => x.status === 'Validated').length;
        setSafeText('kpi-pending-approval', pendingAppCount.toLocaleString());

        // 4. Approved
        const approvedCount = db.filter(x => ['Approved', 'Saved'].includes(x.status)).length;
        setSafeText('kpi-approved-audits', approvedCount.toLocaleString());

        // 5. Leakage Identified
        const totalLeakageVal = db.reduce((acc, x) => acc + (x.leakage || 0), 0);
        setSafeText('kpi-leakage-identified', `₹${Math.round(totalLeakageVal).toLocaleString('en-IN')}`);

        // 6. Recovery Potential
        const totalRecoveryVal = db.reduce((acc, x) => acc + (x.recovery || 0), 0);
        setSafeText('kpi-recovery-potential', `₹${Math.round(totalRecoveryVal).toLocaleString('en-IN')}`);

        // 7 & 8. Exceptions Month & Year
        const mExceptions = curMonthAudits.reduce((acc, x) => acc + (x.exceptions || 0), 0);
        setSafeText('kpi-month-exceptions', mExceptions.toLocaleString());

        const yExceptions = curYearAudits.reduce((acc, x) => acc + (x.exceptions || 0), 0);
        setSafeText('kpi-year-exceptions', yExceptions.toLocaleString());
    }

    // Bind refresh button click on startup
    setTimeout(() => {
        document.getElementById('btn-refresh-dashboard')?.addEventListener('click', window.refreshDashboardData);
        window.refreshDashboardData(); // Initial refresh timestamp and metrics load
        renderRepositoryTable(); // Init repo table values
        updateUIForRole(); // Initialize active role visuals
    }, 500);

    function getAgreementScope(ag) {
        const nameUpper = ag.agreementName.toUpperCase();
        const tariffUpper = ag.tariffMapped.toUpperCase();
        const locUpper = (ag.locations || '').toUpperCase();
        
        if (locUpper.includes("KOLKATA") || tariffUpper.includes("KOLKATA")) {
            return "kolkata";
        }
        if (nameUpper.includes("HDFC") || tariffUpper.includes("EXCELCARE")) {
            return "excelcare";
        }
        if (
            nameUpper.includes("ADITYA BIRLA") || 
            nameUpper.includes("BAJAJ ALLIANZ") || 
            nameUpper.includes("SBI GENERAL") || 
            nameUpper.includes("TATA AIG") || 
            nameUpper.includes("VIDAL") || 
            tariffUpper.includes("GIPSA") || 
            tariffUpper.includes("INSURANCE")
        ) {
            return "centralised";
        }
        return "international";
    }

    function mergeCustomAgreementsIntoDetails(customs) {
        if (typeof AGREEMENT_DETAILS === 'undefined' || !Array.isArray(AGREEMENT_DETAILS)) return;
        if (!window.staticAgreements) {
            window.staticAgreements = [...AGREEMENT_DETAILS];
        }
        const merged = [...window.staticAgreements];
        customs.forEach(cust => {
            const idx = merged.findIndex(x => x.agreementName.toUpperCase() === cust.agreementName.toUpperCase());
            if (idx !== -1) {
                merged[idx] = { ...merged[idx], ...cust };
            } else {
                merged.push(cust);
            }
        });
        AGREEMENT_DETAILS.length = 0;
        merged.forEach(item => AGREEMENT_DETAILS.push(item));
    }

    function convertDateToDbFormat(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD to DD-MM-YYYY
    }

    function convertDateToInputFormat(dateStr) {
        if (!dateStr) return '';
        if (dateStr.indexOf('-') === 4) return dateStr;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY to YYYY-MM-DD
    }

    // Modal Helpers
    window.tempAgreement = {
        agreementName: '',
        payerName: '',
        businessUnit: 'both',
        fromDate: '',
        toDate: '',
        status: 'Available/Valid',
        remarks: '',
        departments: [],
        services: [],
        rooms: [],
        packages: { inclusions: [], exclusions: [] },
        chargingMethods: [],
        rules: []
    };

    window.openCustomAgreementModal = function() {
        window.tempAgreement = {
            agreementName: '',
            payerName: '',
            businessUnit: 'both',
            fromDate: '',
            toDate: '',
            status: 'Available/Valid',
            remarks: '',
            departments: [],
            services: [],
            rooms: [],
            packages: { inclusions: [], exclusions: [] },
            chargingMethods: [],
            rules: []
        };
        
        document.getElementById('custom-agreement-modal-title').textContent = "Add Custom Agreement";
        document.getElementById('custom-agreement-original-name').value = "";
        
        populateModalFromTempAgreement();
        window.switchModalTab(null, 'modal-tab-header');
        
        const headerTabBtn = document.querySelector('.modal-tab-btn');
        if (headerTabBtn) {
            headerTabBtn.classList.add('active');
            headerTabBtn.style.borderBottom = '2px solid var(--primary)';
            headerTabBtn.style.color = 'var(--primary)';
        }

        document.getElementById('custom-agreement-modal').classList.add('show');
    };

    // Alias for legacy button mapping
    window.openCustomAgreementModalAdvanced = window.openCustomAgreementModal;

    window.closeCustomAgreementModal = function() {
        document.getElementById('custom-agreement-modal').classList.remove('show');
    };

    window.closeCustomAgreementModalAdvanced = window.closeCustomAgreementModal;

    window.switchModalTab = function(event, tabId) {
        document.querySelectorAll('.modal-tab-panel').forEach(panel => {
            panel.style.display = 'none';
            panel.classList.remove('active');
        });
        const target = document.getElementById(tabId);
        if (target) {
            target.style.display = (tabId === 'modal-tab-bulk') ? 'flex' : 'block';
            target.classList.add('active');
        }
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottom = '2px solid transparent';
            btn.style.color = 'var(--text-muted)';
        });
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
            event.currentTarget.style.borderBottom = '2px solid var(--primary)';
            event.currentTarget.style.color = 'var(--primary)';
        }
    };

    function populateModalFromTempAgreement() {
        const ta = window.tempAgreement;
        if (!ta) return;
        
        populateAgreementHeaderDatalists();
        populateServiceDatalists();
        populateRoomCategoryDatalist();
        
        document.getElementById('custom-agreement-name').value = ta.agreementName || '';
        document.getElementById('custom-agreement-payer').value = ta.payerName || '';
        document.getElementById('custom-agreement-tariff').value = ta.tariffMapped || '';
        document.getElementById('custom-agreement-from').value = convertDateToInputFormat(ta.fromDate);
        document.getElementById('custom-agreement-to').value = convertDateToInputFormat(ta.toDate);
        document.getElementById('custom-agreement-status').value = ta.status || 'Available/Valid';
        document.getElementById('custom-agreement-scope').value = ta.businessUnit || 'both';
        document.getElementById('custom-agreement-discount').value = ta.discountAgreed || '';
        document.getElementById('custom-agreement-remarks').value = ta.remarks || '';
        
        renderDeptDiscountsTable();
        renderServiceOverridesTable();
        renderRoomRentTable();
        renderPackagesTable();
        renderChargingMethodsTable();
        renderRulesTable();
    }

    function getAllUniqueDepartments() {
        const depts = new Set();
        if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
            TARIFF_DATA.forEach(item => { if (item.dept) depts.add(item.dept.toUpperCase().trim()); });
        }
        if (typeof TARIFF_KOLKATA_SOC !== 'undefined' && Array.isArray(TARIFF_KOLKATA_SOC)) {
            TARIFF_KOLKATA_SOC.forEach(item => { if (item.dept) depts.add(item.dept.toUpperCase().trim()); });
        }
        const standardDepts = [
            "CARDIOLOGY", "CARDIO THORACIC SURGERY", "CRITICAL CARE", "DENTAL", "DERMATOLOGY",
            "EMERGENCY", "ENDOCRINOLOGY", "ENT", "GASTROENTEROLOGY", "GENERAL MEDICINE",
            "GENERAL SURGERY", "GYNAECOLOGY & OBSTETRICS", "NEPHROLOGY", "NEUROLOGY",
            "NEURO SURGERY", "ONCOLOGY", "OPHTHALMOLOGY", "ORTHOPAEDICS", "PAEDIATRICS",
            "PHYSICAL MEDICINE & REHAB", "PLASTIC SURGERY", "PSYCHIATRY", "PULMONOLOGY",
            "RADIOLOGY", "RHEUMATOLOGY", "UROLOGY", "VASCULAR SURGERY", "DIETARY",
            "PHYSIOTHERAPY", "NURSING", "ROOM RENT", "INVESTIGATIONS", "LAB", "OTHERS"
        ];
        standardDepts.forEach(d => depts.add(d));
        return Array.from(depts).sort();
    }

    function populateDeptDatalist() {
        let datalist = document.getElementById('modal-dept-datalist');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'modal-dept-datalist';
            document.body.appendChild(datalist);
        }
        const depts = getAllUniqueDepartments();
        datalist.innerHTML = depts.map(d => `<option value="${escapeHtml(d)}">`).join('');
    }

    // Caches for performance to avoid freezing when loading large lists
    window.cachedServiceIds = null;
    window.cachedServiceDescs = null;
    window.cachedRoomCategories = null;

    function populateAgreementHeaderDatalists() {
        let agDatalist = document.getElementById('modal-agreement-name-datalist');
        if (!agDatalist) {
            agDatalist = document.createElement('datalist');
            agDatalist.id = 'modal-agreement-name-datalist';
            document.body.appendChild(agDatalist);
        }
        let payerDatalist = document.getElementById('modal-payer-datalist');
        if (!payerDatalist) {
            payerDatalist = document.createElement('datalist');
            payerDatalist.id = 'modal-payer-datalist';
            document.body.appendChild(payerDatalist);
        }

        const agNames = new Set();
        const payerNames = new Set();
        if (typeof AGREEMENT_DETAILS !== 'undefined' && Array.isArray(AGREEMENT_DETAILS)) {
            AGREEMENT_DETAILS.forEach(ag => {
                if (ag.agreementName) agNames.add(ag.agreementName.trim());
                if (ag.payerName) payerNames.add(ag.payerName.trim());
            });
        }
        agDatalist.innerHTML = Array.from(agNames).sort().map(name => `<option value="${escapeHtml(name)}">`).join('');
        payerDatalist.innerHTML = Array.from(payerNames).sort().map(name => `<option value="${escapeHtml(name)}">`).join('');
    }

    function populateServiceDatalists() {
        let idDatalist = document.getElementById('modal-service-id-datalist');
        if (!idDatalist) {
            idDatalist = document.createElement('datalist');
            idDatalist.id = 'modal-service-id-datalist';
            document.body.appendChild(idDatalist);
        }
        let descDatalist = document.getElementById('modal-service-desc-datalist');
        if (!descDatalist) {
            descDatalist = document.createElement('datalist');
            descDatalist.id = 'modal-service-desc-datalist';
            document.body.appendChild(descDatalist);
        }

        if (!window.cachedServiceIds || !window.cachedServiceDescs) {
            const ids = new Set();
            const descs = new Set();
            const processItem = (item) => {
                if (item.id) ids.add(String(item.id).trim());
                if (item.desc) descs.add(String(item.desc).trim());
            };
            if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
                TARIFF_DATA.forEach(processItem);
            }
            if (typeof TARIFF_KOLKATA_SOC !== 'undefined' && Array.isArray(TARIFF_KOLKATA_SOC)) {
                TARIFF_KOLKATA_SOC.forEach(processItem);
            }
            window.cachedServiceIds = Array.from(ids).sort();
            window.cachedServiceDescs = Array.from(descs).sort();
        }

        idDatalist.innerHTML = window.cachedServiceIds.map(id => `<option value="${escapeHtml(id)}">`).join('');
        descDatalist.innerHTML = window.cachedServiceDescs.map(desc => `<option value="${escapeHtml(desc)}">`).join('');
    }

    function populateRoomCategoryDatalist() {
        let datalist = document.getElementById('modal-room-category-datalist');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'modal-room-category-datalist';
            document.body.appendChild(datalist);
        }
        
        if (!window.cachedRoomCategories) {
            const categories = new Set([
                "STANDARD WARD",
                "SEMI PRIVATE",
                "SINGLE PRIVATE",
                "DELUXE",
                "SUITE",
                "EXECUTIVE",
                "ICU",
                "ICCU",
                "NEONATAL ICU",
                "PICU",
                "HDU",
                "DAYCARE",
                "EMERGENCY"
            ]);
            if (typeof AGREEMENT_DETAILS !== 'undefined' && Array.isArray(AGREEMENT_DETAILS)) {
                AGREEMENT_DETAILS.forEach(ag => {
                    if (ag.rooms && Array.isArray(ag.rooms)) {
                        ag.rooms.forEach(r => {
                            if (r.roomCategory) categories.add(r.roomCategory.toUpperCase().trim());
                        });
                    }
                });
            }
            window.cachedRoomCategories = Array.from(categories).sort();
        }
        datalist.innerHTML = window.cachedRoomCategories.map(c => `<option value="${escapeHtml(c)}">`).join('');
    }

    function findServiceById(id) {
        id = String(id).trim();
        if (!id) return null;
        let found = null;
        if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
            found = TARIFF_DATA.find(x => String(x.id).trim() === id);
        }
        if (!found && typeof TARIFF_KOLKATA_SOC !== 'undefined' && Array.isArray(TARIFF_KOLKATA_SOC)) {
            found = TARIFF_KOLKATA_SOC.find(x => String(x.id).trim() === id);
        }
        return found;
    }

    function findServiceByDesc(desc) {
        desc = String(desc).trim().toUpperCase();
        if (!desc) return null;
        let found = null;
        if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
            found = TARIFF_DATA.find(x => String(x.desc).trim().toUpperCase() === desc);
        }
        if (!found && typeof TARIFF_KOLKATA_SOC !== 'undefined' && Array.isArray(TARIFF_KOLKATA_SOC)) {
            found = TARIFF_KOLKATA_SOC.find(x => String(x.desc).trim().toUpperCase() === desc);
        }
        return found;
    }

    // Autocomplete Suggestions logic for Services (15,000+ items)
    let cachedAllServices = null;
    function getAllServices() {
        if (cachedAllServices) return cachedAllServices;
        const unique = new Map();
        if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
            TARIFF_DATA.forEach(x => {
                if (x.id) {
                    unique.set(String(x.id).trim(), {
                        id: String(x.id).trim(),
                        desc: String(x.desc || '').trim()
                    });
                }
            });
        }
        if (typeof TARIFF_KOLKATA_SOC !== 'undefined' && Array.isArray(TARIFF_KOLKATA_SOC)) {
            TARIFF_KOLKATA_SOC.forEach(x => {
                const id = String(x.id).trim();
                if (x.id && !unique.has(id)) {
                    unique.set(id, {
                        id: id,
                        desc: String(x.desc || '').trim()
                    });
                }
            });
        }
        cachedAllServices = Array.from(unique.values());
        return cachedAllServices;
    }

    function showAutocompleteSuggestions(input) {
        const parentTd = input.closest('td');
        if (!parentTd) return;
        const suggestionsDiv = parentTd.querySelector('.autocomplete-suggestions');
        if (!suggestionsDiv) return;

        const isIdInput = input.classList.contains('autocomplete-service-id');
        const val = input.value.trim().toLowerCase();

        const services = getAllServices();
        let filtered = [];

        if (!val) {
            filtered = services.slice(0, 30);
        } else {
            if (isIdInput) {
                filtered = services.filter(x => x.id.toLowerCase().includes(val)).slice(0, 30);
            } else {
                filtered = services.filter(x => x.desc.toLowerCase().includes(val)).slice(0, 30);
            }
        }

        if (filtered.length === 0) {
            suggestionsDiv.innerHTML = `<div style="padding:0.5rem; color:var(--text-muted); font-size:0.8rem; text-align:center;">No services found</div>`;
        } else {
            suggestionsDiv.innerHTML = filtered.map(item => `
                <div class="suggestion-item" 
                     style="padding: 0.4rem 0.6rem; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.8rem; color: var(--text-main); transition: background 0.15s;"
                     onmouseover="this.style.background='var(--primary-bg)'; this.style.color='var(--primary)';" 
                     onmouseout="this.style.background=''; this.style.color='';"
                     data-id="${escapeHtml(item.id)}" 
                     data-desc="${escapeHtml(item.desc)}">
                    <strong style="color: var(--primary);">${escapeHtml(item.id)}</strong> - ${escapeHtml(item.desc)}
                </div>
            `).join('');
        }
        suggestionsDiv.style.display = 'block';
    }

    function selectAutocompleteSuggestion(input, id, desc) {
        const idx = parseInt(input.getAttribute('data-idx'));
        const type = input.getAttribute('data-type');
        const isIdInput = input.classList.contains('autocomplete-service-id');

        const val = isIdInput ? id : desc;
        input.value = val;

        const row = input.closest('tr');
        const idInput = row ? row.querySelector('.autocomplete-service-id') : null;
        const descInput = row ? row.querySelector('.autocomplete-service-desc') : null;
        if (idInput) idInput.value = id;
        if (descInput) descInput.value = desc;

        if (type === 'services') {
            if (typeof window.updateTempService === 'function') {
                window.updateTempService(idx, isIdInput ? 'serviceId' : 'serviceName', val);
            }
        } else if (type === 'packages') {
            if (typeof window.updateTempPackage === 'function') {
                window.updateTempPackage(idx, isIdInput ? 'serviceId' : 'serviceName', val);
            }
        } else if (type === 'methods') {
            if (typeof window.updateTempMethod === 'function') {
                window.updateTempMethod(idx, isIdInput ? 'serviceId' : 'serviceName', val);
            }
        } else if (type === 'rules') {
            if (typeof window.updateTempRule === 'function') {
                window.updateTempRule(idx, isIdInput ? 'serviceId' : 'serviceName', val);
            }
        }

        const parentTd = input.closest('td');
        if (parentTd) {
            const suggestionsDiv = parentTd.querySelector('.autocomplete-suggestions');
            if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        }
    }

    document.addEventListener('click', e => {
        if (!e.target.closest('.autocomplete-suggestions') && !e.target.classList.contains('autocomplete-service-id') && !e.target.classList.contains('autocomplete-service-desc')) {
            document.querySelectorAll('.autocomplete-suggestions').forEach(div => div.style.display = 'none');
            return;
        }

        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const suggestionsDiv = suggestionItem.closest('.autocomplete-suggestions');
            const input = suggestionsDiv ? suggestionsDiv.previousElementSibling : null;
            if (input) {
                const id = suggestionItem.getAttribute('data-id');
                const desc = suggestionItem.getAttribute('data-desc');
                selectAutocompleteSuggestion(input, id, desc);
            }
        }
    });

    document.addEventListener('focusin', e => {
        if (e.target.classList.contains('autocomplete-service-id') || e.target.classList.contains('autocomplete-service-desc')) {
            document.querySelectorAll('.autocomplete-suggestions').forEach(div => {
                if (div !== e.target.nextElementSibling) {
                    div.style.display = 'none';
                }
            });
            showAutocompleteSuggestions(e.target);
        }
    });

    document.addEventListener('input', e => {
        if (e.target.classList.contains('autocomplete-service-id') || e.target.classList.contains('autocomplete-service-desc')) {
            showAutocompleteSuggestions(e.target);
            
            const input = e.target;
            const idx = parseInt(input.getAttribute('data-idx'));
            const type = input.getAttribute('data-type');
            const isIdInput = input.classList.contains('autocomplete-service-id');
            const val = input.value;
            
            if (type === 'services') {
                if (typeof window.updateTempService === 'function') {
                    window.updateTempService(idx, isIdInput ? 'serviceId' : 'serviceName', val);
                }
            } else if (type === 'packages') {
                if (typeof window.updateTempPackage === 'function') {
                    window.updateTempPackage(idx, isIdInput ? 'serviceId' : 'serviceName', val);
                }
            } else if (type === 'methods') {
                if (typeof window.updateTempMethod === 'function') {
                    window.updateTempMethod(idx, isIdInput ? 'serviceId' : 'serviceName', val);
                }
            } else if (type === 'rules') {
                if (typeof window.updateTempRule === 'function') {
                    window.updateTempRule(idx, isIdInput ? 'serviceId' : 'serviceName', val);
                }
            }
        }
    });

    // Inline Table Editor: Departments
    window.renderDeptDiscountsTable = function() {
        const tbody = document.getElementById('modal-depts-tbody');
        if (!tbody) return;
        populateDeptDatalist();
        const list = window.tempAgreement.departments || [];
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem;"><input type="text" list="modal-dept-datalist" value="${escapeHtml(item.department)}" oninput="updateTempDept(${idx}, 'department', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Select or type department..."></td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.discount}" oninput="updateTempDept(${idx}, 'discount', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 10"></td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempDept(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center; padding:1rem; color:var(--text-muted);">No department discounts added.</td></tr>';
    };

    window.updateTempDept = function(idx, prop, val) {
        if (!window.tempAgreement.departments) window.tempAgreement.departments = [];
        if (prop === 'discount') {
            window.tempAgreement.departments[idx][prop] = parseFloat(val) || 0;
        } else {
            window.tempAgreement.departments[idx][prop] = val;
        }
    };

    window.addModalDeptRow = function() {
        if (!window.tempAgreement.departments) window.tempAgreement.departments = [];
        window.tempAgreement.departments.push({ department: '', discount: 0 });
        renderDeptDiscountsTable();
    };

    window.deleteTempDept = function(idx) {
        window.tempAgreement.departments.splice(idx, 1);
        renderDeptDiscountsTable();
    };

    // Inline Table Editor: Services
    window.renderServiceOverridesTable = function() {
        const tbody = document.getElementById('modal-services-tbody');
        if (!tbody) return;
        const list = window.tempAgreement.services || [];
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-id" data-idx="${idx}" data-type="services" value="${escapeHtml(item.serviceId)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 99536" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-desc" data-idx="${idx}" data-type="services" value="${escapeHtml(item.serviceName)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. Chemotherapy Low" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.rate !== null && item.rate !== undefined ? item.rate : ''}" oninput="updateTempService(${idx}, 'rate', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Fixed Rate"></td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.discount !== null && item.discount !== undefined ? item.discount : ''}" oninput="updateTempService(${idx}, 'discount', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Discount %"></td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempService(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--text-muted);">No service overrides configured.</td></tr>';
    };

    window.updateTempService = function(idx, prop, val) {
        if (!window.tempAgreement.services) window.tempAgreement.services = [];
        
        window.tempAgreement.services[idx][prop] = val;

        const tbody = document.getElementById('modal-services-tbody');
        const row = tbody ? tbody.rows[idx] : null;

        // Auto-fill logic without focus loss
        if (prop === 'serviceId') {
            const item = findServiceById(val);
            if (item) {
                window.tempAgreement.services[idx]['serviceName'] = item.desc || '';
                if (row) {
                    const nameInput = row.cells[1].querySelector('input');
                    if (nameInput) nameInput.value = item.desc || '';
                }
            }
        } else if (prop === 'serviceName') {
            const item = findServiceByDesc(val);
            if (item) {
                window.tempAgreement.services[idx]['serviceId'] = item.id || '';
                if (row) {
                    const idInput = row.cells[0].querySelector('input');
                    if (idInput) idInput.value = item.id || '';
                }
            }
        }

        if (prop === 'rate' || prop === 'discount') {
            window.tempAgreement.services[idx][prop] = val === "" ? null : parseFloat(val);
        }
    };

    window.addModalServiceRow = function() {
        if (!window.tempAgreement.services) window.tempAgreement.services = [];
        window.tempAgreement.services.push({ serviceId: '', serviceName: '', rate: null, discount: null });
        renderServiceOverridesTable();
    };

    window.deleteTempService = function(idx) {
        window.tempAgreement.services.splice(idx, 1);
        renderServiceOverridesTable();
    };

    // Inline Table Editor: Rooms
    window.renderRoomRentTable = function() {
        const tbody = document.getElementById('modal-rooms-tbody');
        if (!tbody) return;
        const list = window.tempAgreement.rooms || [];
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem;"><input type="text" list="modal-room-category-datalist" value="${escapeHtml(item.roomCategory)}" oninput="updateTempRoom(${idx}, 'roomCategory', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. STROKE HDU"></td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.rate}" oninput="updateTempRoom(${idx}, 'rate', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 6600"></td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempRoom(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center; padding:1rem; color:var(--text-muted);">No room rent rates configured.</td></tr>';
    };

    window.updateTempRoom = function(idx, prop, val) {
        if (!window.tempAgreement.rooms) window.tempAgreement.rooms = [];
        if (prop === 'rate') {
            window.tempAgreement.rooms[idx][prop] = parseFloat(val) || 0;
        } else {
            window.tempAgreement.rooms[idx][prop] = val;
        }
    };

    window.addModalRoomRow = function() {
        if (!window.tempAgreement.rooms) window.tempAgreement.rooms = [];
        window.tempAgreement.rooms.push({ roomCategory: '', rate: 0 });
        renderRoomRentTable();
    };

    window.deleteTempRoom = function(idx) {
        window.tempAgreement.rooms.splice(idx, 1);
        renderRoomRentTable();
    };

    // Inline Table Editor: Packages
    window.renderPackagesTable = function() {
        const tbody = document.getElementById('modal-packages-tbody');
        if (!tbody) return;
        const list = [];
        if (window.tempAgreement.packages) {
            if (window.tempAgreement.packages.inclusions) {
                window.tempAgreement.packages.inclusions.forEach(id => {
                    list.push({ serviceId: id, serviceName: '', type: 'Inclusion' });
                });
            }
            if (window.tempAgreement.packages.exclusions) {
                window.tempAgreement.packages.exclusions.forEach(id => {
                    list.push({ serviceId: id, serviceName: '', type: 'Exclusion' });
                });
            }
        }
        window.tempPackageList = list;
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-id" data-idx="${idx}" data-type="packages" value="${escapeHtml(item.serviceId)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 99536" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-desc" data-idx="${idx}" data-type="packages" value="${escapeHtml(item.serviceName)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Optional description" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem;">
                    <select onchange="updateTempPackage(${idx}, 'type', this.value)" style="width:100%; padding:0.35rem; background:var(--bg-page); border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;">
                        <option value="Inclusion" ${item.type === 'Inclusion' ? 'selected' : ''}>Inclusion</option>
                        <option value="Exclusion" ${item.type === 'Exclusion' ? 'selected' : ''}>Exclusion</option>
                    </select>
                </td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempPackage(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-muted);">No package rules configured.</td></tr>';
    };

    window.updateTempPackage = function(idx, prop, val) {
        window.tempPackageList[idx][prop] = val;
        
        const tbody = document.getElementById('modal-packages-tbody');
        const row = tbody ? tbody.rows[idx] : null;

        // Auto-fill logic without focus loss
        if (prop === 'serviceId') {
            const item = findServiceById(val);
            if (item) {
                window.tempPackageList[idx]['serviceName'] = item.desc || '';
                if (row) {
                    const nameInput = row.cells[1].querySelector('input');
                    if (nameInput) nameInput.value = item.desc || '';
                }
            }
        } else if (prop === 'serviceName') {
            const item = findServiceByDesc(val);
            if (item) {
                window.tempPackageList[idx]['serviceId'] = item.id || '';
                if (row) {
                    const idInput = row.cells[0].querySelector('input');
                    if (idInput) idInput.value = item.id || '';
                }
            }
        }
        
        syncTempPackageListToAgreement();
    };

    window.addModalPackageRow = function() {
        if (!window.tempPackageList) window.tempPackageList = [];
        window.tempPackageList.push({ serviceId: '', serviceName: '', type: 'Inclusion' });
        syncTempPackageListToAgreement();
        renderPackagesTable();
    };

    window.deleteTempPackage = function(idx) {
        window.tempPackageList.splice(idx, 1);
        syncTempPackageListToAgreement();
        renderPackagesTable();
    };

    function syncTempPackageListToAgreement() {
        const inclusions = [];
        const exclusions = [];
        window.tempPackageList.forEach(item => {
            if (item.serviceId) {
                if (item.type === 'Exclusion') {
                    exclusions.push(item.serviceId);
                } else {
                    inclusions.push(item.serviceId);
                }
            }
        });
        window.tempAgreement.packages = { inclusions, exclusions };
    }

    // Inline Table Editor: Charging Methods
    window.renderChargingMethodsTable = function() {
        const tbody = document.getElementById('modal-methods-tbody');
        if (!tbody) return;
        const list = window.tempAgreement.chargingMethods || [];
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-id" data-idx="${idx}" data-type="methods" value="${escapeHtml(item.serviceId)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 1051057" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-desc" data-idx="${idx}" data-type="methods" value="${escapeHtml(item.serviceName)}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Optional description" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem;">
                    <select onchange="updateTempMethod(${idx}, 'method', this.value)" style="width:100%; padding:0.35rem; background:var(--bg-page); border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;">
                        <option value="Per Day" ${item.method === 'Per Day' ? 'selected' : ''}>Per Day</option>
                        <option value="Per Hour" ${item.method === 'Per Hour' ? 'selected' : ''}>Per Hour</option>
                        <option value="Per Procedure" ${item.method === 'Per Procedure' ? 'selected' : ''}>Per Procedure</option>
                        <option value="Flat" ${item.method === 'Flat' ? 'selected' : ''}>Flat</option>
                    </select>
                </td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.cap !== null && item.cap !== undefined ? item.cap : ''}" oninput="updateTempMethod(${idx}, 'cap', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 5000"></td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempMethod(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--text-muted);">No charging methods configured.</td></tr>';
    };

    window.updateTempMethod = function(idx, prop, val) {
        if (!window.tempAgreement.chargingMethods) window.tempAgreement.chargingMethods = [];
        
        window.tempAgreement.chargingMethods[idx][prop] = val;

        const tbody = document.getElementById('modal-methods-tbody');
        const row = tbody ? tbody.rows[idx] : null;

        // Auto-fill logic without focus loss
        if (prop === 'serviceId') {
            const item = findServiceById(val);
            if (item) {
                window.tempAgreement.chargingMethods[idx]['serviceName'] = item.desc || '';
                if (row) {
                    const nameInput = row.cells[1].querySelector('input');
                    if (nameInput) nameInput.value = item.desc || '';
                }
            }
        } else if (prop === 'serviceName') {
            const item = findServiceByDesc(val);
            if (item) {
                window.tempAgreement.chargingMethods[idx]['serviceId'] = item.id || '';
                if (row) {
                    const idInput = row.cells[0].querySelector('input');
                    if (idInput) idInput.value = item.id || '';
                }
            }
        }

        if (prop === 'cap') {
            window.tempAgreement.chargingMethods[idx][prop] = val === "" ? null : parseFloat(val);
        }
    };

    window.addModalMethodRow = function() {
        if (!window.tempAgreement.chargingMethods) window.tempAgreement.chargingMethods = [];
        window.tempAgreement.chargingMethods.push({ serviceId: '', serviceName: '', method: 'Per Day', cap: null });
        renderChargingMethodsTable();
    };

    window.deleteTempMethod = function(idx) {
        window.tempAgreement.chargingMethods.splice(idx, 1);
        renderChargingMethodsTable();
    };

    // Inline Table Editor: Rules
    window.renderRulesTable = function() {
        const tbody = document.getElementById('modal-rules-tbody');
        if (!tbody) return;
        const list = window.tempAgreement.rules || [];
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="padding: 0.35rem 0.5rem;">
                    <select onchange="updateTempRule(${idx}, 'ruleType', this.value)" style="width:100%; padding:0.35rem; background:var(--bg-page); border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;">
                        <option value="Cap" ${item.ruleType === 'Cap' ? 'selected' : ''}>Cap</option>
                        <option value="Limit" ${item.ruleType === 'Limit' ? 'selected' : ''}>Limit</option>
                        <option value="Co-payment" ${item.ruleType === 'Co-payment' ? 'selected' : ''}>Co-payment</option>
                    </select>
                </td>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-id" data-idx="${idx}" data-type="rules" value="${escapeHtml(item.serviceId || '')}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 99536" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem; position: relative;">
                    <input type="text" class="autocomplete-service-desc" data-idx="${idx}" data-type="rules" value="${escapeHtml(item.serviceName || '')}" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="Optional name" autocomplete="off">
                    <div class="autocomplete-suggestions" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 3000; background-color: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; max-height: 200px; overflow-y: auto; box-shadow: var(--card-shadow); margin-top: 2px;"></div>
                </td>
                <td style="padding: 0.35rem 0.5rem;">
                    <select onchange="updateTempRule(${idx}, 'category', this.value)" style="width:100%; padding:0.35rem; background:var(--bg-page); border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;">
                        <option value="Room Rent" ${item.category === 'Room Rent' ? 'selected' : ''}>Room Rent</option>
                        <option value="Pharmacy" ${item.category === 'Pharmacy' ? 'selected' : ''}>Pharmacy</option>
                        <option value="Consumables" ${item.category === 'Consumables' ? 'selected' : ''}>Consumables</option>
                        <option value="Total Bill" ${item.category === 'Total Bill' ? 'selected' : ''}>Total Bill</option>
                    </select>
                </td>
                <td style="padding: 0.35rem 0.5rem;"><input type="number" step="any" value="${item.value !== null && item.value !== undefined ? item.value : ''}" oninput="updateTempRule(${idx}, 'value', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. 5000"></td>
                <td style="padding: 0.35rem 0.5rem;"><input type="text" value="${escapeHtml(item.condition || '')}" oninput="updateTempRule(${idx}, 'condition', this.value)" style="width:100%; padding:0.35rem; background:transparent; border:1px solid var(--border); color:var(--text-main); font-size:0.8rem; border-radius:4px;" placeholder="e.g. qty > 3"></td>
                <td style="padding: 0.35rem 0.5rem; text-align:center;"><button onclick="deleteTempRule(${idx})" class="export-btn" style="padding:0.2rem 0.4rem; background:rgba(239,68,68,0.1); color:var(--danger); border-color:rgba(239,68,68,0.2);">Delete</button></td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center; padding:1rem; color:var(--text-muted);">No rules configured.</td></tr>';
    };

    window.updateTempRule = function(idx, prop, val) {
        if (!window.tempAgreement.rules) window.tempAgreement.rules = [];
        window.tempAgreement.rules[idx][prop] = val;

        const tbody = document.getElementById('modal-rules-tbody');
        const row = tbody ? tbody.rows[idx] : null;

        // Auto-fill logic without focus loss
        if (prop === 'serviceId') {
            const item = findServiceById(val);
            if (item) {
                window.tempAgreement.rules[idx]['serviceName'] = item.desc || '';
                if (row) {
                    const nameInput = row.cells[2].querySelector('input');
                    if (nameInput) nameInput.value = item.desc || '';
                }
            }
        } else if (prop === 'serviceName') {
            const item = findServiceByDesc(val);
            if (item) {
                window.tempAgreement.rules[idx]['serviceId'] = item.id || '';
                if (row) {
                    const idInput = row.cells[1].querySelector('input');
                    if (idInput) idInput.value = item.id || '';
                }
            }
        }

        if (prop === 'value') {
            window.tempAgreement.rules[idx][prop] = val === "" ? 0 : parseFloat(val);
        }
    };

    window.addModalRuleRow = function() {
        if (!window.tempAgreement.rules) window.tempAgreement.rules = [];
        window.tempAgreement.rules.push({ ruleType: 'Cap', serviceId: '', serviceName: '', category: 'Room Rent', value: 0, condition: '' });
        renderRulesTable();
    };

    window.deleteTempRule = function(idx) {
        window.tempAgreement.rules.splice(idx, 1);
        renderRulesTable();
    };

    // Excel Bulk Import/Export for Agreements
    window.importAgreementExcel = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const getSheetRows = (sheetName) => {
                    const sheet = workbook.Sheets[sheetName];
                    if (!sheet) return [];
                    return XLSX.utils.sheet_to_json(sheet);
                };

                const headerRows = getSheetRows('Header');
                const deptRows = getSheetRows('Departments');
                const serviceRows = getSheetRows('Services');
                const roomRows = getSheetRows('Rooms');
                const packageRows = getSheetRows('Packages');
                const methodRows = getSheetRows('ChargingMethods');
                const ruleRows = getSheetRows('Rules');

                if (headerRows.length === 0) {
                    alert("Invalid Excel file: 'Header' sheet is empty or missing.");
                    return;
                }

                const header = normalizeKeys(headerRows[0]);
                const agreementName = header['agreementname'] || header['name'] || '';
                const payerName = header['payername'] || header['payer'] || '';
                const businessUnit = header['businessunit'] || header['bu'] || 'both';
                const fromDate = header['fromdate'] || header['startdate'] || '';
                const toDate = header['todate'] || header['enddate'] || '';
                const status = header['status'] || 'Available/Valid';
                const remarks = header['remarks'] || '';
                const tariffMapped = header['tariffmapped'] || header['mappedtariff'] || header['tariff'] || '';

                if (!agreementName) {
                    alert("Excel 'Header' sheet is missing the 'Agreement Name' field.");
                    return;
                }

                const departments = deptRows.map(r => {
                    const nr = normalizeKeys(r);
                    return {
                        department: nr['department'] || nr['dept'] || '',
                        discount: parseFloat(nr['discount'] || nr['discount%']) || 0
                    };
                }).filter(d => d.department);

                const services = serviceRows.map(r => {
                    const nr = normalizeKeys(r);
                    return {
                        serviceId: String(nr['serviceid'] || nr['servicecode'] || nr['code'] || ''),
                        serviceName: nr['servicename'] || nr['description'] || '',
                        rate: nr['fixedrate'] !== undefined ? parseFloat(nr['fixedrate']) : null,
                        discount: nr['discount'] !== undefined ? parseFloat(nr['discount']) : null
                    };
                }).filter(s => s.serviceId);

                const rooms = roomRows.map(r => {
                    const nr = normalizeKeys(r);
                    return {
                        roomCategory: nr['roomcategory'] || nr['room'] || '',
                        rate: parseFloat(nr['rentrate'] || nr['rate']) || 0
                    };
                }).filter(rm => rm.roomCategory);

                const inclusions = [];
                const exclusions = [];
                packageRows.forEach(r => {
                    const nr = normalizeKeys(r);
                    const id = String(nr['serviceid'] || nr['servicecode'] || nr['code'] || '');
                    const type = String(nr['type'] || 'inclusion').toLowerCase();
                    if (id) {
                        if (type.includes('ex')) {
                            exclusions.push(id);
                        } else {
                            inclusions.push(id);
                        }
                    }
                });

                const chargingMethods = methodRows.map(r => {
                    const nr = normalizeKeys(r);
                    return {
                        serviceId: String(nr['serviceid'] || nr['servicecode'] || nr['code'] || ''),
                        serviceName: nr['servicename'] || nr['description'] || '',
                        method: nr['method'] || 'Per Day',
                        cap: nr['cap'] !== undefined ? parseFloat(nr['cap']) : null
                    };
                }).filter(cm => cm.serviceId);

                const rules = ruleRows.map(r => {
                    const nr = normalizeKeys(r);
                    return {
                        ruleType: nr['ruletype'] || 'Cap',
                        category: nr['category'] || 'Room Rent',
                        value: parseFloat(nr['value'] || nr['limit'] || nr['max']) || 0,
                        condition: nr['condition'] || ''
                    };
                });

                window.tempAgreement = {
                    agreementName,
                    payerName,
                    businessUnit,
                    fromDate,
                    toDate,
                    status,
                    remarks,
                    tariffMapped,
                    departments,
                    services,
                    rooms,
                    packages: { inclusions, exclusions },
                    chargingMethods,
                    rules
                };

                populateModalFromTempAgreement();
                showToast("Excel Agreement file successfully imported!", "success");
            } catch(err) {
                console.error(err);
                alert("Error parsing agreement excel: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    window.exportAgreementTemplateExcel = function() {
        // Update window.tempAgreement with latest header inputs first
        const agreementName = document.getElementById('custom-agreement-name').value.trim();
        const payerName = document.getElementById('custom-agreement-payer').value.trim();
        const businessUnit = document.getElementById('custom-agreement-scope').value;
        const fromDate = convertDateToDbFormat(document.getElementById('custom-agreement-from').value);
        const toDate = convertDateToDbFormat(document.getElementById('custom-agreement-to').value);
        const status = document.getElementById('custom-agreement-status').value;
        const remarks = document.getElementById('custom-agreement-remarks').value.trim();
        const tariffMapped = document.getElementById('custom-agreement-tariff').value;

        const wb = XLSX.utils.book_new();
        
        // Header Sheet
        const headerData = [
            ["Agreement Name", "Payer Name", "Business Unit", "From Date", "To Date", "Status", "Remarks", "Tariff Mapped"]
        ];
        if (agreementName || payerName || tariffMapped) {
            headerData.push([agreementName, payerName, businessUnit, fromDate, toDate, status, remarks, tariffMapped]);
        }
        const headerWS = XLSX.utils.aoa_to_sheet(headerData);
        XLSX.utils.book_append_sheet(wb, headerWS, "Header");
        
        // Departments Sheet
        const deptData = [
            ["Department", "Discount %"]
        ];
        const depts = window.tempAgreement.departments || [];
        depts.forEach(d => {
            if (d.department || d.discount) {
                deptData.push([d.department || '', d.discount !== undefined ? d.discount : '']);
            }
        });
        const deptsWS = XLSX.utils.aoa_to_sheet(deptData);
        XLSX.utils.book_append_sheet(wb, deptsWS, "Departments");
        
        // Services Sheet
        const servicesData = [
            ["Service ID", "Service Name", "Fixed Rate", "Discount %"]
        ];
        const services = window.tempAgreement.services || [];
        services.forEach(s => {
            if (s.serviceId || s.serviceName) {
                servicesData.push([
                    s.serviceId || '',
                    s.serviceName || '',
                    s.rate !== null && s.rate !== undefined ? s.rate : '',
                    s.discount !== null && s.discount !== undefined ? s.discount : ''
                ]);
            }
        });
        const servicesWS = XLSX.utils.aoa_to_sheet(servicesData);
        XLSX.utils.book_append_sheet(wb, servicesWS, "Services");
        
        // Rooms Sheet
        const roomsData = [
            ["Room Category", "Rent Rate"]
        ];
        const rooms = window.tempAgreement.rooms || [];
        rooms.forEach(r => {
            if (r.roomCategory || r.rate) {
                roomsData.push([r.roomCategory || '', r.rate !== undefined ? r.rate : '']);
            }
        });
        const roomsWS = XLSX.utils.aoa_to_sheet(roomsData);
        XLSX.utils.book_append_sheet(wb, roomsWS, "Rooms");
        
        // Packages Sheet
        const pkgData = [
            ["Service ID", "Service Name", "Type"]
        ];
        if (window.tempAgreement.packages) {
            const inclusions = window.tempAgreement.packages.inclusions || [];
            inclusions.forEach(id => {
                const item = findServiceById(id);
                const name = item ? item.desc : '';
                pkgData.push([id, name, "Inclusion"]);
            });
            const exclusions = window.tempAgreement.packages.exclusions || [];
            exclusions.forEach(id => {
                const item = findServiceById(id);
                const name = item ? item.desc : '';
                pkgData.push([id, name, "Exclusion"]);
            });
        }
        const pkgWS = XLSX.utils.aoa_to_sheet(pkgData);
        XLSX.utils.book_append_sheet(wb, pkgWS, "Packages");
        
        // ChargingMethods Sheet
        const methodsData = [
            ["Service ID", "Service Name", "Method", "Cap"]
        ];
        const methods = window.tempAgreement.chargingMethods || [];
        methods.forEach(m => {
            if (m.serviceId || m.serviceName) {
                methodsData.push([
                    m.serviceId || '',
                    m.serviceName || '',
                    m.method || 'Per Day',
                    m.cap !== null && m.cap !== undefined ? m.cap : ''
                ]);
            }
        });
        const methodsWS = XLSX.utils.aoa_to_sheet(methodsData);
        XLSX.utils.book_append_sheet(wb, methodsWS, "ChargingMethods");
        
        // Rules Sheet
        const rulesData = [
            ["Rule Type", "Category", "Value", "Condition"]
        ];
        const rules = window.tempAgreement.rules || [];
        rules.forEach(r => {
            if (r.ruleType || r.category || r.value) {
                rulesData.push([
                    r.ruleType || '',
                    r.category || '',
                    r.value !== undefined ? r.value : '',
                    r.condition || ''
                ]);
            }
        });
        const rulesWS = XLSX.utils.aoa_to_sheet(rulesData);
        XLSX.utils.book_append_sheet(wb, rulesWS, "Rules");
        
        const filename = agreementName ? `${agreementName.replace(/[^a-zA-Z0-9_-]/g, "_")}_agreement.xlsx` : "agreement_template.xlsx";
        XLSX.writeFile(wb, filename);
        showToast("Agreement settings exported successfully!", "success");
    };

    function normalizeKeys(obj) {
        const res = {};
        for (let k in obj) {
            res[k.toLowerCase().replace(/[\s_]/g, '')] = obj[k];
        }
        return res;
    }

    // Modal Actions: Save Custom Agreement
    window.saveCustomAgreement = function() {
        const origName = document.getElementById('custom-agreement-original-name').value;
        const name = document.getElementById('custom-agreement-name').value.trim();
        const payer = document.getElementById('custom-agreement-payer').value.trim();
        const tariff = document.getElementById('custom-agreement-tariff').value.trim();
        const fromDateInput = document.getElementById('custom-agreement-from').value;
        const toDateInput = document.getElementById('custom-agreement-to').value;
        const status = document.getElementById('custom-agreement-status').value;
        const scope = document.getElementById('custom-agreement-scope').value;
        const discount = document.getElementById('custom-agreement-discount').value.trim();
        const remarks = document.getElementById('custom-agreement-remarks').value.trim();

        if (!name) {
            alert("Please enter the Agreement Name.");
            return;
        }

        const fromDate = convertDateToDbFormat(fromDateInput);
        const toDate = convertDateToDbFormat(toDateInput);

        let locations = '';
        if (scope === 'international') {
            locations = 'Assam Hospitals Limited – Guwahati';
        } else if (scope === 'excelcare') {
            locations = 'Apollo Excelcare Hospital – Guwahati';
        } else if (scope === 'kolkata') {
            locations = 'Kolkata - Apollo Multispeciality';
        } else {
            locations = 'Assam Hospitals Limited – Guwahati | Apollo Excelcare Hospital – Guwahati';
        }

        const agObject = {
            ...window.tempAgreement,
            customerType: scope === 'excelcare' ? 'TPA' : 'Corporate',
            agreementName: name,
            payerName: payer || name,
            tariffMapped: tariff || "None",
            discountMapped: discount || "None",
            status: status,
            fromDate: fromDate,
            toDate: toDate,
            discountAgreed: discount || "None",
            locations: locations,
            businessUnit: scope,
            remarks: remarks
        };

        let list = [...(window.customAgreements || [])];
        if (origName) {
            const idx = list.findIndex(x => x.agreementName.toUpperCase() === origName.toUpperCase());
            if (idx !== -1) {
                list[idx] = agObject;
            } else {
                list.push(agObject);
            }
        } else {
            const exists = list.some(x => x.agreementName.toUpperCase() === name.toUpperCase());
            if (exists) {
                alert("An agreement with this name already exists.");
                return;
            }
            list.push(agObject);
        }

        window.saveAndSyncCustomAgreements(list);
        window.closeCustomAgreementModal();
    };

    window.editCustomAgreement = function(escapedName) {
        const list = window.customAgreements || [];
        const ag = list.find(x => x.agreementName.toUpperCase() === escapedName.toUpperCase());
        if (!ag) return;

        window.tempAgreement = {
            agreementName: ag.agreementName,
            payerName: ag.payerName || ag.agreementName,
            businessUnit: ag.businessUnit || getAgreementScope(ag),
            fromDate: ag.fromDate,
            toDate: ag.toDate,
            status: ag.status || "Available/Valid",
            remarks: ag.remarks || "",
            departments: ag.departments || [],
            services: ag.services || [],
            rooms: ag.rooms || [],
            packages: ag.packages || { inclusions: [], exclusions: [] },
            chargingMethods: ag.chargingMethods || [],
            rules: ag.rules || []
        };

        document.getElementById('custom-agreement-modal-title').textContent = "Edit Custom Agreement";
        document.getElementById('custom-agreement-original-name').value = ag.agreementName;

        populateModalFromTempAgreement();
        window.switchModalTab(null, 'modal-tab-header');
        
        const headerTabBtn = document.querySelector('.modal-tab-btn');
        if (headerTabBtn) {
            headerTabBtn.classList.add('active');
            headerTabBtn.style.borderBottom = '2px solid var(--primary)';
            headerTabBtn.style.color = 'var(--primary)';
        }

        document.getElementById('custom-agreement-modal').classList.add('show');
    };

    window.deleteCustomAgreement = function(escapedName) {
        if (!confirm(`Are you sure you want to delete "${escapedName}"?`)) return;
        
        let list = window.customAgreements || [];
        list = list.filter(x => x.agreementName.toUpperCase() !== escapedName.toUpperCase());
        
        window.saveAndSyncCustomAgreements(list);
    };

    window.customizeStaticAgreement = function(escapedName) {
        if (typeof AGREEMENT_DETAILS === 'undefined') return;
        const ag = AGREEMENT_DETAILS.find(x => x.agreementName.toUpperCase() === escapedName.toUpperCase());
        if (!ag) return;

        window.tempAgreement = {
            agreementName: ag.agreementName + " (Customized)",
            payerName: ag.payerName || ag.agreementName,
            businessUnit: ag.businessUnit || getAgreementScope(ag),
            fromDate: ag.fromDate,
            toDate: ag.toDate,
            status: ag.status || "Available/Valid",
            remarks: ag.remarks || "",
            departments: ag.departments || [],
            services: ag.services || [],
            rooms: ag.rooms || [],
            packages: ag.packages || { inclusions: [], exclusions: [] },
            chargingMethods: ag.chargingMethods || [],
            rules: ag.rules || []
        };

        document.getElementById('custom-agreement-modal-title').textContent = "Customize Agreement";
        document.getElementById('custom-agreement-original-name').value = "";

        populateModalFromTempAgreement();
        window.switchModalTab(null, 'modal-tab-header');

        const headerTabBtn = document.querySelector('.modal-tab-btn');
        if (headerTabBtn) {
            headerTabBtn.classList.add('active');
            headerTabBtn.style.borderBottom = '2px solid var(--primary)';
            headerTabBtn.style.color = 'var(--primary)';
        }

        document.getElementById('custom-agreement-modal').classList.add('show');
    };

    // Component 4 – Enhanced SOC Matching (3-Tier Matcher)
    function resolveSOCItem(activeSOCMap, activeSOC, serviceId, serviceName) {
        if (!serviceId && !serviceName) return null;
        
        // Tier 1: Exact service code match
        if (serviceId && activeSOCMap) {
            const cleanId = String(serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
            if (activeSOCMap[cleanId]) {
                return {
                    item: activeSOCMap[cleanId],
                    tier: "T1",
                    explanation: "[SOC Match T1]"
                };
            }
            if (activeSOCMap[serviceId]) {
                return {
                    item: activeSOCMap[serviceId],
                    tier: "T1",
                    explanation: "[SOC Match T1]"
                };
            }
        }
        
        // Tier 2: Exact service name match (case-insensitive)
        if (serviceName && activeSOC) {
            const cleanName = String(serviceName).toUpperCase().trim();
            const nameMatch = activeSOC.find(x => {
                const n = (x.name || '').toUpperCase().trim();
                const alias = (x.aliasName || '').toUpperCase().trim();
                return n === cleanName || (alias && alias === cleanName);
            });
            if (nameMatch) {
                return {
                    item: nameMatch,
                    tier: "T2",
                    explanation: "[SOC Match T2]"
                };
            }
            
            if (activeSOCMap) {
                for (let id in activeSOCMap) {
                    const item = activeSOCMap[id];
                    if (item && item.name && item.name.toUpperCase().trim() === cleanName) {
                        return {
                            item: item,
                            tier: "T2",
                            explanation: "[SOC Match T2]"
                        };
                    }
                }
            }
        }
        
        // Tier 3: Fuzzy token-overlap similarity (>= 70% word match)
        if (serviceName && activeSOC) {
            const cleanName = String(serviceName).toUpperCase().trim();
            const stopwords = ["AND", "OR", "THE", "OF", "FOR", "IN", "WITH", "BY", "A", "AN", "TO", "AT", "ON", "FROM", "CHARGES", "CHARGE", "RATE", "RATES", "CHARG"];
            
            const tokenize = (str) => {
                return str.replace(/[^A-Z0-9\s]/g, ' ')
                          .split(/\s+/)
                          .map(w => w.trim())
                          .filter(w => w.length > 1 && !stopwords.includes(w));
            };
            
            const queryTokens = tokenize(cleanName);
            if (queryTokens.length === 0) return null;
            
            let bestMatch = null;
            let maxOverlapRatio = 0;
            
            activeSOC.forEach(x => {
                const nameVal = (x.name || '').toUpperCase();
                const targetTokens = tokenize(nameVal);
                if (targetTokens.length === 0) return;
                
                let matches = 0;
                queryTokens.forEach(t => {
                    if (targetTokens.includes(t)) matches++;
                });
                
                const ratio = matches / Math.max(queryTokens.length, targetTokens.length);
                if (ratio > maxOverlapRatio) {
                    maxOverlapRatio = ratio;
                    bestMatch = x;
                }
            });
            
            if (activeSOCMap) {
                for (let id in activeSOCMap) {
                    const item = activeSOCMap[id];
                    if (!item || !item.name) continue;
                    const nameVal = item.name.toUpperCase();
                    const targetTokens = tokenize(nameVal);
                    if (targetTokens.length === 0) continue;
                    
                    let matches = 0;
                    queryTokens.forEach(t => {
                        if (targetTokens.includes(t)) matches++;
                    });
                    const ratio = matches / Math.max(queryTokens.length, targetTokens.length);
                    if (ratio > maxOverlapRatio) {
                        maxOverlapRatio = ratio;
                        bestMatch = item;
                    }
                }
            }
            
            if (maxOverlapRatio >= 0.7) {
                return {
                    item: bestMatch,
                    tier: "T3",
                    explanation: `[Fuzzy Match T3 – ${Math.round(maxOverlapRatio * 100)}%]`
                };
            }
        }
        
        return null;
    }

    // Component 5 – 11-Step Audit Pipeline
    function runAgreementPipeline(item, agreement, activeSOCMap, activeSOC) {
        const res = {
            expectedTariff: null,
            expectedDiscountedRate: null,
            discountApplied: 0,
            status: "Matching",
            explanation: "",
            isIgnored: false,
            exceptionCode: null
        };

        const row = item.row;
        const colIdx = item.colIdx;
        
        const payerName = item.customer || "General";
        
        // Step 3: Validate Agreement Dates
        let datesValid = true;
        if (agreement.fromDate && agreement.toDate) {
            const parseAgDate = (dStr) => {
                const parts = dStr.split('-');
                if (parts.length === 3) {
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                }
                return new Date(dStr);
            };
            const start = parseAgDate(agreement.fromDate);
            const end = parseAgDate(agreement.toDate);
            let checkDate = new Date();
            if (item.startDateVal) {
                const parsed = parseExcelDate(item.startDateVal);
                if (parsed) checkDate = parsed;
            }
            
            if (checkDate < start || checkDate > end) {
                datesValid = false;
                res.exceptionCode = "EA";
                res.status = "Expired Agreement";
                res.explanation = `[EA] Billing date out of validity window (${agreement.fromDate} to ${agreement.toDate}).`;
            }
        }

        // Step 4: Apply Room Rent Tariff Rules
        let roomRentResolved = false;
        const cleanRoom = cleanRoomCategory(item.roomCategory);
        const isDayCare = cleanRoom === "DAYCARE" || (item.dept || '').toLowerCase().includes("day care") || (item.rateType || '').toLowerCase().includes("day care") || (item.serviceName || '').toUpperCase().includes("DAY CARE") || (item.serviceName || '').toUpperCase().includes("DAYCARE");
        const isDayCareItem = isDayCare;
        const isTriageItem = (item.serviceName || '').toUpperCase().includes("TRIAGE") || (item.dept || '').toLowerCase().includes("triage") || (item.rateType || '').toLowerCase().includes("triage");
        const isRoomRentService = item.serviceId === "2127" || (item.serviceName || '').toUpperCase().includes("ROOM RENT") || (item.serviceName || '').toUpperCase().includes("BED CHARGE") || (item.dept || '').toLowerCase().includes("room rent") || (item.dept || '').toLowerCase().includes("bed charge") || (item.dept || '').toLowerCase() === "room" || (item.serviceName || '').toUpperCase().includes("DELUXE CABIN") || (item.serviceName || '').toUpperCase().includes("PRIVATE CABIN") || (item.serviceName || '').toUpperCase().includes("SEMI CABIN") || isDayCareItem || isTriageItem;

        if (isRoomRentService) {
            if (agreement.rooms && agreement.rooms.length > 0) {
                const rMatch = agreement.rooms.find(r => cleanRoomCategory(r.roomCategory) === cleanRoom);
                if (rMatch !== undefined && rMatch.rate !== null && rMatch.rate !== undefined) {
                    res.expectedTariff = Number(rMatch.rate);
                    res.explanation = `Resolved room rent from Agreement room tariff: ₹${res.expectedTariff}.`;
                    roomRentResolved = true;
                    if (res.expectedTariff !== item.billedRate) {
                        res.exceptionCode = "IRT";
                    }
                }
            }
        }

        // Step 5: Apply Department Discounts
        let deptDiscount = 0;
        if (agreement.departments && agreement.departments.length > 0) {
            const deptMatch = agreement.departments.find(d => String(d.department).toUpperCase() === String(item.dept).toUpperCase());
            if (deptMatch) {
                deptDiscount = Number(deptMatch.discount);
                res.discountApplied = deptDiscount;
                res.explanation += ` (Agreed Dept Discount: ${deptDiscount}% for ${item.dept})`;
            }
        }

        // Step 6: Apply Service-Level Conditions
        let serviceConditionApplied = false;
        if (agreement.services && agreement.services.length > 0) {
            const sMatch = agreement.services.find(s => String(s.serviceId) === String(item.serviceId));
            if (sMatch) {
                if (sMatch.rate !== null && sMatch.rate !== undefined && sMatch.rate !== "") {
                    res.expectedTariff = Number(sMatch.rate);
                    res.explanation = `Service-level rate override applied from agreement: ₹${res.expectedTariff}.`;
                    serviceConditionApplied = true;
                }
                if (sMatch.discount !== null && sMatch.discount !== undefined && sMatch.discount !== "") {
                    res.discountApplied = Number(sMatch.discount);
                    res.explanation += ` (Service-level discount override: ${res.discountApplied}%)`;
                    serviceConditionApplied = true;
                }
            }
        }

        // Step 7: Apply Package Conditions (rateType detection)
        const isInsidePackage = item.rateType && item.rateType.toLowerCase().includes("inside package");
        if (isInsidePackage) {
            res.isIgnored = true;
            res.status = "Ignored (Inside Package)";
            res.explanation = "Billed item is inside a package; rates are bundled.";
            return res;
        }
        if (agreement.packages) {
            if (agreement.packages.exclusions && agreement.packages.exclusions.includes(item.serviceId)) {
                res.exceptionCode = "IPA";
                res.explanation += " [WARNING: Item excluded from package by agreement rules!]";
            }
        }

        // Step 8: Apply Charging Methodology (hourly/daily caps)
        if (agreement.chargingMethods && agreement.chargingMethods.length > 0) {
            const cmMatch = agreement.chargingMethods.find(c => String(c.serviceId) === String(item.serviceId));
            if (cmMatch) {
                const method = cmMatch.method;
                const cap = Number(cmMatch.cap);
                res.explanation += ` [Method: ${method}]`;
                
                if (method === "Per Hour" || method === "Per Day") {
                    if (cap && item.quantity > 0) {
                        const calculated = res.expectedTariff * item.quantity;
                        if (calculated > cap) {
                            res.expectedTariff = cap;
                            res.explanation += ` Cap of ₹${cap} applied (Calculated ₹${calculated}).`;
                        }
                    }
                }
            }
        }

        // Step 9: Apply Conditional Rules
        if (agreement.rules && agreement.rules.length > 0) {
            agreement.rules.forEach(rule => {
                let ruleApplies = false;
                if (rule.serviceId) {
                    if (String(item.serviceId).trim() === String(rule.serviceId).trim()) {
                        ruleApplies = true;
                    }
                } else {
                    if (rule.category === "Room Rent" && isRoomRentService) {
                        ruleApplies = true;
                    } else if (rule.category === "Pharmacy" && (deptLower.includes('pharmacy') || nameUpper.includes('HSN:') || nameUpper.includes('PHARMACY') || deptLower.includes('drug'))) {
                        ruleApplies = true;
                    } else if (rule.category === "Consumables" && (
                        deptLower === 'consumables' || 
                        nameUpper.includes('CONSUMABLE') || 
                        deptLower.includes('material') || 
                        nameUpper.includes('CONSU:')
                    )) {
                        ruleApplies = true;
                    }
                }

                if (ruleApplies) {
                    if (rule.ruleType === "Cap") {
                        const rateToCompare = res.expectedTariff !== null ? res.expectedTariff : billedRate;
                        if (rateToCompare > rule.value) {
                            res.expectedTariff = rule.value;
                            const scopeLabel = rule.serviceId ? `Service #${rule.serviceId}` : rule.category;
                            res.explanation += ` ${scopeLabel} capped at ₹${rule.value} per agreement rules.`;
                            if (res.expectedTariff !== item.billedRate) {
                                res.exceptionCode = "OC";
                            }
                        }
                    }
                }
            });
        }

        // Step 10: Calculate Expected Charge (net rate)
        if (res.expectedTariff === null && !roomRentResolved && !serviceConditionApplied) {
            const resolved = resolveSOCItem(activeSOCMap, activeSOC, item.serviceId, item.serviceName);
            if (resolved) {
                const match = resolved.item;
                res.explanation = `${resolved.explanation} ${res.explanation}`;
                
                let resolvedRate = null;
                if (activeSOCMap === mapKolkata || activeSOCMap === mapKolkataHdfc) {
                    let normRoom = cleanRoom;
                    if (match.rates) {
                        if (match.rates[normRoom] !== undefined) {
                            resolvedRate = match.rates[normRoom];
                        } else {
                            let foundRate = null;
                            for (const key in match.rates) {
                                if (normRoom.includes(key) || key.includes(normRoom)) {
                                    foundRate = match.rates[key];
                                    break;
                                }
                            }
                            resolvedRate = (foundRate !== null) ? foundRate : (match.rates["STANDARD"] !== undefined ? match.rates["STANDARD"] : null);
                        }
                    }
                } else {
                    if (match.rates) {
                        const mappedCat = mapIOCLRoomCategory(item.roomCategory, cleanRoom);
                        resolvedRate = match.rates[mappedCat];
                        if (resolvedRate === undefined || resolvedRate === null) {
                            resolvedRate = match.rate;
                        } else {
                            res.explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                        }
                    } else {
                        const isGipsa = agreement.tariffMapped ? agreement.tariffMapped.toUpperCase().includes("GIPSA") : false;
                        resolvedRate = (activeSOC === TARIFF_DATA) ? (isGipsa ? match.gipsa_rate : match.tpa_rate) : match.rate;
                    }
                }
                res.expectedTariff = resolvedRate;
            }
        }

        if (res.expectedTariff !== null) {
            if (res.discountApplied === 0 && agreement.discountAgreed) {
                const discNum = parseFloat(agreement.discountAgreed);
                if (!isNaN(discNum)) {
                    res.discountApplied = discNum;
                }
            }
            res.expectedDiscountedRate = res.expectedTariff * (1 - res.discountApplied / 100);
        }

        // Step 11: Compare & Classify Exception
        if (res.expectedTariff !== null) {
            const diff = item.billedRate - res.expectedDiscountedRate;
            if (Math.abs(diff) > 1) {
                if (diff > 0) {
                    res.status = "Overcharged";
                    if (Math.abs(item.billedRate - res.expectedTariff) < 0.1 && res.discountApplied > 0) {
                        res.exceptionCode = "MAB";
                        res.status = "Missing Benefit";
                        res.explanation += ` [MAB] Agreed discount of ${res.discountApplied}% was not applied.`;
                    } else {
                        res.exceptionCode = "OC";
                        res.status = "Overcharged";
                        res.explanation += ` [OC] Billed rate ₹${item.billedRate} exceeds agreed rate ₹${res.expectedDiscountedRate}.`;
                    }
                } else {
                    res.status = "Undercharged";
                }
            }
        } else {
            res.status = "Not Found in Master";
            res.explanation += " Service not found in agreement or active SOC.";
        }

        return res;
    }

    // Component 6 – Exception Summary Panel Updates
    function updateExceptionSummaryPanel() {
        let oc = 0, mab = 0, ipa = 0, irt = 0, ea = 0;
        auditedRows.forEach(row => {
            if (!row.isIgnored && row.exceptionCode) {
                if (row.exceptionCode === "OC") oc++;
                else if (row.exceptionCode === "MAB") mab++;
                else if (row.exceptionCode === "IPA") ipa++;
                else if (row.exceptionCode === "IRT") irt++;
                else if (row.exceptionCode === "EA") ea++;
            }
        });

        const total = oc + mab + ipa + irt + ea;
        const summaryBadge = document.getElementById('exception-summary-badge');
        if (summaryBadge) {
            summaryBadge.textContent = total;
            summaryBadge.style.display = total > 0 ? 'inline-block' : 'none';
        }
        
        const cntOc = document.getElementById('exc-cnt-oc');
        const cntMab = document.getElementById('exc-cnt-mab');
        const cntIpa = document.getElementById('exc-cnt-ipa');
        const cntIrt = document.getElementById('exc-cnt-irt');
        const cntEa = document.getElementById('exc-cnt-ea');
        
        if (cntOc) cntOc.textContent = oc;
        if (cntMab) cntMab.textContent = mab;
        if (cntIpa) cntIpa.textContent = ipa;
        if (cntIrt) cntIrt.textContent = irt;
        if (cntEa) cntEa.textContent = ea;
    }

    window.toggleExceptionPanel = function() {
        const body = document.getElementById('exception-panel-body');
        const icon = document.getElementById('exception-panel-toggle-icon');
        if (!body) return;
        if (body.style.display === 'none') {
            body.style.display = 'block';
            if (icon) icon.textContent = '[ Collapse ]';
        } else {
            body.style.display = 'none';
            if (icon) icon.textContent = '[ Expand ]';
        }
    };

    function renderAgreementManager() {
        const tbody = document.getElementById('agreement-tbody');
        if (!tbody) return;
        
        if (typeof AGREEMENT_DETAILS === 'undefined' || AGREEMENT_DETAILS.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No agreements loaded.</td></tr>';
            return;
        }

        // Calculate counts for badges
        let countAll = 0;
        let countIntl = 0;
        let countExcelcare = 0;
        let countCentralised = 0;
        let countKolkata = 0;

        AGREEMENT_DETAILS.forEach(ag => {
            const scope = getAgreementScope(ag);
            countAll++;
            if (scope === 'international') countIntl++;
            else if (scope === 'excelcare') countExcelcare++;
            else if (scope === 'centralised') countCentralised++;
            else if (scope === 'kolkata') countKolkata++;
        });

        // Update badge counts in sub-tabs
        const badgeAll = document.getElementById('ag-badge-all');
        const badgeIntl = document.getElementById('ag-badge-international');
        const badgeExcelcare = document.getElementById('ag-badge-excelcare');
        const badgeCentralised = document.getElementById('ag-badge-centralised');
        const badgeKolkata = document.getElementById('ag-badge-kolkata');

        if (badgeAll) badgeAll.textContent = countAll;
        if (badgeIntl) badgeIntl.textContent = countIntl;
        if (badgeExcelcare) badgeExcelcare.textContent = countExcelcare;
        if (badgeCentralised) badgeCentralised.textContent = countCentralised;
        if (badgeKolkata) badgeKolkata.textContent = countKolkata;

        // Update description box content based on active sub-tab
        const descBox = document.getElementById('agreements-desc-box');
        if (descBox) {
            if (currentAgreementFilter === 'all') {
                descBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 0.2rem; color: var(--primary);">Payer Agreement Mapping Architecture</div>
                    <div style="line-height: 1.4;">Showing all active hospital payer agreements. These agreements define contract tariffs, billing validation rules, and discount schedules used during cycle audits.</div>
                `;
            } else if (currentAgreementFilter === 'international') {
                descBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 0.2rem; color: var(--primary);">Apollo International Agreements ( Christian Basti Branch )</div>
                    <div style="line-height: 1.4;">These agreements are tailored specifically for the Apollo International Guwahati facility. Patient bills are validated against historical Apollo International SOCs (e.g. 2021, 2024, or 2025 schedules).</div>
                `;
            } else if (currentAgreementFilter === 'excelcare') {
                descBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 0.2rem; color: var(--primary);">Excelcare Hospital Agreements</div>
                    <div style="line-height: 1.4;">These agreements are negotiated for the Excelcare unit. They map specifically to Excelcare-specific tariff structures (such as HDFC ERGO Excelcare ward templates). Excelcare patient billing validation targets these files.</div>
                `;
            } else if (currentAgreementFilter === 'centralised') {
                descBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 0.2rem; color: var(--primary);">Centralised Group Rates ( TPA & Insurances )</div>
                    <div style="line-height: 1.4;">These represent consolidated/centralised rates negotiated with major TPA and national insurance providers (such as GIPSA, Vidal, Bajaj Allianz, Aditya Birla, Tata AIG). These rates and discount tables apply uniformly across both Apollo International and Excelcare.</div>
                `;
            } else if (currentAgreementFilter === 'kolkata') {
                descBox.innerHTML = `
                    <div style="font-weight: 700; margin-bottom: 0.2rem; color: var(--primary);">Kolkata - Apollo Multispeciality Agreements</div>
                    <div style="line-height: 1.4;">These agreements are tailored specifically for the Kolkata unit. Patient bills are validated against the Kolkata Schedule of Charges (SOC) and Packages master.</div>
                `;
            }
        }

        // Populate and/or update the tariff select dropdown options dynamically
        const tariffSelect = document.getElementById('agreement-tariff-select');
        if (tariffSelect) {
            const currentSelected = tariffSelect.value || 'all';
            const uniqueTariffs = new Set();
            AGREEMENT_DETAILS.forEach(ag => {
                if (ag.tariffMapped) uniqueTariffs.add(ag.tariffMapped);
            });
            let selectHtml = '<option value="all">All Tariffs</option>';
            Array.from(uniqueTariffs).sort().forEach(t => {
                selectHtml += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`;
            });
            const currentOptions = Array.from(tariffSelect.options).map(o => o.value);
            const nextOptions = ['all', ...Array.from(uniqueTariffs).sort()];
            if (JSON.stringify(currentOptions) !== JSON.stringify(nextOptions)) {
                tariffSelect.innerHTML = selectHtml;
                tariffSelect.value = currentSelected;
                if (tariffSelect.value !== currentSelected) {
                    tariffSelect.value = 'all';
                }
            }
        }

        // Get filter inputs values
        const query = (document.getElementById('agreement-search-input')?.value || '').toLowerCase().trim();
        const selectedTariff = document.getElementById('agreement-tariff-select')?.value || 'all';
        const selectedStatus = document.getElementById('agreement-status-select')?.value || 'all';

        // Filter agreements list
        let filteredAgreements = AGREEMENT_DETAILS.filter(ag => {
            if (currentAgreementFilter === 'all') return true;
            return getAgreementScope(ag) === currentAgreementFilter;
        });

        // Apply search query filter
        if (query) {
            filteredAgreements = filteredAgreements.filter(ag => {
                return (ag.agreementName || '').toLowerCase().includes(query) ||
                       (ag.tariffMapped || '').toLowerCase().includes(query) ||
                       (ag.discountAgreed || '').toLowerCase().includes(query);
            });
        }

        // Apply tariff mapping filter
        if (selectedTariff !== 'all') {
            filteredAgreements = filteredAgreements.filter(ag => ag.tariffMapped === selectedTariff);
        }

        // Apply status filter
        if (selectedStatus !== 'all') {
            filteredAgreements = filteredAgreements.filter(ag => {
                const isValid = ag.status === 'Valid' || ag.status === 'Available' || ag.status === 'Available/Valid';
                if (selectedStatus === 'valid') return isValid;
                if (selectedStatus === 'expired') return !isValid;
                return true;
            });
        }

        if (filteredAgreements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching agreements found for the active filters.</td></tr>';
            return;
        }

        let html = '';
        filteredAgreements.forEach(ag => {
            const scope = getAgreementScope(ag);
            let scopeLabel = '';
            let scopeClass = '';
            if (scope === 'international') {
                scopeLabel = 'International';
                scopeClass = 'badge-gray';
            } else if (scope === 'excelcare') {
                scopeLabel = 'Excelcare';
                scopeClass = 'badge-diff'; // Amber
            } else if (scope === 'kolkata') {
                scopeLabel = 'Kolkata';
                scopeClass = 'badge-danger';
            } else {
                scopeLabel = 'Centralised (Both)';
                scopeClass = 'badge-match'; // Teal
            }

            const statusClass = ag.status === 'Valid' || ag.status === 'Available' || ag.status === 'Available/Valid' ? 'badge-match' : 'badge-gray';
            
            // Determine if custom agreement (defined in window.customAgreements) or static
            const isCustom = window.customAgreements && window.customAgreements.some(x => x.agreementName.toUpperCase() === ag.agreementName.toUpperCase());
            const escapedName = ag.agreementName.replace(/['"\\]/g, '\\$&');
            
            let actionsHtml = '';
            if (isCustom) {
                actionsHtml = `
                    <div style="display: flex; gap: 0.35rem; justify-content: center;">
                        <button onclick="editCustomAgreement('${escapedName}')" class="export-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); color: var(--primary);">Edit</button>
                        <button onclick="deleteCustomAgreement('${escapedName}')" class="export-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--danger);">Delete</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="display: flex; justify-content: center;">
                        <button onclick="customizeStaticAgreement('${escapedName}')" class="export-btn" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); color: var(--text-main);">Customise</button>
                    </div>
                `;
            }

            html += `
                <tr>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-weight: 700; color: var(--text-main);">
                        ${escapeHtml(ag.agreementName)}
                        ${isCustom ? ' <span class="comparison-badge badge-match" style="font-size:0.65rem; padding:0.1rem 0.3rem; margin-left:0.4rem;">Custom</span>' : ''}
                    </td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-main);">${escapeHtml(ag.tariffMapped)}</td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);"><span class="comparison-badge ${statusClass}">${escapeHtml(ag.status || 'Active')}</span></td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);"><span class="comparison-badge ${scopeClass}">${scopeLabel}</span></td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(ag.fromDate)} to ${escapeHtml(ag.toDate)}</td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); color: var(--primary); font-weight: 700;">${escapeHtml(ag.discountAgreed || 'None')}</td>
                    <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); text-align: center;">${actionsHtml}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    function renderExceptionsTable() {
        const tbody = document.getElementById('exceptions-tbody');
        const emptyState = document.getElementById('exceptions-empty-state');
        const pagContainer = document.getElementById('exceptions-pagination-container');
        const rangeDisplay = document.getElementById('exceptions-page-range-display');
        const buttonsContainer = document.getElementById('exceptions-pagination-buttons');
        
        if (!tbody) return;

        const query = (document.getElementById('exception-search-input')?.value || '').toLowerCase().trim();
        const excType = document.getElementById('exception-type-select')?.value || 'all';

        let exceptionsList = auditedRows.filter(row => row.isIgnored || row.status === "Round Off Difference");

        if (excType !== 'all') {
            exceptionsList = exceptionsList.filter(row => {
                if (excType === 'consumables') return row.status === "Ignored (Consumables)";
                if (excType === 'pharmacy') return row.status === "Ignored (Pharmacy)";
                if (excType === 'package') return row.status === "Ignored (Inside Package)";
                if (excType === 'zero') return row.status === "Ignored (Zero Rated)";
                if (excType === 'editable') return row.status === "Ignored (editable)";
                if (excType === 'roundoff') return row.status === "Round Off Difference";
                return true;
            });
        }

        if (query) {
            exceptionsList = exceptionsList.filter(row => {
                const pat = (row.patientName || '').toLowerCase();
                const ip = (row.ipNo || '').toLowerCase();
                const desc = (row.serviceName || '').toLowerCase();
                const code = (row.serviceId || '').toLowerCase();
                return pat.includes(query) || ip.includes(query) || desc.includes(query) || code.includes(query);
            });
        }

        if (exceptionsList.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'flex';
            if (pagContainer) pagContainer.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        if (pagContainer) pagContainer.style.display = 'flex';

        const totalRecords = exceptionsList.length;
        const totalPages = Math.ceil(totalRecords / exceptionPageSize);

        if (currentExceptionPage > totalPages) currentExceptionPage = totalPages;
        if (currentExceptionPage < 1) currentExceptionPage = 1;

        const startIndex = (currentExceptionPage - 1) * exceptionPageSize;
        const endIndex = Math.min(startIndex + exceptionPageSize, totalRecords);

        if (rangeDisplay) {
            rangeDisplay.textContent = `${startIndex + 1}-${endIndex} of ${totalRecords}`;
        }

        const pageData = exceptionsList.slice(startIndex, endIndex);

        let html = '';
        pageData.forEach(row => {
            let excCat = row.status.replace("Ignored (", "").replace(")", "");
            excCat = excCat.charAt(0).toUpperCase() + excCat.slice(1);

            html += `
                <tr class="collapsed-card" id="exception-row-${row.uid}">
                    <td class="always-visible" data-label="Patient Info">
                        <div style="font-weight: 700;">${escapeHtml(row.patientName)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(row.ipNo)}</div>
                    </td>
                    <td class="always-visible" data-label="Service ID"><span class="service-id">${row.serviceId}</span></td>
                    <td class="always-visible" data-label="Description"><div class="service-name" title="${escapeHtml(row.serviceName)}" style="max-width: 320px;">${escapeHtml(row.serviceName)}</div></td>
                    <td data-label="Room Category"><div class="dept-tag">${escapeHtml(row.roomCategory || 'Others')}</div></td>
                    <td data-label="Billed Rate" style="text-align: right; font-weight: 700; font-family: 'Book Antiqua', serif;">${formatCurrency(row.billedRate)}</td>
                    <td data-label="Exception Type" style="text-align: center;"><span class="comparison-badge badge-gray">${escapeHtml(excCat)}</span></td>
                    <td data-label="Explanation" style="color: var(--text-muted); font-size: 0.8rem; text-align: left;">${escapeHtml(row.explanation)}</td>
                    <td class="action-cell mobile-only-block" style="display: none;">
                        <button class="card-expand-toggle" onclick="event.stopPropagation(); window.toggleExceptionCardExpand('${row.uid}')">View Details</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        if (buttonsContainer) {
            buttonsContainer.innerHTML = '';
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.disabled = currentExceptionPage === 1;
            prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>';
            prevBtn.addEventListener('click', () => {
                currentExceptionPage--;
                renderExceptionsTable();
            });
            buttonsContainer.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentExceptionPage - 1 && i <= currentExceptionPage + 1)) {
                    const btn = document.createElement('button');
                    btn.className = `page-btn ${i === currentExceptionPage ? 'active' : ''}`;
                    btn.textContent = i;
                    btn.addEventListener('click', () => {
                        currentExceptionPage = i;
                        renderExceptionsTable();
                    });
                    buttonsContainer.appendChild(btn);
                } else if (i === 2 || i === totalPages - 1) {
                    const dot = document.createElement('span');
                    dot.textContent = '...';
                    dot.style.padding = '0 0.25rem';
                    dot.style.color = 'var(--text-muted)';
                    buttonsContainer.appendChild(dot);
                }
            }

            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.disabled = currentExceptionPage === totalPages;
            nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>';
            nextBtn.addEventListener('click', () => {
                currentExceptionPage++;
                renderExceptionsTable();
            });
            buttonsContainer.appendChild(nextBtn);
        }
    }



    function updateTabBadges() {
        const masterBadge = document.getElementById('tab-badge-master');
        if (masterBadge) masterBadge.textContent = UNIFIED_TARIFFS.length.toLocaleString();

        const auditBadge = document.getElementById('tab-badge-audit');
        if (auditBadge) auditBadge.textContent = auditedRows.length.toLocaleString();

        const agreementBadge = document.getElementById('tab-badge-agreement');
        if (agreementBadge) agreementBadge.textContent = (typeof AGREEMENT_DETAILS !== 'undefined' ? AGREEMENT_DETAILS.length : 0).toLocaleString();

        const exceptionsBadge = document.getElementById('tab-badge-exceptions');
        if (exceptionsBadge) {
            const excCount = auditedRows.filter(r => r.isIgnored || r.status === "Round Off Difference").length;
            exceptionsBadge.textContent = excCount.toLocaleString();
        }
        if (typeof updateExceptionSummaryPanel === 'function') {
            updateExceptionSummaryPanel();
        }
    }


    // ==========================================
    // CHECKING CONSOLE & OneDrive REPLICA CONTROLLERS
    // ==========================================

    function getCheckingBillsDataset() {
        let billsList = [];
        
        // Load from saved_audits
        let db = [];
        try {
            const stored = localStorage.getItem('brc_v2_saved_audits');
            if (stored) db = JSON.parse(stored);
        } catch(e) {
            console.error('Error loading saved audits:', e);
        }
        
        db.forEach(audit => {
            let runDateStr = 'Unknown';
            try {
                if (audit.uploadDate) {
                    runDateStr = new Date(audit.uploadDate).toISOString().split('T')[0];
                }
            } catch(e) {}
            
            const rows = getSavedRecordRows(audit);
            const billsInAudit = {};
            
            rows.forEach(r => {
                const bNo = String(r.billNo || r.ipNo || 'No Bill ID').trim();
                if (!billsInAudit[bNo]) {
                    billsInAudit[bNo] = {
                        date: runDateStr,
                        billNo: bNo,
                        customer: r.customer || audit.customer || 'General',
                        template: '(blank)',
                        checkedStatus: 'Not Checked',
                        billValue: 0,
                        socYear: r.rateType || '',
                        discountPercent: r.discountApplied || 0,
                        shortCharged: 0,
                        excessCharged: 0,
                        businessUnit: audit.businessUnit || 'Guwahati',
                        hasMatchedRows: false
                    };
                }
                const b = billsInAudit[bNo];
                b.billValue += (r.billedRate || 0);
                
                // Checked status rule: if expectedTariff is matched, consider checked
                if (r.expectedTariff !== null && !r.isIgnored && r.status !== 'Not Found in Master') {
                    b.hasMatchedRows = true;
                    if (r.rateType) b.socYear = r.rateType;
                    b.template = r.rateType || audit.customer || 'Matched';
                }
                
                // Sum variance charges
                if (r.status === 'Undercharged' && r.diff < 0) {
                    b.shortCharged += Math.abs(r.diff);
                } else if (r.status === 'Overcharged' && r.diff > 0) {
                    b.excessCharged += r.diff;
                }
            });
            
            Object.values(billsInAudit).forEach(b => {
                if (b.hasMatchedRows) {
                    b.checkedStatus = 'Checked';
                }
                billsList.push(b);
            });
        });
        
        // Load active session rows if present
        if (window.auditedRows && window.auditedRows.length > 0) {
            const runDateStr = new Date().toISOString().split('T')[0];
            const billsInActive = {};
            
            window.auditedRows.forEach(r => {
                const bNo = String(r.billNo || r.ipNo || 'No Bill ID').trim();
                if (!billsInActive[bNo]) {
                    billsInActive[bNo] = {
                        date: runDateStr + ' (Active)',
                        billNo: bNo,
                        customer: r.customer || 'General',
                        template: '(blank)',
                        checkedStatus: 'Not Checked',
                        billValue: 0,
                        socYear: r.rateType || '',
                        discountPercent: r.discountApplied || 0,
                        shortCharged: 0,
                        excessCharged: 0,
                        businessUnit: document.getElementById('audit-bu-select')?.value || 'Guwahati',
                        hasMatchedRows: false
                    };
                }
                const b = billsInActive[bNo];
                b.billValue += (r.billedRate || 0);
                
                if (r.expectedTariff !== null && !r.isIgnored && r.status !== 'Not Found in Master') {
                    b.hasMatchedRows = true;
                    b.template = r.rateType || 'Matched';
                }
                
                if (r.status === 'Undercharged' && r.diff < 0) {
                    b.shortCharged += Math.abs(r.diff);
                } else if (r.status === 'Overcharged' && r.diff > 0) {
                    b.excessCharged += r.diff;
                }
            });
            
            Object.values(billsInActive).forEach(b => {
                if (b.hasMatchedRows) {
                    b.checkedStatus = 'Checked';
                }
                const dupIdx = billsList.findIndex(x => x.billNo === b.billNo);
                if (dupIdx > -1) {
                    billsList[dupIdx] = b;
                } else {
                    billsList.push(b);
                }
            });
        }
        
        return billsList;
    }

    window.updateCheckingDashboard = function() {
        const dateSelect = document.getElementById('checking-filter-date');
        const buSelect = document.getElementById('checking-filter-bu');
        
        if (!dateSelect || !buSelect) return;

        const dateFilter = dateSelect.value;
        const buFilter = buSelect.value;

        const allBills = getCheckingBillsDataset();

        // Populate Date Filter dropdown if it has only All Dates option
        const uniqueDates = [...new Set(allBills.map(b => b.date))].sort((a,b) => b.localeCompare(a));
        let uniqueBus = [...new Set(allBills.map(b => b.businessUnit))].sort();
        if (window.currentUserUnit && window.currentUserUnit !== 'all') {
            uniqueBus = [window.currentUserUnit];
        }

        const curDateVal = dateSelect.value;
        const curBuVal = buSelect.value;

        if (dateSelect.options.length <= 1 && uniqueDates.length > 0) {
            dateSelect.innerHTML = '<option value="all">All Dates</option>';
            uniqueDates.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                dateSelect.appendChild(opt);
            });
            dateSelect.value = curDateVal || 'all';
        }

        if (buSelect.options.length <= 1 && uniqueBus.length > 0) {
            if (window.currentUserUnit && window.currentUserUnit !== 'all') {
                buSelect.innerHTML = '';
            } else {
                buSelect.innerHTML = '<option value="all">All Units</option>';
            }
            uniqueBus.forEach(bu => {
                const opt = document.createElement('option');
                opt.value = bu;
                opt.textContent = bu;
                buSelect.appendChild(opt);
            });
            buSelect.value = (window.currentUserUnit && window.currentUserUnit !== 'all') ? window.currentUserUnit : (curBuVal || 'all');
        }

        // Apply filters
        let filtered = allBills;
        if (window.currentUserUnit && window.currentUserUnit !== 'all') {
            filtered = filtered.filter(b => b.businessUnit === window.currentUserUnit);
        }
        if (dateSelect.value !== 'all') {
            filtered = filtered.filter(b => b.date === dateSelect.value);
        }
        if (buSelect.value !== 'all') {
            filtered = filtered.filter(b => b.businessUnit === buSelect.value);
        }

        checkingLedgerFilteredBills = filtered;

        // Compute KPIs
        const totalBillsCount = filtered.length;
        const checkedBills = filtered.filter(b => b.checkedStatus === 'Checked');
        const checkedBillsCount = checkedBills.length;
        const billsPercent = totalBillsCount > 0 ? (checkedBillsCount / totalBillsCount) * 100 : 0;

        const totalAmount = filtered.reduce((acc, b) => acc + b.billValue, 0);
        const checkedAmount = checkedBills.reduce((acc, b) => acc + b.billValue, 0);
        const amountPercent = totalAmount > 0 ? (checkedAmount / totalAmount) * 100 : 0;

        const uniqueCustomers = [...new Set(checkedBills.map(b => b.customer))].length;

        const billsWithExcess = checkedBills.filter(b => b.excessCharged > 0);
        const excessCount = billsWithExcess.length;
        const totalExcessVal = billsWithExcess.reduce((acc, b) => acc + b.excessCharged, 0);

        const billsWithShort = checkedBills.filter(b => b.shortCharged > 0);
        const shortCount = billsWithShort.length;
        const totalShortVal = billsWithShort.reduce((acc, b) => acc + b.shortCharged, 0);

        // Update KPIs DOM
        const kpiDateEl = document.getElementById('checking-kpi-date');
        if (kpiDateEl) kpiDateEl.textContent = dateSelect.value === 'all' ? 'All Dates' : dateSelect.value;
        
        const kpiBillsCountEl = document.getElementById('checking-kpi-bills-count');
        if (kpiBillsCountEl) kpiBillsCountEl.textContent = `${checkedBillsCount} / ${totalBillsCount}`;
        
        const kpiBillsPercentEl = document.getElementById('checking-kpi-bills-percent');
        if (kpiBillsPercentEl) kpiBillsPercentEl.textContent = `${billsPercent.toFixed(1)}% Checked`;

        const formatKpiCurrency = (num) => {
            if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
            if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
            return '₹' + Math.round(num).toLocaleString('en-IN');
        };

        const kpiAmountEl = document.getElementById('checking-kpi-amount');
        if (kpiAmountEl) kpiAmountEl.textContent = `${formatKpiCurrency(checkedAmount)} / ${formatKpiCurrency(totalAmount)}`;
        
        const kpiAmountPercentEl = document.getElementById('checking-kpi-amount-percent');
        if (kpiAmountPercentEl) kpiAmountPercentEl.textContent = `${amountPercent.toFixed(1)}% Checked`;

        const kpiCustomersEl = document.getElementById('checking-kpi-customers');
        if (kpiCustomersEl) kpiCustomersEl.textContent = uniqueCustomers.toLocaleString();

        const kpiExcessCountEl = document.getElementById('checking-kpi-excess-count');
        if (kpiExcessCountEl) kpiExcessCountEl.textContent = `${excessCount} Bill${excessCount !== 1 ? 's' : ''}`;
        
        const kpiExcessValueEl = document.getElementById('checking-kpi-excess-value');
        if (kpiExcessValueEl) kpiExcessValueEl.textContent = `Total Excess: ₹${Math.round(totalExcessVal).toLocaleString('en-IN')}`;

        const kpiShortCountEl = document.getElementById('checking-kpi-short-count');
        if (kpiShortCountEl) kpiShortCountEl.textContent = `${shortCount} Bill${shortCount !== 1 ? 's' : ''}`;
        
        const kpiShortValueEl = document.getElementById('checking-kpi-short-value');
        if (kpiShortValueEl) kpiShortValueEl.textContent = `Total Short: ₹${Math.round(totalShortVal).toLocaleString('en-IN')}`;

        // Charts
        updateCheckingCharts(checkedBillsCount, totalBillsCount - checkedBillsCount, checkedAmount, totalAmount - checkedAmount, totalExcessVal, totalShortVal);

        // Render Ledger
        checkingLedgerCurrentPage = 1;
        window.filterCheckingLedger();
    };

    function updateCheckingCharts(checkedCount, uncheckedCount, checkedVal, uncheckedVal, excessVal, shortVal) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        if (checkingCoverageChartInstance) checkingCoverageChartInstance.destroy();
        if (checkingDiscrepancyChartInstance) checkingDiscrepancyChartInstance.destroy();

        const canvasCoverage = document.getElementById('checking-chart-coverage');
        const canvasDiscrepancy = document.getElementById('checking-chart-discrepancy');

        if (!canvasCoverage || !canvasDiscrepancy) return;

        const ctxCoverage = canvasCoverage.getContext('2d');
        checkingCoverageChartInstance = new Chart(ctxCoverage, {
            type: 'doughnut',
            data: {
                labels: ['Checked Bills', 'Unchecked Bills'],
                datasets: [{
                    data: [checkedCount, uncheckedCount],
                    backgroundColor: [isDark ? '#0d9488' : '#0f766e', isDark ? '#3a506b' : '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a,b) => a+b, 0);
                                const val = context.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${val} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });

        const ctxDiscrepancy = canvasDiscrepancy.getContext('2d');
        checkingDiscrepancyChartInstance = new Chart(ctxDiscrepancy, {
            type: 'doughnut',
            data: {
                labels: ['Excess Charged', 'Short Charged'],
                datasets: [{
                    data: [excessVal, shortVal],
                    backgroundColor: [isDark ? '#f59e0b' : '#b45309', isDark ? '#ef4444' : '#b91c1c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a,b) => a+b, 0);
                                const val = context.raw;
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ₹${Math.round(val).toLocaleString('en-IN')} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    window.filterCheckingLedger = function() {
        const queryEl = document.getElementById('checking-ledger-search');
        const query = queryEl ? queryEl.value.toLowerCase().trim() : '';
        let list = checkingLedgerFilteredBills;

        if (query) {
            list = list.filter(b => {
                const billNo = b.billNo.toLowerCase();
                const customer = b.customer.toLowerCase();
                const template = b.template.toLowerCase();
                return billNo.includes(query) || customer.includes(query) || template.includes(query);
            });
        }

        renderCheckingLedgerTable(list);
    };

    function renderCheckingLedgerTable(list) {
        const tbody = document.getElementById('checking-ledger-tbody');
        const rangeEl = document.getElementById('checking-ledger-range');
        const paginationEl = document.getElementById('checking-ledger-pagination');

        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 3rem;">No bills match the current filters.</td></tr>';
            if (rangeEl) rangeEl.textContent = 'Showing 0-0 of 0 bills';
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        const totalRecords = list.length;
        const totalPages = Math.ceil(totalRecords / checkingLedgerPageSize);

        if (checkingLedgerCurrentPage > totalPages) checkingLedgerCurrentPage = totalPages;
        if (checkingLedgerCurrentPage < 1) checkingLedgerCurrentPage = 1;

        const startIndex = (checkingLedgerCurrentPage - 1) * checkingLedgerPageSize;
        const endIndex = Math.min(startIndex + checkingLedgerPageSize, totalRecords);

        if (rangeEl) {
            rangeEl.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalRecords} bills`;
        }

        const pageData = list.slice(startIndex, endIndex);

        let html = '';
        pageData.forEach(b => {
            const statusBadge = b.checkedStatus === 'Checked' 
                ? '<span style="background-color: var(--success-bg); color: var(--success); padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">Checked</span>'
                : '<span style="background-color: var(--bg-hover); color: var(--text-muted); padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.72rem; border: 1px dashed var(--border);">Not Checked</span>';
            
            const shortStr = b.shortCharged > 0 
                ? `<span style="color: var(--danger); font-weight: 700;">₹${Math.round(b.shortCharged).toLocaleString('en-IN')}</span>` 
                : '<span style="color: var(--text-muted);">-</span>';

            const excessStr = b.excessCharged > 0 
                ? `<span style="color: var(--warning); font-weight: 700;">₹${Math.round(b.excessCharged).toLocaleString('en-IN')}</span>` 
                : '<span style="color: var(--text-muted);">-</span>';

            html += `
                <tr style="border-bottom: 1px solid var(--border); transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--bg-hover)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${b.date}</td>
                    <td style="padding: 0.75rem 1rem; font-weight: 700; color: var(--text-main);">${escapeHtml(b.billNo)}</td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-main); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(b.customer)}">${escapeHtml(b.customer)}</td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.75rem;">${escapeHtml(b.template)}</td>
                    <td style="padding: 0.75rem 1rem;">${statusBadge}</td>
                    <td style="padding: 0.75rem 1rem; text-align: right; font-weight: 700; font-family: 'Book Antiqua', serif;">₹${Math.round(b.billValue).toLocaleString('en-IN')}</td>
                    <td style="padding: 0.75rem 1rem; text-align: right; font-family: 'Book Antiqua', serif;">${shortStr}</td>
                    <td style="padding: 0.75rem 1rem; text-align: right; font-family: 'Book Antiqua', serif;">${excessStr}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        if (paginationEl) {
            paginationEl.innerHTML = '';
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.disabled = checkingLedgerCurrentPage === 1;
            prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>';
            prevBtn.addEventListener('click', () => {
                checkingLedgerCurrentPage--;
                renderCheckingLedgerTable(list);
            });
            paginationEl.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= checkingLedgerCurrentPage - 1 && i <= checkingLedgerCurrentPage + 1)) {
                    const btn = document.createElement('button');
                    btn.className = `page-btn ${i === checkingLedgerCurrentPage ? 'active' : ''}`;
                    btn.textContent = i;
                    btn.addEventListener('click', () => {
                        checkingLedgerCurrentPage = i;
                        renderCheckingLedgerTable(list);
                    });
                    paginationEl.appendChild(btn);
                } else if (i === 2 || i === totalPages - 1) {
                    const dot = document.createElement('span');
                    dot.textContent = '...';
                    dot.style.padding = '0 0.25rem';
                    dot.style.color = 'var(--text-muted)';
                    paginationEl.appendChild(dot);
                }
            }

            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.disabled = checkingLedgerCurrentPage === totalPages;
            nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';
            nextBtn.addEventListener('click', () => {
                checkingLedgerCurrentPage++;
                renderCheckingLedgerTable(list);
            });
            paginationEl.appendChild(nextBtn);
        }
    }

    function getActiveOverrideUnit() {
        const u = window.currentUserUnit || 'all';
        if (u === 'all') {
            const select = document.getElementById('audit-bu-select');
            return (select && select.value) ? select.value : 'excelcare';
        }
        return u;
    }

    window.loadUnitCustomDiscounts = function() {
        const activeUnit = getActiveOverrideUnit();
        try {
            window.customDeptDiscounts = safeJsonParse(localStorage.getItem(`customDeptDiscounts_${activeUnit}`), {});
            window.customItemDiscounts = safeJsonParse(localStorage.getItem(`customItemDiscounts_${activeUnit}`), {});
        } catch (e) {
            console.error("Error loading unit custom discounts:", e);
            window.customDeptDiscounts = {};
            window.customItemDiscounts = {};
        }
        if (typeof renderDeptDiscounts === 'function') renderDeptDiscounts();
        if (typeof renderItemDiscounts === 'function') renderItemDiscounts();
    };

    window.customDeptDiscounts = {};
    window.customItemDiscounts = {};
    let allDepartmentsList = [];

    function initCustomOverrides() {
        if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
            const depts = new Set();
            TARIFF_DATA.forEach(item => {
                if (item.dept) depts.add(item.dept);
            });
            allDepartmentsList = Array.from(depts).sort();
        }

        const btnToggleDepts = document.getElementById('btn-toggle-depts');
        const btnToggleItems = document.getElementById('btn-toggle-items');
        const tabDeptsContent = document.getElementById('tab-depts-content');
        const tabItemsContent = document.getElementById('tab-items-content');

        if (btnToggleDepts && btnToggleItems && tabDeptsContent && tabItemsContent) {
            btnToggleDepts.addEventListener('click', () => {
                btnToggleDepts.style.background = '#d97706';
                btnToggleDepts.style.color = 'white';
                btnToggleItems.style.background = 'transparent';
                btnToggleItems.style.color = '#d97706';
                tabDeptsContent.style.display = 'flex';
                tabItemsContent.style.display = 'none';
                renderDeptDiscounts();
            });

            btnToggleItems.addEventListener('click', () => {
                btnToggleItems.style.background = '#d97706';
                btnToggleItems.style.color = 'white';
                btnToggleDepts.style.background = 'transparent';
                btnToggleDepts.style.color = '#d97706';
                tabItemsContent.style.display = 'flex';
                tabDeptsContent.style.display = 'none';
                renderItemDiscounts();
            });
        }

        const btnClearOverrides = document.getElementById('btn-clear-overrides');
        if (btnClearOverrides) {
            btnClearOverrides.addEventListener('click', () => {
                if (confirm("Are you sure you want to clear all custom department and item overrides for this unit?")) {
                    window.customDeptDiscounts = {};
                    window.customItemDiscounts = {};
                    const activeUnit = getActiveOverrideUnit();
                    localStorage.removeItem(`customDeptDiscounts_${activeUnit}`);
                    localStorage.removeItem(`customItemDiscounts_${activeUnit}`);
                    
                    const searchDeptInput = document.getElementById('search-override-dept');
                    if (searchDeptInput) searchDeptInput.value = '';
                    const searchItemInput = document.getElementById('search-override-item');
                    if (searchItemInput) searchItemInput.value = '';
                    
                    renderDeptDiscounts();
                    renderItemDiscounts();
                }
            });
        }

        const searchDeptInput = document.getElementById('search-override-dept');
        if (searchDeptInput) {
            searchDeptInput.addEventListener('input', renderDeptDiscounts);
        }

        const listDeptDiv = document.getElementById('list-override-depts');
        if (listDeptDiv) {
            listDeptDiv.addEventListener('input', e => {
                if (e.target.classList.contains('dept-discount-input')) {
                    const dept = e.target.getAttribute('data-dept');
                    const activeUnit = getActiveOverrideUnit();
                    if (e.target.value === '') {
                        delete window.customDeptDiscounts[dept];
                    } else {
                        const val = parseInt(e.target.value, 10);
                        window.customDeptDiscounts[dept] = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
                    }
                    localStorage.setItem(`customDeptDiscounts_${activeUnit}`, JSON.stringify(window.customDeptDiscounts));
                }
            });
        }

        const searchItemInput = document.getElementById('search-override-item');
        const suggestionsDiv = document.getElementById('suggestions-override-item');
        
        if (searchItemInput && suggestionsDiv) {
            searchItemInput.addEventListener('input', () => {
                const query = searchItemInput.value.toUpperCase().trim();
                if (query.length < 3) {
                    suggestionsDiv.style.display = 'none';
                    return;
                }
                
                if (typeof TARIFF_DATA !== 'undefined' && Array.isArray(TARIFF_DATA)) {
                    const matches = TARIFF_DATA.filter(item => 
                        (item.id && String(item.id).includes(query)) || 
                        (item.name && String(item.name).toUpperCase().includes(query))
                    ).slice(0, 30);

                    if (matches.length === 0) {
                        suggestionsDiv.innerHTML = '<div style="padding: 0.5rem; font-size: 0.75rem; color: var(--text-muted); text-align: center;">No matches found</div>';
                    } else {
                        suggestionsDiv.innerHTML = matches.map(item => `
                            <div class="suggestion-item" data-id="${item.id}" data-name="${item.name.replace(/"/g, '&quot;')}" data-dept="${item.dept || ''}" style="padding: 0.4rem 0.6rem; font-size: 0.75rem; cursor: pointer; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.1rem;">
                                <span style="font-weight: 700; color: var(--text-main);">${item.name}</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted);">Code: ${item.id} | Dept: ${item.dept || 'N/A'}</span>
                            </div>
                        `).join('');

                        Array.from(suggestionsDiv.querySelectorAll('.suggestion-item')).forEach(el => {
                            el.addEventListener('mouseenter', () => el.style.backgroundColor = 'var(--bg-hover)');
                            el.addEventListener('mouseleave', () => el.style.backgroundColor = 'transparent');
                            el.addEventListener('click', () => {
                                const itemId = el.getAttribute('data-id');
                                const itemName = el.getAttribute('data-name');
                                const itemDept = el.getAttribute('data-dept');
                                const activeUnit = getActiveOverrideUnit();
                                window.customItemDiscounts[itemId] = {
                                    name: itemName,
                                    dept: itemDept,
                                    discount: 0
                                };
                                localStorage.setItem(`customItemDiscounts_${activeUnit}`, JSON.stringify(window.customItemDiscounts));
                                searchItemInput.value = '';
                                suggestionsDiv.style.display = 'none';
                                renderItemDiscounts();
                            });
                        });
                    }
                    suggestionsDiv.style.display = 'block';
                }
            });

            document.addEventListener('click', e => {
                if (!searchItemInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.style.display = 'none';
                }
            });
        }

        const listItemDiv = document.getElementById('list-override-items');
        if (listItemDiv) {
            listItemDiv.addEventListener('input', e => {
                if (e.target.classList.contains('item-discount-input')) {
                    const id = e.target.getAttribute('data-id');
                    const activeUnit = getActiveOverrideUnit();
                    if (window.customItemDiscounts[id]) {
                        if (e.target.value === '') {
                            window.customItemDiscounts[id].discount = 0;
                        } else {
                            const val = parseInt(e.target.value, 10);
                            window.customItemDiscounts[id].discount = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
                        }
                        localStorage.setItem(`customItemDiscounts_${activeUnit}`, JSON.stringify(window.customItemDiscounts));
                    }
                }
            });

            listItemDiv.addEventListener('click', e => {
                const btn = e.target.closest('.btn-delete-item-discount');
                if (btn) {
                    const id = btn.getAttribute('data-id');
                    const activeUnit = getActiveOverrideUnit();
                    delete window.customItemDiscounts[id];
                    localStorage.setItem(`customItemDiscounts_${activeUnit}`, JSON.stringify(window.customItemDiscounts));
                    renderItemDiscounts();
                }
            });
        }

        renderDeptDiscounts();
        renderItemDiscounts();
    }

    function renderDeptDiscounts() {
        const searchInput = document.getElementById('search-override-dept');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const listDiv = document.getElementById('list-override-depts');
        if (!listDiv) return;
        
        const filtered = allDepartmentsList.filter(dept => 
            dept.toLowerCase().includes(searchVal)
        );
        
        if (filtered.length === 0) {
            listDiv.innerHTML = '<tr><td colspan="2" style="padding: 0.5rem; font-size: 0.72rem; color: var(--text-muted); text-align: center;">No departments match</td></tr>';
            return;
        }
        
        listDiv.innerHTML = filtered.map(dept => {
            const val = window.customDeptDiscounts[dept] !== undefined ? window.customDeptDiscounts[dept] : '';
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 0.35rem 0.5rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--text-main); font-weight: 500;" title="${dept}">${dept}</td>
                    <td style="padding: 0.35rem 0.5rem; text-align: center;">
                        <input type="number" class="override-input dept-discount-input" data-dept="${dept.replace(/"/g, '&quot;')}" value="${val}" min="0" max="100" placeholder="0" style="width: 45px; padding: 0.15rem 0.25rem; font-size: 0.72rem; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-page); color: var(--text-main); text-align: center; margin: 0 auto; display: block;">
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderItemDiscounts() {
        const listDiv = document.getElementById('list-override-items');
        if (!listDiv) return;
        
        const keys = Object.keys(window.customItemDiscounts);
        if (keys.length === 0) {
            listDiv.innerHTML = '<tr><td colspan="4" style="padding: 0.5rem; font-size: 0.72rem; color: var(--text-muted); text-align: center;">No item overrides set</td></tr>';
            return;
        }
        
        listDiv.innerHTML = keys.map(id => {
            const obj = window.customItemDiscounts[id];
            const val = obj.discount !== undefined ? obj.discount : 0;
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 0.35rem 0.5rem; color: var(--text-muted); font-family: monospace; font-size: 0.65rem;" title="${id}">${id}</td>
                    <td style="padding: 0.35rem 0.5rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--text-main); font-weight: 500;" title="${obj.name}">${obj.name}</td>
                    <td style="padding: 0.35rem 0.5rem; text-align: center;">
                        <input type="number" class="override-input item-discount-input" data-id="${id}" value="${val}" min="0" max="100" style="width: 45px; padding: 0.15rem 0.25rem; font-size: 0.72rem; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-page); color: var(--text-main); text-align: center; margin: 0 auto; display: block;">
                    </td>
                    <td style="padding: 0.35rem 0.5rem; text-align: center;">
                        <button class="btn-delete-item-discount" data-id="${id}" type="button" style="background: none; border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0.1rem; margin: 0 auto;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function initCheckingDashboard() {
        const searchInput = document.getElementById('checking-ledger-search');
        if (searchInput) {
            searchInput.addEventListener('input', window.filterCheckingLedger);
        }
    }

    const CREDS_CACHE_VERSION = 'V1.3.0';

    async function initUserCredentials() {
        const defaultFallback = [
            // Excelcare Unit
            { username: 'Review', password: '0925e05f5675f50e0437bbca40253c55301b2bb736f3d888ad3a96633ae08d30', role: 'Viewer', unit: 'excelcare' },
            { username: 'BRC', password: 'c7240e7f16fe9cb50bbcbc2aaf710051adeaea15f2fb892cfbe774518474f920', role: 'Auditor', unit: 'excelcare' },
            { username: 'BRC1', password: '567a32694a4b8d77301b7324ff6b8ff3fd583b0511a9dc4589a2aab938b86533', role: 'Approver', unit: 'excelcare' },
            { username: 'admin', password: '8337cc7788bd6877d6107cc621f5429e25ebe5f6a2381ae193cd00504f4ef025', role: 'Administrator', unit: 'excelcare' },
            // International Unit
            { username: 'Review', password: '0925e05f5675f50e0437bbca40253c55301b2bb736f3d888ad3a96633ae08d30', role: 'Viewer', unit: 'international' },
            { username: 'BRC', password: 'c7240e7f16fe9cb50bbcbc2aaf710051adeaea15f2fb892cfbe774518474f920', role: 'Auditor', unit: 'international' },
            { username: 'BRC1', password: '567a32694a4b8d77301b7324ff6b8ff3fd583b0511a9dc4589a2aab938b86533', role: 'Approver', unit: 'international' },
            { username: 'admin', password: '1ab37526146fea387e7e1e57dae16fa344408b38b5277a28e4be67c58dd28c84', role: 'Administrator', unit: 'international' },
            // Kolkata Unit
            { username: 'Review', password: '0925e05f5675f50e0437bbca40253c55301b2bb736f3d888ad3a96633ae08d30', role: 'Viewer', unit: 'kolkata' },
            { username: 'BRC', password: 'c7240e7f16fe9cb50bbcbc2aaf710051adeaea15f2fb892cfbe774518474f920', role: 'Auditor', unit: 'kolkata' },
            { username: 'BRC1', password: '567a32694a4b8d77301b7324ff6b8ff3fd583b0511a9dc4589a2aab938b86533', role: 'Approver', unit: 'kolkata' },
            { username: 'admin', password: '3069fd7661b6b5c87a9999326327e1e00f7d20de0ad17cc7c757ce803afba756', role: 'Administrator', unit: 'kolkata' },
            { username: 'kol_viewer', password: '9719baa8b0cd4455798fa39f2b33db5a2aad2ef812aeb08f8526e308ee06934f', role: 'Viewer', unit: 'kolkata' },
            { username: 'kol_auditor', password: 'abb643817747ee505c7f63c94fecb5a0cdbe9d471f85481140bfbbcce485fc58', role: 'Auditor', unit: 'kolkata' },
            { username: 'kol_reviewer', password: '78c0d84a074f69d0d3ccdad70404828cdeefde95bfd0bd2a205fffb9f84fd541', role: 'Approver', unit: 'kolkata' },
            { username: 'kol_admin', password: '3069fd7661b6b5c87a9999326327e1e00f7d20de0ad17cc7c757ce803afba756', role: 'Administrator', unit: 'kolkata' }
        ];

        // Bust stale localStorage if version has changed
        const cachedVersion = localStorage.getItem('brc_v2_creds_version');
        if (cachedVersion !== CREDS_CACHE_VERSION) {
            localStorage.setItem('brc_v2_creds_version', CREDS_CACHE_VERSION);
        }

        // Always try server first — this is the authoritative source
        try {
            const response = await fetch('/api/load_users');
            if (response.ok) {
                const serverCreds = await response.json();
                if (Array.isArray(serverCreds) && serverCreds.length > 0) {
                    window.userCredentials = serverCreds;
                    localStorage.setItem('brc_v2_user_credentials', JSON.stringify(serverCreds));
                    localStorage.setItem('brc_v2_creds_version', CREDS_CACHE_VERSION);
                    if (typeof window.renderAdminCenter === 'function') {
                        window.renderAdminCenter();
                    }
                    return; // Server data loaded — done
                }
            }
        } catch (e) {
            console.warn("Could not load user credentials from server. Falling back to local cache:", e);
        }

        // Fallback: try localStorage cache
        const savedCreds = localStorage.getItem('brc_v2_user_credentials');
        if (savedCreds) {
            try {
                window.userCredentials = JSON.parse(savedCreds);
                return;
            } catch (e) {
                console.warn("Corrupted localStorage credentials, using defaults.");
            }
        }

        // Last resort: use built-in defaults
        window.userCredentials = defaultFallback;
    }

    function applyUnitRestrictions() {
        const unit = window.currentUserUnit || 'all';
        const buSelects = [
            document.getElementById('master-bu-select'),
            document.getElementById('audit-bu-select'),
            document.getElementById('repo-filter-bu'),
            document.getElementById('checking-filter-bu')
        ];
        
        buSelects.forEach(select => {
            if (select) {
                if (unit !== 'all') {
                    select.value = unit;
                    select.disabled = true;
                    // Trigger change event to filter lists automatically
                    select.dispatchEvent(new Event('change'));
                } else {
                    select.disabled = false;
                }
            }
        });
    }

    function checkUserLoginState() {
        const savedSession = localStorage.getItem('brc_v2_logged_in_user');
        const loginPanel = document.getElementById('full-page-login');
        
        if (savedSession) {
            const sessionData = safeJsonParse(savedSession);
            if (!sessionData) {
                // If corrupted, remove it and act as logged out
                localStorage.removeItem('brc_v2_logged_in_user');
                window.currentUserRole = 'Viewer';
                window.previousUserRole = 'Viewer';
                window.currentUserUnit = 'all';
                if (userRoleSelect) userRoleSelect.value = 'Viewer';
                if (loginPanel) loginPanel.classList.remove('hidden');
                updateUserHeaderProfile('Guest', 'Viewer');
                updateUIForRole();
                applyUnitRestrictions();
                return;
            }
            window.currentUserRole = sessionData.role;
            window.previousUserRole = sessionData.role;
            window.currentUserUnit = sessionData.unit || 'all';
            
            const userRoleSelect = document.getElementById('user-role-select');
            if (userRoleSelect) userRoleSelect.value = sessionData.role;
            
            if (loginPanel) loginPanel.classList.add('hidden');
            
            let unitLabel = '';
            if (window.currentUserUnit === 'international') unitLabel = ' (Intl)';
            else if (window.currentUserUnit === 'excelcare') unitLabel = ' (Excelcare)';
            else if (window.currentUserUnit === 'kolkata') unitLabel = ' (Kolkata)';
            else unitLabel = ' (Global)';
            
            updateUserHeaderProfile(sessionData.username + unitLabel, sessionData.role);
            updateUIForRole();
            applyUnitRestrictions();
            if (typeof window.loadUnitCustomDiscounts === 'function') {
                window.loadUnitCustomDiscounts();
            }
        } else {
            window.currentUserRole = 'Viewer';
            window.previousUserRole = 'Viewer';
            window.currentUserUnit = 'all';
            
            const userRoleSelect = document.getElementById('user-role-select');
            if (userRoleSelect) userRoleSelect.value = 'Viewer';
            
            if (loginPanel) loginPanel.classList.remove('hidden');
            
            updateUserHeaderProfile('Guest', 'Viewer');
            updateUIForRole();
            applyUnitRestrictions();
            if (typeof window.loadUnitCustomDiscounts === 'function') {
                window.loadUnitCustomDiscounts();
            }
        }
    }

    // Sync login state across multiple open tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'brc_v2_logged_in_user') {
            checkUserLoginState();
        }
    });

    // Inactivity Timeout Management
    let lastActivityTime = Date.now();
    let warningTimer = null;
    let logoutTimer = null;
    let countdownInterval = null;
    const WARNING_TIMEOUT = 5 * 60 * 1000;  // 5 minutes
    const LOGOUT_TIMEOUT = 10 * 60 * 1000;  // 10 minutes

    window.resetInactivityTimers = function() {
        lastActivityTime = Date.now();
        
        const warningModal = document.getElementById('inactivity-warning-modal');
        if (warningModal) {
            warningModal.classList.remove('show');
        }
        
        clearTimeout(warningTimer);
        clearTimeout(logoutTimer);
        clearInterval(countdownInterval);
        
        // Timer only runs if a user is logged in
        const savedSession = localStorage.getItem('brc_v2_logged_in_user');
        if (savedSession) {
            warningTimer = setTimeout(showInactivityWarning, WARNING_TIMEOUT);
            logoutTimer = setTimeout(performAutoLogout, LOGOUT_TIMEOUT);
        }
    };

    function showInactivityWarning() {
        const warningModal = document.getElementById('inactivity-warning-modal');
        if (warningModal) {
            warningModal.classList.add('show');
        }
        
        let timeLeft = 5 * 60; // 5 minutes in seconds (300s)
        const countdownSpan = document.getElementById('inactivity-countdown');
        if (countdownSpan) countdownSpan.textContent = "5:00";
        
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                performAutoLogout();
            } else {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                if (countdownSpan) {
                    countdownSpan.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                }
            }
        }, 1000);
    }

    function performAutoLogout() {
        localStorage.removeItem('brc_v2_logged_in_user');
        
        const warningModal = document.getElementById('inactivity-warning-modal');
        if (warningModal) {
            warningModal.classList.remove('show');
        }
        
        clearInterval(countdownInterval);
        clearTimeout(warningTimer);
        clearTimeout(logoutTimer);
        
        checkUserLoginState();
        alert("You have been signed out automatically due to 10 minutes of inactivity.");
    }

    function setupInactivityListeners() {
        const activityEvents = ['mousemove', 'mousedown', 'keypress', 'click', 'scroll', 'touchstart'];
        activityEvents.forEach(evt => {
            window.addEventListener(evt, window.resetInactivityTimers, { passive: true });
        });
        
        const btnKeep = document.getElementById('btn-inactivity-keep');
        if (btnKeep) {
            btnKeep.addEventListener('click', window.resetInactivityTimers);
        }
        
        const btnLogout = document.getElementById('btn-inactivity-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', performAutoLogout);
        }
        
        window.resetInactivityTimers();
    }


    function updateUserHeaderProfile(username, role) {
        const avatarEl = document.getElementById('active-user-avatar');
        const usernameEl = document.getElementById('active-username-display');
        const roleEl = document.getElementById('active-role-display');
        
        if (avatarEl) {
            avatarEl.textContent = username.substring(0, 1).toUpperCase();
        }
        if (usernameEl) {
            usernameEl.textContent = username;
        }
        if (roleEl) {
            roleEl.textContent = role;
        }
    }

    window.handlePortalLogout = function() {
        localStorage.removeItem('brc_v2_logged_in_user');
        checkUserLoginState();
        
        const loginUsernameInput = document.getElementById('login-username');
        const loginPasswordInput = document.getElementById('login-password');
        const loginUnit = document.getElementById('login-unit');
        const loginRole = document.getElementById('login-role');
        const loginErrorMsg = document.getElementById('main-login-error');
        
        if (loginUsernameInput) loginUsernameInput.value = '';
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (loginUnit) loginUnit.value = 'excelcare';
        if (loginRole) {
            loginRole.value = 'Auditor';
            loginRole.disabled = false;
        }
        if (loginErrorMsg) loginErrorMsg.style.display = 'none';
        
        if (typeof window.switchMobileTab === 'function') {
            window.switchMobileTab('dashboard');
        }
        const btnDashboard = document.getElementById('tab-dashboard-btn');
        if (btnDashboard) btnDashboard.click();
    };

    async function sha256(str) {
        if (!str) return '';
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.prototype.map.call(new Uint8Array(buf), x => (('00' + x.toString(16)).slice(-2))).join('');
    }

    async function checkPassword(inputPwd, storedHashOrPwd) {
        if (!storedHashOrPwd) return false;
        const inputHash = await sha256(inputPwd);
        if (storedHashOrPwd.length === 64 && /^[0-9a-fA-F]+$/.test(storedHashOrPwd)) {
            return inputHash === storedHashOrPwd.toLowerCase();
        }
        return inputPwd === storedHashOrPwd;
    }

    function initPortalLoginListeners() {
        const form = document.getElementById('main-login-form');
        const loginUnit = document.getElementById('login-unit');
        const loginRole = document.getElementById('login-role');
        const submitBtn = document.getElementById('btn-login-submit');
        const loginCredentialsGroup = document.getElementById('login-credentials-group');
        const otpVerificationGroup = document.getElementById('otp-verification-group');
        const otpEmailTarget = document.getElementById('otp-email-target');
        const loginOtpInput = document.getElementById('login-otp');
        const btnOtpVerify = document.getElementById('btn-otp-verify');
        const btnOtpCancel = document.getElementById('btn-otp-cancel');
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        
        if (loginUnit && loginRole) {
            loginUnit.addEventListener('change', () => {
                if (loginUnit.value === 'all') {
                    loginRole.value = 'Administrator';
                    loginRole.disabled = true;
                } else {
                    loginRole.disabled = false;
                }
            });
        }

        // Setup OTP verification buttons
        if (btnOtpVerify) {
            btnOtpVerify.addEventListener('click', () => {
                const enteredCode = loginOtpInput ? loginOtpInput.value.trim() : '';
                if (!enteredCode) {
                    showToast('Please enter the OTP code.', 'warning');
                    return;
                }
                if (!window.activeOTP || !window.activeOTPUser) {
                    showToast('Session error. Please restart login.', 'danger');
                    return;
                }
                if (Date.now() > window.activeOTPExpiry) {
                    showToast('OTP code has expired. Please request a new one.', 'danger');
                    return;
                }
                if (enteredCode === window.activeOTP) {
                    // Success!
                    localStorage.setItem('brc_v2_logged_in_user', JSON.stringify(window.activeOTPUser));
                    checkUserLoginState();
                    if (typeof window.resetInactivityTimers === 'function') {
                        window.resetInactivityTimers();
                    }
                    // Reset UI states for next logout
                    if (otpVerificationGroup) otpVerificationGroup.style.display = 'none';
                    if (loginCredentialsGroup) loginCredentialsGroup.style.display = 'block';
                    if (loginOtpInput) loginOtpInput.value = '';
                    showToast('Authentication successful!', 'success');
                } else {
                    showToast('Invalid OTP code. Please check and try again.', 'danger');
                }
            });
        }

        if (btnOtpCancel) {
            btnOtpCancel.addEventListener('click', () => {
                if (otpVerificationGroup) otpVerificationGroup.style.display = 'none';
                if (loginCredentialsGroup) loginCredentialsGroup.style.display = 'block';
                if (loginOtpInput) loginOtpInput.value = '';
                window.activeOTP = null;
                window.activeOTPUser = null;
                showToast('Login verification cancelled.', 'info');
            });
        }
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // If OTP group is active, ignore standard form submit to let verification handler run
                if (otpVerificationGroup && otpVerificationGroup.style.display === 'block') {
                    if (btnOtpVerify) btnOtpVerify.click();
                    return;
                }
                
                const unitInput = document.getElementById('login-unit');
                const usernameInput = document.getElementById('login-username');
                const passwordInput = document.getElementById('login-password');
                const roleInput = document.getElementById('login-role');
                const errorMsg = document.getElementById('main-login-error');
                const submitBtn = form.querySelector('.btn-login-submit');
                
                const unit = unitInput ? unitInput.value : 'excelcare';
                const username = usernameInput ? usernameInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value : '';
                const role = (roleInput && !roleInput.disabled) ? roleInput.value : 'Viewer';
                
                if (!username || !password) {
                    alert('Please fill out all fields.');
                    return;
                }
                
                // Disable button during async check
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing In…'; }
                if (errorMsg) errorMsg.style.display = 'none';
                
                let isValid = false;
                let loggedInUser = null;
                let matchedUserObj = null;
                
                const attemptMatch = async (credsList) => {
                    if (!credsList) return null;
                    const getNormalizedRole = (r) => (r === 'Approver' || r === 'Approval') ? 'Approver' : r;
                    const normTarget = getNormalizedRole(role);
                    for (const u of credsList) {
                        const isPwdValid = await checkPassword(password, u.password);
                        if (u.username.toLowerCase() === username.toLowerCase() &&
                            isPwdValid &&
                            getNormalizedRole(u.role) === normTarget &&
                            u.unit === unit) {
                            return u;
                        }
                    }
                    return null;
                };
                
                if (unit === 'all') {
                    // Global Website Master Admin (CA Siddhant Surana only)
                    const passwordHash = await sha256(password);
                    if (username.toLowerCase() === 'admin' && passwordHash === '10846d83f5348390f15ec3367789410cd5a4e33b7a3fb5dc8676d2182b47705a') {
                        isValid = true;
                        loggedInUser = { username: 'admin', role: 'Administrator', unit: 'all' };
                        matchedUserObj = { username: 'admin', role: 'Administrator', unit: 'all', email: 'siddhantsurana@gmail.com' };
                    }
                } else {
                    // Try local credentials first (fast path)
                    let matched = await attemptMatch(window.userCredentials);
                    
                    if (!matched) {
                        // Re-fetch from server in case initUserCredentials hasn't finished yet
                        try {
                            const resp = await fetch('/api/load_users');
                            if (resp.ok) {
                                const freshCreds = await resp.json();
                                if (Array.isArray(freshCreds) && freshCreds.length > 0) {
                                    window.userCredentials = freshCreds;
                                    localStorage.setItem('brc_v2_user_credentials', JSON.stringify(freshCreds));
                                }
                            }
                        } catch (err) {
                            console.warn('Login: server re-fetch failed, using cached credentials.', err);
                        }
                        matched = await attemptMatch(window.userCredentials);
                    }
                    
                    if (matched) {
                        isValid = true;
                        loggedInUser = { username: matched.username, role: matched.role, unit: unit };
                        matchedUserObj = matched;
                    }
                }
                
                // Re-enable button
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
                
                if (isValid && loggedInUser) {
                    // Step 1: Resolve Email Address
                    // Check for profile customized email override
                    const profileEmail = (window.profileCustomizations && window.profileCustomizations[unit]) ? window.profileCustomizations[unit].email : null;
                    const userEmail = profileEmail || ((matchedUserObj && matchedUserObj.email) ? matchedUserObj.email : 'siddhantsurana@gmail.com');
                    
                    // Step 2: Generate 6-digit OTP code
                    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    window.activeOTP = generatedOtp;
                    window.activeOTPUser = loggedInUser;
                    window.activeOTPEmail = userEmail;
                    window.activeOTPExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
                    
                    // Step 3: Trigger real email dispatch via FormSubmit.co or backend
                    console.log(`[AUTH DEBUG] Generated OTP for user ${loggedInUser.username}: ${generatedOtp}`);
                    showToast(`Sending OTP to ${userEmail}...`, 'info');

                    // Try backend API first (secure SMTP / SMS dispatch)
                    fetch('/api/send_otp', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: userEmail,
                            otp: generatedOtp,
                            username: loggedInUser.username
                        })
                    })
                    .then(response => {
                        if (!response.ok) throw new Error("Backend OTP failed");
                        return response.json();
                    })
                    .then(data => {
                        if (data.status === "success") {
                            console.log("[AUTH DEBUG] Server OTP sent successfully");
                            showToast(`OTP Sent successfully to ${userEmail}!`, 'success');
                            if (data.is_mock && data.otp) {
                                showToast(`[Sandbox Mode] Auto-filling Mock OTP: ${data.otp}`, 'success');
                                const otpInput = document.getElementById('login-otp');
                                if (otpInput) {
                                    otpInput.value = data.otp;
                                    otpInput.dispatchEvent(new Event('input'));
                                }
                            }
                        } else {
                            throw new Error(data.message || "Server OTP failed");
                        }
                    })
                    .catch(err => {
                        console.warn("[AUTH DEBUG] Backend OTP failed, falling back to FormSubmit.co:", err);
                        // Fallback to FormSubmit.co AJAX request (legacy behavior)
                        fetch(`https://formsubmit.co/ajax/${userEmail}`, {
                            method: "POST",
                            headers: { 
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            body: JSON.stringify({
                                _subject: "Guwahati Revenue Assurance Portal - OTP Verification",
                                _captcha: "false",
                                message: `Your One-Time Password (OTP) for the BRC Guwahati Revenue Assurance Portal is: ${generatedOtp}.\n\nThis code will expire in 5 minutes.\n\nAuthorized BRC Portal Access Only.`
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log("[AUTH DEBUG] FormSubmit response:", data);
                            showToast(`OTP Sent successfully to ${userEmail}!`, 'success');
                        })
                        .catch(err2 => {
                            console.error("[AUTH DEBUG] FormSubmit fallback failed:", err2);
                            showToast(`Email sending failed. Debug Code: ${generatedOtp}`, 'warning');
                        });
                    });
                    
                    // Step 4: Show OTP Input modal, Hide credentials form
                    if (otpEmailTarget) {
                        otpEmailTarget.innerHTML = `Code sent to:<br><strong style="color:var(--text-main); font-size:0.85rem;">${userEmail}</strong><br><br><span style="font-size:0.65rem; color:var(--text-muted); line-height:1.45; display:block; text-align:left; background:var(--bg-hover); padding:0.5rem; border-radius:6px; border:1px solid var(--border);"><strong>First Time Users:</strong> Please confirm the "Activate FormSubmit" activation email from FormSubmit.co in your inbox (or spam folder) to enable OTP delivery.</span>`;
                    }
                    if (loginCredentialsGroup) loginCredentialsGroup.style.display = 'none';
                    if (otpVerificationGroup) otpVerificationGroup.style.display = 'block';
                    if (loginOtpInput) {
                        loginOtpInput.value = '';
                        loginOtpInput.focus();
                    }
                } else {
                    if (errorMsg) {
                        errorMsg.textContent = 'Invalid username or password for the selected Business Unit / Role.';
                        errorMsg.style.display = 'block';
                    }
                    if (passwordInput) {
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
                }
            });
        }
        
        const togglePwdBtn = document.getElementById('toggle-main-login-password');
        const loginPwdInput = document.getElementById('login-password');
        if (togglePwdBtn && loginPwdInput) {
            togglePwdBtn.addEventListener('click', () => {
                if (loginPwdInput.type === 'password') {
                    loginPwdInput.type = 'text';
                } else {
                    loginPwdInput.type = 'password';
                }
            });
        }
        
        const btnSidebarLogout = document.getElementById('btn-sidebar-logout');
        if (btnSidebarLogout) {
            btnSidebarLogout.addEventListener('click', window.handlePortalLogout);
        }
        
        const btnMobileLogout = document.getElementById('btn-mobile-logout');
        if (btnMobileLogout) {
            btnMobileLogout.addEventListener('click', window.handlePortalLogout);
        }
    }

    window.renderAdminCenter = function() {
        const tbody = document.getElementById('admin-users-tbody');
        const countEl = document.getElementById('admin-user-count');
        const resetBtn = document.getElementById('btn-reset-defaults');
        const unitContainer = document.getElementById('admin-unit-container');
        const adminRoleSelect = document.getElementById('admin-role');
        if (!tbody) return;

        const currentUnit = window.currentUserUnit || 'all';

        // Update Reset Defaults Button Text
        if (resetBtn) {
            if (currentUnit === 'all') {
                resetBtn.textContent = 'Reset All Units';
            } else {
                const capitalizedUnit = currentUnit.charAt(0).toUpperCase() + currentUnit.slice(1);
                resetBtn.textContent = `Reset ${capitalizedUnit}`;
            }
        }

        // Adjust sidebar form options depending on logged-in role
        if (unitContainer) {
            if (currentUnit === 'all') {
                unitContainer.style.display = 'block';
            } else {
                unitContainer.style.display = 'none';
            }
        }

        if (adminRoleSelect) {
            // Remove or add Administrator option
            if (currentUnit === 'all') {
                // Ensure Administrator is available
                if (!Array.from(adminRoleSelect.options).some(opt => opt.value === 'Administrator')) {
                    const opt = document.createElement('option');
                    opt.value = 'Administrator';
                    opt.textContent = 'Administrator (All Permissions & Admin Center)';
                    adminRoleSelect.appendChild(opt);
                }
            } else {
                // Remove Administrator option so Unit Admin cannot create another admin
                for (let i = 0; i < adminRoleSelect.options.length; i++) {
                    if (adminRoleSelect.options[i].value === 'Administrator') {
                        adminRoleSelect.remove(i);
                        break;
                    }
                }
            }
        }

        tbody.innerHTML = '';
        
        // Filter users to display
        const visibleUsers = [];
        window.userCredentials.forEach((user, idx) => {
            if (currentUnit === 'all') {
                visibleUsers.push({ user, idx });
            } else if (user.unit === currentUnit && user.role !== 'Administrator') {
                visibleUsers.push({ user, idx });
            }
        });

        if (countEl) {
            countEl.textContent = `${visibleUsers.length} Users configured`;
        }

        visibleUsers.forEach(({ user, idx }) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.transition = 'background-color 0.2s';
            
            tr.addEventListener('mouseenter', () => tr.style.backgroundColor = 'var(--bg-hover)');
            tr.addEventListener('mouseleave', () => tr.style.backgroundColor = 'transparent');

            let roleBadgeStyle = 'font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; display: inline-block;';
            if (user.role === 'Administrator') {
                roleBadgeStyle += ' background-color: rgba(255, 152, 0, 0.15); color: var(--warning); border: 1px solid rgba(255,152,0,0.3);';
            } else if (user.role === 'Approver' || user.role === 'Approval') {
                roleBadgeStyle += ' background-color: rgba(76, 175, 80, 0.15); color: var(--success); border: 1px solid rgba(76,175,80,0.3);';
            } else if (user.role === 'Auditor') {
                roleBadgeStyle += ' background-color: rgba(33, 150, 243, 0.15); color: var(--primary); border: 1px solid rgba(33,150,243,0.3);';
            } else {
                roleBadgeStyle += ' background-color: var(--bg-page); color: var(--text-muted); border: 1px solid var(--border);';
            }

            const capitalizedUnit = (user.unit || '').charAt(0).toUpperCase() + (user.unit || '').slice(1);

            tr.innerHTML = `
                <td style="padding: 0.65rem 0.5rem; font-weight: 700; color: var(--text-muted);">${escapeHtml(capitalizedUnit)}</td>
                <td style="padding: 0.65rem 0.5rem; font-weight: 700; color: var(--text-main);">${escapeHtml(user.username)}</td>
                <td style="padding: 0.65rem 0.5rem; font-family: monospace; color: var(--text-muted);">${escapeHtml(user.password)}</td>
                <td style="padding: 0.65rem 0.5rem;"><span style="${roleBadgeStyle}">${user.role}</span></td>
                <td style="padding: 0.65rem 0.5rem; text-align: right;">
                    <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                        <button class="export-btn" onclick="window.editAdminUser(${idx})" style="padding: 0.15rem 0.4rem; font-size: 0.72rem; background: var(--bg-page); border-color: var(--border); color: var(--text-main);">Edit</button>
                        <button class="export-btn" onclick="window.deleteAdminUser(${idx})" style="padding: 0.15rem 0.4rem; font-size: 0.72rem; background: rgba(244, 67, 54, 0.1); border-color: rgba(244, 67, 54, 0.2); color: var(--danger);">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Load permissions matrix dynamically
        renderPermissionsMatrix();
    };

    window.editAdminUser = function(index) {
        const user = window.userCredentials[index];
        if (!user) return;

        document.getElementById('admin-user-index').value = index;
        document.getElementById('admin-username').value = user.username;
        document.getElementById('admin-password').value = user.password;
        
        const unitSelect = document.getElementById('admin-unit');
        if (unitSelect) unitSelect.value = user.unit || 'excelcare';
        
        const roleSelect = document.getElementById('admin-role');
        if (roleSelect) roleSelect.value = user.role;

        document.getElementById('admin-form-title').textContent = 'Edit Account';
        document.getElementById('btn-reset-admin-form').style.display = 'inline-block';
        document.getElementById('admin-username').focus();
    };

    window.resetAdminForm = function() {
        document.getElementById('admin-user-index').value = '-1';
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        
        const unitSelect = document.getElementById('admin-unit');
        if (unitSelect) {
            unitSelect.value = (window.currentUserUnit !== 'all') ? window.currentUserUnit : 'excelcare';
        }
        
        const roleSelect = document.getElementById('admin-role');
        if (roleSelect) roleSelect.value = 'Viewer';

        document.getElementById('admin-form-title').textContent = 'Add New Account';
        document.getElementById('btn-reset-admin-form').style.display = 'none';
    };

    window.saveAdminUser = async function(e) {
        if (e) e.preventDefault();

        const currentRole = window.currentUserRole;
        if (currentRole !== 'Administrator') {
            alert('Access Denied: Only Administrators are authorized to manage user credentials.');
            return;
        }

        const currentUnit = window.currentUserUnit || 'all';
        const idx = parseInt(document.getElementById('admin-user-index').value);
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value.trim();
        
        const unitSelect = document.getElementById('admin-unit');
        const unit = (currentUnit === 'all' && unitSelect) ? unitSelect.value : currentUnit;
        
        const roleSelect = document.getElementById('admin-role');
        const role = roleSelect ? roleSelect.value : 'Viewer';

        if (currentUnit !== 'all' && unit !== currentUnit) {
            alert('Access Denied: You cannot manage user accounts for other units.');
            return;
        }

        if (!username || !password || !role) {
            alert('Please fill out all fields.');
            return;
        }

        // Validate duplicates for the SAME unit (since different units can have identical usernames!)
        const dupIdx = window.userCredentials.findIndex(u => 
            u.username.toLowerCase() === username.toLowerCase() && u.unit === unit
        );
        
        if (idx === -1 && dupIdx !== -1) {
            alert(`An account with username "${username}" already exists in the selected unit.`);
            return;
        }
        if (idx !== -1 && dupIdx !== -1 && dupIdx !== idx) {
            alert(`Another account with username "${username}" already exists in the selected unit.`);
            return;
        }

        let passwordToStore = password;
        if (!(password.length === 64 && /^[0-9a-fA-F]+$/.test(password))) {
            passwordToStore = await sha256(password);
        }

        if (idx === -1) {
            window.userCredentials.push({ username, password: passwordToStore, role, unit });
        } else {
            // Guard editing admin role of own unit by non-global admin
            if (currentUnit !== 'all' && window.userCredentials[idx].role === 'Administrator') {
                alert('You do not have permissions to modify Administrator credentials.');
                return;
            }
            window.userCredentials[idx] = { username, password: passwordToStore, role, unit };
        }

        localStorage.setItem('brc_v2_user_credentials', JSON.stringify(window.userCredentials));
        fetch('/api/save_users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.userCredentials)
        }).catch(err => console.error("Error saving users to server:", err));
        
        window.resetAdminForm();
        window.renderAdminCenter();
    };

    window.deleteAdminUser = function(index) {
        const currentRole = window.currentUserRole;
        if (currentRole !== 'Administrator') {
            alert('Access Denied: Only Administrators are authorized to manage user credentials.');
            return;
        }

        const currentUnit = window.currentUserUnit || 'all';
        const user = window.userCredentials[index];
        if (!user) return;

        // Non-global admins cannot manage other units
        if (currentUnit !== 'all' && user.unit !== currentUnit) {
            alert('Access Denied: You cannot manage user accounts for other units.');
            return;
        }

        // Non-global admins cannot delete administrator accounts
        if (currentUnit !== 'all' && user.role === 'Administrator') {
            alert('You do not have permissions to delete administrator accounts.');
            return;
        }

        if (confirm(`Are you sure you want to delete user account "${user.username}" for unit "${user.unit}"?`)) {
            window.userCredentials.splice(index, 1);
            localStorage.setItem('brc_v2_user_credentials', JSON.stringify(window.userCredentials));
            fetch('/api/save_users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.userCredentials)
            }).catch(err => console.error("Error saving users to server:", err));
            
            window.resetAdminForm();
            window.renderAdminCenter();
        }
    };

    window.handleResetDefaults = function() {
        const currentRole = window.currentUserRole;
        if (currentRole !== 'Administrator') {
            alert('Access Denied: Only Administrators are authorized to manage user credentials.');
            return;
        }

        const currentUnit = window.currentUserUnit || 'all';

        let confirmMsg = '';
        if (currentUnit === 'all') {
            confirmMsg = 'Are you sure you want to reset all user credentials across ALL units to their system defaults? This will overwrite existing custom credentials.';
        } else {
            const capitalizedUnit = currentUnit.charAt(0).toUpperCase() + currentUnit.slice(1);
            confirmMsg = `Are you sure you want to reset all View, Approve & Audit user credentials for the ${capitalizedUnit} unit to their defaults?`;
        }

        if (confirm(confirmMsg)) {
            const defaults = [
                // Excelcare Unit defaults
                { username: 'Review', password: 'Apollo@123', role: 'Viewer', unit: 'excelcare' },
                { username: 'BRC', password: 'Brc@2013', role: 'Auditor', unit: 'excelcare' },
                { username: 'BRC1', password: 'Brc@2026', role: 'Approver', unit: 'excelcare' },
                { username: 'admin', password: 'Admin@Excel', role: 'Administrator', unit: 'excelcare' },
                
                // International Unit defaults
                { username: 'Review', password: 'Apollo@123', role: 'Viewer', unit: 'international' },
                { username: 'BRC', password: 'Brc@2013', role: 'Auditor', unit: 'international' },
                { username: 'BRC1', password: 'Brc@2026', role: 'Approver', unit: 'international' },
                { username: 'admin', password: 'Admin@Intl', role: 'Administrator', unit: 'international' }
            ];

            if (currentUnit === 'all') {
                window.userCredentials = defaults;
            } else {
                // Keep other units intact, reset only non-Admin roles of the logged-in unit
                window.userCredentials = window.userCredentials.filter(u => u.unit !== currentUnit);
                
                // Add back defaults for current unit (excluding Admin)
                defaults.forEach(d => {
                    if (d.unit === currentUnit && d.role !== 'Administrator') {
                        window.userCredentials.push(d);
                    }
                });
            }

            localStorage.setItem('brc_v2_user_credentials', JSON.stringify(window.userCredentials));
            fetch('/api/save_users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.userCredentials)
            }).catch(err => console.error("Error saving users to server:", err));
            
            window.resetAdminForm();
            window.renderAdminCenter();
            alert('Credentials reset to default system values successfully.');
        }
    };

    function initAdminCenterEventListeners() {
        const form = document.getElementById('admin-user-form');
        if (form) {
            form.addEventListener('submit', window.saveAdminUser);
        }

        const btnReset = document.getElementById('btn-reset-admin-form');
        if (btnReset) {
            btnReset.addEventListener('click', window.resetAdminForm);
        }

        const btnResetDefaults = document.getElementById('btn-reset-defaults');
        if (btnResetDefaults) {
            btnResetDefaults.addEventListener('click', window.handleResetDefaults);
        }

        const toggleAdminPwd = document.getElementById('toggle-admin-password');
        const adminPwdInput = document.getElementById('admin-password');
        if (toggleAdminPwd && adminPwdInput) {
            toggleAdminPwd.addEventListener('click', () => {
                if (adminPwdInput.type === 'password') {
                    adminPwdInput.type = 'text';
                } else {
                    adminPwdInput.type = 'password';
                }
            });
        }

        const btnSavePerms = document.getElementById('btn-save-permissions');
        if (btnSavePerms) {
            btnSavePerms.addEventListener('click', savePermissionsMatrix);
        }
    }
    // HDFC Centrally Agreed 2026 tariff dashboard features
    const COE_MAPPING = {
        "Cardiac Sciences": ["Cardiology", "Cardio procedure", "Cardiac Surgical packages", "Procedure chgs"],
        "Neurosciences": ["Neurology"],
        "Gastroenterology": ["Gastro New", "Gastro Old"],
        "Nephrology & Urology": ["renal biopsy", "Nephrology", "Urology surgeon fees"],
        "Oncology": ["Chemotherapy"],
        "Diagnostics": ["Lab", "Radiology", "investigations"],
        "Surgical & OT": ["Surgery", "OT&Equipment Charges", "OT charges & surgeries", "DAY CARE PACKAGE", "surgical packages", "OT rent consult auto calc"],
        "Room & Consult": ["Room Tariff", "Doc. Consult", "Room rent consult auto calc"],
        "Blood Bank": ["Blood Bank", "blood bank"]
    };

    function getCoE(deptName) {
        if (!deptName) return "Others";
        for (const [coe, depts] of Object.entries(COE_MAPPING)) {
            if (depts.some(d => d.toLowerCase() === deptName.toLowerCase())) {
                return coe;
            }
        }
        return "Others";
    }

    function setupHdfcListeners() {
        const searchInput = document.getElementById('hdfc-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                hdfcAgreedCurrentPage = 1;
                filterAndRenderHdfcTable();
            });
        }

        const deptFilter = document.getElementById('hdfc-filter-dept');
        if (deptFilter) {
            deptFilter.addEventListener('change', () => {
                hdfcAgreedCurrentPage = 1;
                filterAndRenderHdfcTable();
            });
        }

        const statusFilter = document.getElementById('hdfc-filter-status');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                hdfcAgreedCurrentPage = 1;
                filterAndRenderHdfcTable();
            });
        }

        const btnPrev = document.getElementById('hdfc-btn-prev');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (hdfcAgreedCurrentPage > 1) {
                    hdfcAgreedCurrentPage--;
                    renderHdfcTablePage();
                }
            });
        }

        const btnNext = document.getElementById('hdfc-btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                const totalPages = Math.ceil(hdfcAgreedFilteredRows.length / hdfcAgreedPageSize);
                if (hdfcAgreedCurrentPage < totalPages) {
                    hdfcAgreedCurrentPage++;
                    renderHdfcTablePage();
                }
            });
        }
    }

    function renderHdfcBoard() {
        if (typeof TARIFF_HDFC_ERGO_AGREED_2026 === 'undefined') {
            console.error('TARIFF_HDFC_ERGO_AGREED_2026 is not defined.');
            const tbody = document.getElementById('hdfc-table-body');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem; font-weight: 700;">HDFC Ergo agreed database not loaded. Make sure compilation is run.</td></tr>';
            return;
        }

        const rawData = TARIFF_HDFC_ERGO_AGREED_2026;
        
        // 1. Calculate KPI Statistics
        const mappedCount = rawData.length;
        let identicalCount = 0;
        let driftSum = 0.0;
        let driftCount = 0;
        let maxGap = 0.0;
        let maxGapItem = null;

        rawData.forEach(item => {
            const intl = item.intl_rate || 0;
            const excl = item.excl_rate || 0;
            if (intl > 0 && excl > 0) {
                if (Math.abs(intl - excl) < 0.01) {
                    identicalCount++;
                } else {
                    const drift = Math.abs(intl - excl) / excl;
                    driftSum += drift;
                    driftCount++;
                }
                const gap = Math.abs(intl - excl);
                if (gap > maxGap) {
                    maxGap = gap;
                    maxGapItem = item;
                }
            }
        });

        const avgDrift = (driftCount > 0) ? ((driftSum / driftCount) * 100) : 0.0;

        // Render KPIs
        document.getElementById('hdfc-stat-total').textContent = mappedCount.toLocaleString();
        document.getElementById('hdfc-stat-aligned').textContent = identicalCount.toLocaleString();
        document.getElementById('hdfc-stat-drift').textContent = avgDrift.toFixed(2) + '%';
        
        const maxGapEl = document.getElementById('hdfc-stat-max-drift');
        if (maxGapItem) {
            maxGapEl.textContent = `₹${maxGap.toLocaleString()} (${maxGapItem.id})`;
            maxGapEl.title = `${maxGapItem.name} - ${maxGapItem.department}`;
        } else {
            maxGapEl.textContent = 'None';
            maxGapEl.title = '';
        }

        // 2. Populate dynamic dropdown options for departments (CoEs)
        populateHdfcDepts();

        // 3. Render Visual Graphics (Chart.js)
        renderHdfcCharts();

        // 4. Initial filter and render table
        filterAndRenderHdfcTable();
    }

    function populateHdfcDepts() {
        const select = document.getElementById('hdfc-filter-dept');
        if (!select) return;

        // Keep 'All Departments' as first option, remove other options
        select.innerHTML = '<option value="all">All Departments</option>';

        // Add CoE keys
        Object.keys(COE_MAPPING).forEach(coe => {
            const opt = document.createElement('option');
            opt.value = coe;
            opt.textContent = coe;
            select.appendChild(opt);
        });
        
        const optOthers = document.createElement('option');
        optOthers.value = 'Others';
        optOthers.textContent = 'Others';
        select.appendChild(optOthers);
    }

    function filterAndRenderHdfcTable() {
        if (typeof TARIFF_HDFC_ERGO_AGREED_2026 === 'undefined') return;

        const query = (document.getElementById('hdfc-search').value || '').toLowerCase().trim();
        const deptFilter = document.getElementById('hdfc-filter-dept').value;
        const statusFilter = document.getElementById('hdfc-filter-status').value;

        hdfcAgreedFilteredRows = TARIFF_HDFC_ERGO_AGREED_2026.filter(item => {
            // Search filter
            if (query) {
                const matchId = item.id.toLowerCase().includes(query);
                const matchName = item.name.toLowerCase().includes(query);
                if (!matchId && !matchName) return false;
            }

            // Department (CoE) filter
            if (deptFilter !== 'all') {
                const itemCoE = getCoE(item.department);
                if (itemCoE !== deptFilter) return false;
            }

            // Status filter
            const intl = item.intl_rate || 0;
            const excl = item.excl_rate || 0;
            if (statusFilter === 'identical') {
                return intl > 0 && excl > 0 && Math.abs(intl - excl) < 0.01;
            } else if (statusFilter === 'drift') {
                return intl > 0 && excl > 0 && Math.abs(intl - excl) >= 0.01;
            } else if (statusFilter === 'excl_only') {
                return intl === 0 && excl > 0;
            } else if (statusFilter === 'intl_only') {
                return intl > 0 && excl === 0;
            }

            return true;
        });

        // Reset to page 1 on filter
        renderHdfcTablePage();
    }

    function renderHdfcTablePage() {
        const tbody = document.getElementById('hdfc-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        const total = hdfcAgreedFilteredRows.length;
        const start = (hdfcAgreedCurrentPage - 1) * hdfcAgreedPageSize;
        const end = Math.min(start + hdfcAgreedPageSize, total);

        const pageRows = hdfcAgreedFilteredRows.slice(start, end);

        if (pageRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching agreed tariffs found.</td></tr>';
        } else {
            pageRows.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border)';
                
                const variance = item.variance || 0;
                let badgeClass = 'aligned';
                let badgeText = 'Aligned';
                
                if (item.intl_rate === 0 && item.excl_rate > 0) {
                    badgeClass = 'missing';
                    badgeText = 'Excelcare Only';
                } else if (item.intl_rate > 0 && item.excl_rate === 0) {
                    badgeClass = 'missing';
                    badgeText = 'International Only';
                } else if (variance > 0) {
                    badgeClass = 'drift-pos';
                    badgeText = `+${variance}%`;
                } else if (variance < 0) {
                    badgeClass = 'drift-neg';
                    badgeText = `${variance}%`;
                }

                tr.innerHTML = `
                    <td style="padding: 0.6rem 0.75rem; font-family: monospace; color: var(--text-main); font-weight: 600;">${item.id}</td>
                    <td style="padding: 0.6rem 0.75rem; color: var(--text-main); font-weight: 500;">${item.name}</td>
                    <td style="padding: 0.6rem 0.75rem; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">${getCoE(item.department)}</td>
                    <td style="padding: 0.6rem 0.75rem; text-align: right; font-family: monospace; font-weight: 700;">${item.intl_rate > 0 ? '₹' + item.intl_rate.toLocaleString() : '—'}</td>
                    <td style="padding: 0.6rem 0.75rem; text-align: right; font-family: monospace; font-weight: 700;">${item.excl_rate > 0 ? '₹' + item.excl_rate.toLocaleString() : '—'}</td>
                    <td style="padding: 0.6rem 0.75rem; text-align: center;">
                        <span class="badge-variance ${badgeClass}">${badgeText}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update pagination info and buttons
        document.getElementById('hdfc-pagination-info').textContent = `Showing ${total > 0 ? start + 1 : 0} to ${end} of ${total} entries`;
        
        const btnPrev = document.getElementById('hdfc-btn-prev');
        const btnNext = document.getElementById('hdfc-btn-next');
        
        if (btnPrev) btnPrev.disabled = (hdfcAgreedCurrentPage === 1);
        if (btnNext) btnNext.disabled = (end >= total);
    }

    function renderHdfcCharts() {
        if (typeof TARIFF_HDFC_ERGO_AGREED_2026 === 'undefined') return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

        // 1. Compile Specialty Comparison Average Rates
        const coeRates = {};
        Object.keys(COE_MAPPING).forEach(coe => {
            coeRates[coe] = { intlSum: 0.0, exclSum: 0.0, count: 0 };
        });

        TARIFF_HDFC_ERGO_AGREED_2026.forEach(item => {
            const coe = getCoE(item.department);
            if (coeRates[coe] && item.intl_rate > 0 && item.excl_rate > 0) {
                coeRates[coe].intlSum += item.intl_rate;
                coeRates[coe].exclSum += item.excl_rate;
                coeRates[coe].count++;
            }
        });

        const coeLabels = [];
        const coeIntlAverages = [];
        const coeExclAverages = [];

        Object.entries(coeRates).forEach(([coe, data]) => {
            if (data.count > 0) {
                coeLabels.push(coe);
                coeIntlAverages.push(Math.round(data.intlSum / data.count));
                coeExclAverages.push(Math.round(data.exclSum / data.count));
            }
        });

        const ctxComp = document.getElementById('chart-hdfc-comparison');
        if (ctxComp) {
            if (hdfcComparisonChartInstance) {
                hdfcComparisonChartInstance.destroy();
            }
            hdfcComparisonChartInstance = new Chart(ctxComp.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: coeLabels,
                    datasets: [
                        {
                            label: 'International Unit (₹)',
                            data: coeIntlAverages,
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.85)' : 'rgba(5, 150, 105, 0.85)',
                            borderColor: isDark ? '#10b981' : '#059669',
                            borderWidth: 1.5,
                            borderRadius: 4
                        },
                        {
                            label: 'Excelcare Unit (₹)',
                            data: coeExclAverages,
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.85)' : 'rgba(29, 78, 216, 0.85)',
                            borderColor: isDark ? '#3b82f6' : '#1d4ed8',
                            borderWidth: 1.5,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: textColor, font: { family: 'inherit', size: 10 } }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: { family: 'inherit', size: 9 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { color: textColor, font: { family: 'inherit', size: 10 } }
                        }
                    }
                }
            });
        }

        // 2. Pricing Alignment Distribution Doughnut Chart
        let aligned = 0;
        let intlHigher = 0;
        let exclHigher = 0;
        let singleUnit = 0;

        TARIFF_HDFC_ERGO_AGREED_2026.forEach(item => {
            const intl = item.intl_rate || 0;
            const excl = item.excl_rate || 0;
            if (intl === 0 || excl === 0) {
                singleUnit++;
            } else if (Math.abs(intl - excl) < 0.01) {
                aligned++;
            } else if (intl > excl) {
                intlHigher++;
            } else {
                exclHigher++;
            }
        });

        const ctxDist = document.getElementById('chart-hdfc-distribution');
        if (ctxDist) {
            if (hdfcDistributionChartInstance) {
                hdfcDistributionChartInstance.destroy();
            }
            hdfcDistributionChartInstance = new Chart(ctxDist.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Aligned (0% Drift)', 'Intl Unit Higher', 'Excelcare Higher', 'Single-Unit Only'],
                    datasets: [{
                        data: [aligned, intlHigher, exclHigher, singleUnit],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.85)',
                            'rgba(239, 68, 68, 0.85)',
                            'rgba(59, 130, 246, 0.85)',
                            'rgba(148, 163, 184, 0.85)'
                        ],
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: { color: textColor, font: { family: 'inherit', size: 10 } }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    }

    window.renderHdfcBoard = renderHdfcBoard;
    window.setupHdfcListeners = setupHdfcListeners;

    // Tariff Ingester Global State
    let ingestedWorkbook = null;
    let ingestedRecords = [];

    function initIngesterPanel() {
        const dropzone = document.getElementById('ingester-dropzone');
        const fileInput = document.getElementById('ingester-file-input');
        if (!dropzone || !fileInput) return;

        // Reset state
        ingestedWorkbook = null;
        ingestedRecords = [];
        document.getElementById('ingester-results-container').style.display = 'none';

        // Drag/Drop Listeners
        dropzone.onclick = () => fileInput.click();
        dropzone.ondragover = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--accent, #6366f1)';
            dropzone.style.backgroundColor = 'var(--bg-hover)';
        };
        dropzone.ondragleave = () => {
            dropzone.style.borderColor = 'var(--border)';
            dropzone.style.backgroundColor = 'transparent';
        };
        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border)';
            dropzone.style.backgroundColor = 'transparent';
            if (e.dataTransfer.files.length > 0) {
                handleIngesterFile(e.dataTransfer.files[0]);
            }
        };
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                handleIngesterFile(e.target.files[0]);
            }
        };

        // Action Button Listeners
        document.getElementById('ingest-btn-download').onclick = () => {
            if (ingestedRecords.length === 0) return;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ingestedRecords, null, 4));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `ingested_tariff_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        };

        document.getElementById('ingest-btn-copy').onclick = () => {
            if (ingestedRecords.length === 0) return;
            navigator.clipboard.writeText(JSON.stringify(ingestedRecords, null, 4))
                .then(() => showToast('JSON snippet copied to clipboard!', 'success'))
                .catch(() => showToast('Failed to copy to clipboard.', 'danger'));
        };

        document.getElementById('ingest-btn-apply').onclick = () => {
            if (ingestedRecords.length === 0) return;
            
            // Register this custom SOC as a globally available target database!
            window.TARIFF_CUSTOM_INGESTED = ingestedRecords;
            window.mapCustomIngested = {};
            ingestedRecords.forEach(item => window.mapCustomIngested[item.id] = item);

            showToast('Tariff successfully loaded into active session as Custom SOC. You can now select it in the Audit Workspace!', 'success');
        };

        document.getElementById('ingest-sheet-select').onchange = (e) => {
            if (!ingestedWorkbook) return;
            parseIngesterSheet(e.target.value);
        };
    }

    function handleIngesterFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                ingestedWorkbook = workbook;

                // Populate sheet dropdown
                const select = document.getElementById('ingest-sheet-select');
                select.innerHTML = '';
                workbook.SheetNames.forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    select.appendChild(opt);
                });

                document.getElementById('ingest-stat-filename').textContent = file.name;
                
                // Parse first sheet by default
                if (workbook.SheetNames.length > 0) {
                    parseIngesterSheet(workbook.SheetNames[0]);
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to parse Excel file. Make sure it is not corrupt.', 'danger');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function parseIngesterSheet(sheetName) {
        if (!ingestedWorkbook) return;
        
        const sheet = ingestedWorkbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) {
            showToast('Selected sheet is empty or contains insufficient rows.', 'warning');
            return;
        }

        // Auto-detect columns (header row detection)
        let headerRowIdx = 0;
        let colCodeIdx = -1;
        let colNameIdx = -1;
        let colRateIdx = -1;

        // Loop through first 20 rows to find header
        for (let r = 0; r < Math.min(rows.length, 20); r++) {
            const row = rows[r];
            if (!row || !row.length) continue;
            
            for (let c = 0; c < row.length; c++) {
                const val = String(row[c] || '').toUpperCase().trim();
                if (val === 'CODE' || val === 'SERVICE CODE' || val === 'SERVICEID' || val === 'ITEM CODE' || val === 'NEW CODE') {
                    colCodeIdx = c;
                    headerRowIdx = r;
                }
                if (val === 'NAME' || val === 'DESCRIPTION' || val === 'SERVICE NAME' || val === 'PARTICULARS' || val === 'PROCEDURE') {
                    colNameIdx = c;
                }
                if (val === 'RATE' || val === 'TARIFF' || val === 'PRICE' || val === 'AMOUNT' || val === 'CHARGES' || val === 'GIPSA' || val === 'TPA') {
                    colRateIdx = c;
                }
            }
            if (colCodeIdx !== -1 && colNameIdx !== -1) {
                break; // Found good header mapping
            }
        }

        // Fallbacks if not found
        if (colCodeIdx === -1) colCodeIdx = 0;
        if (colNameIdx === -1) colNameIdx = 1;
        if (colRateIdx === -1) colRateIdx = 2;

        document.getElementById('ingest-stat-fields').textContent = `ID: col ${colCodeIdx + 1}, Name: col ${colNameIdx + 1}, Rate: col ${colRateIdx + 1}`;

        // Parse records
        ingestedRecords = [];
        const seenIds = new Set();
        
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row) continue;
            
            const rawId = String(row[colCodeIdx] || '').trim();
            const rawName = String(row[colNameIdx] || '').trim();
            const rawRate = row[colRateIdx];

            if (!rawId || !rawName || rawId === 'undefined' || rawName === 'undefined') continue;
            
            // Skip rows containing header keywords
            if (rawId.toUpperCase() === 'CODE' || rawName.toUpperCase() === 'DESCRIPTION' || rawId.toUpperCase() === 'SERVICE') continue;

            const parsedRate = parseFloat(String(rawRate || '').replace(/[^0-9.-]/g, ''));
            if (isNaN(parsedRate)) continue;

            if (seenIds.has(rawId)) continue; // Deduplicate
            seenIds.add(rawId);

            ingestedRecords.push({
                id: rawId,
                name: rawName,
                rate: parsedRate,
                dept: sheetName,
                type: 'Ingested'
            });
        }

        // Render preview table
        const previewBody = document.getElementById('ingest-preview-body');
        previewBody.innerHTML = '';
        const previewRows = ingestedRecords.slice(0, 10);
        
        if (previewRows.length === 0) {
            previewBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1rem;">No valid records found in sheet.</td></tr>';
        } else {
            previewRows.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border)';
                tr.innerHTML = `
                    <td style="padding: 0.4rem; font-family: monospace; color: var(--text-main); font-weight: 600;">${item.id}</td>
                    <td style="padding: 0.4rem; color: var(--text-main); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</td>
                    <td style="padding: 0.4rem; text-align: right; font-family: monospace; font-weight: 700; color: var(--accent, #6366f1);">₹${item.rate.toLocaleString()}</td>
                `;
                previewBody.appendChild(tr);
            });
        }

        // Update stats
        document.getElementById('ingest-stat-total').textContent = ingestedRecords.length.toLocaleString();

        // Update JSON preview area
        const jsonPreview = document.getElementById('ingest-json-preview');
        jsonPreview.value = JSON.stringify(ingestedRecords.slice(0, 50), null, 4) + (ingestedRecords.length > 50 ? `\n\n... [${ingestedRecords.length - 50} more records truncated from preview]` : '');

        // Show container
        document.getElementById('ingester-results-container').style.display = 'flex';
        showToast(`Successfully extracted ${ingestedRecords.length} unique records from sheet "${sheetName}".`, 'success');
    }

    // =========================================================================
    // SETTLEMENT DISALLOWANCE AUDITOR PLATFORM METHODS
    // =========================================================================
    let settlementDatabase = [];

    async function initSettlementAuditor() {
        // Load settlements database
        try {
            const response = await fetch('/api/load_settlements');
            if (response.ok) {
                settlementDatabase = await response.json();
            }
        } catch (err) {
            console.log("Could not load settlements from server:", err);
        }
        
        if (!settlementDatabase || settlementDatabase.length === 0) {
            const local = localStorage.getItem('brc_v2_saved_settlements');
            if (local) {
                settlementDatabase = JSON.parse(local);
            } else {
                settlementDatabase = (typeof SETTLEMENT_DATA !== 'undefined' && Array.isArray(SETTLEMENT_DATA)) ? SETTLEMENT_DATA : [];
            }
        }
        
        // Setup dropzone listeners
        setupSettlementDropzone();
        
        // Refresh UI
        refreshSettlementUI();
        
        // Clear database button
        const clearBtn = document.getElementById('btn-clear-settlements');
        if (clearBtn) {
            clearBtn.onclick = async () => {
                if (confirm("Are you sure you want to clear all uploaded settlements? This will reset the database.")) {
                    settlementDatabase = [];
                    localStorage.removeItem('brc_v2_saved_settlements');
                    try {
                        await fetch('/api/save_settlements', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: '[]'
                        });
                    } catch (e) {}
                    refreshSettlementUI();
                    showToast("Settlement database cleared successfully.", "success");
                    
                    const emptyPanel = document.getElementById('set-details-empty');
                    const contentPanel = document.getElementById('set-details-content');
                    if (emptyPanel) emptyPanel.style.display = 'block';
                    if (contentPanel) contentPanel.style.display = 'none';
                }
            };
        }
        
        // Search Input
        const searchInput = document.getElementById('set-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => handleSettlementSearch(e, settlementDatabase);
        }
    }

    function setupSettlementDropzone() {
        const dropzone = document.getElementById('settlement-dropzone');
        const fileInput = document.getElementById('settlement-file-input');
        if (!dropzone || !fileInput) return;
        
        dropzone.onclick = () => fileInput.click();
        
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                handleSettlementFileUpload(e.target.files[0]);
            }
        };
        
        dropzone.ondragover = dropzone.ondragenter = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--danger)';
            dropzone.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
        };
        
        dropzone.ondragleave = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border)';
            dropzone.style.backgroundColor = 'var(--bg-card)';
        };
        
        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border)';
            dropzone.style.backgroundColor = 'var(--bg-card)';
            if (e.dataTransfer.files.length > 0) {
                handleSettlementFileUpload(e.dataTransfer.files[0]);
            }
        };
    }

    async function handleSettlementFileUpload(file) {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            showToast("Only PDF files are supported for settlement letters.", "error");
            return;
        }
        
        const progress = document.getElementById('settlement-upload-progress');
        const bar = document.getElementById('set-progress-bar');
        const text = document.getElementById('set-progress-text');
        const percent = document.getElementById('set-progress-percent');
        
        if (progress) progress.style.display = 'block';
        if (bar) bar.style.width = '10%';
        if (text) text.textContent = "Reading PDF letter file...";
        if (percent) percent.textContent = "10%";
        
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const arrayBuffer = this.result;
                if (bar) bar.style.width = '40%';
                if (text) text.textContent = "Extracting claim text layers...";
                if (percent) percent.textContent = "40%";
                
                const extractedText = await extractTextFromPDF(arrayBuffer);
                
                if (bar) bar.style.width = '70%';
                if (text) text.textContent = "Auditing disallowed line-items...";
                if (percent) percent.textContent = "70%";
                
                const claim = parseSettlementPDFText(extractedText, file.name);
                
                if (!claim.claim_id || claim.claimed_amount === 0) {
                    throw new Error("Could not parse critical numbers. Please verify this is a valid Aditya Birla or HDFC settlement letter.");
                }
                
                // Add or replace in database
                const existingIdx = settlementDatabase.findIndex(c => c.claim_id === claim.claim_id);
                if (existingIdx >= 0) {
                    settlementDatabase[existingIdx] = claim;
                } else {
                    settlementDatabase.push(claim);
                }
                
                // Save to local & server database
                localStorage.setItem('brc_v2_saved_settlements', JSON.stringify(settlementDatabase));
                try {
                    await fetch('/api/save_settlements', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(settlementDatabase)
                    });
                } catch (err) {
                    console.log("Could not sync to server database:", err);
                }
                
                if (bar) bar.style.width = '100%';
                if (text) text.textContent = "Audit complete!";
                if (percent) percent.textContent = "100%";
                
                setTimeout(() => {
                    if (progress) progress.style.display = 'none';
                }, 1000);
                
                refreshSettlementUI();
                showToast(`Successfully audited claim ID ${claim.claim_id} for Patient ${claim.patient_name}.`, "success");
                
                // Auto select the new row
                const rows = document.querySelectorAll('.settlement-row');
                if (rows.length > 0) {
                    selectSettlementRow(claim, rows[rows.length - 1]);
                }
                
            } catch (err) {
                console.error(err);
                if (progress) progress.style.display = 'none';
                showToast(`PDF parsing failed: ${err.message}`, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function extractTextFromPDF(arrayBuffer) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("PDF.js library is not loaded. Check internet connection.");
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Reconstruct horizontal lines by grouping text items with similar Y coordinates
            const yGroups = {};
            textContent.items.forEach(item => {
                if (!item.str || item.str.trim() === '') return;
                const y = item.transform[5];
                
                let foundGroup = null;
                for (const gy of Object.keys(yGroups)) {
                    if (Math.abs(parseFloat(gy) - y) < 4) {
                        foundGroup = gy;
                        break;
                    }
                }
                
                if (foundGroup) {
                    yGroups[foundGroup].push(item);
                } else {
                    yGroups[y] = [item];
                }
            });
            
            // Sort vertically (top to bottom)
            const sortedYs = Object.keys(yGroups).map(parseFloat).sort((a, b) => b - a);
            
            const pageLines = sortedYs.map(y => {
                // Sort horizontally (left to right)
                const items = yGroups[y];
                items.sort((a, b) => a.transform[4] - b.transform[4]);
                return items.map(item => item.str).join(' ');
            });
            
            fullText += pageLines.join('\n') + '\n';
        }
        return fullText;
    }

    function parseSettlementPDFText(fullText, filename) {
        const fileId = filename.replace(/\.[^/.]+$/, "");
        const data = {
            id: fileId,
            filename: filename,
            claim_id: "",
            patient_name: "",
            member_id: "",
            policy_number: "",
            admission_date: "",
            discharge_date: "",
            claimed_amount: 0.0,
            approved_amount: 0.0,
            deducted_amount: 0.0,
            tds_amount: 0.0,
            utr_number: "",
            utr_amount: 0.0,
            line_items: []
        };

        const cleanNum = (valStr) => {
            if (!valStr) return 0.0;
            const clean = valStr.replace(/Rs\./i, "").replace(/,/g, "").trim();
            const f = parseFloat(clean);
            return isNaN(f) ? 0.0 : f;
        };

        // Extract Claim ID
        let claimMatch = fullText.match(/Claim ID\s+(\d+)\s+settled/i);
        if (claimMatch) {
            data.claim_id = claimMatch[1];
        } else {
            claimMatch = fullText.match(/Claim ID\s*[:\-]?\s*(\d+)/i);
            data.claim_id = claimMatch ? claimMatch[1] : fileId;
        }

        // Extract Patient Name
        let patientMatch = fullText.match(/Patient Name\s+([^\n]+)/i);
        if (patientMatch) {
            data.patient_name = patientMatch[1].trim();
        } else {
            patientMatch = fullText.match(/Dear\s+([^\n,]+)/i);
            data.patient_name = patientMatch ? patientMatch[1].trim() : "Unknown Patient";
        }

        // Extract Member ID
        let memberMatch = fullText.match(/Member ID\s+([^\n]+)/i);
        if (memberMatch) {
            const memberVal = memberMatch[1].trim();
            const ptM = memberVal.match(/(PT\d+)/);
            data.member_id = ptM ? ptM[1] : memberVal;
        }

        // Extract Policy Number
        let policyMatch = fullText.match(/Policy Number\s*(?:\/\s*COI Number)?\s+([^\n]+)/i);
        if (policyMatch) {
            const policyVal = policyMatch[1].trim();
            const polM = policyVal.match(/(\d+-\d+-\d+-\d+)/);
            data.policy_number = polM ? polM[1] : policyVal;
        }

        // Extract Admission & Discharge
        let admMatch = fullText.match(/Date of Admission\s+([^\n]+)/i);
        if (admMatch) {
            const admVal = admMatch[1].trim();
            const dtM = admVal.match(/(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)/);
            data.admission_date = dtM ? dtM[1] : admVal;
        }
        let disMatch = fullText.match(/Date of Discharge\s+([^\n]+)/i);
        if (disMatch) {
            const disVal = disMatch[1].trim();
            const dtM = disVal.match(/(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}:\d{2})?)/);
            data.discharge_date = dtM ? dtM[1] : disVal;
        }

        // Extract Totals
        let claimedMatch = fullText.match(/Claimed Amount\s*(?:Rs\.)?\s*([\d\.,]+)/i);
        if (claimedMatch) data.claimed_amount = cleanNum(claimedMatch[1]);

        let approvedMatch = fullText.match(/Approved Amount\s*(?:Rs\.)?\s*([\d\.,]+)/i);
        if (approvedMatch) data.approved_amount = cleanNum(approvedMatch[1]);

        let deductedMatch = fullText.match(/Deducted Amount\s*(?:Rs\.)?\s*([\d\.,]+)/i);
        if (deductedMatch) data.deducted_amount = cleanNum(deductedMatch[1]);

        let tdsMatch = fullText.match(/TDS\s*(?:Rs\.)?\s*([\d\.,]+)/i);
        if (tdsMatch) data.tds_amount = cleanNum(tdsMatch[1]);

        // Payment UTR
        let utrMatch = fullText.match(/(HDFCH\d+)/i);
        if (utrMatch) {
            data.utr_number = utrMatch[1].trim();
        } else {
            let utrOnly = fullText.match(/(?:UTR|UTR Number)\s*[:\-]?\s*(\S+)/i);
            if (utrOnly) data.utr_number = utrOnly[1].trim();
        }

        // Expense heads
        const expenseHeads = [
            "Investigation Charges",
            "Medicine And Consumable Charges",
            "Miscellaneous Charges",
            "OT Charges",
            "Package Charges",
            "Professional Fee Charges",
            "Room and Nursing Charges"
        ];

        const lines = fullText.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const lineStripped = lines[i].trim();
            let matchedHead = null;
            for (const head of expenseHeads) {
                if (lineStripped.startsWith(head)) {
                    matchedHead = head;
                    break;
                }
            }

            if (matchedHead) {
                let rem = lineStripped.slice(matchedHead.length).trim();
                let numMatches = rem.match(/([\d\.,]+)/g) || [];
                if (numMatches.length >= 3) {
                    const claimed = cleanNum(numMatches[0]);
                    const approved = cleanNum(numMatches[1]);
                    const deducted = cleanNum(numMatches[2]);

                    let reasonPart = rem;
                    for (let j = 0; j < 3; j++) {
                        reasonPart = reasonPart.replace(numMatches[j], "");
                    }
                    let reason = reasonPart.replace(/,/g, "").trim();

                    let nextIdx = i + 1;
                    while (nextIdx < lines.length) {
                        const nextLine = lines[nextIdx].trim();
                        if (expenseHeads.some(h => nextLine.startsWith(h)) || nextLine.includes("Deduction Details") || nextLine.includes("Deduction Type")) {
                            break;
                        }
                        if (nextLine) {
                            reason += " " + nextLine;
                        }
                        nextIdx++;
                    }

                    reason = reason.replace(/\s+/g, " ").trim();
                    data.line_items.push({
                        description: matchedHead,
                        claimed: claimed,
                        approved: approved,
                        deducted: deducted,
                        reason: reason
                    });
                }
            }
        }

        return data;
    }

    function refreshSettlementUI() {
        let totalSettlements = settlementDatabase.length;
        let totalDisallowed = 0;
        let totalRecoverable = 0;

        // Analytics counters
        const disallowanceGroups = {};
        let rcapLeak = 0;
        let monLeak = 0;
        let conLeak = 0;
        let mouLeak = 0;

        settlementDatabase.forEach(s => {
            totalDisallowed += s.deducted_amount;
            let claimRec = 0;
            
            s.line_items.forEach(item => {
                // Group stats
                disallowanceGroups[item.description] = (disallowanceGroups[item.description] || 0) + item.deducted;

                // Smart pre-reconciliation if not edited yet
                if (item.agreed_rate === undefined) {
                    const desc = (item.description || '').toUpperCase();
                    const reason = (item.reason || '').toUpperCase();

                    // Pre-fill default agreed rate and justification
                    if (desc.includes('MONITORING') && (reason.includes('INCL') || reason.includes('PART OF') || reason.includes('ROOM RENT'))) {
                        item.agreed_rate = item.claimed;
                        item.is_disputed = true;
                        item.dispute_reason = "Monitoring charges are billable separately according to Section 4.2 of TPA Agreement.";
                    }
                    else if (desc.includes('MISCELLANEOUS') && (reason.includes('ADMISSION') || reason.includes('MRD'))) {
                        item.agreed_rate = item.claimed;
                        item.is_disputed = true;
                        item.dispute_reason = "MRD and Admission documentation charges are billable separately as per agreement terms.";
                    }
                    else if (desc.includes('MEDICINE') && (reason.includes('GOWN') || reason.includes('GLOVES') || reason.includes('PLAIN SHEET'))) {
                        item.agreed_rate = item.approved + (item.deducted * 0.5);
                        item.is_disputed = true;
                        item.dispute_reason = "Consumables (gloves/gown/sheet) are payable under active package rules.";
                    }
                    else if (reason.includes('MOU DISCOUNT') && desc.includes('ROOM')) {
                        item.agreed_rate = item.claimed;
                        item.is_disputed = true;
                        item.dispute_reason = "5% MOU discount is not applicable to room rent as per the master agreement schedule.";
                    }
                    else {
                        item.agreed_rate = item.approved;
                        item.is_disputed = false;
                        item.dispute_reason = "";
                    }
                }

                if (item.is_disputed) {
                    item.recoverable = Math.max(0, Math.min(item.deducted, item.agreed_rate - item.approved));
                    claimRec += item.recoverable;

                    const desc = (item.description || '').toUpperCase();
                    const reason = (item.reason || '').toUpperCase();
                    if (desc.includes('MONITORING')) monLeak += item.recoverable;
                    else if (desc.includes('MISCELLANEOUS')) rcapLeak += item.recoverable;
                    else if (desc.includes('MEDICINE')) conLeak += item.recoverable;
                    else if (reason.includes('MOU DISCOUNT')) mouLeak += item.recoverable;
                    else if (desc.includes('ROOM')) rcapLeak += item.recoverable;
                } else {
                    item.recoverable = 0;
                }
            });

            s.recoverable_amount = claimRec;
            totalRecoverable += claimRec;
        });

        // Set KPI metrics
        const totalEl = document.getElementById('set-metric-total');
        const disallowedEl = document.getElementById('set-metric-disallowed');
        const recoverableEl = document.getElementById('set-metric-recoverable');
        const badgeEl = document.getElementById('tab-badge-settlement');

        if (totalEl) totalEl.textContent = totalSettlements.toLocaleString();
        if (disallowedEl) disallowedEl.textContent = `₹${totalDisallowed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (recoverableEl) recoverableEl.textContent = `₹${totalRecoverable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (badgeEl) badgeEl.textContent = totalSettlements;

        // Render Claims Grid Table
        renderSettlementGrid(settlementDatabase);

        // Render Distribution Bars
        renderInsightsDistribution(disallowanceGroups, totalDisallowed);

        // Render Prevention Rules Warnings
        renderInsightsPrevention(rcapLeak, monLeak, conLeak, mouLeak);
    }

    function renderInsightsDistribution(groups, totalDeducted) {
        const container = document.getElementById('set-insights-distribution');
        if (!container) return;
        container.innerHTML = '';

        const keys = Object.keys(groups);
        if (keys.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">Upload letters to populate disallowance metrics.</div>';
            return;
        }

        const sorted = keys.map(k => ({ name: k, amt: groups[k] })).sort((a,b) => b.amt - a.amt);

        sorted.forEach(item => {
            const pct = totalDeducted > 0 ? ((item.amt / totalDeducted) * 100).toFixed(0) : 0;
            const row = document.createElement('div');
            row.style.marginBottom = '0.5rem';
            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.2rem;">
                    <span style="font-weight: 700; color: var(--text-main);">${item.name}</span>
                    <span style="color: var(--text-muted);">₹${item.amt.toLocaleString(undefined, {maximumFractionDigits:0})} (${pct}%)</span>
                </div>
                <div style="background: var(--border); height: 8px; border-radius: 999px; overflow: hidden; width: 100%;">
                    <div style="background: var(--danger); width: ${pct}%; height: 100%;"></div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function renderInsightsPrevention(rcap, mon, con, mou) {
        const container = document.getElementById('set-insights-prevention');
        if (!container) return;
        container.innerHTML = '';

        if (rcap === 0 && mon === 0 && con === 0 && mou === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">No preventative recommendations yet. Upload letters to audit.</div>';
            return;
        }

        const alerts = [];
        if (rcap > 0) {
            alerts.push({
                title: "Ward & Room Rent Limit Breaches",
                amount: rcap,
                desc: "Insurers capped room rent against the policy category limit. Ensure ward allocations match client eligibility pre-admission to avoid capping leakage."
            });
        }
        if (mon > 0) {
            alerts.push({
                title: "Separate Monitoring Charge Bundling",
                amount: mon,
                desc: "Insurers incorrectly bundled Monitoring. billing desk must print Section 4.2 of TPA Agreement and attach it to claim files before submission."
            });
        }
        if (con > 0) {
            alerts.push({
                title: "Medicine Exclusions & Gowns",
                amount: con,
                desc: "Medical gown and consumables deductions. Update hospital billing templates to remove non-payable items or replace with approved billable items."
            });
        }
        if (mou > 0) {
            alerts.push({
                title: "Over-applied MOU Discounts",
                amount: mou,
                desc: "TPAs incorrectly deducted 5% discount on room rent. Reject pre-auth settlements with MOU discounts applied outside surgery package schedules."
            });
        }

        alerts.forEach(alert => {
            const div = document.createElement('div');
            div.style.background = 'rgba(245, 158, 11, 0.05)';
            div.style.border = '1px solid rgba(245, 158, 11, 0.2)';
            div.style.borderRadius = '8px';
            div.style.padding = '0.6rem 0.8rem';
            div.style.fontSize = '0.78rem';
            
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:800; color:var(--text-main); margin-bottom:0.2rem;">
                    <span>⚠️ ${alert.title}</span>
                    <span style="color:#ef4444;">Est. Loss: ₹${alert.amount.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
                <div style="color:var(--text-muted); line-height:1.4;">${alert.desc}</div>
            `;
            container.appendChild(div);
        });
    }

    function renderSettlementGrid(data) {
        const tbody = document.getElementById('settlement-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No settlements matched the search criteria.</td></tr>';
            return;
        }
        
        data.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.style.cursor = 'pointer';
            tr.className = 'settlement-row';
            
            const isLeakage = s.recoverable_amount > 0;
            const statusBadge = isLeakage 
                ? `<span style="background-color: var(--danger-bg); color: var(--danger); font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700;">Leakage Flagged</span>` 
                : `<span style="background-color: var(--success-bg); color: var(--success); font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700;">Verified Aligned</span>`;
            
            tr.innerHTML = `
                <td style="padding: 0.6rem 0.5rem; font-weight: 700; color: var(--accent, #6366f1);">${s.claim_id}</td>
                <td style="padding: 0.6rem 0.5rem; color: var(--text-main); font-weight: 600;">${s.patient_name}</td>
                <td style="padding: 0.6rem 0.5rem; color: var(--text-muted); font-size: 0.75rem; font-family: monospace;">${s.policy_number}</td>
                <td style="padding: 0.6rem 0.5rem; text-align: right; font-family: monospace;">₹${s.claimed_amount.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td style="padding: 0.6rem 0.5rem; text-align: right; font-family: monospace; color: var(--text-main);">₹${s.deducted_amount.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td style="padding: 0.6rem 0.5rem; text-align: right; font-family: monospace; color: ${isLeakage ? '#ef4444' : 'var(--text-muted)'}; font-weight: ${isLeakage ? '700' : 'normal'};">₹${s.recoverable_amount.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                <td style="padding: 0.6rem 0.5rem; text-align: center;">${statusBadge}</td>
            `;
            
            tr.addEventListener('click', () => selectSettlementRow(s, tr));
            tbody.appendChild(tr);
        });
    }

    function selectSettlementRow(s, rowEl) {
        document.querySelectorAll('.settlement-row').forEach(el => el.classList.remove('active-row'));
        rowEl.classList.add('active-row');
        
        const emptyPanel = document.getElementById('set-details-empty');
        const contentPanel = document.getElementById('set-details-content');
        
        if (emptyPanel) emptyPanel.style.display = 'none';
        if (contentPanel) contentPanel.style.display = 'flex';
        
        document.getElementById('set-details-patient').textContent = s.patient_name;
        document.getElementById('set-details-claim').textContent = s.claim_id;
        document.getElementById('set-details-policy').textContent = s.policy_number;
        document.getElementById('set-details-claimed').textContent = `₹${s.claimed_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('set-details-approved').textContent = `₹${s.approved_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('set-details-disallowed').textContent = `₹${s.deducted_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        document.getElementById('set-details-utr').textContent = s.utr_number || 'N/A';
        
        const itemsContainer = document.getElementById('set-details-items');
        itemsContainer.innerHTML = '';
        
        s.line_items.forEach((item, idx) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.background = 'rgba(255,255,255,0.02)';
            itemDiv.style.border = '1px solid var(--border)';
            itemDiv.style.borderRadius = '6px';
            itemDiv.style.padding = '0.6rem';
            itemDiv.style.fontSize = '0.78rem';
            itemDiv.style.marginBottom = '0.5rem';
            
            itemDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
                    <span>${item.description}</span>
                    <span style="font-family: monospace; color: var(--text-muted);">₹${item.claimed.toLocaleString()} billed</span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; gap: 0.75rem; margin-bottom: 0.4rem;">
                    <span>Approved: <strong style="color:var(--text-main);">₹${item.approved.toLocaleString()}</strong></span>
                    <span>Disallowed: <strong style="color:#ef4444;">₹${item.deducted.toLocaleString()}</strong></span>
                </div>
                <div style="color: var(--text-muted); font-size: 0.72rem; margin-bottom: 0.5rem; line-height: 1.35; padding: 0.25rem; background: rgba(0,0,0,0.1); border-radius: 4px;">
                    Reason: ${item.reason}
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.4rem;">
                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                        <span style="font-size: 0.72rem;">Agreed Rate:</span>
                        <input type="number" class="agreed-rate-input" data-idx="${idx}" value="${item.agreed_rate}" style="width: 70px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main); font-family: monospace; font-size: 0.72rem; padding: 0.1rem 0.2rem; text-align: right;">
                    </div>
                    <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; cursor: pointer; user-select: none;">
                        <input type="checkbox" class="dispute-checkbox" data-idx="${idx}" ${item.is_disputed ? 'checked' : ''} style="cursor: pointer; width: 12px; height: 12px;">
                        Dispute Item
                    </label>
                </div>
                
                <div class="dispute-reason-container" style="display: ${item.is_disputed ? 'block' : 'none'}; margin-top: 0.4rem;">
                    <textarea class="dispute-reason-input" data-idx="${idx}" placeholder="Enter dispute justification..." style="width: 100%; height: 42px; font-size: 0.72rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: 4px; color: var(--text-main); padding: 0.2rem 0.4rem; resize: none; line-height: 1.3;">${item.dispute_reason}</textarea>
                </div>
            `;
            
            itemsContainer.appendChild(itemDiv);
        });

        // Set up event listeners for inputs
        const rateInputs = itemsContainer.querySelectorAll('.agreed-rate-input');
        const checkboxes = itemsContainer.querySelectorAll('.dispute-checkbox');
        const reasonInputs = itemsContainer.querySelectorAll('.dispute-reason-input');

        const updateItemState = async (idx) => {
            const item = s.line_items[idx];
            const rateInput = itemsContainer.querySelector(`.agreed-rate-input[data-idx="${idx}"]`);
            const checkbox = itemsContainer.querySelector(`.dispute-checkbox[data-idx="${idx}"]`);
            const reasonInput = itemsContainer.querySelector(`.dispute-reason-input[data-idx="${idx}"]`);
            const reasonContainer = checkbox.parentElement.parentElement.nextElementSibling;
            
            const agreed = parseFloat(rateInput.value) || 0;
            item.agreed_rate = agreed;
            item.is_disputed = checkbox.checked;
            item.dispute_reason = reasonInput.value;
            
            // Show/hide reason
            reasonContainer.style.display = item.is_disputed ? 'block' : 'none';
            
            if (item.is_disputed) {
                item.recoverable = Math.max(0, Math.min(item.deducted, agreed - item.approved));
            } else {
                item.recoverable = 0;
            }
            
            // Save state
            localStorage.setItem('brc_v2_saved_settlements', JSON.stringify(settlementDatabase));
            try {
                await fetch('/api/save_settlements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settlementDatabase)
                });
            } catch (err) {}
            
            updateClaimSummaryTotals(s);
        };

        rateInputs.forEach(input => {
            input.oninput = () => updateItemState(parseInt(input.dataset.idx));
        });
        checkboxes.forEach(cb => {
            cb.onchange = () => updateItemState(parseInt(cb.dataset.idx));
        });
        reasonInputs.forEach(textarea => {
            textarea.oninput = () => updateItemState(parseInt(textarea.dataset.idx));
        });

        updateClaimSummaryTotals(s);
    }

    function updateClaimSummaryTotals(s) {
        let dispTotal = 0;
        s.line_items.forEach(item => {
            if (item.is_disputed) {
                dispTotal += item.recoverable;
            }
        });
        
        const varianceEl = document.getElementById('set-details-disputed-total');
        if (varianceEl) {
            varianceEl.textContent = `₹${dispTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        }
        
        let totalDisallowed = 0;
        let totalRecoverable = 0;
        const disallowanceGroups = {};
        let rcapLeak = 0, monLeak = 0, conLeak = 0, mouLeak = 0;
        
        settlementDatabase.forEach(claim => {
            totalDisallowed += claim.deducted_amount;
            
            let claimRec = 0;
            claim.line_items.forEach(item => {
                disallowanceGroups[item.description] = (disallowanceGroups[item.description] || 0) + item.deducted;
                if (item.is_disputed) {
                    claimRec += item.recoverable;
                    
                    const desc = (item.description || '').toUpperCase();
                    const reason = (item.reason || '').toUpperCase();
                    if (desc.includes('MONITORING')) monLeak += item.recoverable;
                    else if (desc.includes('MISCELLANEOUS')) rcapLeak += item.recoverable;
                    else if (desc.includes('MEDICINE')) conLeak += item.recoverable;
                    else if (reason.includes('MOU DISCOUNT')) mouLeak += item.recoverable;
                    else if (desc.includes('ROOM')) rcapLeak += item.recoverable;
                }
            });
            claim.recoverable_amount = claimRec;
            totalRecoverable += claimRec;
        });
        
        const activeRowEl = document.querySelector('.settlement-row.active-row');
        if (activeRowEl) {
            const cells = activeRowEl.querySelectorAll('td');
            if (cells.length >= 6) {
                cells[5].textContent = `₹${s.recoverable_amount.toLocaleString(undefined, {maximumFractionDigits:0})}`;
                cells[5].style.color = s.recoverable_amount > 0 ? '#ef4444' : 'var(--text-muted)';
                cells[5].style.fontWeight = s.recoverable_amount > 0 ? '700' : 'normal';
                
                const isLeakage = s.recoverable_amount > 0;
                cells[6].innerHTML = isLeakage 
                    ? `<span style="background-color: var(--danger-bg); color: var(--danger); font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700;">Leakage Flagged</span>` 
                    : `<span style="background-color: var(--success-bg); color: var(--success); font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700;">Verified Aligned</span>`;
            }
        }
        
        const disallowedEl = document.getElementById('set-metric-disallowed');
        const recoverableEl = document.getElementById('set-metric-recoverable');
        if (disallowedEl) disallowedEl.textContent = `₹${totalDisallowed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (recoverableEl) recoverableEl.textContent = `₹${totalRecoverable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        renderInsightsDistribution(disallowanceGroups, totalDisallowed);
        renderInsightsPrevention(rcapLeak, monLeak, conLeak, mouLeak);
        
        const disputeBtn = document.getElementById('btn-set-dispute');
        if (disputeBtn) {
            disputeBtn.onclick = () => generateSettlementDisputeLetter(s);
            if (s.recoverable_amount > 0) {
                disputeBtn.disabled = false;
                disputeBtn.style.opacity = '1';
                disputeBtn.style.cursor = 'pointer';
            } else {
                disputeBtn.disabled = true;
                disputeBtn.style.opacity = '0.5';
                disputeBtn.style.cursor = 'not-allowed';
            }
        }
    }

    function generateSettlementDisputeLetter(s) {
        const dateStr = new Date().toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
        
        let disputeDetails = '';
        let disputedCount = 0;
        s.line_items.forEach((item) => {
            if (item.is_disputed && item.recoverable > 0) {
                disputedCount++;
                disputeDetails += `
${disputedCount}. Disputed Head: ${item.description}
   - Claimed/Billed: Rs. ${item.claimed.toLocaleString(undefined, {minimumFractionDigits: 2})}
   - TPA Approved:  Rs. ${item.approved.toLocaleString(undefined, {minimumFractionDigits: 2})}
   - Disallowed:    Rs. ${item.deducted.toLocaleString(undefined, {minimumFractionDigits: 2})}
   - Agreed Rate:   Rs. ${item.agreed_rate.toLocaleString(undefined, {minimumFractionDigits: 2})}
   - TPA Reason:    "${item.reason}"
   - Dispute Ground: "${item.dispute_reason || 'Charges violate agreed tariff schedule.'}"
`;
            }
        });
        
        const letter = `========================================================================
OFFICIAL CLAIM RECOVERY & DISPUTE LETTER
========================================================================
Date: ${dateStr}

To,
The Grievance Redressal / Claims Audit Desk
Aditya Birla Health Insurance Co. Limited
Guwahati Assam / Corporate Hub

Subject: Dispute for Unjustified Deductions in Claim ID: ${s.claim_id}

Dear Sir/Madam,

We are writing to formally dispute the settlement deductions applied to the claim of Patient ${s.patient_name} (Member ID: ${s.member_id}), who was hospitalized under Policy Number ${s.policy_number} from ${s.admission_date} to ${s.discharge_date}.

Out of the total billed amount of Rs. ${s.claimed_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}, a sum of Rs. ${s.deducted_amount.toLocaleString(undefined, {minimumFractionDigits: 2})} was disallowed. Upon reviewing the active agreed tariff schedule, we have identified that a total of Rs. ${s.recoverable_amount.toLocaleString(undefined, {minimumFractionDigits: 2})} was deducted in violation of the contract terms.

A detailed description of the disputed items and grounds for appeal is given below:
${disputeDetails}

We request you to review the above-mentioned items and release the recoverable leakage amount of Rs. ${s.recoverable_amount.toLocaleString(undefined, {minimumFractionDigits: 2})} at your earliest convenience.

Please credit the disputed amount to our registered bank account against UTR reference ${s.utr_number}.

Thanking you,

Yours sincerely,

For Apollo Hospitals Guwahati
Authorized Signatory
Claims & Billing Assurance Desk
`;
        
        const blob = new Blob([letter], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Dispute_Letter_Claim_${s.claim_id}.txt`;
        link.click();
        showToast(`Dispute Letter for Claim ${s.claim_id} generated and downloaded!`, 'success');
    }

    function handleSettlementSearch(e, allSettlements) {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderSettlementGrid(allSettlements);
            return;
        }
        
        const filtered = allSettlements.filter(s => {
            return (s.patient_name || '').toLowerCase().includes(query) ||
                   (s.claim_id || '').toLowerCase().includes(query) ||
                   (s.policy_number || '').toLowerCase().includes(query) ||
                   (s.utr_number || '').toLowerCase().includes(query);
        });
        
        renderSettlementGrid(filtered);
    }

    window.initSettlementAuditor = initSettlementAuditor;
    window.initIngesterPanel = initIngesterPanel;

    document.addEventListener('DOMContentLoaded', init);