import sqlite3
from pathlib import Path
from datetime import datetime, timezone

DB_PATH = Path(__file__).resolve().parent / "data" / "astra.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    return connection


def init_database():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS asteroid_approaches (
                asteroid_id TEXT NOT NULL,
                name TEXT NOT NULL,
                approach_date TEXT NOT NULL,
                approach_datetime TEXT NOT NULL,
                miss_distance_km REAL NOT NULL,
                velocity_kmh REAL NOT NULL,
                diameter_min_m REAL NOT NULL,
                diameter_max_m REAL NOT NULL,
                hazardous INTEGER NOT NULL,
                PRIMARY KEY (asteroid_id, approach_datetime)
            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_approach_date
            ON asteroid_approaches (approach_date)
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline TEXT NOT NULL,
                status TEXT NOT NULL 
                    CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
                started_at TEXT NOT NULL,
                finished_at TEXT,
                records_fetched INTEGER NOT NULL DEFAULT 0,
                rows_affected INTEGER NOT NULL DEFAULT 0,
                error_message TEXT,
                CHECK (
                    (status = 'RUNNING' AND finished_at IS NULL)
                    OR
                    (status != 'RUNNING' AND finished_at IS NOT NULL)
                )
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS solar_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL
                    CHECK (event_type IN ('FLR', 'GST')),
                start_time TEXT NOT NULL,
                peak_time TEXT,
                end_time TEXT,
                classification TEXT,
                source_location TEXT,
                active_region TEXT,
                kp_max REAL,
                source_url TEXT
            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_solar_events_time
            ON solar_events (start_time)
        """)



def save_asteroids(records: list[dict]) -> int:
    init_database()

    with get_connection() as conn:
        before = conn.total_changes

        conn.executemany("""
            INSERT INTO asteroid_approaches (
                asteroid_id,
                name,
                approach_date,
                approach_datetime,
                miss_distance_km,
                velocity_kmh,
                diameter_min_m,
                diameter_max_m,
                hazardous
            )
            VALUES (
                :asteroid_id,
                :name,
                :approach_date,
                :approach_datetime,
                :miss_distance_km,
                :velocity_kmh,
                :diameter_min_m,
                :diameter_max_m,
                :hazardous
            )
            ON CONFLICT(asteroid_id, approach_datetime)
            DO UPDATE SET
                name = excluded.name,
                approach_date = excluded.approach_date,
                miss_distance_km = excluded.miss_distance_km,
                velocity_kmh = excluded.velocity_kmh,
                diameter_min_m = excluded.diameter_min_m,
                diameter_max_m = excluded.diameter_max_m,
                hazardous = excluded.hazardous
        """, records)

        return conn.total_changes - before


def get_stats() -> dict:
    init_database()

    with get_connection() as conn:
        row = conn.execute("""
            SELECT
                COUNT(*) AS total_approaches,
                COUNT(DISTINCT asteroid_id) AS unique_asteroids,
                COALESCE(SUM(hazardous), 0) AS hazardous_approaches,
                MIN(miss_distance_km) AS closest_distance_km
            FROM asteroid_approaches
        """).fetchone()

    return dict(row)

def get_asteroids(
    limit: int = 500,
    hazardous_only: bool = False,
    start_date: str | None = None,
    end_date: str | None = None,
    search: str = "",
    sort_by: str = "approach_datetime",
    sort_order: str = "desc",
) -> list[dict]:
    init_database()

    allowed_columns = {
        "approach_datetime",
        "miss_distance_km",
        "velocity_kmh",
        "diameter_max_m",
        "name",
    }

    if sort_by not in allowed_columns:
        raise ValueError("Invalid sort column")

    if sort_order not in {"asc", "desc"}:
        raise ValueError("Invalid sort order")

    conditions = []
    params = []

    if hazardous_only:
        conditions.append("hazardous = 1")

    if start_date:
        conditions.append("approach_date >= ?")
        params.append(start_date)

    if end_date:
        conditions.append("approach_date <= ?")
        params.append(end_date)

    if search.strip():
        conditions.append("(LOWER(name) LIKE ? OR asteroid_id LIKE ?)")
        term = f"%{search.strip().lower()}%"
        params.extend([term, term])

    where_clause = ("WHERE " + " AND ".join(conditions) if conditions else "")
    query = f"""
        SELECT *
        FROM asteroid_approaches
        {where_clause}
        ORDER BY {sort_by} {sort_order.upper()}, asteroid_id ASC
        LIMIT ?
    """
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    return [dict(row) for row in rows]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def start_ingestion(pipeline: str) -> int:
    init_database()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO ingestion_runs
                (pipeline, status, started_at)
            VALUES (?, 'RUNNING', ?)
            """,
            (pipeline, utc_now()),
        )
        return cursor.lastrowid


def finish_ingestion(
    run_id: int,
    status: str,
    records_fetched: int = 0,
    rows_affected: int = 0,
    error_message: str | None = None,
) -> None:
    if status not in {"SUCCESS", "FAILED"}:
        raise ValueError("Invalid final ingestion status")

    init_database()

    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE ingestion_runs
            SET status = ?,
                finished_at = ?,
                records_fetched = ?,
                rows_affected = ?,
                error_message = ?
            WHERE id = ? AND status = 'RUNNING'
            """,
            (
                status,
                utc_now(),
                records_fetched,
                rows_affected,
                error_message,
                run_id,
            ),
        )

        if cursor.rowcount != 1:
            raise ValueError("Ingestion run not found or already finished")


def get_recent_runs(
    pipeline: str = "cosmicwatch",
    limit: int = 10,
) -> list[dict]:
    init_database()

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM ingestion_runs
            WHERE pipeline = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (pipeline, limit),
        ).fetchall()

    return [dict(row) for row in rows]


def save_solar_events(records: list[dict]) -> int:
    init_database()

    with get_connection() as conn:
        before = conn.total_changes

        conn.executemany("""
            INSERT INTO solar_events (
                event_id, event_type, start_time,
                peak_time, end_time, classification,
                source_location, active_region,
                kp_max, source_url
            )
            VALUES (
                :event_id, :event_type, :start_time,
                :peak_time, :end_time, :classification,
                :source_location, :active_region,
                :kp_max, :source_url
            )
            ON CONFLICT(event_id) DO UPDATE SET
                event_type = excluded.event_type,
                start_time = excluded.start_time,
                peak_time = excluded.peak_time,
                end_time = excluded.end_time,
                classification = excluded.classification,
                source_location = excluded.source_location,
                active_region = excluded.active_region,
                kp_max = excluded.kp_max,
                source_url = excluded.source_url
        """, records)

        return conn.total_changes - before


def get_solar_events(
    event_type: str | None = None,
    limit: int = 200,
) -> list[dict]:
    init_database()

    with get_connection() as conn:
        rows = conn.execute("""
            SELECT *
            FROM solar_events
            WHERE (? IS NULL OR event_type = ?)
            ORDER BY start_time DESC, event_id DESC
            LIMIT ?
        """, (event_type, event_type, limit)).fetchall()

    return [dict(row) for row in rows]


def get_solar_stats() -> dict:
    init_database()

    with get_connection() as conn:
        row = conn.execute("""
            SELECT
                COUNT(*) AS total_events,
                COALESCE(SUM(event_type = 'FLR'), 0)
                    AS solar_flares,
                COALESCE(SUM(event_type = 'GST'), 0)
                    AS geomagnetic_storms,
                MAX(start_time) AS latest_event_time
            FROM solar_events
        """).fetchone()

    return dict(row)
