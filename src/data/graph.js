/**
 * The atlas the browser is showing. Filled once by setGraph() with what the API returned,
 * then read by every component through the helpers below. Relationships are always derived
 * from the data, never hard-coded in the UI.
 */
import { indexGraph, refIdsOf } from '../../shared/graph.js';

export let NODES = [];
export let EDGES = [];
export let UNIVERSES = [];
export let CONSTELLATIONS = [];
export let DOCUMENT = null;
export let VERSION = '';
let byId = new Map();
let neighbours = new Map();

export function setGraph({ document, nodes, edges, version = '' }) {
  DOCUMENT = document;
  VERSION = version;
  NODES = nodes;
  EDGES = edges;
  ({ byId, neighbours } = indexGraph(nodes, edges));
  for (const n of NODES) {
    const others = (neighbours.get(n.id) || []).map((l) => byId.get(l.other)).filter(Boolean);
    n.relatedNodes = [...new Set(others.filter((o) => o.level === 'L4').map((o) => o.id))];
    n.relatedSystems = [...new Set(others.filter((o) => o.level === 'L3').map((o) => o.id))];
    n.relatedUniverses = [...new Set(others.map((o) => o.universe).filter((u) => u && u !== n.universe))];
  }
  UNIVERSES = NODES.filter((n) => n.level === 'L1');
  CONSTELLATIONS = NODES.filter((n) => n.level === 'C');
}

export const getNode = (id) => byId.get(id);
export const linksOf = (id) => neighbours.get(id) || [];
export const childrenOf = (id) => NODES.filter((n) => n.primaryParent === id);
export const starsOf = (systemId) => NODES.filter((n) => n.level === 'L4' && n.system === systemId);
export const galaxiesOf = (universeId) => NODES.filter((n) => n.level === 'L2' && n.universe === universeId);
export const constellationsOf = (systemId) => CONSTELLATIONS.filter((c) => c.system === systemId);

/** Systems of a galaxy: its declared order first, then any system that names the galaxy itself. */
export function systemsOf(galaxyId) {
  const listed = (byId.get(galaxyId)?.systemIds || []).map((id) => byId.get(id)).filter(Boolean);
  const extra = NODES.filter((n) => n.level === 'L3' && n.galaxy === galaxyId && !listed.includes(n));
  return [...listed, ...extra];
}

/** Root-first chain of primaryParent ancestors, including the node itself. */
export function pathTo(id) {
  const chain = [];
  for (let cur = byId.get(id); cur; cur = cur.primaryParent ? byId.get(cur.primaryParent) : null) chain.unshift(cur);
  return chain;
}

/** Ids of every source a node relies on. */
export const refsOf = (id) => refIdsOf(byId.get(id), linksOf(id));
