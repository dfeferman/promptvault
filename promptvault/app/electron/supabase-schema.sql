-- Supabase PostgreSQL Schema für PromptVault
-- Diese Datei kann direkt in der Supabase SQL Editor ausgeführt werden

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema Version Tabelle
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Haupttabelle für Prompts
CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  tags TEXT,
  category TEXT,
  language TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_prompts_uuid ON prompts(uuid);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_updated_at ON prompts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_deleted_at ON prompts(deleted_at);

-- Volltextsuche Index (PostgreSQL tsvector)
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING gin(
  to_tsvector('german', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''))
);

-- Categories Tabelle
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Groups Tabelle (innerhalb einer Category)
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  category_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_groups_category FOREIGN KEY (category_uuid) REFERENCES categories(uuid) ON DELETE CASCADE
);

-- ManagementPrompts Tabelle
CREATE TABLE IF NOT EXISTS management_prompts (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  group_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_management_prompts_group FOREIGN KEY (group_uuid) REFERENCES groups(uuid) ON DELETE CASCADE
);

-- PromptResults Tabelle
CREATE TABLE IF NOT EXISTS prompt_results (
  id SERIAL PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  prompt_uuid TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_prompt_results_prompt FOREIGN KEY (prompt_uuid) REFERENCES management_prompts(uuid) ON DELETE CASCADE
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_categories_uuid ON categories(uuid);
CREATE INDEX IF NOT EXISTS idx_groups_category_uuid ON groups(category_uuid);
CREATE INDEX IF NOT EXISTS idx_groups_uuid ON groups(uuid);
CREATE INDEX IF NOT EXISTS idx_groups_display_order ON groups(category_uuid, display_order);
CREATE INDEX IF NOT EXISTS idx_management_prompts_group_uuid ON management_prompts(group_uuid);
CREATE INDEX IF NOT EXISTS idx_management_prompts_uuid ON management_prompts(uuid);
CREATE INDEX IF NOT EXISTS idx_management_prompts_display_order ON management_prompts(group_uuid, display_order);
CREATE INDEX IF NOT EXISTS idx_prompt_results_prompt_uuid ON prompt_results(prompt_uuid);
CREATE INDEX IF NOT EXISTS idx_prompt_results_uuid ON prompt_results(uuid);
CREATE INDEX IF NOT EXISTS idx_prompt_results_created_at ON prompt_results(created_at DESC);

-- Trigger für updated_at automatische Aktualisierung
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_management_prompts_updated_at BEFORE UPDATE ON management_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_results_updated_at BEFORE UPDATE ON prompt_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Optional: Aktivieren wenn Authentifizierung gewünscht
-- ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE management_prompts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prompt_results ENABLE ROW LEVEL SECURITY;

-- Initiale Schema Version
INSERT INTO schema_version (version, applied_at) VALUES (2, NOW())
ON CONFLICT (version) DO NOTHING;
