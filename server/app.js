/**
 * HTTP layer.
 *
 * Public, read-only (CORS open):
 *   GET  /api/health              engine, row counts, whether the server is on its read-only fallback
 *   GET  /api/graph               the whole atlas for the 3D client: document, nodes, edges
 *   GET  /api/nodes               compact list; filters ?level=L4&parent=robot&status=active
 *   GET  /api/nodes/:id           one node with its path, children, relations and source ids
 *   GET  /api/sources?ids=a,b     source excerpts (all of them without ?ids)
 *   GET  /api/search?q=數位        search names, tags and texts
 *   GET  /api/tts                  whether a natural read-aloud voice is configured
 *   GET  /api/tts/:id/:part        read-aloud audio (mp3) for one part of a node, e.g. /api/tts/digital-twin/summary
 *
 * Editors (Authorization: Bearer $ADMIN_TOKEN):
 *   GET    /api/admin/export      full backup, same shape as content/index.js
 *   PUT    /api/admin/nodes/:id   create or replace a node
 *   DELETE /api/admin/nodes/:id
 *   PUT    /api/admin/edges       create or replace a relation  { from, to, relation, sourceType, label, refs }
 *   DELETE /api/admin/edges       { from, to, relation }
 *   PUT    /api/admin/sources/:id create or replace a source excerpt
 *   POST   /api/admin/sync        re-apply the bundled content  { overwriteAdmin?: boolean }
 * Every write is validated against the whole graph first; a write that would break it is refused (422).
 */
import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { indexGraph, refIdsOf, validateContent } from '../shared/graph.js';
import { partText, speakable, SPEAKABLE_PARTS } from '../shared/speech.js';
import * as repo from './db/repo.js';
import { syncContent } from './db/sync.js';

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * JSON request bodies for the editor API. Works both on a plain Node server (read the stream)
 * and on Vercel, whose Node helpers may already have parsed the body into req.body.
 * The result goes to req.json, so nothing ever assigns to a platform-owned req.body.
 */
async function readJson(req, limit = 512 * 1024) {
  if (Object.getOwnPropertyDescriptor(req, 'body')) {
    const v = req.body;
    if (v === undefined || v === null || v === '') return {};
    if (typeof v === 'string' || Buffer.isBuffer(v)) return JSON.parse(v.toString());
    return v;
  }
  if (req.readableEnded) return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'The request body is too large.');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  return text ? JSON.parse(text) : {};
}
const jsonBody = (req, res, next) => readJson(req)
  .then((body) => { req.json = body; next(); })
  .catch((err) => next(err instanceof HttpError ? err : new HttpError(400, 'The request body must be JSON.')));
const sha = (s) => createHash('sha256').update(s).digest();
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const pick = (n) => n && { id: n.id, level: n.level, nameZh: n.nameZh, nameEn: n.nameEn, status: n.status };

