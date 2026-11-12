import sqlite3
from datetime import datetime, timezone

from database import (
    get_connection,
    init_database,
)

PIPELINES = {
    "cosmicwatch": "asteroid_approaches",
    "solarpulse": "solar_events",
    "exoatlas": "exoplanets",
    "astroalert": "astro_circulars",
}


def get_system_status() -> dict:
    init_database()

    with get_connection() as conn:
        conn.execute("SELECT 1")

        pipelines = {}

        for name, table in PIPELINES.items():
            record_count = conn.execute(
                f"SELECT COUNT(*) FROM {table}"
            ).fetchone()[0]

            latest = conn.execute(
                """
                SELECT *
                FROM ingestion_runs
                WHERE pipeline = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (name,),
            ).fetchone()

            success = conn.execute(
                """
                SELECT finished_at
                FROM ingestion_runs
                WHERE pipeline = ?
                    AND status = 'SUCCESS'
                ORDER BY id DESC
                LIMIT 1
                """,
                (name,),
            ).fetchone()

            latest_success = (
                success["finished_at"] 
                if success 
                else None
            )

            age_hours = None

            if latest_success:
                updated = datetime.fromisoformat(
                    latest_success.replace("Z", "+00:00")
                )

                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)

                age_hours = round(
                    (
                        datetime.now(timezone.utc) - updated
                    ).total_seconds() / 3600,
                    2,
                )

            pipelines[name] = {
                "status": latest["status"] if latest else "NEVER_RUN",
                "last_success_at": latest_success,
                "age_hours": age_hours,
                "records_stored": record_count,
            }

        rows = conn.execute(
            """
            SELECT
                id,
                pipeline,
                status,
                started_at,
                finished_at,
                records_fetched,
                rows_affected,
                error_message
            FROM ingestion_runs
            ORDER BY id DESC
            LIMIT 20
            """
        ).fetchall()

        recent_runs = [dict(row) for row in rows]

    return {
        "database": {
            "status": "CONNECTED",
        },
        "pipelines": pipelines,
        "recent_runs": recent_runs,
    }