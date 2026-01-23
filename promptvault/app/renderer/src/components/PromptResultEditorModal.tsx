// File: app/renderer/src/components/PromptResultEditorModal.tsx

import React, { useState, useEffect } from 'react';
import type { PromptResult, UpdatePromptResultPayload, CreatePromptResultPayload } from '../types';

interface PromptResultEditorModalProps {
  result: PromptResult | null;
  promptUuid?: string;
  onSave: (payload: UpdatePromptResultPayload | CreatePromptResultPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal zum Erstellen/Bearbeiten von Prompt Results
 */
export const PromptResultEditorModal: React.FC<PromptResultEditorModalProps> = ({
  result,
  promptUuid,
  onSave,
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (result) {
      setContent(result.content);
    } else {
      setContent('');
    }
    setError(null);
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!content.trim()) {
      setError('Inhalt ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      if (result) {
        await onSave({ content: content.trim() });
      } else if (promptUuid) {
        await onSave({ prompt_uuid: promptUuid, content: content.trim() });
      } else {
        throw new Error('Prompt UUID fehlt');
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {result ? 'Ergebnis bearbeiten' : 'Neues Ergebnis'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label form-label-required">Inhalt</label>
            <textarea
              className="form-textarea form-textarea-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Füge hier das Ergebnis ein..."
              rows={15}
              style={{ resize: 'both' }}
            />
          </div>

          {error && (
            <div className="form-error">{error}</div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
