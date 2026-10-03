// Verifies every excerpt in content/sources.js against text extracted from the white paper PDF.
// Usage: node scripts/verify-sources.mjs <pages.json>
//   pages.json = { "<pdfPage>": [printedPage, "page text"] } (extracted with PyMuPDF)
import { readFileSync } from 'node:fs';
import { SOURCES } from '../content/sources.js';

const pages = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = (s) => s.replace(/\s+/g, '').replace(/[＋]/g, '+').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl');

let fail = 0;
const visual = [];
for (const s of Object.values(SOURCES)) {
  if (s.visual) { visual.push(s.id); continue; }
  const entry = pages[String(s.pdfPage)];
  if (!entry) { console.log('NO PAGE', s.id, s.pdfPage); fail++; continue; }
  const [printed, text] = entry;
  const hay = norm(text);
  if (typeof s.page === 'number' && printed !== s.page) {
    console.log('PAGE MISMATCH', s.id, 'printed', printed, 'declared', s.page); fail++;
  }
  const parts = s.excerpt.split(/[｜…]/).map((x) => norm(x)).filter(Boolean);
  const missing = parts.filter((x) => !hay.includes(x));
  if (missing.length) { console.log('MISSING', s.id, `p.${s.page}`, missing); fail++; }
}
console.log(`${Object.keys(SOURCES).length - visual.length} text excerpts checked, ${fail} problems`);
if (visual.length) console.log(`transcribed from figure graphics (check by eye on the PDF page): ${visual.join(', ')}`);
process.exit(fail ? 1 : 0);
