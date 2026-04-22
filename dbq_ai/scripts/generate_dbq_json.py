import argparse
import json
import os
from typing import Any, Dict, List, Set

from openai import OpenAI


DBQ_SCHEMA: Dict[str, str] = {
    "evidence_comments": "string",
    "section_2a_requested_opinion": "string",
    "section_2b_exam_type": "string",
    "section_3_choice": "one of: 3A / 3B / unclear",
    "section_3c_rationale": "string",
    "section_4_choice": "one of: 4A / 4B / unclear",
    "section_4c_rationale": "string",
    "section_5_choice": "one of: 5A / 5B / unclear",
    "section_5c_rationale": "string",
    "section_6a_can_determine_baseline": "one of: yes / no / unclear",
    "section_6a_baseline_severity_description": "string",
    "section_6a_baseline_evidence_date_and_nature": "string",
    "section_6a_current_greater_than_baseline": "one of: yes / no / unclear",
    "section_6a_aggravated_beyond_natural_progression": "one of: yes / no / unclear",
    "section_6a_baseline_cannot_be_established_rationale": "string",
    "section_6a_regardless_aggravated_beyond_natural_progression": "one of: yes / no / unclear",
    "section_6b_rationale": "string",
    "section_7_conflicting_evidence_opinion": "string",
    "missing_info_needed": "array of strings (questions to ask / records needed)",
}


ALLOWED_FIELDS: Dict[str, Set[str]] = {
    # Secondary service connection opinion: section II + IV (+ optional VII)
    "secondary": {
        "section_2a_requested_opinion",
        "section_2b_exam_type",
        "section_4_choice",
        "section_4c_rationale",
        "section_7_conflicting_evidence_opinion",
        "missing_info_needed",
    },
    # Direct service connection opinion: section II + III (+ optional VII)
    "direct": {
        "section_2a_requested_opinion",
        "section_2b_exam_type",
        "section_3_choice",
        "section_3c_rationale",
        "section_7_conflicting_evidence_opinion",
        "missing_info_needed",
    },
    # TERA-focused direct opinion (still DBQ Section III in this form)
    "tera_direct": {
        "section_2a_requested_opinion",
        "section_2b_exam_type",
        "section_3_choice",
        "section_3c_rationale",
        "missing_info_needed",
    },
    # Gulf War focused direct opinion (still DBQ Section III in this form)
    "gulf_war": {
        "section_2a_requested_opinion",
        "section_2b_exam_type",
        "section_3_choice",
        "section_3c_rationale",
        "missing_info_needed",
    },
}


def _lock_sections(output: Dict[str, Any], mode: str) -> Dict[str, Any]:
    allowed = ALLOWED_FIELDS[mode]
    locked: Dict[str, Any] = {}

    # Preserve only allowed; blank everything else to prevent "remarks compression"
    for k in DBQ_SCHEMA.keys():
        if k in allowed:
            locked[k] = output.get(k, "" if k != "missing_info_needed" else [])
        else:
            locked[k] = "" if k != "missing_info_needed" else []

    # Ensure missing_info_needed always exists and is an array
    if not isinstance(locked.get("missing_info_needed"), list):
        locked["missing_info_needed"] = [str(locked["missing_info_needed"])]

    return locked


def _system_prompt(mode: str) -> str:
    allowed_list = sorted(ALLOWED_FIELDS[mode])
    mode_rules = ""

    if mode == "tera_direct":
        mode_rules = """
TERA-ONLY MODE:
- Only write content that supports a Toxic Exposure Risk Activity (TERA) theory of causation.
- Treat the relevant opinion type as DIRECT service connection due to toxic exposure (TERA).
"""
    elif mode == "gulf_war":
        mode_rules = """
GULF WAR MODE:
- Only write content that supports a Gulf War-related exposure/illness theory where applicable.
- Treat the relevant opinion type as DIRECT service connection in this DBQ format (Section III).
"""
    elif mode == "secondary":
        mode_rules = """
SECONDARY-ONLY MODE:
- Only write content relevant to SECONDARY service connection.
- Do not fill direct/TERA/gulf war rationales unless explicitly requested and allowed.
"""

    return f"""You are helping fill a VA Medical Opinion DBQ from provider notes.

SECTION LOCKING (hard requirement):
- mode = {mode}
- You may ONLY populate these JSON keys:
{json.dumps(allowed_list, indent=2)}
- All other keys MUST be returned as empty string "" (or [] for missing_info_needed).

{mode_rules}

Evidence constraints:
- Only use facts supported by the notes. If missing, use "unclear" (for choice fields) and add questions to missing_info_needed.
- Do NOT invent diagnoses, dates, exposures, deployments, MOS, labs, imaging, or service events.
- Write rationales like a clinician: concise, evidence-based, timeline-aware.

Return ONLY valid JSON.
"""


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate section-locked DBQ JSON from provider notes.")
    ap.add_argument("--mode", required=True, choices=sorted(ALLOWED_FIELDS.keys()))
    ap.add_argument("--notes", required=True, help="Path to provider notes text file")
    ap.add_argument("--out", required=True, help="Output JSON path")
    ap.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"))
    args = ap.parse_args()

    with open(args.notes, "r", encoding="utf-8") as f:
        notes = f.read().strip()

    client = OpenAI()

    user_prompt = f"""
Fill this DBQ structure from the notes.

DBQ fields schema (keys/types):
{json.dumps(DBQ_SCHEMA, indent=2)}

Provider notes:
\"\"\"{notes}\"\"\"
"""

    resp = client.responses.create(
        model=args.model,
        input=[
            {"role": "system", "content": _system_prompt(args.mode)},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )

    parsed = json.loads(resp.output_text)
    locked = _lock_sections(parsed, args.mode)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(locked, f, indent=2, ensure_ascii=False)

    print(f"Wrote: {args.out}")


if __name__ == "__main__":
    main()

