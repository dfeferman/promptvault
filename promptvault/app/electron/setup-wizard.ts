// File: app/electron/setup-wizard.ts
// Setup-Wizard für erste Konfiguration nach Installation

import { app, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import { saveSupabaseConfig, getConfigFilePath, loadSupabaseConfig } from './config-manager';

/**
 * Prüft, ob Supabase bereits konfiguriert ist
 */
export function isSupabaseConfigured(): boolean {
  try {
    loadSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Zeigt einen Setup-Dialog für Supabase-Konfiguration
 */
export async function showSetupWizard(mainWindow: BrowserWindow | null): Promise<boolean> {
  return new Promise((resolve) => {
    // Erstelle ein Setup-Fenster
    const setupWindow = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: false,
      modal: true,
      parent: mainWindow || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: 'Supabase-Konfiguration',
    });

    // HTML für Setup-Dialog
    const setupHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Supabase-Konfiguration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 30px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #3498db;
    }
    .help-text {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 30px;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary {
      background: #3498db;
      color: white;
    }
    .btn-primary:hover {
      background: #2980b9;
    }
    .btn-secondary {
      background: #ecf0f1;
      color: #333;
    }
    .btn-secondary:hover {
      background: #bdc3c7;
    }
    .error {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Supabase-Konfiguration</h1>
    <p class="subtitle">Bitte geben Sie Ihre Supabase-Credentials ein, um die App zu verwenden.</p>
    
    <form id="setupForm">
      <div class="form-group">
        <label for="url">Supabase URL *</label>
        <input type="text" id="url" name="url" placeholder="https://xxxxx.supabase.co" required>
        <div class="help-text">Finden Sie diese in Ihrem Supabase-Dashboard unter Settings > API</div>
        <div class="error" id="urlError"></div>
      </div>
      
      <div class="form-group">
        <label for="anonKey">Anon/Public Key *</label>
        <input type="text" id="anonKey" name="anonKey" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required>
        <div class="help-text">Der "anon" oder "public" Key aus Ihrem Supabase-Dashboard</div>
        <div class="error" id="anonKeyError"></div>
      </div>
      
      <div class="buttons">
        <button type="button" class="btn-secondary" id="cancelBtn">Abbrechen</button>
        <button type="submit" class="btn-primary" id="saveBtn">Speichern</button>
      </div>
    </form>
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    
    document.getElementById('setupForm').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const url = document.getElementById('url').value.trim();
      const anonKey = document.getElementById('anonKey').value.trim();
      
      // Validierung
      let hasError = false;
      
      if (!url || !url.startsWith('https://')) {
        document.getElementById('urlError').textContent = 'Bitte geben Sie eine gültige HTTPS-URL ein';
        document.getElementById('urlError').style.display = 'block';
        hasError = true;
      } else {
        document.getElementById('urlError').style.display = 'none';
      }
      
      if (!anonKey || anonKey.length < 50) {
        document.getElementById('anonKeyError').textContent = 'Bitte geben Sie einen gültigen Key ein';
        document.getElementById('anonKeyError').style.display = 'block';
        hasError = true;
      } else {
        document.getElementById('anonKeyError').style.display = 'none';
      }
      
      if (!hasError) {
        ipcRenderer.send('setup:save-config', { url, anonKey });
      }
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
      ipcRenderer.send('setup:cancel');
    });
    
    ipcRenderer.on('setup:success', () => {
      window.close();
    });
    
    ipcRenderer.on('setup:error', (_, error) => {
      alert('Fehler beim Speichern: ' + error);
    });
  </script>
</body>
</html>
    `;

    setupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHTML)}`);

    // IPC-Handler für Setup
    const { ipcMain } = require('electron');
    
    ipcMain.once('setup:save-config', async (_event: Electron.IpcMainEvent, config: { url: string; anonKey: string }) => {
      try {
        saveSupabaseConfig(config, false); // Plain für erste Einrichtung
        setupWindow.close();
        resolve(true);
      } catch (error: any) {
        dialog.showErrorBox('Fehler', 'Konfiguration konnte nicht gespeichert werden: ' + error.message);
        resolve(false);
      }
    });

    ipcMain.once('setup:cancel', () => {
      setupWindow.close();
      resolve(false);
    });

    setupWindow.on('closed', () => {
      resolve(false);
    });
  });
}
