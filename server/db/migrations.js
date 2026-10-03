/**
 * Database migrations, applied in order, once each (see migrate.js).
 * Kept as JavaScript so they travel with the code into serverless bundles.
 * Never edit a migration that has shipped; add a new one.
 */
export const MIGRATIONS = [
  {
    version: '001_init.sql',
    sql: `
-- DOIT Tech Atlas · initial schema
-- origin = 'seed'  : row comes from the bundled content and is kept in sync with it on every boot
--          'admin' : row was created or edited through the admin API; seed sync never overwrites it

CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sources (
  id           TEXT PRIMARY KEY,
  document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page         TEXT NOT NULL,
  pdf_page     INTEGER,
  section      TEXT,
  label        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('quote', 'table', 'figure')),
  excerpt      TEXT NOT NULL,
  visual       BOOLEAN NOT NULL DEFAULT false,
  origin       TEXT NOT NULL DEFAULT 'seed' CHECK (origin IN ('seed', 'admin')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nodes (
  id           TEXT PRIMARY KEY,
  level        TEXT NOT NULL CHECK (level IN ('L0', 'L1', 'L2', 'L3', 'C', 'L4')),
  category     TEXT,
  parent_id    TEXT REFERENCES nodes(id) DEFERRABLE INITIALLY DEFERRED,
  name_zh      TEXT NOT NULL,
  name_en      TEXT,
  short_zh     TEXT,
  status       TEXT CHECK (status IN ('active', 'partial', 'preview')),
  source_type  TEXT CHECK (source_type IN ('SOURCE', 'DERIVED', 'EXTERNAL')),
  props        JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed' CHECK (origin IN ('seed', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX nodes_parent_idx ON nodes (parent_id);
CREATE INDEX nodes_level_idx ON nodes (level);

CREATE TABLE edges (
  from_id      TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_id        TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  relation     TEXT NOT NULL CHECK (relation IN ('enables', 'pairs', 'extends')),
  source_type  TEXT NOT NULL CHECK (source_type IN ('SOURCE', 'DERIVED', 'EXTERNAL')),
  label        TEXT,
  refs         JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  origin       TEXT NOT NULL DEFAULT 'seed' CHECK (origin IN ('seed', 'admin')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id, relation)
);
CREATE INDEX edges_to_idx ON edges (to_id);

CREATE TABLE meta (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
  },
  {
    version: '002_tts_cache.sql',
    sql: `
-- Read-aloud audio, synthesised once per text and voice, then served from here.
CREATE TABLE tts_cache (
  key         TEXT PRIMARY KEY,
  voice       TEXT NOT NULL,
  text        TEXT NOT NULL,
  mime        TEXT NOT NULL DEFAULT 'audio/mpeg',
  audio       BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`,
  },
];
