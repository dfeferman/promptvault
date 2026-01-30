// File: app/electron/config-manager.ts
// Verwaltet Supabase-Credentials sicher

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const CONFIG_FILE_NAME = 'supabase-config.json';
const ENCRYPTED_CONFIG_FILE_NAME = 'supabase-config.enc';

/**
 * Gibt den Pfad zur Konfigurationsdatei zurück
 */
function getConfigPath(encrypted: boolean = false): string {
  const userDataPath = app.getPath('userData');
  const configDir = path.join(userDataPath, 'promptvault');
  
  // Verzeichnis erstellen falls nicht vorhanden
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const fileName = encrypted ? ENCRYPTED_CONFIG_FILE_NAME : CONFIG_FILE_NAME;
  return path.join(configDir, fileName);
}

/**
 * Verschlüsselt einen String (einfache Verschlüsselung)
 * Für Produktion sollten Sie eine stärkere Verschlüsselung verwenden
 */
function encrypt(text: string, key: string): string {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Entschlüsselt einen String
 */
function decrypt(encryptedText: string, key: string): string {
  const algorithm = 'aes-256-cbc';
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generiert einen Schlüssel für die Verschlüsselung
 * In Produktion sollte dieser sicher gespeichert werden (z.B. Keychain)
 */
function getEncryptionKey(): string {
  // Für Development: Verwende einen festen Schlüssel
  // Für Produktion: Verwende Keychain/Keyring oder generiere pro Installation
  const machineId = app.getPath('userData');
  const hash = crypto.createHash('sha256').update(machineId).digest('hex');
  return hash.substring(0, 64); // 32 bytes für AES-256
}

/**
 * Lädt die Supabase-Konfiguration
 * Prüft: 1. Umgebungsvariablen, 2. Verschlüsselte Config, 3. Plain Config, 4. Fallback
 */
export function loadSupabaseConfig(): SupabaseConfig {
  // 1. Prüfe Umgebungsvariablen (höchste Priorität)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    };
  }

  // 2. Prüfe verschlüsselte Konfigurationsdatei
  const encryptedPath = getConfigPath(true);
  if (fs.existsSync(encryptedPath)) {
    try {
      const encryptedData = fs.readFileSync(encryptedPath, 'utf-8');
      const key = getEncryptionKey();
      const decryptedData = decrypt(encryptedData, key);
      const config = JSON.parse(decryptedData) as SupabaseConfig;
      
      if (config.url && config.anonKey) {
        console.log('[Config] Geladen aus verschlüsselter Datei');
        return config;
      }
    } catch (error) {
      console.warn('[Config] Fehler beim Laden der verschlüsselten Config:', error);
    }
  }

  // 3. Prüfe plain Konfigurationsdatei
  const configPath = getConfigPath(false);
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as SupabaseConfig;
      
      if (config.url && config.anonKey) {
        console.log('[Config] Geladen aus Config-Datei');
        return config;
      }
    } catch (error) {
      console.warn('[Config] Fehler beim Laden der Config:', error);
    }
  }

  // 4. Fallback: Hardcoded (nur für Development)
  if (!app.isPackaged) {
    console.warn('[Config] Verwende Fallback-Credentials (nur Development)');
    return {
      url: 'https://ontxcwlqjiooarnltxhi.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udHhjd2xxamlvb2Fybmx0eGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkwMTUsImV4cCI6MjA4NTEwNTAxNX0.8sh76WBhwGHVEFqKFbr9sV1PEpcaKlilESNBEuKGBAw',
    };
  }

  throw new Error(
    'Supabase-Konfiguration nicht gefunden!\n\n' +
    'Bitte erstellen Sie eine Konfigurationsdatei unter:\n' +
    getConfigPath(false) + '\n\n' +
    'Format:\n' +
    '{\n' +
    '  "url": "https://xxxxx.supabase.co",\n' +
    '  "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."\n' +
    '}'
  );
}

/**
 * Speichert die Supabase-Konfiguration (verschlüsselt)
 */
export function saveSupabaseConfig(config: SupabaseConfig, encrypt: boolean = true): void {
  const configPath = encrypt ? getConfigPath(true) : getConfigPath(false);
  
  try {
    if (encrypt) {
      const key = getEncryptionKey();
      const encrypted = encrypt(JSON.stringify(config), key);
      fs.writeFileSync(configPath, encrypted, 'utf-8');
      console.log('[Config] Konfiguration verschlüsselt gespeichert');
    } else {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('[Config] Konfiguration gespeichert');
    }
  } catch (error) {
    console.error('[Config] Fehler beim Speichern:', error);
    throw error;
  }
}

/**
 * Gibt den Pfad zur Konfigurationsdatei zurück (für UI-Anzeige)
 */
export function getConfigFilePath(): string {
  return getConfigPath(false);
}
