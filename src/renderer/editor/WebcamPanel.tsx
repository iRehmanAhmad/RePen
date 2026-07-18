import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { WebcamMaskShape } from '../../shared/editor/types';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Layout Preset */}
      <div className="property-group">
        <span className="property-label">Webcam Layout Preset</span>
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
      </div>

      {/* Mask Shape */}
      <div className="property-group">
        <span className="property-label">Webcam Mask Shape</span>
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
      </div>

      {/* Size */}
      <div className="property-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="property-label">Size</span>
          <input
            type="number"
            className="property-control"
            style={{ width: 64, padding: '4px 6px', fontSize: 11, textAlign: 'right', height: 22 }}
            value={editor.webcamSizePreset || 25}
            min={10} max={50}
            aria-label="Webcam size preset percentage input"
            onChange={(e) => {
              const val = Math.max(10, Math.min(50, parseInt(e.target.value) || 10));
              patch((ed) => { ed.webcamSizePreset = val as any; });
            }}
          />
        </div>
        <input
          type="range" min={10} max={50}
          value={editor.webcamSizePreset || 25}
          onChange={(e) => patch((ed) => { ed.webcamSizePreset = parseInt(e.target.value) as any; })}
        />
      </div>

      {/* Mirror */}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={editor.webcamMirrored || false}
          onChange={(e) => patch((ed) => { ed.webcamMirrored = e.target.checked; })}
        />
        Mirror Webcam Output
      </label>

      {/* Reactive Zoom */}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={(editor as any).webcamReactiveZoom !== false}
          onChange={(e) => patch((ed) => { (ed as any).webcamReactiveZoom = e.target.checked; })}
        />
        Reactive Zoom (follow screen zoom regions)
      </label>
    </div>
  );
};
