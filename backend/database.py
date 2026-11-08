import sqlite3
from pathlib import Path

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


def get_asteroids(
    limit: int = 100,
    hazardous_only: bool = False,
) -> list[dict]:
    init_database()

    query = """
        SELECT *
        FROM asteroid_approaches
        WHERE (? = 0 OR hazardous = 1)
        ORDER BY approach_date DESC, approach_datetime DESC
        LIMIT ?
    """

    with get_connection() as conn:
        rows = conn.execute(
            query,
            (int(hazardous_only), limit),
        ).fetchall()

    return [dict(row) for row in rows]


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
