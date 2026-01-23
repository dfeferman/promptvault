-- File: app/electron/migrations/001_init.sql

-- Haupttabelle für Prompts
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  tags TEXT,
  category TEXT,
  language TEXT,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT NULL
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_prompts_uuid ON prompts(uuid);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_deleted_at ON prompts(deleted_at);

-- FTS5 Virtual Table für Volltextsuche
CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
  title,
  description,
  content,
  uuid UNINDEXED,
  content='prompts',
  content_rowid='id'
);

-- Trigger: Sync nach INSERT
CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
  INSERT INTO prompts_fts(rowid, title, description, content, uuid)
  VALUES (new.id, new.title, new.description, new.content, new.uuid);
END;

-- Trigger: Sync nach UPDATE
CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
  UPDATE prompts_fts
  SET title = new.title,
      description = new.description,
      content = new.content,
      uuid = new.uuid
  WHERE rowid = new.id;
END;

-- Trigger: Sync nach DELETE
CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
  DELETE FROM prompts_fts WHERE rowid = old.id;
END;

-- Tabelle für Schema-Versionierung
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Initiale Version eintragen
INSERT INTO schema_version (version, applied_at) VALUES (1, datetime('now'));
