// File: app/renderer/src/App.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type { Prompt, CreatePromptPayload, UpdatePromptPayload } from './types';
import { promptApi } from './api/promptApi';
import { Dashboard, type AppMode } from './components/Dashboard';
import { PromptManagement } from './components/PromptManagement';
import { SearchBar } from './components/SearchBar';
import { PromptList } from './components/PromptList';
import { PromptDetail } from './components/PromptDetail';
import { PromptEditorModal } from './components/PromptEditorModal';

/**
 * Hauptkomponente der PromptVault App
 */
export const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedUuid, setSelectedUuid] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Prompts laden
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
      console.log('[App] Prompts loaded:', { count: result.length, duration: `${duration}ms`, query });
      setPrompts(result);
    } catch (error: any) {
      console.error('[App] Failed to load prompts:', { error: error.message, query, stack: error.stack });
      showNotification('error', 'Fehler beim Laden der Prompts: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial laden
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Suche mit Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPrompts(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, loadPrompts]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    setEditorOpen(true);
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setEditorOpen(true);
  };

  const handleSavePrompt = async (payload: CreatePromptPayload | UpdatePromptPayload) => {
    const action = editingPrompt ? 'UPDATE' : 'CREATE';
    console.log('[App] User action:', { action, uuid: editingPrompt?.uuid, title: payload.title });
    try {
      if (editingPrompt) {
        // Update
        const updated = await promptApi.updatePrompt(editingPrompt.uuid, payload as UpdatePromptPayload);
        setPrompts(prev => prev.map(p => p.uuid === updated.uuid ? updated : p));
        setSelectedUuid(updated.uuid);
        console.log('[App] Prompt updated successfully:', { uuid: updated.uuid });
        showNotification('success', 'Prompt erfolgreich aktualisiert');
      } else {
        // Create
        const created = await promptApi.createPrompt(payload as CreatePromptPayload);
        setPrompts(prev => [created, ...prev]);
        setSelectedUuid(created.uuid);
        console.log('[App] Prompt created successfully:', { uuid: created.uuid });
        showNotification('success', 'Prompt erfolgreich erstellt');
      }
      setEditorOpen(false);
      setEditingPrompt(null);
    } catch (error: any) {
      console.error('[App] Save error:', { action, error: error.message, stack: error.stack });
      throw error; // Modal zeigt Fehler an
    }
  };

  const handleDeletePrompt = async (uuid: string) => {
    console.warn('[App] User action: DELETE_PROMPT', { uuid, timestamp: new Date().toISOString() });
    try {
      await promptApi.deletePrompt(uuid);
      setPrompts(prev => prev.filter(p => p.uuid !== uuid));
      if (selectedUuid === uuid) {
        setSelectedUuid(undefined);
      }
      console.warn('[App] Prompt deleted successfully:', { uuid });
      showNotification('success', 'Prompt erfolgreich gelöscht');
    } catch (error: any) {
      console.error('[App] Delete error:', { uuid, error: error.message, stack: error.stack });
      showNotification('error', 'Fehler beim Löschen: ' + error.message);
    }
  };

  const handleDuplicatePrompt = (prompt: Prompt) => {
    setEditingPrompt({
      ...prompt,
      uuid: '', // Neue UUID wird beim Erstellen generiert
      title: prompt.title + ' (Kopie)',
    });
    setEditorOpen(true);
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showNotification('success', 'Prompt in Zwischenablage kopiert');
    } catch (error: any) {
      console.error('Copy error:', error);
      showNotification('error', 'Fehler beim Kopieren: ' + error.message);
    }
  };

  const handleExport = async () => {
    try {
      await promptApi.exportPromptsToJson();
      showNotification('success', 'Export erfolgreich');
    } catch (error: any) {
      console.error('Export error:', error);
      showNotification('error', 'Fehler beim Export: ' + error.message);
    }
  };

  const handleImport = async () => {
    try {
      const stats = await promptApi.importPromptsFromJson();
      if (stats.imported === 0 && stats.updated === 0 && stats.skipped === 0) {
        showNotification('info', 'Import abgebrochen');
        return;
      }
      showNotification(
        'success',
        `Import erfolgreich: ${stats.imported} neu, ${stats.updated} aktualisiert, ${stats.skipped} übersprungen`
      );
      loadPrompts(searchQuery);
    } catch (error: any) {
      console.error('Import error:', error);
      showNotification('error', 'Fehler beim Import: ' + error.message);
    }
  };

  const selectedPrompt = prompts.find(p => p.uuid === selectedUuid);

  // Show dashboard if no mode selected
  if (appMode === null) {
    return <Dashboard onSelectMode={setAppMode} />;
  }

  // Show Prompt Management module
  if (appMode === 'management') {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">PromptVault - Prompt Management</h1>
          <div className="app-actions">
            <button className="btn btn-secondary btn-small" onClick={() => setAppMode(null)}>
              🏠 Dashboard
            </button>
          </div>
        </header>
        <PromptManagement />
      </div>
    );
  }

  // Show existing app
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PromptVault</h1>
        <div className="app-actions">
          <button className="btn btn-secondary btn-small" onClick={() => setAppMode(null)}>
            🏠 Dashboard
          </button>
          <button className="btn btn-secondary btn-small" onClick={handleExport}>
            📤 Exportieren
          </button>
          <button className="btn btn-secondary btn-small" onClick={handleImport}>
            📥 Importieren
          </button>
          <button className="btn btn-primary btn-small" onClick={handleNewPrompt}>
            ➕ Neuer Prompt
          </button>
        </div>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <SearchBar onSearch={setSearchQuery} onNewPrompt={handleNewPrompt} />
          <PromptList
            prompts={prompts}
            selectedUuid={selectedUuid}
            onSelect={setSelectedUuid}
            loading={loading}
          />
        </aside>

        <main className="main-content">
          <PromptDetail
            prompt={selectedPrompt || null}
            onEdit={handleEditPrompt}
            onDelete={handleDeletePrompt}
            onDuplicate={handleDuplicatePrompt}
            onCopy={handleCopyToClipboard}
          />
        </main>
      </div>

      {editorOpen && (
        <PromptEditorModal
          prompt={editingPrompt}
          onSave={handleSavePrompt}
          onClose={() => {
            setEditorOpen(false);
            setEditingPrompt(null);
          }}
        />
      )}

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'info' && 'ℹ'}
          </span>
          <span className="notification-message">{notification.message}</span>
        </div>
      )}
    </div>
  );
};
