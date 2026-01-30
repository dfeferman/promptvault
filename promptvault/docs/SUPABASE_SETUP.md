# Supabase Setup - Schnellstart

## ✅ Credentials konfiguriert

Ihre Supabase-Credentials wurden in `app/electron/supabase-config.ts` eingetragen:

- **URL**: `https://ontxcwlqjiooarnltxhi.supabase.co`
- **Anon Key**: Konfiguriert

## 📋 Nächste Schritte

### 1. Datenbank-Schema in Supabase erstellen

1. Gehen Sie zu Ihrem Supabase-Projekt: https://supabase.com/dashboard/project/ontxcwlqjiooarnltxhi
2. Klicken Sie auf **SQL Editor** (im linken Menü)
3. Klicken Sie auf **"New query"**
4. Öffnen Sie die Datei `promptvault/app/electron/supabase-schema.sql`
5. Kopieren Sie den gesamten Inhalt
6. Fügen Sie ihn in den SQL Editor ein
7. Klicken Sie auf **"Run"** (oder `Ctrl+Enter` / `Cmd+Enter`)

✅ **Verifikation**: Gehen Sie zu **Table Editor** und prüfen Sie, ob folgende Tabellen erstellt wurden:
- `prompts`
- `categories`
- `groups`
- `management_prompts`
- `prompt_results`
- `schema_version`

### 2. Optional: .env Datei erstellen (für bessere Sicherheit)

Falls Sie die Credentials nicht direkt im Code haben möchten, erstellen Sie eine `.env` Datei im Projekt-Root (`promptvault/.env`):

```env
SUPABASE_URL=https://ontxcwlqjiooarnltxhi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udHhjd2xxamlvb2Fybmx0eGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkwMTUsImV4cCI6MjA4NTEwNTAxNX0.8sh76WBhwGHVEFqKFbr9sV1PEpcaKlilESNBEuKGBAw
```

**Hinweis**: Die `.env` Datei ist bereits in `.gitignore` und wird nicht ins Repository hochgeladen.

### 3. Code auf Supabase umstellen

Folgen Sie der Anleitung in `SUPABASE_MIGRATION.md` ab **Schritt 6**.

Die wichtigsten Änderungen:
- `main.ts` muss `dotenv` laden (falls .env verwendet wird)
- Alle `import ... from './db'` müssen zu `import * as db from './db-supabase'` geändert werden
- Alle Datenbank-Funktionsaufrufe müssen `await` verwenden

### 4. Daten migrieren

Nachdem Sie den Code umgestellt haben, können Sie die Daten von SQLite nach Supabase migrieren:

```typescript
// In main.ts oder einem separaten Script
import { migrateToSupabase } from './migrate-to-supabase';
import { initSupabase } from './supabase-config';

await initSupabase();
const result = await migrateToSupabase();
console.log('Migration abgeschlossen:', result);
```

## 🔗 Nützliche Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/ontxcwlqjiooarnltxhi
- **SQL Editor**: https://supabase.com/dashboard/project/ontxcwlqjiooarnltxhi/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/ontxcwlqjiooarnltxhi/editor

## ⚠️ Wichtige Hinweise

1. Die Credentials sind aktuell direkt im Code. Für Produktion sollten Sie `.env` verwenden.
2. Stellen Sie sicher, dass das Schema in Supabase erstellt wurde, bevor Sie die App starten.
3. Testen Sie die Verbindung mit `testConnection()` bevor Sie Daten migrieren.
