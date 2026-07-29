const { db, getCurrentTenant } = require('./database');
const { enforcePermission } = require('./authEngine');

const UI_TO_DB_SOC_MAP = {
    "excelcare_2025": "TARIFF_EXCELCARE_2025",
    "excelcare_cash_2025": "TARIFF_EXCELCARE_CASH_2025",
    "excelcare_cash_2627": "TARIFF_EXCELCARE_CASH_2627",
    "excelcare_gipsa_2026": "TARIFF_EXCELCARE_GIPSA_2026",
    "excelcare_2024": "TARIFF_EXCELCARE_2024",
    "2025": "TARIFF_2025",
    "2024": "TARIFF_2024",
    "soc_2023_v2": "TARIFF_2023_V2",
    "2023": "TARIFF_2023",
    "2021": "TARIFF_2021",
    "soc_2021_iocl": "TARIFF_2021_IOCL",
    "sockolkata": "TARIFF_KOLKATA_SOC",
    "pkgkolkata": "TARIFF_KOLKATA_PKG",
    "2026_cash_v2": "TARIFF_CASH_2026_V2",
    "2026_cash": "TARIFF_CASH_2026",
    "2025_cash": "TARIFF_CASH_2025",
    "excelcare_soc": "TARIFF_EXCELCARE_2025",
    "excelcare_soc_cash": "TARIFF_EXCELCARE_CASH_2025",
    "excelcare_soc_cash_2627": "TARIFF_EXCELCARE_CASH_2627",
    "hdfc_single": "TARIFF_HDFC_ERGO_2024",
    "hdfc_gen": "TARIFF_HDFC_ERGO_2024",
    "hdfc_twin": "TARIFF_HDFC_ERGO_2024",
    "hdfc_suite": "TARIFF_HDFC_ERGO_2024",
    "hdfc_daycare": "TARIFF_HDFC_ERGO_2024"
};

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
    if (typeof val === 'string') {
        const parts = val.split(/[-/]/);
        if (parts.length === 3) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
                if (parts[2].length === 4) {
                    // DD-MM-YYYY or DD/MM/YYYY
                    const d = new Date(p2, p1 - 1, p0);
                    if (!isNaN(d.getTime())) return d;
                } else if (parts[0].length === 4) {
                    // YYYY-MM-DD or YYYY/MM/DD
                    const d = new Date(p0, p1 - 1, p2);
                    if (!isNaN(d.getTime())) return d;
                }
            }
        }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

// 3. Database loaders and matchers
function normalize(s) {
    if (!s) return "";
    let cleaned = String(s).replace(/[-\s_(),\/+&.*]/g, '').toUpperCase().trim();
    cleaned = cleaned.replace(/X-?RAY/gi, 'XRAY');
    cleaned = cleaned.replace(/ULTRASOUND|ULTRASONOGRAPHY/gi, 'USG');
    return cleaned;
}

