const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { db } = require('./database');
const { enforcePermission } = require('./authEngine');

function createBackup(destFilePath) {
    enforcePermission('canBackupRestore');
    return new Promise((resolve, reject) => {
        // Use SQLite's online vacuum command to safely copy database file without locking issues
        const tempDbPath = path.join(__dirname, 'temp_backup.db');
        if (fs.existsSync(tempDbPath)) {
            fs.unlinkSync(tempDbPath);
        }

        db.run(`VACUUM INTO ?`, [tempDbPath], (err) => {
            if (err) return reject(err);

            try {
                // Compress database copy
                const gzip = zlib.createGzip();
                const source = fs.createReadStream(tempDbPath);
                const destination = fs.createWriteStream(destFilePath);

                source.pipe(gzip).pipe(destination).on('finish', () => {
                    // Cleanup temp db
                    fs.unlinkSync(tempDbPath);
                    resolve(true);
                }).on('error', (zipErr) => {
                    reject(zipErr);
                });
            } catch (fsErr) {
                reject(fsErr);
            }
        });
    });
}

function restoreBackup(srcFilePath) {
    enforcePermission('canBackupRestore');
    return new Promise((resolve, reject) => {
        try {
            const tempDbPath = path.join(__dirname, 'temp_restore.db');
            const gunzip = zlib.createGunzip();
            const source = fs.createReadStream(srcFilePath);
            const destination = fs.createWriteStream(tempDbPath);

            source.pipe(gunzip).pipe(destination).on('finish', () => {
                // Close current database connection before overwriting
                db.close((closeErr) => {
                    if (closeErr) return reject(closeErr);

                    try {
                        const originalDbPath = path.join(__dirname, 'revenue_audit.db');
                        fs.copyFileSync(tempDbPath, originalDbPath);
                        fs.unlinkSync(tempDbPath);

                        // Re-open database
                        const sqlite3 = require('sqlite3').verbose();
                        const { db: newDb } = require('./database');
                        // Replace the database reference dynamically
                        global.db = new sqlite3.Database(originalDbPath, (openErr) => {
                            if (openErr) return reject(openErr);
                            resolve(true);
                        });
                    } catch (copyErr) {
                        reject(copyErr);
                    }
                });
            }).on('error', (unzipErr) => {
                reject(unzipErr);
            });
        } catch (fsErr) {
            reject(fsErr);
        }
    });
}

module.exports = {
    createBackup,
    restoreBackup
};
