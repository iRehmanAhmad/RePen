/**
 * MotionPanel — sidebar panel for Motion tab.
 * Controls: zoom regions list, auto-zoom scanner, per-region depth/focus/easing/rotation.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { ZoomRegion } from '../../shared/editor/types';

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

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
        <input
          type="checkbox"
          checked={reducedMotion}
          onChange={(e) => onReducedMotionChange(e.target.checked)}
        />
        Reduced Motion (Disable Transitions)
      </label>

      <button className="btn-secondary" onClick={onScanSuggestions}>🔍 Scan Auto-Zoom Suggestions</button>

      {showSuggestionsPanel && (
        <div style={{ border: '1px solid var(--line)', padding: 8, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="property-label" style={{ color: 'var(--accent)' }}>Proposed Zoom Actions</span>
            <button className="menu-btn" onClick={() => onShowSuggestionsChange(false)}>Close</button>
          </div>
          {autoZoomSuggestions.length === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No new zoom suggestions found.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {autoZoomSuggestions.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: 4, borderRadius: 4 }}>
                  <span style={{ fontSize: 11 }}>Click at {Math.round(s.startMs / 1000)}s ({Math.round(s.focus.cx * 100)}%, {Math.round(s.focus.cy * 100)}%)</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="menu-btn" style={{ color: 'var(--accent)', padding: '2px 4px' }} onClick={() => onAcceptSuggestion(s)}>Accept</button>
                    <button className="menu-btn" style={{ padding: '2px 4px' }} onClick={() => onDismissSuggestion(s.id)}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zoom Region List */}
      <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6 }}>
        {editor.zoomRegions.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No zoom regions yet. Add one above.</span>
        )}
        {editor.zoomRegions.map((region: ZoomRegion) => (
          <div
            key={region.id}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedZoomId === region.id ? 'var(--surface-3)' : 'transparent' }}
            onClick={() => onSelectZoom(region.id)}
          >
            <span>{Math.round(region.startMs / 1000)}s – {Math.round(region.endMs / 1000)}s</span>
            <button className="menu-btn" style={{ color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); onRemoveZoom(region.id); }}>Delete</button>
          </div>
        ))}
      </div>

      {/* Selected Region Editor */}
      {selectedRegion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--line)', padding: 8, borderRadius: 6 }}>
          <span className="property-label" style={{ color: 'var(--accent)' }}>Region Options</span>

          <label style={{ fontSize: 12 }}>Depth: {(selectedRegion as any).depth}x
            <input
              type="range" min={1.0} max={4.0} step={0.1}
              value={(selectedRegion as any).depth}
              onChange={(e) => patchRegion((r) => { (r as any).depth = parseFloat(e.target.value); })}
            />
          </label>

          <label style={{ fontSize: 12 }}>Focus X: {selectedRegion.focus?.cx ?? 0.5}
            <input
              type="range" min={0.0} max={1.0} step={0.05}
              value={selectedRegion.focus?.cx ?? 0.5}
              onChange={(e) => patchRegion((r) => { r.focus.cx = parseFloat(e.target.value); })}
            />
          </label>

          <label style={{ fontSize: 12 }}>Focus Y: {selectedRegion.focus?.cy ?? 0.5}
            <input
              type="range" min={0.0} max={1.0} step={0.05}
              value={selectedRegion.focus?.cy ?? 0.5}
              onChange={(e) => patchRegion((r) => { r.focus.cy = parseFloat(e.target.value); })}
            />
          </label>

          <div className="property-group">
            <span className="property-label">Focus Mode</span>
            <select
              className="property-control"
              value={selectedRegion.focusMode || 'manual'}
              onChange={(e) => patchRegion((r) => { r.focusMode = e.target.value as any; })}
            >
              <option value="manual">Manual Coords Focus</option>
              <option value="cursor-follow">Cursor Follow focus</option>
            </select>
          </div>

          <div className="property-group">
            <span className="property-label">Easing/Transition Motion</span>
            <select
              className="property-control"
              value={selectedRegion.easingPreset || 'ease-in-out'}
              onChange={(e) => patchRegion((r) => { r.easingPreset = e.target.value as any; })}
            >
              <option value="ease-in-out">Ease In Out (Smooth)</option>
              <option value="linear">Linear</option>
              <option value="spring">Spring Bounce</option>
            </select>
          </div>

          <div className="property-group">
            <span className="property-label">3D Rotation</span>
            <select
              className="property-control"
              value={selectedRegion.rotationPreset || ''}
              onChange={(e) => patchRegion((r) => { r.rotationPreset = (e.target.value as any) || undefined; })}
            >
              <option value="">None (Flat)</option>
              <option value="iso">Isometric skew</option>
              <option value="left">Left Angle</option>
              <option value="right">Right Angle</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
