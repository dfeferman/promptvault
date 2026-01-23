// File: app/renderer/src/components/PromptEditorModal.tsx

import React, { useState, useEffect } from 'react';
import type { Prompt, CreatePromptPayload, UpdatePromptPayload } from '../types';

interface PromptEditorModalProps {
  prompt?: Prompt | null;
  onSave: (payload: CreatePromptPayload | UpdatePromptPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal für das Erstellen und Bearbeiten von Prompts
 * Validierung mit Fehlermeldungen
 */
export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ prompt, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    tags: '',
    category: '',
    language: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setFormData({
        title: prompt.title || '',
        description: prompt.description || '',
        content: prompt.content || '',
        tags: prompt.tags || '',
        category: prompt.category || '',
        language: prompt.language || '',
      });
    }
  }, [prompt]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Fehler löschen wenn Feld geändert wird
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Prompt-Inhalt ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        content: formData.content.trim(),
        tags: formData.tags.trim() || undefined,
        category: formData.category.trim() || undefined,
        language: formData.language.trim() || undefined,
      };

      await onSave(payload);
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      
      // Fehlermeldung anzeigen
      if (error.message.includes('VALIDATION_ERROR')) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Fehler beim Speichern: ' + error.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{prompt ? 'Prompt bearbeiten' : 'Neuer Prompt'}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.general && (
              <div style={{ padding: '12px', backgroundColor: '#fee', borderRadius: '4px', marginBottom: '16px', color: '#c00' }}>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="title">
                Titel
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                placeholder="z.B. Code Review Prompt"
                autoFocus
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optionale Beschreibung des Prompts"
                rows={3}
              />
              <div className="form-hint">Kurze Erklärung, wofür dieser Prompt verwendet wird</div>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="content">
                Prompt-Inhalt
              </label>
              <textarea
                id="content"
                name="content"
                className="form-textarea form-textarea-content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Der eigentliche Prompt-Text..."
              />
              {errors.content && <div className="form-error">{errors.content}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tags">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                className="form-input"
                value={formData.tags}
                onChange={handleChange}
                placeholder="z.B. coding, review, documentation (kommasepariert)"
              />
              <div className="form-hint">Mehrere Tags mit Komma trennen</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">
                Kategorie
              </label>
              <input
                id="category"
                name="category"
                type="text"
                className="form-input"
                value={formData.category}
                onChange={handleChange}
                placeholder="z.B. Entwicklung, Marketing, Forschung"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="language">
                Sprache
              </label>
              <input
                id="language"
                name="language"
                type="text"
                className="form-input"
                value={formData.language}
                onChange={handleChange}
                placeholder="z.B. Deutsch, Englisch, Python"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
