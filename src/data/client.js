/**
 * Where the browser gets its data.
 *   normal build   → the API (/api/graph, /api/sources), backed by the database
 *   artifact build → the bundled content, for hosts that cannot reach a server
 *                    (`vite build --mode artifact`; the API code path is dropped from that bundle and vice versa)
 */
const EMBEDDED = import.meta.env.MODE === 'artifact';
let embedded = null;
const sourceCache = new Map();

async function bundled() {
  if (!embedded) {
    const { contentPayload } = await import('../../content/index.js');
    embedded = contentPayload();
    for (const s of embedded.sources) sourceCache.set(s.id, s);
  }
  return embedded;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** { document, nodes, edges } */
export async function loadGraph() {
  if (EMBEDDED) {
    const { document, nodes, edges } = await bundled();
    return { document, nodes, edges };
  }
  return getJson('/api/graph');
}

/** Source excerpts for a list of ids, fetched once and remembered. */
export async function loadSources(ids) {
  if (EMBEDDED) await bundled();
  const missing = ids.filter((id) => !sourceCache.has(id));
  if (missing.length && !EMBEDDED) {
    const list = await getJson(`/api/sources?ids=${encodeURIComponent(missing.join(','))}`);
    for (const s of list) sourceCache.set(s.id, s);
  }
  return ids.map((id) => sourceCache.get(id)).filter(Boolean);
}
