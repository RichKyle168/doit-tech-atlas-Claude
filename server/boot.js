/**
 * The two halves every way of running the atlas shares:
 *   prepare() — open the database, apply migrations, sync the bundled content
 *   apiApp()  — an Express app with security headers and the API under /api
 * server/index.js adds the web client on top (long-running server: local, Render);
 * server/serverless.js wraps apiApp() for Vercel, where the CDN serves the client.
 */
import express from 'express';
import { contentPayload } from '../content/index.js';
import { openDatabase } from './db/client.js';
import { migrate } from './db/migrate.js';
import { syncContent } from './db/sync.js';
import { createApi } from './app.js';

export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};

export const databaseUrlFromEnv = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

export async function prepare({ databaseUrl = databaseUrlFromEnv(), embeddedDir, seed = true, poolMax, log = console } = {}) {
  const content = contentPayload();
  const { db, fallback } = await openDatabase({ url: databaseUrl, embeddedDir, poolMax, log });
  await migrate(db, { log });
  // the fallback copy is always seeded, otherwise it would be empty
  if (seed || fallback) {
    try {
      await syncContent(db, content, { log });
    } catch (err) {
      log.error('[db] content sync failed; serving what the database already has:', err.message);
    }
  }
  return { db, fallback, content };
}

export function apiApp({ db, fallback, content, adminToken = '', tts, csp = true, log = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.set(SECURITY_HEADERS);
    if (csp) res.set('Content-Security-Policy', CSP);
    next();
  });
  app.use('/api', createApi({ db, engine: fallback ? 'embedded-fallback' : db.engine, readOnly: fallback, adminToken, content, tts, log }));
  return app;
}
