import argparse
import requests

from gcn_client import (
    fetch_circular,
    load_circulars_file,
)
from gcn_normalizer import normalize_circulars
from alert_rules import evaluate_alert
from database import (
    start_ingestion,
    finish_ingestion,
    save_circulars,
    get_circular_stats,
)


def safe_error(exc: Exception) -> str:
    if isinstance(exc, requests.exceptions.HTTPError):
        response = exc.response
        if response is not None:
            return f"HTTP {response.status_code}: GCN request failed"
        return "HTTPError: GCN request failed"

    if isinstance(exc, requests.exceptions.Timeout):
        return "Timeout: GCN request timed out"

    if isinstance(exc, requests.exceptions.ConnectionError):
        return "ConnectionError: GCN connection failed"

    return f"{type(exc).__name__}: AstroAlert ingestion failed"


def run_ingestion(raw: list[dict]) -> None:
    run_id = start_ingestion("astroalert")

    print("[ASTRA] AstroAlert ingestion started", flush=True)

    try:
        records = normalize_circulars(raw)

        if not records:
            raise ValueError("No valid GCN circulars")

        for record in records:
            record.update(evaluate_alert(record))

        affected = save_circulars(records)

        finish_ingestion(
            run_id=run_id,
            status="SUCCESS",
            records_fetched=len(records),
            rows_affected=affected,
        )

        print(f"[ASTRA] Circulars: {len(records)}")
        print(f"[ASTRA] Rows affected: {affected}")
        print(f"[ASTRA] Stats: {get_circular_stats()}")
        print("[ASTRA] SUCCESS")

    except Exception as exc:
        try:
            finish_ingestion(
                run_id=run_id,
                status="FAILED",
                error_message=safe_error(exc),
            )
        except Exception:
            print("[ASTRA] Could not record failure")

        raise


def main():
    parser = argparse.ArgumentParser()

    source = parser.add_mutually_exclusive_group(required=True)

    source.add_argument(
        "--file",
        help="Path to an official GCN JSON export",
    )
    source.add_argument(
        "--circular-id",
        type=int,
        help="Fetch one GCN Circular by ID",
    )

    args = parser.parse_args()

    if args.file:
        raw = load_circulars_file(args.file)
    else:
        raw = [fetch_circular(args.circular_id)]

    run_ingestion(raw)


if __name__ == "__main__":
    main()
