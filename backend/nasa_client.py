
import os
from datetime import date, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

NASA_URL = "https://api.nasa.gov/neo/rest/v1/feed"


def fetch_asteroids(
    start_date: date,
    end_date: date,
) -> dict:
    """Fetch close-approach data from NASA NeoWs."""

    if end_date < start_date:
        raise ValueError("End date must not precede start date")

    if (end_date - start_date).days > 7:
        raise ValueError("NeoWs feed supports a maximum 7-day span")

    params = {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "api_key": os.getenv("NASA_API_KEY", "DEMO_KEY"),
    }

    response = requests.get(
        NASA_URL,
        params=params,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()

    if not isinstance(data.get("near_earth_objects"), dict):
        raise ValueError("Unexpected NASA API response")

    return data


def normalize_asteroids(data: dict) -> list[dict]:
    """Convert nested NASA JSON into flat approach records."""

    records = []

    for objects in data["near_earth_objects"].values():
        for asteroid in objects:
            diameter = asteroid["estimated_diameter"]["meters"]

            for approach in asteroid["close_approach_data"]:
                if approach.get("orbiting_body") != "Earth":
                    continue

                records.append({
                    "asteroid_id": str(asteroid["id"]),
                    "name": asteroid["name"],
                    "approach_date": approach["close_approach_date"],
                    "approach_datetime": (
                        approach["close_approach_date_full"]
                    ),
                    "miss_distance_km": float(
                        approach["miss_distance"]["kilometers"]
                    ),
                    "velocity_kmh": float(
                        approach["relative_velocity"][
                            "kilometers_per_hour"
                        ]
                    ),
                    "diameter_min_m": float(
                        diameter["estimated_diameter_min"]
                    ),
                    "diameter_max_m": float(
                        diameter["estimated_diameter_max"]
                    ),
                    "hazardous": bool(
                        asteroid["is_potentially_hazardous_asteroid"]
                    ),
                })

    return records


if __name__ == "__main__":
    today = date.today()
    end = today + timedelta(days=6)

    print(f"Fetching NASA data: {today} to {end}")

    raw_data = fetch_asteroids(today, end)
    records = normalize_asteroids(raw_data)

    print(f"Close-approach records: {len(records)}")

    if records:
        print("Example:", records[0])
