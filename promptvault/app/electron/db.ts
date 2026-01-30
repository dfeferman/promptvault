// File: app/electron/db.ts

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type {
  Prompt,
  CreatePromptPayload,
  UpdatePromptPayload,
  ListPromptsParams,
  SearchPromptsParams,
  Category,
  Group,
  ManagementPrompt,
  PromptResult,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateGroupPayload,
  UpdateGroupPayload,
  CreateManagementPromptPayload,
  UpdateManagementPromptPayload,
  CreatePromptResultPayload,
  UpdatePromptResultPayload,
  ReorderItemsPayload,
} from './ipc';

let db: Database.Database | null = null;

/**
 * Initialisiert die SQLite-Datenbank und führt Migrationen aus
 */
export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'promptvault');
  
  // Verzeichnis erstellen falls nicht vorhanden
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = path.join(dbDir, 'prompts.db');
  console.log('[DB] Database path:', dbPath);
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging für bessere Concurrency
  db.pragma('foreign_keys = ON');
  
  runMigrations(db);
  
  // Prüfe und füge global_variables Spalte hinzu, falls sie nicht existiert
  ensureGlobalVariablesColumn(db);
  
  return db;
}

/**
 * Stellt sicher, dass die global_variables Spalte in der groups Tabelle existiert
 */
function ensureGlobalVariablesColumn(database: Database.Database): void {
  try {
    const columnCheck = database.prepare(`
      SELECT COUNT(*) as count 
      FROM pragma_table_info('groups') 
      WHERE name = 'global_variables'
    `).get() as { count: number };
    
    if (columnCheck.count === 0) {
      console.log('[DB] Column global_variables does not exist, adding it...');
      database.prepare('ALTER TABLE groups ADD COLUMN global_variables TEXT DEFAULT \'{}\'').run();
      // Aktualisiere bestehende Einträge
      database.prepare('UPDATE groups SET global_variables = \'{}\' WHERE global_variables IS NULL').run();
      console.log('[DB] Column global_variables added successfully');
    } else {
      console.log('[DB] Column global_variables already exists');
    }
  } catch (error: any) {
    console.error('[DB] Error checking/adding global_variables column:', error);
    // Ignoriere Fehler, wenn Spalte bereits existiert
    if (!error.message || !error.message.includes('duplicate column name')) {
      throw error;
    }
  }
}

/**
 * Führt SQL-Migrationen aus dem migrations-Ordner aus
 */
function runMigrations(database: Database.Database): void {
  // Prüfen ob schema_version Tabelle existiert
  const tableCheck = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
  ).get();
  
  let currentVersion = 0;
  if (tableCheck) {
    const versionRow = database.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number };
    currentVersion = versionRow.version || 0;
  }
  
  console.log('[DB] Current schema version:', currentVersion);
  
  // Migrations-Pfad bestimmen (development vs. production)
  let migrationsDir: string;
  if (app.isPackaged) {
    migrationsDir = path.join(process.resourcesPath, 'migrations');
  } else {
    migrationsDir = path.join(__dirname, '..', '..', 'app', 'electron', 'migrations');
  }
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('[DB] No migrations directory found at:', migrationsDir);
    return;
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log('[DB] Found migration files:', migrationFiles);
  
  for (const file of migrationFiles) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    
    const version = parseInt(versionMatch[1], 10);
    if (version <= currentVersion) continue;
    
    console.log(`[DB] Running migration: ${file}`);
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    try {
      // Für Migration 003: Prüfe ob Spalte bereits existiert
      if (version === 3) {
        const columnCheck = database.prepare(`
          SELECT COUNT(*) as count 
          FROM pragma_table_info('groups') 
          WHERE name = 'global_variables'
        `).get() as { count: number };
        
        if (columnCheck.count === 0) {
          console.log('[DB] Adding global_variables column to groups table');
          database.exec(sql);
        } else {
          console.log('[DB] Column global_variables already exists, skipping ALTER TABLE');
          // Nur Schema-Version aktualisieren
          database.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, datetime("now"))').run(version);
        }
      } else {
        database.exec(sql);
      }
      console.log(`[DB] Migration ${file} completed`);
    } catch (error: any) {
      // Wenn Spalte bereits existiert, ist das OK
      if (error.message && error.message.includes('duplicate column name')) {
        console.log(`[DB] Column already exists, updating schema version only`);
        database.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, datetime("now"))').run(version);
      } else {
        console.error(`[DB] Migration ${file} failed:`, error);
        throw error;
      }
    }
  }
}

