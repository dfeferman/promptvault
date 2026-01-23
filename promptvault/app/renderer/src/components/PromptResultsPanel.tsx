// File: app/renderer/src/components/PromptResultsPanel.tsx

import React, { useState } from 'react';
import type { PromptResult, ManagementPrompt, CreatePromptResultPayload, UpdatePromptResultPayload } from '../types';
import { PromptResultEditorModal } from './PromptResultEditorModal';

interface PromptResultsPanelProps {
  prompt: ManagementPrompt | null;
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
  results,
  onAddResult,
  onEditResult,
  onUpdateResult,
  onDeleteResult,
  editingResult,
  onCloseResultEditor,
}) => {
  const [expandedResultUuid, setExpandedResultUuid] = useState<string | null>(null);

  // Schließe Dropdown-Menüs beim Klicken außerhalb
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.prompt-result-download-dropdown')) {
        const dropdowns = document.querySelectorAll('.download-dropdown-menu');
        dropdowns.forEach(dropdown => {
          (dropdown as HTMLElement).style.display = 'none';
        });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
                      onClick={() => onEditResult(result)}
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
                    <pre className="prompt-result-text">{result.content}</pre>
                  </div>
                )}
                {expandedResultUuid !== result.uuid && (
                  <div className="prompt-result-preview">
                    {result.content.substring(0, 150)}
                    {result.content.length > 150 && '...'}
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
            onCloseResultEditor();
          }}
          onClose={onCloseResultEditor}
        />
      )}
    </div>
  );
};
