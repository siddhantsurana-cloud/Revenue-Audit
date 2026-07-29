const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const database = require('./database');
const authEngine = require('./authEngine');
const auditEngine = require('./auditEngine');
const backupEngine = require('./backupEngine');

function isGlobalAdmin(user) {
    return user && (user.role === 'Administrator' || user.role === 'CommercialAdmin') && user.unit === 'all';
}

function maskExplanation(explanation, isGlobal) {
    return explanation; // No longer masking explanation strings for transaction specific data
}


const isDev = !app.isPackaged;
let mainWindow = null;

async function createWindow() {
    // 1. Initialize Database
    try {
        await database.initDatabase();
        console.log('Database initialized successfully.');
    } catch (dbErr) {
        console.error('Failed to initialize database:', dbErr);
    }

    // 2. Setup menu bar
    if (!isDev) {
        Menu.setApplicationMenu(null);
    }

    mainWindow = new BrowserWindow({
        width: 1300,
        height: 850,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        icon: path.join(__dirname, 'apollo_logo.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    if (isDev) {
        mainWindow.webContents.openDevTools();
    } else {
        // Prevent devtools opening via keyboard shortcuts in production
        mainWindow.webContents.on('devtools-opened', () => {
            mainWindow.webContents.closeDevTools();
        });
        
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
                event.preventDefault();
            }
        });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC API Wire-Up
// ─────────────────────────────────────────────────────────────────────────────

// A. Authentication API
ipcMain.handle('auth:login', async (event, { username, password, unit, role }) => {
    return await authEngine.login(username, password, unit, role);
});

ipcMain.handle('auth:logout', async () => {
    return await authEngine.logout();
});

ipcMain.handle('auth:getCurrentUser', async () => {
    return await authEngine.getCurrentUser();
});

ipcMain.handle('auth:loadUsers', async () => {
    return await authEngine.loadUsers();
});

ipcMain.handle('auth:saveUser', async (event, user) => {
    return await authEngine.saveUser(user);
});

ipcMain.handle('auth:deleteUser', async (event, userId) => {
    return await authEngine.deleteUser(userId);
});

// B. Auditing API
ipcMain.handle('audit:runValidation', async (event, { item, agreement, activeSOCName }) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    const isGlobal = isGlobalAdmin(user);
    if (!isGlobal) {
        await database.switchTenantContext(user.unit);
    }
    const resolvedAgreement = agreement || await auditEngine.findDateEffectiveAgreement(item.customer, item.billedDate || item.startDateVal, database.getCurrentTenant());
    const res = await auditEngine.validateAuditItem(item, resolvedAgreement, activeSOCName);
    return {
        expectedRate: res.expectedTariff,
        expectedDiscountedRate: res.expectedDiscountedRate,
        variance: res.variance,
        status: res.status,
        explanation: res.explanation,
        isIgnored: res.isIgnored,
        exceptionCode: res.exceptionCode,
        
        // Rate Decision Engine extension fields
        applicableTariff: res.applicableTariff,
        applicableSOC: res.applicableSOC,
        expectedAmount: res.expectedAmount,
        recoveryAmount: res.recoveryAmount,
        agreementReference: res.agreementReference,
        calculationTrace: res.calculationTrace,
        aiExplanation: res.aiExplanation,
        disallowanceInfo: res.disallowanceInfo
    };
});

ipcMain.handle('audit:runRevenueCheck', async (event, { rows, agreement, activeSOCName }) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    const isGlobal = isGlobalAdmin(user);
    if (!isGlobal) {
        await database.switchTenantContext(user.unit);
    }
    const results = [];
    const cache = await auditEngine.preloadAuditCache(activeSOCName);
    
    for (const item of rows) {
        const resolvedAgreement = agreement || await auditEngine.findDateEffectiveAgreement(item.customer, item.billedDate || item.startDateVal, database.getCurrentTenant());
        const res = await auditEngine.validateAuditItem(item, resolvedAgreement, activeSOCName, cache);
        results.push({
            fileName: item.fileName || '',
            rowIndex: item.rowIndex || 0,
            billNo: item.billNo || '',
            ipNo: item.ipNo || '',
            patientName: item.patientName || '',
            billedDate: item.billedDate || '',
            roomCategory: item.roomCategory || '',
            customer: item.customer || '',
            serviceId: item.serviceId || '',
            serviceName: item.serviceName || '',
            billedRate: item.billedRate || 0.0,
            quantity: item.quantity || 1,
            expectedRate: res.expectedTariff,
            expectedDiscountedRate: res.expectedDiscountedRate,
            variance: res.variance,
            status: res.status,
            explanation: res.explanation,
            isIgnored: res.isIgnored,
            exceptionCode: res.exceptionCode,
            
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
});

ipcMain.handle('audit:saveAudit', async (event, results) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    if (!isGlobalAdmin(user)) {
        await database.switchTenantContext(user.unit);
    }
    return await auditEngine.saveAudit(results, user);
});

ipcMain.handle('audit:approveAudit', async (event, resultId) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    if (!isGlobalAdmin(user)) {
        await database.switchTenantContext(user.unit);
    }
    return await auditEngine.approveAudit(resultId, user);
});

ipcMain.handle('audit:reopenAudit', async (event, { resultId, reason }) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    if (!isGlobalAdmin(user)) {
        await database.switchTenantContext(user.unit);
    }
    return await auditEngine.reopenAudit(resultId, user, reason);
});

