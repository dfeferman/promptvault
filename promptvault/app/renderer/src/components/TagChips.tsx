// File: app/renderer/src/components/TagChips.tsx

import React from 'react';

interface TagChipsProps {
  tags?: string;
}

/**
 * Komponente zur Darstellung von Tags als Chips
 * Tags sind kommasepariert gespeichert
 */
export const TagChips: React.FC<TagChipsProps> = ({ tags }) => {
  if (!tags || !tags.trim()) {
    return null;
  }

  const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);

  if (tagArray.length === 0) {
    return null;
  }

  return (
    <div className="tag-chips">
      {tagArray.map((tag, index) => (
        <span key={index} className="tag-chip">
          {tag}
        </span>
      ))}
    </div>
  );
};
