
from exoplanet_client import (
    fetch_exoplanets,
    normalize_exoplanets,
)
from database import (
    start_ingestion,
    finish_ingestion,
    save_exoplanets,
    get_exoplanet_stats,
)


def run_exoplanet_ingestion():
    run_id = start_ingestion("exoatlas")

    print("[ASTRA] ExoAtlas ingestion started", flush=True)

    try:
        print("[ASTRA] Fetching NASA Exoplanet Archive...", flush=True)

        raw = fetch_exoplanets()
        records = normalize_exoplanets(raw)

        if not records:
            raise ValueError("No valid exoplanet records returned")

        affected = save_exoplanets(records)

        finish_ingestion(
            run_id=run_id,
            status="SUCCESS",
            records_fetched=len(records),
            rows_affected=affected,
        )

        print(f"[ASTRA] Planets fetched: {len(records)}")
        print(f"[ASTRA] Rows affected: {affected}")
        print(f"[ASTRA] Stats: {get_exoplanet_stats()}")
        print("[ASTRA] SUCCESS")

    except Exception as exc:
        try:
            finish_ingestion(
                run_id=run_id,
                status="FAILED",
                error_message=(
                    f"{type(exc).__name__}: "
                    "ExoAtlas ingestion failed"
                ),
            )
        except Exception:
            print("[ASTRA] Could not record failure")
        raise


if __name__ == "__main__":
    run_exoplanet_ingestion()
