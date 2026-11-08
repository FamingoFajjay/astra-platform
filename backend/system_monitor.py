import sqlite3
from datetime import datetime, timezone

from database import (
    get_connection,
    init_database,
    get_recent_runs,
)


def get_system_status() -> dict:
    init_database()

    with get_connection() as conn:
        conn.execute("SELECT 1").fetchone()

        count = conn.execute(
            "SELECT COUNT(*) FROM asteroid_approaches"
        ).fetchone()[0]

    runs = get_recent_runs("cosmicwatch", limit=10)

    latest_success = next(
        (run for run in runs if run["status"] == "SUCCESS"),
        None,
    )

    # The latest successful run might be older than the
    # last ten runs, so query it independently.
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM ingestion_runs
            WHERE pipeline = 'cosmicwatch'
              AND status = 'SUCCESS'
            ORDER BY id DESC
            LIMIT 1
            """
        ).fetchone()

    if row:
        latest_success = dict(row)

    last_updated = (
        latest_success["finished_at"]
        if latest_success else None
    )

    age_hours = None

    if last_updated:
        updated = datetime.fromisoformat(last_updated)

        age_hours = round(
            (
                datetime.now(timezone.utc) - updated
            ).total_seconds() / 3600,
            2,
        )

    latest_run = runs[0] if runs else None

    return {
        "database": {
            "status": "CONNECTED",
            "asteroid_records": count,
        },
        "cosmicwatch": {
            "status": (
                latest_run["status"] if latest_run
                else "NEVER_RUN"
            ),
            "last_success_at": last_updated,
            "age_hours": age_hours,
            "records_stored": count,
            "recent_runs": runs,
        },
    }
