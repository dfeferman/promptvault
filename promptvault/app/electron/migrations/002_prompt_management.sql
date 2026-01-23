-- File: app/electron/migrations/002_prompt_management.sql
-- Migration für Prompt Management Modul: Categories, Groups, ManagementPrompts, PromptResults

-- Categories Tabelle
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Groups Tabelle (innerhalb einer Category)
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  category_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_uuid) REFERENCES categories(uuid) ON DELETE CASCADE
);

-- ManagementPrompts Tabelle (separat von bestehenden prompts)
CREATE TABLE IF NOT EXISTS management_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  group_uuid TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_uuid) REFERENCES groups(uuid) ON DELETE CASCADE
);

-- PromptResults Tabelle (für jeden ManagementPrompt)
CREATE TABLE IF NOT EXISTS prompt_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,
  prompt_uuid TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prompt_uuid) REFERENCES management_prompts(uuid) ON DELETE CASCADE
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

-- Schema Version aktualisieren
INSERT INTO schema_version (version, applied_at) VALUES (2, datetime('now'));