ipcMain.handle('audit:loadDashboard', async (event, { unit, durationDays }) => {
    const user = await authEngine.getCurrentUser();
    const finalUnit = (user && !isGlobalAdmin(user)) ? user.unit : (unit || 'excelcare');
    await database.switchTenantContext(finalUnit);
    return await auditEngine.loadDashboard(finalUnit, durationDays);
});

ipcMain.handle('audit:getAuditHistory', async (event, filter) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    const isGlobal = isGlobalAdmin(user);
    const finalUnit = isGlobal ? (filter.unit || 'excelcare') : user.unit;
    await database.switchTenantContext(finalUnit);
    
    const finalFilter = Object.assign({}, filter);
    if (!isGlobal) {
        finalFilter.unit = user.unit;
    }
    
    return await auditEngine.getAuditHistory(finalFilter);
});

ipcMain.handle('audit:getAuditLogs', async () => {
    const user = await authEngine.getCurrentUser();
    if (!user || !isGlobalAdmin(user)) {
        throw new Error('Access Denied: Only Global/Commercial Administrators can view audit logs.');
    }
    return await auditEngine.getAuditLogs();
});

ipcMain.handle('audit:deleteAudit', async (event, auditDate) => {
    const user = await authEngine.getCurrentUser();
    if (!user || !isGlobalAdmin(user)) {
        throw new Error('Access Denied: Only Global/Commercial Administrators can delete repository audits.');
    }
    return await auditEngine.deleteAuditRun(auditDate);
});

// C. Agreements API
ipcMain.handle('agreements:loadAgreements', async () => {
    const user = await authEngine.getCurrentUser();
    if (!user || !isGlobalAdmin(user)) {
        throw new Error('Access Denied: Only Global/Commercial Administrators can view or download the Agreement Repository.');
    }
    const unit = (user && user.unit !== 'all') ? user.unit : 'excelcare';
    await database.switchTenantContext(unit);
    return new Promise((resolve, reject) => {
        database.db.all(`SELECT * FROM tbl_agreements ORDER BY AgreementName ASC`, [], (err, rows) => {
            if (err) return reject(err);
            const mapped = rows.map(r => ({
                agreementName: r.AgreementName,
                customerType: r.CustomerType,
                tariffMapped: r.TariffMapped,
                discountMapped: r.DiscountMapped,
                status: r.Status,
                fromDate: r.FromDate,
                toDate: r.ToDate,
                discountAgreed: r.DiscountAgreed,
                locations: r.Locations,
                version: r.Version || 1,
                changedBy: r.ChangedBy,
                changedOn: r.ChangedOn,
                changeSummary: r.ChangeSummary
            }));
            resolve(mapped);
        });
    });
});

ipcMain.handle('database:switchTenantContext', async (event, unit) => {
    const user = await authEngine.getCurrentUser();
    if (user && isGlobalAdmin(user)) {
        return await database.switchTenantContext(unit);
    }
    throw new Error('Access Denied: Only Global Admin can switch database context.');
});

ipcMain.handle('agreements:saveAgreement', async (event, { ag, versionInfo }) => {
    const user = await authEngine.getCurrentUser();
    if (!user || !isGlobalAdmin(user)) {
        throw new Error('Access Denied: Only Global/Commercial Administrators can manage agreements.');
    }
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        database.db.get(`SELECT Version FROM tbl_agreements WHERE AgreementName = ?`, [ag.agreementName], (err, row) => {
            const nextVersion = row ? (row.Version + 1) : 1;
            database.db.run(`INSERT OR REPLACE INTO tbl_agreements 
                (AgreementName, CustomerType, TariffMapped, DiscountMapped, Status, FromDate, ToDate, DiscountAgreed, Locations, Version, ChangedBy, ChangedOn, ChangeSummary) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ag.agreementName,
                    ag.customerType,
                    ag.tariffMapped,
                    ag.discountMapped,
                    ag.status || 'Available/Valid',
                    ag.fromDate,
                    ag.toDate,
                    ag.discountAgreed,
                    ag.locations,
                    nextVersion,
                    user.username,
                    timestamp,
                    versionInfo.changeSummary || 'Agreement updated'
                ], (insErr) => {
                    if (insErr) return reject(insErr);
                    
                    // Log event
                    database.db.run(`INSERT INTO tbl_audit_logs (Timestamp, User, Role, Action, Module, RecordID, OldValue, NewValue, Remarks) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            timestamp,
                            user.username,
                            user.role,
                            row ? 'Edit' : 'Create',
                            'Agreements',
                            ag.agreementName,
                            row ? `Version ${row.Version}` : null,
                            `Version ${nextVersion}`,
                            versionInfo.changeSummary || 'Agreement saved'
                        ]);
                    resolve(true);
                });
        });
    });
});

ipcMain.handle('agreements:deleteAgreement', async (event, agName) => {
    const user = await authEngine.getCurrentUser();
    if (!user || !isGlobalAdmin(user)) {
        throw new Error('Access Denied: Only Global/Commercial Administrators can delete agreements.');
    }
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        database.db.run(`DELETE FROM tbl_agreements WHERE AgreementName = ?`, [agName], (err) => {
            if (err) return reject(err);
            
            // Log event
            database.db.run(`INSERT INTO tbl_audit_logs (Timestamp, User, Role, Action, Module, RecordID, Remarks) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [timestamp, user.username, user.role, 'Delete', 'Agreements', agName, `Deleted agreement ${agName}`]);
            resolve(true);
        });
    });
});

// D. Backup/Restore API
ipcMain.handle('backup:createBackup', async (event, filePath) => {
    return await backupEngine.createBackup(filePath);
});

ipcMain.handle('backup:restoreBackup', async (event, filePath) => {
    return await backupEngine.restoreBackup(filePath);
});
