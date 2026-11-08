from datetime import date, timedelta

from nasa_client import fetch_asteroids, normalize_asteroids
from database import save_asteroids, get_stats


def run_ingestion():
    start_date = date.today()
    end_date = start_date + timedelta(days=6)

    print("[ASTRA] Starting CosmicWatch ingestion")
    print(f"[ASTRA] Date range: {start_date} to {end_date}")

    raw_data = fetch_asteroids(start_date, end_date)
    records = normalize_asteroids(raw_data)

    print(f"[ASTRA] Fetched {len(records)} approach records")

    changed = save_asteroids(records)

    print(f"[ASTRA] Database rows inserted or updated: {changed}")
    print(f"[ASTRA] Current statistics: {get_stats()}")
    print("[ASTRA] Ingestion complete")


if __name__ == "__main__":
    run_ingestion()
