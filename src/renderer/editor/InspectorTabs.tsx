import React, { useRef } from 'react';

export type InspectorTabId = 'layout' | 'motion' | 'webcam' | 'annotations' | 'captions';

interface InspectorTabsProps {
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
  t: (key: string) => string;
  isCompactMode: boolean;
}

const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
);

const MotionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
);

const WebcamIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);

const OverlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

const CaptionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 15h4M7 9h10M7 12h10"/></svg>
);

const TABS: { id: InspectorTabId; labelKey: string; Icon: React.ComponentType }[] = [
  { id: 'layout', labelKey: 'layout', Icon: LayoutIcon },
  { id: 'motion', labelKey: 'motion', Icon: MotionIcon },
  { id: 'webcam', labelKey: 'webcam', Icon: WebcamIcon },
  { id: 'annotations', labelKey: 'overlay', Icon: OverlayIcon },
  { id: 'captions', labelKey: 'captions', Icon: CaptionsIcon },
];

export const InspectorTabs: React.FC<InspectorTabsProps> = ({
  activeTab,
  onTabChange,
  t,
  isCompactMode,
}) => {
  const tabRefs = useRef<Record<InspectorTabId, HTMLButtonElement | null>>({
    layout: null,
    motion: null,
    webcam: null,
    annotations: null,
    captions: null,
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = TABS[nextIndex].id;
    onTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <div
      className="tab-buttons"
      role="tablist"
      aria-label="Inspector tabs"
      onKeyDown={handleKeyDown}
      style={{ display: 'flex', width: '100%', gap: 2, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8 }}
    >
      {TABS.map((tab) => {
        const { Icon } = tab;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`editor-panel-${tab.id}`}
            id={`editor-tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`menu-btn ${isActive ? 'active' : ''}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: isCompactMode ? '8px 2px' : '8px 4px',
              fontSize: 10,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            onClick={() => onTabChange(tab.id)}
            title={t(tab.labelKey)}
            aria-label={t(tab.labelKey)}
          >
            <Icon />
            {!isCompactMode && (
              <span className="tab-label-text" style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                {t(tab.labelKey)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
