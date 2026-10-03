/**
 * DOIT Tech Atlas server: the API plus the built 3D client, on one port.
 *
 *   npm start      production: serves dist/ and /api
 *   npm run dev    development: Vite (hot reload) and /api together on http://localhost:5173
 *
 * Environment
 *   DATABASE_URL   PostgreSQL connection string. Without it an embedded Postgres (PGlite) is used:
 *                  stored in .data/pglite during development, in memory otherwise.
 *   ADMIN_TOKEN    enables the editor API (/api/admin/*)
 *   PORT           default 5173 in development, 10000 in production
 *   SEED_ON_BOOT   "false" to skip syncing content/ into the database at start-up
 *   AZURE_SPEECH_KEY + AZURE_SPEECH_REGION   natural read-aloud voice (see server/tts.js)
 */
import express from 'express';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentPayload } from '../content/index.js';
import { openDatabase } from './db/client.js';
import { migrate } from './db/migrate.js';
import { syncContent } from './db/sync.js';
import { createApi } from './app.js';
import { createTts } from './tts.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export async function start({
  dev = false,
  port = Number(process.env.PORT) || (dev ? 5173 : 10000),
  databaseUrl = process.env.DATABASE_URL,
  embeddedDir = process.env.PGLITE_DIR ?? (dev ? join(ROOT, '.data/pglite') : undefined),
  adminToken = process.env.ADMIN_TOKEN || '',
  seed = process.env.SEED_ON_BOOT !== 'false',
  serveClient = true,
  tts = createTts(),
  log = console,
} = {}) {
  const content = contentPayload();
  const { db, fallback } = await openDatabase({ url: databaseUrl, embeddedDir, log });
  await migrate(db, { log });
  // the fallback copy is always seeded, otherwise it would be empty
  if (seed || fallback) {
    try {
      await syncContent(db, content, { log });
    } catch (err) {
      log.error('[db] content sync failed; serving what the database already has:', err.message);
    }
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(compression());
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    if (!dev) res.set('Content-Security-Policy', CSP);
    next();
  });

  app.use('/api', createApi({ db, engine: fallback ? 'embedded-fallback' : db.engine, readOnly: fallback, adminToken, content, tts, log }));

  if (serveClient && dev) {
    const { createServer } = await import('vite');
    const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else if (serveClient) {
    const dist = join(ROOT, 'dist');
    if (!existsSync(join(dist, 'index.html'))) log.warn('[web] dist/ is missing: run `npm run build` first.');
    app.use('/assets', express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(join(dist, 'index.html'));
    });
  }

  const server = await new Promise((ok) => {
    const s = app.listen(port, '0.0.0.0', () => ok(s));
  });
  const address = server.address();
  log.info(`[web] DOIT Tech Atlas on http://localhost:${address.port} · database: ${fallback ? 'embedded fallback (read-only)' : db.engine} · voice: ${tts.available ? tts.voice : 'browser'}`);

  const close = async () => {
    await new Promise((ok) => server.close(ok));
    await db.close();
  };
  return { app, server, port: address.port, db, close };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const running = await start({ dev: process.argv.includes('--dev') });
  const stop = async (signal) => {
    console.info(`[web] ${signal}: shutting down`);
    await running.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}
