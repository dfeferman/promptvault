// File: app/renderer/src/components/PromptList.tsx

import React from 'react';
import type { Prompt } from '../types';
import { TagChips } from './TagChips';

interface PromptListProps {
  prompts: Prompt[];
  selectedUuid?: string;
  onSelect: (uuid: string) => void;
  loading?: boolean;
}

/**
 * Liste aller Prompts mit Auswahlfunktion
 */
export const PromptList: React.FC<PromptListProps> = ({ prompts, selectedUuid, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <p className="empty-state-text">Lade Prompts...</p>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <p className="empty-state-text">Keine Prompts gefunden</p>
        <p className="empty-state-hint">Erstelle deinen ersten Prompt mit <kbd>Cmd/Ctrl+N</kbd></p>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `Vor ${diffMins} Min.`;
    if (diffHours < 24) return `Vor ${diffHours} Std.`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="prompt-list">
      {prompts.map((prompt) => (
        <div
          key={prompt.uuid}
          className={`prompt-list-item ${selectedUuid === prompt.uuid ? 'active' : ''}`}
          onClick={() => onSelect(prompt.uuid)}
        >
          <h3 className="prompt-item-title">{prompt.title}</h3>
          {prompt.description && (
            <p className="prompt-item-description">{prompt.description}</p>
          )}
          {prompt.tags && <TagChips tags={prompt.tags} />}
          <div className="prompt-item-meta">
            {prompt.category && <span>📁 {prompt.category}</span>}
            <span>🕒 {formatDate(prompt.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
