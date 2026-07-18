import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { AnnotationRegion } from '../../shared/editor/types';
import { PropertyCard } from './PropertyCard';

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

      {/* Overlay Region List */}
      <PropertyCard title="Overlay Tracks" description="Select a text or shape overlay track to edit">
        <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {userAnnotations.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>No overlays yet</span>
          )}
          {userAnnotations.map((a: AnnotationRegion) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                background: selectedAnnotationId === a.id ? 'var(--surface-3)' : 'transparent',
                border: '1px solid ' + (selectedAnnotationId === a.id ? 'var(--accent)' : 'var(--line)'),
              }}
              onClick={() => onSelectAnnotation(a.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120, fontSize: 11.5 }}>
                {a.content || `[${a.type || 'text'}]`}
              </span>
              <button
                className="menu-btn"
                style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: 10 }}
                onClick={(e) => { e.stopPropagation(); onRemoveAnnotation(a.id); }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </PropertyCard>

      {/* Selected Region Editor */}
      {ann && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Overlay Type */}
          <PropertyCard
            title="Overlay Type"
            description="Visual format of the overlay container"
            onReset={() => patchAnn((a) => { a.type = 'text'; })}
          >
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
          </PropertyCard>

          {/* Timing */}
          <PropertyCard title="Timeline Interval" description="Duration boundaries in milliseconds">
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ fontSize: 11, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                Start Ms:
                <input
                  type="number" className="property-control"
                  value={ann.startMs}
                  onChange={(e) => patchAnn((a) => { a.startMs = parseInt(e.target.value) || 0; })}
                />
              </label>
              <label style={{ fontSize: 11, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                End Ms:
                <input
                  type="number" className="property-control"
                  value={ann.endMs}
                  onChange={(e) => patchAnn((a) => { a.endMs = parseInt(e.target.value) || 0; })}
                />
              </label>
            </div>
          </PropertyCard>

          {/* Text-specific controls */}
          {ann.type === 'text' && (
            <>
              <PropertyCard title="Content Settings" description="Text message content">
                <input
                  type="text" className="property-control"
                  value={ann.content}
                  onChange={(e) => patchAnn((a) => { a.content = e.target.value; })}
                />
              </PropertyCard>

              {/* Font Size */}
              <PropertyCard
                title="Font Size"
                description="Font height scale in pixels"
                onReset={() => patchAnn((a) => { (a as any).style.fontSize = 16; })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={12} max={72} style={{ flex: 1 }}
                    value={(ann as any).style?.fontSize || 16}
                    onChange={(e) => patchAnn((a) => { (a as any).style.fontSize = parseInt(e.target.value); })}
                  />
                  <input
                    type="number"
                    className="property-control"
                    style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                    value={(ann as any).style?.fontSize || 16}
                    min={12} max={72}
                    aria-label="Font size value input"
                    onChange={(e) => {
                      const val = Math.max(12, Math.min(72, parseInt(e.target.value) || 12));
                      patchAnn((a) => { (a as any).style.fontSize = val; });
                    }}
                  />
                </div>
              </PropertyCard>

              {/* Animation Preset */}
              <PropertyCard
                title="Entrance Animation"
                description="Entrance preset motion effect"
                onReset={() => patchAnn((a) => { (a as any).style.textAnimation = 'none'; })}
              >
                <select
                  className="property-control"
                  value={(ann as any).style?.textAnimation || 'none'}
                  onChange={(e) => patchAnn((a) => { (a as any).style.textAnimation = e.target.value; })}
                >
                  <option value="none">None (Instant)</option>
                  <option value="fade">Fade In</option>
                  <option value="typewriter">Typewriter</option>
                  <option value="pulse">Pulse Loop</option>
                </select>
              </PropertyCard>
            </>
          )}

          {/* Non-text position/size controls */}
          {ann.type !== 'text' && (
            <>
              {/* X Position */}
              <PropertyCard
                title="Focus Position X"
                description="Horizontal layout placement offset"
                onReset={() => patchAnn((a) => { if (a.position) a.position.x = 50; })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={0} max={100} style={{ flex: 1 }}
                    value={ann.position?.x ?? 50}
                    onChange={(e) => patchAnn((a) => {
                      if (!a.position) a.position = { x: 50, y: 50 };
                      a.position.x = parseInt(e.target.value);
                    })}
                  />
                  <input
                    type="number"
                    className="property-control"
                    style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                    value={ann.position?.x ?? 50}
                    min={0} max={100}
                    aria-label="X position percentage input"
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                      patchAnn((a) => {
                        if (!a.position) a.position = { x: 50, y: 50 };
                        a.position.x = val;
                      });
                    }}
                  />
                </div>
              </PropertyCard>

              {/* Y Position */}
              <PropertyCard
                title="Focus Position Y"
                description="Vertical layout placement offset"
                onReset={() => patchAnn((a) => { if (a.position) a.position.y = 50; })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={0} max={100} style={{ flex: 1 }}
                    value={ann.position?.y ?? 50}
                    onChange={(e) => patchAnn((a) => {
                      if (!a.position) a.position = { x: 50, y: 50 };
                      a.position.y = parseInt(e.target.value);
                    })}
                  />
                  <input
                    type="number"
                    className="property-control"
                    style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                    value={ann.position?.y ?? 50}
                    min={0} max={100}
                    aria-label="Y position percentage input"
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                      patchAnn((a) => {
                        if (!a.position) a.position = { x: 50, y: 50 };
                        a.position.y = val;
                      });
                    }}
                  />
                </div>
              </PropertyCard>

              {/* Width */}
              <PropertyCard
                title="Width"
                description="Horizontal size percentage of preview canvas"
                onReset={() => patchAnn((a) => { if (a.size) a.size.width = 20; })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={5} max={100} style={{ flex: 1 }}
                    value={ann.size?.width ?? 20}
                    onChange={(e) => patchAnn((a) => {
                      if (!a.size) a.size = { width: 20, height: 20 };
                      a.size.width = parseInt(e.target.value);
                    })}
                  />
                  <input
                    type="number"
                    className="property-control"
                    style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                    value={ann.size?.width ?? 20}
                    min={5} max={100}
                    aria-label="Width percentage input"
                    onChange={(e) => {
                      const val = Math.max(5, Math.min(100, parseInt(e.target.value) || 5));
                      patchAnn((a) => {
                        if (!a.size) a.size = { width: 20, height: 20 };
                        a.size.width = val;
                      });
                    }}
                  />
                </div>
              </PropertyCard>

              {/* Height */}
              <PropertyCard
                title="Height"
                description="Vertical size percentage of preview canvas"
                onReset={() => patchAnn((a) => { if (a.size) a.size.height = 20; })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={5} max={100} style={{ flex: 1 }}
                    value={ann.size?.height ?? 20}
                    onChange={(e) => patchAnn((a) => {
                      if (!a.size) a.size = { width: 20, height: 20 };
                      a.size.height = parseInt(e.target.value);
                    })}
                  />
                  <input
                    type="number"
                    className="property-control"
                    style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                    value={ann.size?.height ?? 20}
                    min={5} max={100}
                    aria-label="Height percentage input"
                    onChange={(e) => {
                      const val = Math.max(5, Math.min(100, parseInt(e.target.value) || 5));
                      patchAnn((a) => {
                        if (!a.size) a.size = { width: 20, height: 20 };
                        a.size.height = val;
                      });
                    }}
                  />
                </div>
              </PropertyCard>
            </>
          )}

          {/* Image source */}
          {ann.type === 'image' && (
            <PropertyCard title="Image Source" description="Asset file path or URL">
              <input
                type="text" className="property-control"
                value={ann.content || ''}
                placeholder="e.g. file:///path/to/image.png"
                onChange={(e) => patchAnn((a) => { a.content = e.target.value; })}
              />
            </PropertyCard>
          )}

          {/* Z-Index */}
          <PropertyCard
            title="Layer Order"
            description="Rendering depth stack index (zIndex)"
            onReset={() => patchAnn((a) => { (a as any).zIndex = 1; })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={1} max={50} style={{ flex: 1 }}
                value={(ann as any).zIndex ?? 1}
                onChange={(e) => patchAnn((a) => { (a as any).zIndex = parseInt(e.target.value); })}
              />
              <input
                type="number"
                className="property-control"
                style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
                value={(ann as any).zIndex ?? 1}
                min={1} max={50}
                aria-label="Layer order zIndex input"
                onChange={(e) => {
                  const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                  patchAnn((a) => { (a as any).zIndex = val; });
                }}
              />
            </div>
          </PropertyCard>
        </div>
      )}
    </div>
  );
};
