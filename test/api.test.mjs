// API and database tests. Runs on the embedded database by default;
// set TEST_DATABASE_URL to run the same suite against a real PostgreSQL (it will be reset).
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { contentPayload } from '../content/index.js';
import { start } from '../server/index.js';
import { syncContent } from '../server/db/sync.js';

const TOKEN = 'test-token';
const quiet = { info() {}, warn() {}, error() {} };
let srv;
let base;

const call = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

// Sorts keys so two objects compare by content, not key order.
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);

before(async () => {
  if (process.env.TEST_DATABASE_URL) {
    const pg = (await import('pg')).default;
    const c = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await c.connect();
    await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await c.end();
  }
  srv = await start({ port: 0, serveClient: false, databaseUrl: process.env.TEST_DATABASE_URL || '', embeddedDir: undefined, adminToken: TOKEN, log: quiet });
  base = `http://localhost:${srv.port}/api`;
});
after(async () => { await srv?.close(); });

describe('read API', () => {
  test('health reports the seeded database', async () => {
    const { status, body } = await call('/health');
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.readOnly, false);
    assert.equal(body.nodes, contentPayload().nodes.length);
  });

  test('the database returns the bundled content unchanged', async () => {
    const { body } = await call('/graph');
    const content = contentPayload();
    assert.deepEqual(canon(body.nodes), canon(content.nodes));
    assert.deepEqual(canon(body.edges), canon(content.edges));
    assert.deepEqual(canon(body.document), canon(content.document));
    const sources = await call('/sources');
    assert.deepEqual(canon(sources.body.sort((a, b) => a.id.localeCompare(b.id))), canon(content.sources.sort((a, b) => a.id.localeCompare(b.id))));
  });

  test('node detail has its path, children and relations', async () => {
    const { status, body } = await call('/nodes/robot');
    assert.equal(status, 200);
    assert.deepEqual(body.path.map((p) => p.id), ['atlas', 'u-econ', 'g-econ-hw', 'robot']);
    assert.equal(body.children.length, 17);
    const twin = await call('/nodes/digital-twin');
    assert.ok(twin.body.links.some((l) => l.node.id === 'machine-tool'));
    assert.ok(twin.body.sourceIds.includes('dt-definition'));
    assert.equal((await call('/nodes/nope')).status, 404);
  });

  test('filters, sources and search', async () => {
    const stars = await call('/nodes?level=L4&parent=robot');
    assert.equal(stars.body.length, 17);
    const src = await call('/sources?ids=mech-brain,tbl-dec');
    assert.deepEqual(src.body.map((s) => s.id).sort(), ['mech-brain', 'tbl-dec']);
    const found = await call(`/search?q=${encodeURIComponent('數位雙生')}`);
    assert.equal(found.body[0].id, 'digital-twin');
    // "_" is a LIKE wildcard; escaped, it only matches a literal underscore, which no name or text contains
    const wild = await call(`/search?q=${encodeURIComponent('_')}`);
    assert.equal(wild.body.length, 0, 'LIKE wildcards are escaped');
  });

  test('unknown API routes are JSON 404s', async () => {
    const { status, body } = await call('/does-not-exist');
    assert.equal(status, 404);
    assert.ok(body.error);
  });
});

describe('admin API', () => {
  const star = {
    level: 'L4', category: 'star', status: 'active', universe: 'u-econ', galaxy: 'g-econ-hw', system: 'robot',
    primaryParent: 'robot', capability: 'cap-perception', nameZh: '測試之星', nameEn: 'Test Star', sourceType: 'DERIVED',
    summary: { t: '用來測試的星星。', type: 'DERIVED', refs: ['mech-components'] },
  };

  test('refuses requests without the token', async () => {
    assert.equal((await call('/admin/export')).status, 401);
    assert.equal((await call('/admin/export', { token: 'wrong' })).status, 401);
    assert.equal((await call('/admin/nodes/x', { method: 'PUT', body: star })).status, 401);
  });

  test('adds, edits and removes a star', async () => {
    const created = await call('/admin/nodes/test-star', { method: 'PUT', body: star, token: TOKEN });
    assert.equal(created.status, 201);
    let graph = (await call('/graph')).body;
    assert.ok(graph.nodes.some((n) => n.id === 'test-star'));

    const edited = await call('/admin/nodes/test-star', { method: 'PUT', body: { ...star, nameZh: '改名之星' }, token: TOKEN });
    assert.equal(edited.status, 200);
    graph = (await call('/graph')).body;
    assert.equal(graph.nodes.find((n) => n.id === 'test-star').nameZh, '改名之星');

    const edge = { from: 'test-star', to: 'machine-vision', relation: 'pairs', sourceType: 'DERIVED', label: '測試', refs: ['mech-components'] };
    assert.equal((await call('/admin/edges', { method: 'PUT', body: edge, token: TOKEN })).status, 201);
    assert.ok((await call('/nodes/test-star')).body.links.some((l) => l.node.id === 'machine-vision'));

    assert.equal((await call('/admin/nodes/test-star', { method: 'DELETE', token: TOKEN })).status, 200);
    graph = (await call('/graph')).body;
    assert.ok(!graph.nodes.some((n) => n.id === 'test-star'));
    assert.ok(!graph.edges.some((e) => e.from === 'test-star'), 'relations go with the node');
  });

  test('refuses changes that would break the atlas', async () => {
    const badRef = await call('/admin/nodes/bad-star', { method: 'PUT', body: { ...star, summary: { t: 'x', type: 'SOURCE', refs: ['no-such-source'] } }, token: TOKEN });
    assert.equal(badRef.status, 422);
    assert.match(badRef.body.details.join(' '), /unknown ref/);
    const orphan = await call('/admin/nodes/bad-star', { method: 'PUT', body: { ...star, system: 'nowhere' }, token: TOKEN });
    assert.equal(orphan.status, 422);
    const withChildren = await call('/admin/nodes/robot', { method: 'DELETE', token: TOKEN });
    assert.equal(withChildren.status, 409);
    const badId = await call('/admin/nodes/Bad%20Id', { method: 'PUT', body: star, token: TOKEN });
    assert.equal(badId.status, 400);
  });

  test('content sync keeps editor changes', async () => {
    const original = (await call('/nodes/edge-ai')).body.node;
    await call('/admin/nodes/edge-ai', { method: 'PUT', body: { ...original, nameZh: '編輯過的邊緣 AI' }, token: TOKEN });
    const resync = await syncContent(srv.db, contentPayload(), { force: true, log: quiet });
    assert.equal(resync.changed, true);
    assert.equal((await call('/nodes/edge-ai')).body.node.nameZh, '編輯過的邊緣 AI');

    const reset = await call('/admin/sync', { method: 'POST', body: { overwriteAdmin: true }, token: TOKEN });
    assert.equal(reset.status, 200);
    assert.equal((await call('/nodes/edge-ai')).body.node.nameZh, original.nameZh);
    assert.equal((await syncContent(srv.db, contentPayload(), { log: quiet })).changed, false, 'unchanged content is a no-op');
  });

  test('export is a full backup', async () => {
    const { status, body } = await call('/admin/export', { token: TOKEN });
    assert.equal(status, 200);
    assert.equal(body.nodes.length, contentPayload().nodes.length);
    assert.equal(body.sources.length, contentPayload().sources.length);
  });
});

