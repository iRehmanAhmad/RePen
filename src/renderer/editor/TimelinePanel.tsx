import React from 'react';
import type { EditorProjectData, TimelineTrackId, TimelineTrackState } from '../../shared/editor/projectPersistence';
import { EditorTimelineToolbar, type EditMode } from './EditorTimelineToolbar';
import { TimelineTracks } from './TimelineTracks';

interface DraggingRegion {
  id: string;
  type: 'trim' | 'speed';
  side: 'left' | 'right';
  initialX: number;
  timelineCanvasWidth: number;
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
  selectedZoomId: string | null;
  selectedCaptionId: string | null;
  trimStartMs: number | null;
  speedStartMs: number | null;
  pendingSpeed: number;
  draggingRegion: DraggingRegion | null;
  tempResizeState: { startMs: number; endMs: number } | null;
  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
  onTogglePlay: () => void;
  onFrameStep: (direction: -1 | 1) => void;
  onSeek: (ms: number) => void;
  onPlaybackRate: (rate: number) => void;
  onVolume: (v: number) => void;
  onMute: () => void;
  onMarkTrimStart: () => void;
  onCancelTrimMark: () => void;
  onClearTrimRanges: () => void;
  onSplitTrim: () => void;
  onSelectTrimId: (id: string | null) => void;
  onMarkSpeedStart: () => void;
  onCancelSpeedMark: () => void;
  onClearSpeedRanges: () => void;
  onSelectSpeedId: (id: string | null) => void;
  onSelectZoomId: (id: string | null) => void;
  onSelectCaptionId: (id: string | null) => void;
  onTimelineZoomChange: (v: number) => void;
  onPendingSpeedChange: (v: number) => void;
  onDragStart: (event: React.MouseEvent, id: string, type: 'trim' | 'speed', side: 'left' | 'right', startMs: number, endMs: number, timelineCanvasWidth: number) => void;
  onUpdateTimelineTrack: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
  timelineTracks: Record<TimelineTrackId, TimelineTrackState>;

  // Additional callbacks for captions inside timeline mode
  onSplitCaption: () => void;
  onMergeCaption: () => void;
  onTimelineTrackClick: (trackId: TimelineTrackId, timeMs: number, mode: EditMode) => void;
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
  selectedZoomId,
  selectedCaptionId,
  trimStartMs,
  speedStartMs,
  pendingSpeed,
  draggingRegion,
  tempResizeState,
  editMode,
  onEditModeChange,
  onTogglePlay,
  onFrameStep,
  onSeek,
  onPlaybackRate,
  onVolume,
  onMute,
  onMarkTrimStart,
  onCancelTrimMark,
  onClearTrimRanges,
  onSplitTrim,
  onSelectTrimId,
  onMarkSpeedStart,
  onCancelSpeedMark,
  onClearSpeedRanges,
  onSelectSpeedId,
  onSelectZoomId,
  onSelectCaptionId,
  onTimelineZoomChange,
  onPendingSpeedChange,
  onDragStart,
  onUpdateTimelineTrack,
  timelineTracks,
  onSplitCaption,
  onMergeCaption,
  onTimelineTrackClick,
}) => {
  return (
    <footer className="timeline-panel" role="contentinfo" style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      {/* Editor Timeline Toolbar */}
      <EditorTimelineToolbar
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        playbackRate={playbackRate}
        timelineZoom={timelineZoom}
        editMode={editMode}
        onEditModeChange={onEditModeChange}
        onTogglePlay={onTogglePlay}
        onFrameStep={onFrameStep}
        onMute={onMute}
        onVolumeChange={onVolume}
        onPlaybackRateChange={onPlaybackRate}
        onTimelineZoomChange={onTimelineZoomChange}
        trimStartMs={trimStartMs}
        onMarkTrimStart={onMarkTrimStart}
        onCancelTrimMark={onCancelTrimMark}
        onClearTrimRanges={onClearTrimRanges}
        onSplitTrim={onSplitTrim}
        selectedTrimId={selectedTrimId}
        speedStartMs={speedStartMs}
        pendingSpeed={pendingSpeed}
        onMarkSpeedStart={onMarkSpeedStart}
        onCancelSpeedMark={onCancelSpeedMark}
        onClearSpeedRanges={onClearSpeedRanges}
        onPendingSpeedChange={onPendingSpeedChange}
        selectedCaptionId={selectedCaptionId}
        onSplitCaption={onSplitCaption}
        onMergeCaption={onMergeCaption}
      />

      {/* Timeline tracks rendering space */}
      <div className="timeline-scroll" style={{ flex: 1, minHeight: 0 }}>
        <TimelineTracks
          project={project}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          timelineZoom={timelineZoom}
          timelineTicks={timelineTicks}
          selectedTrimId={selectedTrimId}
          selectedSpeedId={selectedSpeedId}
          selectedZoomId={selectedZoomId}
          selectedCaptionId={selectedCaptionId}
          trimStartMs={trimStartMs}
          speedStartMs={speedStartMs}
          draggingRegion={draggingRegion}
          tempResizeState={tempResizeState}
          onSeek={onSeek}
          onSelectTrimId={onSelectTrimId}
          onSelectSpeedId={onSelectSpeedId}
          onSelectZoomId={onSelectZoomId}
          onSelectCaptionId={onSelectCaptionId}
          onDragStart={onDragStart}
          onUpdateTimelineTrack={onUpdateTimelineTrack}
          timelineTracks={timelineTracks}
          editMode={editMode}
          onTimelineTrackClick={onTimelineTrackClick}
        />
      </div>
    </footer>
  );
};
