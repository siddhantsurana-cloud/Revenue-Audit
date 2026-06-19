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
        { name: "tbl_audit_trail", key: "trailId", auto: true }
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
                { payerName: "International Patient Pay", payerType: "Self Pay", agreementType: "Cash-Only", status: "Active", effectiveDate: "2025-01-01", expiryDate: "2027-12-31" }
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
                { agreementName: "HDFC MOU FY25-27", payer: "HDFC ERGO", agreementPeriod: "2025-2027", versionNumber: "1.0", status: "Active" },
                { agreementName: "Star Health Credit Agreement", payer: "Star Health", agreementPeriod: "2025-2027", versionNumber: "1.0", status: "Active" },
                { agreementName: "GIPSA Standard Package MOU", payer: "GIPSA", agreementPeriod: "2025-2027", versionNumber: "1.2", status: "Active" }
            ];
            const currentAgreements = await this.getAll("tbl_agreement_master");
            if (currentAgreements.length === 0) {
                for (const a of agreements) {
                    await this.add("tbl_agreement_master", a);
                }
            }

            console.log("RevenueAssuranceDB seeding complete.");
        }
    };

    // Expose to window object
    window.RevenueAssuranceDB = RevenueAssuranceDB;
})();
