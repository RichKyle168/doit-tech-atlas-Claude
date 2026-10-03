/**
 * Read-aloud rules shared by the browser and the server:
 * which parts of a star can be read, what text each part reads, and how that text is
 * tidied for a voice (symbols spelled out, units in words, sentences split for pacing).
 */

/** The star page, in reading order. label = section heading (null for the opening summary). */
export const STAR_PARTS = [
  ['summary', null],
  ['description', '這是什麼'],
  ['howItWorks', '它如何運作'],
  ['whyItMatters', '為什麼重要'],
  ['applications', '應用在哪裡'],
  ['industryValue', '產業價值'],
  ['taiwan', '臺灣布局'],
];
const LABELS = Object.fromEntries(STAR_PARTS.filter(([, l]) => l));

/** Every part the speech endpoint may be asked for. */
export const SPEAKABLE_PARTS = new Set(['name', ...STAR_PARTS.map(([k]) => k), ...Object.keys(LABELS).map((k) => `label-${k}`)]);

/** Raw text of one part of a node, or null when the part is empty. */
export function partText(node, part) {
  if (!node || !SPEAKABLE_PARTS.has(part)) return null;
  if (part === 'name') return node.nameZh || null;
  if (part.startsWith('label-')) return LABELS[part.slice(6)] || null;
  const v = node[part];
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? v.map((a) => a.t.replace(/[。．.]$/, '')).join('。') : null;
  return v.t || null;
}

/** Spells out what a voice would otherwise stumble over. */
export function speakable(text) {
  return String(text)
    .replace(/[「」『』"]/g, '')
    .replace(/(\d)\s*[~～]\s*(\d)/g, '$1到$2')
    .replace(/\s*≥\s*/g, '大於等於')
    .replace(/\s*≤\s*/g, '小於等於')
    .replace(/\s*>\s*/g, '大於')
    .replace(/\s*<\s*/g, '小於')
    .replace(/(\d)\s*ms\b/g, '$1毫秒')
    .replace(/(\d)\s*mm\b/g, '$1公釐')
    .replace(/(\d)\s*kg\b/gi, '$1公斤')
    .replace(/(\d)\s*fps\b/gi, '$1 FPS')
    .replace(/[／/]/g, '、')
    .replace(/[＋+]/g, '加')
    .replace(/\s*→\s*/g, '，再到')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sentence-sized pieces (so a browser voice keeps a natural pace and never cuts off). */
export function sentences(text, max = 90) {
  const out = [];
  for (const s of text.split(/(?<=[。！？；])/)) {
    let rest = s.trim();
    while (rest.length > max) {
      const cut = Math.max(rest.lastIndexOf('，', max), rest.lastIndexOf('、', max));
      const at = cut > 20 ? cut + 1 : max;
      out.push(rest.slice(0, at));
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}
