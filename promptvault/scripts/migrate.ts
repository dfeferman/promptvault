// Migration Script: SQLite -> Supabase
// Führen Sie dieses Script aus, um alle Daten von SQLite nach Supabase zu migrieren

import { app } from 'electron';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env falls vorhanden
dotenv.config();

// Importiere Migration-Funktionen
import { initSupabase } from '../app/electron/supabase-config';
import { migrateToSupabase } from '../app/electron/migrate-to-supabase';

async function runMigration() {
  console.log('========================================');
  console.log('SQLite -> Supabase Migration');
  console.log('========================================\n');

  try {
    // Initialisiere Electron App (benötigt für app.getPath)
    await app.whenReady();

    // Initialisiere Supabase
    console.log('[1/3] Initialisiere Supabase-Verbindung...');
    initSupabase();
    console.log('✓ Supabase-Verbindung hergestellt\n');

    // Führe Migration aus
    console.log('[2/3] Starte Datenmigration...');
    const result = await migrateToSupabase();

    // Zeige Ergebnisse
    console.log('\n[3/3] Migration abgeschlossen!');
    console.log('========================================');
    console.log('Zusammenfassung:');
    console.log(`  ✓ Prompts: ${result.prompts}`);
    console.log(`  ✓ Categories: ${result.categories}`);
    console.log(`  ✓ Groups: ${result.groups}`);
    console.log(`  ✓ ManagementPrompts: ${result.managementPrompts}`);
    console.log(`  ✓ PromptResults: ${result.promptResults}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${result.errors.length} Fehler aufgetreten:`);
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✓ Alle Daten erfolgreich migriert!');
    }
    console.log('========================================\n');

    // Beende App
    app.quit();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration fehlgeschlagen!');
    console.error('Fehler:', error.message);
    console.error(error.stack);
    app.quit();
    process.exit(1);
  }
}

// Starte Migration
runMigration();
