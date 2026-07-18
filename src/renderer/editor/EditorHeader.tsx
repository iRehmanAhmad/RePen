import React, { useState, useEffect, useRef } from 'react';
import type { AppCapabilities } from '../../shared/contracts/ipc';

interface EditorHeaderProps {
  projectPath: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error' | 'idle';
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  capabilities: AppCapabilities;
  locale: 'en' | 'es';
  t: (key: string) => string;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClose: () => void;
  onExportDiagnostics: () => void;
  onLocaleChange: (loc: 'en' | 'es') => void;
  onResetLayout: () => void;
  recentProjects: string[];
  onLoadRecent: (path: string) => void;
  onShowShortcuts: () => void;
}

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);

const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
);

const BrandIcon = () => (
  <svg style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 512 512" aria-hidden="true">
    <polygon fill="#111827" points="255.999,109.533 235.1,193.394 296.848,172.495"/>
    <polygon fill="#64748B" points="215.15,172.495 255.999,193.394 255.999,109.533"/>
    <path fill="#22D3EE" d="M296.848,172.495h-40.849L235.1,289.387c60.398,0,109.776-42.862,109.778-42.863L296.848,172.495z"/>
    <path fill="#F8FAFC" d="M215.15,172.495l-48.03,74.03c0.001,0.001,28.481,42.863,88.879,42.863V172.495H215.15z"/>
    <path fill="#111827" d="M285.625,266.588c-8.852,1.176-18.71,1.9-29.626,1.9L235.1,389.293l20.899,122.706h29.626l20.899-122.706L285.625,266.588z"/>
    <path fill="#0EA5E9" d="M344.877,246.524c-0.001,0.001-19.132,14.735-59.253,20.063v245.412h59.253V246.524z"/>
    <path fill="#64748B" d="M226.373,266.588l-20.899,122.706L226.373,512h29.626V268.488c-10.917,0-20.775-0.724-29.626-1.9z"/>
    <path fill="#F8FAFC" d="M167.12,246.524v265.475h59.253V266.588c-40.121-5.329-59.252-20.063-59.253-20.064z"/>
    <polygon fill="#FDE68A" points="271.673,0 255.999,0 245.55,29.546 255.999,59.091 271.673,59.091"/>
    <rect x="310.673" y="29.136" transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 515.6158 330.9375)" fill="#67E8F9" width="31.348" height="59.091"/>
    <rect x="126.96" y="113.366" fill="#FDE68A" width="59.092" height="31.348"/>
    <rect x="325.949" y="113.366" fill="#67E8F9" width="59.092" height="31.348"/>
    <rect x="156.105" y="43.008" transform="matrix(-0.7071 -0.7071 0.7071 -0.7071 275.4308 231.4505)" fill="#FDE68A" width="59.091" height="31.348"/>
    <rect x="240.326" fill="#67E8F9" width="15.674" height="59.092"/>
  </svg>
);

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  projectPath,
  saveStatus,
  isSaving,
  canUndo,
  canRedo,
  capabilities,
  locale,
  t,
  onSave,
  onUndo,
  onRedo,
  onExport,
  onClose,
  onExportDiagnostics,
  onLocaleChange,
  onResetLayout,
  recentProjects,
  onLoadRecent,
  onShowShortcuts,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on click outside or escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Compute display file name
  const fileName = projectPath ? projectPath.split(/[/\\]/).pop() || 'Untitled' : 'Loading...';
  const hasUnsavedChanges = saveStatus === 'unsaved' || saveStatus === 'saving';

  // Check export capability states
  const hasExportAvailable = Boolean(capabilities.mp4Export?.available || capabilities.gifExport?.available);
  const exportLabel = t('export');
  const exportTooltip = hasExportAvailable 
    ? 'Export composition' 
    : 'Export engine unavailable: FFmpeg or transcription packages are not installed';

  return (
    <header className="editor-header" role="banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
      {/* Title & Path */}
      <div className="editor-title" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexShrink: 1 }}>
        <BrandIcon />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexShrink: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('title')}</span>
            {hasUnsavedChanges && (
              <span className="dirty-indicator" title="Unsaved Changes" role="status" aria-label="Unsaved progress" />
            )}
          </div>
          <span 
            style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}
            title={projectPath || ''}
          >
            {fileName}
          </span>
        </div>
        {saveStatus === 'saving' && (
          <span className="save-status" role="status" style={{ flexShrink: 0 }}>{"Saving\u2026"}</span>
        )}
      </div>

      {/* Control Actions */}
      <div className="menu-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {/* Undo/Redo Buttons */}
        <button
          className="menu-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          className="menu-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon />
        </button>

        {/* Save Button */}
        <button
          className="menu-btn"
          onClick={onSave}
          disabled={isSaving}
          title="Save changes (Ctrl+S)"
          style={{ gap: 6 }}
          aria-label="save"
        >
          <SaveIcon />
          <span className="responsive-label">{t('save')}</span>
        </button>

        {/* Export Button */}
        <button
          className="menu-btn"
          onClick={onExport}
          disabled={!hasExportAvailable}
          title={exportTooltip}
          style={{ gap: 6 }}
          aria-label="export"
        >
          <ExportIcon />
          <span className="responsive-label">{exportLabel}</span>
        </button>

        {/* Close Button */}
        <button
          className="menu-btn"
          onClick={onClose}
          title="Close Editor"
          style={{ gap: 6, color: 'var(--danger)' }}
          aria-label="close"
        >
          <span className="responsive-label">{t('close')}</span>
        </button>

        {/* "More" Overflow Dropdown menu */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            ref={buttonRef}
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="More options"
            title="More Options"
          >
            <MoreIcon />
          </button>
          
          {menuOpen && (
            <div 
              className="dialog-container" 
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 220,
                padding: 8,
                zIndex: 1000,
                display: 'flex',
                boxSizing: 'border-box',
                flexDirection: 'column',
                gap: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                border: '1px solid var(--line-strong)',
                background: '#0f111a',
              }}
            >
              {/* Language Selection */}
              <div role="menuitem" style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="property-label" style={{ fontSize: 10 }}>{t('selectLanguage')}</span>
                <select
                  style={{
                    background: '#11131c',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    outline: 'none',
                    width: '100%',
                  }}
                  value={locale}
                  onChange={(e) => onLocaleChange(e.target.value as 'en' | 'es')}
                >
                  <option value="en">{t('languageEnglish')}</option>
                  <option value="es">{t('languageSpanish')}</option>
                </select>
              </div>

              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

              {/* Keyboard Shortcuts */}
              <button
                role="menuitem"
                className="menu-btn"
                style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', width: '100%', padding: '8px 12px', fontSize: 12.5 }}
                onClick={() => {
                  setMenuOpen(false);
                  onShowShortcuts();
                }}
              >
                Keyboard Shortcuts
              </button>

              {/* Export Diagnostics */}
              <button
                role="menuitem"
                className="menu-btn"
                style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', width: '100%', padding: '8px 12px', fontSize: 12.5 }}
                onClick={() => {
                  setMenuOpen(false);
                  onExportDiagnostics();
                }}
              >
                {t('exportLogs')}
              </button>

              {/* Reset Layout settings */}
              <button
                role="menuitem"
                className="menu-btn"
                style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', width: '100%', padding: '8px 12px', fontSize: 12.5 }}
                onClick={() => {
                  setMenuOpen(false);
                  onResetLayout();
                }}
              >
                {t('resetSettings')}
              </button>

              {/* Recent Projects */}
              {recentProjects && recentProjects.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="property-label" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Recent Projects</span>
                    {recentProjects.slice(0, 3).map((p, idx) => (
                      <button
                        key={idx}
                        role="menuitem"
                        className="menu-btn"
                        style={{
                          justifyContent: 'flex-start',
                          background: 'transparent',
                          border: 'none',
                          width: '100%',
                          padding: '4px 0',
                          fontSize: 11,
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block'
                        }}
                        onClick={() => {
                          setMenuOpen(false);
                          onLoadRecent(p);
                        }}
                        title={p}
                      >
                        {p.split('/').pop()?.split('\\').pop() || p}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
