import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { WebcamMaskShape } from '../../shared/editor/types';
import { PropertyCard } from './PropertyCard';

interface WebcamPanelProps {
  project: EditorProjectData;
  onUpdate: (next: EditorProjectData) => void;
}

export const WebcamPanel: React.FC<WebcamPanelProps> = ({ project, onUpdate }) => {
  const editor = project.editor;

  const patch = (mutate: (e: typeof editor) => void) => {
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    mutate(updated.editor);
    onUpdate(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Layout Preset */}
      <PropertyCard
        title="Webcam Layout Preset"
        description="Positioning of the speaker webcam frame"
        onReset={() => patch((ed) => { ed.webcamLayoutPreset = 'picture-in-picture'; })}
      >
        <select
          className="property-control"
          value={editor.webcamLayoutPreset || 'picture-in-picture'}
          onChange={(e) => patch((ed) => { ed.webcamLayoutPreset = e.target.value as any; })}
        >
          <option value="picture-in-picture">Picture in Picture</option>
          <option value="vertical-stack">Vertical Stacked Split</option>
          <option value="dual-frame">Horizontal Dual Frame</option>
          <option value="no-webcam">No Webcam (Hidden)</option>
        </select>
      </PropertyCard>

      {/* Mask Shape */}
      <PropertyCard
        title="Webcam Mask Shape"
        description="Clipping shape of the picture-in-picture track"
        onReset={() => patch((ed) => { ed.webcamMaskShape = 'rectangle'; })}
      >
        <select
          className="property-control"
          value={editor.webcamMaskShape || 'rectangle'}
          onChange={(e) => patch((ed) => { ed.webcamMaskShape = e.target.value as WebcamMaskShape; })}
        >
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="rounded">Rounded Corners</option>
          <option value="square">Square</option>
        </select>
      </PropertyCard>

      {/* Size */}
      <PropertyCard
        title="Webcam Size Preset"
        description="Width scale percentage of picture-in-picture frame"
        onReset={() => patch((ed) => { ed.webcamSizePreset = 25 as any; })}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range" min={10} max={50} style={{ flex: 1 }}
            value={editor.webcamSizePreset || 25}
            onChange={(e) => patch((ed) => { ed.webcamSizePreset = parseInt(e.target.value) as any; })}
          />
          <input
            type="number"
            className="property-control"
            style={{ width: 50, padding: '2px 4px', fontSize: 11, textAlign: 'right', height: 20 }}
            value={editor.webcamSizePreset || 25}
            min={10} max={50}
            aria-label="Webcam size preset percentage input"
            onChange={(e) => {
              const val = Math.max(10, Math.min(50, parseInt(e.target.value) || 10));
              patch((ed) => { ed.webcamSizePreset = val as any; });
            }}
          />
        </div>
      </PropertyCard>

      {/* Mirror & Zoom Options */}
      <PropertyCard title="Interactive Modes" description="Refine overlay behaviors">
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={editor.webcamMirrored || false}
            onChange={(e) => patch((ed) => { ed.webcamMirrored = e.target.checked; })}
          />
          Mirror Webcam Output
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
          <input
            type="checkbox"
            checked={(editor as any).webcamReactiveZoom !== false}
            onChange={(e) => patch((ed) => { (ed as any).webcamReactiveZoom = e.target.checked; })}
          />
          Reactive Zoom (Follow screen zoom areas)
        </label>
      </PropertyCard>
    </div>
  );
};
