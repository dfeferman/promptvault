// File: app/renderer/src/components/PromptResultsPanel.tsx

import React, { useState } from 'react';
import type { PromptResult, ManagementPrompt, CreatePromptResultPayload, UpdatePromptResultPayload, Group } from '../types';
import { PromptResultEditorModal } from './PromptResultEditorModal';
import { replaceVariables } from '../utils/variableReplacer';

interface PromptResultsPanelProps {
  prompt: ManagementPrompt | null;
  group: Group | null;
  results: PromptResult[];
  onAddResult: () => void;
  onEditResult: (result: PromptResult) => void;
  onUpdateResult: (uuid: string, payload: UpdatePromptResultPayload) => Promise<void>;
  onDeleteResult: (uuid: string) => Promise<void>;
  editingResult?: PromptResult | null;
  onCloseResultEditor: () => void;
}

/**
 * Panel zum Anzeigen und Verwalten von Prompt Results
 */
export const PromptResultsPanel: React.FC<PromptResultsPanelProps> = ({
  prompt,
  group,
  results,
  onAddResult,
  onEditResult,
  onUpdateResult,
  onDeleteResult,
  editingResult,
  onCloseResultEditor,
}) => {
  const [expandedResultUuid, setExpandedResultUuid] = useState<string | null>(null);

  // Funktion zum Schließen aller Dropdown-Menüs
  const closeAllDropdowns = () => {
    document.querySelectorAll('.download-dropdown-menu').forEach((menu) => {
      (menu as HTMLElement).style.display = 'none';
    });
  };

  // Schließe Dropdown-Menüs beim Klicken außerhalb
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.prompt-result-download-dropdown')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Schließe alle Dropdown-Menüs wenn das Bearbeiten-Modal geöffnet oder geschlossen wird
  React.useEffect(() => {
    if (editingResult !== null && editingResult !== undefined) {
      // Modal wird geöffnet
      closeAllDropdowns();
    }
  }, [editingResult]);

  if (!prompt) {
    return (
      <div className="prompt-results-panel">
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-text">Wähle einen Prompt aus</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateForFilename = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const downloadResult = (result: PromptResult, format: 'md' | 'txt') => {
    console.log('[PromptResultsPanel] Downloading result:', {
      resultUuid: result.uuid,
      format,
      promptName: prompt.name,
      contentLength: result.content.length,
      timestamp: new Date().toISOString()
    });
    const promptName = prompt.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = formatDateForFilename(result.created_at);
    const filename = `${promptName}_${dateStr}.${format}`;
    
    const blob = new Blob([result.content], { 
      type: format === 'md' ? 'text/markdown' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('[PromptResultsPanel] Download completed:', { filename });
  };

  // Ersetze Platzhalter im Prompt-Inhalt
  const promptContentWithVariables = group
    ? replaceVariables(prompt.content, group.global_variables)
    : prompt.content;

  // Funktion zum Kopieren von Text
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Optional: Notification anzeigen
      console.log('[PromptResultsPanel] Text in Zwischenablage kopiert');
    } catch (error) {
      console.error('[PromptResultsPanel] Fehler beim Kopieren:', error);
    }
  };

  return (
    <div className="prompt-results-panel">
      <div className="prompt-results-header">
        <div>
          <h3 className="prompt-results-title">{prompt.name}</h3>
          <p className="prompt-results-subtitle">Prompt-Ergebnisse</p>
        </div>
        <button className="btn btn-primary btn-small" onClick={onAddResult}>
          ➕ Ergebnis hinzufügen
        </button>
      </div>

      <div className="prompt-results-content">
        {/* Prompt-Inhalt mit ersetzten Variablen anzeigen */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
              Prompt-Inhalt {group && group.global_variables ? '(mit Variablen ersetzt)' : ''}:
            </div>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => copyToClipboard(promptContentWithVariables)}
              title="In Zwischenablage kopieren"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              📋 Kopieren
            </button>
          </div>
          <pre 
            style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-word', 
              fontSize: '13px', 
              lineHeight: '1.5',
              margin: 0,
              color: '#333',
              userSelect: 'text',
              cursor: 'text'
            }}
            onClick={(e) => {
              // Ermöglicht Textauswahl
              e.stopPropagation();
            }}
          >
            {promptContentWithVariables}
          </pre>
        </div>
        {results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">Keine Ergebnisse</p>
            <p className="empty-state-hint">Füge dein erstes Ergebnis hinzu</p>
          </div>
        ) : (
          <div className="prompt-results-list">
            {results.map((result) => (
              <div key={result.uuid} className="prompt-result-item">
                <div className="prompt-result-header">
                  <div className="prompt-result-meta">
                    <span className="prompt-result-date">{formatDate(result.created_at)}</span>
                    {result.updated_at !== result.created_at && (
                      <span className="prompt-result-updated">(bearbeitet)</span>
                    )}
                  </div>
                  <div className="prompt-result-actions">
                    <button
                      className="btn btn-icon"
                      onClick={() => setExpandedResultUuid(
                        expandedResultUuid === result.uuid ? null : result.uuid
                      )}
                      title="Ein-/Ausklappen"
                    >
                      {expandedResultUuid === result.uuid ? '▼' : '▶'}
                    </button>
                    <div className="prompt-result-download-dropdown">
                      <button
                        className="btn btn-icon"
                        title="Download"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Schließe alle anderen Dropdowns
                          document.querySelectorAll('.download-dropdown-menu').forEach((menu) => {
                            (menu as HTMLElement).style.display = 'none';
                          });
                          
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                          if (dropdown) {
                            const isOpen = dropdown.style.display === 'block';
                            dropdown.style.display = isOpen ? 'none' : 'block';
                            if (!isOpen) {
                              dropdown.style.left = `${rect.left}px`;
                              dropdown.style.top = `${rect.bottom + 5}px`;
                            }
                          }
                        }}
                      >
                        💾
                      </button>
                      <div className="download-dropdown-menu">
                        <button
                          className="download-dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadResult(result, 'md');
                            const dropdown = e.currentTarget.closest('.download-dropdown-menu') as HTMLElement;
                            if (dropdown) dropdown.style.display = 'none';
                          }}
                        >
                          📄 Als .md herunterladen
                        </button>
                        <button
                          className="download-dropdown-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadResult(result, 'txt');
                            const dropdown = e.currentTarget.closest('.download-dropdown-menu') as HTMLElement;
                            if (dropdown) dropdown.style.display = 'none';
                          }}
                        >
                          📄 Als .txt herunterladen
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn btn-icon"
                      onClick={() => {
                        closeAllDropdowns();
                        onEditResult(result);
                      }}
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-icon"
                      onClick={async () => {
                        if (confirm('Ergebnis wirklich löschen?')) {
                          await onDeleteResult(result.uuid);
                        }
                      }}
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {expandedResultUuid === result.uuid && (
                  <div className="prompt-result-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => {
                          const contentWithVariables = group
                            ? replaceVariables(result.content, group.global_variables)
                            : result.content;
                          copyToClipboard(contentWithVariables);
                        }}
                        title="In Zwischenablage kopieren"
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        📋 Kopieren
                      </button>
                    </div>
                    <pre 
                      className="prompt-result-text"
                      style={{ userSelect: 'text', cursor: 'text' }}
                      onClick={(e) => {
                        // Ermöglicht Textauswahl
                        e.stopPropagation();
                      }}
                    >
                      {group
                        ? replaceVariables(result.content, group.global_variables)
                        : result.content}
                    </pre>
                  </div>
                )}
                {expandedResultUuid !== result.uuid && (
                  <div className="prompt-result-preview">
                    {group
                      ? replaceVariables(result.content, group.global_variables).substring(0, 150)
                      : result.content.substring(0, 150)}
                    {(group
                      ? replaceVariables(result.content, group.global_variables).length
                      : result.content.length) > 150 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingResult && (
        <PromptResultEditorModal
          result={editingResult}
          onSave={async (payload) => {
            await onUpdateResult(editingResult.uuid, payload);
            closeAllDropdowns();
            onCloseResultEditor();
          }}
          onClose={() => {
            closeAllDropdowns();
            onCloseResultEditor();
          }}
        />
      )}
    </div>
  );
};
