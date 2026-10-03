/**
 * The bundled atlas content. This is the seed for the database and the offline copy
 * the server falls back to when the database cannot be reached.
 */
import { DOCUMENT, SOURCES } from './sources.js';
import { NODES } from './technologies.js';
import { EDGES } from './edges.js';

/** A fresh, JSON-safe copy of the whole atlas: { document, nodes, edges, sources }. */
export function contentPayload() {
  return JSON.parse(JSON.stringify({
    document: DOCUMENT,
    nodes: NODES,
    edges: EDGES,
    sources: Object.values(SOURCES),
  }));
}
