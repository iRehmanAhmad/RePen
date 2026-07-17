/**
 * TrackControls — visibility and lock toggle buttons for a single timeline track.
 * Extracted from editor.tsx (was defined inline as a local component).
 */

import React from 'react';
import type { TimelineTrackId } from '../../shared/editor/projectPersistence';

interface TrackControlsProps {
  trackId: TimelineTrackId;
  state: { visible: boolean; locked: boolean };
  onToggle: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({ trackId, state, onToggle }) => (
  <span className="track-controls" onClick={(event) => event.stopPropagation()}>
    <button
      className="track-control"
      onClick={() => onToggle(trackId, 'visible')}
      aria-label={`${state.visible ? 'Hide' : 'Show'} ${trackId} track`}
    >
      {state.visible ? '◉' : '○'}
    </button>
    <button
      className="track-control"
      onClick={() => onToggle(trackId, 'locked')}
      aria-label={`${state.locked ? 'Unlock' : 'Lock'} ${trackId} track`}
    >
      {state.locked ? '🔒' : '🔓'}
    </button>
  </span>
);
