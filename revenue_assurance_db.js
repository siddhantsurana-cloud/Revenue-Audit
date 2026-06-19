// revenue_assurance_db.js - Foundational Database Layer for Revenue Assurance Platform
// Uses IndexedDB to store tbl_* entities, preparing for future Postgres/Supabase/Firebase migration.

(function() {
    const DB_NAME = "RevenueAssuranceDB";
    const DB_VERSION = 1;
    let dbInstance = null;

    const STORES = [
        { name: "tbl_payer_master", key: "payerId", auto: true },
        { name: "tbl_agreement_master", key: "agreementId", auto: true },
        { name: "tbl_agreement_versions", key: "versionId", auto: true },
        { name: "tbl_agreement_rules", key: "ruleId", auto: true },
        { name: "tbl_service_master", key: "serviceCode", auto: false }, // Service Code is primary key
        { name: "tbl_service_alias", key: "aliasId", auto: true },
        { name: "tbl_room_tariffs", key: "tariffId", auto: true },
        { name: "tbl_package_master", key: "packageId", auto: true },
        { name: "tbl_package_rules", key: "ruleId", auto: true },
        { name: "tbl_department_discounts", key: "discountId", auto: true },
        { name: "tbl_charging_methods", key: "methodId", auto: true },
        { name: "tbl_exception_master", key: "exceptionId", auto: true },
        { name: "tbl_audit_results", key: "resultId", auto: true },
        { name: "tbl_prebill_rules", key: "ruleId", auto: true },
        { name: "tbl_prebill_workflow", key: "workflowId", auto: true },
        { name: "tbl_prebill_approvals", key: "approvalId", auto: true },
        { name: "tbl_user_roles", key: "roleId", auto: true },
        { name: "tbl_audit_trail", key: "trailId", auto: true },
        { name: "tbl_beneficiary_master", key: "employeeNumber", auto: false }
    ];

    const RevenueAssuranceDB = {
        open: function() {
            return new Promise((resolve, reject) => {
                if (dbInstance) return resolve(dbInstance);

                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onerror = (event) => {
                    console.error("IndexedDB Open Error:", event);
                    reject(event);
                };

                request.onsuccess = (event) => {
                    dbInstance = event.target.result;
                    console.log("RevenueAssuranceDB opened successfully.");
                    resolve(dbInstance);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.log("Upgrading RevenueAssuranceDB schema...");

                    STORES.forEach(store => {
                        if (!db.objectStoreNames.contains(store.name)) {
                            const opt = store.auto ? { keyPath: store.key, autoIncrement: true } : { keyPath: store.key };
                            const os = db.createObjectStore(store.name, opt);
                            console.log(`Created Object Store: ${store.name}`);
                        }
                    });
                };
            });
        },

        getTransaction: function(storeNames, mode = "readonly") {
            return this.open().then(db => {
                return db.transaction(storeNames, mode);
            });
        },

        getAll: function(storeName) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readonly").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        get: function(storeName, key) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readonly").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        add: function(storeName, item) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readwrite").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.add(item);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        put: function(storeName, item) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readwrite").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.put(item);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        delete: function(storeName, key) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readwrite").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.delete(key);
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        clear: function(storeName) {
            return new Promise((resolve, reject) => {
                this.getTransaction(storeName, "readwrite").then(tx => {
                    const store = tx.objectStore(storeName);
                    const req = store.clear();
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => reject(req.error);
                }).catch(reject);
            });
        },

        seedData: async function() {
            console.log("Seeding reference data to RevenueAssuranceDB...");
            
            // 1. Seed Payers
            const payers = [
                { payerName: "HDFC ERGO", payerType: "Insurance Company", agreementType: "Standard", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "Star Health", payerType: "Insurance Company", agreementType: "Standard", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "Aditya Birla", payerType: "Insurance Company", agreementType: "Standard", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "Medi Assist", payerType: "TPA", agreementType: "Co-payment", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "GIPSA", payerType: "Insurance Company", agreementType: "Standard", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "International Patient Pay", payerType: "Self Pay", agreementType: "Cash-Only", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" },
                { payerName: "State Bank of India (SBI)", payerType: "Corporate Credit", agreementType: "Multi-Agreement", status: "Active", effectiveDate: "2023-04-01", expiryDate: "2026-03-31" }
            ];
            const currentPayers = await this.getAll("tbl_payer_master");
            if (currentPayers.length === 0) {
                for (const p of payers) {
                    await this.add("tbl_payer_master", p);
                }
            }

            // 2. Seed User Roles
            const roles = [
                { roleName: "Administrator", description: "Full platform permissions and db sync controls" },
                { roleName: "Auditor", description: "Execute audits, resolve exception items, export reports" },
                { roleName: "Revenue Assurance Supervisor", description: "Review and approve audits, release bills" }
            ];
            const currentRoles = await this.getAll("tbl_user_roles");
            if (currentRoles.length === 0) {
                for (const r of roles) {
                    await this.add("tbl_user_roles", r);
                }
            }

            // 3. Seed Charging Methods
            const methods = [
                { methodName: "Per Day", code: "PD" },
                { methodName: "Per Hour", code: "PH" },
                { methodName: "Per Minute", code: "PM" },
                { methodName: "Per Visit", code: "PV" },
                { methodName: "Per Admission", code: "PA" },
                { methodName: "Per Quantity", code: "PQ" }
            ];
            const currentMethods = await this.getAll("tbl_charging_methods");
            if (currentMethods.length === 0) {
                for (const m of methods) {
                    await this.add("tbl_charging_methods", m);
                }
            }

            // 4. Seed Service Master from TARIFF_DATA (if loaded)
            const currentServices = await this.getAll("tbl_service_master");
            const tData = (typeof TARIFF_DATA !== 'undefined') ? TARIFF_DATA : (typeof window.TARIFF_DATA !== 'undefined' ? window.TARIFF_DATA : undefined);
            if (currentServices.length === 0 && tData) {
                console.log("Seeding service master from compiled TARIFF_DATA...");
                // Limit to first 200 items for seeding performance
                const sampleList = tData.slice(0, 200);
                for (const s of sampleList) {
                    await this.put("tbl_service_master", {
                        serviceCode: s.id,
                        serviceName: s.name,
                        department: s.dept || "General",
                        category: s.type || "General",
                        chargingMethod: "Per Quantity",
                        status: "Active"
                    });
                }
            }

            // 5. Seed Agreement Master
            const agreements = [
                { agreementName: "HDFC MOU FY25-27", payer: "HDFC ERGO", agreementPeriod: "2025-2027", versionNumber: "1.0", status: "Active", businessUnits: ["international", "excelcare"] },
                { agreementName: "Star Health Credit Agreement", payer: "Star Health", agreementPeriod: "2025-2027", versionNumber: "1.0", status: "Active", businessUnits: ["international"] },
                { agreementName: "GIPSA Standard Package MOU", payer: "GIPSA", agreementPeriod: "2025-2027", versionNumber: "1.2", status: "Active", businessUnits: ["international", "excelcare", "kolkata"] },
                { agreementName: "SBI Credit Agreement FY 2023-24", payer: "State Bank of India (SBI)", agreementPeriod: "2023-2024", versionNumber: "1.0", status: "Active", businessUnits: ["international"] },
                { agreementName: "SBI Officers Circular FY 2023-24", payer: "State Bank of India (SBI)", agreementPeriod: "2023-2024", versionNumber: "1.0", status: "Active", businessUnits: ["international"] }
            ];
            const currentAgreements = await this.getAll("tbl_agreement_master");
            if (currentAgreements.length === 0) {
                for (const a of agreements) {
                    await this.add("tbl_agreement_master", a);
                }
            }

            // 6. Seed Agreement Rules
            const currentRules = await this.getAll("tbl_agreement_rules");
            if (currentRules.length === 0) {
                const refreshedAgreements = await this.getAll("tbl_agreement_master");
                
                // A. Star Health Sample Rule
                const starAg = refreshedAgreements.find(x => x.agreementName === "Star Health Credit Agreement");
                if (starAg) {
                    await this.add("tbl_agreement_rules", {
                        agreementId: starAg.agreementId,
                        serviceCode: "1",
                        ruleType: "fixed_rate",
                        scope: "service",
                        description: "Star Health Absolute Eosinophil Count rate: ₹200",
                        fixedRate: 200,
                        discountPercent: null,
                        status: "Active"
                    });
                }

                // B. SBI Credit Agreement FY 2023-24 Rules (Service Tariffs)
                const sbiCreditAg = refreshedAgreements.find(x => x.agreementName === "SBI Credit Agreement FY 2023-24");
                const sbiTariffData = (typeof TARIFF_SBI_CREDIT_2023_24 !== 'undefined') ? TARIFF_SBI_CREDIT_2023_24 : (typeof window.TARIFF_SBI_CREDIT_2023_24 !== 'undefined' ? window.TARIFF_SBI_CREDIT_2023_24 : null);
                
                if (sbiCreditAg && sbiTariffData) {
                    console.log(`Seeding ${sbiTariffData.length} SBI credit rules into IndexedDB...`);
                    // We seed all items as dynamic rules
                    for (const item of sbiTariffData) {
                        await this.add("tbl_agreement_rules", {
                            agreementId: sbiCreditAg.agreementId,
                            serviceCode: String(item.id).trim(),
                            ruleType: "fixed_rate",
                            scope: "service",
                            description: `SBI Pre-Agreed rate for ${item.name}`,
                            fixedRate: item.rate,
                            discountPercent: null,
                            status: "Active"
                        });
                    }
                }

                // C. SBI Officers Circular FY 2023-24 Rules (Exclusions and Capping Rules)
                const sbiOfficersAg = refreshedAgreements.find(x => x.agreementName === "SBI Officers Circular FY 2023-24");
                if (sbiOfficersAg) {
                    console.log("Seeding SBI Officers Circular capping and exclusion rules...");
                    
                    // C1. Food & Clothing Exclusion Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "exclusion",
                        scope: "global",
                        description: "SBI Circular: Free Patient Food & Clothing Exclusions",
                        matchPatterns: ["food", "diet", "meal", "patient diet", "patient food", "clothing", "patient gown", "hospital gown", "dress"],
                        status: "Active"
                    });

                    // C2. Room Rent Capping Rule (Variable-based)
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Room Rent",
                        description: "Officer Bed Charge Cap (Grade-dependent)",
                        variableKey: "officer_grade",
                        variableValueMap: {
                            "JMG-I": 4000,
                            "MMGS-II": 4000,
                            "MMGS-III": 4700,
                            "SMGS-IV": 5000,
                            "SMGS-V": 6000,
                            "TEGSS-VI": 7000,
                            "TEGSS-VII": 7500,
                            "TEGSS-VIII": 8500,
                            "TEGSS-IX": 8500
                        },
                        status: "Active"
                    });

                    // C3. ICU Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "ICU",
                        description: "ICU Rate Cap",
                        capValue: 6000,
                        status: "Active"
                    });

                    // C4. ICU Step Down Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "ICU Step Down",
                        description: "ICU Step Down Rate Cap",
                        capValue: 5000,
                        status: "Active"
                    });

                    // C5. Day Care Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Day Care",
                        description: "Day Care Limit Cap",
                        capValue: 1700,
                        status: "Active"
                    });

                    // C6. Monitoring Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Monitoring",
                        description: "Daily Monitoring Limit Cap",
                        capValue: 2650,
                        status: "Active"
                    });

                    // C7. MBBS Consultation Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Consultation - MBBS",
                        description: "MBBS Consultation Cap",
                        variableKey: "consultation_type",
                        variableValueMap: {
                            "chamber": 350,
                            "emergency": 800
                        },
                        status: "Active"
                    });

                    // C8. PG Consultation Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Consultation - PG",
                        description: "PG Consultation Cap",
                        variableKey: "consultation_type",
                        variableValueMap: {
                            "chamber": 750,
                            "emergency": 1500
                        },
                        status: "Active"
                    });

                    // C9. Super Specialist Consultation Capping Rule
                    await this.add("tbl_agreement_rules", {
                        agreementId: sbiOfficersAg.agreementId,
                        ruleType: "capping",
                        scope: "category",
                        category: "Consultation - Super Specialist",
                        description: "Super Specialist Consultation Cap",
                        variableKey: "consultation_type",
                        variableValueMap: {
                            "chamber": 1005,
                            "emergency": 2000
                        },
                        status: "Active"
                    });
                }
            }

            console.log("RevenueAssuranceDB seeding complete.");
        }
    };

    // Expose to window object
    window.RevenueAssuranceDB = RevenueAssuranceDB;
})();
