import React from 'react';
import type { EditorProjectData, TimelineTrackId, TimelineTrackState } from '../../shared/editor/projectPersistence';
import type { TrimRegion, SpeedRegion, ZoomRegion } from '../../shared/editor/types';
import { TrackControls } from './TrackControls';

interface DraggingRegion {
  id: string;
  type: 'trim' | 'speed';
  side: 'left' | 'right';
  initialX: number;
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
  trimStartMs: number | null;
  speedStartMs: number | null;
  draggingRegion: DraggingRegion | null;
  tempResizeState: { startMs: number; endMs: number } | null;
  onSeek: (ms: number) => void;
  onSelectTrimId: (id: string | null) => void;
  onSelectSpeedId: (id: string | null) => void;
  onDragStart: (event: React.MouseEvent, id: string, type: 'trim' | 'speed', side: 'left' | 'right', startMs: number, endMs: number) => void;
  onUpdateTimelineTrack: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
  timelineTracks: Record<TimelineTrackId, TimelineTrackState>;
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
  trimStartMs,
  speedStartMs,
  draggingRegion,
  tempResizeState,
  onSeek,
  onSelectTrimId,
  onSelectSpeedId,
  onDragStart,
  onUpdateTimelineTrack,
  timelineTracks,
}) => {
  const showWebcam = Boolean(project?.media?.webcamVideoPath);
  const showPresentation = project?.media?.presentationMode === 'sidecar';
  const showAudio = Boolean(project?.media?.screenVideoPath);
  const showCaptions = Boolean(project?.editor?.annotationRegions?.some((a: any) => a.annotationSource === 'auto-caption'));
  const showEffects = Boolean(
    (project?.editor?.trimRegions?.length ?? 0) > 0 ||
    (project?.editor?.speedRegions?.length ?? 0) > 0 ||
    (project?.editor?.zoomRegions?.length ?? 0) > 0 ||
    project?.editor?.annotationRegions?.some((a: any) => a.annotationSource !== 'auto-caption')
  );

  const activeTracksList: { id: TimelineTrackId; label: string }[] = [
    { id: 'screen', label: 'Screen' },
    ...(showWebcam ? [{ id: 'webcam' as TimelineTrackId, label: 'Camera' }] : []),
    ...(showPresentation ? [{ id: 'presentation' as TimelineTrackId, label: 'Presentation' }] : []),
    ...(showAudio ? [{ id: 'audio' as TimelineTrackId, label: 'Audio' }] : []),
    ...(showCaptions ? [{ id: 'captions' as TimelineTrackId, label: 'Captions' }] : []),
    ...(showEffects ? [{ id: 'effects' as TimelineTrackId, label: 'Effects' }] : []),
  ];

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
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('track-band-content')) {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs));
            onSelectTrimId(null);
            onSelectSpeedId(null);
          }
        }}
      >
        <div style={{ minWidth: `${timelineZoom * 100}%`, position: 'relative', height: '100%' }}>
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
                  style={{ 
                    height: 38, 
                    position: 'relative', 
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    overflow: 'hidden'
                  }}
                >
                  {/* Media Clip Block */}
                  {isScreen && (
                    <div 
                      className="track-clip-block" 
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        right: 0, 
                        top: 2, 
                        bottom: 2, 
                        background: 'rgba(59, 130, 246, 0.15)', 
                        border: '1.5px solid var(--accent)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      Screen Clip ({project?.videoPath ? project.videoPath.split(/[/\\]/).pop() : 'recording.mp4'})
                    </div>
                  )}

                  {isWebcam && (
                    <div 
                      className="track-clip-block" 
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        right: 0, 
                        top: 2, 
                        bottom: 2, 
                        background: 'rgba(139, 92, 246, 0.15)', 
                        border: '1.5px solid #8b5cf6',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      Webcam Clip ({project?.media?.webcamVideoPath?.split(/[/\\]/).pop() || 'camera.mp4'})
                    </div>
                  )}

                  {isPresentation && (
                    <div 
                      className="track-clip-block" 
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        right: 0, 
                        top: 2, 
                        bottom: 2, 
                        background: 'rgba(16, 185, 129, 0.15)', 
                        border: '1.5px solid var(--success)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 10,
                        color: 'var(--text-muted)'
                      }}
                    >
                      Presentation Replay (Sidecar Events)
                    </div>
                  )}

                  {isAudio && (
                    <div 
                      className="track-clip-block" 
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        right: 0, 
                        top: 2, 
                        bottom: 2, 
                        background: 'rgba(245, 158, 11, 0.1)', 
                        border: '1px dashed var(--warning)',
                        borderRadius: 4,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'var(--text-disabled)',
                        letterSpacing: '0.05em'
                      }}
                    >
                      Audio Waveform Unavailable
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
                            onClick={(event) => { event.stopPropagation(); onSelectTrimId(t.id); onSelectSpeedId(null); }}
                            style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%`, zIndex: 10 }}
                            role="button" tabIndex={0}
                            aria-label={`Cut from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                            title="Cut range"
                          >
                            {isSelected && <div className="resize-handle left-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'left', t.startMs, t.endMs)} aria-hidden="true" />}
                            {isSelected && <div className="resize-handle right-handle" onMouseDown={(e) => onDragStart(e, t.id, 'trim', 'right', t.startMs, t.endMs)} aria-hidden="true" />}
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
                            onClick={(event) => { event.stopPropagation(); onSelectSpeedId(region.id); onSelectTrimId(null); }}
                            style={{ left: `${timelinePercent(start, durationMs)}%`, width: `${timelinePercent(end - start, durationMs)}%`, zIndex: 11 }}
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
                    </>
                  )}

                  {/* Zoom regions on effects */}
                  {isEffects && project?.editor?.zoomRegions?.map((z: ZoomRegion) => (
                    <div
                      key={z.id}
                      className="speed-region-visual"
                      style={{ 
                        left: `${timelinePercent(z.startMs, durationMs)}%`, 
                        width: `${timelinePercent(z.endMs - z.startMs, durationMs)}%`,
                        background: 'rgba(59, 130, 246, 0.25)',
                        borderLeft: '2px solid var(--accent)',
                        borderRight: '2px solid var(--accent)'
                      }}
                      title="Zoom region effect"
                    />
                  ))}

                  {/* Caption regions */}
                  {isCaptions && project?.editor?.annotationRegions?.filter((a: any) => a.annotationSource === 'auto-caption').map((c: any) => (
                    <div
                      key={c.id}
                      className="speed-region-visual"
                      style={{
                        left: `${timelinePercent(c.startMs, durationMs)}%`,
                        width: `${timelinePercent(c.endMs - c.startMs, durationMs)}%`,
                        background: 'rgba(255, 209, 102, 0.22)',
                        borderLeft: '2px solid var(--warning)',
                        borderRight: '2px solid var(--warning)',
                      }}
                      title={`Caption: "${c.content}"`}
                    />
                  ))}
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
