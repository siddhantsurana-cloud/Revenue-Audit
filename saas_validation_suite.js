/**
 * saas_validation_suite.js
 * Integration test suite for Apollo Revenue Assurance Multi-Tenant SaaS Platform.
 * 
 * Verifies:
 * 1. Database Separation & Dynamic routing (isolated schemas per hospital tenant).
 * 2. Role-based Boundary & Commercial tariff rates masking.
 * 3. Date-effective matching functionality (MOU versioning by date validity).
 */

const assert = require('assert');
const path = require('path');
const database = require('./database');
const auditEngine = require('./auditEngine');
const authEngine = require('./authEngine');

// Helper for colored logs
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m"
};

function logHeader(msg) {
    console.log(`\n${colors.cyan}================================================================${colors.reset}`);
    console.log(`${colors.cyan}  ${msg}${colors.reset}`);
    console.log(`${colors.cyan}================================================================${colors.reset}`);
}

function logSuccess(msg) {
    console.log(`${colors.green}✔ PASS: ${msg}${colors.reset}`);
}

function logError(msg, err) {
    console.log(`${colors.red}✘ FAIL: ${msg}${colors.reset}`);
    if (err) console.error(err);
}

// Simulated IPC audit checks (matching IPC runRevenueCheck in main.js)
async function simulateAuditRun(user, rows) {
    const isGlobal = user && user.role === 'Administrator' && user.unit === 'all';
    
    // Non-Global Admin context routing (routes to user's unit)
    if (!isGlobal && user) {
        await database.switchTenantContext(user.unit);
    }
    
    const results = [];
    const cache = await auditEngine.preloadAuditCache(null);
    
    for (const item of rows) {
        // Resolve agreement using date-effective logic
        const resolvedAgreement = await auditEngine.findDateEffectiveAgreement(
            item.customer, 
            item.billedDate || item.startDateVal, 
            database.getCurrentTenant()
        );
        
        // Execute core validation
        const res = await auditEngine.validateAuditItem(item, resolvedAgreement, null, cache);
        
        // Expose transaction-specific commercial rates for active audit items for authorized auditors (non-Viewer roles)
        const isAuthorizedAuditor = user && user.role !== 'Viewer';
        const expectedRate = isAuthorizedAuditor ? res.expectedTariff : null;
        const expectedDiscountedRate = isAuthorizedAuditor ? res.expectedDiscountedRate : null;
        const explanation = isAuthorizedAuditor ? res.explanation : res.explanation.replace(/₹\s*\d+(\.\d+)?/g, '₹***');
        
        results.push({
            expectedRate,
            expectedDiscountedRate,
            status: res.status,
            explanation,
            variance: expectedDiscountedRate !== null ? (item.billedRate - expectedDiscountedRate) : 0,
            
            // Rate Decision Engine extension fields
            applicableTariff: res.applicableTariff,
            applicableSOC: res.applicableSOC,
            expectedAmount: res.expectedAmount,
            recoveryAmount: res.recoveryAmount,
            agreementReference: res.agreementReference,
            calculationTrace: res.calculationTrace,
            aiExplanation: res.aiExplanation,
            disallowanceInfo: res.disallowanceInfo
        });
    }
    return results;
}

