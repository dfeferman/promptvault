// File: app/renderer/src/components/GroupColumn.tsx

import React, { useState } from 'react';
import type { Group, ManagementPrompt } from '../types';

interface GroupColumnProps {
  group: Group;
  prompts: ManagementPrompt[];
  selectedPromptUuid?: string;
  onSelectPrompt: (uuid: string) => void;
  onCreatePrompt: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (uuid: string) => Promise<void>;
  onEditPrompt: (prompt: ManagementPrompt) => void;
  onDeletePrompt: (uuid: string) => Promise<void>;
  onCopyPrompt: (content: string) => Promise<void>;
  onDragStart: (promptUuid: string, groupUuid: string) => void;
  onDragEnd: (targetGroupUuid: string, targetIndex: number) => void;
  draggedPromptUuid: string | null;
  groupIndex: number;
  onGroupDragStart: (uuid: string) => void;
  onGroupDragEnd: (targetIndex: number) => void;
  draggedGroupUuid: string | null;
}

/**
 * Einzelne Spalte im Group Board
 */
export const GroupColumn: React.FC<GroupColumnProps> = ({
  group,
  prompts,
  selectedPromptUuid,
  onSelectPrompt,
  onCreatePrompt,
  onEditGroup,
  onDeleteGroup,
  onEditPrompt,
  onDeletePrompt,
  onCopyPrompt,
  onDragStart,
  onDragEnd,
  draggedPromptUuid,
  groupIndex,
  onGroupDragStart,
  onGroupDragEnd,
  draggedGroupUuid,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [draggedOver, setDraggedOver] = useState(false);

  const sortedPrompts = [...prompts].sort((a, b) => a.display_order - b.display_order);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(true);
  };

  const handleDragLeave = () => {
    setDraggedOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);
    
    if (draggedPromptUuid) {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const promptHeight = 80; // Approximate height of prompt card
      const headerHeight = 60;
      const index = Math.max(0, Math.floor((y - headerHeight) / promptHeight));
      onDragEnd(group.uuid, Math.min(index, sortedPrompts.length));
    }
  };

  const handleGroupDragStart = (e: React.DragEvent) => {
    onGroupDragStart(group.uuid);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGroupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedGroupUuid && draggedGroupUuid !== group.uuid) {
      onGroupDragEnd(groupIndex);
    }
  };

  return (
    <div
      className={`group-column ${draggedOver ? 'drag-over' : ''} ${draggedGroupUuid === group.uuid ? 'dragging' : ''}`}
      draggable={true}
      onDragStart={handleGroupDragStart}
      onDragOver={(e) => {
        handleGroupDragOver(e);
        handleDragOver(e);
      }}
      onDrop={(e) => {
        handleGroupDrop(e);
        handleDrop(e);
      }}
      onDragLeave={handleDragLeave}
    >
      <div className="group-column-header">
        <div className="group-column-title-wrapper">
          <h3 className="group-column-title">{group.name}</h3>
          {group.description && (
            <p className="group-column-description">{group.description}</p>
          )}
        </div>
        <div className="group-column-menu">
          <button
            className="btn btn-icon"
            onClick={() => setShowMenu(!showMenu)}
          >
            ⋮
          </button>
          {showMenu && (
            <div className="group-column-menu-dropdown">
              <button
                className="group-column-menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onEditGroup(group);
                }}
              >
                ✏️ Bearbeiten
              </button>
              <button
                className="group-column-menu-item group-column-menu-item-danger"
                onClick={async () => {
                  setShowMenu(false);
                  if (confirm(`Gruppe "${group.name}" wirklich löschen?`)) {
                    await onDeleteGroup(group.uuid);
                  }
                }}
              >
                🗑️ Löschen
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="group-column-content">
        {sortedPrompts.length === 0 ? (
          <div className="group-column-empty">
            <p>Keine Prompts</p>
            <button className="btn btn-secondary btn-small" onClick={onCreatePrompt}>
              ➕ Prompt hinzufügen
            </button>
          </div>
        ) : (
          sortedPrompts.map((prompt, index) => (
            <PromptCard
              key={prompt.uuid}
              prompt={prompt}
              isSelected={selectedPromptUuid === prompt.uuid}
              onSelect={() => onSelectPrompt(prompt.uuid)}
              onEdit={() => onEditPrompt(prompt)}
              onDelete={() => onDeletePrompt(prompt.uuid)}
              onCopy={() => onCopyPrompt(prompt.content)}
              onDragStart={() => onDragStart(prompt.uuid, group.uuid)}
              isDragging={draggedPromptUuid === prompt.uuid}
            />
          ))
        )}
      </div>

      <div className="group-column-footer">
        <button className="btn btn-secondary btn-small" onClick={onCreatePrompt}>
          ➕ Prompt hinzufügen
        </button>
      </div>
    </div>
  );
};

interface PromptCardProps {
  prompt: ManagementPrompt;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onDragStart: () => void;
  isDragging: boolean;
}

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  onDragStart,
  isDragging,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart();
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`prompt-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable={true}
      onDragStart={handleDragStart}
      onClick={onSelect}
    >
      <div className="prompt-card-header">
        <h4 className="prompt-card-title">{prompt.name}</h4>
        <div className="prompt-card-menu">
          <button
            className="btn btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋮
          </button>
          {showMenu && (
            <div className="prompt-card-menu-dropdown" onClick={(e) => e.stopPropagation()}>
              <button className="prompt-card-menu-item" onClick={onEdit}>
                ✏️ Bearbeiten
              </button>
              <button className="prompt-card-menu-item" onClick={onCopy}>
                📋 Kopieren
              </button>
              <button
                className="prompt-card-menu-item prompt-card-menu-item-danger"
                onClick={async () => {
                  if (confirm(`Prompt "${prompt.name}" wirklich löschen?`)) {
                    await onDelete();
                  }
                  setShowMenu(false);
                }}
              >
                🗑️ Löschen
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="prompt-card-content">
        {prompt.content.substring(0, 100)}
        {prompt.content.length > 100 && '...'}
      </div>
    </div>
  );
};
