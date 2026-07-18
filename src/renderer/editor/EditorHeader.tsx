import React, { useState, useEffect, useRef } from 'react';
import type { AppCapabilities } from '../../shared/contracts/ipc';

interface EditorHeaderProps {
  projectPath: string | null;
  saveStatus: string;
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
    <header className="editor-header" role="banner">
      {/* Title & Path */}
      <div className="editor-title" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <span style={{ fontSize: 18, userSelect: 'none' }} role="img" aria-label="Editor icon">{"\uD83C\uDFAC"}</span>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{t('title')}</span>
            {hasUnsavedChanges && (
              <span className="dirty-indicator" title="Unsaved Changes" role="status" aria-label="Unsaved progress" />
            )}
          </div>
          <span 
            style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}
            title={projectPath || ''}
          >
            {fileName}
          </span>
        </div>
        {saveStatus === 'saving' && (
          <span className="save-status" role="status">{"Saving\u2026"}</span>
        )}
      </div>

      {/* Control Actions */}
      <div className="menu-bar">
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

              <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

              {/* Close Editor button */}
              <button
                role="menuitem"
                className="menu-btn"
                style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', width: '100%', padding: '8px 12px', color: 'var(--danger)', fontSize: 12.5 }}
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                }}
              >
                {t('close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
