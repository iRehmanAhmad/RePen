import React, { useState } from 'react';
import type { EditorProjectData, TimelineTrackId, TimelineTrackState } from '../../shared/editor/projectPersistence';
import { EditorTimelineToolbar, type EditMode } from './EditorTimelineToolbar';
import { TimelineTracks } from './TimelineTracks';

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
  onSplitTrim: () => void;
  onSelectTrimId: (id: string | null) => void;
  onMarkSpeedStart: () => void;
  onCancelSpeedMark: () => void;
  onAddSpeedRange: () => void;
  onClearSpeedRanges: () => void;
  onSelectSpeedId: (id: string | null) => void;
  onTimelineZoomChange: (v: number) => void;
  onPendingSpeedChange: (v: number) => void;
  onDragStart: (event: React.MouseEvent, id: string, type: 'trim' | 'speed', side: 'left' | 'right', startMs: number, endMs: number) => void;
  onUpdateTimelineTrack: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void;
  timelineTracks: Record<TimelineTrackId, TimelineTrackState>;

  // Additional callbacks for captions inside timeline mode
  selectedCaptionId: string | null;
  onSplitCaption: () => void;
  onMergeCaption: () => void;
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
  onSplitTrim,
  onSelectTrimId,
  onMarkSpeedStart,
  onCancelSpeedMark,
  onAddSpeedRange,
  onClearSpeedRanges,
  onSelectSpeedId,
  onTimelineZoomChange,
  onPendingSpeedChange,
  onDragStart,
  onUpdateTimelineTrack,
  timelineTracks,
  selectedCaptionId,
  onSplitCaption,
  onMergeCaption,
}) => {
  const [editMode, setEditMode] = useState<EditMode>('select');

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
        onEditModeChange={setEditMode}
        onTogglePlay={onTogglePlay}
        onFrameStep={onFrameStep}
        onMute={onMute}
        onVolumeChange={onVolume}
        onPlaybackRateChange={onPlaybackRate}
        onTimelineZoomChange={onTimelineZoomChange}
        trimStartMs={trimStartMs}
        onMarkTrimStart={onMarkTrimStart}
        onCancelTrimMark={onCancelTrimMark}
        onAddTrimRange={onAddTrimRange}
        onClearTrimRanges={onClearTrimRanges}
        onSplitTrim={onSplitTrim}
        selectedTrimId={selectedTrimId}
        speedStartMs={speedStartMs}
        pendingSpeed={pendingSpeed}
        onMarkSpeedStart={onMarkSpeedStart}
        onCancelSpeedMark={onCancelSpeedMark}
        onAddSpeedRange={onAddSpeedRange}
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
          trimStartMs={trimStartMs}
          speedStartMs={speedStartMs}
          draggingRegion={draggingRegion}
          tempResizeState={tempResizeState}
          onSeek={onSeek}
          onSelectTrimId={onSelectTrimId}
          onSelectSpeedId={onSelectSpeedId}
          onDragStart={onDragStart}
          onUpdateTimelineTrack={onUpdateTimelineTrack}
          timelineTracks={timelineTracks}
        />
      </div>
    </footer>
  );
};
