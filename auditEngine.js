const { db } = require('./database');
const { enforcePermission } = require('./authEngine');

// 1. Room category helpers
function cleanRoomCategory(cat) {
    if (!cat) return "STANDARD WARD";
    cat = cat.toUpperCase().trim();
    if (cat.includes("SUITE") || cat.includes("PLATINUM SUITE")) return "SUITE";
    if (cat.includes("4 SHARING") || cat.includes("4-SHARING") || cat.includes("GENERAL WARD") || cat.includes("WARD") || cat.includes("STANDARD WARD")) return "STANDARD WARD";
    if (cat.includes("2 SHARING") || cat.includes("2-SHARING") || cat.includes("SEMI WARD") || cat.includes("SEMI-PRIVATE") || cat.includes("SEMI PRIVATE") || cat.includes("SEMI PRIVATE AC") || cat.includes("SEMI PRIVATE-AC")) return "SEMI PRIVATE";
    if (cat.includes("SINGLE PRIVATE") || cat.includes("SINGLE ROOM") || cat.includes("PRIVATE CABIN") || cat.includes("PRIVATE ROOM") || cat.includes("CABIN") || cat.includes("PRIVATE")) return "PRIVATE";
    if (cat.includes("DELUXE CABIN") || cat.includes("DELUXE ROOM") || cat.includes("DELUXE")) return "DELUXE";
    if (cat.includes("ICU") || cat.includes("CCU") || cat.includes("HDU") || cat.includes("ITU") || cat.includes("NICU") || cat.includes("PICU") || cat.includes("CRITICAL CARE")) return "ICU";
    if (cat.includes("DAY CARE") || cat.includes("DAYCARE")) return "DAYCARE";
    if (cat.includes("TRIAGE")) return "TRIAGE";
    return "STANDARD WARD";
}

function mapIOCLRoomCategory(roomCat, cleanedRoom) {
    let u = roomCat ? roomCat.toUpperCase().trim() : "";
    if (!u && cleanedRoom) {
        if (cleanedRoom === "STANDARD WARD") return "GENERAL";
        if (cleanedRoom === "SEMI PRIVATE") return "SEMI CABIN/ NON AC CABIN";
        return "AC CABIN TO SUPER DELUXE AND CRITICAL CARE";
    }
    if (u.includes("GENERAL WARD") || u === "GENERAL" || u === "GENERAL WARD" || u === "AC GENERAL WARD" || u.includes("GENERAL")) {
        return "GENERAL";
    }
    if (u.includes("SEMI CABIN") || u.includes("SEMI-PRIVATE") || u.includes("SEMI PRIVATE") || u.includes("SEMI PRIVATE WARD") || u.includes("SEMI PRIVATE-AC") || u.includes("SEMI PRIVATE AC")) {
        return "SEMI CABIN/ NON AC CABIN";
    }
    return "AC CABIN TO SUPER DELUXE AND CRITICAL CARE";
}

function toSimpleRoom(room) {
    if (!room) return "GEN";
    const u = room.toUpperCase();
    if (u.includes("SUITE")) return "SUITE";
    if (u.includes("DELUXE")) return "DELUXE";
    if (u.includes("PRIVATE")) return "PVT";
    if (u.includes("SEMI")) return "SEMI";
    if (u.includes("ICU") || u.includes("CCU") || u.includes("HDU") || u.includes("ITU") || u.includes("NICU") || u.includes("PICU") || u.includes("CRITICAL")) return "ICU";
    if (u.includes("DAY CARE") || u.includes("DAYCARE")) return "DAYCARE";
    if (u.includes("TRIAGE")) return "TRIAGE";
    return "GEN";
}

// 2. OT Slab lists and visit charges helpers
const VISIT_CHARGES = {
    "STANDARD WARD": 600, "SEMI PRIVATE": 700, "PRIVATE": 800, "DELUXE": 1000, "SUITE": 1200, "ICU": 1000,
    "GEN": 600, "SEMI": 700, "PVT": 800, "ICU_SHORT": 1000, "DAYCARE": 600, "TRIAGE": 600
};

