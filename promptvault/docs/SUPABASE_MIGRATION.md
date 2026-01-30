# Supabase-Migration Anleitung

Diese Anleitung führt Sie Schritt für Schritt durch die Migration von SQLite zu Supabase.

## 📋 Übersicht

Die Migration umfasst:
1. Supabase-Projekt erstellen
2. Datenbank-Schema in Supabase einrichten
3. Supabase-Credentials konfigurieren
4. Daten von SQLite nach Supabase migrieren
5. Code auf Supabase umstellen

---

## Schritt 1: Supabase-Projekt erstellen

1. Gehen Sie zu [supabase.com](https://supabase.com)
2. Erstellen Sie ein kostenloses Konto oder melden Sie sich an
3. Klicken Sie auf **"New Project"**
4. Füllen Sie die Felder aus:
   - **Name**: `promptvault` (oder ein anderer Name)
   - **Database Password**: Wählen Sie ein sicheres Passwort (⚠️ **WICHTIG: Notieren Sie sich dieses Passwort!**)
   - **Region**: Wählen Sie die Region, die Ihnen am nächsten ist
5. Klicken Sie auf **"Create new project"**
6. Warten Sie, bis das Projekt erstellt wurde (ca. 2-3 Minuten)

---

## Schritt 2: Supabase-Credentials abrufen

1. In Ihrem Supabase-Projekt, gehen Sie zu **Settings** → **API**
2. Notieren Sie sich folgende Werte:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **anon/public key** (die lange Zeichenkette unter "Project API keys")

Diese Werte benötigen Sie für die Konfiguration.

---

## Schritt 3: Datenbank-Schema in Supabase einrichten

1. In Ihrem Supabase-Projekt, gehen Sie zu **SQL Editor**
2. Klicken Sie auf **"New query"**
3. Öffnen Sie die Datei `promptvault/app/electron/supabase-schema.sql` in einem Texteditor
4. Kopieren Sie den gesamten Inhalt der Datei
5. Fügen Sie den SQL-Code in den SQL Editor ein
6. Klicken Sie auf **"Run"** (oder drücken Sie `Ctrl+Enter` / `Cmd+Enter`)
7. Prüfen Sie, ob die Ausführung erfolgreich war (sollte "Success. No rows returned" anzeigen)

✅ **Verifikation**: Gehen Sie zu **Table Editor** und prüfen Sie, ob folgende Tabellen erstellt wurden:
- `prompts`
- `categories`
- `groups`
- `management_prompts`
- `prompt_results`
- `schema_version`

---

## Schritt 4: Supabase-Credentials konfigurieren

### Option A: Umgebungsvariablen (Empfohlen für Entwicklung)

1. Erstellen Sie eine `.env` Datei im Projekt-Root (`promptvault/.env`):

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Installieren Sie `dotenv` für Electron:

```bash
npm install dotenv
```

3. Passen Sie `main.ts` an, um `.env` zu laden (siehe Schritt 6)

### Option B: Direkt in der Konfiguration (Nur für Tests)

Falls Sie `.env` nicht verwenden möchten, können Sie die Werte direkt in `supabase-config.ts` eintragen (⚠️ **NICHT für Produktion empfohlen!**):

```typescript
const supabaseUrl = 'https://xxxxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Schritt 5: Daten von SQLite nach Supabase migrieren

### Automatische Migration (Empfohlen)

1. Stellen Sie sicher, dass Ihre SQLite-Datenbank noch vorhanden ist (normalerweise unter `%APPDATA%/promptvault/prompts.db` auf Windows)

2. Öffnen Sie die Electron-Entwicklertools oder führen Sie das Migrations-Script aus

3. **Option A: Über IPC-Handler** (wird in Schritt 6 hinzugefügt)

4. **Option B: Manuell ausführen** - Erstellen Sie eine temporäre Datei:

```typescript
// temp-migrate.ts
import { migrateToSupabase } from './app/electron/migrate-to-supabase';
import { initSupabase } from './app/electron/supabase-config';

async function runMigration() {
  try {
    initSupabase();
    const result = await migrateToSupabase();
    console.log('Migration erfolgreich:', result);
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
  }
}

runMigration();
```

### Manuelle Migration (Alternative)

Falls die automatische Migration nicht funktioniert:

1. Exportieren Sie alle Daten aus SQLite (über die Export-Funktion in der App)
2. Importieren Sie die Daten in Supabase über die Supabase-Dashboard-Import-Funktion

---

## Schritt 6: Code auf Supabase umstellen

### 6.1: dotenv installieren (falls noch nicht geschehen)

```bash
npm install dotenv
```

### 6.2: main.ts anpassen

Öffnen Sie `promptvault/app/electron/main.ts` und passen Sie die Initialisierung an:

**Vorher (SQLite):**
```typescript
import { initDatabase } from './db';
// ...
initDatabase();
```

**Nachher (Supabase):**
```typescript
import { initSupabase, testConnection } from './supabase-config';
import * as db from './db-supabase'; // Statt './db'
// ...
// Am Anfang der app.whenReady() Funktion:
await initSupabase();
const connected = await testConnection();
if (!connected) {
  console.error('Supabase-Verbindung fehlgeschlagen!');
  app.quit();
}
```

### 6.3: IPC-Handler anpassen

Alle IPC-Handler müssen auf async-Funktionen umgestellt werden, da Supabase async ist.

**Beispiel - Vorher:**
```typescript
ipcMain.handle('prompt:create', (_, payload) => {
  return { success: true, data: createPrompt(payload) };
});
```

**Nachher:**
```typescript
ipcMain.handle('prompt:create', async (_, payload) => {
  try {
    const prompt = await db.createPrompt(payload);
    return { success: true, data: prompt };
  } catch (error: any) {
    return { success: false, error: { code: 'CREATE_FAILED', message: error.message } };
  }
});
```

### 6.4: Alle db-Imports ändern

Suchen Sie nach allen `import ... from './db'` und ersetzen Sie sie durch:

```typescript
import * as db from './db-supabase';
```

Dann ändern Sie alle Funktionsaufrufe von `createPrompt()` zu `await db.createPrompt()`.

---

## Schritt 7: Migration testen

1. Starten Sie die Anwendung neu:
   ```bash
   npm run dev:electron
   ```

2. Prüfen Sie die Konsole auf Fehler

3. Testen Sie die Hauptfunktionen:
   - Prompts erstellen
   - Prompts bearbeiten
   - Prompts löschen
   - Suche
   - Kategorien verwalten

4. Prüfen Sie in Supabase (Table Editor), ob die Daten korrekt gespeichert werden

---

## Schritt 8: Optional - SQLite-Backup behalten

Es wird empfohlen, die SQLite-Datenbank als Backup zu behalten:

1. Kopieren Sie die Datei `%APPDATA%/promptvault/prompts.db` an einen sicheren Ort
2. Benennen Sie sie um z.B. `prompts-backup-YYYY-MM-DD.db`

---

## 🔧 Troubleshooting

### Fehler: "Supabase-Konfiguration fehlt"

**Lösung**: Stellen Sie sicher, dass `SUPABASE_URL` und `SUPABASE_ANON_KEY` gesetzt sind.

### Fehler: "Connection failed"

**Lösung**: 
- Prüfen Sie, ob die Supabase-URL korrekt ist
- Prüfen Sie, ob der anon key korrekt ist
- Prüfen Sie Ihre Internetverbindung
- Prüfen Sie, ob das Supabase-Projekt aktiv ist

### Fehler: "Table does not exist"

**Lösung**: Führen Sie das Schema-Script (`supabase-schema.sql`) erneut im SQL Editor aus.

### Migration schlägt fehl

**Lösung**:
- Prüfen Sie die Konsole auf spezifische Fehlermeldungen
- Stellen Sie sicher, dass die SQLite-Datenbank noch vorhanden ist
- Versuchen Sie die Migration in kleineren Batches (nur eine Tabelle auf einmal)

### Performance-Probleme

**Lösung**:
- Supabase Free Tier hat Rate Limits
- Für bessere Performance können Sie auf einen bezahlten Plan upgraden
- Oder implementieren Sie lokales Caching

---

## 📝 Wichtige Hinweise

1. **Backup**: Erstellen Sie immer ein Backup Ihrer SQLite-Datenbank vor der Migration
2. **Testen**: Testen Sie die Migration zuerst mit einer Test-Datenbank
3. **Credentials**: Speichern Sie Supabase-Credentials niemals im Code (verwenden Sie `.env`)
4. **RLS**: Row Level Security ist standardmäßig deaktiviert. Aktivieren Sie es, wenn Sie Authentifizierung benötigen
5. **Kosten**: Supabase Free Tier hat Limits. Prüfen Sie die [Pricing-Seite](https://supabase.com/pricing)

---

## ✅ Checkliste

- [ ] Supabase-Projekt erstellt
- [ ] Credentials notiert (URL + anon key)
- [ ] Schema in Supabase erstellt
- [ ] `.env` Datei mit Credentials erstellt
- [ ] Code auf Supabase umgestellt
- [ ] Migration durchgeführt
- [ ] Funktionen getestet
- [ ] SQLite-Backup erstellt

---

## 🎉 Fertig!

Nach erfolgreicher Migration haben Sie:
- ✅ Alle Daten in Supabase
- ✅ Cloud-Synchronisation
- ✅ Bessere Skalierbarkeit
- ✅ Backup in der Cloud

Bei Fragen oder Problemen, konsultieren Sie die [Supabase-Dokumentation](https://supabase.com/docs).
