import sqlite3
import json
import os
from typing import List, Optional, Dict, Any
from models import Scenario, Station, Train, PlatformClosure, DisruptionEvent
from station_data import get_benchmark_scenarios

DB_PATH = os.path.join(os.path.dirname(__file__), "railflow.db")

class RailFlowDatabase:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._shared_conn = None
        if db_path == ":memory:":
            self._shared_conn = sqlite3.connect(":memory:")
            self._shared_conn.row_factory = sqlite3.Row
        self._init_db()

    def _get_connection(self):
        if self._shared_conn:
            return self._shared_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                data_json TEXT NOT NULL,
                is_benchmark INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id TEXT,
                solver_used TEXT,
                solver_time_ms REAL,
                total_delay_minutes INTEGER,
                platform_swaps INTEGER,
                safety_score REAL,
                summary_message TEXT,
                details_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            conn.commit()

        # Seed benchmarks if empty
        self._seed_benchmarks()

    def _seed_benchmarks(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM scenarios WHERE is_benchmark = 1")
            row = cursor.fetchone()
            if row["count"] == 0:
                benchmarks = get_benchmark_scenarios()
                for b in benchmarks:
                    self.save_scenario(b)

    def save_scenario(self, scenario: Scenario) -> bool:
        scenario_data = scenario.model_dump()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO scenarios (id, name, description, data_json, is_benchmark)
            VALUES (?, ?, ?, ?, ?)
            """, (
                scenario.id,
                scenario.name,
                scenario.description,
                json.dumps(scenario_data),
                1 if scenario.is_benchmark else 0
            ))
            conn.commit()
            return True

    def get_scenario(self, scenario_id: str) -> Optional[Scenario]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM scenarios WHERE id = ?", (scenario_id,))
            row = cursor.fetchone()
            if row:
                data = json.loads(row["data_json"])
                return Scenario(**data)
            return None

    def list_scenarios(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, name, description, is_benchmark, created_at 
            FROM scenarios 
            ORDER BY is_benchmark DESC, created_at DESC
            """)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def delete_scenario(self, scenario_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM scenarios WHERE id = ? AND is_benchmark = 0", (scenario_id,))
            conn.commit()
            return cursor.rowcount > 0

    def log_audit(self, scenario_id: str, solver_used: str, solver_time_ms: float,
                  total_delay: int, platform_swaps: int, safety_score: float,
                  summary_message: str, details: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO audit_logs (scenario_id, solver_used, solver_time_ms, total_delay_minutes, platform_swaps, safety_score, summary_message, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scenario_id,
                solver_used,
                solver_time_ms,
                total_delay,
                platform_swaps,
                safety_score,
                summary_message,
                json.dumps(details)
            ))
            conn.commit()

    def get_audit_logs(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT id, scenario_id, solver_used, solver_time_ms, total_delay_minutes, platform_swaps, safety_score, summary_message, created_at
            FROM audit_logs
            ORDER BY created_at DESC
            LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
