// File: app/electron/migrate-to-supabase.ts
// Migrations-Script: SQLite -> Supabase
// Führt alle Daten von der lokalen SQLite-Datenbank nach Supabase

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  initSupabase,
  testConnection,
} from './supabase-config';
import * as supabaseDb from './db-supabase';

/**
 * Migriert alle Daten von SQLite nach Supabase
 */
export async function migrateToSupabase(): Promise<{
  prompts: number;
  categories: number;
  groups: number;
  managementPrompts: number;
  promptResults: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let promptsMigrated = 0;
  let categoriesMigrated = 0;
  let groupsMigrated = 0;
  let managementPromptsMigrated = 0;
  let promptResultsMigrated = 0;

  console.log('[Migration] Starte Migration von SQLite nach Supabase...');

  // 1. Supabase-Verbindung prüfen
  try {
    initSupabase();
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Supabase-Verbindung fehlgeschlagen');
    }
    console.log('[Migration] ✓ Supabase-Verbindung erfolgreich');
  } catch (error: any) {
    throw new Error(`Supabase-Verbindung fehlgeschlagen: ${error.message}`);
  }

  // 2. SQLite-Datenbank öffnen
  // Prüfe mehrere mögliche Pfade
  const userDataPath = app.getPath('userData');
  const possiblePaths = [
    path.join(userDataPath, 'promptvault', 'prompts.db'), // Produktion
    path.join(userDataPath, 'prompts.db'), // Alternative
    path.join(process.env.APPDATA || '', 'promptvault', 'prompts.db'), // Windows direkt
  ];

  let dbPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      dbPath = possiblePath;
      break;
    }
  }

  if (!dbPath) {
    console.error('\n❌ SQLite-Datenbank nicht gefunden!');
    console.error('Geprüfte Pfade:');
    possiblePaths.forEach(p => console.error(`  - ${p}`));
    throw new Error(`SQLite-Datenbank nicht gefunden. Bitte stellen Sie sicher, dass die Datenbank existiert.`);
  }

  console.log('[Migration] Öffne SQLite-Datenbank:', dbPath);
  const sqliteDb = new Database(dbPath);

  try {
    // 3. Migriere Prompts
    console.log('[Migration] Migriere Prompts...');
    const prompts = sqliteDb.prepare(`
      SELECT uuid, title, description, content, tags, category, language, 
             is_favorite, created_at, updated_at
      FROM prompts
      WHERE deleted_at IS NULL
    `).all() as any[];

    for (const prompt of prompts) {
      try {
        // Prüfe ob bereits vorhanden
        const existing = await supabaseDb.getPrompt(prompt.uuid);
        if (existing) {
          console.log(`[Migration] Prompt ${prompt.uuid} bereits vorhanden, überspringe...`);
          continue;
        }

        await supabaseDb.createPrompt({
          title: prompt.title,
          description: prompt.description,
          content: prompt.content,
          tags: prompt.tags,
          category: prompt.category,
          language: prompt.language,
        });
        promptsMigrated++;
      } catch (error: any) {
        const errorMsg = `Fehler beim Migrieren von Prompt ${prompt.uuid}: ${error.message}`;
        console.error(`[Migration] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`[Migration] ✓ ${promptsMigrated} Prompts migriert`);

    // 4. Migriere Categories
    console.log('[Migration] Migriere Categories...');
    const categories = sqliteDb.prepare(`
      SELECT uuid, name, description, created_at, updated_at
      FROM categories
    `).all() as any[];

    for (const category of categories) {
      try {
        const existing = await supabaseDb.getCategory(category.uuid);
        if (existing) {
          console.log(`[Migration] Category ${category.uuid} bereits vorhanden, überspringe...`);
          continue;
        }

        await supabaseDb.createCategory({
          name: category.name,
          description: category.description,
        });
        categoriesMigrated++;
      } catch (error: any) {
        const errorMsg = `Fehler beim Migrieren von Category ${category.uuid}: ${error.message}`;
        console.error(`[Migration] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`[Migration] ✓ ${categoriesMigrated} Categories migriert`);

    // 5. Migriere Groups
    console.log('[Migration] Migriere Groups...');
    const groups = sqliteDb.prepare(`
      SELECT uuid, category_uuid, name, description, display_order, created_at, updated_at
      FROM groups
    `).all() as any[];

    for (const group of groups) {
      try {
        const existing = await supabaseDb.getGroup(group.uuid);
        if (existing) {
          console.log(`[Migration] Group ${group.uuid} bereits vorhanden, überspringe...`);
          continue;
        }

        await supabaseDb.createGroup({
          category_uuid: group.category_uuid,
          name: group.name,
          description: group.description,
          display_order: group.display_order,
        });
        groupsMigrated++;
      } catch (error: any) {
        const errorMsg = `Fehler beim Migrieren von Group ${group.uuid}: ${error.message}`;
        console.error(`[Migration] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`[Migration] ✓ ${groupsMigrated} Groups migriert`);

    // 6. Migriere ManagementPrompts
    console.log('[Migration] Migriere ManagementPrompts...');
    const managementPrompts = sqliteDb.prepare(`
      SELECT uuid, group_uuid, name, content, display_order, created_at, updated_at
      FROM management_prompts
    `).all() as any[];

    for (const mp of managementPrompts) {
      try {
        const existing = await supabaseDb.getManagementPrompt(mp.uuid);
        if (existing) {
          console.log(`[Migration] ManagementPrompt ${mp.uuid} bereits vorhanden, überspringe...`);
          continue;
        }

        await supabaseDb.createManagementPrompt({
          group_uuid: mp.group_uuid,
          name: mp.name,
          content: mp.content,
          display_order: mp.display_order,
        });
        managementPromptsMigrated++;
      } catch (error: any) {
        const errorMsg = `Fehler beim Migrieren von ManagementPrompt ${mp.uuid}: ${error.message}`;
        console.error(`[Migration] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`[Migration] ✓ ${managementPromptsMigrated} ManagementPrompts migriert`);

    // 7. Migriere PromptResults
    console.log('[Migration] Migriere PromptResults...');
    const promptResults = sqliteDb.prepare(`
      SELECT uuid, prompt_uuid, content, created_at, updated_at
      FROM prompt_results
    `).all() as any[];

    for (const pr of promptResults) {
      try {
        const existing = await supabaseDb.getPromptResult(pr.uuid);
        if (existing) {
          console.log(`[Migration] PromptResult ${pr.uuid} bereits vorhanden, überspringe...`);
          continue;
        }

        await supabaseDb.createPromptResult({
          prompt_uuid: pr.prompt_uuid,
          content: pr.content,
        });
        promptResultsMigrated++;
      } catch (error: any) {
        const errorMsg = `Fehler beim Migrieren von PromptResult ${pr.uuid}: ${error.message}`;
        console.error(`[Migration] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`[Migration] ✓ ${promptResultsMigrated} PromptResults migriert`);

    console.log('[Migration] ✓ Migration abgeschlossen!');
    console.log('[Migration] Zusammenfassung:');
    console.log(`  - Prompts: ${promptsMigrated}`);
    console.log(`  - Categories: ${categoriesMigrated}`);
    console.log(`  - Groups: ${groupsMigrated}`);
    console.log(`  - ManagementPrompts: ${managementPromptsMigrated}`);
    console.log(`  - PromptResults: ${promptResultsMigrated}`);
    if (errors.length > 0) {
      console.log(`  - Fehler: ${errors.length}`);
    }

    return {
      prompts: promptsMigrated,
      categories: categoriesMigrated,
      groups: groupsMigrated,
      managementPrompts: managementPromptsMigrated,
      promptResults: promptResultsMigrated,
      errors,
    };
  } finally {
    sqliteDb.close();
  }
}
