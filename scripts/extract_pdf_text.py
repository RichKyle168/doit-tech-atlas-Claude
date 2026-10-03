"""Extract per-page text from the white paper so scripts/verify-sources.mjs can check every excerpt.

    pip install pymupdf
    python scripts/extract_pdf_text.py path/to/2025-2026產業技術白皮書.pdf pages.json
    npm run verify -- pages.json
"""
import json
import sys

import pymupdf

OFFSET = 24  # printed page = PDF page - 24 for the body of the book

doc = pymupdf.open(sys.argv[1])
out = {str(i + 1): [i + 1 - OFFSET, page.get_text()] for i, page in enumerate(doc)}
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False)
print(f"{len(out)} pages → {sys.argv[2]}")
