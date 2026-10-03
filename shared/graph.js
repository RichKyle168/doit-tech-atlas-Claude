/**
 * Knowledge-graph rules shared by the browser, the API server and the data scripts.
 * Pure functions only: no imports, no I/O.
 *
 * A node is one plain object. In the database the fields below live in their own columns;
 * every other field (sourced texts, tags, applications, systemIds…) lives in a JSONB `props` column.
 */

export const LEVELS = ['L0', 'L1', 'L2', 'L3', 'C', 'L4'];
export const STATUSES = ['active', 'partial', 'preview'];
export const SOURCE_TYPES = ['SOURCE', 'DERIVED', 'EXTERNAL'];
export const RELATIONS = ['enables', 'pairs', 'extends'];
export const TEXT_FIELDS = ['headline', 'summary', 'description', 'howItWorks', 'whyItMatters', 'industryValue', 'taiwan', 'placement'];

/** node field → database column */
export const NODE_COLUMNS = {
  id: 'id',
  level: 'level',
  category: 'category',
  primaryParent: 'parent_id',
  nameZh: 'name_zh',
  nameEn: 'name_en',
  shortZh: 'short_zh',
  status: 'status',
  sourceType: 'source_type',
};

/** Fields computed in the browser; never stored. */
const DERIVED_FIELDS = ['relatedNodes', 'relatedSystems', 'relatedUniverses', 'source'];

export function splitNode(node) {
  const cols = {};
  const props = {};
  for (const [k, v] of Object.entries(node)) {
    if (DERIVED_FIELDS.includes(k)) continue;
    if (k in NODE_COLUMNS) cols[NODE_COLUMNS[k]] = v ?? null;
    else props[k] = v;
  }
  return { cols, props };
}

export function joinNode(row) {
  const node = { ...(row.props || {}) };
  for (const [field, col] of Object.entries(NODE_COLUMNS)) {
    if (row[col] !== null && row[col] !== undefined) node[field] = row[col];
  }
  return node;
}

export function indexGraph(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighbours = new Map();
  const push = (id, link) => {
    if (!neighbours.has(id)) neighbours.set(id, []);
    neighbours.get(id).push(link);
  };
  for (const e of edges) {
    push(e.from, { ...e, other: e.to, dir: 'out' });
    push(e.to, { ...e, other: e.from, dir: 'in' });
  }
  return { byId, neighbours };
}

/** Every source id a node relies on: its own texts, the relations it takes part in, its structural refs. */
export function refIdsOf(node, links = []) {
  if (!node) return [];
  const ids = [];
  for (const f of TEXT_FIELDS) if (node[f]?.refs) ids.push(...node[f].refs);
  for (const a of node.applications || []) if (a?.refs) ids.push(...a.refs);
  for (const l of links) ids.push(...(l.refs || []));
  for (const r of [node.chapter?.ref, node.issuesRef, node.systemsRef]) if (r) ids.push(r);
  return [...new Set(ids)];
}

/**
 * Integrity check for a whole atlas. Returns a list of problems (empty = valid).
 * strict = also enforce the editorial rules of the bundled content
 *          (every system name must appear in its universe's technology list).
 */
