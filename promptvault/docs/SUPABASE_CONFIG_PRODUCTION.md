# Supabase-Konfiguration für Produktion

## 📋 Übersicht

In der Produktion sollten Supabase-Credentials **nicht** im Code hardcodiert sein. Stattdessen werden sie in einer Konfigurationsdatei gespeichert.

## 🔐 Konfigurationsoptionen (Priorität)

1. **Umgebungsvariablen** (höchste Priorität)
2. **Verschlüsselte Config-Datei** (`supabase-config.enc`)
3. **Plain Config-Datei** (`supabase-config.json`)
4. **Fallback** (nur Development)

## 📁 Speicherort

Die Konfigurationsdatei wird im User-Data-Verzeichnis gespeichert:

### Windows
```
%APPDATA%\promptvault\supabase-config.json
```
Typisch: `C:\Users\<Username>\AppData\Roaming\promptvault\supabase-config.json`

### macOS
```
~/Library/Application Support/promptvault/supabase-config.json
```

### Linux
```
~/.config/promptvault/supabase-config.json
```

## 📝 Konfigurationsdatei erstellen

### Option 1: Plain JSON (einfach, aber nicht verschlüsselt)

Erstellen Sie eine Datei `supabase-config.json`:

```json
{
  "url": "https://ontxcwlqjiooarnltxhi.supabase.co",
  "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udHhjd2xxamlvb2Fybmx0eGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkwMTUsImV4cCI6MjA4NTEwNTAxNX0.8sh76WBhwGHVEFqKFbr9sV1PEpcaKlilESNBEuKGBAw"
}
```

### Option 2: Verschlüsselt (empfohlen für Produktion)

Die App kann die Config automatisch verschlüsselt speichern. Verwenden Sie die Funktion `saveSupabaseConfig()` im Code oder erstellen Sie die Datei manuell.

## 🚀 Setup für Produktion

### Schritt 1: Config-Datei erstellen

1. Erstellen Sie das Verzeichnis (falls nicht vorhanden):
   ```bash
   # Windows
   mkdir %APPDATA%\promptvault
   
   # macOS/Linux
   mkdir -p ~/Library/Application\ Support/promptvault
   ```

2. Erstellen Sie die Config-Datei mit Ihren Credentials

### Schritt 2: Build & Distribution

Die Config-Datei wird **nicht** mit der App ausgeliefert. Jeder Benutzer muss seine eigenen Credentials konfigurieren.

**Alternative**: Sie können die Credentials beim Build injizieren (siehe unten).

## 🔧 Build-time Configuration (Alternative)

Falls Sie die Credentials beim Build injizieren möchten:

### 1. Environment Variables beim Build setzen

```bash
# Windows PowerShell
$env:SUPABASE_URL="https://xxxxx.supabase.co"
$env:SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
npm run build

# macOS/Linux
SUPABASE_URL="https://xxxxx.supabase.co" SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." npm run build
```

### 2. In electron-builder Config injizieren

Fügen Sie in `package.json` unter `build.extraMetadata` hinzu:

```json
{
  "build": {
    "extraMetadata": {
      "supabaseUrl": "https://xxxxx.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**⚠️ WICHTIG**: Diese Werte werden im Build sichtbar sein! Nicht für sensible Daten verwenden.

## 🔒 Sicherheitsempfehlungen

1. **Anon Key ist öffentlich**: Der Supabase `anon` Key ist für Client-seitige Verwendung gedacht und kann öffentlich sein. Verwenden Sie **Row Level Security (RLS)** in Supabase, um den Zugriff zu kontrollieren.

2. **Service Role Key niemals im Client**: Der `service_role` Key sollte **niemals** in der Electron-App verwendet werden!

3. **Verschlüsselung**: Für zusätzliche Sicherheit können Sie die Config-Datei verschlüsselt speichern (siehe `config-manager.ts`).

4. **RLS aktivieren**: Aktivieren Sie Row Level Security in Supabase für alle Tabellen, wenn Sie Authentifizierung verwenden.

## 📖 Beispiel: Config-Datei programmatisch erstellen

Sie können auch ein Setup-Script erstellen, das die Config-Datei beim ersten Start erstellt:

```typescript
import { saveSupabaseConfig } from './config-manager';

// Beim ersten Start
const config = {
  url: 'https://xxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

saveSupabaseConfig(config, true); // true = verschlüsselt
```

## ✅ Checkliste für Produktion

- [ ] Config-Datei erstellt
- [ ] Credentials korrekt eingetragen
- [ ] RLS in Supabase aktiviert (falls Authentifizierung verwendet)
- [ ] Build ohne hardcodierte Credentials
- [ ] Config-Datei ist in `.gitignore`
- [ ] Dokumentation für Benutzer erstellt

## 🐛 Troubleshooting

### "Supabase-Konfiguration nicht gefunden"

**Lösung**: Erstellen Sie die Config-Datei am angegebenen Speicherort.

### "Verbindung fehlgeschlagen"

**Lösung**: 
- Prüfen Sie die URL und den Key
- Prüfen Sie Ihre Internetverbindung
- Prüfen Sie, ob das Supabase-Projekt aktiv ist

### Config wird nicht geladen

**Lösung**: 
- Prüfen Sie die Dateiberechtigungen
- Prüfen Sie das JSON-Format
- Prüfen Sie die Konsole auf Fehlermeldungen
