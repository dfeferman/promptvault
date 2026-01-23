# Logging-Empfehlungen für PromptVault

## Übersicht
Dieses Dokument listet wichtige Stellen auf, an denen strukturiertes Logging hinzugefügt werden sollte, um Debugging, Performance-Monitoring und Fehleranalyse zu verbessern.

## Logging-Levels
- **DEBUG**: Detaillierte Informationen für Entwicklung/Debugging
- **INFO**: Wichtige Ereignisse und Benutzeraktionen
- **WARN**: Potenzielle Probleme, die nicht kritisch sind
- **ERROR**: Fehler, die behoben werden müssen

---

## 1. API Layer (app/renderer/src/api/promptApi.ts)

### Aktuelle Situation
- Kein Logging bei API-Calls
- Fehler werden nur geworfen, nicht geloggt

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei jedem API-Call (INFO)
async createPrompt(payload: CreatePromptPayload): Promise<Prompt> {
  console.log('[API] Creating prompt:', { title: payload.title });
  const response = await this.api.createPrompt(payload);
  if (!response.success || !response.data) {
    console.error('[API] Failed to create prompt:', response.error);
    throw new Error(response.error?.message || 'Failed to create prompt');
  }
  console.log('[API] Prompt created successfully:', response.data.uuid);
  return response.data;
}

// ✅ Bei Update-Operationen (INFO)
async updatePrompt(uuid: string, payload: UpdatePromptPayload): Promise<Prompt> {
  console.log('[API] Updating prompt:', { uuid, fields: Object.keys(payload) });
  // ... rest
}

// ✅ Bei Delete-Operationen (WARN - da irreversibel)
async deletePrompt(uuid: string): Promise<boolean> {
  console.warn('[API] Deleting prompt:', uuid);
  // ... rest
}

// ✅ Bei Search-Operationen (DEBUG - kann häufig sein)
async searchPrompts(params: SearchPromptsParams): Promise<Prompt[]> {
  console.debug('[API] Searching prompts:', { query: params.q, filters: params });
  // ... rest
}
```

---

## 2. Datenbank-Layer (app/electron/db.ts)

### Aktuelle Situation
- Nur bei Migrationen vorhanden
- Kein Logging bei CRUD-Operationen

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei Create-Operationen (INFO)
export function createPrompt(payload: CreatePromptPayload): Prompt {
  console.log('[DB] Creating prompt:', { title: payload.title });
  const database = getDb();
  // ... operation
  console.log('[DB] Prompt created:', { uuid, title: payload.title });
  return getPrompt(uuid)!;
}

// ✅ Bei Update-Operationen (INFO)
export function updatePrompt(uuid: string, payload: UpdatePromptPayload): Prompt {
  console.log('[DB] Updating prompt:', { uuid, changes: Object.keys(payload) });
  // ... operation
  if (info.changes === 0) {
    console.warn('[DB] Update failed - prompt not found:', uuid);
    throw new Error('NOT_FOUND: Prompt not found');
  }
  console.log('[DB] Prompt updated:', uuid);
  return getPrompt(uuid)!;
}

// ✅ Bei Delete-Operationen (WARN)
export function deletePrompt(uuid: string): boolean {
  console.warn('[DB] Deleting prompt:', uuid);
  // ... operation
  if (info.changes === 0) {
    console.warn('[DB] Delete failed - prompt not found:', uuid);
    throw new Error('NOT_FOUND: Prompt not found');
  }
  console.warn('[DB] Prompt deleted:', uuid);
  return true;
}

// ✅ Bei Validierungsfehlern (WARN)
if (payload.title !== undefined && !payload.title?.trim()) {
  console.warn('[DB] Validation failed: empty title');
  throw new Error('VALIDATION_ERROR: Title cannot be empty');
}

// ✅ Bei Search-Operationen (DEBUG)
export function searchPrompts(params: SearchPromptsParams): Prompt[] {
  console.debug('[DB] Searching prompts:', { 
    query: params.q, 
    category: params.category,
    limit: params.limit 
  });
  // ... operation
  console.debug('[DB] Search results:', { count: results.length });
  return results;
}
```

---

## 3. IPC Handler (app/electron/main.ts)

### Aktuelle Situation
- Nur Error-Logging vorhanden
- Kein Logging bei erfolgreichen Operationen

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei jedem IPC-Handler Start (DEBUG)
ipcMain.handle('prompt:create', async (_, payload: CreatePromptPayload) => {
  console.log('[IPC] prompt:create called:', { title: payload.title });
  try {
    const prompt = createPrompt(payload);
    console.log('[IPC] prompt:create success:', prompt.uuid);
    return { success: true, data: prompt };
  } catch (error: any) {
    console.error('[IPC] prompt:create error:', error);
    // ... rest
  }
});

// ✅ Bei Export/Import (INFO - wichtige Operationen)
ipcMain.handle('prompt:export', async () => {
  console.log('[IPC] prompt:export called');
  try {
    // ... operation
    console.log('[IPC] prompt:export success:', { filePath, count });
    return { success: true };
  } catch (error: any) {
    console.error('[IPC] prompt:export error:', error);
    // ... rest
  }
});

