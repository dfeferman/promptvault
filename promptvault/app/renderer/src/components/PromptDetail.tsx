// File: app/renderer/src/components/PromptDetail.tsx

import React, { useEffect } from 'react';
import type { Prompt } from '../types';
import { TagChips } from './TagChips';

interface PromptDetailProps {
  prompt: Prompt | null;
  onEdit: (prompt: Prompt) => void;
  onDelete: (uuid: string) => void;
  onDuplicate: (prompt: Prompt) => void;
  onCopy: (content: string) => void;
}

/**
 * Detailansicht eines Prompts mit Copy, Edit, Delete, Duplicate
 * Tastaturkürzel: Cmd/Ctrl+Enter für Copy
 */
export const PromptDetail: React.FC<PromptDetailProps> = ({ prompt, onEdit, onDelete, onDuplicate, onCopy }) => {
  // Keyboard Shortcut: Cmd/Ctrl+Enter zum Kopieren
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt) {
        e.preventDefault();
        onCopy(prompt.content);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, onCopy]);

  if (!prompt) {
    return (
      <div className="prompt-detail-empty">
        <div className="prompt-detail-empty-icon">👈</div>
        <p className="prompt-detail-empty-text">Wähle einen Prompt aus der Liste</p>
      </div>
    );
  }

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyClick = () => {
    onCopy(prompt.content);
  };

  const handleDeleteClick = () => {
    if (confirm(`Möchtest du den Prompt "${prompt.title}" wirklich löschen?`)) {
      onDelete(prompt.uuid);
    }
  };

  return (
    <div className="prompt-detail">
      <div className="prompt-detail-header">
        <h1 className="prompt-detail-title">{prompt.title}</h1>
        <div className="prompt-detail-actions">
          <button className="btn btn-success btn-small" onClick={handleCopyClick} title="Cmd/Ctrl+Enter">
            📋 Kopieren
          </button>
          <button className="btn btn-primary btn-small" onClick={() => onEdit(prompt)}>
            ✏️ Bearbeiten
          </button>
          <button className="btn btn-secondary btn-small" onClick={() => onDuplicate(prompt)}>
            📑 Duplizieren
          </button>
          <button className="btn btn-danger btn-small" onClick={handleDeleteClick}>
            🗑️ Löschen
          </button>
        </div>
      </div>

      {prompt.tags && (
        <div className="prompt-detail-section">
          <TagChips tags={prompt.tags} />
        </div>
      )}

      {prompt.description && (
        <div className="prompt-detail-section">
          <div className="prompt-detail-label">Beschreibung</div>
          <p className="prompt-detail-description">{prompt.description}</p>
        </div>
      )}

      <div className="prompt-detail-section">
        <div className="prompt-detail-label">Prompt-Inhalt</div>
        <pre className="prompt-detail-content">{prompt.content}</pre>
      </div>

      <div className="prompt-detail-section">
        <div className="prompt-detail-meta">
          {prompt.category && (
            <div className="prompt-detail-meta-item">
              <strong>Kategorie:</strong>
              <span>{prompt.category}</span>
            </div>
          )}
          {prompt.language && (
            <div className="prompt-detail-meta-item">
              <strong>Sprache:</strong>
              <span>{prompt.language}</span>
            </div>
          )}
          <div className="prompt-detail-meta-item">
            <strong>Erstellt:</strong>
            <span>{formatDateTime(prompt.created_at)}</span>
          </div>
          <div className="prompt-detail-meta-item">
            <strong>Geändert:</strong>
            <span>{formatDateTime(prompt.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
