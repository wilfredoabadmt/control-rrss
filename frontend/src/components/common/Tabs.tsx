import React from 'react';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`tabs-container ${className}`}>
      <div className="tabs-list" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-button ${isActive ? 'tab-button-active' : ''}`}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-label">{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== null && (
                <span className={`tab-badge ${isActive ? 'tab-badge-active' : ''}`}>
                  {tab.badge}
                </span>
              )}
              {isActive && <div className="tab-indicator" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
