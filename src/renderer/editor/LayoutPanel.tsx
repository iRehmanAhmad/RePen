import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';

interface LayoutPanelProps {
  project: EditorProjectData;
  t: (key: string) => string;
  onUpdate: (next: EditorProjectData) => void;
}

export const LayoutPanel: React.FC<LayoutPanelProps> = ({
  project, t, onUpdate,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Canvas Aspect Ratio */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="property-label">{t('padding')}</span>
          <input
            type="number"
            className="property-control"
            style={{ width: 64, padding: '4px 6px', fontSize: 11, textAlign: 'right', height: 22 }}
            value={editor.padding || 0}
            min={0} max={100}
            aria-label="Padding value input"
            onChange={(e) => {
              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
              patch((ed) => { (ed as any).padding = val; });
            }}
          />
        </div>
        <input
          type="range" min={0} max={100}
          value={editor.padding || 0}
          onChange={(e) => patch((ed) => { (ed as any).padding = parseInt(e.target.value); })}
        />
      </div>

      {/* Border Radius */}
      <div className="property-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="property-label">{t('borderRadius')}</span>
          <input
            type="number"
            className="property-control"
            style={{ width: 64, padding: '4px 6px', fontSize: 11, textAlign: 'right', height: 22 }}
            value={editor.borderRadius || 0}
            min={0} max={30}
            aria-label="Border radius value input"
            onChange={(e) => {
              const val = Math.max(0, Math.min(30, parseInt(e.target.value) || 0));
              patch((ed) => { (ed as any).borderRadius = val; });
            }}
          />
        </div>
        <input
          type="range" min={0} max={30}
          value={editor.borderRadius || 0}
          onChange={(e) => patch((ed) => { (ed as any).borderRadius = parseInt(e.target.value); })}
        />
      </div>

      {/* Shadow Intensity */}
      <div className="property-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="property-label">Shadow Intensity</span>
          <input
            type="number"
            className="property-control"
            style={{ width: 64, padding: '4px 6px', fontSize: 11, textAlign: 'right', height: 22 }}
            value={Math.round(((editor as any).shadowIntensity ?? 0.3) * 100)}
            min={0} max={100}
            aria-label="Shadow intensity percentage input"
            onChange={(e) => {
              const pct = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
              patch((ed) => { (ed as any).shadowIntensity = pct / 100; });
            }}
          />
        </div>
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
    </div>
  );
};
