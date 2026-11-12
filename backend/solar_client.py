import os
from datetime import date

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv()

DONKI_URL = "https://ccmc.gsfc.nasa.gov/DONKI/WS/get"

def fetch_donki(
    event_type: str,
    start_date: date,
    end_date: date,
) -> list[dict]:
    if event_type not in {"FLR", "GST"}:
        raise ValueError("Unsupported DONKI event type")

    if end_date < start_date:
        raise ValueError("Invalid date range")

    response = requests.get(
        f"{DONKI_URL}/{event_type}",
        params={
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
        },
        timeout=(10, 30),
    )

    print(
        f"[DONKI] {event_type}: HTTP {response.status_code}",
        flush=True,
    )

    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise ValueError("Unexpected DONKI response")

    return data

def normalize_flares(events: list[dict]) -> list[dict]:
    records = []

    for event in events:
        if not event.get("flrID") or not event.get("beginTime"):
            continue

        records.append({
            "event_id": event["flrID"],
            "event_type": "FLR",
            "start_time": event["beginTime"],
            "peak_time": event.get("peakTime"),
            "end_time": event.get("endTime"),
            "classification": event.get("classType"),
            "source_location": event.get("sourceLocation"),
            "active_region": (
                str(event["activeRegionNum"])
                if event.get("activeRegionNum") is not None
                else None
            ),
            "kp_max": None,
            "source_url": event.get("link"),
        })

    return records


def normalize_storms(events: list[dict]) -> list[dict]:
    records = []

    for event in events:
        if not event.get("gstID") or not event.get("startTime"):
            continue

        kp_values = [
            item["kpIndex"]
            for item in event.get("allKpIndex", [])
            if isinstance(item, dict)
            and isinstance(item.get("kpIndex"), (int, float))
            and not isinstance(item["kpIndex"], bool)
        ]

        records.append({
            "event_id": event["gstID"],
            "event_type": "GST",
            "start_time": event["startTime"],
            "peak_time": None,
            "end_time": None,
            "classification": None,
            "source_location": None,
            "active_region": None,
            "kp_max": max(kp_values) if kp_values else None,
            "source_url": event.get("link"),
        })

    return records
