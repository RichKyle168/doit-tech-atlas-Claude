/**
 * Every query the API runs. `q` is anything with .query(sql, params): the db or a transaction.
 */
import { joinNode, splitNode } from '../../shared/graph.js';

// ───────────────────────────── row ↔ object

const toSource = (r) => ({
  id: r.id,
  page: /^\d+$/.test(r.page) ? Number(r.page) : r.page,
  pdfPage: r.pdf_page,
  section: r.section,
  label: r.label,
  kind: r.kind,
  excerpt: r.excerpt,
  visual: r.visual,
});

const toEdge = (r) => ({
  from: r.from_id,
  to: r.to_id,
  relation: r.relation,
  sourceType: r.source_type,
  label: r.label,
  refs: r.refs || [],
});

// ───────────────────────────── writes

export async function upsertDocument(q, doc) {
  const { id, ...props } = doc;
  await q.query(
    `INSERT INTO documents (id, props) VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO UPDATE SET props = EXCLUDED.props, updated_at = now()`,
    [id, JSON.stringify(props)],
  );
}

/**
 * seed = true : write as bundled content, never touching rows an editor changed (origin = 'admin')
 *               unless overwriteAdmin is set.
 * seed = false: write as an editor (origin = 'admin').
 */
export async function upsertSource(q, s, { documentId, seed = false, overwriteAdmin = false } = {}) {
  const guard = seed && !overwriteAdmin ? `WHERE sources.origin = 'seed'` : '';
  const { rowCount } = await q.query(
    `INSERT INTO sources (id, document_id, page, pdf_page, section, label, kind, excerpt, visual, origin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET document_id = EXCLUDED.document_id, page = EXCLUDED.page, pdf_page = EXCLUDED.pdf_page,
       section = EXCLUDED.section, label = EXCLUDED.label, kind = EXCLUDED.kind, excerpt = EXCLUDED.excerpt,
       visual = EXCLUDED.visual, origin = EXCLUDED.origin, updated_at = now()
     ${guard}`,
    [s.id, documentId, String(s.page), s.pdfPage ?? null, s.section ?? null, s.label, s.kind, s.excerpt, Boolean(s.visual), seed ? 'seed' : 'admin'],
  );
  return rowCount;
}

export async function upsertNode(q, node, { seed = false, overwriteAdmin = false, sortOrder = null } = {}) {
  const { cols, props } = splitNode(node);
  const guard = seed && !overwriteAdmin ? `WHERE nodes.origin = 'seed'` : '';
  // seed rows follow the content order; editor rows keep their place, new ones go to the end
  const order = seed ? 'EXCLUDED.sort_order' : 'nodes.sort_order';
  const { rowCount } = await q.query(
    `INSERT INTO nodes (id, level, category, parent_id, name_zh, name_en, short_zh, status, source_type, props, sort_order, origin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
             COALESCE($11, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM nodes)), $12)
     ON CONFLICT (id) DO UPDATE SET level = EXCLUDED.level, category = EXCLUDED.category, parent_id = EXCLUDED.parent_id,
       name_zh = EXCLUDED.name_zh, name_en = EXCLUDED.name_en, short_zh = EXCLUDED.short_zh, status = EXCLUDED.status,
       source_type = EXCLUDED.source_type, props = EXCLUDED.props, sort_order = ${order}, origin = EXCLUDED.origin, updated_at = now()
     ${guard}`,
    [cols.id, cols.level, cols.category ?? null, cols.parent_id ?? null, cols.name_zh, cols.name_en ?? null, cols.short_zh ?? null,
      cols.status ?? null, cols.source_type ?? null, JSON.stringify(props), sortOrder, seed ? 'seed' : 'admin'],
  );
  return rowCount;
}

