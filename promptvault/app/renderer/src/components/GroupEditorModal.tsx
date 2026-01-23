// File: app/renderer/src/components/GroupEditorModal.tsx

import React, { useState, useEffect } from 'react';
import type { Group, UpdateGroupPayload } from '../types';

interface GroupEditorModalProps {
  group: Group;
  onSave: (payload: UpdateGroupPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal zum Bearbeiten von Gruppen
 */
export const GroupEditorModal: React.FC<GroupEditorModalProps> = ({
  group,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(group.name);
    setDescription(group.description || '');
    setError(null);
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      await onSave({ name: name.trim(), description: description.trim() || undefined });
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
          <h2 className="modal-title">Gruppe bearbeiten</h2>
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
              placeholder="Gruppen-Name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Beschreibung</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung"
              rows={3}
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
