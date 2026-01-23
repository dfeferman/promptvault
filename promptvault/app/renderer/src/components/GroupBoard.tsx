// File: app/renderer/src/components/GroupBoard.tsx

import React, { useState } from 'react';
import type { Group, ManagementPrompt } from '../types';
import { GroupColumn } from './GroupColumn';

interface GroupBoardProps {
  groups: Group[];
  promptsByGroup: Record<string, ManagementPrompt[]>;
  selectedPromptUuid?: string;
  onSelectPrompt: (uuid: string) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (uuid: string) => Promise<void>;
  onReorderGroups: (items: Array<{ uuid: string; display_order: number }>) => Promise<void>;
  onCreatePrompt: (group_uuid: string) => void;
  onEditPrompt: (prompt: ManagementPrompt) => void;
  onUpdatePrompt: (uuid: string, payload: { group_uuid: string }) => Promise<void>;
  onDeletePrompt: (uuid: string) => Promise<void>;
  onReorderPrompts: (group_uuid: string, items: Array<{ uuid: string; display_order: number }>) => Promise<void>;
  onCopyPrompt: (content: string) => Promise<void>;
}

/**
 * Board-Komponente für Gruppen (Kanban-Style)
 */
export const GroupBoard: React.FC<GroupBoardProps> = ({
  groups,
  promptsByGroup,
  selectedPromptUuid,
  onSelectPrompt,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onReorderGroups,
  onCreatePrompt,
  onEditPrompt,
  onUpdatePrompt,
  onDeletePrompt,
  onReorderPrompts,
  onCopyPrompt,
}) => {
  const [draggedGroupUuid, setDraggedGroupUuid] = useState<string | null>(null);
  const [draggedPromptUuid, setDraggedPromptUuid] = useState<string | null>(null);
  const [draggedPromptGroupUuid, setDraggedPromptGroupUuid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleGroupDragStart = (uuid: string) => {
    setDraggedGroupUuid(uuid);
  };

  const handleGroupDragEnd = async (targetIndex: number) => {
    if (!draggedGroupUuid) return;

    const sortedGroups = [...groups].sort((a, b) => a.display_order - b.display_order);
    const draggedIndex = sortedGroups.findIndex(g => g.uuid === draggedGroupUuid);
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedGroupUuid(null);
      return;
    }

    // Reorder groups
    const reordered = [...sortedGroups];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const items = reordered.map((group, index) => ({
      uuid: group.uuid,
      display_order: index,
    }));

    try {
      await onReorderGroups(items);
    } catch (error) {
      console.error('Failed to reorder groups:', error);
    }

    setDraggedGroupUuid(null);
  };

  const handlePromptDragStart = (promptUuid: string, groupUuid: string) => {
    setDraggedPromptUuid(promptUuid);
    setDraggedPromptGroupUuid(groupUuid);
  };

  const handlePromptDragEnd = async (targetGroupUuid: string, targetIndex: number) => {
    if (!draggedPromptUuid || !draggedPromptGroupUuid) return;

    const sourcePrompts = promptsByGroup[draggedPromptGroupUuid] || [];
    const targetPrompts = promptsByGroup[targetGroupUuid] || [];
    
    const draggedIndex = sourcePrompts.findIndex(p => p.uuid === draggedPromptUuid);
    if (draggedIndex === -1) {
      setDraggedPromptUuid(null);
      setDraggedPromptGroupUuid(null);
      return;
    }

    const draggedPrompt = sourcePrompts[draggedIndex];

    // If moving to different group
    if (draggedPromptGroupUuid !== targetGroupUuid) {
      try {
        await onUpdatePrompt(draggedPromptUuid, { group_uuid: targetGroupUuid });
        // Reorder in target group
        const reorderedTarget = [...targetPrompts];
        reorderedTarget.splice(targetIndex, 0, draggedPrompt);
        const items = reorderedTarget.map((p, idx) => ({
          uuid: p.uuid,
          display_order: idx,
        }));
        await onReorderPrompts(targetGroupUuid, items);
      } catch (error) {
        console.error('Failed to move prompt:', error);
      }
    } else {
      // Reorder within same group
      const reordered = [...sourcePrompts];
      reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, draggedPrompt);
      const items = reordered.map((p, idx) => ({
        uuid: p.uuid,
        display_order: idx,
      }));
      try {
        await onReorderPrompts(targetGroupUuid, items);
      } catch (error) {
        console.error('Failed to reorder prompts:', error);
      }
    }

    setDraggedPromptUuid(null);
    setDraggedPromptGroupUuid(null);
  };

  const sortedGroups = [...groups].sort((a, b) => a.display_order - b.display_order);
  
  // Filtere Gruppen basierend auf Suchanfrage
  const filteredGroups = sortedGroups.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return group.name.toLowerCase().includes(query) || 
           (group.description && group.description.toLowerCase().includes(query));
  });

  return (
    <div className="group-board">
      <div className="group-board-header">
        <h2 className="group-board-title">Gruppen</h2>
        <div className="group-board-header-actions">
          <div className="group-search-wrapper">
            <input
              type="text"
              className="group-search-input"
              placeholder="🔍 Gruppen suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn btn-icon group-search-clear"
                onClick={() => setSearchQuery('')}
                title="Suche löschen"
              >
                ✕
              </button>
            )}
          </div>
          <button className="btn btn-primary btn-small" onClick={onCreateGroup}>
            ➕ Neue Gruppe
          </button>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">
            {searchQuery ? 'Keine Gruppen gefunden' : 'Keine Gruppen'}
          </p>
          <p className="empty-state-hint">
            {searchQuery ? 'Versuche eine andere Suche' : 'Erstelle deine erste Gruppe'}
          </p>
        </div>
      ) : (
        <div className="group-board-columns">
          {filteredGroups.map((group, groupIndex) => (
            <GroupColumn
              key={group.uuid}
              group={group}
              prompts={promptsByGroup[group.uuid] || []}
              selectedPromptUuid={selectedPromptUuid}
              onSelectPrompt={onSelectPrompt}
              onCreatePrompt={() => onCreatePrompt(group.uuid)}
              onEditGroup={onEditGroup}
              onDeleteGroup={onDeleteGroup}
              onEditPrompt={onEditPrompt}
              onDeletePrompt={onDeletePrompt}
              onCopyPrompt={onCopyPrompt}
              onDragStart={handlePromptDragStart}
              onDragEnd={handlePromptDragEnd}
              draggedPromptUuid={draggedPromptUuid}
              groupIndex={groupIndex}
              onGroupDragStart={handleGroupDragStart}
              onGroupDragEnd={handleGroupDragEnd}
              draggedGroupUuid={draggedGroupUuid}
            />
          ))}
        </div>
      )}
    </div>
  );
};