describe('fallback', () => {
  test('an unreachable database still serves the atlas, read-only', async () => {
    const down = await start({ port: 0, serveClient: false, databaseUrl: 'postgres://nobody:nothing@127.0.0.1:1/none', adminToken: TOKEN, log: quiet });
    try {
      const url = `http://localhost:${down.port}/api`;
      const health = await (await fetch(`${url}/health`)).json();
      assert.equal(health.readOnly, true);
      assert.equal(health.engine, 'embedded-fallback');
      const graph = await (await fetch(`${url}/graph`)).json();
      assert.equal(graph.nodes.length, contentPayload().nodes.length);
      const write = await fetch(`${url}/admin/nodes/x`, { method: 'PUT', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(write.status, 503);
    } finally {
      await down.close();
    }
  });
});

describe('read-aloud', () => {
  test('without a voice service the browser voice is used', async () => {
    const { status, body } = await call('/tts');
    assert.equal(status, 200);
    assert.equal(body.available, false);
    assert.equal((await call('/tts/digital-twin/summary')).status, 404);
  });

  test('with a voice service: synthesises once, caches, serves byte ranges', async () => {
    const { createTts } = await import('../server/tts.js');
    const asked = [];
    const tts = createTts({ synthesize: async (text) => { asked.push(text); return Buffer.from(`MP3:${text}`); } });
    const s = await start({ port: 0, serveClient: false, databaseUrl: '', adminToken: TOKEN, tts, log: quiet });
    try {
      const url = `http://localhost:${s.port}/api`;
      assert.equal((await (await fetch(`${url}/tts`)).json()).available, true);

      const first = await fetch(`${url}/tts/machine-vision/summary`);
      assert.equal(first.status, 200);
      assert.equal(first.headers.get('content-type'), 'audio/mpeg');
      const body = Buffer.from(await first.arrayBuffer()).toString();
      assert.match(body, /^MP3:機器人的眼睛/);
      await fetch(`${url}/tts/machine-vision/summary`);
      assert.equal(asked.length, 1, 'the second request is served from the cache');

      const part = await fetch(`${url}/tts/machine-vision/summary`, { headers: { Range: 'bytes=0-3' } });
      assert.equal(part.status, 206);
      assert.equal(Buffer.from(await part.arrayBuffer()).toString(), 'MP3:');

      // lists are read as one passage; symbols are spelled out
      await fetch(`${url}/tts/edge-ai/applications`);
      assert.match(asked.at(-1), /系統整合延遲小於等於100毫秒/);
      await fetch(`${url}/tts/edge-ai/label-applications`);
      assert.equal(asked.at(-1), '應用在哪裡');

      assert.equal((await fetch(`${url}/tts/machine-vision/industryValue`)).status, 404, 'empty fields have nothing to read');
      assert.equal((await fetch(`${url}/tts/machine-vision/excerpt`)).status, 404, 'only page parts can be read');
      assert.equal((await fetch(`${url}/tts/nope/summary`)).status, 404);
    } finally {
      await s.close();
    }
  });

  test('a failing voice service answers 502 so the browser can fall back', async () => {
    const { createTts } = await import('../server/tts.js');
    const tts = createTts({ synthesize: async () => { throw new Error('quota'); } });
    const s = await start({ port: 0, serveClient: false, databaseUrl: '', tts, log: quiet });
    try {
      assert.equal((await fetch(`http://localhost:${s.port}/api/tts/hrc/description`)).status, 502);
    } finally {
      await s.close();
    }
  });
});
