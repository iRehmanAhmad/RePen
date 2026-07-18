import React from 'react';

export type EditMode = 'select' | 'cut' | 'speed' | 'zoom' | 'caption';

interface EditorTimelineToolbarProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTimeMs: number;
  durationMs: number;
  playbackRate: number;
  timelineZoom: number;
  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
  onTogglePlay: () => void;
  onFrameStep: (dir: -1 | 1) => void;
  onMute: () => void;
  onVolumeChange: (v: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onTimelineZoomChange: (v: number) => void;
  trimStartMs: number | null;
  onMarkTrimStart: () => void;
  onCancelTrimMark: () => void;
  onClearTrimRanges: () => void;
  onSplitTrim: () => void;
  selectedTrimId: string | null;
  speedStartMs: number | null;
  pendingSpeed: number;
  onMarkSpeedStart: () => void;
  onCancelSpeedMark: () => void;
  onClearSpeedRanges: () => void;
  onPendingSpeedChange: (v: number) => void;
  selectedCaptionId: string | null;
  onSplitCaption: () => void;
  onMergeCaption: () => void;
}

const Icon = ({ children }: { children: React.ReactNode }) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const PlayIcon = () => <Icon><polygon points="5 3 19 12 5 21" fill="currentColor" stroke="none" /></Icon>;
const PauseIcon = () => <Icon><path d="M7 4v16M17 4v16" /></Icon>;
const StepBackIcon = () => <Icon><path d="m19 20-10-8 10-8M5 19V5" /></Icon>;
const StepForwardIcon = () => <Icon><path d="m5 4 10 8-10 8M19 5v14" /></Icon>;
const VolumeIcon = () => <Icon><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></Icon>;
const MuteIcon = () => <Icon><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m23 9-6 6m0-6 6 6" /></Icon>;
const SelectIcon = () => <Icon><path d="m4 3 7 17 2-7 7-2z" /></Icon>;
const CutIcon = () => <Icon><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="m8.5 8.5 11 11M8.5 15.5 12 12m2.5-2.5L19.5 4" /></Icon>;
const SpeedIcon = () => <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const ZoomIcon = () => <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>;
const CaptionIcon = () => <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${String(Math.floor(totalSec / 60)).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
}

