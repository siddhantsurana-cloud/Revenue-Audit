const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const centralDbPath = path.join(__dirname, 'central_registry.db');
const centralDb = new sqlite3.Database(centralDbPath);

function initCentralDatabase() {
    return new Promise((resolve, reject) => {
        centralDb.serialize(() => {
            // Global Users Table
            centralDb.run(`CREATE TABLE IF NOT EXISTS tbl_global_users (
                UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT NOT NULL,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL,
                Region TEXT DEFAULT 'ALL',
                Unit TEXT DEFAULT 'all',
                Status TEXT DEFAULT 'Active',
                CreatedOn TEXT NOT NULL,
                LastLogin TEXT,
                UNIQUE(Username, Unit)
            )`);

            // Tenants / Hospitals Directory
            centralDb.run(`CREATE TABLE IF NOT EXISTS tbl_tenants (
                TenantID INTEGER PRIMARY KEY AUTOINCREMENT,
                HospitalCode TEXT UNIQUE NOT NULL,
                HospitalName TEXT NOT NULL,
                Region TEXT NOT NULL,
                DbFileName TEXT NOT NULL,
                Status TEXT DEFAULT 'Active',
                ValidTill TEXT NOT NULL,
                StorageAllocationMB INTEGER DEFAULT 500,
                AICreditsRemaining INTEGER DEFAULT 1000,
                PowerBIWorkspaceID TEXT
            )`);

            // Seed initial data
            seedCentralRegistry()
                .then(resolve)
                .catch(reject);
        });
    });
}

async function seedCentralRegistry() {
    // 1. Seed Tenants
    const tenants = [
        { code: 'excelcare', name: 'Apollo Excelcare Guwahati', region: 'East', dbFile: 'hospital_excelcare.db', validTill: '2028-12-31' },
        { code: 'christianbasti', name: 'Apollo Christian Basti Guwahati', region: 'East', dbFile: 'hospital_christianbasti.db', validTill: '2028-12-31' },
        { code: 'kolkata', name: 'Apollo Gleneagles Kolkata', region: 'East', dbFile: 'hospital_kolkata.db', validTill: '2028-12-31' }
    ];

    for (const t of tenants) {
        await new Promise((resolve) => {
            centralDb.run(
                `INSERT OR IGNORE INTO tbl_tenants (HospitalCode, HospitalName, Region, DbFileName, ValidTill) VALUES (?, ?, ?, ?, ?)`,
                [t.code, t.name, t.region, t.dbFile, t.validTill],
                () => resolve()
            );
        });
    }

    // 2. Seed Users
    const defaultUsers = [
        { username: 'admin', password: 'Siddhant@$26', role: 'Administrator', region: 'ALL', unit: 'all' },
        { username: 'BRC', password: 'Brc@2013', role: 'Auditor', region: 'East', unit: 'excelcare' },
        { username: 'BRC1', password: 'Brc@2026', role: 'Approver', region: 'East', unit: 'excelcare' },
        { username: 'Review', password: 'Apollo@123', role: 'Viewer', region: 'East', unit: 'excelcare' },
        { username: 'admin', password: 'Admin@Excel', role: 'Administrator', region: 'East', unit: 'excelcare' }
    ];

    const now = new Date().toISOString();
    for (const u of defaultUsers) {
        const hash = bcrypt.hashSync(u.password, 10);
        await new Promise((resolve) => {
            centralDb.run(
                `INSERT OR IGNORE INTO tbl_global_users (Username, PasswordHash, Role, Region, Unit, CreatedOn) VALUES (?, ?, ?, ?, ?, ?)`,
                [u.username, hash, u.role, u.region, u.unit, now],
                () => resolve()
            );
        });
    }
}

// Map of active tenant DB connections
const tenantConnections = {};

