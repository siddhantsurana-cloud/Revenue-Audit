const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const vm = require('vm');
const centralRegistry = require('./central_registry');

let currentDb = null;
let currentDbName = 'excelcare';

// Proxy object for database connection to support backwards compatibility
const dbProxy = {
    all(sql, params = [], callback) {
        getDb().then(db => db.all(sql, params, callback)).catch(err => {
            if (typeof callback === 'function') callback(err);
        });
    },
    run(sql, params = [], callback) {
        getDb().then(db => db.run(sql, params, callback)).catch(err => {
            if (typeof callback === 'function') callback(err);
        });
    },
    get(sql, params = [], callback) {
        getDb().then(db => db.get(sql, params, callback)).catch(err => {
            if (typeof callback === 'function') callback(err);
        });
    },
    prepare(sql) {
        if (!currentDb) {
            throw new Error("Database not initialized yet. Call initDatabase first.");
        }
        return currentDb.prepare(sql);
    },
    serialize(callback) {
        if (!currentDb) {
            throw new Error("Database not initialized yet. Call initDatabase first.");
        }
        currentDb.serialize(callback);
    }
};

async function getDb() {
    if (!currentDb) {
        currentDb = await centralRegistry.getTenantDatabase(currentDbName);
    }
    return currentDb;
}

async function switchTenantContext(hospitalCode) {
    currentDbName = hospitalCode.toLowerCase();
    currentDb = await centralRegistry.getTenantDatabase(currentDbName);
    console.log(`[SaaS Context Router] Switched active database context to: hospital_${currentDbName}.db`);
    return true;
}

async function initDatabase() {
    // 1. Init central registry
    await centralRegistry.initCentralDatabase();

    // 2. Init and seed tenant databases
    const tenants = ['excelcare', 'christianbasti', 'kolkata'];
    for (const t of tenants) {
        const tenantDb = await centralRegistry.getTenantDatabase(t);
        await seedTenantTariffsIfNeeded(tenantDb, t);
    }

    // Set default context to excelcare for tests
    currentDb = await centralRegistry.getTenantDatabase('excelcare');
}

async function seedTenantTariffsIfNeeded(tenantDb, tenantCode) {
    const tariffFile = path.join(__dirname, 'tariff_data.js');
    if (!fs.existsSync(tariffFile)) {
        return;
    }

    const stats = fs.statSync(tariffFile);
    const fileTime = stats.mtimeMs.toString();

    // Check last seeded timestamp
    const dbTime = await new Promise((res) => {
        tenantDb.get(`SELECT SettingValue FROM tbl_application_settings WHERE SettingKey = 'tariff_data_timestamp'`, [], (err, row) => {
            res(row ? row.SettingValue : null);
        });
    });

    // Check if base rates are seeded correctly (not all 0)
    const baseRatesCount = await new Promise((res) => {
        tenantDb.get(`SELECT COUNT(*) as count FROM tbl_tariff_master WHERE Rate > 0`, [], (err, row) => {
            res(row ? row.count : 0);
        });
    });

    if (dbTime === fileTime && baseRatesCount > 0) {
        return;
    }

    console.log(`[Seeding] Seeding isolated tenant database for: ${tenantCode}...`);
    
    // Ensure table application settings exists in tenant
    await new Promise((resolve) => {
        tenantDb.run(`CREATE TABLE IF NOT EXISTS tbl_application_settings (SettingKey TEXT PRIMARY KEY, SettingValue TEXT NOT NULL)`, () => resolve());
    });

    const fileContent = fs.readFileSync(tariffFile, 'utf-8').replace(/\bconst\b/g, 'var');

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
        'TARIFF_EXCELCARE_CASH_2627': context.TARIFF_EXCELCARE_CASH_2627,
        'TARIFF_EXCELCARE_GIPSA_2026': context.TARIFF_EXCELCARE_GIPSA_2026,
        'TARIFF_KOLKATA_SOC': context.TARIFF_KOLKATA_SOC,
        'TARIFF_KOLKATA_PKG': context.TARIFF_KOLKATA_PKG,
        'TARIFF_CASH_2025': context.TARIFF_CASH_2025,
        'TARIFF_CASH_2026': context.TARIFF_CASH_2026,
        'TARIFF_CASH_2026_V2': context.TARIFF_CASH_2026_V2,
        'TARIFF_HDFC_ERGO_2024': context.TARIFF_HDFC_ERGO_2024
    };

    await new Promise((res) => tenantDb.run('BEGIN TRANSACTION', res));
    
    await new Promise((res) => tenantDb.run('DELETE FROM tbl_soc_master', res));
    await new Promise((res) => tenantDb.run('DELETE FROM tbl_tariff_master', res));
    await new Promise((res) => tenantDb.run('DELETE FROM tbl_agreements', res));

    // Seed agreements
    if (context.AGREEMENT_DETAILS) {
        const agStmt = tenantDb.prepare(`INSERT OR REPLACE INTO tbl_agreements 
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

    // Seed base master tariff
    if (context.TARIFF_DATA) {
        const baseStmt = tenantDb.prepare(`INSERT OR REPLACE INTO tbl_tariff_master (ServiceID, ServiceName, Rate) VALUES (?, ?, ?)`);
        for (const item of context.TARIFF_DATA) {
            let rateVal = 0.0;
            if (item.rate !== undefined && item.rate !== null) {
                rateVal = Number(item.rate);
            } else if (item.gipsa_rate !== undefined && item.gipsa_rate !== null) {
                rateVal = Number(item.gipsa_rate);
            } else if (item.tpa_rate !== undefined && item.tpa_rate !== null) {
                rateVal = Number(item.tpa_rate);
            }
            if (isNaN(rateVal)) {
                rateVal = 0.0;
            }
            baseStmt.run([item.id, item.name, rateVal]);
        }
        baseStmt.finalize();
    }

    // Seed SOCs
    const socStmt = tenantDb.prepare(`INSERT OR REPLACE INTO tbl_soc_master 
        (SOCName, ServiceID, ServiceName, AliasName, ServiceType, Department, StandardRate, RatesJSON) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        
    for (const [socName, socList] of Object.entries(socMappings)) {
        if (!socList || !Array.isArray(socList)) continue;
        for (const item of socList) {
            const ratesJson = item.rates ? JSON.stringify(item.rates) : null;
            socStmt.run([
                socName,
                item.id,
                item.name || '',
                item.aliasName || '',
                item.type || '',
                item.dept || '',
                item.rate || 0.0,
                ratesJson
            ]);
        }
    }
    socStmt.finalize();

    await new Promise((res) => tenantDb.run('COMMIT', res));

    await new Promise((res) => {
        tenantDb.run(`INSERT OR REPLACE INTO tbl_application_settings (SettingKey, SettingValue) VALUES ('tariff_data_timestamp', ?)`, [fileTime], res);
    });
    console.log(`[Seeding] Tenant database for ${tenantCode} seeded successfully.`);
}

module.exports = {
    db: dbProxy,
    initDatabase,
    switchTenantContext,
    getCurrentTenant: () => currentDbName
};

