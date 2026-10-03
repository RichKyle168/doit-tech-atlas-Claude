// Integrity check for the bundled content (the database seed).
import { contentPayload } from '../content/index.js';
import { validateContent } from '../shared/graph.js';

const content = contentPayload();
const problems = validateContent(content, { strict: true });
console.log(problems.length ? problems.join('\n') : 'graph OK');
const levels = {};
content.nodes.forEach((n) => (levels[n.level] = (levels[n.level] || 0) + 1));
console.log('nodes by level', levels, 'edges', content.edges.length, 'sources', content.sources.length);
process.exit(problems.length ? 1 : 0);
