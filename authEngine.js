const bcrypt = require('bcryptjs');
const { db } = require('./database');

// Active session storage in backend memory
let activeSession = null;

const ROLE_PERMISSIONS = {
    'Viewer': {
        canViewDashboard: true,
        canViewReports: true,
        canSearch: true,
        canRunAudit: false,
        canSaveAudit: false,
        canApproveAudit: false,
        canReopenAudit: false,
        canManageUsers: false,
        canBackupRestore: false
    },
    'Auditor': {
        canViewDashboard: true,
        canViewReports: true,
        canSearch: true,
        canRunAudit: true,
        canSaveAudit: true,
        canApproveAudit: false,
        canReopenAudit: false,
        canManageUsers: false,
        canBackupRestore: false
    },
    'Approver': {
        canViewDashboard: true,
        canViewReports: true,
        canSearch: true,
        canRunAudit: true,
        canSaveAudit: true,
        canApproveAudit: true,
        canReopenAudit: true,
        canManageUsers: false,
        canBackupRestore: false
    },
    'Administrator': {
        canViewDashboard: true,
        canViewReports: true,
        canSearch: true,
        canRunAudit: true,
        canSaveAudit: true,
        canApproveAudit: true,
        canReopenAudit: true,
        canManageUsers: true,
        canBackupRestore: true
    }
};

function login(username, password, unit, role) {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM tbl_users WHERE LOWER(Username) = LOWER(?) AND Unit = ? AND Status = 'Active'`;
        db.get(query, [username.trim(), unit], (err, user) => {
            if (err) return reject(new Error('Database error during login.'));
            if (!user) return reject(new Error('Invalid username or unit.'));

            // Check role normalization
            const getNormalizedRole = (r) => (r === 'Approver' || r === 'Approval') ? 'Approver' : r;
            if (getNormalizedRole(user.Role) !== getNormalizedRole(role)) {
                return reject(new Error('Role mismatch.'));
            }

            // Verify bcrypt hash
            bcrypt.compare(password, user.PasswordHash, (bErr, match) => {
                if (bErr) return reject(new Error('Bcrypt comparison failed.'));
                if (!match) return reject(new Error('Invalid password.'));

                // Set session
                activeSession = {
                    userID: user.UserID,
                    username: user.Username,
                    role: user.Role,
                    unit: user.Unit,
                    permissions: ROLE_PERMISSIONS[user.Role] || ROLE_PERMISSIONS['Viewer']
                };

                // Update last login
                db.run(`UPDATE tbl_users SET LastLogin = ? WHERE UserID = ?`, [new Date().toISOString(), user.UserID]);

                resolve({
                    username: user.Username,
                    role: user.Role,
                    unit: user.Unit
                });
            });
        });
    });
}

function logout() {
    activeSession = null;
    return Promise.resolve(true);
}

function getCurrentUser() {
    return Promise.resolve(activeSession);
}

function hasPermission(permissionKey) {
    if (!activeSession) return false;
    return !!activeSession.permissions[permissionKey];
}

function enforcePermission(permissionKey) {
    if (!hasPermission(permissionKey)) {
        throw new Error(`Access Denied: You do not have permissions to perform this action.`);
    }
}

function loadUsers() {
    enforcePermission('canManageUsers');
    return new Promise((resolve, reject) => {
        db.all(`SELECT UserID, Username, Role, Unit, Status, CreatedOn, LastLogin FROM tbl_users`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function saveUser(user) {
    enforcePermission('canManageUsers');
    const { userID, username, password, role, unit, status } = user;
    const timestamp = new Date().toISOString();

    return new Promise((resolve, reject) => {
        if (userID && userID !== -1) {
            // Edit user
            if (password) {
                // Changing password
                const hash = bcrypt.hashSync(password, 10);
                db.run(`UPDATE tbl_users SET Username = ?, PasswordHash = ?, Role = ?, Unit = ?, Status = ? WHERE UserID = ?`,
                    [username, hash, role, unit, status || 'Active', userID], (err) => {
                        if (err) return reject(err);
                        resolve(true);
                    });
            } else {
                // Not changing password
                db.run(`UPDATE tbl_users SET Username = ?, Role = ?, Unit = ?, Status = ? WHERE UserID = ?`,
                    [username, role, unit, status || 'Active', userID], (err) => {
                        if (err) return reject(err);
                        resolve(true);
                    });
            }
        } else {
            // Create user
            if (!password) return reject(new Error('Password is required for new users.'));
            const hash = bcrypt.hashSync(password, 10);
            db.run(`INSERT INTO tbl_users (Username, PasswordHash, Role, Unit, CreatedOn) VALUES (?, ?, ?, ?, ?)`,
                [username, hash, role, unit, timestamp], (err) => {
                    if (err) return reject(err);
                    resolve(true);
                });
        }
    });
}

function deleteUser(userId) {
    enforcePermission('canManageUsers');
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM tbl_users WHERE UserID = ?`, [userId], (err) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

module.exports = {
    login,
    logout,
    getCurrentUser,
    hasPermission,
    enforcePermission,
    loadUsers,
    saveUser,
    deleteUser
};
