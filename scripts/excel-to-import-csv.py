#!/usr/bin/env python3
"""Convert the NPPA LPD 2026 Sponsor Tracker workbook into a CSV that the CRM's
in-app importer (/admin/events/[id]/import) can ingest.

Usage:
    python3 scripts/excel-to-import-csv.py <input.xlsx> <output.csv>

Only the "Master List" sheet is read. Status/tier values are remapped to the
CRM's enum/tier vocabulary; HQ city/state/country are composed into a single
hq_location string. Output column names match the importer's recognized headers.
The output CSV contains contact PII — do not commit it.
"""
import csv
import sys
from datetime import date, datetime

import openpyxl

STATUS_MAP = {
    "not contacted": "prospect",
    "contacted": "contacted",
    "engaged": "engaged",
    "proposal sent": "proposal_sent",
    "negotiating": "negotiating",
    "committed": "committed",
    "confirmed": "confirmed",
    "declined": "declined",
    "past sponsor": "past_sponsor",
}

PRIORITY_MAP = {"high": "high", "medium": "medium", "low": "low"}

# Sponsorship targets that map to a real tier; anything else (e.g. "Unknown") -> blank.
VALID_TIERS = {"platinum", "gold", "silver", "bronze"}

OUTPUT_COLUMNS = [
    "name",
    "website",
    "industry",
    "subcategory",
    "status",
    "priority",
    "owner",
    "target_tier",
    "hq_location",
    "why_they_should_attend",
    "key_talking_points",
    "email_angle",
    "sponsorship_hook",
    "relationship_notes",
    "first_contacted_at",
    "last_contacted_at",
    "contact1_first_name",
    "contact1_last_name",
    "contact1_email",
    "contact1_title",
    "contact1_phone",
    "contact1_linkedin",
    "contact2_first_name",
    "contact2_last_name",
    "contact2_email",
    "contact2_title",
    "contact2_phone",
    "contact2_linkedin",
]


def s(v):
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.date().isoformat() if isinstance(v, datetime) else v.isoformat()
    return str(v).strip()


def compose_hq(city, state, country):
    parts = [p for p in (s(city), s(state), s(country)) if p]
    return ", ".join(parts)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    in_path, out_path = sys.argv[1], sys.argv[2]

    wb = openpyxl.load_workbook(in_path, data_only=True, read_only=True)
    ws = wb["🎯 Master List"]
    rows = list(ws.iter_rows(values_only=True))
    header = rows[0]
    ncol = max(i for i, h in enumerate(header) if h) + 1
    header = [s(h) for h in header[:ncol]]
    idx = {h: i for i, h in enumerate(header)}

    def cell(row, name):
        i = idx.get(name)
        return row[i] if i is not None and i < len(row) else None

    out_rows = []
    skipped = 0
    for row in rows[1:]:
        if not any(c not in (None, "") for c in row[:ncol]):
            continue
        name = s(cell(row, "Company"))
        if not name:
            skipped += 1
            continue

        status_raw = s(cell(row, "📊 Status")).lower()
        status = STATUS_MAP.get(status_raw, "")
        priority = PRIORITY_MAP.get(s(cell(row, "Priority")).lower(), "")
        tier_raw = s(cell(row, "Sponsorship Target")).lower()
        target_tier = tier_raw.capitalize() if tier_raw in VALID_TIERS else ""

        # First/last contact dates: prefer explicit columns, fall back to "Date Contacted".
        first_contact = s(cell(row, "📅 First Contact")) or s(cell(row, "📅 Date Contacted"))
        last_contact = s(cell(row, "📅 Last Contact"))

        out_rows.append({
            "name": name,
            "website": s(cell(row, "Website")),
            "industry": s(cell(row, "Category")),
            "subcategory": s(cell(row, "Subcategory")),
            "status": status,
            "priority": priority,
            "owner": s(cell(row, "👤 Owner")),
            "target_tier": target_tier,
            "hq_location": compose_hq(
                cell(row, "HQ City"), cell(row, "HQ State/Province"), cell(row, "HQ Country")
            ),
            "why_they_should_attend": s(cell(row, "Why They Should Attend")),
            "key_talking_points": s(cell(row, "Key Talking Points")),
            "email_angle": s(cell(row, "Email Angle")),
            "sponsorship_hook": s(cell(row, "Sponsorship Hook")),
            "relationship_notes": s(cell(row, "Outreach Notes")),
            "first_contacted_at": first_contact,
            "last_contacted_at": last_contact,
            "contact1_first_name": s(cell(row, "Contact 1 First Name")),
            "contact1_last_name": s(cell(row, "Contact 1 Last Name")),
            "contact1_email": s(cell(row, "Contact 1 Email")),
            "contact1_title": s(cell(row, "Contact 1 Title")),
            "contact1_phone": s(cell(row, "Contact 1 Phone")),
            "contact1_linkedin": s(cell(row, "Contact 1 LinkedIn")),
            "contact2_first_name": s(cell(row, "Contact 2 First Name")),
            "contact2_last_name": s(cell(row, "Contact 2 Last Name")),
            "contact2_email": s(cell(row, "Contact 2 Email")),
            "contact2_title": s(cell(row, "Contact 2 Title")),
            "contact2_phone": s(cell(row, "Contact 2 Phone")),
            "contact2_linkedin": s(cell(row, "Contact 2 LinkedIn")),
        })

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS)
        w.writeheader()
        w.writerows(out_rows)

    print(f"Wrote {len(out_rows)} rows to {out_path} ({skipped} blank rows skipped).")


if __name__ == "__main__":
    main()
