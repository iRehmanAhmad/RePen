/**
 * TimelinePanel — the full bottom timeline footer.
 *
 * Contains:
 *  - Timeline toolbar (play controls, volume, trim, speed, zoom)
 *  - Timeline ruler (time ticks)
 *  - Timeline tracks (screen, effects, captions, webcam, presentation, audio)
 *
 * Formerly inline JSX in EditorApp. This component owns no state — all data
 * and callbacks come from props.
 */

import React from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { TimelineTrackId } from '../../shared/editor/projectPersistence';
import type { TrimRegion, SpeedRegion, ZoomRegion } from '../../shared/editor/types';
import { TrackControls } from './TrackControls';

// -- helpers (re-declared here to keep this file self-contained) ----------
function timelinePercent(ms: number, durationMs: number): number {
  return durationMs > 0 ? (ms / durationMs) * 100 : 0;
}

function timeAtTimelinePosition(offsetX: number, width: number, durationMs: number): number {
  return Math.round(Math.max(0, Math.min(1, offsetX / width)) * durationMs);
}

function formatTimelineTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const ms2 = ms % 1000;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(Math.floor(ms2 / 100))}`;
}
// -------------------------------------------------------------------------

const SPEED_OPTIONS = [
  { speed: 0.25, label: '0.25× (Very Slow)' },
  { speed: 0.5, label: '0.5× (Slow Motion)' },
  { speed: 1, label: '1× (Normal Speed)' },
  { speed: 1.5, label: '1.5× (Fast)' },
  { speed: 2, label: '2× (Quick)' },
  { speed: 4, label: '4× (Timelapse)' },
  { speed: 5, label: '5× (Ultra Fast)' },
];

interface DraggingRegion {
  id: string;
  type: 'trim' | 'speed';
  side: 'left' | 'right';
  initialX: number;
  initialStartMs: number;
  initialEndMs: number;
}

interface TimelinePanelProps {
  project: EditorProjectData | null;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  timelineZoom: number;
  timelineTicks: number[];
  selectedTrimId: string | null;
  selectedSpeedId: string | null;
  trimStartMs: number | null;
  speedStartMs: number | null;
  pendingSpeed: number;
  draggingRegion: DraggingRegion | null;
  tempResizeState: { startMs: number; endMs: number } | null;
  onTogglePlay: () => void;
  onFrameStep: (direction: -1 | 1) => void;
  onSeek: (ms: number) => void;
  onPlaybackRate: (rate: number) => void;
  onVolume: (v: number) => void;
  onMute: () => void;
  onMarkTrimStart: () => void;
  onCancelTrimMark: () => void;
  onAddTrimRange: () => void;
  onClearTrimRanges: () => void;
  onRemoveTrimRange: (id: string) => void;
  onSplitTrim: () => void;
  onSelectTrimId: (id: string | null) => void;
  onMarkSpeedStart: () => void;
  onCancelSpeedMark: () => void;
  onAddSpeedRange: () => void;
  onClearSpeedRanges: () => void;
  onRemoveSpeedRange: (id: string) => void;
  onSelectSpeedId: (id: string | null) => void;
  onUpdateSpeedValue: (id: string, speed: number) => void;
  onTimelineZoomChange: (v: number) => void;
  onPendingSpeedChange: (v: number) => void;
  onDragStart: (event: React.MouseEvent, id: string, type: 'trim' | 'speed', side: 'left' | 'right', startMs: number, endMs: number) => void;
  onUpdateTimelineTrack: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
  timelineTracks: Record<TimelineTrackId, { visible: boolean; locked: boolean }>;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  currentTimeMs,
  durationMs,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  timelineZoom,
  timelineTicks,
  selectedTrimId,
  selectedSpeedId,
  trimStartMs,
  speedStartMs,
  pendingSpeed,
  draggingRegion,
  tempResizeState,
  onTogglePlay,
  onFrameStep,
  onSeek,
  onPlaybackRate,
  onVolume,
  onMute,
  onMarkTrimStart,
  onCancelTrimMark,
  onAddTrimRange,
  onClearTrimRanges,
  onRemoveTrimRange,
  onSplitTrim,
  onSelectTrimId,
  onMarkSpeedStart,
  onCancelSpeedMark,
  onAddSpeedRange,
  onClearSpeedRanges,
  onRemoveSpeedRange,
  onSelectSpeedId,
  onUpdateSpeedValue,
  onTimelineZoomChange,
  onPendingSpeedChange,
  onDragStart,
  onUpdateTimelineTrack,
  timelineTracks,
}) => {
  const editor = project?.editor;

  const selectedTrim = editor?.trimRegions?.find((t: TrimRegion) => t.id === selectedTrimId);
  const isPlayheadInsideSelectedTrim =
    selectedTrim != null &&
    currentTimeMs > selectedTrim.startMs &&
    currentTimeMs < selectedTrim.endMs;

  const selectedSpeed = editor?.speedRegions?.find((s: SpeedRegion) => s.id === selectedSpeedId);

  return (
    <footer className="timeline-panel" role="contentinfo">
      {/* Toolbar */}
      <div className="timeline-toolbar">
        <div aria-live="polite">
          Time: {formatTimelineTime(currentTimeMs)} / {formatTimelineTime(durationMs)}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="timeline-control" onClick={() => onFrameStep(-1)} aria-label="Previous frame">◀ Frame</button>
          <button className="timeline-control" onClick={onTogglePlay} aria-label={isPlaying ? 'Pause playback' : 'Play playback'}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className="timeline-control" onClick={() => onFrameStep(1)} aria-label="Next frame">Frame ▶</button>

          <label className="timeline-field">
            Speed
            <select value={playbackRate} onChange={(e) => onPlaybackRate(Number(e.target.value))} aria-label="Playback speed">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <option key={rate} value={rate}>{rate}×</option>
              ))}
            </select>
          </label>

          <button className="timeline-control" onClick={onMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <label className="timeline-field">
            Volume
            <input
              type="range" min={0} max={1} step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              aria-label="Volume"
            />
          </label>

          {/* Trim controls */}
          <button className="timeline-control" onClick={onMarkTrimStart} aria-label="Mark cut range start">
            {trimStartMs === null ? 'Mark Cut Start' : `Cut starts ${formatTimelineTime(trimStartMs)}`}
          </button>
          <button className="timeline-control" onClick={onCancelTrimMark} disabled={trimStartMs === null} aria-label="Cancel pending cut range">
            Cancel Cut
          </button>
          <button
            className="timeline-control"
            onClick={onAddTrimRange}
            disabled={trimStartMs === null || trimStartMs === currentTimeMs}
            aria-label="Cut marked range"
          >
            Cut Range
          </button>
          <button
            className="timeline-control"
            onClick={onClearTrimRanges}
            disabled={!editor?.trimRegions?.length}
            aria-label="Clear cut ranges"
          >
            Clear Cuts
          </button>

          {/* Selected trim actions */}
          {selectedTrimId !== null && (
            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 6, borderLeft: '1px solid var(--line)', paddingLeft: 6 }}>
              <button
                className="timeline-control"
                onClick={onSplitTrim}
                disabled={!isPlayheadInsideSelectedTrim}
                aria-label="Split selected cut range at playhead"
              >
                Split Cut
              </button>
              <button
                className="timeline-control"
                onClick={() => onRemoveTrimRange(selectedTrimId)}
                aria-label="Delete selected cut range"
              >
                Delete Cut
              </button>
            </div>
          )}

          {/* Speed controls */}
          <select
            className="timeline-control"
            value={pendingSpeed}
            onChange={(e) => onPendingSpeedChange(Number(e.target.value))}
            aria-label="Speed for marked range"
          >
            {SPEED_OPTIONS.map((opt) => <option key={opt.speed} value={opt.speed}>{opt.label}</option>)}
          </select>
          <button className="timeline-control" onClick={onMarkSpeedStart} aria-label="Mark speed range start">
            {speedStartMs === null ? 'Mark Speed Start' : `Speed starts ${formatTimelineTime(speedStartMs)}`}
          </button>
          <button className="timeline-control" onClick={onCancelSpeedMark} disabled={speedStartMs === null} aria-label="Cancel pending speed range">
            Cancel Speed
          </button>
          <button
            className="timeline-control"
            onClick={onAddSpeedRange}
            disabled={speedStartMs === null || speedStartMs === currentTimeMs}
            aria-label="Apply speed to marked range"
          >
            Apply Speed
          </button>
          <button
            className="timeline-control"
            onClick={onClearSpeedRanges}
            disabled={!editor?.speedRegions?.length}
            aria-label="Clear speed ranges"
          >
            Clear Speeds
          </button>

          {/* Selected speed actions */}
          {selectedSpeedId !== null && selectedSpeed && (
            <div className="speed-edit-controls">
              <label htmlFor="speed-multiplier-select">Speed: </label>
              <select
                id="speed-multiplier-select"
                value={selectedSpeed.speed}
                onChange={(e) => onUpdateSpeedValue(selectedSpeedId, parseFloat(e.target.value))}
                aria-label="Change speed of selected range"
              >
                <option value="0.25">0.25×</option>
                <option value="0.5">0.5×</option>
                <option value="1.0">1.0×</option>
                <option value="1.5">1.5×</option>
                <option value="2.0">2.0×</option>
                <option value="4.0">4.0×</option>
                <option value="5.0">5.0×</option>
              </select>
              <button
                className="timeline-control"
                onClick={() => onRemoveSpeedRange(selectedSpeedId)}
                aria-label="Delete selected speed range"
              >
                Delete Speed
              </button>
            </div>
          )}

          {/* Timeline zoom */}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            Timeline Zoom:
            <input
              type="range" min={1} max={5.0} step={0.1}
              value={timelineZoom}
              onChange={(e) => onTimelineZoomChange(parseFloat(e.target.value))}
            />
          </label>
          <button
            className="timeline-control"
            onClick={() => onTimelineZoomChange(1)}
            disabled={timelineZoom === 1}
            aria-label="Zoom timeline to fit"
          >
            Zoom to Fit
          </button>
        </div>
      </div>

      {/* Ruler + Tracks */}
      <div className="timeline-scroll">
        {/* Ruler */}
        <div
          className="timeline-ruler"
          style={{ minWidth: `${timelineZoom * 100}%` }}
          aria-label="Timeline time ruler"
        >
          {timelineTicks.map((timeMs) => (
            <span key={timeMs} className="timeline-tick" style={{ left: `${timelinePercent(timeMs, durationMs)}%` }}>
              {formatTimelineTime(timeMs)}
            </span>
          ))}
        </div>

        {/* Tracks */}
        <div
          className="timeline-tracks"
          style={{ minWidth: `${timelineZoom * 100}%` }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs));
            onSelectTrimId(null);
            onSelectSpeedId(null);
          }}
        >
          {/* Screen Track */}
          <div className="timeline-track">
            <span className="track-label">Screen Recording</span>
            <TrackControls trackId="screen" state={timelineTracks.screen} onToggle={onUpdateTimelineTrack} />

            {trimStartMs !== null && (
              <div
                className="timeline-pending-cut-marker"
                style={{ left: `${timelinePercent(trimStartMs, durationMs)}%` }}
                title={`Pending cut starts at ${formatTimelineTime(trimStartMs)}`}
                aria-hidden="true"
              />
            )}
            {speedStartMs !== null && (
              <div
                className="timeline-pending-speed-marker"
                style={{ left: `${timelinePercent(speedStartMs, durationMs)}%` }}
                title={`Pending speed starts at ${formatTimelineTime(speedStartMs)}`}
                aria-hidden="true"
              />
            )}

            {/* Speed Regions */}
            {editor?.speedRegions?.map((region: SpeedRegion) => {
              const isSelected = region.id === selectedSpeedId;
              const isDraggingThis = draggingRegion?.id === region.id && draggingRegion.type === 'speed';
              const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : region.startMs;
              const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : region.endMs;
              return (
                <div
                  key={region.id}
                  className={`playback-speed-region ${isSelected ? 'selected' : ''}`}
                  onClick={(event) => { event.stopPropagation(); onSelectSpeedId(region.id); onSelectTrimId(null); }}
                  style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%` }}
                  role="button" tabIndex={0}
                  aria-label={`${region.speed} times speed from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                  title={`${region.speed}× speed range`}
                >
                  {isSelected && <div className="resize-handle left-handle" onMouseDown={(e) => onDragStart(e, region.id, 'speed', 'left', region.startMs, region.endMs)} aria-hidden="true" />}
                  <span className="speed-label">{region.speed}×</span>
                  {isSelected && <div className="resize-handle right-handle" onMouseDown={(e) => onDragStart(e, region.id, 'speed', 'right', region.startMs, region.endMs)} aria-hidden="true" />}
                </div>
              );
            })}

            {/* Trim Regions */}
            {editor?.trimRegions?.map((t: TrimRegion) => {
              const isSelected = t.id === selectedTrimId;
              const isDraggingThis = draggingRegion?.id === t.id && draggingRegion.type === 'trim';
              const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : t.startMs;
              const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : t.endMs;
              return (
                <div
                  key={t.id}
                  className={`trim-region-visual ${isSelected ? 'selected' : ''}`}
                  onClick={(event) => { event.stopPropagation(); onSelectTrimId(t.id); onSelectSpeedId(null); }}
                  style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%` }}
                  role="button" tabIndex={0}
                  aria-label={`Cut from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                  title="Cut range"
                >
                  {isSelected && <div className="resize-handle left-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'left', t.startMs, t.endMs)} aria-hidden="true" />}
                  {isSelected && <div className="resize-handle right-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'right', t.startMs, t.endMs)} aria-hidden="true" />}
                </div>
              );
            })}

            {/* Playhead */}
            <div className="timeline-playhead" style={{ left: `${timelinePercent(currentTimeMs, durationMs)}%` }} />
          </div>

          {/* Effects Track */}
          <div className="timeline-track">
            <span className="track-label">Effects</span>
            <TrackControls trackId="effects" state={timelineTracks.effects} onToggle={onUpdateTimelineTrack} />
            {editor?.zoomRegions?.map((z: ZoomRegion) => (
              <div
                key={z.id}
                className="speed-region-visual"
                style={{ left: `${timelinePercent(z.startMs, durationMs)}%`, width: `${timelinePercent(z.endMs - z.startMs, durationMs)}%` }}
              />
            ))}
          </div>

          {/* Captions Track */}
          <div className="timeline-track">
            <span className="track-label">Captions Track</span>
            <TrackControls trackId="captions" state={timelineTracks.captions} onToggle={onUpdateTimelineTrack} />
            {editor?.annotationRegions?.filter((a: any) => a.annotationSource === 'auto-caption').map((c: any) => (
              <div
                key={c.id}
                className="speed-region-visual"
                style={{
                  left: `${timelinePercent(c.startMs, durationMs)}%`,
                  width: `${timelinePercent(c.endMs - c.startMs, durationMs)}%`,
                  background: 'rgba(255, 209, 102, 0.35)',
                  borderLeft: '2px solid var(--warning)',
                  borderRight: '2px solid var(--warning)',
                }}
              />
            ))}
          </div>

          {/* Webcam, Presentation, Audio tracks */}
          {(['webcam', 'presentation', 'audio'] as TimelineTrackId[]).map((trackId) => (
            <div className="timeline-track" key={trackId}>
              <span className="track-label">
                {trackId === 'webcam' ? 'Webcam' : trackId === 'presentation' ? 'Presentation' : 'Audio'}
              </span>
              <TrackControls trackId={trackId} state={timelineTracks[trackId]} onToggle={onUpdateTimelineTrack} />
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};
