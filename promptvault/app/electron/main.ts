// File: app/electron/main.ts

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Lade .env Datei (falls vorhanden)
dotenv.config();

// Supabase-Imports
import { initSupabase, testConnection, getDbPath } from './supabase-config';
import * as db from './db-supabase';
import { migrateToSupabase } from './migrate-to-supabase';
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

/**
 * Erstellt das Hauptfenster der Anwendung
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false, // Sicherheit: kein Node.js im Renderer
      contextIsolation: true, // Sicherheit: strikte Isolation
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
  });

  // Fenster anzeigen wenn ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load App
  if (app.isPackaged) {
    // Production: lade aus dist/renderer
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    // Development: lade von Vite Dev Server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App-Lifecycle: Initialisierung
 */
app.whenReady().then(async () => {
  console.log('[Main] App ready, initializing Supabase...');
  
  try {
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
      `Die Verbindung zu Supabase konnte nicht hergestellt werden:\n\n${error.message}\n\nBitte prüfen Sie Ihre Konfiguration.`
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
 * Registriert alle IPC-Handler für die Kommunikation mit dem Renderer
 */
function registerIpcHandlers(): void {
  // CREATE
  ipcMain.handle('prompt:create', async (_, payload: CreatePromptPayload): Promise<ApiResponse<Prompt>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:create called:`, { title: payload.title });
    try {
      const prompt = await db.createPrompt(payload);
      console.log(`[IPC:${requestId}] prompt:create success:`, { uuid: prompt.uuid });
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:create error:`, error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // UPDATE
  ipcMain.handle('prompt:update', async (_, uuid: string, payload: UpdatePromptPayload): Promise<ApiResponse<Prompt>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:update called:`, { uuid, fields: Object.keys(payload) });
    try {
      const prompt = await db.updatePrompt(uuid, payload);
      console.log(`[IPC:${requestId}] prompt:update success:`, { uuid: prompt.uuid });
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:update error:`, error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // DELETE
  ipcMain.handle('prompt:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.warn(`[IPC:${requestId}] prompt:delete called:`, { uuid });
    try {
      const result = await db.deletePrompt(uuid);
      console.warn(`[IPC:${requestId}] prompt:delete success:`, { uuid });
      return { success: true, data: result };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:delete error:`, error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  // GET
  ipcMain.handle('prompt:get', async (_, uuid: string): Promise<ApiResponse<Prompt>> => {
    try {
      const prompt = await db.getPrompt(uuid);
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
      console.error('[IPC] prompt:get error:', error);
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  // LIST
  ipcMain.handle('prompt:list', async (_, params?: ListPromptsParams): Promise<ApiResponse<Prompt[]>> => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    console.debug(`[IPC:${requestId}] prompt:list called:`, params);
    try {
      const prompts = await db.listPrompts(params);
      const duration = Date.now() - startTime;
      console.log(`[IPC:${requestId}] prompt:list success:`, { count: prompts.length, duration: `${duration}ms` });
      return { success: true, data: prompts };
    } catch (error: any) {
      console.error(`[IPC:${requestId}] prompt:list error:`, error);
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  // SEARCH
  ipcMain.handle('prompt:search', async (_, params: SearchPromptsParams): Promise<ApiResponse<Prompt[]>> => {
    try {
      const prompts = await db.searchPrompts(params);
      return { success: true, data: prompts };
    } catch (error: any) {
      console.error('[IPC] prompt:search error:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: error.message,
        },
      };
    }
  });

  // EXPORT
  ipcMain.handle('prompt:export', async (): Promise<ApiResponse<boolean>> => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[IPC:${requestId}] prompt:export called`);
    try {
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: 'Prompts exportieren',
        defaultPath: `prompts-export-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) {
        console.log(`[IPC:${requestId}] prompt:export cancelled by user`);
        return { success: false, error: { code: 'CANCELLED', message: 'Export abgebrochen' } };
      }

      const prompts = await db.exportAllPrompts();
      fs.writeFileSync(result.filePath, JSON.stringify(prompts, null, 2), 'utf-8');

      console.log(`[IPC:${requestId}] prompt:export success:`, { filePath: result.filePath, count: prompts.length });
      return { success: true, data: true };
    } catch (error: any) {
      console.error('[IPC] prompt:export error:', error);
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: error.message,
        },
      };
    }
  });

  // IMPORT
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

      const stats = await db.importPrompts(prompts);
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

  // REVEAL DB LOCATION (Für Supabase nicht mehr relevant, aber für Kompatibilität)
  ipcMain.handle('prompt:reveal-db', async (): Promise<ApiResponse<string>> => {
    try {
      const dbPath = getDbPath();
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

  // MIGRATION: SQLite -> Supabase
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

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - Categories IPC Handlers
  // ============================================================================

  ipcMain.handle('category:create', async (_, payload: CreateCategoryPayload): Promise<ApiResponse<Category>> => {
    try {
      const category = await db.createCategory(payload);
      return { success: true, data: category };
    } catch (error: any) {
      console.error('[IPC] category:create error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('category:update', async (_, uuid: string, payload: UpdateCategoryPayload): Promise<ApiResponse<Category>> => {
    try {
      const category = await db.updateCategory(uuid, payload);
      return { success: true, data: category };
    } catch (error: any) {
      console.error('[IPC] category:update error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('category:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.deleteCategory(uuid);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] category:delete error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('category:get', async (_, uuid: string): Promise<ApiResponse<Category>> => {
    try {
      const category = await db.getCategory(uuid);
      if (!category) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
      }
      return { success: true, data: category };
    } catch (error: any) {
      console.error('[IPC] category:get error:', error);
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('category:list', async (): Promise<ApiResponse<Category[]>> => {
    try {
      const categories = await db.listCategories();
      return { success: true, data: categories };
    } catch (error: any) {
      console.error('[IPC] category:list error:', error);
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - Groups IPC Handlers
  // ============================================================================

  ipcMain.handle('group:create', async (_, payload: CreateGroupPayload): Promise<ApiResponse<Group>> => {
    try {
      const group = await db.createGroup(payload);
      return { success: true, data: group };
    } catch (error: any) {
      console.error('[IPC] group:create error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('group:update', async (_, uuid: string, payload: UpdateGroupPayload): Promise<ApiResponse<Group>> => {
    try {
      const group = await db.updateGroup(uuid, payload);
      return { success: true, data: group };
    } catch (error: any) {
      console.error('[IPC] group:update error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('group:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.deleteGroup(uuid);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] group:delete error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('group:get', async (_, uuid: string): Promise<ApiResponse<Group>> => {
    try {
      const group = await db.getGroup(uuid);
      if (!group) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Group not found',
          },
        };
      }
      return { success: true, data: group };
    } catch (error: any) {
      console.error('[IPC] group:get error:', error);
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('group:list', async (_, category_uuid: string): Promise<ApiResponse<Group[]>> => {
    try {
      const groups = await db.listGroups(category_uuid);
      return { success: true, data: groups };
    } catch (error: any) {
      console.error('[IPC] group:list error:', error);
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('group:reorder', async (_, payload: ReorderItemsPayload): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.reorderGroups(payload);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] group:reorder error:', error);
      return {
        success: false,
        error: {
          code: 'REORDER_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - ManagementPrompts IPC Handlers
  // ============================================================================

  ipcMain.handle('management-prompt:create', async (_, payload: CreateManagementPromptPayload): Promise<ApiResponse<ManagementPrompt>> => {
    try {
      const prompt = await db.createManagementPrompt(payload);
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error('[IPC] management-prompt:create error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('management-prompt:update', async (_, uuid: string, payload: UpdateManagementPromptPayload): Promise<ApiResponse<ManagementPrompt>> => {
    try {
      const prompt = await db.updateManagementPrompt(uuid, payload);
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error('[IPC] management-prompt:update error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('management-prompt:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.deleteManagementPrompt(uuid);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] management-prompt:delete error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('management-prompt:get', async (_, uuid: string): Promise<ApiResponse<ManagementPrompt>> => {
    try {
      const prompt = await db.getManagementPrompt(uuid);
      if (!prompt) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ManagementPrompt not found',
          },
        };
      }
      return { success: true, data: prompt };
    } catch (error: any) {
      console.error('[IPC] management-prompt:get error:', error);
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('management-prompt:list', async (_, group_uuid: string): Promise<ApiResponse<ManagementPrompt[]>> => {
    try {
      const prompts = await db.listManagementPrompts(group_uuid);
      return { success: true, data: prompts };
    } catch (error: any) {
      console.error('[IPC] management-prompt:list error:', error);
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('management-prompt:reorder', async (_, payload: ReorderItemsPayload): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.reorderManagementPrompts(payload);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] management-prompt:reorder error:', error);
      return {
        success: false,
        error: {
          code: 'REORDER_FAILED',
          message: error.message,
        },
      };
    }
  });

  // ============================================================================
  // PROMPT MANAGEMENT MODULE - PromptResults IPC Handlers
  // ============================================================================

  ipcMain.handle('prompt-result:create', async (_, payload: CreatePromptResultPayload): Promise<ApiResponse<PromptResult>> => {
    try {
      const result = await db.createPromptResult(payload);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] prompt-result:create error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'CREATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('prompt-result:update', async (_, uuid: string, payload: UpdatePromptResultPayload): Promise<ApiResponse<PromptResult>> => {
    try {
      const result = await db.updatePromptResult(uuid, payload);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] prompt-result:update error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : error.message.startsWith('VALIDATION_ERROR') ? 'VALIDATION_ERROR' : 'UPDATE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('prompt-result:delete', async (_, uuid: string): Promise<ApiResponse<boolean>> => {
    try {
      const result = await db.deletePromptResult(uuid);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] prompt-result:delete error:', error);
      return {
        success: false,
        error: {
          code: error.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'DELETE_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('prompt-result:get', async (_, uuid: string): Promise<ApiResponse<PromptResult>> => {
    try {
      const result = await db.getPromptResult(uuid);
      if (!result) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'PromptResult not found',
          },
        };
      }
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[IPC] prompt-result:get error:', error);
      return {
        success: false,
        error: {
          code: 'GET_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipcMain.handle('prompt-result:list', async (_, prompt_uuid: string): Promise<ApiResponse<PromptResult[]>> => {
    try {
      const results = await db.listPromptResults(prompt_uuid);
      return { success: true, data: results };
    } catch (error: any) {
      console.error('[IPC] prompt-result:list error:', error);
      return {
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error.message,
        },
      };
    }
  });

  console.log('[Main] IPC handlers registered');
}
