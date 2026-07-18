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
  
  // Contextual Cut callbacks
  trimStartMs: number | null;
  onMarkTrimStart: () => void;
  onCancelTrimMark: () => void;
  onClearTrimRanges: () => void;
  onSplitTrim: () => void;
  selectedTrimId: string | null;

  // Contextual Speed callbacks
  speedStartMs: number | null;
  pendingSpeed: number;
  onMarkSpeedStart: () => void;
  onCancelSpeedMark: () => void;
  onClearSpeedRanges: () => void;
  onPendingSpeedChange: (v: number) => void;

  // Contextual Caption callbacks
  selectedCaptionId: string | null;
  onSplitCaption: () => void;
  onMergeCaption: () => void;
}

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);

const StepBackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
);

const StepForwardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
);

const VolumeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
);

const MuteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
);

const SelectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 3 10 18 13 12 21 12"/></svg>
);

const CutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
);

const SpeedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const ZoomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const CaptionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

export const EditorTimelineToolbar: React.FC<EditorTimelineToolbarProps> = ({
  isPlaying,
  volume,
  isMuted,
  currentTimeMs,
  durationMs,
  playbackRate,
  timelineZoom,
  editMode,
  onEditModeChange,
  onTogglePlay,
  onFrameStep,
  onMute,
  onVolumeChange,
  onPlaybackRateChange,
  onTimelineZoomChange,

  trimStartMs,
  onMarkTrimStart,
  onCancelTrimMark,
  onClearTrimRanges,
  onSplitTrim,
  selectedTrimId,

  speedStartMs,
  pendingSpeed,
  onMarkSpeedStart,
  onCancelSpeedMark,
  onClearSpeedRanges,
  onPendingSpeedChange,

  selectedCaptionId,
  onSplitCaption,
  onMergeCaption,
}) => {
  return (
    <div 
      className="timeline-toolbar" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8, 
        borderBottom: '1px solid var(--line)', 
        paddingBottom: 8, 
        flexShrink: 0 
      }}
    >
      {/* Top row: Transport Bar & Volume / Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 16 }}>
        
        {/* Left: Transport controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="timeline-control" onClick={() => onFrameStep(-1)} title="Previous Frame" aria-label="Previous frame">
            <StepBackIcon />
          </button>
          <button 
            className="timeline-control" 
            onClick={onTogglePlay} 
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ minWidth: 32, display: 'inline-flex', justifyContent: 'center' }}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="timeline-control" onClick={() => onFrameStep(1)} title="Next Frame" aria-label="Next frame">
            <StepForwardIcon />
          </button>
          
          <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--text)', marginLeft: 8, userSelect: 'none' }}>
            <span>{formatTimecode(currentTimeMs)}</span>
            <span style={{ color: 'var(--text-disabled)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--text-muted)' }}>{formatTimecode(durationMs)}</span>
          </div>

          {/* Speed Select */}
          <div className="timeline-field" style={{ marginLeft: 12 }}>
            <span className="property-label" style={{ fontSize: 9.5 }}>Speed</span>
            <select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              style={{ padding: '2px 6px', fontSize: 11 }}
            >
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1">1.0×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2.0×</option>
            </select>
          </div>
        </div>

        {/* Right: Audio Volume & Timeline Zoom sliders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="timeline-control" onClick={onMute} title={isMuted ? 'Unmute' : 'Mute'} aria-label="Volume">
              {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              aria-label="Volume slider"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              style={{ width: 64, height: 4, margin: 0 }}
            />
          </div>

          {/* Timeline Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="property-label" style={{ fontSize: 9.5 }}>Zoom</span>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              aria-label="Timeline zoom slider"
              value={timelineZoom}
              onChange={(e) => onTimelineZoomChange(parseFloat(e.target.value))}
              style={{ width: 80, height: 4, margin: 0 }}
            />
            <button 
              className="timeline-control" 
              onClick={() => onTimelineZoomChange(1.0)} 
              title="Reset Timeline zoom to fit"
              aria-label="Zoom timeline to fit"
              style={{ padding: '3px 8px', fontSize: 10 }}
            >
              Fit
            </button>
          </div>
        </div>

      </div>

      {/* Bottom row: Edit Mode and Contextual Actions */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 16, 
          background: 'rgba(0,0,0,0.15)', 
          padding: '4px 8px', 
          borderRadius: 6,
          border: '1px solid var(--line)'
        }}
      >
        {/* Edit mode selector */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', padding: 2, borderRadius: 6 }}>
          {(
            [
              { id: 'select',  label: 'Select',  key: 'V', Icon: SelectIcon },
              { id: 'cut',     label: 'Cut',     key: 'C', Icon: CutIcon },
              { id: 'speed',   label: 'Speed',   key: 'S', Icon: SpeedIcon },
              { id: 'zoom',    label: 'Zoom',    key: 'Z', Icon: ZoomIcon },
              { id: 'caption', label: 'Caption', key: 'T', Icon: CaptionIcon },
            ] as const
          ).map(({ id, label, key, Icon }) => (
            <button
              key={id}
              className={`timeline-control${editMode === id ? ' active' : ''}`}
              onClick={() => onEditModeChange(id as EditMode)}
              title={`${label} Mode (${key})`}
              aria-label={`${label} mode`}
              aria-pressed={editMode === id}
              style={{
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: editMode === id ? undefined : 'transparent',
              }}
            >
              <Icon />
              <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
              <kbd className="shortcut-chip">{key}</kbd>
            </button>
          ))}
        </div>

        {/* Separator line */}
        <div style={{ width: 1, height: 16, background: 'var(--line)' }} />

        {/* Contextual actions display */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          
          {editMode === 'select' && (
            <span className="timeline-mode-hint">Click a region to select it. Drag its handles to refine its timing.</span>
          )}

          {editMode === 'cut' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {trimStartMs === null ? (
                <>
                  <span className="timeline-mode-hint">Click the Screen lane twice to mark a cut range.</span>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onMarkTrimStart}>Use playhead</button>
                </>
              ) : (
                <>
                  <span className="timeline-mode-hint">Now click the Screen lane again to complete the cut.</span>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onCancelTrimMark} aria-label="Cancel pending cut range">
                    Cancel
                  </button>
                </>
              )}
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onClearTrimRanges}>
                Clear Cuts
              </button>
              {selectedTrimId && (
                <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onSplitTrim}>
                  Split Trim
                </button>
              )}
            </div>
          )}

          {editMode === 'speed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {speedStartMs === null ? (
                <>
                  <span className="timeline-mode-hint">Choose a speed, then click the Screen lane twice to create a segment.</span>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onMarkSpeedStart}>Use playhead</button>
                </>
              ) : (
                <>
                  <span className="timeline-mode-hint">Now click the Screen lane again to complete the speed segment.</span>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onCancelSpeedMark}>
                    Cancel
                  </button>
                </>
              )}
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onClearSpeedRanges}>
                Clear Speeds
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Target Speed:</span>
                <select
                  value={pendingSpeed}
                  onChange={(e) => onPendingSpeedChange(parseFloat(e.target.value))}
                  style={{ padding: '2px 6px', fontSize: 11, background: '#11131c', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 4 }}
                >
                  <option value="0.25">0.25×</option>
                  <option value="0.5">0.5×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2.0×</option>
                  <option value="4">4.0×</option>
                  <option value="5">5.0×</option>
                </select>
              </div>
            </div>
          )}

          {editMode === 'zoom' && (
            <span className="timeline-mode-hint">Click the Effects lane to add a five-second zoom. Select it to refine the focus in Motion.</span>
          )}

          {editMode === 'caption' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="timeline-mode-hint">Click the Captions lane to place a new caption.</span>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 12px', fontSize: 11.5 }} 
                onClick={onSplitCaption} 
                disabled={!selectedCaptionId}
              >
                Split Segment
              </button>
              <button 
                className="btn-secondary" 
                style={{ padding: '4px 12px', fontSize: 11.5 }} 
                onClick={onMergeCaption} 
                disabled={!selectedCaptionId}
              >
                Merge Next
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
