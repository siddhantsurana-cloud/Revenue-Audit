const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    auth: {
        login: (username, password, unit, role) => ipcRenderer.invoke('auth:login', { username, password, unit, role }),
        logout: () => ipcRenderer.invoke('auth:logout'),
        getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
        loadUsers: () => ipcRenderer.invoke('auth:loadUsers'),
        saveUser: (user) => ipcRenderer.invoke('auth:saveUser', user),
        deleteUser: (userId) => ipcRenderer.invoke('auth:deleteUser', userId)
    },
    audit: {
        runValidation: (item, agreement, activeSOCName) => ipcRenderer.invoke('audit:runValidation', { item, agreement, activeSOCName }),
        runRevenueCheck: (rows, agreement, activeSOCName) => ipcRenderer.invoke('audit:runRevenueCheck', { rows, agreement, activeSOCName }),
        saveAudit: (results) => ipcRenderer.invoke('audit:saveAudit', results),
        approveAudit: (resultId) => ipcRenderer.invoke('audit:approveAudit', resultId),
        reopenAudit: (resultId, reason) => ipcRenderer.invoke('audit:reopenAudit', { resultId, reason }),
        loadDashboard: (unit, durationDays) => ipcRenderer.invoke('audit:loadDashboard', { unit, durationDays }),
        getAuditHistory: (filter) => ipcRenderer.invoke('audit:getAuditHistory', filter),
        getAuditLogs: () => ipcRenderer.invoke('audit:getAuditLogs'),
        deleteAudit: (auditDate) => ipcRenderer.invoke('audit:deleteAudit', auditDate)
    },
    agreements: {
        loadAgreements: () => ipcRenderer.invoke('agreements:loadAgreements'),
        saveAgreement: (ag, versionInfo) => ipcRenderer.invoke('agreements:saveAgreement', { ag, versionInfo }),
        deleteAgreement: (agName) => ipcRenderer.invoke('agreements:deleteAgreement', agName)
    },
    backup: {
        createBackup: (filePath) => ipcRenderer.invoke('backup:createBackup', filePath),
        restoreBackup: (filePath) => ipcRenderer.invoke('backup:restoreBackup', filePath)
    }
});
