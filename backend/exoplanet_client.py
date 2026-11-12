
import math

import requests

TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"

QUERY = """
SELECT
    pl_name,
    hostname,
    discoverymethod,
    disc_year,
    pl_rade,
    pl_orbper,
    pl_bmasse,
    sy_dist
FROM pscomppars
ORDER BY pl_name
"""


def fetch_exoplanets() -> list[dict]:
    """Fetch confirmed exoplanet composite parameters."""

    response = requests.get(
        TAP_URL,
        params={
            "query": QUERY,
            "format": "json",
        },
        timeout=(10, 90),
    )

    response.raise_for_status()
    data = response.json()

    if not isinstance(data, list):
        raise ValueError("Unexpected Exoplanet Archive response")

    return data


def clean_number(value):
    """Convert numeric values while rejecting non-finite numbers."""

    if value is None or value == "":
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    return number if math.isfinite(number) else None


def normalize_exoplanets(data: list[dict]) -> list[dict]:
    records = []

    for planet in data:
        name = planet.get("pl_name")
        hostname = planet.get("hostname")

        if not name or not hostname:
            continue

        year = clean_number(planet.get("disc_year"))

        records.append({
            "planet_name": str(name),
            "hostname": str(hostname),
            "discovery_method": planet.get("discoverymethod"),
            "discovery_year": int(year) if year is not None else None,
            "radius_earth": clean_number(planet.get("pl_rade")),
            "orbital_period_days": clean_number(planet.get("pl_orbper")),
            "mass_earth": clean_number(planet.get("pl_bmasse")),
            "distance_pc": clean_number(planet.get("sy_dist")),
        })

    return records
