// File: app/electron/main-supabase-example.ts
// BEISPIEL: So sollte main.ts aussehen, wenn Sie auf Supabase umstellen
// 
// WICHTIG: Dies ist nur ein Beispiel! Passen Sie Ihre main.ts entsprechend an.

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ⚠️ WICHTIG: dotenv für .env Datei laden
import * as dotenv from 'dotenv';
dotenv.config();

// ⚠️ ÄNDERUNG: Importiere Supabase-Module statt SQLite
import { initSupabase, testConnection } from './supabase-config';
import * as db from './db-supabase'; // Statt './db'
import { migrateToSupabase } from './migrate-to-supabase';

// ⚠️ ÄNDERUNG: Importiere Types (bleibt gleich)
import type {
  ApiResponse,
  CreatePromptPayload,
  UpdatePromptPayload,
  ListPromptsParams,
  SearchPromptsParams,
  Prompt,
  Category,
  Group,
  ManagementPrompt,
  PromptResult,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateGroupPayload,
  UpdateGroupPayload,
  CreateManagementPromptPayload,
  UpdateManagementPromptPayload,
  CreatePromptResultPayload,
  UpdatePromptResultPayload,
  ReorderItemsPayload,
} from './ipc';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * ⚠️ ÄNDERUNG: App-Lifecycle mit async/await für Supabase
 */
app.whenReady().then(async () => {
  console.log('[Main] App ready, initializing Supabase...');
  
  try {
    // ⚠️ ÄNDERUNG: Supabase initialisieren statt SQLite
    initSupabase();
    const connected = await testConnection();
    
    if (!connected) {
      throw new Error('Supabase-Verbindung fehlgeschlagen');
    }
    
    console.log('[Main] Supabase connected successfully');
  } catch (error: any) {
    console.error('[Main] Supabase initialization failed:', error);
    dialog.showErrorBox(
      'Supabase-Fehler',
      `Die Verbindung zu Supabase konnte nicht hergestellt werden:\n\n${error.message}\n\nBitte prüfen Sie Ihre Konfiguration in der .env Datei.`
    );
    app.quit();
    return;
  }

  createWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * ⚠️ ÄNDERUNG: Alle IPC-Handler müssen async sein und await verwenden
 */
function registerIpcHandlers(): void {
  // CREATE - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:create', async (_, payload: CreatePromptPayload): Promise<ApiResponse<Prompt>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:create called:`, { title: payload.title });
    try {
      const prompt = await db.createPrompt(payload); // ⚠️ await hinzugefügt
      console.log(`[IPC:${requestId}] prompt:create success:`, { uuid: prompt.uuid });
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:create error:`, error);
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // UPDATE - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:update', async (_, uuid: string, payload: UpdatePromptPayload): Promise<ApiResponse<Prompt>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:update called:`, { uuid });
    try {
      const prompt = await db.updatePrompt(uuid, payload); // ⚠️ await hinzugefügt
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:update error:`, error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // DELETE - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:delete called:`, { uuid });
    try {
      await db.deletePrompt(uuid); // ⚠️ await hinzugefügt
      return { success: true, data: true };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:delete error:`, error);
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // GET - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:get', async (_, uuid: string): Promise<ApiResponse<Prompt>> => {
    try {
      const prompt = await db.getPrompt(uuid); // ⚠️ await hinzugefügt
      if (!prompt) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Prompt not found',
          },
        };
      }
      return { success: true, data: prompt };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  // LIST - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:list', async (_, params: ListPromptsParams): Promise<ApiResponse<Prompt[]>> => {
    try {
      const prompts = await db.listPrompts(params); // ⚠️ await hinzugefügt
      return { success: true, data: prompts };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  // SEARCH - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:search', async (_, params: SearchPromptsParams): Promise<ApiResponse<Prompt[]>> => {
    try {
      const prompts = await db.searchPrompts(params); // ⚠️ await hinzugefügt
      return { success: true, data: prompts };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  });

  // EXPORT - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:export', async (): Promise<ApiResponse<Prompt[]>> => {
    try {
      const prompts = await db.exportAllPrompts(); // ⚠️ await hinzugefügt
      return { success: true, data: prompts };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error.message,
        },
      };
    }
  });

  // IMPORT - ⚠️ Jetzt mit await
  ipcMain.handle('prompt:import', async (): Promise<ApiResponse<{ imported: number; updated: number; skipped: number }>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:import called`);
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        title: 'Prompts importieren',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: { code: 'CANCELLED', message: 'Import abgebrochen' } };
      }

      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const prompts = JSON.parse(fileContent);

      if (!Array.isArray(prompts)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Ungültiges JSON-Format: Array erwartet',
          },
        };
      }

      const stats = await db.importPrompts(prompts); // ⚠️ await hinzugefügt
      return { success: true, data: stats };
    } catch (error: any) {
      console.error('[IPC] prompt:import error:', error);
      return {
        success: false,
        error: {
          code: 'IMPORT_FAILED',
          message: error.message,
        },
      };
    }
  });

  // REVEAL DB LOCATION - ⚠️ Für Supabase nicht mehr relevant, aber für Kompatibilität
  ipcMain.handle('prompt:reveal-db', async (): Promise<ApiResponse<string>> => {
    try {
      const dbPath = 'supabase://cloud'; // ⚠️ Geändert
      return { success: true, data: dbPath };
    } catch (error: any) {
      console.error('[IPC] prompt:reveal-db error:', error);
      return {
        success: false,
        error: {
          code: 'REVEAL_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ⚠️ NEU: Migration-Handler hinzufügen
  ipcMain.handle('migrate:to-supabase', async (): Promise<ApiResponse<any>> => {
    try {
      const result = await migrateToSupabase();
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] migrate:to-supabase error:', error);
      return {
        success: false,
        error: {
          code: 'MIGRATION_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ⚠️ Alle anderen Handler (Categories, Groups, etc.) müssen ebenfalls auf await umgestellt werden
  // Beispiel für Categories:
  ipcMain.handle('category:create', async (_, payload: CreateCategoryPayload): Promise<ApiResponse<Category>> => {
    try {
      const category = await db.createCategory(payload);
      return { success: true, data: category };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ... weitere Handler analog anpassen
}