async function runTests() {
    try {
        logHeader("Initializing SaaS Platform Central Registry & Databases");
        await database.initDatabase();
        logSuccess("Central registry & hospital databases initialized successfully.");

        // ---------------------------------------------------------------------
        // TEST 1: Database Separation & Isolated Tenant Connections
        // ---------------------------------------------------------------------
        logHeader("Test 1: Database Separation & Isolated Tenant Connections");
        
        // Context should default to 'excelcare'
        assert.strictEqual(database.getCurrentTenant(), 'excelcare', "Default tenant context should be 'excelcare'");
        logSuccess("Default tenant connection is 'excelcare'.");

        // Insert a unique test agreement only in Excelcare context
        const isolatedAgreementName = "Isolated Excelcare Test Agreement " + Date.now();
        await new Promise((resolve, reject) => {
            database.db.run(`INSERT INTO tbl_agreements 
                (AgreementName, CustomerType, TariffMapped, Status, FromDate, ToDate) 
                VALUES (?, 'Corporate', 'TEST TARIFF', 'Available/Valid', '01-01-2025', '31-12-2030')`, 
                [isolatedAgreementName], 
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Verify it exists in Excelcare
        const existsInExcelcare = await new Promise((resolve, reject) => {
            database.db.get("SELECT COUNT(*) as count FROM tbl_agreements WHERE AgreementName = ?", [isolatedAgreementName], (err, row) => {
                if (err) return reject(err);
                resolve(row.count > 0);
            });
        });
        assert.ok(existsInExcelcare, "Isolated agreement should exist in excelcare database.");
        logSuccess(`Successfully inserted isolated agreement in 'excelcare' database: "${isolatedAgreementName}"`);

        // Switch to Kolkata context
        await database.switchTenantContext('kolkata');
        assert.strictEqual(database.getCurrentTenant(), 'kolkata', "Active context should be 'kolkata' after switch");
        
        // Verify it does NOT exist in Kolkata DB
        const existsInKolkata = await new Promise((resolve, reject) => {
            database.db.get("SELECT COUNT(*) as count FROM tbl_agreements WHERE AgreementName = ?", [isolatedAgreementName], (err, row) => {
                if (err) return reject(err);
                resolve(row.count > 0);
            });
        });
        assert.ok(!existsInKolkata, "Isolated excelcare agreement MUST NOT exist in kolkata database.");
        logSuccess("Verified isolated agreement is absent in 'kolkata' database context.");

        // Switch back to excelcare and clean up
        await database.switchTenantContext('excelcare');
        assert.strictEqual(database.getCurrentTenant(), 'excelcare', "Active context should be restored to 'excelcare'");

        await new Promise((resolve, reject) => {
            database.db.run("DELETE FROM tbl_agreements WHERE AgreementName = ?", [isolatedAgreementName], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        logSuccess("Cleaned up isolated test agreement from 'excelcare' database.");
        logSuccess("Dynamic query routing correctly isolates database connections per hospital tenant.");

        // ---------------------------------------------------------------------
        // TEST 2: Role-based Boundary & Commercial Tariff Rate Masking
        // ---------------------------------------------------------------------
        logHeader("Test 2: Role-based Boundary & Commercial Tariff Rate Masking");

        // Setup mock transactions
        const mockBilledRows = [
            {
                customer: "3XPER INNOVENTURE LIMITED (MURUGAPPA GROUP) AHC AGREEMENT",
                serviceId: "1", // General service name
                serviceName: "CONSULTATION",
                billedRate: 400.0,
                billedDate: "15-06-2025",
                quantity: 1,
                roomCategory: "SINGLE"
            }
        ];

        // Scenario A: Logged in as a Global Admin (Administrator, unit: 'all')
        const globalAdminUser = { role: "Administrator", unit: "all" };
        const globalResults = await simulateAuditRun(globalAdminUser, mockBilledRows);
        
        console.log("Global Admin validation results:");
        console.log(globalResults[0]);
        
        assert.notStrictEqual(globalResults[0].expectedRate, null, "Global Admin should see Expected Rates");
        assert.notStrictEqual(globalResults[0].expectedDiscountedRate, null, "Global Admin should see Expected Discounted Rates");
        assert(!globalResults[0].explanation.includes("₹***"), "Global Admin explanation should contain unmasked amounts");
        logSuccess("Global Admins are permitted to view sensitive commercial master tariff rates.");

        // Scenario B: Logged in as a Hospital Auditor (Auditor, unit: 'excelcare')
        // Under the Controlled Commercial Visibility model, auditors can see transaction-specific rates.
        const localAuditorUser = { role: "Auditor", unit: "excelcare" };
        const auditorResults = await simulateAuditRun(localAuditorUser, mockBilledRows);
        
        console.log("Local Auditor validation results (Rates Unmasked for Audit Item):");
        console.log(auditorResults[0]);
        
        assert.notStrictEqual(auditorResults[0].expectedRate, null, "Authorized Auditor must see Expected Rates for transaction");
        assert.notStrictEqual(auditorResults[0].expectedDiscountedRate, null, "Authorized Auditor must see Expected Discounted Rates for transaction");
        assert(!auditorResults[0].explanation.includes("₹***"), "Auditor explanation should contain unmasked amounts");
        logSuccess("Hospital Auditors can view transaction-specific commercial rates for active audit items.");

        // Scenario C: Logged in as a Guest or Viewer (Viewer, unit: 'excelcare')
        // Viewers are not authorized auditors and should have expected rates masked.
        const viewerUser = { role: "Viewer", unit: "excelcare" };
        const viewerResults = await simulateAuditRun(viewerUser, mockBilledRows);
        
        console.log("Viewer validation results (Rates Masked):");
        console.log(viewerResults[0]);
        
        assert.strictEqual(viewerResults[0].expectedRate, null, "Non-auditor Viewer Expected Rates must be masked to null");
        assert.strictEqual(viewerResults[0].expectedDiscountedRate, null, "Non-auditor Viewer Expected Discounted Rates must be masked to null");
        assert(viewerResults[0].explanation.includes("₹***") || !viewerResults[0].explanation.includes("₹"), "Viewer explanations must have currency rates masked to ₹***");
        logSuccess("Viewers are blocked from viewing transaction rates (remains masked).");

        // ---------------------------------------------------------------------
        // TEST 3: Date-effective MOU Version Matching
        // ---------------------------------------------------------------------
        logHeader("Test 3: Date-effective MOU Version Matching");

        // We will insert two test agreements with different versions and date windows
        await database.switchTenantContext('excelcare');
        
        // Clean up previous test runs if any
        await new Promise((res) => database.db.run("DELETE FROM tbl_agreements WHERE AgreementName LIKE 'Test Versioned MOU%'", [], res));

        const testAgreements = [
            {
                name: "Test Versioned MOU Corp",
                custType: "Corporate",
                tariff: "APOLLO EXCELCARE OP TARIFF 2025-26",
                discount: "DISCOUNT 10%",
                fromDate: "01-01-2025",
                toDate: "31-12-2025",
                version: 1
            },
            {
                name: "Test Versioned MOU Corp",
                custType: "Corporate",
                tariff: "APOLLO EXCELCARE OP TARIFF 2025-26",
                discount: "DISCOUNT 20%",
                fromDate: "01-01-2026",
                toDate: "31-12-2026",
                version: 2
            }
        ];

        // Insert into database
        const insertAgStmt = database.db.prepare(`INSERT INTO tbl_agreements 
            (AgreementName, CustomerType, TariffMapped, DiscountMapped, Status, FromDate, ToDate, DiscountAgreed, Version) 
            VALUES (?, ?, ?, ?, 'Available/Valid', ?, ?, ?, ?)`);
        
        for (const ag of testAgreements) {
            await new Promise((resolve, reject) => {
                insertAgStmt.run([ag.name, ag.custType, ag.tariff, ag.discount, ag.fromDate, ag.toDate, ag.discount, ag.version], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
        insertAgStmt.finalize();
        console.log("Seeded versioned agreements for testing date-effective logic.");

        // Case A: Transaction Date in 2025 (should match Version 1)
        const match2025 = await auditEngine.findDateEffectiveAgreement("Test Versioned MOU Corp", "15-06-2025", "excelcare");
        console.log("Matched Agreement for 15-06-2025:");
        console.log(`Name: ${match2025?.agreementName}, Version: ${match2025?.version}, Range: ${match2025?.fromDate} to ${match2025?.toDate}`);
        
        assert.ok(match2025, "Should match an agreement for 2025 date");
        assert.strictEqual(match2025.version, 1, "Should resolve to Version 1 (effective in 2025)");

        // Case B: Transaction Date in 2026 (should match Version 2)
        const match2026 = await auditEngine.findDateEffectiveAgreement("Test Versioned MOU Corp", "15-06-2026", "excelcare");
        console.log("Matched Agreement for 15-06-2026:");
        console.log(`Name: ${match2026?.agreementName}, Version: ${match2026?.version}, Range: ${match2026?.fromDate} to ${match2026?.toDate}`);
        
        assert.ok(match2026, "Should match an agreement for 2026 date");
        assert.strictEqual(match2026.version, 2, "Should resolve to Version 2 (effective in 2026)");

        // Clean up test data
        await new Promise((res) => database.db.run("DELETE FROM tbl_agreements WHERE AgreementName LIKE 'Test Versioned MOU%'", [], res));
        logSuccess("Date-effective logic successfully selects the correct agreement version based on billing date boundaries.");

        // ---------------------------------------------------------------------
        // TEST 4: Disallowance Engine Rules Evaluation
        // ---------------------------------------------------------------------
        logHeader("Test 4: Disallowance Engine Rules Evaluation");

        // Seed a TPA/Insurance agreement to trigger disallowance logic
        const tpaAgreementName = "TPA Test Agreement " + Date.now();
        await new Promise((resolve, reject) => {
            database.db.run(`INSERT INTO tbl_agreements 
                (AgreementName, CustomerType, TariffMapped, Status, FromDate, ToDate, Locations) 
                VALUES (?, 'TPA', 'TEST TARIFF', 'Available/Valid', '01-01-2025', '31-12-2030', 'Excelcare')`, 
                [tpaAgreementName], 
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        const tpaBilledRows = [
            {
                customer: tpaAgreementName,
                serviceId: "PPE-1",
                serviceName: "PPE KIT CHARGE",
                billedRate: 350.0,
                billedDate: "15-06-2025",
                quantity: 2,
                roomCategory: "SINGLE"
            }
        ];

        const tpaResults = await simulateAuditRun(localAuditorUser, tpaBilledRows);
        console.log("TPA Auditor disallowance validation results:");
        console.log(tpaResults[0]);

        assert.ok(tpaResults[0].disallowanceInfo, "Disallowance Info should be present for TPA non-medical consumable");
        assert.strictEqual(tpaResults[0].disallowanceInfo.disallowedAmount, 700.0, "Disallowed amount should be 350 * 2 = 700");
        assert.strictEqual(tpaResults[0].disallowanceInfo.recoveryOpportunity, 700.0, "Recovery opportunity should be 700");
        assert.ok(tpaResults[0].disallowanceInfo.agreementClause.includes("Clause 18.4"), "Clause reference should be correct");

        // Clean up
        await new Promise((resolve, reject) => {
            database.db.run("DELETE FROM tbl_agreements WHERE AgreementName = ?", [tpaAgreementName], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        logSuccess("Disallowance engine successfully evaluated non-medical consumable capping under TPA/Insurance.");

        logHeader("All SaaS Integration Tests Passed Successfully!");
    } catch (err) {
        logError("SaaS Integration Suite failed with exception:", err);
        process.exit(1);
    }
}

runTests();
