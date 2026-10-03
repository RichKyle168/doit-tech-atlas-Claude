-- Read-aloud audio, synthesised once per text and voice, then served from here.
CREATE TABLE tts_cache (
  key         TEXT PRIMARY KEY,
  voice       TEXT NOT NULL,
  text        TEXT NOT NULL,
  mime        TEXT NOT NULL DEFAULT 'audio/mpeg',
  audio       BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
