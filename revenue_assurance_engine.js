// revenue_assurance_engine.js - Foundational Engines for Agreement-Driven Revenue Assurance Platform
// Parallel architecture layer to coexist with legacy validation code.

(function() {
    // 1. Feature Flags / Migration Controls
    const MigrationConfig = {
        useAgreementEngine: false, // Default is OFF
        getFeatureFlag: function(key) {
            if (key === 'useAgreementEngine') {
                return this.useAgreementEngine;
            }
            return false;
        },
        setFeatureFlag: function(key, val) {
            if (key === 'useAgreementEngine') {
                this.useAgreementEngine = val;
                localStorage.setItem('brc_v2_flag_agreement_engine', val ? 'true' : 'false');
                console.log(`Feature Flag changed: useAgreementEngine = ${val}`);
            }
        },
        loadFlags: function() {
            const val = localStorage.getItem('brc_v2_flag_agreement_engine');
            if (val !== null) {
                this.useAgreementEngine = (val === 'true');
            }
        }
    };
    MigrationConfig.loadFlags();

    function matchServiceInSOC(serviceId, serviceName, socArray, socMap) {
        if (!serviceName) return null;
        const nameUpper = serviceName.trim().toUpperCase();

        // 1. Exact Code Match
        if (serviceId && socMap && socMap[serviceId]) {
            return { item: socMap[serviceId], matchType: "Exact Code Match" };
        }

        if (!socArray || !Array.isArray(socArray)) return null;

        // 2. Exact Name Match (case-insensitive, trimmed)
        let matched = socArray.find(x => (x.name || '').trim().toUpperCase() === nameUpper);
        if (matched) return { item: matched, matchType: "Exact Name Match" };

        // 3. Normalized Name Match
        const normalize = str => {
            if (!str) return "";
            let cleaned = str.replace(/[-\s_(),\/+&.*]/g, '').toUpperCase().trim();
            cleaned = cleaned.replace(/X-?RAY/gi, 'XRAY');
            cleaned = cleaned.replace(/ULTRASOUND|ULTRASONOGRAPHY/gi, 'USG');
            return cleaned;
        };
        
        const normBillName = normalize(nameUpper);
        if (normBillName.length > 2) {
            matched = socArray.find(x => normalize(x.name) === normBillName);
            if (matched) return { item: matched, matchType: "Normalized Name Match" };
        }

        // 4. Alias Match (Exact name vs aliasName)
        matched = socArray.find(x => (x.aliasName || '').trim().toUpperCase() === nameUpper);
        if (matched) return { item: matched, matchType: "Alias Match" };
        
        if (normBillName.length > 2) {
            matched = socArray.find(x => x.aliasName && normalize(x.aliasName) === normBillName);
            if (matched) return { item: matched, matchType: "Normalized Alias Match" };
        }

        // 5. Fuzzy Match
        if (normBillName.length > 3) {
            matched = socArray.find(x => {
                const normSOCName = normalize(x.name);
                const normSOCAlias = normalize(x.aliasName);
                return (normSOCName && (normSOCName.includes(normBillName) || normBillName.includes(normSOCName))) ||
                       (normSOCAlias && (normSOCAlias.includes(normBillName) || normBillName.includes(normSOCAlias)));
            });
            if (matched) return { item: matched, matchType: "Fuzzy Match" };
        }

        return null;
    }

    function getCashSOCForYear(unit, year) {
        if (unit === 'excelcare') {
            if (year === '2026' && typeof window.TARIFF_EXCELCARE_CASH_2026 !== 'undefined') {
                return { array: window.TARIFF_EXCELCARE_CASH_2026, map: window.mapExcelcareCash2026, name: "Excelcare 2026-27 - Cash" };
            }
            if (year === '2025' && typeof window.TARIFF_EXCELCARE_CASH_2025 !== 'undefined') {
                return { array: window.TARIFF_EXCELCARE_CASH_2025, map: window.mapExcelcareCash, name: "Excelcare 2025-26 - Cash" };
            }
            if (year === '2024' && typeof window.TARIFF_EXCELCARE_CASH_2024 !== 'undefined') {
                return { array: window.TARIFF_EXCELCARE_CASH_2024, map: window.mapExcelcareCash2024, name: "Excelcare 2024 - Cash" };
            }
        } else if (unit === 'international') {
            if (year === '2026') {
                const sourceVal = window.activeSourceVal || '';
                if (sourceVal === '2026_cash_v2') {
                    if (typeof window.TARIFF_CASH_2026_V2 !== 'undefined') {
                        return { array: window.TARIFF_CASH_2026_V2, map: window.mapCash2026_v2, name: "International 2026 V2 - Cash" };
                    }
                }
                if (typeof window.TARIFF_CASH_2026 !== 'undefined') {
                    return { array: window.TARIFF_CASH_2026, map: window.mapCash2026, name: "International 2026 - Cash" };
                }
            }
            if (year === '2025' && typeof window.TARIFF_CASH_2025 !== 'undefined') {
                return { array: window.TARIFF_CASH_2025, map: window.mapCash2025, name: "International 2025 - Cash" };
            }
            if (year === '2024' && typeof window.TARIFF_CASH_2024 !== 'undefined') {
                return { array: window.TARIFF_CASH_2024, map: window.mapCash2024, name: "International 2024 - Cash" };
            }
            if (year === '2023' && typeof window.TARIFF_CASH_2023 !== 'undefined') {
                return { array: window.TARIFF_CASH_2023, map: window.mapCash2023, name: "International 2023 - Cash" };
            }
            if (year === '2021' && typeof window.TARIFF_CASH_2021 !== 'undefined') {
                return { array: window.TARIFF_CASH_2021, map: window.mapCash2021, name: "International 2021 - Cash" };
            }
        } else if (unit === 'kolkata') {
            if (year === '2023' && typeof window.TARIFF_KOLKATA_CASH_SOC !== 'undefined') {
                return { array: window.TARIFF_KOLKATA_CASH_SOC, map: window.mapKolkataCash, name: "Kolkata Cash SOC" };
            }
        }
        return null;
    }

    // 2. Service Master Match Engine (4-step Matching Logic)
    const ServiceMasterEngine = {
        cleanNameForFuzzy: function(str) {
            if (!str) return "";
            let cleaned = str.replace(/[-\s_(),\/+&.*]/g, '').toUpperCase().trim();
            cleaned = cleaned.replace(/X-?RAY/gi, 'XRAY');
            cleaned = cleaned.replace(/ULTRASOUND|ULTRASONOGRAPHY/gi, 'USG');
            return cleaned;
        },
        
        resolveService: async function(serviceCode, serviceName, activeSOC) {
            // Step 1: Primary Match - Service Code
            let matched = await window.RevenueAssuranceDB.get("tbl_service_master", serviceCode);
            if (matched) return { service: matched, matchType: "Primary (Code)" };

            // Step 2: Secondary Match - Exact Service Name
            const nameUpper = (serviceName || '').toUpperCase().trim();
            const allServices = await window.RevenueAssuranceDB.getAll("tbl_service_master");
            matched = allServices.find(x => (x.serviceName || '').toUpperCase().trim() === nameUpper);
            if (matched) return { service: matched, matchType: "Secondary (Exact Name)" };

            // Step 3: Third Match - Alias Mapping
            const aliases = await window.RevenueAssuranceDB.getAll("tbl_service_alias");
            const aliasMatch = aliases.find(x => (x.aliasName || '').toUpperCase().trim() === nameUpper || x.aliasCode === serviceCode);
            if (aliasMatch) {
                matched = allServices.find(x => x.serviceCode === aliasMatch.serviceCode);
                if (matched) return { service: matched, matchType: "Third (Alias)" };
            }

            // Step 4: Fourth Match - Fuzzy Match (Cleaned name characters)
            const cleanBillName = this.cleanNameForFuzzy(serviceName);
            if (cleanBillName.length > 2) {
                // Check service master normalized names
                matched = allServices.find(x => this.cleanNameForFuzzy(x.serviceName) === cleanBillName);
                if (matched) return { service: matched, matchType: "Fourth (Fuzzy Match)" };

                // Check alias normalized names
                const normAliasMatch = aliases.find(x => this.cleanNameForFuzzy(x.aliasName) === cleanBillName);
                if (normAliasMatch) {
                    matched = allServices.find(x => x.serviceCode === normAliasMatch.serviceCode);
                    if (matched) return { service: matched, matchType: "Fourth (Fuzzy Alias Match)" };
                }
            }

            // Fallback: If not found in IndexedDB service master, check the in-memory SOC mapping using the same matching hierarchy
            if (activeSOC) {
                const activeMap = typeof getActiveSOCMap !== 'undefined' ? getActiveSOCMap(activeSOC) : null;
                const res = matchServiceInSOC(serviceCode, serviceName, activeSOC, activeMap);
                if (res) {
                    const socItem = res.item;
                    return {
                        service: {
                            serviceCode: socItem.id,
                            serviceName: socItem.name,
                            department: socItem.dept || "General",
                            category: socItem.type || "General"
                        },
                        matchType: `Legacy SOC Fallback (${res.matchType})`
                    };
                }
            }

            return null;
        }
    };

    // 3. Charging Logic Engine
    const ChargingLogicEngine = {
        calculateCharge: function(methodCode, rate, quantity, durationMinutes) {
            let qty = parseFloat(quantity) || 1;
            let expected = rate * qty;
            let details = `Flat multiplication: Rate ₹${rate} * Qty ${qty}`;

            switch(methodCode) {
                case 'PH': // Per Hour
                    const hours = Math.ceil((durationMinutes || 0) / 60) || 1;
                    expected = rate * hours;
                    details = `Hourly billing: Rate ₹${rate} * ${hours} Hours`;
                    break;
                case 'PM': // Per Minute
                    const mins = parseFloat(durationMinutes) || 0;
                    expected = rate * mins;
                    details = `Minute-based billing: Rate ₹${rate} * ${mins} Minutes`;
                    break;
                case 'PD': // Per Day
                    const days = Math.ceil((durationMinutes || 0) / 1440) || 1;
                    expected = rate * days;
                    details = `Daily billing: Rate ₹${rate} * ${days} Days`;
                    break;
            }

            return { amount: expected, details: details };
        }
    };

    // 4. Agreement Rules & Room Tariff Resolver
    const AgreementRulesEngine = {
        getRuleForService: async function(agreementId, serviceCode) {
            const rules = await window.RevenueAssuranceDB.getAll("tbl_agreement_rules");
            return rules.find(x => x.agreementId === agreementId && x.serviceCode === serviceCode) || null;
        },

        getRoomRent: async function(agreementId, categoryName) {
            const rents = await window.RevenueAssuranceDB.getAll("tbl_room_tariffs");
            const catUpper = (categoryName || '').toUpperCase().trim();
            return rents.find(x => x.agreementId === agreementId && x.categoryName.toUpperCase().trim() === catUpper) || null;
        }
    };

    // 5. Package Validation Engine
    const PackageEngine = {
        getPackage: async function(packageName) {
            const packages = await window.RevenueAssuranceDB.getAll("tbl_package_master");
            const nameUpper = (packageName || '').toUpperCase().trim();
            return packages.find(x => x.packageName.toUpperCase().trim() === nameUpper) || null;
        }
    };

    // 6. Exception Governance Engine (Categorization & Recording)
    const ExceptionGovernanceEngine = {
        classifySeverity: function(billed, expected) {
            const variance = billed - expected;
            const pct = expected > 0 ? Math.abs((variance / expected) * 100) : 100;
            const abs = Math.abs(variance);

            if (abs > 10000 || pct > 50) return "Critical";
            if (abs > 3000 || pct > 20) return "High";
            if (abs > 500 || pct > 10) return "Medium";
            if (abs > 0) return "Low";
            return "Information";
        },

        createExceptionRecord: function(row, expectedRate, serviceMatch, ruleViolated, severity) {
            const billed = parseFloat(row.billedRate) || 0;
            const variance = billed - expectedRate;
            return {
                billNo: row.billNo || row.ipNo || "N/A",
                patientName: row.patientName || "Unknown",
                serviceCode: row.serviceId || (serviceMatch ? serviceMatch.serviceCode : "N/A"),
                serviceName: row.serviceName || (serviceMatch ? serviceMatch.serviceName : "Unknown"),
                department: row.dept || "General",
                billedRate: billed,
                expectedRate: expectedRate,
                variance: variance,
                severity: severity,
                ruleViolated: ruleViolated || "General pricing variance",
                status: variance > 0 ? "Overcharged" : (variance < 0 ? "Undercharged" : "Matching")
            };
        }
    };

    // 7. Pre-Bill Readiness Hook Infrastructure (Empty Shells / API Hooks)
    const PreBillInfrastructure = {
        validatePreBill: async function(preBillId, items) {
            console.log(`[Pre-Bill Hook] Validating pre-bill: ${preBillId} with ${items.length} items.`);
            // Auto write trail
            await window.RevenueAssuranceDB.add("tbl_audit_trail", {
                action: "Pre-Bill Validation Initialized",
                timestamp: new Date().toISOString(),
                user: "System Interface",
                details: `Pre-bill ID: ${preBillId}`
            });
            return { status: "Hold", reason: "Pending Revenue Assurance Review", timestamp: new Date().toISOString() };
        },

        holdBill: async function(preBillId, reason) {
            console.log(`[Pre-Bill Hook] Placing Hold on: ${preBillId}. Reason: ${reason}`);
            await window.RevenueAssuranceDB.add("tbl_prebill_workflow", {
                preBillId: preBillId,
                status: "Hold",
                reason: reason,
                updatedAt: new Date().toISOString()
            });
        },

        approveBill: async function(preBillId, approvedBy, comments) {
            console.log(`[Pre-Bill Hook] Releasing Hold / Approving bill: ${preBillId} by ${approvedBy}`);
            await window.RevenueAssuranceDB.add("tbl_prebill_approvals", {
                preBillId: preBillId,
                approvedBy: approvedBy,
                comments: comments,
                approvedAt: new Date().toISOString()
            });
            await window.RevenueAssuranceDB.add("tbl_prebill_workflow", {
                preBillId: preBillId,
                status: "Released",
                reason: "RA Approved",
                updatedAt: new Date().toISOString()
            });
        }
    };

    // 8. Unified IP/OP Agreement-Driven Audit Engine
    const UnifiedAuditEngine = {
        auditBillRows: async function(rows, agreementName, activeSOC, contextVariables, selectedSocName) {
            console.log(`[Unified Engine] Running Agreement Audit against MOU: ${agreementName}`);
            
            // Log run in audit trail
            await window.RevenueAssuranceDB.add("tbl_audit_trail", {
                action: "Agreement-Driven Audit Run",
                timestamp: new Date().toISOString(),
                user: window.currentUserUsername || "Guest Auditor",
                details: `Agreement Name: ${agreementName}, Rows: ${rows.length}`
            });

            // Find matching agreement in DB
            const agreements = await window.RevenueAssuranceDB.getAll("tbl_agreement_master");
            const ag = agreements.find(x => x.agreementName === agreementName) || null;
            const agId = ag ? ag.agreementId : null;

            // Fetch all rules from IndexedDB
            const allRules = agId ? await window.RevenueAssuranceDB.getAll("tbl_agreement_rules") : [];
            const activeRules = allRules.filter(x => x.agreementId === agId && x.status === "Active");

            const auditedResults = [];
            const exceptionList = [];

            for (const row of rows) {
                const code = String(row.serviceId || "").trim();
                const name = String(row.serviceName || row.name || "").trim();
                const billed = parseFloat(row.billedRate) || 0;
                
                // 1. Resolve matching service from service master / legacy SOC
                const matchResult = await ServiceMasterEngine.resolveService(code, name, activeSOC);
                
                let expectedRate = billed;
                let ruleViolated = "No matching agreement rule found";
                let ruleFound = false;
                let severityOverride = null;

                if (agId) {
                    // Step A: Evaluate Exclusions (Regex keywords)
                    const exclusionRules = activeRules.filter(r => r.ruleType === "exclusion");
                    for (const rule of exclusionRules) {
                        const isMatch = rule.matchPatterns.some(pattern => {
                            const regex = new RegExp(`\\b${pattern}\\b`, "i");
                            return regex.test(name) || regex.test(row.dept || "");
                        });
                        
                        if (isMatch) {
                            expectedRate = 0;
                            ruleViolated = `Exclusion Rule: ${rule.description || "Excluded item charged"}`;
                            severityOverride = "High";
                            ruleFound = true;
                            break;
                        }
                    }

                    // Step B: Evaluate Capping Rules (ICU, Room, Consults, Monitoring)
                    if (!ruleFound) {
                        const cappingRules = activeRules.filter(r => r.ruleType === "capping");
                        for (const rule of cappingRules) {
                            let isCategoryMatch = false;
                            
                            if (rule.scope === "category") {
                                const catUpper = String(rule.category || "").toUpperCase().trim();
                                
                                if (catUpper === "ROOM RENT") {
                                    isCategoryMatch = /room rent|bed charge|ward|cabin|deluxe|suite/i.test(name) || /room rent/i.test(row.dept || "");
                                } else if (catUpper === "ICU") {
                                    isCategoryMatch = /icu|intensive care/i.test(name) && !/step down|sdicu/i.test(name);
                                } else if (catUpper === "ICU STEP DOWN") {
                                    isCategoryMatch = /step down|sdicu/i.test(name);
                                } else if (catUpper === "DAY CARE") {
                                    isCategoryMatch = /day care|daycare/i.test(name);
                                } else if (catUpper === "MONITORING") {
                                    isCategoryMatch = /monitoring|monitor/i.test(name) && !/cardiac monitor/i.test(name);
                                } else if (catUpper.startsWith("CONSULTATION")) {
                                    const isConsult = /consultation|visit/i.test(name);
                                    if (isConsult) {
                                        if (catUpper === "CONSULTATION - MBBS") {
                                            isCategoryMatch = /mbbs|general practitioner/i.test(name);
                                        } else if (catUpper === "CONSULTATION - PG") {
                                            isCategoryMatch = /pg degree|diploma|md|ms|specialist/i.test(name) && !/super specialist|dm|mch/i.test(name);
                                        } else if (catUpper === "CONSULTATION - SUPER SPECIALIST") {
                                            isCategoryMatch = /super specialist|dm|mch|dnb/i.test(name);
                                        }
                                    }
                                }
                            } else if (rule.scope === "service" && matchResult) {
                                isCategoryMatch = (matchResult.service.serviceCode === rule.serviceCode);
                            }

                            if (isCategoryMatch) {
                                // Rule requires Officer Grade variable check
                                const isGradeDependent = (rule.variableKey === "officer_grade") || 
                                                        (rule.category === "Room Rent") || 
                                                        (rule.category === "ICU") || 
                                                        (rule.category === "ICU Step Down") || 
                                                        (rule.category === "Day Care") || 
                                                        (rule.category === "Monitoring") || 
                                                        (rule.category && rule.category.startsWith("Consultation"));

                                const activeGrade = contextVariables ? contextVariables.officer_grade : null;

                                if (isGradeDependent && !activeGrade) {
                                    // Grade is missing: Skip Room, ICU, Monitoring, and Consult Caps as per Validation Rule
                                    ruleViolated = "Officer Grade unavailable. Grade-dependent validations were not performed.";
                                    expectedRate = billed;
                                    ruleFound = true;
                                    severityOverride = "Medium";
                                } else {
                                    // Resolve cap value
                                    let resolvedCap = null;
                                    if (rule.variableKey) {
                                        const ctxVal = contextVariables ? contextVariables[rule.variableKey] : null;
                                        // For consultations, resolve type dynamically if not passed
                                        let finalCtxVal = ctxVal;
                                        if (rule.variableKey === "consultation_type" && !finalCtxVal) {
                                            finalCtxVal = /emerg|night|casualty|urgent/i.test(name) ? "emergency" : "chamber";
                                        }
                                        
                                        if (finalCtxVal && rule.variableValueMap && rule.variableValueMap[finalCtxVal] !== undefined) {
                                            resolvedCap = rule.variableValueMap[finalCtxVal];
                                        }
                                    } else if (rule.capValue !== undefined && rule.capValue !== null) {
                                        resolvedCap = rule.capValue;
                                    }

                                    if (resolvedCap !== null) {
                                        if (billed > resolvedCap) {
                                            expectedRate = resolvedCap;
                                            ruleViolated = `${rule.description}: Capped at ₹${resolvedCap}`;
                                            ruleFound = true;
                                        } else {
                                            expectedRate = billed;
                                            ruleViolated = `${rule.description}: Within limit (Cap: ₹${resolvedCap})`;
                                            ruleFound = true;
                                        }
                                    }
                                }
                                
                                if (ruleFound) break;
                            }
                        }
                    }

                    // Step C: Evaluate Tariff Rate Overrides (Fixed rates / discounts)
                    if (!ruleFound && matchResult) {
                        const svc = matchResult.service;
                        const rule = activeRules.find(r => r.ruleType === "fixed_rate" && r.serviceCode === svc.serviceCode);
                        if (rule) {
                            expectedRate = rule.fixedRate;
                            ruleViolated = `Fixed rate override applied: ₹${expectedRate}`;
                            ruleFound = true;
                        } else {
                            const discRule = activeRules.find(r => r.ruleType === "discount_percent" && r.serviceCode === svc.serviceCode);
                            if (discRule) {
                                const standardItem = activeSOC.find(x => x.id === svc.serviceCode);
                                const standardRate = standardItem ? (standardItem.rate || 0) : billed;
                                expectedRate = standardRate * (1 - discRule.discountPercent / 100);
                                ruleViolated = `Discount rate override applied (${discRule.discountPercent}%): ₹${expectedRate}`;
                                ruleFound = true;
                            }
                        }
                    }
                }

                // Step D: Fallback to standard active SOC / multi-year fallback matching if no rule matched
                if (!ruleFound) {
                    let matchedItem = null;
                    let matchedSource = "";

                    if (matchResult) {
                        // First try standard active SOC
                        const standardItem = activeSOC ? activeSOC.find(x => x.id === matchResult.service.serviceCode) : null;
                        if (standardItem) {
                            matchedItem = standardItem;
                            matchedSource = "Standard Active SOC";
                        }
                    }

                    // If not found in standard active SOC, trigger the multi-year fallback lookup list
                    if (!matchedItem) {
                        let activeSourceVal = selectedSocName || "";
                        let activeYear = "2024"; // default fallback year
                        if (activeSourceVal === "2025" || activeSourceVal === "2024" || activeSourceVal === "2023" || activeSourceVal === "2021" || activeSourceVal === "soc_2023_v2" || activeSourceVal === "soc_2021_iocl" || activeSourceVal === "2025_cash" || activeSourceVal === "2026_cash" || activeSourceVal === "2026_cash_v2") {
                            activeYear = activeSourceVal === "soc_2023_v2" ? "2023_v2" : (activeSourceVal === "soc_2021_iocl" ? "2021_iocl" : activeSourceVal);
                        } else if (activeSourceVal === "excelcare_2025" || activeSourceVal === "excelcare_cash_2025" || activeSourceVal === "excelcare_gipsa_2026" || activeSourceVal === "excelcare_soc" || activeSourceVal === "excelcare_soc_cash") {
                            activeYear = "2025";
                        } else if (activeSourceVal === "excelcare_2024" || activeSourceVal === "excelcare_soc_2024") {
                            activeYear = "2024";
                        } else {
                            if (activeSOC === window.TARIFF_2025 || activeSOC === window.TARIFF_EXCELCARE_2025 || activeSOC === window.TARIFF_EXCELCARE_CASH_2025 || activeSOC === window.TARIFF_EXCELCARE_GIPSA_2026) activeYear = "2025";
                            else if (activeSOC === window.TARIFF_2024 || activeSOC === window.TARIFF_EXCELCARE_2024) activeYear = "2024";
                            else if (activeSOC === window.TARIFF_2023) activeYear = "2023";
                            else if (activeSOC === window.TARIFF_2023_V2) activeYear = "2023_v2";
                            else if (activeSOC === window.TARIFF_2021) activeYear = "2021";
                            else activeYear = "2025"; // default to 2025-26
                        }

                        const activeBU = (contextVariables && contextVariables.bu) || "international";
                        const isKolkata = (activeBU === "kolkata" || activeSourceVal === "sockolkata" || activeSourceVal === "pkgkolkata" || activeSourceVal.toLowerCase().includes("kolkata"));
                        const isExcelcare = (activeBU === "excelcare" || activeSourceVal.startsWith("excelcare_") || activeSourceVal.startsWith("socexcelcare") || activeSourceVal === "hdfcergo");

                        const unitKey = isExcelcare ? 'excelcare' : (isKolkata ? 'kolkata' : 'international');
                        const yearNum = activeYear.split('_')[0];

                        const fallbackSOCList = [];
                        const isCashAudit = activeSourceVal.includes("cash") || activeSourceVal === "excelcare_soc_cash" || (activeSOC && (activeSOC === window.TARIFF_EXCELCARE_CASH_2025 || activeSOC === window.TARIFF_EXCELCARE_CASH_2026 || activeSOC === window.TARIFF_CASH_2026 || activeSOC === window.TARIFF_CASH_2026_V2 || activeSOC === window.TARIFF_CASH_2025 || activeSOC === window.TARIFF_CASH_2024 || activeSOC === window.TARIFF_CASH_2023 || activeSOC === window.TARIFF_CASH_2021 || activeSOC === window.TARIFF_KOLKATA_CASH_SOC));

                        if (isCashAudit) {
                            const years = ['2026', '2025', '2024', '2023', '2021'];
                            const startIndex = years.indexOf(yearNum);
                            const searchYears = startIndex !== -1 ? years.slice(startIndex) : years;
                            
                            for (const y of searchYears) {
                                const cashSoc = getCashSOCForYear(unitKey, y);
                                if (cashSoc) {
                                    fallbackSOCList.push(cashSoc);
                                }
                            }
                        } else {
                            if (isKolkata) {
                                fallbackSOCList.push({ array: window.TARIFF_KOLKATA_SOC, map: window.mapKolkata, name: "Kolkata SOC" });
                            } else if (isExcelcare) {
                                const use24 = (activeSourceVal === "excelcare_2024" || activeSourceVal === "socexcelcare2024" || activeYear === "2024");
                                if (use24) {
                                    fallbackSOCList.push({ array: window.TARIFF_EXCELCARE_2024, map: window.mapExcelcare2024, name: "Excelcare 2024-25" });
                                } else {
                                    fallbackSOCList.push({ array: window.TARIFF_EXCELCARE_2025, map: window.mapExcelcare, name: "Excelcare 2025-26" });
                                }
                            } else {
                                if (activeYear === "2025") {
                                    fallbackSOCList.push({ array: window.TARIFF_2025, map: window.map2025, name: "2025-26 SOC" });
                                } else if (activeYear === "2024") {
                                    fallbackSOCList.push({ array: window.TARIFF_2024, map: window.map2024, name: "2024-25 SOC" });
                                } else if (activeYear === "2023") {
                                    fallbackSOCList.push({ array: window.TARIFF_2023, map: window.map2023, name: "2023-24 SOC" });
                                } else if (activeYear === "2023_v2") {
                                    fallbackSOCList.push({ array: window.TARIFF_2023_V2, map: window.map2023_v2, name: "2023-24 V2 SOC" });
                                } else if (activeYear === "2021") {
                                    fallbackSOCList.push({ array: window.TARIFF_2021, map: window.map2021, name: "2021-22 SOC" });
                                } else if (activeYear === "2021_iocl") {
                                    fallbackSOCList.push({ array: window.TARIFF_2021_IOCL, map: window.map2021_iocl, name: "2021-22 IOCL SOC" });
                                } else {
                                    fallbackSOCList.push({ array: window.TARIFF_2025, map: window.map2025, name: "2025-26 SOC" });
                                }
                            }
                        }

                        for (const fallbackSOC of fallbackSOCList) {
                            const res = matchServiceInSOC(code, name, fallbackSOC.array, fallbackSOC.map);
                            if (res) {
                                matchedItem = res.item;
                                matchedSource = `${fallbackSOC.name} (${res.matchType})`;
                                break;
                            }
                        }
                    }

                    if (matchedItem) {
                        expectedRate = matchedItem.rate || 0;
                        ruleViolated = `Matched via ${matchedSource}: ₹${expectedRate}`;
                    } else {
                        expectedRate = billed;
                        ruleViolated = `Unmapped Service`;
                    }
                }

                // 3. Compare and check exception
                const variance = billed - expectedRate;
                const severity = severityOverride || ExceptionGovernanceEngine.classifySeverity(billed, expectedRate);
                
                const exceptionObj = ExceptionGovernanceEngine.createExceptionRecord(row, expectedRate, matchResult ? matchResult.service : null, ruleViolated, severity);
                
                auditedResults.push({
                    row: row,
                    expectedRate: expectedRate,
                    variance: variance,
                    status: exceptionObj.status,
                    severity: severity,
                    ruleUsed: ruleViolated
                });

                if (exceptionObj.status !== "Matching") {
                    exceptionList.push(exceptionObj);
                }
            }

            // Save results to tbl_audit_results
            const summary = {
                uploadDate: new Date().toISOString(),
                agreementName: agreementName,
                totalRows: rows.length,
                exceptionsCount: exceptionList.length,
                totalLeakage: exceptionList.filter(x => x.status === "Overcharged").reduce((acc, x) => acc + x.variance, 0),
                totalRecovery: exceptionList.filter(x => x.status === "Undercharged").reduce((acc, x) => acc + Math.abs(x.variance), 0),
                status: "Completed"
            };
            const resultKey = await window.RevenueAssuranceDB.add("tbl_audit_results", summary);
            console.log(`Saved audit run results. Result Key: ${resultKey}`);

            return {
                auditedResults: auditedResults,
                exceptions: exceptionList,
                summary: summary
            };
        }
    };

    // Expose all modules globally
    window.MigrationConfig = MigrationConfig;
    window.ServiceMasterEngine = ServiceMasterEngine;
    window.ChargingLogicEngine = ChargingLogicEngine;
    window.AgreementRulesEngine = AgreementRulesEngine;
    window.PackageEngine = PackageEngine;
    window.ExceptionGovernanceEngine = ExceptionGovernanceEngine;
    window.PreBillInfrastructure = PreBillInfrastructure;
    window.UnifiedAuditEngine = UnifiedAuditEngine;
})();
