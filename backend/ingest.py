from datetime import date, timedelta

from nasa_client import fetch_asteroids, normalize_asteroids
from database import (
    start_ingestion,
    finish_ingestion,
    save_asteroids,
    get_stats,
)


def run_ingestion():
    run_id = start_ingestion("cosmicwatch")

    start_date = date.today()
    end_date = start_date + timedelta(days=6)

    print("[ASTRA] CosmicWatch ingestion started")
    print(f"[ASTRA] Date range: {start_date} to {end_date}")

    try:
        raw_data = fetch_asteroids(start_date, end_date)
        records = normalize_asteroids(raw_data)

        # Guard against silently treating malformed/empty
        # responses as successful ingestion.
        if not records:
            raise ValueError("No Earth close-approach records returned")

        affected = save_asteroids(records)

        finish_ingestion(
            run_id=run_id,
            status="SUCCESS",
            records_fetched=len(records),
            rows_affected=affected,
        )

        print(f"[ASTRA] Fetched: {len(records)}")
        print(f"[ASTRA] Rows affected: {affected}")
        print(f"[ASTRA] Statistics: {get_stats()}")
        print("[ASTRA] SUCCESS")

    except Exception as exc:
        try:
            finish_ingestion(
                run_id=run_id,
                status="FAILED",
                error_message=str(exc)[:500],
            )
        except Exception:
            print("[ASTRA] WARNING: Could not record failure")
        print(f"[ASTRA] FAILED: {exc}")
        raise


if __name__ == "__main__":
    run_ingestion()
