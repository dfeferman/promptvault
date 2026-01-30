// File: app/renderer/src/components/Dashboard.tsx

import React from 'react';

export type AppMode = 'existing' | 'management';

interface DashboardProps {
  onSelectMode: (mode: AppMode) => void;
}

/**
 * Dashboard-Komponente: Einstiegspunkt zur Auswahl zwischen bestehender App und Prompt Management
 */
export const Dashboard: React.FC<DashboardProps> = ({ onSelectMode }) => {
  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <h1 className="dashboard-title">PromptVault</h1>
        <p className="dashboard-subtitle">Wähle einen Modus</p>
        
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => onSelectMode('existing')}>
            <div className="dashboard-card-icon">📝</div>
            <h2 className="dashboard-card-title">Meine Prompts</h2>
            <p className="dashboard-card-description">
              Verwende die klassische Prompt-Verwaltung mit Suche, Tags und Kategorien
            </p>
          </div>
          
          <div className="dashboard-card" onClick={() => onSelectMode('management')}>
            <div className="dashboard-card-icon">🗂️</div>
            <h2 className="dashboard-card-title">SEO Promts</h2>
            <p className="dashboard-card-description">
              Organisiere Prompts in Kategorien und Gruppen, speichere Ergebnisse
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
