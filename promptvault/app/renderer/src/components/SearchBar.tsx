// File: app/renderer/src/components/SearchBar.tsx

import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onNewPrompt: () => void;
}

/**
 * Suchleiste mit Tastaturkürzel Cmd/Ctrl+K
 */
export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onNewPrompt }) => {
  const [query, setQuery] = useState('');

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Fokus auf Suche
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      // Cmd/Ctrl + N: Neuer Prompt
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onNewPrompt();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewPrompt]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <input
          id="search-input"
          type="text"
          className="search-input"
          placeholder="Suche Prompts"
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button
            className="btn btn-icon search-icon"
            onClick={handleClear}
            style={{ pointerEvents: 'auto', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            ✕
          </button>
        )}
        {!query && <span className="search-icon">🔍</span>}
      </div>
      <div className="search-hint">
        Tastenkürzel: <kbd>Cmd/Ctrl+K</kbd> für Suche, <kbd>Cmd/Ctrl+N</kbd> für neuen Prompt
      </div>
    </div>
  );
};
