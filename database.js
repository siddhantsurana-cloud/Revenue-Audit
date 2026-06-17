const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const vm = require('vm');

const dbPath = path.join(__dirname, 'revenue_audit.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Users table
            db.run(`CREATE TABLE IF NOT EXISTS tbl_users (
                UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT NOT NULL,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL,
                Unit TEXT NOT NULL,
                Status TEXT NOT NULL DEFAULT 'Active',
                CreatedOn TEXT NOT NULL,
                LastLogin TEXT,
                UNIQUE(Username, Unit)
            )`);

            // 2. Agreements table (with versioning)
            db.run(`CREATE TABLE IF NOT EXISTS tbl_agreements (
                AgreementID INTEGER PRIMARY KEY AUTOINCREMENT,
                AgreementName TEXT UNIQUE NOT NULL,
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
                ChangeSummary TEXT
            )`);

            // 3. SOC Master table
            db.run(`CREATE TABLE IF NOT EXISTS tbl_soc_master (
                SOCID INTEGER PRIMARY KEY AUTOINCREMENT,
                SOCName TEXT NOT NULL,
                ServiceID TEXT NOT NULL,
                ServiceName TEXT NOT NULL,
                ServiceType TEXT,
                Department TEXT,
                StandardRate REAL,
                RatesJSON TEXT,
                UNIQUE(SOCName, ServiceID)
            )`);

            // 4. Tariff Master table (standard base rates)
            db.run(`CREATE TABLE IF NOT EXISTS tbl_tariff_master (
                TariffID INTEGER PRIMARY KEY AUTOINCREMENT,
                ServiceID TEXT UNIQUE NOT NULL,
                ServiceName TEXT NOT NULL,
                Rate REAL NOT NULL
            )`);

            // 5. Audit Results table (lockable results)
            db.run(`CREATE TABLE IF NOT EXISTS tbl_audit_results (
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
                Unit TEXT NOT NULL,
                IsLocked INTEGER DEFAULT 0
            )`);

            // 6. Approval History table
            db.run(`CREATE TABLE IF NOT EXISTS tbl_approval_history (
                ApprovalID INTEGER PRIMARY KEY AUTOINCREMENT,
                ResultID INTEGER NOT NULL,
                Action TEXT NOT NULL,
                User TEXT NOT NULL,
                Timestamp TEXT NOT NULL,
                Reason TEXT
            )`);

            // 7. Immutable Audit Logs table
            db.run(`CREATE TABLE IF NOT EXISTS tbl_audit_logs (
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
            )`);

            // 8. Application Settings table
            db.run(`CREATE TABLE IF NOT EXISTS tbl_application_settings (
                SettingKey TEXT PRIMARY KEY,
                SettingValue TEXT NOT NULL
            )`, (err) => {
                if (err) return reject(err);
                
                // Seed settings and default users
                seedInitialData()
                    .then(() => seedTariffsIfNeeded())
                    .then(resolve)
                    .catch(reject);
            });
        });
    });
}

async function seedInitialData() {
    const defaultUsers = [
        // Global Admin
        { username: 'admin', password: 'Siddhant@$26', role: 'Administrator', unit: 'all' },
        // Excelcare
        { username: 'Review', password: 'Apollo@123', role: 'Viewer', unit: 'excelcare' },
        { username: 'BRC', password: 'Brc@2013', role: 'Auditor', unit: 'excelcare' },
        { username: 'BRC1', password: 'Brc@2026', role: 'Approver', unit: 'excelcare' },
        { username: 'admin', password: 'Admin@Excel', role: 'Administrator', unit: 'excelcare' },
        // International
        { username: 'Review', password: 'Apollo@123', role: 'Viewer', unit: 'international' },
        { username: 'BRC', password: 'Brc@2013', role: 'Auditor', unit: 'international' },
        { username: 'BRC1', password: 'Brc@2026', role: 'Approver', unit: 'international' },
        { username: 'admin', password: 'Admin@Intl', role: 'Administrator', unit: 'international' },
        // Kolkata
        { username: 'Review', password: 'Apollo@123', role: 'Viewer', unit: 'kolkata' },
        { username: 'BRC', password: 'Brc@2013', role: 'Auditor', unit: 'kolkata' },
        { username: 'BRC1', password: 'Brc@2026', role: 'Approver', unit: 'kolkata' },
        { username: 'admin', password: 'Admin@Kolkata', role: 'Administrator', unit: 'kolkata' },
        { username: 'kol_viewer', password: 'Viewer@Kolkata', role: 'Viewer', unit: 'kolkata' },
        { username: 'kol_auditor', password: 'Auditor@Kolkata', role: 'Auditor', unit: 'kolkata' },
        { username: 'kol_reviewer', password: 'Reviewer@Kolkata', role: 'Approver', unit: 'kolkata' },
        { username: 'kol_admin', password: 'Admin@Kolkata', role: 'Administrator', unit: 'kolkata' }
    ];

    const timestamp = new Date().toISOString();
    
    for (const u of defaultUsers) {
        const hash = bcrypt.hashSync(u.password, 10);
        await new Promise((res) => {
            db.run(`INSERT OR IGNORE INTO tbl_users (Username, PasswordHash, Role, Unit, CreatedOn) 
                    VALUES (?, ?, ?, ?, ?)`, [u.username, hash, u.role, u.unit, timestamp], () => res());
        });
    }
}

