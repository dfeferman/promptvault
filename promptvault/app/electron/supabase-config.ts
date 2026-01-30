// File: app/electron/supabase-config.ts
// Supabase-Konfiguration

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadSupabaseConfig } from './config-manager';

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialisiert den Supabase-Client
 * Lädt Konfiguration aus: Umgebungsvariablen > Config-Datei > Fallback
 */
export function initSupabase(): SupabaseClient {
  // Lade Konfiguration (mit Priorität: ENV > Config-Datei > Fallback)
  const config = loadSupabaseConfig();
  const supabaseUrl = config.url;
  const supabaseAnonKey = config.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase-Konfiguration fehlt! Bitte SUPABASE_URL und SUPABASE_ANON_KEY setzen.\n' +
      'Diese können in einer .env Datei, als Umgebungsvariablen oder in einer Config-Datei gesetzt werden.'
    );
  }

  console.log('[Supabase] Initialisiere Client...');
  console.log('[Supabase] URL:', supabaseUrl);

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Electron Main Process braucht keine Session-Persistenz
    },
  });

  return supabaseClient;
}

/**
 * Gibt den Supabase-Client zurück
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase-Client nicht initialisiert. Rufe initSupabase() auf.');
  }
  return supabaseClient;
}

/**
 * Gibt den Pfad zur Datenbank zurück (für Kompatibilität)
 */
export function getDbPath(): string {
  return 'supabase://cloud';
}

/**
 * Prüft die Verbindung zu Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from('schema_version').select('version').limit(1);
    
    if (error) {
      console.error('[Supabase] Verbindungstest fehlgeschlagen:', error);
      return false;
    }
    
    console.log('[Supabase] Verbindung erfolgreich!');
    return true;
  } catch (error) {
    console.error('[Supabase] Verbindungstest Fehler:', error);
    return false;
  }
}
