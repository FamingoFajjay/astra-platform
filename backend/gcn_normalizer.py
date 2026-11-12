from datetime import datetime, timezone
import re

def classify_circular(subject: str) -> str:
    text = subject.upper()

    if re.search(r"\bGRB\s*\d{6}[A-Z]?\b", text):
        return "GRB"

    if "ICECUBE" in text or "NEUTRINO" in text:
        return "NEUTRINO"

    if "SUPERNOVA" in text or re.search(
        r"\bSN\s*20\d{2}[A-Z]+\b", text
    ):
        return "SUPERNOVA"

    if "X-RAY" in text or "X RAY" in text:
        return "X_RAY"

    return "OTHER"

def normalize_circulars(raw: list[dict]) -> list[dict]:
    records = []

    for item in raw:
        circular_id = item.get("circularId")
        subject = item.get("subject")
        created_on = item.get("createdOn")

        if (
            type(circular_id) is not int
            or circular_id <= 0
            or not isinstance(subject, str)
            or not subject.strip()
            or type(created_on) not in (int, float)
            or created_on <= 0
        ):
            continue

        try:
            published_at = datetime.fromtimestamp(
                created_on / 1000,
                tz=timezone.utc,
            ).isoformat()
        except (OverflowError, ValueError, OSError):
            continue

        records.append({
            "circular_id": circular_id,
            "subject": subject.strip(),
            "event_id": item.get("eventId"),
            "event_type": classify_circular(subject),
            "published_at": published_at,
            "submitter": item.get("submitter"),
            "source_url": (
                f"https://gcn.nasa.gov/circulars/{circular_id}"
            ),
        })

    return records
