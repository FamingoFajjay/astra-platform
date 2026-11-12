from gcn_normalizer import (
    classify_circular,
    normalize_circulars,
)

def test_classification():
    assert classify_circular(
        "GRB 261110A: optical observations"
    ) == "GRB"

    assert classify_circular(
        "IceCube-261020A: neutrino observation"
    ) == "NEUTRINO"

def test_normalization():
    raw = [{
        "circularId": 12345,
        "subject": "GRB 261110A: optical observations",
        "eventId": "GRB 261110A",
        "createdOn": 1794441600000,
        "submitter": "Test Researcher",
    }]

    result = normalize_circulars(raw)

    assert len(result) == 1
    assert result[0]["circular_id"] == 12345
    assert result[0]["event_type"] == "GRB"
    assert result[0]["source_url"].endswith("/12345")

def test_invalid_records():
    raw = [
        {"circularId": None, "subject": "Test"},
        {"circularId": 1, "subject": ""},
    ]

    assert normalize_circulars(raw) == []

def test_unknown_grb_label():
    assert classify_circular(
        "GRB TEST: optical observations"
    ) == "OTHER"
