
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import database
from nasa_client import normalize_asteroids


def sample_record():
    return {
        "asteroid_id": "12345",
        "name": "Test Asteroid",
        "approach_date": "2026-11-08",
        "approach_datetime": "2026-Nov-08 12:00",
        "miss_distance_km": 1000000.0,
        "velocity_kmh": 25000.0,
        "diameter_min_m": 50.0,
        "diameter_max_m": 100.0,
        "hazardous": False,
    }


def test_normalize_asteroids():
    record = sample_record()

    raw = {
        "near_earth_objects": {
            "2026-11-08": [{
                "id": record["asteroid_id"],
                "name": record["name"],
                "is_potentially_hazardous_asteroid": False,
                "estimated_diameter": {
                    "meters": {
                        "estimated_diameter_min": 50,
                        "estimated_diameter_max": 100,
                    }
                },
                "close_approach_data": [{
                    "close_approach_date": "2026-11-08",
                    "close_approach_date_full": "2026-Nov-08 12:00",
                    "orbiting_body": "Earth",
                    "miss_distance": {"kilometers": "1000000"},
                    "relative_velocity": {
                        "kilometers_per_hour": "25000"
                    },
                }],
            }]
        }
    }

    result = normalize_asteroids(raw)

    assert len(result) == 1
    assert result[0]["asteroid_id"] == "12345"
    assert result[0]["miss_distance_km"] == 1000000.0
    assert result[0]["hazardous"] is False


def test_database_upsert(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "test_astra.db",
    )

    record = sample_record()

    database.save_asteroids([record])
    database.save_asteroids([record])

    stats = database.get_stats()

    assert stats["total_approaches"] == 1
    assert stats["unique_asteroids"] == 1

    updated = {**record, "velocity_kmh": 30000.0}
    database.save_asteroids([updated])

    rows = database.get_asteroids()

    assert len(rows) == 1
    assert rows[0]["velocity_kmh"] == 30000.0


def test_hazardous_filter(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "test_astra.db",
    )

    safe = sample_record()
    hazardous = {
        **sample_record(),
        "asteroid_id": "67890",
        "hazardous": True,
    }

    database.save_asteroids([safe, hazardous])

    assert len(database.get_asteroids()) == 2

    filtered = database.get_asteroids(hazardous_only=True)

    assert len(filtered) == 1
    assert filtered[0]["asteroid_id"] == "67890"


def test_search_and_sort(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "test_search.db",
    )

    first = {
        **sample_record(),
        "asteroid_id": "100",
        "name": "Asteroid Alpha",
        "miss_distance_km": 5000000.0,
    }

    second = {
        **sample_record(),
        "asteroid_id": "200",
        "name": "Asteroid Beta",
        "miss_distance_km": 1000000.0,
    }

    database.save_asteroids([first, second])

    searched = database.get_asteroids(search="alpha")

    assert len(searched) == 1
    assert searched[0]["asteroid_id"] == "100"

    sorted_rows = database.get_asteroids(
        sort_by="miss_distance_km",
        sort_order="asc",
    )

    assert sorted_rows[0]["asteroid_id"] == "200"


def test_date_filter(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "test_dates.db",
    )

    first = sample_record()

    second = {
        **sample_record(),
        "asteroid_id": "999",
        "approach_date": "2026-11-10",
        "approach_datetime": "2026-Nov-10 12:00",
    }

    database.save_asteroids([first, second])

    rows = database.get_asteroids(
        start_date="2026-11-09",
        end_date="2026-11-11",
    )

    assert len(rows) == 1
    assert rows[0]["asteroid_id"] == "999"


def test_invalid_sort_column():
    import pytest

    with pytest.raises(ValueError):
        database.get_asteroids(
            sort_by="DROP TABLE asteroid_approaches"
        )