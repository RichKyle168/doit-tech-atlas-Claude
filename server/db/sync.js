/**
 * Keeps the database in step with the bundled content (content/*.js).
 *
 * Runs on every boot. It is cheap when nothing changed (one hash comparison) and safe when
 * something did: rows created or edited through the admin API (origin = 'admin') are left alone,
 * bundled rows that were removed from the content are deleted.
 */
import { createHash } from 'node:crypto';
import { getMeta, setMeta, upsertDocument, upsertEdge, upsertNode, upsertSource } from './repo.js';

export const contentHash = (content) => createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16);

export async function syncContent(db, content, { force = false, overwriteAdmin = false, log = console } = {}) {
  const hash = contentHash(content);
  if (!force && (await getMeta(db, 'content_hash')) === hash) return { changed: false, hash };

  const opts = { seed: true, overwriteAdmin };
  const stats = await db.tx(async (t) => {
    const written = { sources: 0, nodes: 0, edges: 0 };
    await upsertDocument(t, content.document);
    for (const s of content.sources) written.sources += await upsertSource(t, s, { ...opts, documentId: content.document.id });
    for (const [i, n] of content.nodes.entries()) written.nodes += await upsertNode(t, n, { ...opts, sortOrder: i });
    for (const [i, e] of content.edges.entries()) written.edges += await upsertEdge(t, e, { ...opts, sortOrder: i });

    const keep = (list) => JSON.stringify(list);
    const removed = {
      edges: (await t.query(
        `DELETE FROM edges WHERE origin = 'seed'
           AND (from_id || '|' || to_id || '|' || relation) NOT IN (SELECT jsonb_array_elements_text($1::jsonb))`,
        [keep(content.edges.map((e) => `${e.from}|${e.to}|${e.relation}`))],
      )).rowCount,
      nodes: (await t.query(
        `DELETE FROM nodes WHERE origin = 'seed' AND id NOT IN (SELECT jsonb_array_elements_text($1::jsonb))`,
        [keep(content.nodes.map((n) => n.id))],
      )).rowCount,
      sources: (await t.query(
        `DELETE FROM sources WHERE origin = 'seed' AND id NOT IN (SELECT jsonb_array_elements_text($1::jsonb))`,
        [keep(content.sources.map((s) => s.id))],
      )).rowCount,
    };
    await setMeta(t, 'content_hash', hash);
    await setMeta(t, 'synced_at', new Date().toISOString());
    return { written, removed };
  });
  log.info(`[db] content synced (${hash}): wrote ${stats.written.nodes} nodes, ${stats.written.edges} edges, ${stats.written.sources} sources; removed ${stats.removed.nodes}/${stats.removed.edges}/${stats.removed.sources}`);
  return { changed: true, hash, ...stats };
}
