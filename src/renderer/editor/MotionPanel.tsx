import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { ZoomRegion, ZoomDepth } from '../../shared/editor/types';
import { PropertyCard } from './PropertyCard';

interface MotionPanelProps {
  project: EditorProjectData;
  currentTimeMs: number;
  durationMs: number;
  selectedZoomId: string | null;
  reducedMotion: boolean;
  autoZoomSuggestions: any[];
  showSuggestionsPanel: boolean;
  onUpdate: (next: EditorProjectData) => void;
  onSelectZoom: (id: string | null) => void;
  onAddZoom: () => void;
  onRemoveZoom: (id: string) => void;
  onReducedMotionChange: (v: boolean) => void;
  onScanSuggestions: () => void;
  onAcceptSuggestion: (s: any) => void;
  onDismissSuggestion: (id: string) => void;
  onShowSuggestionsChange: (v: boolean) => void;
}

export const MotionPanel: React.FC<MotionPanelProps> = ({
  project, selectedZoomId, reducedMotion, autoZoomSuggestions, showSuggestionsPanel,
  onUpdate, onSelectZoom, onAddZoom, onRemoveZoom, onReducedMotionChange,
  onScanSuggestions, onAcceptSuggestion, onDismissSuggestion, onShowSuggestionsChange,
}) => {
  const editor = project.editor;
  const regionIndex = selectedZoomId
    ? editor.zoomRegions.findIndex((r: ZoomRegion) => r.id === selectedZoomId)
    : -1;
  const selectedRegion = regionIndex >= 0 ? editor.zoomRegions[regionIndex] : null;

  const patchRegion = (mutate: (r: ZoomRegion) => void) => {
    if (regionIndex < 0) return;
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    mutate(updated.editor.zoomRegions[regionIndex] as ZoomRegion);
    onUpdate(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button className="btn-primary" onClick={onAddZoom}>+ Add Zoom Region</button>

      {/* Motion Policy Card */}
      <PropertyCard title="Motion Settings" description="Configure screen zoom transitions">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => onReducedMotionChange(e.target.checked)}
          />
          Reduced Motion (Instant Cuts)
        </label>
        <button
          className="btn-secondary"
          style={{ width: '100%', marginTop: 4 }}
          onClick={onScanSuggestions}
        >
          🔍 Scan Auto-Zoom Suggestions
        </button>
      </PropertyCard>

      {showSuggestionsPanel && (
        <PropertyCard title="Proposed Zoom Actions" description="Suggestions based on mouse activity">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -28 }}>
            <button className="menu-btn" style={{ padding: '2px 6px', fontSize: 10 }} onClick={() => onShowSuggestionsChange(false)}>Close</button>
          </div>
          {autoZoomSuggestions.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No suggestions found.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {autoZoomSuggestions.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-3)', padding: 6, borderRadius: 4 }}>
                  <span style={{ fontSize: 10.5 }}>Click at {Math.round(s.startMs / 1000)}s ({Math.round(s.focus.cx * 100)}%, {Math.round(s.focus.cy * 100)}%)</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="menu-btn" style={{ color: 'var(--accent)', padding: '2px 4px', fontSize: 10 }} onClick={() => onAcceptSuggestion(s)}>Accept</button>
                    <button className="menu-btn" style={{ padding: '2px 4px', fontSize: 10 }} onClick={() => onDismissSuggestion(s.id)}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PropertyCard>
      )}

      {/* Zoom Region List */}
      <PropertyCard title="Zoom Region Tracks" description="Select a track segment below to edit properties">
        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {editor.zoomRegions.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>No active zoom tracks</span>
          )}
          {editor.zoomRegions.map((region: ZoomRegion) => (
            <div
              key={region.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                background: selectedZoomId === region.id ? 'var(--surface-3)' : 'transparent',
                border: '1px solid ' + (selectedZoomId === region.id ? 'var(--accent)' : 'var(--line)'),
              }}
              onClick={() => onSelectZoom(region.id)}
            >
              <span style={{ fontSize: 11.5 }}>{Math.round(region.startMs / 1000)}s – {Math.round(region.endMs / 1000)}s</span>
              <button
                className="menu-btn"
                style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); onRemoveZoom(region.id); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </PropertyCard>

      {/* Selected Region Editor */}
      {selectedRegion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Focus Mode */}
          <PropertyCard
            title="Focus Mode"
            description="Automatic cursor centering or coordinates focus"
            onReset={() => patchRegion((r) => { r.focusMode = 'manual'; })}
          >
            <select
              className="property-control"
              value={selectedRegion.focusMode || 'manual'}
              onChange={(e) => patchRegion((r) => { r.focusMode = e.target.value as any; })}
            >
              <option value="manual">Manual Coords Focus</option>
              <option value="cursor-follow">Cursor Follow Focus</option>
            </select>
          </PropertyCard>

          {/* Depth */}
          <PropertyCard
            title="Depth Level"
            description="Zoom scaling preset factor (Level 1 to 6)"
            onReset={() => patchRegion((r) => { r.depth = 3; })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={1} max={6} step={1} style={{ flex: 1 }}
                value={selectedRegion.depth}
                onChange={(e) => patchRegion((r) => { r.depth = parseInt(e.target.value, 10) as ZoomDepth; })}
              />
              <input
                type="number"
                className="property-control"
                style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                value={selectedRegion.depth}
                min={1} max={6} step={1}
                aria-label="Depth value input"
                onChange={(e) => {
                  const val = Math.max(1, Math.min(6, parseInt(e.target.value, 10) || 1));
                  patchRegion((r) => { r.depth = val as ZoomDepth; });
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: -4 }}>
              Scale: {selectedRegion.depth === 1 ? '1.25x' : selectedRegion.depth === 2 ? '1.5x' : selectedRegion.depth === 3 ? '1.8x' : selectedRegion.depth === 4 ? '2.2x' : selectedRegion.depth === 5 ? '3.5x' : '5.0x'}
            </div>
          </PropertyCard>

          {/* Focus X */}
          <PropertyCard
            title="Focus X"
            description="Horizontal center offset percent"
            onReset={() => patchRegion((r) => { r.focus.cx = 0.5; })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={0.0} max={1.0} step={0.05} style={{ flex: 1 }}
                value={selectedRegion.focus?.cx ?? 0.5}
                onChange={(e) => patchRegion((r) => { r.focus.cx = parseFloat(e.target.value); })}
              />
              <input
                type="number"
                className="property-control"
                style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                value={selectedRegion.focus?.cx ?? 0.5}
                min={0.0} max={1.0} step={0.05}
                aria-label="Focus X value input"
                onChange={(e) => {
                  const val = Math.max(0.0, Math.min(1.0, parseFloat(e.target.value) || 0.0));
                  patchRegion((r) => { r.focus.cx = val; });
                }}
              />
            </div>
          </PropertyCard>

          {/* Focus Y */}
          <PropertyCard
            title="Focus Y"
            description="Vertical center offset percent"
            onReset={() => patchRegion((r) => { r.focus.cy = 0.5; })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={0.0} max={1.0} step={0.05} style={{ flex: 1 }}
                value={selectedRegion.focus?.cy ?? 0.5}
                onChange={(e) => patchRegion((r) => { r.focus.cy = parseFloat(e.target.value); })}
              />
              <input
                type="number"
                className="property-control"
                style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                value={selectedRegion.focus?.cy ?? 0.5}
                min={0.0} max={1.0} step={0.05}
                aria-label="Focus Y value input"
                onChange={(e) => {
                  const val = Math.max(0.0, Math.min(1.0, parseFloat(e.target.value) || 0.0));
                  patchRegion((r) => { r.focus.cy = val; });
                }}
              />
            </div>
          </PropertyCard>

          {/* Transition Motion */}
          <PropertyCard
            title="Transition Easing"
            description="Zoom interpolation curve function"
            onReset={() => patchRegion((r) => { r.easingPreset = 'ease-in-out'; })}
          >
            <select
              className="property-control"
              value={selectedRegion.easingPreset || 'ease-in-out'}
              onChange={(e) => patchRegion((r) => { r.easingPreset = e.target.value as any; })}
            >
              <option value="ease-in-out">Ease In Out (Smooth)</option>
              <option value="linear">Linear</option>
              <option value="spring">Spring Bounce</option>
            </select>
          </PropertyCard>

          {/* 3D Rotation */}
          <PropertyCard
            title="3D Rotation Angle"
            description="Isometric angle projection of screen content"
            onReset={() => patchRegion((r) => { r.rotationPreset = undefined; })}
          >
            <select
              className="property-control"
              value={selectedRegion.rotationPreset || ''}
              onChange={(e) => patchRegion((r) => { r.rotationPreset = (e.target.value as any) || undefined; })}
            >
              <option value="">None (Flat)</option>
              <option value="iso">Isometric Skew</option>
              <option value="left">Left Angle</option>
              <option value="right">Right Angle</option>
            </select>
          </PropertyCard>
        </div>
      )}
    </div>
  );
};
