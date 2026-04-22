import argparse
import json
from typing import Any, Dict

from pypdf import PdfReader, PdfWriter


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _to_pdf_value(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, list):
        # Keep it readable if someone mapped missing_info_needed to a field
        return "\n".join(str(x) for x in v)
    return str(v)


def main() -> None:
    ap = argparse.ArgumentParser(description="Fill a PDF AcroForm using DBQ JSON + explicit field mapping.")
    ap.add_argument("--pdf", required=True, help="Input PDF path")
    ap.add_argument("--json", required=True, help="DBQ JSON path (output from generate_dbq_json.py)")
    ap.add_argument("--map", required=True, dest="map_path", help="Field mapping JSON (dbq_key -> pdf_field_name)")
    ap.add_argument("--out", required=True, help="Output PDF path")
    args = ap.parse_args()

    data = _load_json(args.json)
    mapping = _load_json(args.map_path)

    reader = PdfReader(args.pdf)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    fields = reader.get_fields() or {}
    updates: Dict[str, str] = {}

    for dbq_key, pdf_field_name in mapping.items():
        if not pdf_field_name:
            continue  # unmapped on purpose

        if pdf_field_name not in fields:
            raise SystemExit(f"Mapped PDF field not found: {pdf_field_name} (from key {dbq_key})")

        updates[pdf_field_name] = _to_pdf_value(data.get(dbq_key, ""))

    if not updates:
        raise SystemExit("No mapped fields to update. Fill config/dbq_field_map.json with real PDF field names.")

    # Update all pages that contain fields
    for page in writer.pages:
        writer.update_page_form_field_values(page, updates)

    # Helps some viewers render updated fields
    try:
        writer._root_object.update(
            {
                "/AcroForm": writer._root_object["/AcroForm"],
            }
        )
        writer._root_object["/AcroForm"].update({"/NeedAppearances": True})
    except Exception:
        pass

    with open(args.out, "wb") as f:
        writer.write(f)

    print(f"Wrote: {args.out}")


if __name__ == "__main__":
    main()

