
import json
from pathlib import Path

import requests


GCN_BASE_URL = "https://gcn.nasa.gov"

def fetch_circular(circular_id: int) -> dict:
    """
    Fetch one GCN Circular from a JSON endpoint.

    Use only after confirming the endpoint returns
    a JSON object with the expected fields.
    """
    if circular_id <= 0:
        raise ValueError("Circular ID must be positive")

    url = f"{GCN_BASE_URL}/circulars/{circular_id}.json"

    response = requests.get(
        url,
        timeout=(10, 30),
        headers={"Accept": "application/json"},
    )
    response.raise_for_status()

    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object")

    if "circularId" not in data:
        raise ValueError("Missing circularId")

    if data["circularId"] != circular_id:
        raise ValueError("Circular ID mismatch")

    return data

def load_circulars_file(path: str | Path) -> list[dict]:
    """
    Load an official GCN JSON export from disk.
    Does not make network requests.
    """
    path = Path(path)

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if isinstance(data, dict):
        data = [data]

    if not isinstance(data, list):
        raise ValueError("Expected a JSON array or object")

    if not all(isinstance(item, dict) for item in data):
        raise ValueError("All circulars must be JSON objects")

    return data