// ✅ Performance-Logging bei großen Operationen
ipcMain.handle('prompt:list', async (_, params?: ListPromptsParams) => {
  const startTime = Date.now();
  console.debug('[IPC] prompt:list called:', params);
  try {
    const prompts = listPrompts(params);
    const duration = Date.now() - startTime;
    console.log('[IPC] prompt:list success:', { 
      count: prompts.length, 
      duration: `${duration}ms` 
    });
    return { success: true, data: prompts };
  } catch (error: any) {
    console.error('[IPC] prompt:list error:', error);
    // ... rest
  }
});
```

---

## 4. React Components (app/renderer/src/components/)

### Aktuelle Situation
- Sehr wenig Logging
- Kein Logging bei Benutzeraktionen

### Empfohlene Logging-Stellen:

#### PromptManagement.tsx
```typescript
// ✅ Bei Initialisierung (INFO)
useEffect(() => {
  const init = async () => {
    console.log('[PromptManagement] Initializing...');
    try {
      setLoading(true);
      await loadCategories();
      console.log('[PromptManagement] Initialization complete');
    } catch (error) {
      console.error('[PromptManagement] Initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };
  init();
}, []);

// ✅ Bei Benutzeraktionen (INFO)
const handleCreateCategory = async (payload: CreateCategoryPayload) => {
  console.log('[PromptManagement] User creating category:', payload.name);
  try {
    const category = await promptApi.createCategory(payload);
    console.log('[PromptManagement] Category created:', category.uuid);
    // ... rest
  } catch (error: any) {
    console.error('[PromptManagement] Failed to create category:', error);
    throw error;
  }
};

// ✅ Bei Drag & Drop (DEBUG - kann häufig sein)
const handleGroupDragEnd = async (targetIndex: number) => {
  console.debug('[PromptManagement] Group drag ended:', { 
    draggedUuid: draggedGroupUuid, 
    targetIndex 
  });
  // ... rest
};
```

#### GroupBoard.tsx
```typescript
// ✅ Bei Suchaktionen (DEBUG)
const [searchQuery, setSearchQuery] = useState('');
// In onChange handler:
onChange={(e) => {
  const query = e.target.value;
  console.debug('[GroupBoard] Search query changed:', { 
    query, 
    groupCount: groups.length 
  });
  setSearchQuery(query);
}}

// ✅ Bei Drag & Drop (DEBUG)
const handlePromptDragEnd = async (targetGroupUuid: string, targetIndex: number) => {
  console.debug('[GroupBoard] Prompt drag ended:', {
    promptUuid: draggedPromptUuid,
    fromGroup: draggedPromptGroupUuid,
    toGroup: targetGroupUuid,
    targetIndex
  });
  // ... rest
};
```

#### PromptResultsPanel.tsx
```typescript
// ✅ Bei Downloads (INFO)
const downloadResult = (result: PromptResult, format: 'md' | 'txt') => {
  console.log('[PromptResultsPanel] Downloading result:', {
    resultUuid: result.uuid,
    format,
    promptName: prompt.name
  });
  // ... rest
};
```

---

## 5. App.tsx (Hauptkomponente)

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei App-Start (INFO)
export const App: React.FC = () => {
  console.log('[App] Initializing PromptVault');
  // ... rest
};

// ✅ Bei Mode-Wechsel (INFO)
const handleModeChange = (mode: AppMode) => {
  console.log('[App] Mode changed:', mode);
  setAppMode(mode);
};

// ✅ Bei Export/Import (INFO)
const handleExport = async () => {
  console.log('[App] User initiated export');
  try {
    await promptApi.exportPromptsToJson();
    console.log('[App] Export completed successfully');
    showNotification('success', 'Prompts erfolgreich exportiert');
  } catch (error: any) {
    console.error('[App] Export failed:', error);
    // ... rest
  }
};
```

---

## 6. Performance-kritische Stellen

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei großen Datenmengen (INFO)
const loadPrompts = useCallback(async (query?: string) => {
  const startTime = Date.now();
  console.log('[App] Loading prompts:', { query, startTime });
  try {
    setLoading(true);
    let result: Prompt[];
    if (query && query.trim()) {
      result = await promptApi.searchPrompts({ q: query });
    } else {
      result = await promptApi.listPrompts({ limit: 1000 });
    }
    const duration = Date.now() - startTime;
    console.log('[App] Prompts loaded:', { 
      count: result.length, 
      duration: `${duration}ms`,
      query 
    });
    setPrompts(result);
  } catch (error: any) {
    console.error('[App] Failed to load prompts:', error);
    // ... rest
  } finally {
    setLoading(false);
  }
}, []);

// ✅ Bei Render-Performance (DEBUG - nur in Dev)
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const renderStart = performance.now();
    return () => {
      const renderTime = performance.now() - renderStart;
      if (renderTime > 16) { // > 1 frame
        console.debug('[Component] Slow render:', { 
          component: 'PromptManagement',
          renderTime: `${renderTime.toFixed(2)}ms` 
        });
      }
    };
  }
}, [/* dependencies */]);
```

---

## 7. Fehlerbehandlung

### Empfohlene Logging-Stellen:

```typescript
// ✅ Strukturierte Fehler-Logs (ERROR)
try {
  // ... operation
} catch (error: any) {
  console.error('[Component] Operation failed:', {
    operation: 'createPrompt',
    error: error.message,
    stack: error.stack,
    payload: payload, // Nur wenn nicht sensitiv
    timestamp: new Date().toISOString()
  });
  throw error;
}