async function seedTariffsIfNeeded() {
    const tariffFile = path.join(__dirname, 'tariff_data.js');
    if (!fs.existsSync(tariffFile)) {
        console.warn('tariff_data.js not found. Skipping seeding.');
        return;
    }

    const stats = fs.statSync(tariffFile);
    const fileTime = stats.mtimeMs.toString();

    // Check last seeded timestamp
    const dbTime = await new Promise((res) => {
        db.get(`SELECT SettingValue FROM tbl_application_settings WHERE SettingKey = 'tariff_data_timestamp'`, [], (err, row) => {
            res(row ? row.SettingValue : null);
        });
    });

    if (dbTime === fileTime) {
        console.log('Tariff master is already up to date.');
        return;
    }

    console.log('Seeding tariff databases from tariff_data.js...');
    const fileContent = fs.readFileSync(tariffFile, 'utf-8');

    // Run tariff_data.js inside VM context to extract arrays safely
    const context = {};
    vm.createContext(context);
    vm.runInContext(fileContent, context);

    const socMappings = {
        'TARIFF_2021': context.TARIFF_2021,
        'TARIFF_2021_IOCL': context.TARIFF_2021_IOCL,
        'TARIFF_2023': context.TARIFF_2023,
        'TARIFF_2023_V2': context.TARIFF_2023_V2,
        'TARIFF_2024': context.TARIFF_2024,
        'TARIFF_2025': context.TARIFF_2025,
        'TARIFF_EXCELCARE_2024': context.TARIFF_EXCELCARE_2024,
        'TARIFF_EXCELCARE_2025': context.TARIFF_EXCELCARE_2025,
        'TARIFF_EXCELCARE_CASH_2025': context.TARIFF_EXCELCARE_CASH_2025,
        'TARIFF_EXCELCARE_GIPSA_2026': context.TARIFF_EXCELCARE_GIPSA_2026,
        'TARIFF_KOLKATA_SOC': context.TARIFF_KOLKATA_SOC,
        'TARIFF_KOLKATA_PKG': context.TARIFF_KOLKATA_PKG
    };

    // 1. Begin transaction to populate SOC Master
    await new Promise((res) => db.run('BEGIN TRANSACTION', res));
    
    // Clear old tables
    await new Promise((res) => db.run('DELETE FROM tbl_soc_master', res));
    await new Promise((res) => db.run('DELETE FROM tbl_tariff_master', res));
    await new Promise((res) => db.run('DELETE FROM tbl_agreements', res));

    // Seed agreements
    if (context.AGREEMENT_DETAILS) {
        const agStmt = db.prepare(`INSERT INTO tbl_agreements 
            (AgreementName, CustomerType, TariffMapped, DiscountMapped, Status, FromDate, ToDate, DiscountAgreed, Locations) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const ag of context.AGREEMENT_DETAILS) {
            agStmt.run([
                ag.agreementName,
                ag.customerType,
                ag.tariffMapped,
                ag.discountMapped,
                ag.status,
                ag.fromDate,
                ag.toDate,
                ag.discountAgreed,
                ag.locations
            ]);
        }
        agStmt.finalize();
    }

    // Seed master base tariff
    if (context.TARIFF_DATA) {
        const baseStmt = db.prepare(`INSERT OR REPLACE INTO tbl_tariff_master (ServiceID, ServiceName, Rate) VALUES (?, ?, ?)`);
        for (const item of context.TARIFF_DATA) {
            baseStmt.run([item.id, item.name, item.rate || 0.0]);
        }
        baseStmt.finalize();
    }

    // Seed SOCs
    const socStmt = db.prepare(`INSERT OR REPLACE INTO tbl_soc_master 
        (SOCName, ServiceID, ServiceName, ServiceType, Department, StandardRate, RatesJSON) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
        
    for (const [socName, socList] of Object.entries(socMappings)) {
        if (!socList || !Array.isArray(socList)) continue;
        for (const item of socList) {
            const ratesJson = item.rates ? JSON.stringify(item.rates) : null;
            socStmt.run([
                socName,
                item.id,
                item.name || '',
                item.type || '',
                item.dept || '',
                item.rate || 0.0,
                ratesJson
            ]);
        }
    }
    socStmt.finalize();

    await new Promise((res) => db.run('COMMIT', res));

    // Save seeding timestamp
    await new Promise((res) => {
        db.run(`INSERT OR REPLACE INTO tbl_application_settings (SettingKey, SettingValue) VALUES ('tariff_data_timestamp', ?)`, [fileTime], res);
    });
    console.log('Seeding completed successfully!');
}

module.exports = {
    db,
    initDatabase,
    seedTariffsIfNeeded
};
