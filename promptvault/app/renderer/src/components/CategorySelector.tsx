// File: app/renderer/src/components/CategorySelector.tsx

import React from 'react';
import type { Category } from '../types';

interface CategorySelectorProps {
  categories: Category[];
  selectedUuid?: string;
  onSelect: (uuid: string) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
  onDelete: (uuid: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Kategorie-Auswahl-Komponente
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedUuid,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  loading,
}) => {
  if (loading) {
    return (
      <div className="category-selector">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">Lade Kategorien...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-selector">
      <div className="category-selector-header">
        <h2 className="category-selector-title">Kategorien</h2>
        <button className="btn btn-primary btn-small" onClick={onCreate}>
          ➕ Neu
        </button>
      </div>
      
      {categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
          <p className="empty-state-text">Keine Kategorien</p>
          <p className="empty-state-hint">Erstelle deine erste Kategorie</p>
        </div>
      ) : (
        <div className="category-list">
          {categories.map((category) => (
            <div
              key={category.uuid}
              className={`category-item ${selectedUuid === category.uuid ? 'active' : ''}`}
            >
              <div 
                className="category-item-content"
                onClick={() => onSelect(category.uuid)}
              >
                <div className="category-item-name">{category.name}</div>
                {category.description && (
                  <div className="category-item-description">{category.description}</div>
                )}
              </div>
              <div className="category-item-actions">
                <button
                  className="btn btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(category);
                  }}
                  title="Bearbeiten"
                >
                  ✏️
                </button>
                <button
                  className="btn btn-icon"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Kategorie "${category.name}" wirklich löschen? Alle Gruppen und Prompts in dieser Kategorie werden ebenfalls gelöscht.`)) {
                      await onDelete(category.uuid);
                    }
                  }}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
