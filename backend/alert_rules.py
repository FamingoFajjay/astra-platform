ALERT_RULES = {
    "GRB": {
        "label": "Gamma-ray burst report",
        "priority": "HIGH",
    },
    "NEUTRINO": {
        "label": "Neutrino-related report",
        "priority": "HIGH",
    },
    "SUPERNOVA": {
        "label": "Supernova-related report",
        "priority": "MEDIUM",
    },
    "X_RAY": {
        "label": "X-ray transient report",
        "priority": "MEDIUM",
    },
}


def evaluate_alert(record: dict) -> dict:
    event_type = record.get("event_type", "OTHER")
    rule = ALERT_RULES.get(event_type)

    if rule is None:
        return {
            "alert_match": False,
            "priority": "NONE",
            "rule_label": None,
        }

    return {
        "alert_match": True,
        "priority": rule["priority"],
        "rule_label": rule["label"],
    }