function getTenantDatabase(hospitalCode) {
    if (!hospitalCode) return null;
    const code = hospitalCode.toLowerCase();
    
    // Check cache
    if (tenantConnections[code]) {
        return Promise.resolve(tenantConnections[code]);
    }
    
    // Check validity and file path
    return new Promise((resolve, reject) => {
        centralDb.get(`SELECT DbFileName, Status, ValidTill FROM tbl_tenants WHERE HospitalCode = ?`, [code], (err, tenant) => {
            if (err || !tenant) {
                return reject(new Error(`Tenant ${hospitalCode} not found or inactive.`));
            }
            
            // Check expiry date
            const exp = new Date(tenant.ValidTill);
            if (exp < new Date() || tenant.Status !== 'Active') {
                return reject(new Error(`Tenant subscription expired or inactive.`));
            }

            const dbFile = path.join(__dirname, tenant.DbFileName);
            const tenantDb = new sqlite3.Database(dbFile);
            
            // Initialize Tenant Schema if not initialized
            initTenantSchema(tenantDb)
                .then(() => {
                    tenantConnections[code] = tenantDb;
                    resolve(tenantDb);
                })
                .catch(reject);
        });
    });
}

function initTenantSchema(tenantDb) {
    return new Promise((resolve, reject) => {
        tenantDb.serialize(() => {
            // Local users directory
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_users (
                UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT UNIQUE NOT NULL,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL,
                Status TEXT DEFAULT 'Active',
                CreatedOn TEXT NOT NULL
            )`);

            // Agreements (with versioning)
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_agreements (
                AgreementID INTEGER PRIMARY KEY AUTOINCREMENT,
                AgreementName TEXT NOT NULL,
                CustomerType TEXT,
                TariffMapped TEXT,
                DiscountMapped TEXT,
                Status TEXT DEFAULT 'Available/Valid',
                FromDate TEXT,
                ToDate TEXT,
                DiscountAgreed TEXT,
                Locations TEXT,
                Version INTEGER DEFAULT 1,
                ChangedBy TEXT,
                ChangedOn TEXT,
                ChangeSummary TEXT,
                UNIQUE(AgreementName, Version)
            )`);

            // SOC Master table
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_soc_master (
                SOCID INTEGER PRIMARY KEY AUTOINCREMENT,
                SOCName TEXT NOT NULL,
                ServiceID TEXT NOT NULL,
                ServiceName TEXT NOT NULL,
                AliasName TEXT,
                ServiceType TEXT,
                Department TEXT,
                StandardRate REAL,
                RatesJSON TEXT,
                UNIQUE(SOCName, ServiceID)
            )`);

            // Tariff Master (only global admin reads/writes rate)
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_tariff_master (
                TariffID INTEGER PRIMARY KEY AUTOINCREMENT,
                ServiceID TEXT UNIQUE NOT NULL,
                ServiceName TEXT NOT NULL,
                Rate REAL NOT NULL
            )`);

            // Audit Results (tenant specific)
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_audit_results (
                ResultID INTEGER PRIMARY KEY AUTOINCREMENT,
                FileName TEXT NOT NULL,
                RowIndex INTEGER NOT NULL,
                BillNo TEXT,
                IPNo TEXT,
                PatientName TEXT,
                BilledDate TEXT,
                RoomCategory TEXT,
                Customer TEXT,
                ServiceID TEXT,
                ServiceName TEXT,
                BilledRate REAL,
                Quantity INTEGER,
                ExpectedRate REAL,
                Variance REAL,
                Status TEXT,
                Explanation TEXT,
                UserRemarks TEXT,
                AuditedBy TEXT,
                AuditDate TEXT,
                IsLocked INTEGER DEFAULT 0
            )`);

            // Approval History
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_approval_history (
                ApprovalID INTEGER PRIMARY KEY AUTOINCREMENT,
                ResultID INTEGER NOT NULL,
                Action TEXT NOT NULL,
                User TEXT NOT NULL,
                Timestamp TEXT NOT NULL,
                Reason TEXT
            )`);

            // Immutable Audit Logs (auditing actions, updates)
            tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_audit_logs (
                LogID INTEGER PRIMARY KEY AUTOINCREMENT,
                Timestamp TEXT NOT NULL,
                User TEXT NOT NULL,
                Role TEXT NOT NULL,
                Action TEXT NOT NULL,
                Module TEXT NOT NULL,
                RecordID TEXT,
                OldValue TEXT,
                NewValue TEXT,
                Remarks TEXT
            )`, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    });
}

module.exports = {
    initCentralDatabase,
    centralDb,
    getTenantDatabase
};