function matchServiceInSOCList(serviceId, serviceName, socList) {
    if (!serviceName) return null;
    const nameUpper = serviceName.trim().toUpperCase();

    // 1. Exact Code Match
    if (serviceId) {
        const cleanId = String(serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
        const matched = socList.find(x => {
            if (!x.id) return false;
            const xClean = String(x.id).trim().replace(/^[a-zA-Z]+-?/, '');
            return xClean === cleanId || String(x.id) === String(serviceId);
        });
        if (matched) return { item: matched, explanation: "[SOC Match T1]" };
    }

    if (!socList || !Array.isArray(socList)) return null;

    // 2. Exact Name Match
    let matched = socList.find(x => (x.name || '').trim().toUpperCase() === nameUpper);
    if (matched) return { item: matched, explanation: "[SOC Match Exact Name]" };

    // 3. Normalized Name Match
    const normBill = normalize(nameUpper);
    if (normBill.length > 2) {
        matched = socList.find(x => normalize(x.name || '') === normBill);
        if (matched) return { item: matched, explanation: "[SOC Match Norm Name]" };
    }

    // 4. Alias Match
    matched = socList.find(x => (x.aliasName || '').trim().toUpperCase() === nameUpper);
    if (matched) return { item: matched, explanation: "[SOC Match Alias]" };

    // 5. Normalized Alias Match
    if (normBill.length > 2) {
        matched = socList.find(x => normalize(x.aliasName || '') === normBill);
        if (matched) return { item: matched, explanation: "[SOC Match Norm Alias]" };
    }

    // 6. Fuzzy Match
    if (normBill.length > 3) {
        matched = socList.find(x => {
            const normSoc = normalize(x.name || '');
            const normAlias = normalize(x.aliasName || '');
            return (normSoc && (normBill.includes(normSoc) || normSoc.includes(normBill))) ||
                   (normAlias && (normBill.includes(normAlias) || normAlias.includes(normBill)));
        });
        if (matched) return { item: matched, explanation: "[SOC Match Fuzzy Name]" };
    }

    return null;
}

function getSOCItem(socName, serviceId, serviceName) {
    const dbSOCName = UI_TO_DB_SOC_MAP[socName] || socName;
    return new Promise((resolve) => {
        db.all(`SELECT * FROM tbl_soc_master WHERE SOCName = ?`, [dbSOCName], (err, rows) => {
            if (err || !rows) return resolve(null);
            
            const socList = rows.map(row => ({
                id: row.ServiceID,
                name: row.ServiceName,
                aliasName: row.AliasName || '',
                type: row.ServiceType,
                dept: row.Department,
                rate: row.StandardRate,
                rates: row.RatesJSON ? JSON.parse(row.RatesJSON) : null
            }));
            
            const match = matchServiceInSOCList(serviceId, serviceName, socList);
            resolve(match);
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

function getDiscountCategory(deptLower, nameUpper) {
    if (deptLower === 'consumables' || nameUpper.includes('CONSUMABLE') || deptLower.includes('material')) {
        return "Pharmacy";
    }
    if (deptLower.includes('laboratory') || deptLower.includes('pathology') || deptLower.includes('microbiology') || deptLower.includes('biochemistry') || deptLower.includes('bio-chemistry') || deptLower.includes('bio chemistry') || deptLower.includes('biochem') || deptLower.includes('hematology') || deptLower.includes('lab') || deptLower.includes('path') || deptLower.includes('investigation') || deptLower.includes('inv')) {
        return "Lab";
    }
    if (deptLower.includes('radiology') || deptLower.includes('imaging') || deptLower.includes('scan') || deptLower.includes('ultrasound') || deptLower.includes('usg') || deptLower.includes('mri') || deptLower.includes('ct ') || deptLower.includes('ct-') || deptLower.includes('x-ray') || deptLower.includes('xray')) {
        return "Radiology";
    }
    if (deptLower.includes('pharmacy') || nameUpper.includes('HSN:') || nameUpper.includes('PHARMACY') || deptLower.includes('drug')) {
        return "Pharmacy";
    }
    if (deptLower.includes('bed') || deptLower.includes('room') || deptLower.includes('ward') || deptLower.includes('nursing') || deptLower.includes('monitoring')) {
        return "Room";
    }
    if (deptLower.includes('visit') || nameUpper.includes('VISIT') || nameUpper.includes('CONSULTATION') || deptLower.includes('consultation')) {
        return "Consultations";
    }
    if (deptLower.includes('procedure') || deptLower.includes('ot') || deptLower.includes('surgery') || deptLower.includes('operation') || deptLower.includes('anesthesia')) {
        return "Procedures";
    }
    return "Others";
}

function parseAgreementDiscountForCategory(ag, deptLower, nameUpper) {
    if (!ag) return 0;
    const isKolkata = (ag.locations && ag.locations.includes("Kolkata")) || (ag.tariffMapped && ag.tariffMapped.toUpperCase().includes("KOLKATA"));
    if (isKolkata) {
        if (deptLower.includes("health check") || deptLower.includes("ahc") || nameUpper.includes("HEALTH CHECK") || nameUpper.includes("AHC") || deptLower.includes("package")) {
            return 20;
        }
        const serviceCat = getDiscountCategory(deptLower, nameUpper);
        if (
            serviceCat === "Room" || 
            serviceCat === "Procedures" || 
            serviceCat === "Lab" || 
            serviceCat === "Radiology" ||
            deptLower.includes("nursing") ||
            deptLower.includes("room rent") ||
            deptLower.includes("operation theatre") ||
            deptLower.includes("investigation")
        ) {
            return 12;
        }
        return 0;
    }

    if (!ag.discountAgreed) return 0;
    const discStr = ag.discountAgreed.toUpperCase();
    const serviceCat = getDiscountCategory(deptLower, nameUpper);
    
    if (serviceCat === "Room") {
        if (discStr.includes("BED") || discStr.includes("ROOM") || discStr.includes("NURS")) {
            const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:ALL\s*)?(?:BED|ROOM|NURS)/);
            if (match) return Number(match[1]);
        }
    }
    if (serviceCat === "Lab") {
        if (discStr.includes("LAB") || discStr.includes("INVESTIGATION")) {
            const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:INHOUSE\s*)?(?:LAB|INVESTIGATION)/);
            if (match) return Number(match[1]);
        }
    }
    if (serviceCat === "Radiology") {
        if (discStr.includes("RAD") || discStr.includes("INVESTIGATION") || discStr.includes("X-RAY")) {
            const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:INHOUSE\s*)?(?:RAD|INVESTIGATION|X-RAY)/);
            if (match) return Number(match[1]);
        }
    }
    if (serviceCat === "Procedures") {
        if (discStr.includes("PROC") || discStr.includes("OT") || discStr.includes("SURG") || discStr.includes("FEES")) {
            const match = discStr.match(/(\d+)\s*%\s*(?:ON\s*)?(?:PROC|OT|SURG|FEES)/);
            if (match) return Number(match[1]);
        }
    }
    
    const matchAll = discStr.match(/(?:DISCOUNT|LESS)\s*-?\s*(\d+)\s*%/);
    if (matchAll) return Number(matchAll[1]);
    return 0;
}