/**
 * Gibt den Pfad zur Datenbank zurück
 */
export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'promptvault', 'prompts.db');
}

/**
 * Gibt die Datenbankinstanz zurück
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Erstellt einen neuen Prompt
 */
export function createPrompt(payload: CreatePromptPayload): Prompt {
  console.log('[DB] Creating prompt:', { title: payload.title, category: payload.category });
  const database = getDb();
  const now = new Date().toISOString();
  const uuid = uuidv4();
  
  // Validierung
  if (!payload.title?.trim()) {
    console.warn('[DB] Validation failed: empty title');
    throw new Error('VALIDATION_ERROR: Title is required');
  }
  if (!payload.content?.trim()) {
    console.warn('[DB] Validation failed: empty content');
    throw new Error('VALIDATION_ERROR: Content is required');
  }
  
  const stmt = database.prepare(`
    INSERT INTO prompts (uuid, title, description, content, tags, category, language, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    uuid,
    payload.title.trim(),
    payload.description?.trim() || null,
    payload.content.trim(),
    payload.tags?.trim() || null,
    payload.category?.trim() || null,
    payload.language?.trim() || null,
    now,
    now
  );
  
  console.log('[DB] Prompt created:', { uuid, title: payload.title });
  return getPrompt(uuid)!;
}

/**
 * Aktualisiert einen vorhandenen Prompt
 */
export function updatePrompt(uuid: string, payload: UpdatePromptPayload): Prompt {
  console.log('[DB] Updating prompt:', { uuid, changes: Object.keys(payload) });
  const database = getDb();
  const now = new Date().toISOString();
  
  // Validierung
  if (payload.title !== undefined && !payload.title?.trim()) {
    console.warn('[DB] Validation failed: empty title');
    throw new Error('VALIDATION_ERROR: Title cannot be empty');
  }
  if (payload.content !== undefined && !payload.content?.trim()) {
    console.warn('[DB] Validation failed: empty content');
    throw new Error('VALIDATION_ERROR: Content cannot be empty');
  }
  
  // Dynamisches UPDATE Statement bauen
  const updates: string[] = [];
  const values: any[] = [];
  
  if (payload.title !== undefined) {
    updates.push('title = ?');
    values.push(payload.title.trim());
  }
  if (payload.description !== undefined) {
    updates.push('description = ?');
    values.push(payload.description?.trim() || null);
  }
  if (payload.content !== undefined) {
    updates.push('content = ?');
    values.push(payload.content.trim());
  }
  if (payload.tags !== undefined) {
    updates.push('tags = ?');
    values.push(payload.tags?.trim() || null);
  }
  if (payload.category !== undefined) {
    updates.push('category = ?');
    values.push(payload.category?.trim() || null);
  }
  if (payload.language !== undefined) {
    updates.push('language = ?');
    values.push(payload.language?.trim() || null);
  }
  if (payload.is_favorite !== undefined) {
    updates.push('is_favorite = ?');
    values.push(payload.is_favorite ? 1 : 0);
  }
  
  if (updates.length === 0) {
    console.debug('[DB] No changes to update for prompt:', uuid);
    return getPrompt(uuid)!;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(uuid);
  
  const stmt = database.prepare(`
    UPDATE prompts
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `);
  
  const info = stmt.run(...values);
  
  if (info.changes === 0) {
    console.warn('[DB] Update failed - prompt not found:', uuid);
    throw new Error('NOT_FOUND: Prompt not found');
  }
  
  console.log('[DB] Prompt updated:', { uuid, changes: updates.length });
  return getPrompt(uuid)!;
}

/**
 * Löscht einen Prompt (hard delete)
 */
export function deletePrompt(uuid: string): boolean {
  console.warn('[DB] Deleting prompt:', { uuid });
  const database = getDb();
  
  const stmt = database.prepare('DELETE FROM prompts WHERE uuid = ?');
  const info = stmt.run(uuid);
  
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - prompt not found:', uuid);
    throw new Error('NOT_FOUND: Prompt not found');
  }
  
  console.warn('[DB] Prompt deleted:', { uuid });
  return true;
}

/**
 * Lädt einen einzelnen Prompt anhand der UUID
 */
export function getPrompt(uuid: string): Prompt | null {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT * FROM prompts WHERE uuid = ? AND deleted_at IS NULL
  `);
  
  return stmt.get(uuid) as Prompt | null;
}