export function validateContent({ nodes, edges, sources }, { strict = false } = {}) {
  const problems = [];
  const sourceIds = new Set((sources || []).map((s) => s.id));
  const byId = new Map();
  for (const n of nodes) {
    if (!n.id || typeof n.id !== 'string') problems.push(`node without id: ${JSON.stringify(n).slice(0, 60)}`);
    else if (byId.has(n.id)) problems.push(`duplicate node id ${n.id}`);
    byId.set(n.id, n);
  }
  const is = (id, level) => byId.get(id)?.level === level;
  const checkText = (where, st) => {
    if (st === null || st === undefined) return;
    if (typeof st !== 'object' || typeof st.t !== 'string' || !st.t.trim()) { problems.push(`${where}: text must be { t, type, refs }`); return; }
    if (!SOURCE_TYPES.includes(st.type)) problems.push(`${where}: bad type ${st.type}`);
    if (!Array.isArray(st.refs) || !st.refs.length) problems.push(`${where}: no refs`);
    for (const r of st.refs || []) if (!sourceIds.has(r)) problems.push(`${where}: unknown ref ${r}`);
  };

  for (const n of nodes) {
    const at = n.id;
    if (!LEVELS.includes(n.level)) problems.push(`${at}: bad level ${n.level}`);
    if (!n.nameZh || typeof n.nameZh !== 'string') problems.push(`${at}: nameZh is required`);
    if (n.status && !STATUSES.includes(n.status)) problems.push(`${at}: bad status ${n.status}`);
    if (n.sourceType && !SOURCE_TYPES.includes(n.sourceType)) problems.push(`${at}: bad sourceType ${n.sourceType}`);
    if (n.primaryParent && !byId.has(n.primaryParent)) problems.push(`${at}: missing parent ${n.primaryParent}`);
    if (n.primaryParent === n.id) problems.push(`${at}: is its own parent`);
    for (const f of TEXT_FIELDS) checkText(`${at}.${f}`, n[f]);
    if (n.applications !== undefined && n.applications !== null) {
      if (!Array.isArray(n.applications)) problems.push(`${at}.applications must be a list`);
      else n.applications.forEach((a, i) => checkText(`${at}.applications[${i}]`, a));
    }
    for (const r of [n.chapter?.ref, n.issuesRef, n.systemsRef].filter(Boolean)) if (!sourceIds.has(r)) problems.push(`${at}: unknown ref ${r}`);

    if (n.level === 'L2') {
      if (!is(n.universe, 'L1')) problems.push(`${at}: galaxy needs a universe`);
      for (const s of n.systemIds || []) if (!is(s, 'L3')) problems.push(`${at}: unknown system ${s}`);
    }
    if (n.level === 'L3') {
      if (n.galaxy && !is(n.galaxy, 'L2')) problems.push(`${at}: unknown galaxy ${n.galaxy}`);
      if (!is(n.universe, 'L1')) problems.push(`${at}: system needs a universe`);
    }
    if (n.level === 'C' && !is(n.system, 'L3')) problems.push(`${at}: constellation needs a system`);
    if (n.level === 'L4') {
      if (!is(n.system, 'L3')) problems.push(`${at}: star needs a system`);
      if (n.capability && !is(n.capability, 'C')) problems.push(`${at}: unknown constellation ${n.capability}`);
    }
  }

  // no cycles in the parent chain
  for (const n of nodes) {
    const seen = new Set();
    let cur = n;
    while (cur?.primaryParent) {
      if (seen.has(cur.id)) { problems.push(`${n.id}: parent cycle`); break; }
      seen.add(cur.id);
      cur = byId.get(cur.primaryParent);
    }
  }

  const edgeKeys = new Set();
  for (const e of edges) {
    const at = `edge ${e.from}->${e.to}`;
    if (!byId.has(e.from)) problems.push(`${at}: unknown from`);
    if (!byId.has(e.to)) problems.push(`${at}: unknown to`);
    if (!RELATIONS.includes(e.relation)) problems.push(`${at}: bad relation ${e.relation}`);
    if (!SOURCE_TYPES.includes(e.sourceType)) problems.push(`${at}: bad sourceType ${e.sourceType}`);
    for (const r of e.refs || []) if (!sourceIds.has(r)) problems.push(`${at}: unknown ref ${r}`);
    const key = `${e.from}|${e.to}|${e.relation}`;
    if (edgeKeys.has(key)) problems.push(`${at}: duplicate relation ${e.relation}`);
    edgeKeys.add(key);
  }

  if (strict) {
    for (const s of nodes.filter((n) => n.level === 'L3')) {
      const u = byId.get(s.universe);
      if (u?.systems && !u.systems.includes(s.nameZh)) problems.push(`${s.id}: "${s.nameZh}" not in ${u.id} technology list`);
    }
  }
  return problems;
}