function findDateEffectiveAgreement(customerName, billedDate, targetUnit) {
    return new Promise((resolve) => {
        db.all(`SELECT * FROM tbl_agreements`, [], (err, rows) => {
            if (err || !rows) return resolve(null);
            
            // Map db columns to camelCase
            const agreements = rows.map(r => ({
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

            if (agreements.length === 0) return resolve(null);

            // Filter by unit/location first
            const unit = (targetUnit || 'excelcare').toLowerCase();
            const getAgreementScope = (ag) => {
                const tariffUpper = (ag.tariffMapped || '').toUpperCase();
                const nameUpper = (ag.agreementName || '').toUpperCase();
                if ((ag.locations && ag.locations.includes("Kolkata")) || tariffUpper.includes("KOLKATA")) {
                    return "kolkata";
                }
                if ((ag.locations && ag.locations.includes("Excelcare")) || tariffUpper.includes("EXCELCARE")) {
                    return "excelcare";
                }
                if (
                    nameUpper.includes("GIPSA") || 
                    nameUpper.includes("SBI GENERAL") || 
                    nameUpper.includes("TATA AIG") || 
                    nameUpper.includes("VIDAL") || 
                    tariffUpper.includes("GIPSA") || 
                    tariffUpper.includes("INSURANCE")
                ) {
                    return "centralised";
                }
                return "international";
            };

            const filteredAgreements = agreements.filter(ag => {
                const scope = getAgreementScope(ag);
                if (unit === 'kolkata') {
                    return scope === 'kolkata';
                } else if (unit === 'excelcare') {
                    return scope === 'excelcare';
                } else if (unit === 'international') {
                    return scope === 'international' || scope === 'centralised';
                }
                return true;
            });

            // Clean and split customer words
            let cleanCustomer = customerName.toUpperCase().replace(/[.,()\-]/g, ' ');
            cleanCustomer = cleanCustomer.replace(/\bALLIANCE\b/g, 'ALLIANZ');
            if (cleanCustomer.includes("INDIAN OIL") || cleanCustomer.includes("INDIAN OIL CORPORATION")) {
                cleanCustomer += " IOCL";
            }

            const stopwords = [
                "LTD", "PVT", "LIMITED", "PRIVATE", "AGREEMENT", "COMPANY", "INSURANCE", 
                "GENERAL", "HEALTH", "TPA", "SERVICES", "INDIA", "CORP", "CORPORATION", 
                "OF", "AND", "THE", "FOR", "IN", "CO", "ASSOCIATES", "PLANTATIONS", 
                "NATIONAL", "STATE", "CENTRAL", "MUTUAL", "TRUST", "GOVT", "GOVERNMENT", 
                "GROUP", "SYSTEMS", "ENTERPRISES", "PARTNERS", "AHC", "BENEFICIARY", "CARD"
            ];

            const customerWords = cleanCustomer.split(/\s+/).map(w => w.trim()).filter(w => {
                return w.length > 2 && !stopwords.includes(w);
            });

            let matchedAgreements = [];

            // First try exact matches or word-scoring matches
            if (customerWords.length === 0) {
                const custUpper = customerName.toUpperCase().trim();
                matchedAgreements = filteredAgreements.filter(ag => custUpper === ag.agreementName.toUpperCase().trim());
            } else {
                // Try exact name match
                const exactMatches = filteredAgreements.filter(ag => ag.agreementName.toUpperCase().trim() === customerName.toUpperCase().trim());
                if (exactMatches.length > 0) {
                    matchedAgreements = exactMatches;
                } else {
                    // Word matching score
                    let bestAgs = [];
                    let maxScore = 0;
                    let bestAgLengthRatio = 0;

                    for (const ag of filteredAgreements) {
                        const agName = ag.agreementName.toUpperCase();
                        let cleanAgName = agName.replace(/[.,()\-]/g, ' ');
                        cleanAgName = cleanAgName.replace(/\bALLIANCE\b/g, 'ALLIANZ');

                        const agWords = cleanAgName.split(/\s+/).map(w => w.trim()).filter(w => {
                            return w.length > 2 && !stopwords.includes(w);
                        });

                        if (agWords.length === 0) continue;

                        let matches = 0;
                        for (const w of agWords) {
                            if (customerWords.includes(w)) {
                                matches++;
                            }
                        }

                        if (matches > 0) {
                            const score = matches;
                            const ratio = matches / agWords.length;
                            if (score > maxScore) {
                                maxScore = score;
                                bestAgs = [ag];
                                bestAgLengthRatio = ratio;
                            } else if (score === maxScore) {
                                if (ratio > bestAgLengthRatio) {
                                    bestAgs = [ag];
                                    bestAgLengthRatio = ratio;
                                } else if (ratio === bestAgLengthRatio) {
                                    bestAgs.push(ag);
                                }
                            }
                        }
                    }
                    matchedAgreements = bestAgs;
                }
            }

            if (matchedAgreements.length === 0) return resolve(null);

            // Now, among matched agreements, filter for date-effective version.
            let checkDate = parseExcelDate(billedDate);
            if (!checkDate) {
                checkDate = new Date(billedDate);
            }
            if (isNaN(checkDate.getTime())) {
                checkDate = new Date();
            }

            const parseAgDate = (dStr) => {
                if (!dStr) return new Date();
                const parts = dStr.split('-');
                if (parts.length === 3) {
                    if (parts[2].length === 4) {
                        return new Date(parts[2], parts[1] - 1, parts[0]);
                    } else if (parts[0].length === 4) {
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                    }
                }
                return new Date(dStr);
            };

            const dateEffectiveAgs = matchedAgreements.filter(ag => {
                const start = parseAgDate(ag.fromDate);
                const end = parseAgDate(ag.toDate);
                return checkDate >= start && checkDate <= end;
            });

            if (dateEffectiveAgs.length > 0) {
                dateEffectiveAgs.sort((a, b) => b.version - a.version);
                return resolve(dateEffectiveAgs[0]);
            }

            matchedAgreements.sort((a, b) => b.version - a.version);
            return resolve(matchedAgreements[0]);
        });
    });
}

// 4. Proprietary Validation Pipeline (Dynamic Enterprise Rate Decision Engine)
async function validateAuditItem(item, agreement, activeSOCName, cache = null) {
    const tenant = getCurrentTenant();
    const trace = [];
    trace.push(`Active Hospital Unit context: ${tenant.toUpperCase()}`);

    if (!agreement && item.customer) {
        agreement = await findDateEffectiveAgreement(item.customer, item.billedDate || item.startDateVal, tenant);
    }

    const res = {
        expectedTariff: null,
        expectedDiscountedRate: null,
        discountApplied: 0,
        status: "Matching",
        explanation: "",
        isIgnored: false,
        exceptionCode: null,
        // Dynamic Enterprise Rate Decision Engine extensions
        applicableTariff: null,
        applicableSOC: null,
        expectedAmount: null,
        variance: 0,
        recoveryAmount: 0,
        agreementReference: "Standard Public Tariff",
        calculationTrace: trace,
        aiExplanation: "",
        disallowanceInfo: null
    };

    if (agreement) {
        trace.push(`Resolved Active Agreement: "${agreement.agreementName}" (Version: ${agreement.version || 1}, Range: ${agreement.fromDate} to ${agreement.toDate})`);
        res.agreementReference = `${agreement.agreementName} (v${agreement.version || 1})`;
    } else {
        trace.push("No active corporate/TPA agreement matched. Falling back to base master tariff.");
    }

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
        const rawDate = item.billedDate || item.startDateVal;
        if (rawDate) {
            const parsed = parseExcelDate(rawDate);
            if (parsed) checkDate = parsed;
        }
        trace.push(`Evaluating billing date validity for date: ${rawDate || 'Current'}`);
        if (checkDate < start || checkDate > end) {
            res.exceptionCode = "EA";
            res.status = "Expired Agreement";
            res.explanation = `[EA] Billing date out of validity window (${agreement.fromDate} to ${agreement.toDate}).`;
            trace.push(`WARNING: Billing date ${rawDate} is outside agreement date boundaries.`);
        } else {
            trace.push(`Date validation successful: ${rawDate} falls within agreement window.`);
        }
    }

    // B. Check Room Rent Rules
    let roomRentResolved = false;
    if (isRoomRentService && agreement && agreement.rooms) {
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
                res.applicableSOC = "Agreement Room Tariff Schedule";
                trace.push(`Room Rent Resolved from agreement rooms list for category "${cleanRoom}": Base Rate = ₹${res.expectedTariff}`);
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
                trace.push(`Department discount matrix matched: ${deptDiscount}% discount registered for department "${item.dept}"`);
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
                    res.applicableSOC = "Agreement Service Rate Overrides";
                    trace.push(`Service-level rate override matched for Code ${item.serviceId}: Rate = ₹${res.expectedTariff}`);
                }
                if (sMatch.discount !== null && sMatch.discount !== undefined && sMatch.discount !== "") {
                    res.discountApplied = Number(sMatch.discount);
                    res.explanation += ` (Service-level discount override: ${res.discountApplied}%)`;
                    serviceConditionApplied = true;
                    trace.push(`Service-level discount override matched for Code ${item.serviceId}: Discount = ${res.discountApplied}%`);
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
        trace.push("Package check: Item is flagged as 'inside package'. Billing is bundled under global package code. Verification ignored.");
        res.expectedTariff = 0;
        res.expectedDiscountedRate = 0;
        res.applicableTariff = 0;
        res.expectedAmount = 0;
        res.aiExplanation = `Audit Ignored: Billed item "${item.serviceName}" is inside package; rates are bundled.`;
        return res;
    }

    // F. Fetch rates from SOC / Masters
    if (res.expectedTariff === null && !roomRentResolved && !serviceConditionApplied) {
        let resolved = null;
        if (cache) {
            let cleanId = '';
            if (item.serviceId) {
                cleanId = String(item.serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
            }
            let cachedItem = cache.socById.get(cleanId) || cache.socById.get(item.serviceId);
            if (cachedItem) {
                resolved = { item: cachedItem, explanation: "[SOC Match]" };
            } else {
                resolved = matchServiceInSOCList(item.serviceId, item.serviceName, cache.socList);
            }
        } else {
            resolved = await getSOCItem(activeSOCName, item.serviceId, item.serviceName);
        }

        if (resolved) {
            const match = resolved.item;
            res.explanation = `${resolved.explanation} ${res.explanation}`;
            res.applicableSOC = activeSOCName || "Standard SOC Catalogue";
            
            let resolvedRate = null;
            if (activeSOCName === 'TARIFF_KOLKATA_SOC' || activeSOCName === 'TARIFF_KOLKATA_PKG') {
                let normRoom = cleanRoom;
                if (match.rates) {
                    if (match.rates[normRoom] !== undefined) {
                        resolvedRate = match.rates[normRoom];
                        trace.push(`Resolved Kolkata room-specific rate from SOC for category "${normRoom}": ₹${resolvedRate}`);
                    } else {
                        let foundRate = null;
                        for (const key in match.rates) {
                            if (normRoom.includes(key) || key.includes(normRoom)) {
                                foundRate = match.rates[key];
                                break;
                            }
                        }
                        resolvedRate = (foundRate !== null) ? foundRate : (match.rates["STANDARD"] !== undefined ? match.rates["STANDARD"] : null);
                        trace.push(`Resolved Kolkata room rate (Standard Fallback): ₹${resolvedRate}`);
                    }
                }
            } else {
                if (match.rates) {
                    const mappedCat = mapIOCLRoomCategory(item.roomCategory, cleanRoom);
                    resolvedRate = match.rates[mappedCat];
                    if (resolvedRate === undefined || resolvedRate === null) {
                        resolvedRate = match.rate;
                        trace.push(`Resolved general SOC rate: ₹${resolvedRate}`);
                    } else {
                        res.explanation += ` Resolved IOCL room-specific rate (${mappedCat}).`;
                        trace.push(`Resolved room-specific rate from SOC for category "${mappedCat}": ₹${resolvedRate}`);
                    }
                } else {
                    const isGipsa = agreement && agreement.tariffMapped ? agreement.tariffMapped.toUpperCase().includes("GIPSA") : false;
                    if (activeSOCName === 'TARIFF_DATA') {
                        let baseMatch = null;
                        if (cache) {
                            let cleanId = '';
                            if (item.serviceId) {
                                cleanId = String(item.serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
                            }
                            baseMatch = cache.tariffById.get(cleanId) || cache.tariffById.get(item.serviceId);
                            if (!baseMatch && item.serviceName) {
                                const cleanName = String(item.serviceName).toUpperCase().trim();
                                baseMatch = cache.tariffByName.get(cleanName);
                            }
                        } else {
                            baseMatch = await getMasterTariffItem(item.serviceId, item.serviceName);
                        }
                        resolvedRate = baseMatch ? baseMatch.rate : match.rate;
                        trace.push(`Resolved base master tariff rate for Code ${item.serviceId}: ₹${resolvedRate}`);
                    } else {
                        resolvedRate = match.rate;
                        trace.push(`Resolved standard rate from active SOC "${activeSOCName}": ₹${resolvedRate}`);
                    }
                }
            }
            res.expectedTariff = resolvedRate;
        } else {
            // Default fallback to base master
            let baseMatch = null;
            if (cache) {
                let cleanId = '';
                if (item.serviceId) {
                    cleanId = String(item.serviceId).trim().replace(/^[a-zA-Z]+-?/, '');
                }
                baseMatch = cache.tariffById.get(cleanId) || cache.tariffById.get(item.serviceId);
                if (!baseMatch && item.serviceName) {
                    const cleanName = String(item.serviceName).toUpperCase().trim();
                    baseMatch = cache.tariffByName.get(cleanName);
                }
            } else {
                baseMatch = await getMasterTariffItem(item.serviceId, item.serviceName);
            }
            if (baseMatch) {
                res.expectedTariff = baseMatch.rate;
                res.applicableSOC = "Master Tariff Registry";
                res.explanation = `[Base Master Fallback] ${res.explanation}`;
                trace.push(`Fallback: Resolved rate from base Master Tariff registry: ₹${res.expectedTariff}`);
            } else {
                trace.push(`Audit failure: Service ID "${item.serviceId}" not found in agreement, SOC, or master registry.`);
            }
        }
    }

    // G. Calculate expected discounted rates
    if (res.expectedTariff !== null) {
        res.applicableTariff = res.expectedTariff;
        if (res.discountApplied === 0 && agreement) {
            res.discountApplied = parseAgreementDiscountForCategory(agreement, (item.dept || '').toLowerCase(), (item.serviceName || '').toUpperCase());
            if (res.discountApplied > 0) {
                trace.push(`Category discount rule triggered: ${res.discountApplied}% discount mapped.`);
            }
        }
        res.expectedDiscountedRate = res.expectedTariff * (1 - res.discountApplied / 100);
        
        const qty = item.quantity || 1;
        res.expectedAmount = res.expectedDiscountedRate * qty;
        trace.push(`Calculation check: Base Rate ₹${res.expectedTariff} | Discount Applied ${res.discountApplied}% | Expected Net Rate ₹${res.expectedDiscountedRate} | Quantity ${qty}`);
    }

    // H. Variance calculation & recovery recommendation
    if (res.expectedTariff !== null) {
        const qty = item.quantity || 1;
        const billedAmt = (item.billedRate || 0) * qty;
        const diff = item.billedRate - res.expectedDiscountedRate;
        res.variance = diff * qty;
        
        if (Math.abs(diff) > 1) {
            if (diff > 0) {
                res.recoveryAmount = res.variance;
                if (Math.abs(item.billedRate - res.expectedTariff) < 0.1 && res.discountApplied > 0) {
                    res.exceptionCode = "MAB";
                    res.status = "Missing Benefit";
                    res.explanation += ` [MAB] Agreed discount of ${res.discountApplied}% was not applied.`;
                    trace.push(`Audit discrepancy [Missing Benefit]: Agreed discount of ${res.discountApplied}% was omitted in billing.`);
                } else {
                    res.exceptionCode = "OC";
                    res.status = "Overcharged";
                    res.explanation += ` [OC] Billed rate ₹${item.billedRate} exceeds agreed rate ₹${res.expectedDiscountedRate}.`;
                    trace.push(`Audit discrepancy [Overcharged]: Billed rate ₹${item.billedRate} is higher than the expected tariff ₹${res.expectedDiscountedRate}.`);
                }
            } else {
                res.status = "Undercharged";
                res.recoveryAmount = 0; // Negative variance indicates opportunity, not recoverability
                trace.push(`Audit discrepancy [Undercharged]: Billed rate ₹${item.billedRate} is lower than the expected tariff ₹${res.expectedDiscountedRate}.`);
            }
        } else {
            trace.push("Audit confirmation: Billed rate matches agreed expected rate.");
        }
    } else {
        res.status = "Not Found in Master";
        res.explanation += " Service not found in agreement or active SOC.";
        res.variance = item.billedRate * (item.quantity || 1);
        trace.push("WARNING: Audit incomplete. Service not found in masters.");
    }

    // I. Disallowance Engine Rules Evaluation
    const isTpa = agreement && (
        agreement.customerType === 'TPA' || 
        agreement.customerType === 'Insurance' || 
        (item.customer && (
            item.customer.toUpperCase().includes("TPA") || 
            item.customer.toUpperCase().includes("INSURANCE") || 
            item.customer.toUpperCase().includes("GIPSA")
        ))
    );

    const nameUpper = (item.serviceName || '').toUpperCase();
    const deptUpper = (item.dept || '').toUpperCase();
    
    // Non-medical and consumable exclusion definitions
    const isDisallowedItem = nameUpper.includes("PPE") || 
                            nameUpper.includes("SANITIZER") || 
                            nameUpper.includes("MASK") || 
                            nameUpper.includes("GLOVES") || 
                            nameUpper.includes("REGISTRATION") || 
                            nameUpper.includes("ADMINISTRATIVE") || 
                            nameUpper.includes("SERVICE CHARGE") || 
                            nameUpper.includes("STATIONERY") || 
                            nameUpper.includes("SYRINGE") ||
                            deptUpper.includes("CONSUMABLE");

    const qty = item.quantity || 1;
    const billedAmt = (item.billedRate || 0) * qty;

    if (isDisallowedItem && isTpa) {
        res.disallowanceInfo = {
            billedAmount: billedAmt,
            expectedAmount: 0,
            disallowedAmount: billedAmt,
            agreementClause: "Clause 18.4: Administrative overheads, documentation fees, and non-medical consumables are disallowed and non-reimbursable by the payer.",
            disallowanceReason: "Excluded Non-Medical Item / Administrative Overhead Charge",
            allowableDeduction: 0,
            excessDeduction: billedAmt,
            recoveryOpportunity: billedAmt,
            aiRecommendation: `AI Recommendation: Non-medical charges are disallowed by payer. Deduct 100% of the ₹${billedAmt} billing entry and recover the amount directly from the patient as a non-reimbursable expense.`
        };
        trace.push(`Disallowance Check: Non-medical consumable disallowance triggered for item "${item.serviceName}".`);
    } else if (isRoomRentService && res.expectedDiscountedRate !== null && item.billedRate > res.expectedDiscountedRate && isTpa) {
        const excess = (item.billedRate - res.expectedDiscountedRate) * qty;
        res.disallowanceInfo = {
            billedAmount: billedAmt,
            expectedAmount: res.expectedDiscountedRate * qty,
            disallowedAmount: excess,
            agreementClause: "Clause 7.2: Room category capping restricts billing eligibility. Payer disallows excess room rent resulting from patient upgrades.",
            disallowanceReason: "Room Category Capping Restriction",
            allowableDeduction: res.expectedDiscountedRate * qty,
            excessDeduction: excess,
            recoveryOpportunity: excess,
            aiRecommendation: `AI Recommendation: Excess room rent of ₹${excess} has been disallowed due to cap. Bill and recover the upgrade difference directly from the patient.`
        };
        trace.push(`Disallowance Check: Room Rent capping disallowance triggered. Excess Room Rent = ₹${excess}`);
    }

    // J. Synthesis of Narrative AI Explanation Panel
    const expectedAmt = (res.expectedDiscountedRate || 0) * qty;
    if (res.isIgnored) {
        res.aiExplanation = `Audit Ignored: Billed item "${item.serviceName}" is inside package; rates are bundled.`;
    } else if (res.status === "Not Found in Master") {
        res.aiExplanation = `Verification Alert: Service ID "${item.serviceId}" (${item.serviceName}) was not found in the active master tariff registry or agreement databases. Suggest verifying billing entry code manually.`;
    } else if (res.variance > 0) {
        res.aiExplanation = `Variance Alert: Billed amount (₹${billedAmt}) exceeds the expected contract rate (₹${expectedAmt}) by ₹${res.variance}. Selection source: ${res.applicableSOC}. Rule applied: ${res.explanation}. Suggested Action: Recover overcharged amount of ₹${res.variance}.`;
    } else if (res.variance < 0) {
        res.aiExplanation = `Underbilling Alert: Billed amount (₹${billedAmt}) is lower than the expected contract rate (₹${expectedAmt}) by ₹${Math.abs(res.variance)}. Action recommended: Review billing entry for potential under-billing recovery.`;
    } else {
        res.aiExplanation = `Audit Success: Billed amount (₹${billedAmt}) matches the expected contract rate (₹${expectedAmt}) based on Agreement reference "${res.agreementReference}".`;
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

function preloadAuditCache(activeSOCName) {
    const dbSOCName = UI_TO_DB_SOC_MAP[activeSOCName] || activeSOCName;
    return new Promise((resolve, reject) => {
        const cache = {
            socList: [],
            socById: new Map(),
            socByName: new Map(),
            tariffById: new Map(),
            tariffByName: new Map()
        };
        
        db.all(`SELECT ServiceID, ServiceName, AliasName, ServiceType, Department, StandardRate, RatesJSON FROM tbl_soc_master WHERE SOCName = ?`, [dbSOCName], (err, socRows) => {
            if (err) return reject(err);
            
            if (socRows) {
                for (const row of socRows) {
                    const item = {
                        id: row.ServiceID,
                        name: row.ServiceName,
                        aliasName: row.AliasName || '',
                        type: row.ServiceType,
                        dept: row.Department,
                        rate: row.StandardRate,
                        rates: row.RatesJSON ? JSON.parse(row.RatesJSON) : null
                    };
                    
                    cache.socList.push(item);
                    
                    if (row.ServiceID) {
                        const cleanId = String(row.ServiceID).trim().replace(/^[a-zA-Z]+-?/, '');
                        cache.socById.set(cleanId, item);
                        cache.socById.set(String(row.ServiceID), item);
                    }
                    if (row.ServiceName) {
                        cache.socByName.set(String(row.ServiceName).toUpperCase().trim(), item);
                    }
                }
            }
            
            db.all(`SELECT ServiceID, ServiceName, Rate FROM tbl_tariff_master`, [], (err, tariffRows) => {
                if (err) return reject(err);
                
                if (tariffRows) {
                    for (const row of tariffRows) {
                        const item = {
                            id: row.ServiceID,
                            name: row.ServiceName,
                            rate: row.Rate
                        };
                        
                        if (row.ServiceID) {
                            const cleanId = String(row.ServiceID).trim().replace(/^[a-zA-Z]+-?/, '');
                            cache.tariffById.set(cleanId, item);
                            cache.tariffById.set(String(row.ServiceID), item);
                        }
                        if (row.ServiceName) {
                            cache.tariffByName.set(String(row.ServiceName).toUpperCase().trim(), item);
                        }
                    }
                }
                
                resolve(cache);
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
    preloadAuditCache,
    saveAudit,
    approveAudit,
    reopenAudit,
    loadDashboard,
    getAuditHistory,
    getAuditLogs,
    deleteAuditRun,
    findDateEffectiveAgreement
};

