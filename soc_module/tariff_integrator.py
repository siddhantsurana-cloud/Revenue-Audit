"""
Tariff Module Integration & Database Bridge
Apollo Revenue Audit - SOC Data Processing Module
"""

import os
import json
import sqlite3
import datetime
from typing import Dict, List, Any, Optional

class TariffIntegrator:
    """Bridges validated canonical SOC data with SQLite and JSON Tariff repositories."""

    def __init__(self, db_path: str = "revenue_audit.db", json_fallback_path: str = "imported_soc_tariffs.json"):
        self.db_path = db_path
        self.json_fallback_path = json_fallback_path
        self.init_database()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_database(self):
        """Ensures tbl_import_logs, tbl_soc_master, and tbl_tariff_master exist."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Create tbl_import_logs if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tbl_import_logs (
                    ImportID INTEGER PRIMARY KEY AUTOINCREMENT,
                    FileName TEXT,
                    ImportDate TEXT,
                    TotalRecords INTEGER,
                    SuccessCount INTEGER,
                    FailedCount INTEGER,
                    ImportedBy TEXT,
                    Status TEXT,
                    DetailsJSON TEXT
                )
            """)

            # Ensure tbl_soc_master exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tbl_soc_master (
                    SOCID INTEGER PRIMARY KEY AUTOINCREMENT,
                    SOCName TEXT,
                    ServiceID TEXT,
                    ServiceName TEXT,
                    ServiceType TEXT,
                    Department TEXT,
                    StandardRate REAL,
                    RatesJSON TEXT,
                    AliasName TEXT
                )
            """)

            # Ensure tbl_tariff_master exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tbl_tariff_master (
                    TariffID INTEGER PRIMARY KEY AUTOINCREMENT,
                    ServiceID TEXT,
                    ServiceName TEXT,
                    Rate REAL
                )
            """)

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[TariffIntegrator] Database init error: {e}")

    def log_import(self, file_name: str, total: int, success: int, failed: int, user: str, status: str, details: Dict[str, Any]) -> int:
        """Records an import audit log entry."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            now_iso = datetime.datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO tbl_import_logs (FileName, ImportDate, TotalRecords, SuccessCount, FailedCount, ImportedBy, Status, DetailsJSON)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (file_name, now_iso, total, success, failed, user, status, json.dumps(details)))
            import_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return import_id
        except Exception as e:
            print(f"[TariffIntegrator] Failed to log import: {e}")
            return -1

    def get_import_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves history of past SOC imports."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT ImportID, FileName, ImportDate, TotalRecords, SuccessCount, FailedCount, ImportedBy, Status, DetailsJSON
                FROM tbl_import_logs ORDER BY ImportID DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            logs = []
            for r in rows:
                details = {}
                try:
                    details = json.loads(r["DetailsJSON"]) if r["DetailsJSON"] else {}
                except Exception:
                    pass
                logs.append({
                    "import_id": r["ImportID"],
                    "file_name": r["FileName"],
                    "import_date": r["ImportDate"],
                    "total_records": r["TotalRecords"],
                    "success_count": r["SuccessCount"],
                    "failed_count": r["FailedCount"],
                    "imported_by": r["ImportedBy"],
                    "status": r["Status"],
                    "details": details
                })
            conn.close()
            return logs
        except Exception as e:
            print(f"[TariffIntegrator] Failed to get import logs: {e}")
            return []

    def commit_soc_records(self, valid_records: List[Dict[str, Any]], file_name: str, user: str = "Administrator", soc_name: str = "IMPORTED_SOC") -> Dict[str, Any]:
        """
        Commits validated SOC records to SQLite tables and JSON store within an atomic transaction.
        """
        if not valid_records:
            return {
                "status": "warning",
                "message": "No valid records to commit.",
                "inserted": 0,
                "updated": 0
            }

        conn = self.get_connection()
        inserted_count = 0
        updated_count = 0

        try:
            cursor = conn.cursor()

            for rec in valid_records:
                code = str(rec.get("service_code", "")).strip()
                name = str(rec.get("description", "")).strip()
                rate = float(rec.get("rate", 0.0))
                category = str(rec.get("category", "General")).strip()
                dept = str(rec.get("department", "General")).strip()
                alias_name = str(rec.get("alias_name", "")).strip()

                rates_payload = json.dumps({
                    "unit": rec.get("unit", "Per Quantity"),
                    "currency": rec.get("currency", "INR"),
                    "effective_from": rec.get("effective_from"),
                    "effective_to": rec.get("effective_to"),
                    "min_charge": rec.get("min_charge"),
                    "max_charge": rec.get("max_charge"),
                    "conditions": rec.get("conditions"),
                    "applicable_payer": rec.get("applicable_payer")
                })

                # Check if record exists in tbl_soc_master for this soc_name + code
                cursor.execute("""
                    SELECT SOCID FROM tbl_soc_master WHERE SOCName = ? AND ServiceID = ?
                """, (soc_name, code))
                row = cursor.fetchone()

                if row:
                    # Update
                    cursor.execute("""
                        UPDATE tbl_soc_master 
                        SET ServiceName = ?, ServiceType = ?, Department = ?, StandardRate = ?, RatesJSON = ?, AliasName = ?
                        WHERE SOCID = ?
                    """, (name, category, dept, rate, rates_payload, alias_name, row["SOCID"]))
                    updated_count += 1
                else:
                    # Insert
                    cursor.execute("""
                        INSERT INTO tbl_soc_master (SOCName, ServiceID, ServiceName, ServiceType, Department, StandardRate, RatesJSON, AliasName)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (soc_name, code, name, category, dept, rate, rates_payload, alias_name))
                    inserted_count += 1

                # Synchronize into tbl_tariff_master
                cursor.execute("SELECT TariffID FROM tbl_tariff_master WHERE ServiceID = ?", (code,))
                t_row = cursor.fetchone()
                if t_row:
                    cursor.execute("UPDATE tbl_tariff_master SET ServiceName = ?, Rate = ? WHERE TariffID = ?", (name, rate, t_row["TariffID"]))
                else:
                    cursor.execute("INSERT INTO tbl_tariff_master (ServiceID, ServiceName, Rate) VALUES (?, ?, ?)", (code, name, rate))

            conn.commit()

            # Record audit log
            import_id = self.log_import(
                file_name=file_name,
                total=len(valid_records),
                success=inserted_count + updated_count,
                failed=0,
                user=user,
                status="Completed",
                details={
                    "soc_name": soc_name,
                    "inserted": inserted_count,
                    "updated": updated_count
                }
            )

            # Also persist to JSON cache file
            self.persist_to_json_cache(valid_records, soc_name)

            conn.close()

            return {
                "status": "success",
                "message": f"Successfully committed {inserted_count} new and updated {updated_count} tariff records.",
                "import_id": import_id,
                "inserted_count": inserted_count,
                "updated_count": updated_count,
                "total_committed": inserted_count + updated_count
            }

        except Exception as e:
            conn.rollback()
            conn.close()
            print(f"[TariffIntegrator] Transaction rollback due to error: {e}")
            return {
                "status": "error",
                "message": f"Database commit failed: {str(e)}",
                "inserted_count": 0,
                "updated_count": 0
            }

    def persist_to_json_cache(self, records: List[Dict[str, Any]], soc_name: str):
        """Updates the JSON file cache for offline/standalone mode."""
        try:
            existing_data = {}
            if os.path.exists(self.json_fallback_path):
                with open(self.json_fallback_path, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)

            if soc_name not in existing_data:
                existing_data[soc_name] = []

            # Merge records by service_code
            records_map = {r["service_code"]: r for r in existing_data[soc_name]}
            for r in records:
                records_map[r["service_code"]] = r

            existing_data[soc_name] = list(records_map.values())

            with open(self.json_fallback_path, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, indent=2)
        except Exception as e:
            print(f"[TariffIntegrator] Warning: Failed to write JSON fallback cache: {e}")
