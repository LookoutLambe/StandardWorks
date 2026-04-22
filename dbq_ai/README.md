## DBQ AI Section-Locked Filler (TERA / Gulf War / Secondary / Direct)

This is a small, management-friendly reference implementation that:

- **Extracts** fillable PDF field names (so you can see if a DBQ has real fields or only a single “remarks” box)
- **Generates structured JSON** from provider notes (no “everything into remarks” blobs)
- **Locks output to a specific opinion mode** (e.g. **secondary-only** fills only Section IV; **TERA direct** fills only Section III)
- **Optionally writes** the JSON into a PDF’s AcroForm fields (only the allowed section fields)

### What problem this solves
If your current system “throws everything into remarks,” it’s usually because:

- the PDF only has 1 big text field, or
- your code maps multiple outputs to the same field name.

This repo makes the mapping explicit and enforces **section locking**, so secondary opinions can’t “bleed” into direct/TERA sections, etc.

---

## Install

From this folder:

```bash
pip install -r requirements.txt
```

Set your API key:

PowerShell:

```powershell
setx OPENAI_API_KEY "YOUR_KEY"
```

(Open a new terminal after `setx` so the variable is available.)

---

## 1) Inspect PDF fields (critical first step)

This tells you whether the DBQ PDF has separate fillable fields for 2A/3C/4C/etc.

```bash
python scripts\inspect_pdf_fields.py "C:\Users\chris\Desktop\Medical-Opinion-DBQ.pdf"
```

If it prints **NO ACROFORM FIELDS FOUND** (or only 1–2 fields), you cannot reliably “fill each section” without stamping/overlaying text.

---

## 2) Generate section-locked JSON from provider notes

Put provider notes into a text file (copy/paste is fine), e.g. `notes.txt`.

Secondary-only example:

```bash
python scripts\generate_dbq_json.py --mode secondary --notes notes.txt --out filled.secondary.json
```

TERA direct example:

```bash
python scripts\generate_dbq_json.py --mode tera_direct --notes notes.txt --out filled.tera.json
```

Gulf War example:

```bash
python scripts\generate_dbq_json.py --mode gulf_war --notes notes.txt --out filled.gulfwar.json
```

---

## 3) (Optional) Fill a PDF using a mapping file

You need a mapping from **JSON keys** → **actual PDF field names**.
Create/update:

- `config\dbq_field_map.json`

Then run:

```bash
python scripts\fill_pdf_from_json.py ^
  --pdf "C:\path\to\Medical-Opinion-DBQ.pdf" ^
  --json filled.secondary.json ^
  --map config\dbq_field_map.json ^
  --out "C:\path\to\Medical-Opinion-DBQ.FILLED.pdf"
```

Notes:

- This fills **only** the keys allowed by the selected mode (the JSON is already section-locked).
- If the PDF has no fields for the sections you want, you’ll need a **stamp/overlay** approach instead of AcroForm filling.

---

## Opinion modes (what gets filled)

- `secondary`: Section II + Section IV (+ optional Section VII if conflicting evidence is explicitly present)
- `direct`: Section II + Section III (+ optional Section VII)
- `tera_direct`: Section II + Section III (TERA-focused direct opinion)
- `gulf_war`: Section II + Section III (Gulf War focused direct opinion)

---

## Compliance / safety constraints (built-in)

- The generator is instructed to **not invent** diagnoses, exposures, dates, deployments, MOS, labs/imaging, etc.
- If something is missing, it returns `unclear` and puts questions into `missing_info_needed`.
- Section locking prevents “everything in remarks.”

