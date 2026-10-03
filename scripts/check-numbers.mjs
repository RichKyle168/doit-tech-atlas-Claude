// Every number quoted in a SOURCE-tagged sentence must appear in one of the passages it cites.
import { contentPayload } from '../content/index.js';
import { TEXT_FIELDS } from '../shared/graph.js';

const { nodes, sources } = contentPayload();
const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
const norm = (s) => s.replace(/\s+/g, '').replace(/,/g, '');
let bad = 0; let checked = 0;
const check = (where, st) => {
  if (!st || st.type !== 'SOURCE') return;
  const hay = norm(st.refs.map((r) => byId[r].excerpt).join(' '));
  const nums = (st.t.replace(/,/g, '').match(/\d+(\.\d+)?/g) || []);
  for (const n of nums) { checked++; if (!hay.includes(n)) { bad++; console.log('NUMBER NOT IN SOURCE', where, n, '|', st.t.slice(0, 60)); } }
};
for (const n of nodes) {
  for (const f of TEXT_FIELDS) check(`${n.id}.${f}`, n[f]);
  (n.applications || []).forEach((a, i) => check(`${n.id}.app${i}`, a));
}
console.log(`${checked} numbers checked, ${bad} not found in cited passages`);
process.exit(bad ? 1 : 0);
