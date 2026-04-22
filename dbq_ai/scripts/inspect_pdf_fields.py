import argparse
from pypdf import PdfReader


def main() -> None:
    ap = argparse.ArgumentParser(description="List AcroForm field names in a PDF.")
    ap.add_argument("pdf", help="Path to PDF to inspect")
    args = ap.parse_args()

    reader = PdfReader(args.pdf)
    fields = reader.get_fields() or {}

    if not fields:
        print("NO ACROFORM FIELDS FOUND")
        return

    # Print a stable, readable list
    print(f"FOUND {len(fields)} FIELD(S):")
    for name in sorted(fields.keys(), key=lambda s: s.lower()):
        f = fields[name] or {}
        ft = f.get("/FT")
        ff = f.get("/Ff")
        dv = f.get("/DV")
        v = f.get("/V")
        print(f"- {name}")
        if ft is not None:
            print(f"    /FT: {ft}")
        if ff is not None:
            print(f"    /Ff: {ff}")
        if dv is not None:
            print(f"    /DV: {dv}")
        if v is not None:
            print(f"    /V: {v}")


if __name__ == "__main__":
    main()

