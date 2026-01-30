# Konfiguration für EXE-Distribution

## 📁 Speicherort der Konfiguration

Wenn Sie die App als EXE exportieren, werden die Supabase-Credentials automatisch im **User Data Directory** gespeichert:

### Windows (EXE)
```
%APPDATA%\promptvault\supabase-config.json
```
**Typischer Pfad:**
```
C:\Users\<Benutzername>\AppData\Roaming\promptvault\supabase-config.json
```

### Warum User Data Directory?

✅ **Vorteile:**
- ✅ Funktioniert auch wenn die EXE im schreibgeschützten Verzeichnis liegt
- ✅ Benutzer-spezifisch (jeder Benutzer hat seine eigenen Credentials)
- ✅ Überlebt App-Updates (Datei bleibt erhalten)
- ✅ Keine Admin-Rechte erforderlich
- ✅ Plattform-übergreifend (Windows, macOS, Linux)

❌ **NICHT im App-Verzeichnis**, weil:
- ❌ EXE könnte im schreibgeschützten Verzeichnis liegen
- ❌ Bei Updates würde die Config verloren gehen
- ❌ Nicht benutzer-spezifisch

## 🔧 Wie funktioniert es?

1. **Beim ersten Start**: Die App prüft, ob eine Config-Datei existiert
2. **Falls nicht vorhanden**: 
   - Option A: Setup-Wizard erscheint (empfohlen)
   - Option B: Fehlermeldung mit Anleitung
3. **Config wird gespeichert**: Im User Data Directory
4. **Bei jedem Start**: Config wird automatisch geladen

## 📝 Config-Datei Format

Die Config-Datei ist eine einfache JSON-Datei:

```json
{
  "url": "https://ontxcwlqjiooarnltxhi.supabase.co",
  "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udHhjd2xxamlvb2Fybmx0eGhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjkwMTUsImV4cCI6MjA4NTEwNTAxNX0.8sh76WBhwGHVEFqKFbr9sV1PEpcaKlilESNBEuKGBAw"
}
```

## 🚀 Setup-Optionen für Endbenutzer

### Option 1: Setup-Wizard (Empfohlen)

Beim ersten Start erscheint automatisch ein Dialog, in dem der Benutzer seine Credentials eingeben kann.

**Vorteile:**
- ✅ Benutzerfreundlich
- ✅ Keine manuelle Dateierstellung nötig
- ✅ Validierung der Eingaben

### Option 2: Manuelle Config-Datei

Der Benutzer erstellt die Datei manuell am angegebenen Speicherort.

**Vorteile:**
- ✅ Für technisch versierte Benutzer
- ✅ Kann vor der Installation erstellt werden

### Option 3: Installer mit Config

Sie können die Config-Datei beim Installieren erstellen (z.B. mit NSIS-Script).

## 🔒 Sicherheit

### Verschlüsselte Speicherung (Optional)

Die App unterstützt auch verschlüsselte Config-Dateien:

```typescript
import { saveSupabaseConfig } from './config-manager';

// Verschlüsselt speichern
saveSupabaseConfig(config, true);
```

**Hinweis:** Die Verschlüsselung verwendet einen maschinen-spezifischen Schlüssel. Die Config kann nicht auf andere Computer übertragen werden.

### Anon Key ist öffentlich

Der Supabase `anon` Key ist für Client-seitige Verwendung gedacht und **kann öffentlich sein**. Wichtig ist:

1. ✅ **RLS aktivieren** in Supabase (Row Level Security)
2. ✅ **Policies definieren** für Zugriffskontrolle
3. ❌ **Service Role Key niemals** im Client verwenden!

## 📦 Distribution

### Was wird mit der EXE ausgeliefert?

- ✅ Die EXE-Datei
- ✅ Alle notwendigen DLLs und Ressourcen
- ❌ **KEINE** Config-Datei (wird beim ersten Start erstellt)

### Installer-Optionen

#### NSIS Installer (Windows)
```json
{
  "win": {
    "target": ["nsis"],
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

#### Portable Version
```json
{
  "win": {
    "target": ["portable"]
  }
}
```

**Hinweis:** Bei der Portable-Version wird die Config im gleichen Verzeichnis wie die EXE gespeichert (falls schreibbar).

## 🛠️ Implementierung

Die aktuelle Implementierung verwendet bereits `app.getPath('userData')`, was automatisch den richtigen Pfad für Development und Production liefert:

```typescript
// Development
app.getPath('userData') 
// → C:\Users\<User>\AppData\Roaming\Electron

// Production (EXE)
app.getPath('userData')
// → C:\Users\<User>\AppData\Roaming\promptvault
```

## ✅ Checkliste für EXE-Distribution

- [x] Config-Manager implementiert
- [x] User Data Directory verwendet
- [ ] Setup-Wizard implementiert (optional, aber empfohlen)
- [ ] Dokumentation für Endbenutzer erstellt
- [ ] RLS in Supabase aktiviert
- [ ] Test der EXE-Version durchgeführt

## 📖 Für Endbenutzer

### Erste Einrichtung

1. Starten Sie die App
2. Falls Setup-Wizard erscheint: Geben Sie Ihre Supabase-Credentials ein
3. Falls nicht: Erstellen Sie die Config-Datei manuell (siehe Pfad oben)

### Config ändern

1. Öffnen Sie die Config-Datei im Texteditor
2. Ändern Sie die Werte
3. Starten Sie die App neu

### Config finden

Die App zeigt den Pfad in der Fehlermeldung an, falls die Config fehlt.