const OT_SLABS_KOLKATA = [
    { name: "OT SLAB 1", minDuration: 0, maxDuration: 30, rates: { "STANDARD WARD": 3500, "SEMI-PRIVATE": 4000, "PRIVATE": 4500, "DELUXE": 5500, "SUITE": 6500, "ICU": 4500 } },
    { name: "OT SLAB 2", minDuration: 31, maxDuration: 60, rates: { "STANDARD WARD": 6400, "SEMI-PRIVATE": 7300, "PRIVATE": 8200, "DELUXE": 10000, "SUITE": 12000, "ICU": 8200 } },
    { name: "OT SLAB 3", minDuration: 61, maxDuration: 90, rates: { "STANDARD WARD": 8000, "SEMI-PRIVATE": 9200, "PRIVATE": 10400, "DELUXE": 12500, "SUITE": 15000, "ICU": 10400 } },
    { name: "OT SLAB 4", minDuration: 91, maxDuration: 120, rates: { "STANDARD WARD": 9600, "SEMI-PRIVATE": 11000, "PRIVATE": 12400, "DELUXE": 15000, "SUITE": 18000, "ICU": 12400 } },
    { name: "OT SLAB 5", minDuration: 121, maxDuration: 150, rates: { "STANDARD WARD": 11200, "SEMI-PRIVATE": 12800, "PRIVATE": 14400, "DELUXE": 17500, "SUITE": 21000, "ICU": 14400 } },
    { name: "OT SLAB 6", minDuration: 151, maxDuration: 180, rates: { "STANDARD WARD": 12800, "SEMI-PRIVATE": 14600, "PRIVATE": 16400, "DELUXE": 20000, "SUITE": 24000, "ICU": 16400 } },
    { name: "OT SLAB 7", minDuration: 181, maxDuration: 210, rates: { "STANDARD WARD": 14400, "SEMI-PRIVATE": 16400, "PRIVATE": 18400, "DELUXE": 22500, "SUITE": 27000, "ICU": 18400 } },
    { name: "OT SLAB 8", minDuration: 211, maxDuration: 240, rates: { "STANDARD WARD": 16000, "SEMI-PRIVATE": 18200, "PRIVATE": 20400, "DELUXE": 25000, "SUITE": 30000, "ICU": 20400 } }
];

