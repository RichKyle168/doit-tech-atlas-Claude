/**
 * The API as a Vercel Function (Fluid compute keeps one warm instance serving many requests).
 * The first request on a cold instance opens the database, applies migrations and syncs the
 * bundled content; every later request reuses that work.
 * The web client is not served from here: Vercel's CDN serves dist/ directly.
 */
import { apiApp, prepare } from './boot.js';
import { createTts } from './tts.js';

let ready = null;

export function getApp() {
  ready ||= (async () => {
    const { db, fallback, content } = await prepare({ seed: process.env.SEED_ON_BOOT !== 'false', poolMax: 3 });
    return apiApp({ db, fallback, content, adminToken: process.env.ADMIN_TOKEN || '', tts: createTts() });
  })().catch((err) => {
    ready = null; // try again on the next request
    throw err;
  });
  return ready;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (err) {
    console.error('[api] could not start:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Retry-After', '2');
    res.end(JSON.stringify({ error: 'The atlas is starting; please try again in a moment.' }));
  }
}
