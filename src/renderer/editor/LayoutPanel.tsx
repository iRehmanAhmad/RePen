/**
 * LayoutPanel — sidebar panel for Layout tab.
 * Controls: aspect ratio, padding, border radius, shadow, wallpaper, output resolution.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';

interface LayoutPanelProps {
  project: EditorProjectData;
  t: (key: string) => string;
  onUpdate: (next: EditorProjectData) => void;
  onResetDefaults: () => void;
  onExportDiagnostics: () => void;
  locale: string;
  onLocaleChange: (locale: string) => void;
}

export const LayoutPanel: React.FC<LayoutPanelProps> = ({
  project, t, onUpdate, onResetDefaults, onExportDiagnostics, locale, onLocaleChange,
}) => {
  const editor = project.editor;

  const patch = (mutate: (e: typeof editor) => void) => {
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    mutate(updated.editor);
    onUpdate(updated);
  };

  const PRESET_WALLPAPERS = [
    '#0b0c0e',
    'linear-gradient(135deg, #1f2937, #111827)',
    'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    'linear-gradient(135deg, #10b981, #059669)',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Aspect Ratio */}
      <div className="property-group">
        <span className="property-label">{t('aspectRatio')}</span>
        <select
          className="property-control"
          value={editor.aspectRatio || '16:9'}
          onChange={(e) => patch((ed) => { (ed as any).aspectRatio = e.target.value; })}
        >
          <option value="source">Original Source Ratio</option>
          <option value="16:9">Widescreen 16:9</option>
          <option value="4:3">Standard 4:3</option>
          <option value="1:1">Square 1:1</option>
          <option value="9:16">Vertical 9:16</option>
          <option value="21:9">Ultrawide 21:9</option>
        </select>
      </div>

      {/* Padding */}
      <div className="property-group">
        <span className="property-label">{t('padding')}: {editor.padding || 0}px</span>
        <input
          type="range" min={0} max={100}
          value={editor.padding || 0}
          onChange={(e) => patch((ed) => { (ed as any).padding = parseInt(e.target.value); })}
        />
      </div>

      {/* Border Radius */}
      <div className="property-group">
        <span className="property-label">{t('borderRadius')}: {editor.borderRadius || 0}px</span>
        <input
          type="range" min={0} max={30}
          value={editor.borderRadius || 0}
          onChange={(e) => patch((ed) => { (ed as any).borderRadius = parseInt(e.target.value); })}
        />
      </div>

      {/* Shadow Intensity */}
      <div className="property-group">
        <span className="property-label">Shadow Intensity: {Math.round(((editor as any).shadowIntensity ?? 0.3) * 100)}%</span>
        <input
          type="range" min={0} max={1} step={0.05}
          value={(editor as any).shadowIntensity ?? 0.3}
          onChange={(e) => patch((ed) => { (ed as any).shadowIntensity = parseFloat(e.target.value); })}
        />
      </div>

      {/* Wallpaper */}
      <div className="property-group">
        <span className="property-label">{t('wallpaper')}</span>
        <select
          className="property-control"
          value={PRESET_WALLPAPERS.includes((editor as any).wallpaper) ? (editor as any).wallpaper : 'custom'}
          onChange={(e) => {
            if (e.target.value !== 'custom') {
              patch((ed) => { (ed as any).wallpaper = e.target.value; });
            }
          }}
        >
          <option value="#0b0c0e">Midnight Dark</option>
          <option value="linear-gradient(135deg, #1f2937, #111827)">Gradient Gray</option>
          <option value="linear-gradient(135deg, #3b82f6, #8b5cf6)">Neon Violet</option>
          <option value="linear-gradient(135deg, #10b981, #059669)">Emerald Forest</option>
          <option value="custom">Custom Background CSS...</option>
        </select>
        <input
          type="text"
          className="property-control"
          style={{ marginTop: 6 }}
          placeholder="e.g. #000000, linear-gradient(...), url(...)"
          value={(editor as any).wallpaper || ''}
          onChange={(e) => patch((ed) => { (ed as any).wallpaper = e.target.value; })}
          aria-label="Custom background CSS value"
        />
      </div>

      {/* Output Resolution */}
      <div className="property-group">
        <span className="property-label">Target Export Resolution</span>
        <select
          className="property-control"
          value={(editor as any).outputResolution || '1080p'}
          onChange={(e) => patch((ed) => { (ed as any).outputResolution = e.target.value; })}
        >
          <option value="720p">720p HD</option>
          <option value="1080p">1080p Full HD</option>
          <option value="1440p">1440p 2K</option>
          <option value="2160p">2160p 4K UHD</option>
          <option value="source">Source Resolution</option>
        </select>
      </div>

      {/* Locale */}
      <div className="property-group" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <span className="property-label">{t('selectLanguage')}</span>
        <select
          className="property-control"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
        >
          <option value="en">{t('languageEnglish')}</option>
          <option value="es">{t('languageSpanish')}</option>
        </select>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <button className="menu-btn" onClick={onResetDefaults} style={{ width: '100%' }}>
          {t('resetSettings')}
        </button>
        <button className="menu-btn" onClick={onExportDiagnostics} style={{ width: '100%' }}>
          {t('exportLogs')}
        </button>
      </div>
    </div>
  );
};