/**
 * Listet Prompts mit optionaler Sortierung und Pagination
 */
export function listPrompts(params: ListPromptsParams = {}): Prompt[] {
  const startTime = Date.now();
  const database = getDb();
  const { limit = 100, offset = 0, sort = 'updated_at', order = 'desc' } = params;
  
  const validSorts = ['updated_at', 'created_at', 'title'];
  const validOrders = ['asc', 'desc'];
  
  const sortColumn = validSorts.includes(sort) ? sort : 'updated_at';
  const sortOrder = validOrders.includes(order) ? order : 'desc';
  
  console.debug('[DB] Listing prompts:', { limit, offset, sort: sortColumn, order: sortOrder });
  
  const stmt = database.prepare(`
    SELECT * FROM prompts
    WHERE deleted_at IS NULL
    ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
    LIMIT ? OFFSET ?
  `);
  
  const results = stmt.all(limit, offset) as Prompt[];
  const duration = Date.now() - startTime;
  console.debug('[DB] Prompts listed:', { count: results.length, duration: `${duration}ms`, params });
  return results;
}

/**
 * Sucht Prompts mit FTS5 Volltextsuche
 */
export function searchPrompts(params: SearchPromptsParams): Prompt[] {
  const startTime = Date.now();
  const database = getDb();
  const { q, category, tag, limit = 100, offset = 0 } = params;
  
  console.debug('[DB] Searching prompts:', { query: q, category, tag, limit, offset });
  
  // Wenn keine Suchkriterien, gebe alle zurück
  if (!q && !category && !tag) {
    return listPrompts({ limit, offset });
  }
  
  const conditions: string[] = [];
  const values: any[] = [];
  
  // Volltextsuche mit FTS5
  if (q && q.trim()) {
    const ftsQuery = q.trim().split(/\s+/).map(term => `"${term}"`).join(' OR ');
    
    const stmt = database.prepare(`
      SELECT p.*, fts.rank
      FROM prompts p
      INNER JOIN prompts_fts fts ON p.id = fts.rowid
      WHERE prompts_fts MATCH ?
        AND p.deleted_at IS NULL
        ${category ? 'AND p.category = ?' : ''}
        ${tag ? 'AND p.tags LIKE ?' : ''}
      ORDER BY fts.rank, p.updated_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const queryValues: any[] = [ftsQuery];
    if (category) queryValues.push(category);
    if (tag) queryValues.push(`%${tag}%`);
    queryValues.push(limit, offset);
    
    const results = stmt.all(...queryValues) as Prompt[];
    const duration = Date.now() - startTime;
    console.debug('[DB] Search completed:', { count: results.length, duration: `${duration}ms`, query: q });
    return results;
  }
  
  // Nur Filter ohne Volltext
  if (category) conditions.push('category = ?'), values.push(category);
  if (tag) conditions.push('tags LIKE ?'), values.push(`%${tag}%`);
  
  const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  
  const stmt = database.prepare(`
    SELECT * FROM prompts
    WHERE deleted_at IS NULL ${whereClause}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `);
  
  return stmt.all(...values, limit, offset) as Prompt[];
}

/**
 * Exportiert alle Prompts als JSON-Array
 */
export function exportAllPrompts(): Prompt[] {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT uuid, title, description, content, tags, category, language, is_favorite, created_at, updated_at
    FROM prompts
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
  `);
  
  return stmt.all() as Prompt[];
}

/**
 * Importiert Prompts aus JSON-Array mit Merge-Logik
 */
export function importPrompts(prompts: Partial<Prompt>[]): { imported: number; updated: number; skipped: number } {
  const database = getDb();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  const transaction = database.transaction((items: Partial<Prompt>[]) => {
    for (const item of items) {
      // Validierung
      if (!item.uuid || !item.title || !item.content) {
        skipped++;
        continue;
      }
      
      // Prüfen ob UUID existiert
      const existing = getPrompt(item.uuid);
      
      if (existing) {
        // Update nur wenn imported.updated_at neuer ist
        const existingDate = new Date(existing.updated_at);
        const importDate = new Date(item.updated_at || new Date().toISOString());
        
        if (importDate > existingDate) {
          updatePrompt(item.uuid, {
            title: item.title,
            description: item.description,
            content: item.content,
            tags: item.tags,
            category: item.category,
            language: item.language,
            is_favorite: item.is_favorite,
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Neuer Prompt
        const stmt = database.prepare(`
          INSERT INTO prompts (uuid, title, description, content, tags, category, language, is_favorite, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          item.uuid,
          item.title,
          item.description || null,
          item.content,
          item.tags || null,
          item.category || null,
          item.language || null,
          item.is_favorite || 0,
          item.created_at || new Date().toISOString(),
          item.updated_at || new Date().toISOString()
        );
        
        imported++;
      }
    }
  });
  
  transaction(prompts);
  
  return { imported, updated, skipped };
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - Categories
// ============================================================================

/**
 * Erstellt eine neue Kategorie
 */
export function createCategory(payload: CreateCategoryPayload): Category {
  console.log('[DB] Creating category:', { name: payload.name });
  const database = getDb();
  const now = new Date().toISOString();
  const uuid = uuidv4();
  
  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Category name is required');
  }
  
  const stmt = database.prepare(`
    INSERT INTO categories (uuid, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuid,
    payload.name.trim(),
    payload.description?.trim() || null,
    now,
    now
  );
  
  console.log('[DB] Category created:', { uuid, name: payload.name });
  return getCategory(uuid)!;
}

/**
 * Aktualisiert eine Kategorie
 */
export function updateCategory(uuid: string, payload: UpdateCategoryPayload): Category {
  console.log('[DB] Updating category:', { uuid, changes: Object.keys(payload) });
  const database = getDb();
  const now = new Date().toISOString();
  
  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Category name cannot be empty');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (payload.name !== undefined) {
    updates.push('name = ?');
    values.push(payload.name.trim());
  }
  if (payload.description !== undefined) {
    updates.push('description = ?');
    values.push(payload.description?.trim() || null);
  }
  
  if (updates.length === 0) {
    return getCategory(uuid)!;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(uuid);
  
  const stmt = database.prepare(`
    UPDATE categories
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `);
  
  const info = stmt.run(...values);
  
  if (info.changes === 0) {
    console.warn('[DB] Update failed - category not found:', uuid);
    throw new Error('NOT_FOUND: Category not found');
  }
  
  console.log('[DB] Category updated:', { uuid });
  return getCategory(uuid)!;
}

/**
 * Löscht eine Kategorie (CASCADE löscht auch Groups, Prompts, Results)
 */
export function deleteCategory(uuid: string): boolean {
  const database = getDb();
  
  const stmt = database.prepare('DELETE FROM categories WHERE uuid = ?');
  const info = stmt.run(uuid);
  
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - category not found:', uuid);
    throw new Error('NOT_FOUND: Category not found');
  }
  
  console.warn('[DB] Category deleted:', { uuid });
  return true;
}

/**
 * Lädt eine Kategorie
 */
export function getCategory(uuid: string): Category | null {
  const database = getDb();
  
  const stmt = database.prepare('SELECT * FROM categories WHERE uuid = ?');
  return stmt.get(uuid) as Category | null;
}

/**
 * Listet alle Kategorien
 */
export function listCategories(): Category[] {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT * FROM categories
    ORDER BY name ASC
  `);
  
  return stmt.all() as Category[];
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - Groups
// ============================================================================

/**
 * Erstellt eine neue Gruppe
 */
export function createGroup(payload: CreateGroupPayload): Group {
  console.log('[DB] Creating group:', { name: payload.name, category_uuid: payload.category_uuid });
  const database = getDb();
  const now = new Date().toISOString();
  const uuid = uuidv4();
  
  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Group name is required');
  }
  if (!payload.category_uuid) {
    throw new Error('VALIDATION_ERROR: Category UUID is required');
  }
  
  // Prüfe ob Category existiert
  const category = getCategory(payload.category_uuid);
  if (!category) {
    throw new Error('NOT_FOUND: Category not found');
  }
  
  // Bestimme display_order wenn nicht angegeben
  let displayOrder = payload.display_order;
  if (displayOrder === undefined) {
    const maxOrder = database.prepare(`
      SELECT MAX(display_order) as max_order FROM groups WHERE category_uuid = ?
    `).get(payload.category_uuid) as { max_order: number | null };
    displayOrder = (maxOrder.max_order ?? -1) + 1;
  }
  
  // Konvertiere global_variables zu JSON string
  const globalVariablesJson = payload.global_variables 
    ? JSON.stringify(payload.global_variables) 
    : '{}';
  console.log('[DB] Creating group with global_variables:', { name: payload.name, global_variables: globalVariablesJson });

  const stmt = database.prepare(`
    INSERT INTO groups (uuid, category_uuid, name, description, display_order, global_variables, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuid,
    payload.category_uuid,
    payload.name.trim(),
    payload.description?.trim() || null,
    displayOrder,
    globalVariablesJson,
    now,
    now
  );
  
  console.log('[DB] Group created:', { uuid, name: payload.name });
  return getGroup(uuid)!;
}

/**
 * Aktualisiert eine Gruppe
 */
export function updateGroup(uuid: string, payload: UpdateGroupPayload): Group {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Group name cannot be empty');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (payload.name !== undefined) {
    updates.push('name = ?');
    values.push(payload.name.trim());
  }
  if (payload.description !== undefined) {
    updates.push('description = ?');
    values.push(payload.description?.trim() || null);
  }
  if (payload.display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(payload.display_order);
  }
  if (payload.global_variables !== undefined) {
    updates.push('global_variables = ?');
    // Speichere als JSON string, auch wenn leer (wird als '{}' gespeichert)
    const globalVarsJson = JSON.stringify(payload.global_variables || {});
    values.push(globalVarsJson);
    console.log('[DB] Updating global_variables:', { uuid, global_variables: globalVarsJson });
  }
  
  if (updates.length === 0) {
    return getGroup(uuid)!;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(uuid);
  
  const stmt = database.prepare(`
    UPDATE groups
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `);
  
  const info = stmt.run(...values);
  
  if (info.changes === 0) {
    throw new Error('NOT_FOUND: Group not found');
  }
  
  return getGroup(uuid)!;
}

/**
 * Löscht eine Gruppe (CASCADE löscht auch Prompts und Results)
 */
export function deleteGroup(uuid: string): boolean {
  console.warn('[DB] Deleting group:', { uuid });
  const database = getDb();
  
  const stmt = database.prepare('DELETE FROM groups WHERE uuid = ?');
  const info = stmt.run(uuid);
  
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - group not found:', uuid);
    throw new Error('NOT_FOUND: Group not found');
  }
  
  console.warn('[DB] Group deleted:', { uuid });
  return true;
}

/**
 * Lädt eine Gruppe
 */
export function getGroup(uuid: string): Group | null {
  const database = getDb();
  
  const stmt = database.prepare('SELECT * FROM groups WHERE uuid = ?');
  return stmt.get(uuid) as Group | null;
}

/**
 * Listet alle Gruppen einer Kategorie (sortiert nach display_order)
 */
export function listGroups(category_uuid: string): Group[] {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT * FROM groups
    WHERE category_uuid = ?
    ORDER BY display_order ASC, created_at ASC
  `);
  
  return stmt.all(category_uuid) as Group[];
}

/**
 * Ordnet Gruppen neu (bulk update)
 */
export function reorderGroups(payload: ReorderItemsPayload): boolean {
  const database = getDb();
  
  const transaction = database.transaction((items: ReorderItemsPayload['items']) => {
    const stmt = database.prepare('UPDATE groups SET display_order = ? WHERE uuid = ?');
    for (const item of items) {
      stmt.run(item.display_order, item.uuid);
    }
  });
  
  transaction(payload.items);
  return true;
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - ManagementPrompts
// ============================================================================

/**
 * Erstellt einen neuen ManagementPrompt
 */
export function createManagementPrompt(payload: CreateManagementPromptPayload): ManagementPrompt {
  console.log('[DB] Creating management prompt:', { name: payload.name, group_uuid: payload.group_uuid });
  const database = getDb();
  const now = new Date().toISOString();
  const uuid = uuidv4();
  
  if (!payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt name is required');
  }
  if (!payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt content is required');
  }
  if (!payload.group_uuid) {
    throw new Error('VALIDATION_ERROR: Group UUID is required');
  }
  
  // Prüfe ob Group existiert
  const group = getGroup(payload.group_uuid);
  if (!group) {
    throw new Error('NOT_FOUND: Group not found');
  }
  
  // Bestimme display_order wenn nicht angegeben
  let displayOrder = payload.display_order;
  if (displayOrder === undefined) {
    const maxOrder = database.prepare(`
      SELECT MAX(display_order) as max_order FROM management_prompts WHERE group_uuid = ?
    `).get(payload.group_uuid) as { max_order: number | null };
    displayOrder = (maxOrder.max_order ?? -1) + 1;
  }
  
  const stmt = database.prepare(`
    INSERT INTO management_prompts (uuid, group_uuid, name, content, display_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuid,
    payload.group_uuid,
    payload.name.trim(),
    payload.content.trim(),
    displayOrder,
    now,
    now
  );
  
  console.log('[DB] Management prompt created:', { uuid, name: payload.name });
  return getManagementPrompt(uuid)!;
}

/**
 * Aktualisiert einen ManagementPrompt
 */
export function updateManagementPrompt(uuid: string, payload: UpdateManagementPromptPayload): ManagementPrompt {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (payload.name !== undefined && !payload.name?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt name cannot be empty');
  }
  if (payload.content !== undefined && !payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Prompt content cannot be empty');
  }
  
  // Wenn group_uuid geändert wird, prüfe ob neue Group existiert
  if (payload.group_uuid !== undefined) {
    const group = getGroup(payload.group_uuid);
    if (!group) {
      throw new Error('NOT_FOUND: Target group not found');
    }
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (payload.name !== undefined) {
    updates.push('name = ?');
    values.push(payload.name.trim());
  }
  if (payload.content !== undefined) {
    updates.push('content = ?');
    values.push(payload.content.trim());
  }
  if (payload.display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(payload.display_order);
  }
  if (payload.group_uuid !== undefined) {
    updates.push('group_uuid = ?');
    values.push(payload.group_uuid);
  }
  
  if (updates.length === 0) {
    return getManagementPrompt(uuid)!;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(uuid);
  
  const stmt = database.prepare(`
    UPDATE management_prompts
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `);
  
  const info = stmt.run(...values);
  
  if (info.changes === 0) {
    throw new Error('NOT_FOUND: ManagementPrompt not found');
  }
  
  return getManagementPrompt(uuid)!;
}

/**
 * Löscht einen ManagementPrompt (CASCADE löscht auch Results)
 */
export function deleteManagementPrompt(uuid: string): boolean {
  console.warn('[DB] Deleting management prompt:', { uuid });
  const database = getDb();
  
  const stmt = database.prepare('DELETE FROM management_prompts WHERE uuid = ?');
  const info = stmt.run(uuid);
  
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - management prompt not found:', uuid);
    throw new Error('NOT_FOUND: ManagementPrompt not found');
  }
  
  console.warn('[DB] Management prompt deleted:', { uuid });
  return true;
}

/**
 * Lädt einen ManagementPrompt
 */
export function getManagementPrompt(uuid: string): ManagementPrompt | null {
  const database = getDb();
  
  const stmt = database.prepare('SELECT * FROM management_prompts WHERE uuid = ?');
  return stmt.get(uuid) as ManagementPrompt | null;
}

/**
 * Listet alle ManagementPrompts einer Gruppe (sortiert nach display_order)
 */
export function listManagementPrompts(group_uuid: string): ManagementPrompt[] {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT * FROM management_prompts
    WHERE group_uuid = ?
    ORDER BY display_order ASC, created_at ASC
  `);
  
  return stmt.all(group_uuid) as ManagementPrompt[];
}

/**
 * Ordnet ManagementPrompts neu (bulk update)
 */
export function reorderManagementPrompts(payload: ReorderItemsPayload): boolean {
  const database = getDb();
  
  const transaction = database.transaction((items: ReorderItemsPayload['items']) => {
    const stmt = database.prepare('UPDATE management_prompts SET display_order = ? WHERE uuid = ?');
    for (const item of items) {
      stmt.run(item.display_order, item.uuid);
    }
  });
  
  transaction(payload.items);
  return true;
}

// ============================================================================
// PROMPT MANAGEMENT MODULE - PromptResults
// ============================================================================

/**
 * Erstellt ein neues PromptResult
 */
export function createPromptResult(payload: CreatePromptResultPayload): PromptResult {
  console.log('[DB] Creating prompt result:', { prompt_uuid: payload.prompt_uuid, contentLength: payload.content?.length });
  const database = getDb();
  const now = new Date().toISOString();
  const uuid = uuidv4();
  
  if (!payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Result content is required');
  }
  if (!payload.prompt_uuid) {
    throw new Error('VALIDATION_ERROR: Prompt UUID is required');
  }
  
  // Prüfe ob Prompt existiert
  const prompt = getManagementPrompt(payload.prompt_uuid);
  if (!prompt) {
    throw new Error('NOT_FOUND: ManagementPrompt not found');
  }
  
  const stmt = database.prepare(`
    INSERT INTO prompt_results (uuid, prompt_uuid, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuid,
    payload.prompt_uuid,
    payload.content.trim(),
    now,
    now
  );
  
  console.log('[DB] Prompt result created:', { uuid, prompt_uuid: payload.prompt_uuid });
  return getPromptResult(uuid)!;
}

/**
 * Aktualisiert ein PromptResult
 */
export function updatePromptResult(uuid: string, payload: UpdatePromptResultPayload): PromptResult {
  const database = getDb();
  const now = new Date().toISOString();
  
  if (payload.content !== undefined && !payload.content?.trim()) {
    throw new Error('VALIDATION_ERROR: Result content cannot be empty');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (payload.content !== undefined) {
    updates.push('content = ?');
    values.push(payload.content.trim());
  }
  
  if (updates.length === 0) {
    return getPromptResult(uuid)!;
  }
  
  updates.push('updated_at = ?');
  values.push(now);
  values.push(uuid);
  
  const stmt = database.prepare(`
    UPDATE prompt_results
    SET ${updates.join(', ')}
    WHERE uuid = ?
  `);
  
  const info = stmt.run(...values);
  
  if (info.changes === 0) {
    throw new Error('NOT_FOUND: PromptResult not found');
  }
  
  return getPromptResult(uuid)!;
}

/**
 * Löscht ein PromptResult
 */
export function deletePromptResult(uuid: string): boolean {
  console.warn('[DB] Deleting prompt result:', { uuid });
  const database = getDb();
  
  const stmt = database.prepare('DELETE FROM prompt_results WHERE uuid = ?');
  const info = stmt.run(uuid);
  
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - prompt result not found:', uuid);
    throw new Error('NOT_FOUND: PromptResult not found');
  }
  
  console.warn('[DB] Prompt result deleted:', { uuid });
  return true;
}

/**
 * Lädt ein PromptResult
 */
export function getPromptResult(uuid: string): PromptResult | null {
  const database = getDb();
  
  const stmt = database.prepare('SELECT * FROM prompt_results WHERE uuid = ?');
  return stmt.get(uuid) as PromptResult | null;
}

/**
 * Listet alle PromptResults eines Prompts (neueste zuerst)
 */
export function listPromptResults(prompt_uuid: string): PromptResult[] {
  const database = getDb();
  
  const stmt = database.prepare(`
    SELECT * FROM prompt_results
    WHERE prompt_uuid = ?
    ORDER BY created_at DESC
  `);
  
  return stmt.all(prompt_uuid) as PromptResult[];
}