export async function upsertEdge(q, e, { seed = false, overwriteAdmin = false, sortOrder = null } = {}) {
  const guard = seed && !overwriteAdmin ? `WHERE edges.origin = 'seed'` : '';
  const order = seed ? 'EXCLUDED.sort_order' : 'edges.sort_order';
  const { rowCount } = await q.query(
    `INSERT INTO edges (from_id, to_id, relation, source_type, label, refs, sort_order, origin)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, COALESCE($7, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM edges)), $8)
     ON CONFLICT (from_id, to_id, relation) DO UPDATE SET source_type = EXCLUDED.source_type, label = EXCLUDED.label,
       refs = EXCLUDED.refs, sort_order = ${order}, origin = EXCLUDED.origin, updated_at = now()
     ${guard}`,
    [e.from, e.to, e.relation, e.sourceType, e.label ?? null, JSON.stringify(e.refs || []), sortOrder, seed ? 'seed' : 'admin'],
  );
  return rowCount;
}

export async function deleteNode(q, id) {
  const { rowCount } = await q.query('DELETE FROM nodes WHERE id = $1', [id]);
  return rowCount;
}

export async function deleteEdge(q, { from, to, relation }) {
  const { rowCount } = await q.query('DELETE FROM edges WHERE from_id = $1 AND to_id = $2 AND relation = $3', [from, to, relation]);
  return rowCount;
}

export async function setMeta(q, key, value) {
  await q.query(
    `INSERT INTO meta (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

// ───────────────────────────── reads

export async function getMeta(q, key) {
  const { rows } = await q.query('SELECT value FROM meta WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

export async function loadDocument(q) {
  const { rows } = await q.query('SELECT id, props FROM documents ORDER BY id LIMIT 1');
  return rows[0] ? { id: rows[0].id, ...rows[0].props } : null;
}

export async function loadNodes(q) {
  const { rows } = await q.query(
    `SELECT id, level, category, parent_id, name_zh, name_en, short_zh, status, source_type, props
     FROM nodes ORDER BY sort_order, id`,
  );
  return rows.map(joinNode);
}

export async function loadEdges(q) {
  const { rows } = await q.query('SELECT from_id, to_id, relation, source_type, label, refs FROM edges ORDER BY sort_order, from_id, to_id');
  return rows.map(toEdge);
}

export async function loadSources(q, ids = null) {
  if (ids) {
    const { rows } = await q.query(
      `SELECT * FROM sources WHERE id IN (SELECT jsonb_array_elements_text($1::jsonb)) ORDER BY pdf_page NULLS LAST, id`,
      [JSON.stringify(ids)],
    );
    return rows.map(toSource);
  }
  const { rows } = await q.query('SELECT * FROM sources ORDER BY pdf_page NULLS LAST, id');
  return rows.map(toSource);
}

/** The whole atlas, exactly in the shape of content/index.js. */
export async function loadAll(q) {
  const [document, nodes, edges, sources] = await Promise.all([loadDocument(q), loadNodes(q), loadEdges(q), loadSources(q)]);
  return { document, nodes, edges, sources };
}

export async function countRows(q) {
  const { rows } = await q.query(
    `SELECT (SELECT COUNT(*) FROM nodes)::int AS nodes, (SELECT COUNT(*) FROM edges)::int AS edges,
            (SELECT COUNT(*) FROM sources)::int AS sources,
            (SELECT COUNT(*) FROM nodes WHERE origin = 'admin')::int AS edited`,
  );
  return rows[0];
}

const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Name, tag and text search across universes, galaxies, systems and stars. */
export async function searchNodes(q, term, limit = 20) {
  const pattern = `%${likeEscape(term)}%`;
  const { rows } = await q.query(
    `SELECT id, level, name_zh, name_en, parent_id, status, props->'summary'->>'t' AS summary,
            (name_zh ILIKE $1 OR name_en ILIKE $1 OR short_zh ILIKE $1) AS name_match
     FROM nodes
     WHERE level IN ('L1', 'L2', 'L3', 'L4')
       AND (name_zh ILIKE $1 OR name_en ILIKE $1 OR short_zh ILIKE $1
            OR (props->'tags')::text ILIKE $1
            OR props->'summary'->>'t' ILIKE $1
            OR props->'description'->>'t' ILIKE $1)
     ORDER BY name_match DESC, sort_order
     LIMIT $2`,
    [pattern, limit],
  );
  return rows.map((r) => ({
    id: r.id, level: r.level, nameZh: r.name_zh, nameEn: r.name_en, parent: r.parent_id, status: r.status,
    summary: r.summary, match: r.name_match ? 'name' : 'text',
  }));
}