export const EditorTimelineToolbar: React.FC<EditorTimelineToolbarProps> = (props) => {
  const {
    isPlaying, volume, isMuted, currentTimeMs, durationMs, playbackRate, timelineZoom, editMode,
    onEditModeChange, onTogglePlay, onFrameStep, onMute, onVolumeChange, onPlaybackRateChange, onTimelineZoomChange,
    trimStartMs, onMarkTrimStart, onCancelTrimMark, onClearTrimRanges, onSplitTrim, selectedTrimId,
    speedStartMs, pendingSpeed, onMarkSpeedStart, onCancelSpeedMark, onClearSpeedRanges, onPendingSpeedChange,
    selectedCaptionId, onSplitCaption, onMergeCaption,
  } = props;

  const modes = [
    { id: 'select', label: 'Select', key: 'V', icon: <SelectIcon /> },
    { id: 'cut', label: 'Cut', key: 'C', icon: <CutIcon /> },
    { id: 'speed', label: 'Speed', key: 'S', icon: <SpeedIcon /> },
    { id: 'zoom', label: 'Zoom', key: 'Z', icon: <ZoomIcon /> },
    { id: 'caption', label: 'Caption', key: 'T', icon: <CaptionIcon /> },
  ] as const;

  return (
    <div className="timeline-toolbar">
      <div className="timeline-toolbar__transport">
        <div className="timeline-toolbar__group" aria-label="Playback controls">
          <button className="timeline-control timeline-control--icon" onClick={() => onFrameStep(-1)} title="Previous frame" aria-label="Previous frame"><StepBackIcon /></button>
          <button className="timeline-control timeline-control--icon timeline-control--play" onClick={onTogglePlay} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
          <button className="timeline-control timeline-control--icon" onClick={() => onFrameStep(1)} title="Next frame" aria-label="Next frame"><StepForwardIcon /></button>
          <output className="timeline-timecode">{formatTimecode(currentTimeMs)} <span>/ {formatTimecode(durationMs)}</span></output>
          <select className="timeline-rate" aria-label="Playback speed" value={playbackRate} onChange={(event) => onPlaybackRateChange(parseFloat(event.target.value))}>
            <option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
          </select>
        </div>
        <div className="timeline-toolbar__group timeline-toolbar__utilities">
          <button className="timeline-control timeline-control--icon" onClick={onMute} title={isMuted ? 'Unmute' : 'Mute'} aria-label="Volume">{isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}</button>
          <input className="timeline-volume" type="range" min="0" max="1" step="0.05" aria-label="Volume slider" value={isMuted ? 0 : volume} onChange={(event) => onVolumeChange(parseFloat(event.target.value))} />
          <label className="timeline-zoom-control">Zoom <input type="range" min="0.5" max="10" step="0.1" aria-label="Timeline zoom slider" value={timelineZoom} onChange={(event) => onTimelineZoomChange(parseFloat(event.target.value))} /></label>
          <button className="timeline-control timeline-control--small" onClick={() => onTimelineZoomChange(1)} title="Fit timeline" aria-label="Zoom timeline to fit">Fit</button>
        </div>
      </div>

      <div className="timeline-toolbar__editbar">
        <div className="timeline-mode-selector" aria-label="Editing mode">
          {modes.map(({ id, label, key, icon }) => (
            <button key={id} className={`timeline-control timeline-mode${editMode === id ? ' active' : ''}`} onClick={() => onEditModeChange(id)} title={`${label} mode (${key})`} aria-label={`${label} mode`} aria-pressed={editMode === id}>
              {icon}<span>{label}</span><kbd className="shortcut-chip">{key}</kbd>
            </button>
          ))}
        </div>
        <div className="timeline-context-actions">
          {editMode === 'select' && <span>Select a clip or region to edit it.</span>}
          {editMode === 'cut' && <>
            <span>{trimStartMs === null ? 'Set a cut start, then click the Screen lane.' : 'Click the Screen lane to complete the cut.'}</span>
            <button className="timeline-control timeline-control--small" onClick={trimStartMs === null ? onMarkTrimStart : onCancelTrimMark}>{trimStartMs === null ? 'Use playhead' : 'Cancel'}</button>
            <button className="timeline-control timeline-control--small" onClick={onClearTrimRanges}>Clear</button>
            {selectedTrimId && <button className="timeline-control timeline-control--small" onClick={onSplitTrim}>Split</button>}
          </>}
          {editMode === 'speed' && <>
            <span>{speedStartMs === null ? 'Set a speed range from the Screen lane.' : 'Click the Screen lane to complete the speed range.'}</span>
            <select className="timeline-rate" aria-label="Target speed" value={pendingSpeed} onChange={(event) => onPendingSpeedChange(parseFloat(event.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="4">4×</option></select>
            <button className="timeline-control timeline-control--small" onClick={speedStartMs === null ? onMarkSpeedStart : onCancelSpeedMark}>{speedStartMs === null ? 'Use playhead' : 'Cancel'}</button>
            <button className="timeline-control timeline-control--small" onClick={onClearSpeedRanges}>Clear</button>
          </>}
          {editMode === 'zoom' && <span>Click the Effects lane to add a zoom region.</span>}
          {editMode === 'caption' && <><span>Click the Captions lane to add a caption.</span><button className="timeline-control timeline-control--small" onClick={onSplitCaption} disabled={!selectedCaptionId}>Split</button><button className="timeline-control timeline-control--small" onClick={onMergeCaption} disabled={!selectedCaptionId}>Merge</button></>}
        </div>
      </div>
    </div>
  );
};
