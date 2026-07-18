import React, { useState } from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import { PropertyCard } from './PropertyCard';

interface LayoutPanelProps {
  project: EditorProjectData;
  t: (key: string) => string;
  onUpdate: (next: EditorProjectData) => void;
}

interface CompactRangeRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  isPercentage?: boolean;
  onChange: (value: number) => void;
}

const CompactRangeRow: React.FC<CompactRangeRowProps> = ({ label, value, min, max, step = 1, suffix = '', isPercentage = false, onChange }) => (
  <div className="property-group">
    <label className="property-label">{label}</label>
    <div className="compact-range-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        aria-label={`${label} slider`}
      />
      <input
        type="number"
        className="property-control"
        value={isPercentage ? Math.round(value * 100) : value}
        min={isPercentage ? min * 100 : min}
        max={isPercentage ? max * 100 : max}
        step={isPercentage ? step * 100 : step}
        aria-label={`${label} value`}
        onChange={(event) => {
          const raw = parseFloat(event.target.value);
          const normalized = isPercentage ? raw / 100 : raw;
          onChange(Math.max(min, Math.min(max, Number.isFinite(normalized) ? normalized : min)));
        }}
      />
    </div>
    <span className="compact-value-hint">{isPercentage ? Math.round(value * 100) : value}{suffix}</span>
  </div>
);

export const LayoutPanel: React.FC<LayoutPanelProps> = ({ project, t, onUpdate }) => {
  const editor = project.editor;
  const [openSection, setOpenSection] = useState<'canvas' | 'frame' | 'background' | null>('canvas');
  const wallpapers = [
    { value: '#0b0c0e', label: 'Midnight' },
    { value: 'linear-gradient(135deg, #1f2937, #111827)', label: 'Slate' },
    { value: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', label: 'Violet' },
    { value: 'linear-gradient(135deg, #10b981, #059669)', label: 'Emerald' },
  ];
  const currentWallpaper = (editor as any).wallpaper || '#0b0c0e';
  const isPresetWallpaper = wallpapers.some((wallpaper) => wallpaper.value === currentWallpaper);

  const patch = (mutate: (nextEditor: typeof editor) => void) => {
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    mutate(updated.editor);
    onUpdate(updated);
  };

  return (
    <div className="layout-panel">
      <PropertyCard
        title="Canvas"
        description="Output frame and export resolution"
        collapsible
        isOpen={openSection === 'canvas'}
        onToggle={() => setOpenSection((current) => current === 'canvas' ? null : 'canvas')}
      >
        <div className="layout-field-grid">
          <div className="property-group">
            <label className="property-label" htmlFor="layout-aspect">{t('aspectRatio')}</label>
            <select
              id="layout-aspect"
              className="property-control"
              value={editor.aspectRatio || '16:9'}
              onChange={(event) => patch((next) => { next.aspectRatio = event.target.value as any; })}
            >
              <option value="source">Source ratio</option>
              <option value="16:9">16:9 Widescreen</option>
              <option value="4:3">4:3 Standard</option>
              <option value="1:1">1:1 Square</option>
              <option value="9:16">9:16 Vertical</option>
              <option value="21:9">21:9 Ultrawide</option>
            </select>
          </div>
          <div className="property-group">
            <label className="property-label" htmlFor="layout-resolution">Resolution</label>
            <select
              id="layout-resolution"
              className="property-control"
              value={(editor as any).outputResolution || '1080p'}
              onChange={(event) => patch((next) => { (next as any).outputResolution = event.target.value; })}
            >
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
              <option value="1440p">1440p 2K</option>
              <option value="2160p">2160p 4K UHD</option>
              <option value="source">Source size</option>
            </select>
          </div>
        </div>
      </PropertyCard>

      <PropertyCard
        title="Frame"
        description="Spacing, rounding, and depth"
        collapsible
        isOpen={openSection === 'frame'}
        onToggle={() => setOpenSection((current) => current === 'frame' ? null : 'frame')}
      >
        <CompactRangeRow
          label={t('padding')}
          value={editor.padding || 0}
          min={0}
          max={100}
          suffix=" px"
          onChange={(value) => patch((next) => { next.padding = Math.round(value); })}
        />
        <CompactRangeRow
          label={t('borderRadius')}
          value={editor.borderRadius || 0}
          min={0}
          max={30}
          suffix=" px"
          onChange={(value) => patch((next) => { next.borderRadius = Math.round(value); })}
        />
        <CompactRangeRow
          label="Shadow"
          value={(editor as any).shadowIntensity ?? 0.3}
          min={0}
          max={1}
          step={0.05}
          suffix="%"
          isPercentage
          onChange={(value) => patch((next) => { (next as any).shadowIntensity = value; })}
        />
      </PropertyCard>

      <PropertyCard
        title={t('wallpaper')}
        description="Backdrop behind the recording"
        collapsible
        isOpen={openSection === 'background'}
        onToggle={() => setOpenSection((current) => current === 'background' ? null : 'background')}
      >
        <div className="layout-field-grid">
          <div className="property-group">
            <label className="property-label" htmlFor="layout-wallpaper">Preset</label>
            <select
              id="layout-wallpaper"
              className="property-control"
              value={isPresetWallpaper ? currentWallpaper : 'custom'}
              onChange={(event) => {
                if (event.target.value !== 'custom') {
                  patch((next) => { (next as any).wallpaper = event.target.value; });
                }
              }}
            >
              {wallpapers.map((wallpaper) => <option key={wallpaper.value} value={wallpaper.value}>{wallpaper.label}</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="property-group">
            <label className="property-label" htmlFor="layout-custom-wallpaper">Custom CSS</label>
            <input
              id="layout-custom-wallpaper"
              type="text"
              className="property-control"
              value={currentWallpaper}
              onChange={(event) => patch((next) => { (next as any).wallpaper = event.target.value; })}
              aria-label="Custom background CSS value"
            />
          </div>
        </div>
      </PropertyCard>
    </div>
  );
};
