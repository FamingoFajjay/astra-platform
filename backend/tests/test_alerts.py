
import database

from gcn_normalizer import (
    classify_circular,
    normalize_circulars,
)
from alert_rules import evaluate_alert


def sample_raw():
    return [{
        "circularId": 12345,
        "subject": "GRB 261110A: optical observations",
        "eventId": "GRB 261110A",
        "createdOn": 1794441600000,
        "submitter": "Test Researcher",
    }]


def test_classification():
    assert classify_circular(
        "GRB 261110A: optical observations"
    ) == "GRB"

    assert classify_circular(
        "IceCube neutrino observations"
    ) == "NEUTRINO"

    assert classify_circular(
        "General observation report"
    ) == "OTHER"


def test_alert_rules():
    result = evaluate_alert({
        "event_type": "GRB",
    })

    assert result["alert_match"] is True
    assert result["priority"] == "HIGH"

    other = evaluate_alert({
        "event_type": "OTHER",
    })

    assert other["alert_match"] is False


def test_normalization():
    records = normalize_circulars(sample_raw())

    assert len(records) == 1
    assert records[0]["circular_id"] == 12345
    assert records[0]["event_type"] == "GRB"


def test_database_upsert(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "alerts_test.db",
    )

    record = normalize_circulars(sample_raw())[0]
    record.update(evaluate_alert(record))

    database.save_circulars([record])
    database.save_circulars([record])

    stats = database.get_circular_stats()

    assert stats["total_circulars"] == 1
    assert stats["alert_matches"] == 1


def test_search_and_filter(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DB_PATH",
        tmp_path / "alerts_filter.db",
    )

    record = normalize_circulars(sample_raw())[0]
    record.update(evaluate_alert(record))

    database.save_circulars([record])

    result = database.get_circulars(
        search="261110A",
        event_type="GRB",
        alerts_only=True,
    )

    assert len(result) == 1
    assert result[0]["circular_id"] == 12345
