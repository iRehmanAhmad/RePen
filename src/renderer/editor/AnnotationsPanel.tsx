/**
 * AnnotationsPanel — sidebar panel for the Annotations tab.
 * Controls: overlay region list (non-caption), per-region type/timing/style/position.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { AnnotationRegion } from '../../shared/editor/types';

interface AnnotationsPanelProps {
  project: EditorProjectData;
  selectedAnnotationId: string | null;
  onUpdate: (next: EditorProjectData) => void;
  onSelectAnnotation: (id: string | null) => void;
  onAddAnnotation: () => void;
  onRemoveAnnotation: (id: string) => void;
}

export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  project,
  selectedAnnotationId,
  onUpdate,
  onSelectAnnotation,
  onAddAnnotation,
  onRemoveAnnotation,
}) => {
  const editor = project.editor;
  const userAnnotations = editor.annotationRegions.filter((a: AnnotationRegion) => a.annotationSource !== 'auto-caption');
  const annIndex = selectedAnnotationId
    ? editor.annotationRegions.findIndex((a: AnnotationRegion) => a.id === selectedAnnotationId)
    : -1;
  const ann = annIndex >= 0 ? editor.annotationRegions[annIndex] : null;

  const patchAnn = (mutate: (a: AnnotationRegion) => void) => {
    if (annIndex < 0) return;
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    mutate(updated.editor.annotationRegions[annIndex] as AnnotationRegion);
    onUpdate(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button className="btn-primary" onClick={onAddAnnotation}>+ Add Text Overlay</button>

      {/* Region List */}
      <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6 }}>
        {userAnnotations.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No overlays yet. Add one above.</span>
        )}
        {userAnnotations.map((a: AnnotationRegion) => (
          <div
            key={a.id}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedAnnotationId === a.id ? 'var(--surface-3)' : 'transparent' }}
            onClick={() => onSelectAnnotation(a.id)}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{a.content}</span>
            <button
              className="menu-btn" style={{ color: 'var(--danger)' }}
              onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(a.id); }}
            >Delete</button>
          </div>
        ))}
      </div>

      {/* Selected Region Editor */}
      {ann && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--line)', padding: 8, borderRadius: 6 }}>
          <span className="property-label" style={{ color: 'var(--accent)' }}>Overlay Settings</span>

          {/* Overlay Type */}
          <div className="property-group">
            <span className="property-label">Overlay Type</span>
            <select
              className="property-control"
              value={ann.type || 'text'}
              onChange={(e) => patchAnn((a) => { a.type = e.target.value as any; })}
            >
              <option value="text">Text Label</option>
              <option value="highlight">Highlight Area</option>
              <option value="blur">Gaussian Blur</option>
              <option value="redaction">Redaction Mask</option>
              <option value="mosaic">Mosaic Pixelate</option>
              <option value="figure">Arrow / Shape</option>
              <option value="image">Image Overlay</option>
            </select>
          </div>

          {/* Timing */}
          <div style={{ display: 'flex', gap: 6 }}>
            <label style={{ fontSize: 11, flex: 1 }}>Start Ms:
              <input
                type="number" className="property-control"
                value={ann.startMs}
                onChange={(e) => patchAnn((a) => { a.startMs = parseInt(e.target.value) || 0; })}
              />
            </label>
            <label style={{ fontSize: 11, flex: 1 }}>End Ms:
              <input
                type="number" className="property-control"
                value={ann.endMs}
                onChange={(e) => patchAnn((a) => { a.endMs = parseInt(e.target.value) || 0; })}
              />
            </label>
          </div>

          {/* Text-specific controls */}
          {ann.type === 'text' && (
            <>
              <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>Text Content:
                <input
                  type="text" className="property-control"
                  value={ann.content}
                  onChange={(e) => patchAnn((a) => { a.content = e.target.value; })}
                />
              </label>

              <label style={{ fontSize: 12 }}>Font Size: {(ann as any).style?.fontSize}px
                <input
                  type="range" min={12} max={72}
                  value={(ann as any).style?.fontSize}
                  onChange={(e) => patchAnn((a) => { (a as any).style.fontSize = parseInt(e.target.value); })}
                />
              </label>

              <div className="property-group">
                <span className="property-label">Animation Preset</span>
                <select
                  className="property-control"
                  value={(ann as any).style?.textAnimation || 'none'}
                  onChange={(e) => patchAnn((a) => { (a as any).style.textAnimation = e.target.value; })}
                >
                  <option value="none">None (Instant)</option>
                  <option value="fade">Fade In</option>
                  <option value="typewriter">Typewriter</option>
                  <option value="pulse">Pulse loop</option>
                </select>
              </div>
            </>
          )}

          {/* Non-text position/size controls */}
          {ann.type !== 'text' && (
            <>
              <label style={{ fontSize: 12 }}>X Position: {ann.position?.x ?? 50}%
                <input
                  type="range" min={0} max={100}
                  value={ann.position?.x ?? 50}
                  onChange={(e) => patchAnn((a) => {
                    if (!a.position) a.position = { x: 50, y: 50 };
                    a.position.x = parseInt(e.target.value);
                  })}
                />
              </label>
              <label style={{ fontSize: 12 }}>Y Position: {ann.position?.y ?? 50}%
                <input
                  type="range" min={0} max={100}
                  value={ann.position?.y ?? 50}
                  onChange={(e) => patchAnn((a) => {
                    if (!a.position) a.position = { x: 50, y: 50 };
                    a.position.y = parseInt(e.target.value);
                  })}
                />
              </label>
              <label style={{ fontSize: 12 }}>Width: {ann.size?.width ?? 20}%
                <input
                  type="range" min={5} max={100}
                  value={ann.size?.width ?? 20}
                  onChange={(e) => patchAnn((a) => {
                    if (!a.size) a.size = { width: 20, height: 20 };
                    a.size.width = parseInt(e.target.value);
                  })}
                />
              </label>
              <label style={{ fontSize: 12 }}>Height: {ann.size?.height ?? 20}%
                <input
                  type="range" min={5} max={100}
                  value={ann.size?.height ?? 20}
                  onChange={(e) => patchAnn((a) => {
                    if (!a.size) a.size = { width: 20, height: 20 };
                    a.size.height = parseInt(e.target.value);
                  })}
                />
              </label>
            </>
          )}

          {/* Image source */}
          {ann.type === 'image' && (
            <label style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>Image Source URL / Path:
              <input
                type="text" className="property-control"
                value={ann.content || ''}
                placeholder="e.g. file:///path/to/image.png"
                onChange={(e) => patchAnn((a) => { a.content = e.target.value; })}
              />
            </label>
          )}

          {/* Z-Index */}
          <label style={{ fontSize: 12 }}>Layer Order (zIndex): {(ann as any).zIndex ?? 1}
            <input
              type="range" min={1} max={50}
              value={(ann as any).zIndex ?? 1}
              onChange={(e) => patchAnn((a) => { (a as any).zIndex = parseInt(e.target.value); })}
            />
          </label>
        </div>
      )}
    </div>
  );
};
