const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const database = require('./database');
const authEngine = require('./authEngine');
const auditEngine = require('./auditEngine');
const backupEngine = require('./backupEngine');

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
    const res = await auditEngine.validateAuditItem(item, agreement, activeSOCName);
    return {
        expectedRate: res.expectedTariff,
        expectedDiscountedRate: res.expectedDiscountedRate,
        variance: res.expectedDiscountedRate !== null ? (item.billedRate - res.expectedDiscountedRate) : 0,
        status: res.status,
        explanation: res.explanation,
        isIgnored: res.isIgnored,
        exceptionCode: res.exceptionCode
    };
});

ipcMain.handle('audit:runRevenueCheck', async (event, { rows, agreement, activeSOCName }) => {
    const results = [];
    for (const item of rows) {
        const res = await auditEngine.validateAuditItem(item, agreement, activeSOCName);
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
            variance: res.expectedDiscountedRate !== null ? (item.billedRate - res.expectedDiscountedRate) : 0,
            status: res.status,
            explanation: res.explanation,
            isIgnored: res.isIgnored,
            exceptionCode: res.exceptionCode
        });
    }
    return results;
});

ipcMain.handle('audit:saveAudit', async (event, results) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    return await auditEngine.saveAudit(results, user);
});

ipcMain.handle('audit:approveAudit', async (event, resultId) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    return await auditEngine.approveAudit(resultId, user);
});

ipcMain.handle('audit:reopenAudit', async (event, { resultId, reason }) => {
    const user = await authEngine.getCurrentUser();
    if (!user) throw new Error('Session Expired: Please log in again.');
    return await auditEngine.reopenAudit(resultId, user, reason);
});

ipcMain.handle('audit:loadDashboard', async (event, { unit, durationDays }) => {
    const user = await authEngine.getCurrentUser();
    const finalUnit = (user && user.role !== 'Administrator') ? user.unit : unit;
    return await auditEngine.loadDashboard(finalUnit, durationDays);
});

ipcMain.handle('audit:getAuditHistory', async (event, filter) => {
    const user = await authEngine.getCurrentUser();
    const finalFilter = Object.assign({}, filter);
    if (user && user.role !== 'Administrator') {
        finalFilter.unit = user.unit;
    }
    return await auditEngine.getAuditHistory(finalFilter);
});

ipcMain.handle('audit:getAuditLogs', async () => {
    const user = await authEngine.getCurrentUser();
    if (!user || user.role !== 'Administrator') {
        throw new Error('Access Denied: Only Administrators can view audit logs.');
    }
    return await auditEngine.getAuditLogs();
});

ipcMain.handle('audit:deleteAudit', async (event, auditDate) => {
    const user = await authEngine.getCurrentUser();
    if (!user || user.role !== 'Administrator') {
        throw new Error('Access Denied: Only Administrators can delete repository audits.');
    }
    return await auditEngine.deleteAuditRun(auditDate);
});


// C. Agreements API
ipcMain.handle('agreements:loadAgreements', async () => {
    return new Promise((resolve, reject) => {
        database.db.all(`SELECT * FROM tbl_agreements ORDER BY AgreementName ASC`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
});

ipcMain.handle('agreements:saveAgreement', async (event, { ag, versionInfo }) => {
    const user = await authEngine.getCurrentUser();
    if (!user || user.role !== 'Administrator') {
        throw new Error('Access Denied: Only Administrators can manage agreements.');
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
    if (!user || user.role !== 'Administrator') {
        throw new Error('Access Denied: Only Administrators can delete agreements.');
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
