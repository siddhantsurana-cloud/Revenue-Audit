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

    // 2. Service Master Match Engine (4-step Matching Logic)
    const ServiceMasterEngine = {
        cleanNameForFuzzy: function(str) {
            if (!str) return "";
            // Remove punctuation, dashes, spaces, and capitalize
            return str.replace(/[-\s_(),]+/g, '').toUpperCase().trim();
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
                matched = allServices.find(x => this.cleanNameForFuzzy(x.serviceName) === cleanBillName);
                if (matched) return { service: matched, matchType: "Fourth (Fuzzy Match)" };
            }

            // Fallback: If not found in IndexedDB service master, check the in-memory SOC mapping
            if (activeSOC) {
                const socItem = activeSOC.find(x => x.id === serviceCode || (x.name || '').toUpperCase().trim() === nameUpper);
                if (socItem) {
                    return {
                        service: {
                            serviceCode: socItem.id,
                            serviceName: socItem.name,
                            department: socItem.dept || "General",
                            category: socItem.type || "General"
                        },
                        matchType: "Legacy SOC Fallback"
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
        auditBillRows: async function(rows, agreementName, activeSOC) {
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

            const auditedResults = [];
            const exceptionList = [];

            for (const row of rows) {
                const code = row.serviceId || "";
                const name = row.serviceName || row.name || "";
                const billed = parseFloat(row.billedRate) || 0;
                
                // 1. Match Service Code / Name
                const matchResult = await ServiceMasterEngine.resolveService(code, name, activeSOC);
                
                let expectedRate = billed; // Fallback to billed rate if no rule matches
                let ruleViolated = "No matching agreement rule found";

                if (matchResult && agId) {
                    const svc = matchResult.service;
                    // 2. Look for Agreement Rule
                    const rule = await AgreementRulesEngine.getRuleForService(agId, svc.serviceCode);
                    if (rule) {
                        if (rule.fixedRate !== undefined && rule.fixedRate !== null) {
                            expectedRate = rule.fixedRate;
                            ruleViolated = `Fixed rate applied: ₹${expectedRate}`;
                        } else if (rule.discountPercent !== undefined && rule.discountPercent !== null) {
                            // Fetch default standard rate from TARIFF_DATA
                            const standardItem = activeSOC.find(x => x.id === svc.serviceCode);
                            const standardRate = standardItem ? (standardItem.rate || 0) : billed;
                            expectedRate = standardRate * (1 - rule.discountPercent / 100);
                            ruleViolated = `Discount rate applied (${rule.discountPercent}%): ₹${expectedRate}`;
                        }
                    }
                }

                // 3. Compare and check exception
                const variance = billed - expectedRate;
                const severity = ExceptionGovernanceEngine.classifySeverity(billed, expectedRate);
                
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
