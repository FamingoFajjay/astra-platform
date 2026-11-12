import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import database
from system_monitor import get_system_status


def test_successful_ingestion(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "monitor_test.db",
    )

    run_id = database.start_ingestion("cosmicwatch")

    database.finish_ingestion(
        run_id,
        status="SUCCESS",
        records_fetched=42,
        rows_affected=42,
    )

    runs = database.get_recent_runs()

    assert len(runs) == 1
    assert runs[0]["status"] == "SUCCESS"
    assert runs[0]["records_fetched"] == 42
    assert runs[0]["finished_at"] is not None


def test_failed_ingestion(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "failure_test.db",
    )

    run_id = database.start_ingestion("cosmicwatch")

    database.finish_ingestion(
        run_id,
        status="FAILED",
        error_message="Simulated network failure",
    )

    runs = database.get_recent_runs()

    assert runs[0]["status"] == "FAILED"
    assert runs[0]["error_message"] == "Simulated network failure"



def test_system_status(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "status_test.db",
    )

    run_id = database.start_ingestion("cosmicwatch")

    database.finish_ingestion(
        run_id,
        status="SUCCESS",
        records_fetched=5,
    )

    status = get_system_status()

    assert status["database"]["status"] == "CONNECTED"

    cosmicwatch = status["pipelines"]["cosmicwatch"]

    assert cosmicwatch["status"] == "SUCCESS"
    assert cosmicwatch["last_success_at"] is not None
    assert cosmicwatch["age_hours"] is not None

    assert "solarpulse" in status["pipelines"]
    assert "exoatlas" in status["pipelines"]
    assert "astroalert" in status["pipelines"]

    assert isinstance(status["recent_runs"], list)

    assert any(
        run["pipeline"] == "cosmicwatch"
        and run["status"] == "SUCCESS"
        for run in status["recent_runs"]
    )
