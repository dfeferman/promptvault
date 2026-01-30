// File: app/renderer/src/components/GroupEditorModal.tsx

import React, { useState, useEffect } from 'react';
import type { Group, UpdateGroupPayload, CreateGroupPayload } from '../types';

interface GroupEditorModalProps {
  group: Group | null;
  categoryUuid?: string;
  onSave: (payload: UpdateGroupPayload | CreateGroupPayload) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal zum Erstellen und Bearbeiten von Gruppen
 */
export const GroupEditorModal: React.FC<GroupEditorModalProps> = ({
  group,
  categoryUuid,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({});
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
      // Parse global_variables from JSON string
      if (group.global_variables) {
        try {
          const parsed = JSON.parse(group.global_variables);
          setGlobalVariables(typeof parsed === 'object' && parsed !== null ? parsed : {});
        } catch {
          setGlobalVariables({});
        }
      } else {
        setGlobalVariables({});
      }
    } else {
      setName('');
      setDescription('');
      setGlobalVariables({});
    }
    setNewVarKey('');
    setNewVarValue('');
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
      const payload: UpdateGroupPayload | CreateGroupPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        global_variables: globalVariables, // Immer senden, auch wenn leer (wird als {} gespeichert)
      };
      
      console.log('[GroupEditorModal] Saving payload:', { 
        hasGlobalVars: !!payload.global_variables,
        globalVarsKeys: payload.global_variables ? Object.keys(payload.global_variables) : [],
        globalVars: payload.global_variables
      });
      
      if (group) {
        // Update
        await onSave(payload as UpdateGroupPayload);
      } else {
        // Create
        if (!categoryUuid) {
          setError('Kategorie-UUID fehlt');
          return;
        }
        await onSave({ ...payload, category_uuid: categoryUuid } as CreateGroupPayload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariable = () => {
    if (!newVarKey.trim()) {
      setError('Variablen-Name ist erforderlich');
      return;
    }
    if (globalVariables[newVarKey.trim()]) {
      setError('Variable mit diesem Namen existiert bereits');
      return;
    }
    setGlobalVariables({ ...globalVariables, [newVarKey.trim()]: newVarValue });
    setNewVarKey('');
    setNewVarValue('');
    setError(null);
  };

  const handleRemoveVariable = (key: string) => {
    const newVars = { ...globalVariables };
    delete newVars[key];
    setGlobalVariables(newVars);
  };

  const handleUpdateVariable = (key: string, value: string) => {
    setGlobalVariables({ ...globalVariables, [key]: value });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{group ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</h2>
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

          <div className="form-group">
            <label className="form-label">Globale Variablen</label>
            <div className="form-hint" style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
              Diese Variablen können in Prompt-Inhalten mit <code>{'{{variablenname}}'}</code> verwendet werden
            </div>
            
            {Object.keys(globalVariables).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {Object.entries(globalVariables).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={key}
                      readOnly
                      style={{ flex: '0 0 150px', backgroundColor: '#f5f5f5' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={value}
                      onChange={(e) => handleUpdateVariable(key, e.target.value)}
                      placeholder="Wert"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleRemoveVariable(key)}
                      style={{ flex: '0 0 auto', padding: '8px 12px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                placeholder="Variablen-Name (z.B. projektname)"
                style={{ flex: '0 0 150px' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVariable();
                  }
                }}
              />
              <input
                type="text"
                className="form-input"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                placeholder="Wert"
                style={{ flex: 1 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVariable();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddVariable}
                style={{ flex: '0 0 auto', padding: '8px 16px' }}
              >
                Hinzufügen
              </button>
            </div>
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
