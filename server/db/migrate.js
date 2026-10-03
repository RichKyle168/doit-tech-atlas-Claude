/**
 * Applies the migrations in migrations.js, in order, once each.
 * Safe when several servers start at the same moment (serverless cold starts):
 * everything happens inside one transaction holding an advisory lock.
 */
import { MIGRATIONS } from './migrations.js';

const LOCK = 7272_0001;

export async function migrate(db, { log = console } = {}) {
  return db.tx(async (t) => {
    await t.query('SELECT pg_advisory_xact_lock($1)', [LOCK]);
    await t.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const done = new Set((await t.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    const applied = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await t.exec(m.sql);
      await t.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
      applied.push(m.version);
      log.info(`[db] migration applied: ${m.version}`);
    }
    return applied;
  });
}
