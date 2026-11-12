from datetime import date, timedelta

from solar_client import (
    fetch_donki,
    normalize_flares,
    normalize_storms,
)
from database import (
    start_ingestion,
    finish_ingestion,
    save_solar_events,
    get_solar_stats,
)


def run_solar_ingestion():
    run_id = start_ingestion("solarpulse")

    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    print("[ASTRA] SolarPulse ingestion started")
    print(f"[ASTRA] Range: {start_date} to {end_date}")

    try:
        print("[ASTRA] Fetching solar flares...", flush=True)
        raw_flares = fetch_donki("FLR", start_date, end_date)

        print(f"[ASTRA] Received {len(raw_flares)} flares", flush=True)

        print("[ASTRA] Fetching geomagnetic storms...", flush=True)
        raw_storms = fetch_donki("GST", start_date, end_date)

        print(f"[ASTRA] Received {len(raw_storms)} storms", flush=True)

        flares = normalize_flares(raw_flares)
        storms = normalize_storms(raw_storms)
        records = flares + storms

        # An empty but valid DONKI response is possible.
        affected = save_solar_events(records)

        finish_ingestion(
            run_id=run_id,
            status="SUCCESS",
            records_fetched=len(records),
            rows_affected=affected,
        )

        print(f"[ASTRA] Solar flares: {len(flares)}")
        print(f"[ASTRA] Geomagnetic storms: {len(storms)}")
        print(f"[ASTRA] Rows affected: {affected}")
        print(f"[ASTRA] Statistics: {get_solar_stats()}")
        print("[ASTRA] SUCCESS")

    except Exception as exc:
        try:
            finish_ingestion(
                run_id=run_id,
                status="FAILED",
                error_message=(
                    f"{type(exc).__name__}: "
                    "SolarPulse ingestion failed; check server logs."
                ),
            )
        except Exception:
            print("[ASTRA] Could not record failure")
        raise


if __name__ == "__main__":
    run_solar_ingestion()
