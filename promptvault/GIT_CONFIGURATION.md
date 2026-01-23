# Git Konfiguration - Schritt für Schritt

## Schritt 1: Git Installation prüfen

Nach der Installation von Git, öffne eine **neue** PowerShell oder Git Bash und prüfe:

```powershell
git --version
```

Sollte eine Versionsnummer angezeigt werden (z.B. `git version 2.42.0`), ist Git erfolgreich installiert.

---

## Schritt 2: Git Benutzer-Konfiguration

### Benutzername setzen

```powershell
git config --global user.name "Denis Feferman"
```

### E-Mail-Adresse setzen

**WICHTIG**: Verwende die E-Mail-Adresse, die mit deinem GitHub-Account verknüpft ist!

```powershell
git config --global user.email "deine-email@example.com"
```

**Beispiel:**
```powershell
git config --global user.email "denis.feferman@example.com"
```

### Konfiguration prüfen

```powershell
git config --global --list
```

Du solltest sehen:
```
user.name=Denis Feferman
user.email=deine-email@example.com
```

---

## Schritt 3: Weitere nützliche Git-Konfigurationen (optional)

### Standard Editor setzen

```powershell
# Für VS Code
git config --global core.editor "code --wait"

# Für Notepad++
git config --global core.editor "'C:/Program Files/Notepad++/notepad++.exe' -multiInst -notabbar -nosession -noPlugin"

# Für Vim (Standard)
git config --global core.editor "vim"
```

### Standard Branch Name

```powershell
git config --global init.defaultBranch main
```

### Line Ending Konfiguration (für Windows)

```powershell
# Windows: CRLF für Checkout, LF für Commit
git config --global core.autocrlf true
```

### Farbige Ausgabe aktivieren

```powershell
git config --global color.ui auto
```

### Credential Helper (für GitHub)

```powershell
# Windows Credential Manager verwenden
git config --global credential.helper wincred

# Oder für Git 2.29+
git config --global credential.helper manager-core
```

---

## Schritt 4: GitHub Repository Setup

### 1. Repository auf GitHub erstellen

1. Gehe zu: https://github.com/new
2. Repository-Name: z.B. `promptvault`
3. **WICHTIG**: Keine README, .gitignore oder License hinzufügen!
4. Klicke "Create repository"

### 2. Lokales Repository initialisieren

```powershell
# Zum Projektverzeichnis wechseln
cd c:\Development\Electron\promptvault\promptvault

# Git Repository initialisieren
git init

# Alle Dateien hinzufügen
git add .

# Ersten Commit erstellen
git commit -m "Initial commit: PromptVault Electron App"

# Branch auf main setzen
git branch -M main
```

### 3. Mit GitHub verbinden

**Ersetze `DEIN-USERNAME` und `DEIN-REPO-NAME`:**

```powershell
# Remote Repository hinzufügen
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO-NAME.git

# Remote prüfen
git remote -v
```

### 4. Code hochladen

```powershell
git push -u origin main
```

Bei der ersten Verbindung wirst du nach GitHub-Credentials gefragt:
- **Username**: Dein GitHub-Benutzername
- **Password**: Verwende ein **Personal Access Token** (nicht dein GitHub-Passwort!)

---

## Schritt 5: Personal Access Token erstellen

GitHub akzeptiert keine Passwörter mehr für Git-Operationen. Du musst ein Token erstellen:

1. Gehe zu: https://github.com/settings/tokens
2. Klicke auf "Generate new token (classic)"
3. Gib einen Namen ein (z.B. "PromptVault Development")
4. Wähle Ablaufzeit (z.B. "No expiration" oder "90 days")
5. Wähle Scopes:
   - ✅ **repo** (vollständiger Zugriff auf private Repositories)
6. Klicke "Generate token"
7. **WICHTIG**: Kopiere den Token sofort (er wird nur einmal angezeigt!)
8. Verwende diesen Token als Passwort bei `git push`

---

## Schritt 6: Erste Änderungen committen und pushen

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

---

## Nützliche Git-Befehle

### Status und Logs

```powershell
# Status anzeigen
git status

# Commit-Historie anzeigen
git log

# Kompakte Historie
git log --oneline --graph --all
```

### Änderungen verwalten

```powershell
# Bestimmte Dateien hinzufügen
git add dateiname.ts

# Alle Änderungen hinzufügen
git add .

# Änderungen rückgängig machen (vor Commit)
git restore dateiname.ts

# Letzten Commit ändern (wenn noch nicht gepusht)
git commit --amend -m "Neue Commit-Nachricht"
```

### Branches

```powershell
# Alle Branches anzeigen
git branch -a

# Neuen Branch erstellen
git checkout -b feature/neue-funktion

# Branch wechseln
git checkout main

# Branch zu GitHub pushen
git push -u origin feature/neue-funktion
```

### Synchronisation

```powershell
# Neueste Änderungen von GitHub holen
git pull

# Änderungen hochladen
git push

# Remote-Informationen anzeigen
git remote -v
```

---

## Troubleshooting

### "Git is not recognized"

**Lösung:**
1. PowerShell/Terminal komplett schließen
2. Neu öffnen
3. Prüfen: `git --version`

Falls immer noch nicht funktioniert:
- Git-Installation prüfen
- Git Bash verwenden (funktioniert immer)

### "Permission denied" beim Push

**Lösung:**
1. Personal Access Token erstellen (siehe Schritt 5)
2. Token als Passwort verwenden
3. Oder GitHub CLI verwenden: `gh auth login`

### "Repository not found"

**Lösung:**
1. Prüfe Repository-URL: `git remote -v`
2. Prüfe, ob Repository existiert
3. Prüfe, ob du Zugriff hast
4. URL korrigieren: `git remote set-url origin https://github.com/...`

### Credentials speichern

```powershell
# Windows Credential Manager verwenden
git config --global credential.helper wincred

# Dann beim ersten Push Credentials eingeben
# Sie werden gespeichert für zukünftige Verwendung
```

---

## Schnellstart-Checkliste

- [ ] Git installiert (`git --version` funktioniert)
- [ ] Benutzername gesetzt (`git config --global user.name`)
- [ ] E-Mail gesetzt (`git config --global user.email`)
- [ ] GitHub Repository erstellt
- [ ] Lokales Repository initialisiert (`git init`)
- [ ] Erster Commit erstellt (`git commit`)
- [ ] Remote hinzugefügt (`git remote add origin`)
- [ ] Personal Access Token erstellt
- [ ] Code gepusht (`git push -u origin main`)

---

## Nächste Schritte

Nach erfolgreicher Konfiguration:

1. **README.md erstellen** (siehe GITHUB_SETUP.md)
2. **.gitignore prüfen** (bereits vorhanden)
3. **Regelmäßig committen und pushen**

Viel Erfolg! 🚀
