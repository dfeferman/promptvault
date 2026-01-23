// File: app/renderer/src/components/ManagementPromptCreateModal.tsx

import React, { useState } from 'react';
import type { Group, CreateManagementPromptPayload } from '../types';

interface ManagementPromptCreateModalProps {
  groupUuid: string;
  groups: Group[];
  onSave: (payload: CreateManagementPromptPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal zum Erstellen neuer ManagementPrompts
 */
export const ManagementPromptCreateModal: React.FC<ManagementPromptCreateModalProps> = ({
  groupUuid,
  groups,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroupUuid, setSelectedGroupUuid] = useState(groupUuid);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }
    if (!content.trim()) {
      setError('Inhalt ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        group_uuid: selectedGroupUuid,
        name: name.trim(),
        content: content.trim(),
      });
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
          <h2 className="modal-title">Neuer Prompt</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label form-label-required">Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prompt-Name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gruppe</label>
            <select
              className="form-input"
              value={selectedGroupUuid}
              onChange={(e) => setSelectedGroupUuid(e.target.value)}
            >
              {groups.map((group) => (
                <option key={group.uuid} value={group.uuid}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label form-label-required">Inhalt</label>
            <textarea
              className="form-textarea form-textarea-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Prompt-Inhalt"
              rows={10}
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
