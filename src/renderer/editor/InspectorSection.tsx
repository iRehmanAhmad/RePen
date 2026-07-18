import React from 'react';
import type { InspectorTabId } from './InspectorTabs';

interface InspectorSectionProps {
  activeTab: InspectorTabId;
  t: (key: string) => string;
  children: React.ReactNode;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  activeTab,
  t,
  children,
}) => {
  return (
    <div
      id={`editor-panel-${activeTab}`}
      role="tabpanel"
      aria-labelledby={`editor-tab-${activeTab}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text)' }}>
          {t(activeTab === 'annotations' ? 'overlay' : activeTab)}
        </h3>
      </div>
      <div className="inspector-scrollable-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 4 }}>
        {children}
      </div>
    </div>
  );
};