function parseExcelDate(val) {
    if (!val) return null;
    if (typeof val === 'number') {
        return new Date((val - 25569) * 86400 * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

// 3. Database loaders
function getSOCItem(socName, serviceId, serviceName) {
    return new Promise((resolve) => {
        let cleanId = '';
        if (serviceId) {
            cleanId = String(serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
        }

        db.get(`SELECT * FROM tbl_soc_master WHERE SOCName = ? AND (ServiceID = ? OR ServiceID = ?)`, [socName, cleanId, serviceId], (err, row) => {
            if (row) {
                return resolve({
                    item: {
                        id: row.ServiceID,
                        name: row.ServiceName,
                        type: row.ServiceType,
                        dept: row.Department,
                        rate: row.StandardRate,
                        rates: row.RatesJSON ? JSON.parse(row.RatesJSON) : null
                    },
                    explanation: "[SOC Match T1]"
                });
            }

            if (serviceName) {
                const cleanName = String(serviceName).toUpperCase().trim();
                db.get(`SELECT * FROM tbl_soc_master WHERE SOCName = ? AND (UPPER(TRIM(ServiceName)) = ? OR UPPER(TRIM(ServiceName)) = ?)`,
                    [socName, cleanName, cleanName], (err, rowByName) => {
                        if (rowByName) {
                            return resolve({
                                item: {
                                    id: rowByName.ServiceID,
                                    name: rowByName.ServiceName,
                                    type: rowByName.ServiceType,
                                    dept: rowByName.Department,
                                    rate: rowByName.StandardRate,
                                    rates: rowByName.RatesJSON ? JSON.parse(rowByName.RatesJSON) : null
                                },
                                explanation: "[SOC Match T2]"
                            });
                        }
                        resolve(null);
                    });
            } else {
                resolve(null);
            }
        });
    });
}

function getMasterTariffItem(serviceId, serviceName) {
    return new Promise((resolve) => {
        let cleanId = '';
        if (serviceId) {
            cleanId = String(serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
        }

        db.get(`SELECT * FROM tbl_tariff_master WHERE ServiceID = ? OR ServiceID = ?`, [cleanId, serviceId], (err, row) => {
            if (row) {
                return resolve({
                    id: row.ServiceID, name: row.ServiceName, rate: row.Rate
                });
            }

            if (serviceName) {
                const cleanName = String(serviceName).toUpperCase().trim();
                db.get(`SELECT * FROM tbl_tariff_master WHERE UPPER(TRIM(ServiceName)) = ?`, [cleanName], (err, rowByName) => {
                    if (rowByName) {
                        return resolve({
                            id: rowByName.ServiceID, name: rowByName.ServiceName, rate: rowByName.Rate
                        });
                    }
                    resolve(null);
                });
            } else {
                resolve(null);
            }
        });
    });
}

// 4. Proprietary Validation Pipeline
async function validateAuditItem(item, agreement, activeSOCName) {
    const res = {
        expectedTariff: null,
        expectedDiscountedRate: null,
        discountApplied: 0,
        status: "Matching",
        explanation: "",
        isIgnored: false,
        exceptionCode: null
    };

    const cleanRoom = cleanRoomCategory(item.roomCategory);
    const isDayCare = cleanRoom === "DAYCARE" || (item.dept || '').toLowerCase().includes("day care") || (item.rateType || '').toLowerCase().includes("day care") || (item.serviceName || '').toUpperCase().includes("DAY CARE") || (item.serviceName || '').toUpperCase().includes("DAYCARE");
    const isTriageItem = (item.serviceName || '').toUpperCase().includes("TRIAGE") || (item.dept || '').toLowerCase().includes("triage") || (item.rateType || '').toLowerCase().includes("triage");
    const isRoomRentService = item.serviceId === "2127" || (item.serviceName || '').toUpperCase().includes("ROOM RENT") || (item.serviceName || '').toUpperCase().includes("BED CHARGE") || (item.dept || '').toLowerCase().includes("room rent") || (item.dept || '').toLowerCase().includes("bed charge") || (item.dept || '').toLowerCase() === "room" || (item.serviceName || '').toUpperCase().includes("DELUXE CABIN") || (item.serviceName || '').toUpperCase().includes("PRIVATE CABIN") || (item.serviceName || '').toUpperCase().includes("SEMI CABIN") || isDayCare || isTriageItem;

    // A. Check Date Validity
    if (agreement && agreement.fromDate && agreement.toDate) {
        const parseAgDate = (dStr) => {
            const parts = dStr.split('-');
            if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
            return new Date(dStr);
        };
        const start = parseAgDate(agreement.fromDate);
        const end = parseAgDate(agreement.toDate);
        let checkDate = new Date();
        if (item.startDateVal) {
            const parsed = parseExcelDate(item.startDateVal);
            if (parsed) checkDate = parsed;
        }
        if (checkDate < start || checkDate > end) {
            res.exceptionCode = "EA";
            res.status = "Expired Agreement";
            res.explanation = `[EA] Billing date out of validity window (${agreement.fromDate} to ${agreement.toDate}).`;
        }
    }

    // B. Check Room Rent Rules
    let roomRentResolved = false;
    if (isRoomRentService && agreement && agreement.rooms) {
        // Parse custom rooms in agreement
        let roomsArr = [];
        try {
            roomsArr = typeof agreement.rooms === 'string' ? JSON.parse(agreement.rooms) : agreement.rooms;
        } catch(e) {}
        
        if (Array.isArray(roomsArr) && roomsArr.length > 0) {
            const rMatch = roomsArr.find(r => cleanRoomCategory(r.roomCategory) === cleanRoom);
            if (rMatch && rMatch.rate !== null && rMatch.rate !== undefined) {
                res.expectedTariff = Number(rMatch.rate);
                res.explanation = `Resolved room rent from Agreement room tariff: ₹${res.expectedTariff}.`;
                roomRentResolved = true;
                if (res.expectedTariff !== item.billedRate) {
                    res.exceptionCode = "IRT";
                }
            }
        }
    }

    // C. Check Department Discounts
    let deptDiscount = 0;
    if (agreement && agreement.departments) {
        let deptsArr = [];
        try {
            deptsArr = typeof agreement.departments === 'string' ? JSON.parse(agreement.departments) : agreement.departments;
        } catch(e) {}

        if (Array.isArray(deptsArr) && deptsArr.length > 0) {
            const deptMatch = deptsArr.find(d => String(d.department).toUpperCase() === String(item.dept).toUpperCase());
            if (deptMatch) {
                deptDiscount = Number(deptMatch.discount);
                res.discountApplied = deptDiscount;
                res.explanation += ` (Agreed Dept Discount: ${deptDiscount}% for ${item.dept})`;
            }
        }
    }

    // D. Check Service-Level overrides
    let serviceConditionApplied = false;
    if (agreement && agreement.services) {
        let servicesArr = [];
        try {
            servicesArr = typeof agreement.services === 'string' ? JSON.parse(agreement.services) : agreement.services;
        } catch(e) {}

        if (Array.isArray(servicesArr) && servicesArr.length > 0) {
            const sMatch = servicesArr.find(s => String(s.serviceId) === String(item.serviceId));
            if (sMatch) {
                if (sMatch.rate !== null && sMatch.rate !== undefined && sMatch.rate !== "") {
                    res.expectedTariff = Number(sMatch.rate);
                    res.explanation = `Service-level rate override applied: ₹${res.expectedTariff}.`;
                    serviceConditionApplied = true;
                }
                if (sMatch.discount !== null && sMatch.discount !== undefined && sMatch.discount !== "") {
                    res.discountApplied = Number(sMatch.discount);
                    res.explanation += ` (Service-level discount override: ${res.discountApplied}%)`;
                    serviceConditionApplied = true;
                }
            }
        }
    }

    // E. Packages check
    const isInsidePackage = item.rateType && item.rateType.toLowerCase().includes("inside package");
    if (isInsidePackage) {
        res.isIgnored = true;
        res.status = "Ignored (Inside Package)";
        res.explanation = "Billed item is inside a package; rates are bundled.";
        return res;
    }

    // F. Fetch rates from SOC
    if (res.expectedTariff === null && !roomRentResolved && !serviceConditionApplied) {
        const resolved = await getSOCItem(activeSOCName, item.serviceId, item.serviceName);
        if (resolved) {
            const match = resolved.item;
            res.explanation = `${resolved.explanation} ${res.explanation}`;
            
            let resolvedRate = null;
            if (activeSOCName === 'TARIFF_KOLKATA_SOC' || activeSOCName === 'TARIFF_KOLKATA_PKG') {
                let normRoom = cleanRoom;
                if (match.rates) {
                    if (match.rates[normRoom] !== undefined) {
                        resolvedRate = match.rates[normRoom];
                    } else {
                        let foundRate = null;
                        for (const key in match.rates) {
                            if (normRoom.includes(key) || key.includes(normRoom)) {
                                foundRate = match.rates[key];
                                break;
                            }
                        }
                        resolvedRate = (foundRate !== null) ? foundRate : (match.rates["STANDARD"] !== undefined ? match.rates["STANDARD"] : null);
                    }
                }
            } else {
                if (match.rates) {
                    const mappedCat = mapIOCLRoomCategory(item.roomCategory, cleanRoom);
                    resolvedRate = match.rates[mappedCat];
                    if (resolvedRate === undefined || resolvedRate === null) {
                        resolvedRate = match.rate;
                    } else {
                        res.explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                    }
                } else {
                    const isGipsa = agreement && agreement.tariffMapped ? agreement.tariffMapped.toUpperCase().includes("GIPSA") : false;
                    if (activeSOCName === 'TARIFF_DATA') {
                        const baseMatch = await getMasterTariffItem(item.serviceId, item.serviceName);
                        resolvedRate = baseMatch ? baseMatch.rate : match.rate;
                    } else {
                        resolvedRate = match.rate;
                    }
                }
            }
            res.expectedTariff = resolvedRate;
        } else {
            // Default fallback to base master
            const baseMatch = await getMasterTariffItem(item.serviceId, item.serviceName);
            if (baseMatch) {
                res.expectedTariff = baseMatch.rate;
                res.explanation = `[Base Master Fallback] ${res.explanation}`;
            }
        }
    }

    // G. Calculate expected discounted rates
    if (res.expectedTariff !== null) {
        if (res.discountApplied === 0 && agreement && agreement.discountAgreed) {
            const discNum = parseFloat(agreement.discountAgreed);
            if (!isNaN(discNum)) res.discountApplied = discNum;
        }
        res.expectedDiscountedRate = res.expectedTariff * (1 - res.discountApplied / 100);
    }

    // H. Variance calculation & exceptions classification
    if (res.expectedTariff !== null) {
        const diff = item.billedRate - res.expectedDiscountedRate;
        if (Math.abs(diff) > 1) {
            if (diff > 0) {
                res.status = "Overcharged";
                if (Math.abs(item.billedRate - res.expectedTariff) < 0.1 && res.discountApplied > 0) {
                    res.exceptionCode = "MAB";
                    res.status = "Missing Benefit";
                    res.explanation += ` [MAB] Agreed discount of ${res.discountApplied}% was not applied.`;
                } else {
                    res.exceptionCode = "OC";
                    res.status = "Overcharged";
                    res.explanation += ` [OC] Billed rate ₹${item.billedRate} exceeds agreed rate ₹${res.expectedDiscountedRate}.`;
                }
            } else {
                res.status = "Undercharged";
            }
        }
    } else {
        res.status = "Not Found in Master";
        res.explanation += " Service not found in agreement or active SOC.";
    }

    return res;
}

// 5. Saved audits APIs
function saveAudit(results, user) {
    enforcePermission('canSaveAudit');
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        // Step 1: Check for locked rows
        const checkSql = `SELECT IsLocked FROM tbl_audit_results WHERE FileName = ? AND RowIndex = ? AND Unit = ? AND IsLocked = 1 LIMIT 1`;
        
        const checks = results.map(r => {
            return new Promise((resCheck, rejCheck) => {
                db.get(checkSql, [r.fileName || '', r.rowIndex || 0, user.unit], (err, row) => {
                    if (err) rejCheck(err);
                    else if (row) rejCheck(new Error(`Cannot save: Audit record for file ${r.fileName} at row ${r.rowIndex} is approved and locked.`));
                    else resCheck();
                });
            });
        });

        Promise.all(checks)
            .then(() => {
                // Step 2: Run transaction sequentially using Promises
                return new Promise((resTx, rejTx) => {
                    db.run('BEGIN TRANSACTION', (err) => {
                        if (err) return rejTx(err);

                        // Helper to run all inserts sequentially
                        let insertChain = Promise.resolve();
                        const stmt = db.prepare(`INSERT OR REPLACE INTO tbl_audit_results 
                            (FileName, RowIndex, BillNo, IPNo, PatientName, BilledDate, RoomCategory, Customer, 
                             ServiceID, ServiceName, BilledRate, Quantity, ExpectedRate, Variance, Status, 
                             Explanation, UserRemarks, AuditedBy, AuditDate, Unit) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                        for (const r of results) {
                            insertChain = insertChain.then(() => {
                                return new Promise((resRun, rejRun) => {
                                    stmt.run([
                                        r.fileName || '',
                                        r.rowIndex || 0,
                                        r.billNo || '',
                                        r.ipNo || '',
                                        r.patientName || '',
                                        r.billedDate || '',
                                        r.roomCategory || '',
                                        r.customer || '',
                                        r.serviceId || '',
                                        r.serviceName || '',
                                        r.billedRate || 0.0,
                                        r.quantity || 1,
                                        r.expectedRate || 0.0,
                                        r.variance || 0.0,
                                        r.status || 'Matching',
                                        r.explanation || '',
                                        r.userRemarks || '',
                                        user.username,
                                        timestamp,
                                        user.unit
                                    ], (errRun) => {
                                        if (errRun) rejRun(errRun);
                                        else resRun();
                                    });
                                });
                            });
                        }

                        insertChain
                            .then(() => {
                                return new Promise((resFin, rejFin) => {
                                    stmt.finalize((errFin) => {
                                        if (errFin) rejFin(errFin);
                                        else resFin();
                                    });
                                });
                            })
                            .then(() => {
                                return new Promise((resLog, rejLog) => {
                                    db.run(`INSERT INTO tbl_audit_logs (Timestamp, User, Role, Action, Module, Remarks) 
                                        VALUES (?, ?, ?, ?, ?, ?)`, 
                                        [timestamp, user.username, user.role, 'Create', 'Revenue Audit', `Saved ${results.length} audit records`], (errLog) => {
                                            if (errLog) rejLog(errLog);
                                            else resLog();
                                        });
                                });
                            })
                            .then(() => {
                                db.run('COMMIT', (errCommit) => {
                                    if (errCommit) rejTx(errCommit);
                                    else resTx(true);
                                });
                            })
                            .catch((txErr) => {
                                // If any insert or finalize or log fails, attempt rollback
                                db.run('ROLLBACK', () => {
                                    rejTx(txErr);
                                });
                            });
                    });
                });
            })
            .then(resolve)
            .catch(reject);
    });
}

function approveAudit(resultId, user) {
    enforcePermission('canApproveAudit');
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            // 1. Update audit result
            new Promise((resUpdate, rejUpdate) => {
                db.run(`UPDATE tbl_audit_results SET IsLocked = 1 WHERE ResultID = ?`, [resultId], (errUpdate) => {
                    if (errUpdate) rejUpdate(errUpdate);
                    else resUpdate();
                });
            })
            // 2. Insert approval history
            .then(() => {
                return new Promise((resHistory, rejHistory) => {
                    db.run(`INSERT INTO tbl_approval_history (ResultID, Action, User, Timestamp) 
                        VALUES (?, 'Approve', ?, ?)`, [resultId, user.username, timestamp], (errHist) => {
                            if (errHist) rejHistory(errHist);
                            else resHistory();
                        });
                });
            })
            // 3. Insert audit log
            .then(() => {
                return new Promise((resLog, rejLog) => {
                    db.run(`INSERT INTO tbl_audit_logs (Timestamp, User, Role, Action, Module, RecordID, Remarks) 
                        VALUES (?, ?, ?, 'Approve', 'Revenue Audit', ?, ?)`, 
                        [timestamp, user.username, user.role, String(resultId), `Approved audit result #${resultId}`], (errLog) => {
                            if (errLog) rejLog(errLog);
                            else resLog();
                        });
                });
            })
            // 4. Commit transaction
            .then(() => {
                db.run('COMMIT', (errCommit) => {
                    if (errCommit) reject(errCommit);
                    else resolve(true);
                });
            })
            // Rollback on error
            .catch((txErr) => {
                db.run('ROLLBACK', () => {
                    reject(txErr);
                });
            });
        });
    });
}

function reopenAudit(resultId, user, reason) {
    enforcePermission('canReopenAudit');
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            // 1. Update audit result to unlocked
            new Promise((resUpdate, rejUpdate) => {
                db.run(`UPDATE tbl_audit_results SET IsLocked = 0 WHERE ResultID = ?`, [resultId], (errUpdate) => {
                    if (errUpdate) rejUpdate(errUpdate);
                    else resUpdate();
                });
            })
            // 2. Insert reopen history
            .then(() => {
                return new Promise((resHistory, rejHistory) => {
                    db.run(`INSERT INTO tbl_approval_history (ResultID, Action, User, Timestamp, Reason) 
                        VALUES (?, 'Reopen', ?, ?, ?)`, [resultId, user.username, timestamp, reason], (errHist) => {
                            if (errHist) rejHistory(errHist);
                            else resHistory();
                        });
                });
            })
            // 3. Insert audit log
            .then(() => {
                return new Promise((resLog, rejLog) => {
                    db.run(`INSERT INTO tbl_audit_logs (Timestamp, User, Role, Action, Module, RecordID, Remarks) 
                        VALUES (?, ?, ?, 'Reopen', 'Revenue Audit', ?, ?)`, 
                        [timestamp, user.username, user.role, String(resultId), `Reopened audit result #${resultId}. Reason: ${reason}`], (errLog) => {
                            if (errLog) rejLog(errLog);
                            else resLog();
                        });
                });
            })
            // 4. Commit transaction
            .then(() => {
                db.run('COMMIT', (errCommit) => {
                    if (errCommit) reject(errCommit);
                    else resolve(true);
                });
            })
            // Rollback on error
            .catch((txErr) => {
                db.run('ROLLBACK', () => {
                    reject(txErr);
                });
            });
        });
    });
}

