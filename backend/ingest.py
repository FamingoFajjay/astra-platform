from datetime import date, timedelta

from nasa_client import fetch_asteroids, normalize_asteroids
from database import (
    start_ingestion,
    finish_ingestion,
    save_asteroids,
    get_stats,
)
import requests


def safe_error_message(exc: Exception) -> str:
    """Describe failures without exposing URLs or API keys."""

    if isinstance(exc, requests.exceptions.HTTPError):
        response = exc.response

        if response is not None:
            status = response.status_code

            if status == 404:
                return (
                    "HTTP 404: DONKI endpoint not found. "
                    "Check the API URL."
                )

            if status == 429:
                return (
                    "HTTP 429: API rate limit exceeded."
                )

            if status >= 500:
                return (
                    f"HTTP {status}: NASA DONKI service "
                    "temporarily unavailable."
                )

            return f"HTTP {status}: DONKI request failed."

        return "HTTPError: Request failed without response."

    if isinstance(exc, requests.exceptions.Timeout):
        return "Timeout: NASA DONKI did not respond in time."

    if isinstance(exc, requests.exceptions.ConnectionError):
        return "ConnectionError: Could not connect to DONKI."

    if isinstance(exc, requests.exceptions.JSONDecodeError):
        return "JSONDecodeError: Invalid JSON from DONKI."

    return f"{type(exc).__name__}: SolarPulse ingestion failed."

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
                error_message=safe_error_message(exc),
            )
        except Exception:
            print("[ASTRA] WARNING: Could not record failure")
        print(f"[ASTRA] FAILED: {safe_error_message(exc)}", flush=True,)
        raise


if __name__ == "__main__":
    run_ingestion()
