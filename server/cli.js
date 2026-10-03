/**
 * Database chores.
 *
 *   npm run db:migrate                 create / upgrade the tables
 *   npm run db:seed                    sync content/ into the database (editor changes are kept)
 *   npm run db:seed -- --reset         same, but bundled content also replaces editor changes
 *   npm run db:export > backup.json    dump everything
 *   npm run db:import -- backup.json   load a dump (rows become editor rows)
 *
 * Uses DATABASE_URL when set, otherwise the local embedded database in .data/pglite.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentPayload } from '../content/index.js';
import { validateContent } from '../shared/graph.js';
import { openDatabase } from './db/client.js';
import { migrate } from './db/migrate.js';
import { syncContent } from './db/sync.js';
import * as repo from './db/repo.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...args] = process.argv.slice(2);
const log = { info: (...a) => console.error(...a), warn: (...a) => console.error(...a), error: (...a) => console.error(...a) };

const { db, fallback } = await openDatabase({ embeddedDir: process.env.PGLITE_DIR ?? join(ROOT, '.data/pglite'), log });
if (fallback) {
  console.error('DATABASE_URL is set but the database cannot be reached.');
  process.exit(1);
}
await migrate(db, { log });

try {
  if (command === 'migrate') {
    log.info('schema up to date');
  } else if (command === 'seed') {
    const r = await syncContent(db, contentPayload(), { force: true, overwriteAdmin: args.includes('--reset'), log });
    log.info(r.changed ? 'seeded' : 'already up to date');
  } else if (command === 'export') {
    process.stdout.write(`${JSON.stringify(await repo.loadAll(db), null, 2)}\n`);
  } else if (command === 'import') {
    const data = JSON.parse(readFileSync(args[0], 'utf8'));
    const problems = validateContent(data);
    if (problems.length) {
      console.error(`refusing to import, ${problems.length} problems:\n${problems.slice(0, 20).join('\n')}`);
      process.exit(1);
    }
    await db.tx(async (t) => {
      await repo.upsertDocument(t, data.document);
      for (const s of data.sources) await repo.upsertSource(t, s, { documentId: data.document.id });
      for (const n of data.nodes) await repo.upsertNode(t, n);
      for (const e of data.edges) await repo.upsertEdge(t, e);
    });
    log.info(`imported ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.sources.length} sources`);
  } else {
    console.error('usage: node server/cli.js migrate | seed [--reset] | export | import <file.json>');
    process.exitCode = 1;
  }
} finally {
  await db.close();
}
