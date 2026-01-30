// File: app/renderer/src/components/PromptManagement.tsx

import React, { useState, useEffect, useCallback } from 'react';
import type {
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
} from '../types';
import { promptApi } from '../api/promptApi';
import { CategorySelector } from './CategorySelector';
import { CategoryEditorModal } from './CategoryEditorModal';
import { GroupBoard } from './GroupBoard';
import { GroupEditorModal } from './GroupEditorModal';
import { ManagementPromptCreateModal } from './ManagementPromptCreateModal';
import { ManagementPromptEditorModal } from './ManagementPromptEditorModal';
import { PromptResultsPanel } from './PromptResultsPanel';
import { PromptResultEditorModal } from './PromptResultEditorModal';

/**
 * Hauptkomponente für das Prompt Management Modul
 */
export const PromptManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryUuid, setSelectedCategoryUuid] = useState<string | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [promptsByGroup, setPromptsByGroup] = useState<Record<string, ManagementPrompt[]>>({});
  const [selectedPromptUuid, setSelectedPromptUuid] = useState<string | undefined>();
  const [results, setResults] = useState<PromptResult[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);
  const [creatingPrompt, setCreatingPrompt] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<ManagementPrompt | null>(null);
  const [editingResult, setEditingResult] = useState<PromptResult | null>(null);
  const [resultsPanelWidth, setResultsPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      
      // Debug: Check if API is available
      if (!window.promptVault) {
        throw new Error('PromptVault API nicht verfügbar. Bitte Electron-App neu starten.');
      }
      
      if (!window.promptVault.listCategories) {
        throw new Error('listCategories Funktion nicht verfügbar. Bitte Electron-App neu starten.');
      }
      
      console.log('[PromptManagement] Loading categories...');
      const cats = await promptApi.listCategories();
      console.log('[PromptManagement] Categories loaded:', cats.length);
      setCategories(cats);
      if (cats.length > 0 && !selectedCategoryUuid) {
        setSelectedCategoryUuid(cats[0].uuid);
      }
    } catch (error: any) {
      console.error('[PromptManagement] Error loading categories:', error);
      const errorMsg = error.message || 'Unbekannter Fehler';
      setError('Fehler beim Laden der Kategorien: ' + errorMsg);
      showNotification('error', errorMsg);
    }
  }, [selectedCategoryUuid]);

  // Load groups for selected category
  const loadGroups = useCallback(async (categoryUuid: string) => {
    try {
      const grps = await promptApi.listGroups(categoryUuid);
      setGroups(grps);
      
      // Load prompts for each group
      const promptsMap: Record<string, ManagementPrompt[]> = {};
      for (const group of grps) {
        const prompts = await promptApi.listManagementPrompts(group.uuid);
        promptsMap[group.uuid] = prompts;
      }
      setPromptsByGroup(promptsMap);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      showNotification('error', 'Fehler beim Laden der Gruppen: ' + error.message);
    }
  }, []);

  // Load results for selected prompt
  const loadResults = useCallback(async (promptUuid: string) => {
    try {
      const res = await promptApi.listPromptResults(promptUuid);
      setResults(res);
    } catch (error: any) {
      console.error('Error loading results:', error);
      showNotification('error', 'Fehler beim Laden der Ergebnisse: ' + error.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await loadCategories();
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Load groups when category changes
  useEffect(() => {
    if (selectedCategoryUuid) {
      loadGroups(selectedCategoryUuid);
    } else {
      setGroups([]);
      setPromptsByGroup({});
    }
  }, [selectedCategoryUuid, loadGroups]);

  // Load results when prompt is selected
  useEffect(() => {
    if (selectedPromptUuid) {
      loadResults(selectedPromptUuid);
    } else {
      setResults([]);
    }
  }, [selectedPromptUuid, loadResults]);

  // Category operations
  const handleCreateCategory = async (payload: CreateCategoryPayload) => {
    console.log('[PromptManagement] User creating category:', { name: payload.name, timestamp: new Date().toISOString() });
    try {
      const category = await promptApi.createCategory(payload);
      console.log('[PromptManagement] Category created:', { uuid: category.uuid, name: category.name });
      await loadCategories();
      setSelectedCategoryUuid(category.uuid);
      showNotification('success', 'Kategorie erstellt');
    } catch (error: any) {
      console.error('[PromptManagement] Failed to create category:', { error: error.message, payload: { name: payload.name } });
      throw error;
    }
  };

  const handleUpdateCategory = async (uuid: string, payload: UpdateCategoryPayload) => {
    try {
      await promptApi.updateCategory(uuid, payload);
      await loadCategories();
      showNotification('success', 'Kategorie aktualisiert');
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteCategory = async (uuid: string) => {
    console.warn('[PromptManagement] User deleting category:', { uuid, timestamp: new Date().toISOString() });
    try {
      await promptApi.deleteCategory(uuid);
      console.warn('[PromptManagement] Category deleted:', { uuid });
      await loadCategories();
      if (selectedCategoryUuid === uuid) {
        setSelectedCategoryUuid(undefined);
      }
      showNotification('success', 'Kategorie gelöscht');
    } catch (error: any) {
      console.error('[PromptManagement] Failed to delete category:', { uuid, error: error.message });
      showNotification('error', 'Fehler beim Löschen: ' + error.message);
    }
  };

  // Group operations
  const handleCreateGroup = async (payload: CreateGroupPayload) => {
    try {
      const group = await promptApi.createGroup(payload);
      await loadGroups(payload.category_uuid);
      showNotification('success', 'Gruppe erstellt');
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdateGroup = async (uuid: string, payload: UpdateGroupPayload) => {
    try {
      await promptApi.updateGroup(uuid, payload);
      await loadGroups(selectedCategoryUuid!);
      showNotification('success', 'Gruppe aktualisiert');
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteGroup = async (uuid: string) => {
    try {
      await promptApi.deleteGroup(uuid);
      await loadGroups(selectedCategoryUuid!);
      showNotification('success', 'Gruppe gelöscht');
    } catch (error: any) {
      showNotification('error', 'Fehler beim Löschen: ' + error.message);
    }
  };

  const handleReorderGroups = async (items: ReorderItemsPayload['items']) => {
    try {
      await promptApi.reorderGroups({ items });
      await loadGroups(selectedCategoryUuid!);
    } catch (error: any) {
      showNotification('error', 'Fehler beim Neuordnen: ' + error.message);
    }
  };

  // Prompt operations
  const handleCreatePrompt = async (payload: CreateManagementPromptPayload) => {
    try {
      const prompt = await promptApi.createManagementPrompt(payload);
      await loadGroups(selectedCategoryUuid!);
      setSelectedPromptUuid(prompt.uuid);
      showNotification('success', 'Prompt erstellt');
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdatePrompt = async (uuid: string, payload: UpdateManagementPromptPayload) => {
    try {
      await promptApi.updateManagementPrompt(uuid, payload);
      await loadGroups(selectedCategoryUuid!);
      if (payload.group_uuid && payload.group_uuid !== promptsByGroup[groups.find(g => promptsByGroup[g.uuid]?.some(p => p.uuid === uuid))?.uuid || '']?.[0]?.group_uuid) {
        await loadResults(uuid);
      }
      showNotification('success', 'Prompt aktualisiert');
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeletePrompt = async (uuid: string) => {
    try {
      await promptApi.deleteManagementPrompt(uuid);
      await loadGroups(selectedCategoryUuid!);
      if (selectedPromptUuid === uuid) {
        setSelectedPromptUuid(undefined);
      }
      showNotification('success', 'Prompt gelöscht');
    } catch (error: any) {
      showNotification('error', 'Fehler beim Löschen: ' + error.message);
    }
  };

  const handleReorderPrompts = async (groupUuid: string, items: ReorderItemsPayload['items']) => {
    try {
      await promptApi.reorderManagementPrompts({ items });
      await loadGroups(selectedCategoryUuid!);
    } catch (error: any) {
      showNotification('error', 'Fehler beim Neuordnen: ' + error.message);
    }
  };

  const handleCopyPrompt = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showNotification('success', 'Prompt in Zwischenablage kopiert');
    } catch (error: any) {
      showNotification('error', 'Fehler beim Kopieren: ' + error.message);
    }
  };

  // Result operations
  const handleCreateResult = async (payload: CreatePromptResultPayload) => {
    try {
      await promptApi.createPromptResult(payload);
      await loadResults(payload.prompt_uuid);
      showNotification('success', 'Ergebnis erstellt');
    } catch (error: any) {
      throw error;
    }
  };

  const handleUpdateResult = async (uuid: string, payload: UpdatePromptResultPayload) => {
    try {
      await promptApi.updatePromptResult(uuid, payload);
      await loadResults(selectedPromptUuid!);
      showNotification('success', 'Ergebnis aktualisiert');
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteResult = async (uuid: string) => {
    try {
      await promptApi.deletePromptResult(uuid);
      await loadResults(selectedPromptUuid!);
      showNotification('success', 'Ergebnis gelöscht');
    } catch (error: any) {
      showNotification('error', 'Fehler beim Löschen: ' + error.message);
    }
  };

  // Resize handler für rechten Tab
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setResultsPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Catch any rendering errors
  if (renderError) {
    return (
      <div className="prompt-management" style={{ padding: '20px' }}>
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">Fehler beim Rendern: {renderError}</p>
          <button className="btn btn-primary" onClick={() => {
            setRenderError(null);
            window.location.reload();
          }}>
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  const selectedPrompt = selectedPromptUuid
    ? Object.values(promptsByGroup).flat().find(p => p.uuid === selectedPromptUuid)
    : null;

  const selectedGroup = selectedPrompt
    ? groups.find(g => g.uuid === selectedPrompt.group_uuid) || null
    : null;

  // Show error state if there's an error
  if (error && categories.length === 0 && !loading) {
    return (
      <div className="prompt-management" style={{ padding: '20px' }}>
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <p className="empty-state-text">{error}</p>
          <button className="btn btn-primary" onClick={() => {
            setError(null);
            loadCategories();
          }}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  console.log('[PromptManagement] Rendering, loading:', loading, 'categories:', categories.length, 'error:', error);
  console.log('[PromptManagement] window.promptVault available:', typeof window !== 'undefined' && !!window.promptVault);
  console.log('[PromptManagement] window.promptVault.listCategories available:', typeof window !== 'undefined' && !!window.promptVault?.listCategories);
  
  return (
    <div className="prompt-management" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f5f5f5' }}>
      <div className="prompt-management-sidebar" style={{ backgroundColor: 'white', minWidth: '300px' }}>
        <CategorySelector
          categories={categories}
          selectedUuid={selectedCategoryUuid}
          onSelect={setSelectedCategoryUuid}
          onCreate={() => setEditingCategory({ uuid: '', name: '', created_at: '', updated_at: '' } as Category)}
          onEdit={(category) => setEditingCategory(category)}
          onDelete={handleDeleteCategory}
          loading={loading}
        />
      </div>

      <div className="prompt-management-main" style={{ flex: 1, padding: '20px', backgroundColor: '#f5f5f5' }}>
        {selectedCategoryUuid ? (
          <>
            <GroupBoard
              groups={groups}
              promptsByGroup={promptsByGroup}
              selectedPromptUuid={selectedPromptUuid}
              onSelectPrompt={(uuid) => setSelectedPromptUuid(uuid)}
              onCreateGroup={() => {
                if (selectedCategoryUuid) {
                  setCreatingGroup(true);
                }
              }}
              onEditGroup={(group) => setEditingGroup(group)}
              onDeleteGroup={handleDeleteGroup}
              onReorderGroups={handleReorderGroups}
              onCreatePrompt={(groupUuid) => setCreatingPrompt(groupUuid)}
              onEditPrompt={(prompt) => setEditingPrompt(prompt)}
              onUpdatePrompt={handleUpdatePrompt}
              onDeletePrompt={handleDeletePrompt}
              onReorderPrompts={handleReorderPrompts}
              onCopyPrompt={handleCopyPrompt}
            />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-text">Wähle eine Kategorie aus</p>
          </div>
        )}
      </div>

      <div 
        className="prompt-management-resizer"
        onMouseDown={handleMouseDown}
        style={{ 
          width: '4px', 
          backgroundColor: isResizing ? '#3498db' : '#e0e0e0',
          cursor: 'col-resize',
          userSelect: 'none',
          transition: isResizing ? 'none' : 'background-color 0.2s'
        }}
      />
      <div className="prompt-management-results" style={{ width: `${resultsPanelWidth}px`, minWidth: '300px', maxWidth: '800px', backgroundColor: 'white' }}>
        <PromptResultsPanel
          prompt={selectedPrompt || null}
          group={selectedGroup}
          results={results}
          onAddResult={() => {
            if (selectedPromptUuid) {
              setEditingResult({ uuid: '', prompt_uuid: selectedPromptUuid, content: '', created_at: '', updated_at: '' } as PromptResult);
            }
          }}
          onEditResult={(result) => setEditingResult(result)}
          onUpdateResult={handleUpdateResult}
          onDeleteResult={handleDeleteResult}
          editingResult={editingResult}
          onCloseResultEditor={() => setEditingResult(null)}
        />
      </div>

      {/* Modals */}
      {editingCategory && (
        <CategoryEditorModal
          category={editingCategory.uuid ? editingCategory : null}
          onSave={async (payload) => {
            if (editingCategory.uuid) {
              await handleUpdateCategory(editingCategory.uuid, payload);
            } else {
              await handleCreateCategory(payload);
            }
            setEditingCategory(null);
          }}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {(editingGroup || creatingGroup) && (
        <GroupEditorModal
          group={editingGroup}
          categoryUuid={selectedCategoryUuid}
          onSave={async (payload) => {
            if (editingGroup) {
              // Update
              await handleUpdateGroup(editingGroup.uuid, payload as UpdateGroupPayload);
            } else {
              // Create
              await handleCreateGroup(payload as CreateGroupPayload);
            }
            setEditingGroup(null);
            setCreatingGroup(false);
          }}
          onClose={() => {
            setEditingGroup(null);
            setCreatingGroup(false);
          }}
        />
      )}

      {creatingPrompt && (
        <ManagementPromptCreateModal
          groupUuid={creatingPrompt}
          groups={groups}
          onSave={async (payload) => {
            await handleCreatePrompt(payload);
            setCreatingPrompt(null);
          }}
          onClose={() => setCreatingPrompt(null)}
        />
      )}

      {editingPrompt && (
        <ManagementPromptEditorModal
          prompt={editingPrompt}
          groups={groups}
          onSave={async (payload) => {
            await handleUpdatePrompt(editingPrompt.uuid, payload);
            setEditingPrompt(null);
          }}
          onClose={() => setEditingPrompt(null)}
        />
      )}

      {editingResult && (
        <PromptResultEditorModal
          result={editingResult.uuid ? editingResult : null}
          promptUuid={editingResult.prompt_uuid || selectedPromptUuid}
          onSave={async (payload) => {
            if (editingResult.uuid) {
              await handleUpdateResult(editingResult.uuid, payload);
            } else if (payload.prompt_uuid) {
              await handleCreateResult(payload);
            }
            setEditingResult(null);
          }}
          onClose={() => setEditingResult(null)}
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