// ✅ Bei unerwarteten Zuständen (WARN)
if (!window.promptVault) {
  console.warn('[App] PromptVault API not available - app may not function correctly');
  throw new Error('PromptVault API not available');
}
```

---

## 8. Benutzeraktivitäten (Audit-Log)

### Empfohlene Logging-Stellen:

```typescript
// ✅ Alle CRUD-Operationen (INFO)
const handleCreatePrompt = async (payload: CreatePromptPayload) => {
  console.log('[AUDIT] User action:', {
    action: 'CREATE_PROMPT',
    timestamp: new Date().toISOString(),
    payload: { title: payload.title, category: payload.category }
  });
  // ... rest
};

const handleDeletePrompt = async (uuid: string) => {
  console.warn('[AUDIT] User action:', {
    action: 'DELETE_PROMPT',
    timestamp: new Date().toISOString(),
    uuid
  });
  // ... rest
};
```

---

## 9. Datenbank-Operationen

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei Migrationen (INFO - bereits vorhanden, aber erweitern)
console.log(`[DB] Running migration: ${file}`, {
  version,
  file,
  timestamp: new Date().toISOString()
});

// ✅ Bei Datenbank-Initialisierung (INFO)
export function initDatabase(): Database.Database {
  console.log('[DB] Initializing database:', {
    path: dbPath,
    exists: fs.existsSync(dbPath),
    timestamp: new Date().toISOString()
  });
  // ... rest
}
```

---

## 10. IPC-Kommunikation

### Empfohlene Logging-Stellen:

```typescript
// ✅ Bei IPC-Calls (DEBUG - kann sehr häufig sein)
// In preload.ts oder main.ts
ipcMain.handle('prompt:create', async (_, payload) => {
  const requestId = Math.random().toString(36).substring(7);
  console.debug(`[IPC:${requestId}] prompt:create`, { 
    payloadSize: JSON.stringify(payload).length 
  });
  try {
    const result = createPrompt(payload);
    console.debug(`[IPC:${requestId}] prompt:create success`);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[IPC:${requestId}] prompt:create failed:`, error);
    // ... rest
  }
});
```

---

## Implementierungs-Priorität

### 🔴 Hoch (Sofort implementieren)
1. **Fehler-Logging** in allen catch-Blöcken
2. **CRUD-Operationen** (Create, Update, Delete)
3. **Export/Import** Operationen
4. **Datenbank-Fehler**

### 🟡 Mittel (Bald implementieren)
5. **Performance-Logging** bei großen Operationen
6. **Benutzeraktionen** (Audit-Log)
7. **IPC-Kommunikation** (mit Request-IDs)

### 🟢 Niedrig (Optional)
8. **Debug-Logging** für Entwicklung
9. **Render-Performance** Monitoring
10. **Suchoperationen** (kann sehr häufig sein)

---

## Logging-Best Practices

1. **Strukturierte Logs**: Verwende Objekte statt Strings
   ```typescript
   // ❌ Schlecht
   console.log('Creating prompt: ' + title);
   
   // ✅ Gut
   console.log('[API] Creating prompt:', { title, category });
   ```

2. **Konsistente Präfixe**: Verwende `[Component]` oder `[Module]` Präfixe
   ```typescript
   console.log('[API] ...');
   console.log('[DB] ...');
   console.log('[IPC] ...');
   ```

3. **Sensible Daten**: Logge keine Passwörter oder sehr große Datenstrukturen
   ```typescript
   // ✅ Gut - nur Metadaten
   console.log('[API] Creating prompt:', { title, category });
   
   // ❌ Schlecht - zu viel Daten
   console.log('[API] Creating prompt:', payload); // könnte sehr groß sein
   ```

4. **Performance**: Verwende `console.debug` für häufige Operationen
   ```typescript
   console.debug('[Component] Search query:', query); // Kann sehr häufig sein
   console.log('[Component] User created prompt:', uuid); // Wichtige Aktion
   ```

5. **Timestamps**: Bei wichtigen Events explizit loggen
   ```typescript
   console.log('[AUDIT] User action:', {
     action: 'DELETE_PROMPT',
     timestamp: new Date().toISOString(),
     uuid
   });
   ```

---

## Nächste Schritte

1. Erstelle eine zentrale Logging-Utility (optional)
2. Implementiere Logging nach Priorität
3. Teste Logging in Development-Umgebung
4. Dokumentiere Logging-Format für Team