export function createApi({ db, engine, readOnly = false, adminToken = '', content, tts = null, log = console }) {
  const api = express.Router();
  let cache = null;
  const synthesising = new Map(); // one synthesis per text at a time

  async function atlas() {
    if (!cache) {
      const all = await repo.loadAll(db);
      const version = createHash('sha256').update(JSON.stringify([all.nodes, all.edges])).digest('hex').slice(0, 12);
      cache = { all, version, ...indexGraph(all.nodes, all.edges) };
    }
    return cache;
  }
  const invalidate = () => { cache = null; };

  /** Rejects a change that introduces new integrity problems. */
  function assertValid(current, candidate) {
    const before = new Set(validateContent(current));
    const added = validateContent(candidate).filter((p) => !before.has(p));
    if (added.length) throw new HttpError(422, 'This change would break the atlas.', added);
  }

  // ───────────────────────── public
  api.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });

  api.get('/health', wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, engine, readOnly, ...(await repo.countRows(db)), syncedAt: await repo.getMeta(db, 'synced_at') });
  }));

  api.get('/graph', wrap(async (req, res) => {
    const { all, version } = await atlas();
    res.set('Cache-Control', 'no-cache'); // always revalidate (ETag) so edits show up at once
    res.json({ version, document: all.document, nodes: all.nodes, edges: all.edges });
  }));

  api.get('/nodes', wrap(async (req, res) => {
    const { all } = await atlas();
    const { level, parent, status } = req.query;
    const list = all.nodes.filter((n) => (!level || n.level === level) && (!parent || n.primaryParent === parent) && (!status || n.status === status));
    res.json(list.map((n) => ({ ...pick(n), parent: n.primaryParent ?? null, summary: n.summary?.t ?? null })));
  }));

  api.get('/nodes/:id', wrap(async (req, res) => {
    const { all, byId, neighbours } = await atlas();
    const node = byId.get(req.params.id);
    if (!node) throw new HttpError(404, `No node "${req.params.id}".`);
    const path = [];
    for (let cur = node; cur; cur = cur.primaryParent ? byId.get(cur.primaryParent) : null) path.unshift(pick(cur));
    const links = neighbours.get(node.id) || [];
    res.json({
      node,
      path,
      children: all.nodes.filter((n) => n.primaryParent === node.id).map(pick),
      links: links.map((l) => ({ relation: l.relation, sourceType: l.sourceType, label: l.label, direction: l.dir, node: pick(byId.get(l.other)) })),
      sourceIds: refIdsOf(node, links),
    });
  }));

  api.get('/sources', wrap(async (req, res) => {
    const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').map((s) => s.trim()).filter(Boolean) : null;
    if (ids && ids.length > 300) throw new HttpError(400, 'Ask for at most 300 sources at a time.');
    res.json(await repo.loadSources(db, ids));
  }));

  api.get('/search', wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    if (q.length > 50) throw new HttpError(400, 'Search terms are limited to 50 characters.');
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    return res.json(await repo.searchNodes(db, q, limit));
  }));

  // ───────────────────────── read-aloud
  api.get('/tts', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.json({ available: Boolean(tts?.available), voice: tts?.available ? tts.voice : null });
  });

  api.get('/tts/:id/:part', wrap(async (req, res) => {
    if (!tts?.available) throw new HttpError(404, 'No natural voice is configured; the browser voice is used instead.');
    const { byId } = await atlas();
    const { id, part } = req.params;
    if (!SPEAKABLE_PARTS.has(part)) throw new HttpError(404, `Nothing to read for "${part}".`);
    const raw = partText(byId.get(id), part);
    if (!raw) throw new HttpError(404, `Nothing to read for ${id}/${part}.`);
    const text = speakable(raw);
    const key = tts.cacheKey(text);

    let audio;
    const hit = (await db.query('SELECT audio FROM tts_cache WHERE key = $1', [key])).rows[0];
    if (hit) audio = Buffer.from(hit.audio);
    else {
      if (!synthesising.has(key)) {
        synthesising.set(key, (async () => {
          const made = await tts.synthesize(text);
          await db.query(
            'INSERT INTO tts_cache (key, voice, text, audio) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING',
            [key, tts.voice, text, made],
          ).catch((err) => log.warn('[tts] could not cache audio:', err.message));
          return made;
        })().finally(() => synthesising.delete(key)));
      }
      try {
        audio = await synthesising.get(key);
      } catch (err) {
        log.warn('[tts] synthesis failed:', err.message);
        throw new HttpError(502, 'The voice service did not answer; try the browser voice.');
      }
    }

    res.set({ 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400' });
    // Safari plays media only from servers that honour byte ranges
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') || '');
    if (range) {
      const size = audio.length;
      let start = range[1] === '' ? size - Number(range[2]) : Number(range[1]);
      let end = range[1] !== '' && range[2] !== '' ? Number(range[2]) : size - 1;
      start = Math.max(0, start); end = Math.min(size - 1, end);
      if (start > end) { res.status(416).set('Content-Range', `bytes */${size}`).end(); return; }
      res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) });
      res.end(audio.subarray(start, end + 1));
      return;
    }
    res.set('Content-Length', String(audio.length));
    res.end(audio);
  }));

  // ───────────────────────── editors
  const admin = express.Router();
  admin.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!adminToken) return next(new HttpError(403, 'The admin API is disabled: set ADMIN_TOKEN to enable it.'));
    const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!given || !timingSafeEqual(sha(given), sha(adminToken))) return next(new HttpError(401, 'Missing or wrong admin token.'));
    if (readOnly && req.method !== 'GET') return next(new HttpError(503, 'The database is offline; the atlas is running on its read-only copy.'));
    return next();
  });

  admin.get('/export', wrap(async (req, res) => {
    res.set('Content-Disposition', `attachment; filename="atlas-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(await repo.loadAll(db));
  }));

  admin.put('/nodes/:id', wrap(async (req, res) => {
    const node = { ...req.json, id: req.params.id };
    if (!ID.test(node.id)) throw new HttpError(400, 'Node ids use lowercase letters, digits and dashes.');
    const { all } = await atlas();
    const exists = all.nodes.some((n) => n.id === node.id);
    const nodes = exists ? all.nodes.map((n) => (n.id === node.id ? node : n)) : [...all.nodes, node];
    assertValid(all, { ...all, nodes });
    await db.tx((t) => repo.upsertNode(t, node));
    invalidate();
    res.status(exists ? 200 : 201).json({ ok: true, created: !exists, node });
  }));

  admin.delete('/nodes/:id', wrap(async (req, res) => {
    const { all } = await atlas();
    const { id } = req.params;
    if (!all.nodes.some((n) => n.id === id)) throw new HttpError(404, `No node "${id}".`);
    const children = all.nodes.filter((n) => n.primaryParent === id).map((n) => n.id);
    if (children.length) throw new HttpError(409, 'Move or delete the children first.', children);
    const candidate = { ...all, nodes: all.nodes.filter((n) => n.id !== id), edges: all.edges.filter((e) => e.from !== id && e.to !== id) };
    assertValid(all, candidate);
    await db.tx((t) => repo.deleteNode(t, id));
    invalidate();
    res.json({ ok: true, deleted: id });
  }));

  admin.put('/edges', wrap(async (req, res) => {
    const b = req.json;
    const e = { from: b.from, to: b.to, relation: b.relation, sourceType: b.sourceType, label: b.label ?? null, refs: b.refs || [] };
    const { all } = await atlas();
    const same = (x) => x.from === e.from && x.to === e.to && x.relation === e.relation;
    const exists = all.edges.some(same);
    assertValid(all, { ...all, edges: exists ? all.edges.map((x) => (same(x) ? e : x)) : [...all.edges, e] });
    await db.tx((t) => repo.upsertEdge(t, e));
    invalidate();
    res.status(exists ? 200 : 201).json({ ok: true, created: !exists, edge: e });
  }));

  admin.delete('/edges', wrap(async (req, res) => {
    const { from, to, relation } = { ...req.query, ...(req.json || {}) };
    const n = await db.tx((t) => repo.deleteEdge(t, { from, to, relation }));
    if (!n) throw new HttpError(404, 'No such relation.');
    invalidate();
    res.json({ ok: true });
  }));

  admin.put('/sources/:id', wrap(async (req, res) => {
    const s = { ...req.json, id: req.params.id };
    if (!ID.test(s.id)) throw new HttpError(400, 'Source ids use lowercase letters, digits and dashes.');
    if (!s.label || !s.excerpt || !['quote', 'table', 'figure'].includes(s.kind) || s.page === undefined) {
      throw new HttpError(400, 'A source needs page, label, kind (quote | table | figure) and excerpt.');
    }
    const { all } = await atlas();
    await db.tx((t) => repo.upsertSource(t, s, { documentId: all.document.id }));
    invalidate();
    res.json({ ok: true, source: s });
  }));

  admin.post('/sync', wrap(async (req, res) => {
    const result = await syncContent(db, content, { force: true, overwriteAdmin: Boolean(req.json?.overwriteAdmin), log });
    invalidate();
    res.json({ ok: true, ...result });
  }));

  api.use('/admin', jsonBody, admin);

  api.use((req, res, next) => next(new HttpError(404, `No API route ${req.method} ${req.originalUrl}`)));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) log.error('[api]', err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message, ...(err.details ? { details: err.details } : {}) });
  });

  return api;
}