function loadDashboard(unit, durationDays) {
    return new Promise((resolve, reject) => {
        const days = durationDays || 30;
        const unitFilter = unit && unit !== 'all' ? `AND Unit = '${unit}'` : '';
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        const dateStr = limitDate.toISOString();

        db.all(`SELECT Status, COUNT(*) as count, SUM(Variance) as total_variance 
                FROM tbl_audit_results 
                WHERE AuditDate >= ? ${unitFilter} 
                GROUP BY Status`, [dateStr], (err, rows) => {
            if (err) return reject(err);
            
            db.all(`SELECT AuditDate, SUM(Variance) as leakage 
                    FROM tbl_audit_results 
                    WHERE AuditDate >= ? AND Status = 'Overcharged' ${unitFilter}
                    GROUP BY strftime('%Y-%m-%d', AuditDate)
                    ORDER BY AuditDate ASC`, [dateStr], (err, trend) => {
                if (err) return reject(err);
                resolve({ summary: rows, trend: trend });
            });
        });
    });
}

function getAuditHistory(filter) {
    return new Promise((resolve, reject) => {
        const unit = filter.unit && filter.unit !== 'all' ? `AND Unit = '${filter.unit}'` : '';
        db.all(`SELECT * FROM tbl_audit_results WHERE 1=1 ${unit} ORDER BY ResultID DESC`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getAuditLogs() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM tbl_audit_logs ORDER BY LogID DESC LIMIT 200`, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function deleteAuditRun(auditDate) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM tbl_audit_results WHERE AuditDate = ?`, [auditDate], (err) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

module.exports = {
    validateAuditItem,
    saveAudit,
    approveAudit,
    reopenAudit,
    loadDashboard,
    getAuditHistory,
    getAuditLogs,
    deleteAuditRun
};

