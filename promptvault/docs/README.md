# PromptVault

Eine cross-platform Desktop-Anwendung zur lokalen Verwaltung von KI-Prompts. PromptVault ermöglicht das Speichern, Durchsuchen und schnelle Kopieren von Prompts in die Zwischenablage.

## 🚀 Features

- **Lokale Speicherung**: Alle Daten werden lokal in SQLite gespeichert (keine Cloud)
- **Volltextsuche**: Schnelle FTS5-basierte Suche über Titel, Beschreibung und Inhalt
- **Tagging & Kategorien**: Organisiere deine Prompts mit Tags und Kategorien
- **Copy-to-Clipboard**: Ein Klick zum Kopieren des Prompt-Inhalts
- **Export/Import**: JSON-Export und -Import mit Smart-Merge
- **Keyboard Shortcuts**: Effiziente Bedienung per Tastatur
- **Cross-Platform**: Windows, macOS und Linux

## 📋 Voraussetzungen

- **Node.js**: Version 18 oder höher
- **npm** oder **pnpm**: Package Manager
- **Git**: Zum Klonen des Repositories

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone <repository-url>
cd promptvault
```

### 2. Dependencies installieren

Mit npm:
```bash
npm install
```

Mit pnpm:
```bash
pnpm install
```

### 3. Native Module neu kompilieren (optional)

Falls `better-sqlite3` Probleme macht:
```bash
npm rebuild better-sqlite3
```

## 🏃 Development

### Renderer Dev Server starten

Terminal 1:
```bash
npm run dev:renderer
```

Dies startet den Vite Dev Server auf `http://localhost:3000`.

### Electron App starten

Terminal 2 (nach Start des Renderer Dev Servers):
```bash
npm run dev:electron
```

Die App öffnet sich mit aktivierten DevTools.

### Hot Reload

- **Renderer**: Änderungen werden automatisch durch Vite Hot Module Replacement (HMR) geladen
- **Main Process**: Erfordert Neustart der Electron-App (Terminal 2)

## 🔨 Build & Packaging

### Production Build erstellen

```bash
npm run build
```

Dies kompiliert:
- Renderer → `dist/renderer/`
- Electron Main/Preload → `dist/electron/`

### Distributables erstellen

Alle Plattformen:
```bash
npm run dist
```

Spezifische Plattform:
```bash
npm run dist:win   # Windows (NSIS + Portable)
npm run dist:mac   # macOS (DMG + ZIP)
npm run dist:linux # Linux (AppImage + DEB)
```

Ausgabe: `release/` Verzeichnis

### Packaging ohne Distribution (schneller)

```bash
npm run pack
```

Erstellt unpacked App in `release/` für schnelles Testen.

## 📁 Datenbank-Speicherort

Die SQLite-Datenbank wird im User-Data-Verzeichnis gespeichert:

### Windows
```
%APPDATA%\promptvault\prompts.db
```
Typisch: `C:\Users\<Username>\AppData\Roaming\promptvault\prompts.db`

### macOS
```
~/Library/Application Support/promptvault/prompts.db
```

### Linux
```
~/.config/promptvault/prompts.db
```

**Tipp**: Nutze die Funktion "DB-Speicherort öffnen" im Menü, um den Ordner direkt zu öffnen.

## 📤 Export & Import

### Export

1. Klicke auf **"📤 Exportieren"** in der Header-Leiste
2. Wähle Speicherort und Dateinamen (Standard: `prompts-export-YYYY-MM-DD.json`)
3. Alle Prompts werden als JSON-Array exportiert

### Import

1. Klicke auf **"📥 Importieren"** in der Header-Leiste
2. Wähle eine JSON-Datei mit exportierten Prompts
3. Die App führt einen Smart-Merge durch:
   - **Neue UUIDs**: Prompts werden eingefügt
   - **Existierende UUIDs**: Update nur wenn `updated_at` neuer ist
   - **Ältere/gleiche Daten**: Werden übersprungen
4. Nach Import wird eine Zusammenfassung angezeigt

**Format**: Das JSON muss ein Array von Prompt-Objekten sein:
```json
[
  {
    "uuid": "...",
    "title": "...",
    "content": "...",
    "description": "...",
    "tags": "...",
    "category": "...",
    "language": "...",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Cmd/Ctrl + K` | Fokus auf Suchfeld |
| `Cmd/Ctrl + N` | Neuer Prompt erstellen |
| `Cmd/Ctrl + Enter` | Prompt kopieren (in Detailansicht) |

## 🏗️ Projektstruktur

```
promptvault/
├── app/
│   ├── electron/              # Main Process
│   │   ├── main.ts           # Electron Entry Point
│   │   ├── preload.ts        # ContextBridge API
│   │   ├── ipc.ts            # IPC Type Definitions
│   │   ├── db.ts             # SQLite Database Logic
│   │   └── migrations/       # SQL Migrations
│   │       └── 001_init.sql
│   └── renderer/             # React Frontend
│       ├── index.html
│       └── src/
│           ├── main.tsx      # React Entry Point
│           ├── App.tsx       # Main App Component
│           ├── types.ts      # TypeScript Types
│           ├── styles.css    # Global Styles
│           ├── api/
│           │   └── promptApi.ts
│           └── components/
│               ├── SearchBar.tsx
│               ├── PromptList.tsx
│               ├── PromptDetail.tsx
│               ├── PromptEditorModal.tsx
│               └── TagChips.tsx
├── dist/                     # Build Output
├── release/                  # Distribution Output
├── package.json
├── tsconfig.electron.json
├── tsconfig.renderer.json
├── vite.config.ts
└── README.md
```

## 🔒 Security

- **contextIsolation**: Aktiviert (strikte Trennung Main/Renderer)
- **nodeIntegration**: Deaktiviert (keine Node.js APIs im Renderer)
- **IPC**: Alle Kommunikation über typisierte preload-API
- **Database**: Zugriff ausschließlich im Main Process
- **Validation**: Input-Validierung auf Client und Server

## 🐛 Troubleshooting

### better-sqlite3 Build-Fehler

```bash
npm rebuild better-sqlite3
# oder
npm install --force
```

### Electron startet nicht

- Prüfe ob Vite Dev Server läuft (`http://localhost:3000`)
- Prüfe Console-Output auf Fehler
- Lösche `node_modules` und `dist`, dann neu installieren

### Datenbank wird nicht gefunden

- Prüfe Console-Output für DB-Pfad
- Stelle sicher dass das User-Data-Verzeichnis beschreibbar ist
- Bei macOS: Erteile ggf. Dateisystem-Berechtigungen

### Import schlägt fehl

- Prüfe JSON-Format (muss Array sein)
- Stelle sicher dass `uuid`, `title` und `content` vorhanden sind
- Prüfe auf gültige ISO8601 Datumsformate

## 📊 Performance

- **Suche**: < 200ms bei 5.000 Prompts (FTS5-Index)
- **Startup**: < 2s (inklusive DB-Initialisierung)
- **Memory**: ~150-200 MB (typisch)

## 🔄 Migrations

Neue Migrations in `app/electron/migrations/` ablegen:
- Dateiname: `XXX_description.sql` (XXX = fortlaufende Nummer)
- Wird automatisch beim App-Start ausgeführt
- Versionierung über `schema_version` Tabelle

## 📝 License

MIT

## 🤝 Contributing

Contributions sind willkommen! Bitte öffne ein Issue oder Pull Request.

## 📧 Support

Bei Fragen oder Problemen öffne bitte ein Issue im Repository.

---

**Viel Erfolg mit PromptVault! 🚀**
