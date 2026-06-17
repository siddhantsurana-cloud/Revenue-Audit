const database = require('./database');
const authEngine = require('./authEngine');
const auditEngine = require('./auditEngine');
const backupEngine = require('./backupEngine');
const fs = require('fs');
const path = require('path');

async function runTests() {
    console.log('=== STARTING ELECTRON BACKEND INTEGRATION TESTS ===\n');

    // 1. Initialize and Seed Database
    console.log('[Test 1] Initializing Database...');
    try {
        await database.initDatabase();
        console.log('SUCCESS: Database initialized and seeded successfully.\n');
    } catch (err) {
        console.error('FAILURE: Database initialization failed:', err);
        process.exit(1);
    }

    // 2. Verify Seeding Output
    console.log('[Test 2] Verifying seeded data...');
    try {
        const usersCount = await new Promise((res, rej) => {
            database.db.get('SELECT COUNT(*) as count FROM tbl_users', [], (err, row) => err ? rej(err) : res(row.count));
        });
        console.log(`- Seeded Users Count: ${usersCount} (Expected: >10)`);

        const agreementsCount = await new Promise((res, rej) => {
            database.db.get('SELECT COUNT(*) as count FROM tbl_agreements', [], (err, row) => err ? rej(err) : res(row.count));
        });
        console.log(`- Seeded Agreements Count: ${agreementsCount} (Expected: >0)`);

        const tariffCount = await new Promise((res, rej) => {
            database.db.get('SELECT COUNT(*) as count FROM tbl_tariff_master', [], (err, row) => err ? rej(err) : res(row.count));
        });
        console.log(`- Seeded Tariff Master Count: ${tariffCount} (Expected: >0)`);

        const socCount = await new Promise((res, rej) => {
            database.db.get('SELECT COUNT(*) as count FROM tbl_soc_master', [], (err, row) => err ? rej(err) : res(row.count));
        });
        console.log(`- Seeded SOC Master Count: ${socCount} (Expected: >0)`);
        
        if (usersCount > 0 && agreementsCount > 0 && tariffCount > 0 && socCount > 0) {
            console.log('SUCCESS: Data seeding verification passed.\n');
        } else {
            throw new Error('Some tables are empty.');
        }
    } catch (err) {
        console.error('FAILURE: Data seeding verification failed:', err);
        process.exit(1);
    }

    // 3. Test Authentication
    console.log('[Test 3] Testing Authentication Engine...');
    try {
        // Test correct login
        console.log('- Attempting correct login (BRC/Brc@2013 for excelcare)...');
        const loginRes = await authEngine.login('BRC', 'Brc@2013', 'excelcare', 'Auditor');
        console.log('  Response:', loginRes);
        console.log('  Session User:', await authEngine.getCurrentUser());

        // Verify hasPermission
        console.log('  Checking Auditor Permissions:');
        console.log('    - canRunAudit:', authEngine.hasPermission('canRunAudit'));
        console.log('    - canManageUsers:', authEngine.hasPermission('canManageUsers'));

        // Test incorrect password
        console.log('- Attempting incorrect password login...');
        try {
            await authEngine.login('BRC', 'WrongPassword', 'excelcare', 'Auditor');
            throw new Error('Allowed login with wrong password!');
        } catch (err) {
            console.log('  SUCCESS: Rejected wrong password correctly:', err.message);
        }

        // Test wrong role
        console.log('- Attempting login with role mismatch...');
        try {
            await authEngine.login('BRC', 'Brc@2013', 'excelcare', 'Administrator');
            throw new Error('Allowed login with role mismatch!');
        } catch (err) {
            console.log('  SUCCESS: Rejected role mismatch correctly:', err.message);
        }

        console.log('SUCCESS: Authentication tests passed.\n');
    } catch (err) {
        console.error('FAILURE: Authentication tests failed:', err);
        process.exit(1);
    }

    // 4. Test Audit Engine
    console.log('[Test 4] Testing Auditing Calculations and MOU Matching...');
    try {
        // Set active session back to auditor
        await authEngine.login('BRC', 'Brc@2013', 'excelcare', 'Auditor');
        const user = await authEngine.getCurrentUser();

        // Build a mock row to check
        // Urine Routine (CUE) under Excelcare Unit GIPSA Agreement
        // Let's find GIPSA agreement mapped in db
        const gipsaAg = await new Promise((res, rej) => {
            database.db.get("SELECT * FROM tbl_agreements WHERE TariffMapped LIKE '%GIPSA%' LIMIT 1", [], (err, row) => err ? rej(err) : res(row));
        });
        
        console.log('- Found GIPSA Agreement:', gipsaAg ? gipsaAg.AgreementName : 'None');

        const mockItem = {
            fileName: 'TestBill.xlsx',
            rowIndex: 12,
            billNo: 'BILL-1001',
            ipNo: 'IP-20050',
            patientName: 'Test Patient',
            roomCategory: 'SEMI-PRIVATE-AC',
            customer: gipsaAg ? gipsaAg.AgreementName : 'GIPSA',
            serviceId: '220', // Urine Routine
            serviceName: 'URINE ROUTINE (CUE)',
            dept: 'PATHOLOGY',
            billedRate: 220, // Billed 220 instead of 210
            quantity: 1
        };

        console.log('- Running validation for mock audit item...');
        const resVal = await auditEngine.validateAuditItem(mockItem, gipsaAg, 'TARIFF_EXCELCARE_GIPSA_2026');
        console.log('  Validation Result:', resVal);
        
        console.log('SUCCESS: Auditing calculations verification passed.\n');
    } catch (err) {
        console.error('FAILURE: Auditing engine test failed:', err);
        process.exit(1);
    }

    // 5. Test Audit Saving and Approval Locking
    console.log('[Test 5] Testing Save & Approval locking flow...');
    try {
        await authEngine.login('BRC', 'Brc@2013', 'excelcare', 'Auditor');
        const user = await authEngine.getCurrentUser();

        // Create sample audit results
        const sampleResults = [{
            fileName: 'TestBill.xlsx',
            rowIndex: 12,
            billNo: 'BILL-1001',
            ipNo: 'IP-20050',
            patientName: 'Test Patient',
            roomCategory: 'SEMI-PRIVATE-AC',
            customer: 'GIPSA',
            serviceId: '220',
            serviceName: 'URINE ROUTINE (CUE)',
            billedRate: 220,
            quantity: 1,
            expectedRate: 210,
            variance: 10,
            status: 'Overcharged',
            explanation: 'Billed 220, Expected 210',
            userRemarks: 'Wrong rate selected'
        }];

        console.log('- Saving audit as Auditor...');
        const saveRes = await auditEngine.saveAudit(sampleResults, user);
        console.log('  Save response:', saveRes);

        // Load audit results to get ResultID
        const savedRows = await auditEngine.getAuditHistory({ unit: 'excelcare' });
        const savedRow = savedRows[0];
        console.log('  Loaded Saved Row:', savedRow);

        // Try to approve as Auditor (should fail)
        console.log('- Attempting to approve audit as Auditor (should fail)...');
        try {
            await auditEngine.approveAudit(savedRow.ResultID, user);
            throw new Error('Auditor was allowed to approve audit!');
        } catch (err) {
            console.log('  SUCCESS: Blocked auditor approval correctly:', err.message);
        }

        // Login as Approver
        console.log('- Logging in as Approver (BRC1/Brc@2026)...');
        const appRes = await authEngine.login('BRC1', 'Brc@2026', 'excelcare', 'Approver');
        const appUser = await authEngine.getCurrentUser();

        // Approve audit (should succeed and lock)
        console.log('- Approving audit as Approver...');
        const approveResult = await auditEngine.approveAudit(savedRow.ResultID, appUser);
        console.log('  Approval response:', approveResult);

        // Check if locked
        const approvedRows = await auditEngine.getAuditHistory({ unit: 'excelcare' });
        console.log('  IsLocked after approval:', approvedRows[0].IsLocked);
        if (approvedRows[0].IsLocked !== 1) {
            throw new Error('Audit row was not locked after approval!');
        }

        // Try to save over locked row as Auditor (should fail)
        await authEngine.login('BRC', 'Brc@2013', 'excelcare', 'Auditor');
        const auditorUser = await authEngine.getCurrentUser();
        console.log('- Attempting to save over locked row as Auditor (should fail)...');
        try {
            await auditEngine.saveAudit(sampleResults, auditorUser);
            throw new Error('Allowed to overwrite locked row!');
        } catch (err) {
            console.log('  SUCCESS: Blocked overwriting locked row correctly:', err.message);
        }

        // Reopen as Approver
        await authEngine.login('BRC1', 'Brc@2026', 'excelcare', 'Approver');
        const appUserReopen = await authEngine.getCurrentUser();
        console.log('- Reopening audit as Approver...');
        await auditEngine.reopenAudit(savedRow.ResultID, appUserReopen, 'Need correction');

        // Check unlocked
        const reopenedRows = await auditEngine.getAuditHistory({ unit: 'excelcare' });
        console.log('  IsLocked after reopening:', reopenedRows[0].IsLocked);
        if (reopenedRows[0].IsLocked !== 0) {
            throw new Error('Audit row was not unlocked after reopening!');
        }

        console.log('SUCCESS: Save and Approval locking tests passed.\n');
    } catch (err) {
        console.error('FAILURE: Save/Approval locking tests failed:', err);
        process.exit(1);
    }

    // 6. Backup and Restore
    console.log('[Test 6] Testing Database Backup...');
    const backupFile = path.join(__dirname, 'backup_test.db');
    try {
        if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
        
        console.log('- Logging in as Administrator (admin/Admin@Excel)...');
        await authEngine.login('admin', 'Admin@Excel', 'excelcare', 'Administrator');

        console.log(`- Creating backup database at: ${backupFile}`);
        await backupEngine.createBackup(backupFile);
        
        if (fs.existsSync(backupFile) && fs.statSync(backupFile).size > 0) {
            console.log(`  SUCCESS: Backup file created. Size: ${fs.statSync(backupFile).size} bytes`);
            fs.unlinkSync(backupFile);
        } else {
            throw new Error('Backup file not created or empty.');
        }
        
        console.log('SUCCESS: Backup tests passed.\n');
    } catch (err) {
        console.error('FAILURE: Backup tests failed:', err);
        process.exit(1);
    }

    console.log('=== ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY ===');
}

runTests();
