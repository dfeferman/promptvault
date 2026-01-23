# GitHub Setup Anleitung

## Voraussetzungen

1. **Git installieren** (falls noch nicht installiert):
   - Download: https://git-scm.com/download/win
   - Installation durchführen
   - Git Bash oder PowerShell verwenden

2. **GitHub Account** erstellen (falls noch nicht vorhanden):
   - https://github.com/signup

---

## Schritt 1: GitHub Repository erstellen

1. Gehe zu https://github.com/new
2. Repository-Name eingeben (z.B. `promptvault`)
3. **WICHTIG**: Repository **NICHT** mit README, .gitignore oder License initialisieren (da wir bereits Dateien haben)
4. Klicke auf "Create repository"

---

## Schritt 2: Lokales Git Repository initialisieren

Öffne PowerShell oder Git Bash im Projektverzeichnis:

```powershell
cd c:\Development\Electron\promptvault\promptvault
```

### Option A: Wenn noch kein Git Repository existiert

```powershell
# Git Repository initialisieren
git init

# Alle Dateien zum Staging hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: PromptVault Electron App"

# Branch umbenennen zu main (falls nötig)
git branch -M main
```

### Option B: Wenn bereits ein Git Repository existiert

```powershell
# Status prüfen
git status

# Falls Änderungen vorhanden, committen
git add .
git commit -m "Update: Logging, Resizable Panel, Download Features"
```

---

## Schritt 3: GitHub Repository verbinden

**WICHTIG**: Ersetze `DEIN-USERNAME` und `DEIN-REPO-NAME` mit deinen GitHub-Daten!

```powershell
# Remote Repository hinzufügen
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO-NAME.git

# Oder mit SSH (wenn SSH-Keys konfiguriert sind):
# git remote add origin git@github.com:DEIN-USERNAME/DEIN-REPO-NAME.git

# Remote prüfen
git remote -v
```

---

## Schritt 4: Code zu GitHub pushen

```powershell
# Code hochladen
git push -u origin main

# Falls der Branch anders heißt (z.B. master):
# git push -u origin master
```

Bei der ersten Verbindung wirst du nach GitHub-Credentials gefragt.

---

## Schritt 5: GitHub Authentication (falls Probleme)

### Option A: Personal Access Token (empfohlen)

1. Gehe zu: https://github.com/settings/tokens
2. Klicke auf "Generate new token (classic)"
3. Wähle Scopes: `repo` (vollständiger Zugriff auf private Repositories)
4. Token kopieren
5. Beim `git push` als Passwort verwenden

### Option B: GitHub CLI

```powershell
# GitHub CLI installieren
winget install GitHub.cli

# Authentifizieren
gh auth login

# Dann normal pushen
git push -u origin main
```

### Option C: SSH Keys (für fortgeschrittene Nutzer)

1. SSH Key generieren:
```powershell
ssh-keygen -t ed25519 -C "deine-email@example.com"
```

2. Public Key zu GitHub hinzufügen:
   - Gehe zu: https://github.com/settings/keys
   - Klicke "New SSH key"
   - Füge den Inhalt von `~/.ssh/id_ed25519.pub` ein

3. Remote auf SSH umstellen:
```powershell
git remote set-url origin git@github.com:DEIN-USERNAME/DEIN-REPO-NAME.git
```

---

## Schritt 6: README.md erstellen (optional)

Erstelle eine `README.md` im Projektroot:

```markdown
# PromptVault

Eine Electron-App zur Verwaltung von AI-Prompts und deren Ergebnissen.

## Features

- Prompt-Verwaltung mit Kategorien und Tags
- Prompt Management Modul mit Gruppen
- Artefakt-Ergebnisse verwalten
- Export/Import Funktionalität
- Download von Ergebnissen als .md oder .txt

## Installation

\`\`\`bash
npm install
\`\`\`

## Entwicklung

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
```

Dann committen und pushen:

```powershell
git add README.md
git commit -m "Add README.md"
git push
```

---

## Häufige Befehle

### Änderungen hochladen

```powershell
# Status prüfen
git status

# Änderungen hinzufügen
git add .

# Commit erstellen
git commit -m "Beschreibung der Änderungen"

# Zu GitHub pushen
git push
```

### Neueste Änderungen von GitHub holen

```powershell
git pull
```

### Branch erstellen und wechseln

```powershell
# Neuen Branch erstellen
git checkout -b feature/neue-funktion

# Zurück zu main
git checkout main
```

### Remote Repository ändern

```powershell
# Aktuelles Remote anzeigen
git remote -v

# Remote ändern
git remote set-url origin https://github.com/NEUER-USERNAME/NEUER-REPO-NAME.git
```

---

## Troubleshooting

### "Repository not found" Fehler

- Prüfe, ob der Repository-Name korrekt ist
- Prüfe, ob du Zugriff auf das Repository hast
- Prüfe deine GitHub-Credentials

### "Permission denied" Fehler

- Prüfe deine GitHub-Authentifizierung
- Verwende Personal Access Token statt Passwort
- Prüfe SSH-Keys, falls SSH verwendet wird

### "Branch is ahead" Warnung

```powershell
# Lokale Änderungen pushen
git push

# Oder zuerst pullen, dann pushen
git pull
git push
```

### Git nicht gefunden

- Git installieren: https://git-scm.com/download/win
- PowerShell/Terminal neu starten
- Prüfen: `git --version`

---

## Nützliche Links

- Git Dokumentation: https://git-scm.com/doc
- GitHub Guides: https://guides.github.com/
- GitHub Desktop (GUI Alternative): https://desktop.github.com/
