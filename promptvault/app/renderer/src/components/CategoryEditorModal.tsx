// File: app/renderer/src/components/CategoryEditorModal.tsx

import React, { useState, useEffect } from 'react';
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from '../types';

interface CategoryEditorModalProps {
  category: Category | null;
  onSave: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal zum Erstellen/Bearbeiten von Kategorien
 */
export const CategoryEditorModal: React.FC<CategoryEditorModalProps> = ({
  category,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError(null);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    try {
      setSaving(true);
      if (category) {
        await onSave({ name: name.trim(), description: description.trim() || undefined });
      } else {
        await onSave({ name: name.trim(), description: description.trim() || undefined });
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
            {category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
          </h2>
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
              placeholder="Kategorie-Name"
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
