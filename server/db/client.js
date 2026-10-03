/**
 * One small interface over two engines:
 *   PostgreSQL (DATABASE_URL set)  → production database
 *   PGlite (embedded Postgres)     → local development without installing anything,
 *                                    and the read-only fallback when PostgreSQL is unreachable
 * Both speak the same SQL, so every query in repo.js runs unchanged on either.
 *
 *   db.query(sql, params) → { rows }
 *   db.exec(sql)          → runs a script of several statements
 *   db.tx(fn)             → fn({ query, exec }) inside BEGIN … COMMIT
 */
import pg from 'pg';

function postgres(pool) {
  return {
    engine: 'postgres',
    query: (sql, params) => pool.query(sql, params),
    exec: (sql) => pool.query(sql),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (s, p) => client.query(s, p), exec: (s) => client.query(s) });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function embedded(dataDir) {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(dataDir, { recursive: true });
  }
  const db = new PGlite(dataDir || undefined);
  await db.waitReady;
  // PGlite reports affectedRows; node-postgres reports rowCount. Speak node-postgres.
  const run = async (target, sql, params) => {
    const r = await target.query(sql, params);
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
  };
  return {
    engine: dataDir ? 'embedded' : 'embedded-memory',
    query: (sql, params) => run(db, sql, params),
    exec: (sql) => db.exec(sql),
    tx: (fn) => db.transaction((t) => fn({ query: (s, p) => run(t, s, p), exec: (s) => t.exec(s) })),
    close: () => db.close(),
  };
}

/**
 * @returns {{ db, fallback: boolean, reason?: string }}
 *   fallback = true when DATABASE_URL was set but PostgreSQL could not be reached.
 */
export async function openDatabase({ url = process.env.DATABASE_URL, embeddedDir, log = console } = {}) {
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: process.env.DATABASE_SSL === 'no-verify' ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => log.error('[db] idle client error:', err.message));
    try {
      await pool.query('SELECT 1');
      return { db: postgres(pool), fallback: false };
    } catch (err) {
      log.warn(`[db] PostgreSQL unreachable (${err.message}). Serving the bundled atlas from an embedded read-only copy.`);
      await pool.end().catch(() => {});
      return { db: await embedded(), fallback: true, reason: err.message };
    }
  }
  return { db: await embedded(embeddedDir), fallback: false };
}
