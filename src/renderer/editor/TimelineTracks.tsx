import React, { useState } from 'react';
import type { EditorProjectData, TimelineTrackId, TimelineTrackState } from '../../shared/editor/projectPersistence';
import type { TrimRegion, SpeedRegion, ZoomRegion } from '../../shared/editor/types';
import { TrackControls } from './TrackControls';
import { type EditMode } from './EditorTimelineToolbar';

interface DraggingRegion {
  id: string;
  type: 'trim' | 'speed';
  side: 'left' | 'right';
  initialX: number;
  timelineCanvasWidth: number;
  initialStartMs: number;
  initialEndMs: number;
}

interface TimelineTracksProps {
  project: EditorProjectData | null;
  currentTimeMs: number;
  durationMs: number;
  timelineZoom: number;
  timelineTicks: number[];
  selectedTrimId: string | null;
  selectedSpeedId: string | null;
  selectedZoomId: string | null;
  selectedCaptionId: string | null;
  trimStartMs: number | null;
  speedStartMs: number | null;
  draggingRegion: DraggingRegion | null;
  tempResizeState: { startMs: number; endMs: number } | null;
  onSeek: (ms: number) => void;
  onSelectTrimId: (id: string | null) => void;
  onSelectSpeedId: (id: string | null) => void;
  onSelectZoomId: (id: string | null) => void;
  onSelectCaptionId: (id: string | null) => void;
  onDragStart: (event: React.MouseEvent, id: string, type: 'trim' | 'speed', side: 'left' | 'right', startMs: number, endMs: number, timelineCanvasWidth: number) => void;
  onUpdateTimelineTrack: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
  timelineTracks: Record<TimelineTrackId, TimelineTrackState>;
  editMode: EditMode;
  onTimelineTrackClick: (trackId: TimelineTrackId, timeMs: number, mode: EditMode) => void;
}

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

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  project,
  currentTimeMs,
  durationMs,
  timelineZoom,
  timelineTicks,
  selectedTrimId,
  selectedSpeedId,
  selectedZoomId,
  selectedCaptionId,
  trimStartMs,
  speedStartMs,
  draggingRegion,
  tempResizeState,
  onSeek,
  onSelectTrimId,
  onSelectSpeedId,
  onSelectZoomId,
  onSelectCaptionId,
  onDragStart,
  onUpdateTimelineTrack,
  timelineTracks,
  editMode,
  onTimelineTrackClick,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);

  const showWebcam = Boolean(project?.media?.webcamVideoPath);
  const showPresentation = project?.media?.presentationMode === 'sidecar';
  const showAudio = Boolean(project?.media?.screenVideoPath);
  // These are creation lanes, not merely result lanes. Keeping them visible
  // makes it clear where a user can add captions and effects before any item
  // exists, and removes the hidden-mode discovery problem.
  const showCaptions = true;
  const showEffects = true;

  const activeTracksList: { id: TimelineTrackId; label: string }[] = [
    { id: 'screen', label: 'Screen' },
    ...(showWebcam ? [{ id: 'webcam' as TimelineTrackId, label: 'Camera' }] : []),
    ...(showPresentation ? [{ id: 'presentation' as TimelineTrackId, label: 'Presentation' }] : []),
    ...(showAudio ? [{ id: 'audio' as TimelineTrackId, label: 'Audio' }] : []),
    ...(showCaptions ? [{ id: 'captions' as TimelineTrackId, label: 'Captions' }] : []),
    ...(showEffects ? [{ id: 'effects' as TimelineTrackId, label: 'Effects' }] : []),
  ];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('.trim-region-visual') ||
      target.closest('.playback-speed-region') ||
      target.closest('.zoom-region-visual') ||
      target.closest('.caption-region-visual')
    ) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const seekMs = timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs);
    onSeek(seekMs);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const seekMs = timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs);
    onSeek(seekMs);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsScrubbing(false);
    }
  };

  const handleTrackClick = (trackId: TimelineTrackId, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickMs = timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs);

    if (editMode !== 'select') {
      onTimelineTrackClick(trackId, clickMs, editMode);
    } else {
      onSeek(clickMs);
      onSelectTrimId(null);
      onSelectSpeedId(null);
      onSelectZoomId(null);
      onSelectCaptionId(null);
    }
  };

  const canvasWidthFor = (element: HTMLElement): number => {
    const canvas = element.closest('.timeline-canvas');
    return Math.max(1, canvas?.getBoundingClientRect().width ?? 1);
  };

  return (
    <div className="timeline-content-layout" style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0 }}>
      {/* Left: Fixed track headers */}
      <div 
        className="timeline-headers-column" 
        style={{ 
          width: 150, 
          minWidth: 150, 
          maxWidth: 150, 
          display: 'flex', 
          flexDirection: 'column', 
          borderRight: '1px solid var(--line)',
          background: 'rgba(15, 17, 26, 0.95)',
          zIndex: 5
        }}
      >
        <div style={{ height: 24, borderBottom: '1px solid var(--line)' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {activeTracksList.map(t => (
            <div key={t.id} className="track-header-row" style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</span>
              <TrackControls trackId={t.id} state={timelineTracks[t.id]} onToggle={onUpdateTimelineTrack} />
            </div>
          ))}
        </div>
      </div>

      {/* Right: Scrolling canvas */}
      <div 
        className="timeline-canvas-scroll" 
        style={{ 
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          position: 'relative'
        }}
      >
        <div
          className="timeline-canvas"
          style={{ minWidth: `${timelineZoom * 100}%`, position: 'relative', height: '100%' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Ruler */}
          <div 
            className="timeline-ruler" 
            style={{ 
              height: 24, 
              position: 'relative', 
              borderBottom: '1px solid var(--line)', 
              background: 'rgba(0,0,0,0.1)' 
            }}
          >
            {timelineTicks.map((timeMs) => (
              <span key={timeMs} className="timeline-tick" style={{ left: `${timelinePercent(timeMs, durationMs)}%` }}>
                {formatTimelineTime(timeMs)}
              </span>
            ))}
          </div>

          {/* Track Bands */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }} className="track-band-content">
            {activeTracksList.map((track) => {
              const trackId = track.id;
              const isScreen = trackId === 'screen';
              const isWebcam = trackId === 'webcam';
              const isPresentation = trackId === 'presentation';
              const isAudio = trackId === 'audio';
              const isCaptions = trackId === 'captions';
              const isEffects = trackId === 'effects';

              return (
                <div
                  key={trackId}
                  className="timeline-track"
                  data-track={trackId}
                  onClick={(e) => handleTrackClick(trackId, e)}
                  style={{
                    height: 38,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: editMode === 'cut' ? 'crosshair'
                      : editMode === 'speed' ? 'col-resize'
                      : editMode === 'zoom' ? 'zoom-in'
                      : editMode === 'caption' ? 'text'
                      : 'default',
                  }}
                >
                  {/* Filmstrip block for Screen track */}
                  {isScreen && (
                    <div
                      className="track-clip-block"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 2,
                        bottom: 2,
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1.5px solid var(--accent)',
                        borderRadius: 4,
                        overflow: 'hidden',
                        cursor: editMode === 'select' ? 'grab' : editMode === 'cut' ? 'crosshair' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {/* SVG filmstrip sprocket decoration */}
                      <svg
                        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0.25 }}
                        preserveAspectRatio="xMidYMid slice"
                        viewBox="0 0 200 34"
                        aria-hidden="true"
                      >
                        {Array.from({ length: 20 }).map((_, i) => (
                          <g key={i} transform={`translate(${i * 10}, 0)`}>
                            <rect x="0.5" y="2" width="4" height="5" rx="1" fill="var(--accent)" />
                            <rect x="0.5" y="27" width="4" height="5" rx="1" fill="var(--accent)" />
                          </g>
                        ))}
                        {Array.from({ length: 5 }).map((_, i) => (
                          <rect key={`frame-${i}`} x={i * 42 + 6} y="9" width="34" height="16" rx="2" fill="none" stroke="var(--accent)" strokeWidth="1" />
                        ))}
                      </svg>
                      <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600, color: 'var(--accent)', paddingLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {'\uD83D\uDCFB'} {project?.videoPath ? project.videoPath.split(/[/\\]/).pop() : 'recording.mp4'}
                      </span>
                    </div>
                  )}

                  {/* Filmstrip block for Webcam track */}
                  {isWebcam && (
                    <div
                      className="track-clip-block"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 2,
                        bottom: 2,
                        background: 'rgba(139, 92, 246, 0.12)',
                        border: '1.5px solid #8b5cf6',
                        borderRadius: 4,
                        overflow: 'hidden',
                        cursor: editMode === 'select' ? 'grab' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <svg
                        style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0.2 }}
                        preserveAspectRatio="xMidYMid slice"
                        viewBox="0 0 200 34"
                        aria-hidden="true"
                      >
                        {Array.from({ length: 20 }).map((_, i) => (
                          <g key={i} transform={`translate(${i * 10}, 0)`}>
                            <rect x="0.5" y="2" width="4" height="5" rx="1" fill="#8b5cf6" />
                            <rect x="0.5" y="27" width="4" height="5" rx="1" fill="#8b5cf6" />
                          </g>
                        ))}
                      </svg>
                      <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600, color: '#a78bfa', paddingLeft: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {'\uD83C\uDFA5'} {project?.media?.webcamVideoPath?.split(/[/\\]/).pop() || 'camera.mp4'}
                      </span>
                    </div>
                  )}

                  {/* Presentation track block */}
                  {isPresentation && (
                    <div
                      className="track-clip-block"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 2,
                        bottom: 2,
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1.5px solid var(--success)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--success)',
                        cursor: 'default',
                      }}
                    >
                      {'\uD83D\uDCCA'} Presentation Replay (Sidecar Events)
                    </div>
                  )}

                  {/* Audio analysis is not available until real media analysis is implemented. */}
                  {isAudio && (
                    <div
                      className="track-clip-block"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 2,
                        bottom: 2,
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: 4,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default',
                      }}
                    >
                      <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600, color: 'var(--warning)', paddingLeft: 8 }}>
                        Audio waveform unavailable
                      </span>
                    </div>
                  )}


                  {/* Cuts/trims and speeds on Screen Track */}
                  {isScreen && (
                    <>
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

                      {/* Trim Regions */}
                      {project?.editor?.trimRegions?.map((t: TrimRegion) => {
                        const isSelected = t.id === selectedTrimId;
                        const isDraggingThis = draggingRegion?.id === t.id && draggingRegion.type === 'trim';
                        const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : t.startMs;
                        const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : t.endMs;
                        return (
                          <div
                            key={t.id}
                            className={`trim-region-visual ${isSelected ? 'selected' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (editMode === 'select') {
                                onSelectTrimId(t.id);
                                onSelectSpeedId(null);
                                onSelectZoomId(null);
                                onSelectCaptionId(null);
                              }
                            }}
                            style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%`, zIndex: 10 }}
                            role="button" tabIndex={0}
                            aria-label={`Cut from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                            title="Cut range"
                          >
                            {isSelected && <div className="resize-handle left-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'left', t.startMs, t.endMs, canvasWidthFor(e.currentTarget))} aria-hidden="true" />}
                            {isSelected && <div className="resize-handle right-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'right', t.startMs, t.endMs, canvasWidthFor(e.currentTarget))} aria-hidden="true" />}
                          </div>
                        );
                      })}

                      {/* Speed Regions */}
                      {project?.editor?.speedRegions?.map((region: SpeedRegion) => {
                        const isSelected = region.id === selectedSpeedId;
                        const isDraggingThis = draggingRegion?.id === region.id && draggingRegion.type === 'speed';
                        const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : region.startMs;
                        const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : region.endMs;
                        return (
                          <div
                            key={region.id}
                            className={`playback-speed-region ${isSelected ? 'selected' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (editMode === 'select') {
                                onSelectSpeedId(region.id);
                                onSelectTrimId(null);
                                onSelectZoomId(null);
                                onSelectCaptionId(null);
                              }
                            }}
                            style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%`, zIndex: 11 }}
                            role="button" tabIndex={0}
                            aria-label={`${region.speed} times speed from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                            title={`${region.speed}× speed range`}
                          >
                            {isSelected && <div className="resize-handle left-handle" onMouseDown={(e) => onDragStart(e, region.id, 'speed', 'left', region.startMs, region.endMs, canvasWidthFor(e.currentTarget))} aria-hidden="true" />}
                            <span className="speed-label">{region.speed}×</span>
                            {isSelected && <div className="resize-handle right-handle" onMouseDown={(e) => onDragStart(e, region.id, 'speed', 'right', region.startMs, region.endMs, canvasWidthFor(e.currentTarget))} aria-hidden="true" />}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Zoom regions on effects */}
                  {isEffects && project?.editor?.zoomRegions?.map((z: ZoomRegion) => {
                    const isSelected = selectedZoomId === z.id;
                    return (
                      <div
                        key={z.id}
                        className={`zoom-region-visual ${isSelected ? 'selected' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (editMode === 'select') {
                            onSelectZoomId(z.id);
                            onSelectTrimId(null);
                            onSelectSpeedId(null);
                            onSelectCaptionId(null);
                          }
                        }}
                        style={{
                          left: `${timelinePercent(z.startMs, durationMs)}%`,
                          width: `${timelinePercent(z.endMs - z.startMs, durationMs)}%`,
                          position: 'absolute',
                          top: 2,
                          bottom: 2,
                          background: isSelected ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.25)',
                          border: isSelected ? '2px solid var(--accent)' : '1.5px solid var(--accent)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          zIndex: 12
                        }}
                        title="Zoom region effect"
                      />
                    );
                  })}

                  {/* Caption regions — with inline text */}
                  {isCaptions && project?.editor?.annotationRegions?.filter((a: any) => a.annotationSource === 'auto-caption').map((c: any) => {
                    const isSelected = selectedCaptionId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`caption-region-visual ${isSelected ? 'selected' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (editMode === 'select') {
                            onSelectCaptionId(c.id);
                            onSelectTrimId(null);
                            onSelectSpeedId(null);
                            onSelectZoomId(null);
                          }
                        }}
                        style={{
                          left: `${timelinePercent(c.startMs, durationMs)}%`,
                          width: `${timelinePercent(c.endMs - c.startMs, durationMs)}%`,
                          position: 'absolute',
                          top: 2,
                          bottom: 2,
                          background: isSelected ? 'rgba(255, 209, 102, 0.42)' : 'rgba(255, 209, 102, 0.18)',
                          border: isSelected ? '2px solid var(--warning)' : '1.5px dashed var(--warning)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          zIndex: 12,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                        }}
                        title={`Caption: "${c.content}"`}
                      >
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: isSelected ? 'var(--warning)' : 'rgba(255, 209, 102, 0.9)',
                          paddingLeft: 5,
                          paddingRight: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.2,
                          userSelect: 'none',
                        }}>
                          {c.content}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div 
            className="timeline-playhead" 
            style={{ 
              left: `${timelinePercent(currentTimeMs, durationMs)}%`,
              position: 'absolute',
              top: 0,
              bottom: 0,
              pointerEvents: 'none'
            }} 
          />
        </div>
      </div>
    </div>
  );
};
