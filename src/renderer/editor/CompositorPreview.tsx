import React, { useState, useEffect, useRef } from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { WebcamMaskShape } from '../../shared/editor/types';
import { computeCompositorStyles } from '../../shared/editor/visualCompositor';
import { fitCompositionToBounds } from '../../shared/editor/layoutGeometry';

interface CompositorPreviewProps {
  project: EditorProjectData | null;
  currentTimeMs: number;
  sourceVideoWidth: number | null;
  sourceVideoHeight: number | null;
  cursorPosition: { cx: number; cy: number; visible: boolean } | null;
  reducedMotion: boolean;
  mediaMissing: boolean;
  onMetadataLoaded: () => void;
  onIsPlayingChange: (playing: boolean) => void;
  onVolumeChange: (vol: number, muted: boolean) => void;
  onRelink: () => void;
  onRevealMedia: () => void;
  onRemoveMedia: () => void;
  onWebcamNoticeChange: (notice: string | null) => void;
  timelineTracks: Record<string, { visible: boolean; locked: boolean }>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdateProject: (next: EditorProjectData) => void;
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.match(/^[a-zA-Z]:/)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
);

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
);

const FullscreenIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
);

function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

export const CompositorPreview: React.FC<CompositorPreviewProps> = ({
  project,
  currentTimeMs,
  sourceVideoWidth,
  sourceVideoHeight,
  cursorPosition,
  reducedMotion,
  mediaMissing,
  onMetadataLoaded,
  onIsPlayingChange,
  onVolumeChange,
  onRelink,
  onRevealMedia,
  onRemoveMedia,
  onWebcamNoticeChange,
  timelineTracks,
  isPlaying,
  onTogglePlay,
  onUpdateProject,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const compositorRef = useRef<HTMLDivElement | null>(null);

  // Responsive stage state
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(450);

  // ResizeObserver to calculate available stage bounds
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setStageWidth(width || 800);
        setStageHeight(height || 450);
      }
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Handle webcam missing notifications
  const hasProject = project !== null;
  const webcamVideoSrcPrimitive = project?.media?.webcamVideoPath || '';
  const layoutPresetPrimitive = project?.editor?.webcamLayoutPreset || 'picture-in-picture';

  useEffect(() => {
    if (!hasProject) {
      onWebcamNoticeChange(null);
      return;
    }
    if (webcamVideoSrcPrimitive && !mediaMissing) {
      onWebcamNoticeChange(null);
    } else if (layoutPresetPrimitive !== 'no-webcam' && !webcamVideoSrcPrimitive) {
      onWebcamNoticeChange('Screen editing can continue without it.');
    } else {
      onWebcamNoticeChange(null);
    }
  }, [hasProject, webcamVideoSrcPrimitive, layoutPresetPrimitive, mediaMissing, onWebcamNoticeChange]);

  if (!project) {
    return (
      <div className="editor-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Loading project...
      </div>
    );
  }

  const editor = project.editor;

  // Fit composition bounds
  const fitResult = fitCompositionToBounds(
    stageWidth,
    stageHeight,
    editor.aspectRatio,
    sourceVideoWidth,
    sourceVideoHeight,
    32
  );

  const styles = editor
    ? computeCompositorStyles({
        aspectRatio: editor.aspectRatio,
        sourceWidth: sourceVideoWidth ?? undefined,
        sourceHeight: sourceVideoHeight ?? undefined,
        cropRegion: editor.cropRegion,
        padding: editor.padding,
        borderRadius: editor.borderRadius,
        shadowIntensity: (editor as any).shadowIntensity,
        wallpaper: (editor as any).wallpaper,
        currentTimeMs,
        zoomRegions: editor.zoomRegions,
        webcamLayoutPreset: editor.webcamLayoutPreset,
        webcamSizePreset: editor.webcamSizePreset,
        webcamPosition: editor.webcamPosition ?? undefined,
        webcamMirrored: editor.webcamMirrored,
        webcamMaskShape: editor.webcamMaskShape as WebcamMaskShape,
        previewQualityMode: (editor as any).previewQualityMode,
        cursorPosition: cursorPosition ?? undefined,
        reducedMotion,
      })
    : null;

  const activeVideoSrc = (project as any).media?.screenVideoPath || (project as any).videoPath || '';
  const webcamVideoSrc = (project as any).media?.webcamVideoPath || '';

  if (mediaMissing) {
    return (
      <div className="missing-media-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <h2>Missing Recording File</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>RePen cannot locate the video assets for this project.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={onRelink}>Relink Recording File</button>
          <button className="btn-secondary" onClick={onRevealMedia}>Reveal in Explorer</button>
          <button className="btn-secondary" onClick={onRemoveMedia}>Remove Media Reference</button>
        </div>
      </div>
    );
  }

  const handleFullscreen = () => {
    if (compositorRef.current) {
      void compositorRef.current.requestFullscreen();
    }
  };

  const handleToggleSafeArea = () => {
    const nextProject = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    nextProject.editor.showSafeArea = !editor.showSafeArea;
    onUpdateProject(nextProject);
  };

  const handleToggleQuality = () => {
    const nextProject = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    const current = (editor as any).previewQualityMode || 'high-quality';
    (nextProject.editor as any).previewQualityMode = current === 'high-quality' ? 'performance' : 'high-quality';
    onUpdateProject(nextProject);
  };

  return (
    <div
      ref={stageRef}
      className="preview-panel"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 32,
        boxSizing: 'border-box'
      }}
    >
      {/* Compositor Preview Box */}
      {styles && (
        <div
          ref={compositorRef}
          className="compositor-composition-container"
          style={{
            ...(styles.aspectStyle as React.CSSProperties),
            width: fitResult.width,
            height: fitResult.height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div style={{ ...(styles.compositorStyle as React.CSSProperties), width: '100%', height: '100%' }}>
            <div className="crop-viewport" style={styles.viewportStyle as React.CSSProperties}>

              {/* Main Screen Video */}
              <div className="screen-container" style={styles.mediaStyle as React.CSSProperties}>
                <video
                  ref={videoRef}
                  src={activeVideoSrc ? toFileUrl(activeVideoSrc) : undefined}
                  className="video-element"
                  style={{
                    ...(styles.cropMediaStyle as React.CSSProperties),
                    opacity: timelineTracks.screen?.visible !== false ? 1 : 0,
                  }}
                  onLoadedMetadata={onMetadataLoaded}
                  onPlay={() => onIsPlayingChange(true)}
                  onPause={() => onIsPlayingChange(false)}
                  onEnded={() => onIsPlayingChange(false)}
                  onVolumeChange={() => {
                    if (videoRef.current) {
                      onVolumeChange(videoRef.current.volume, videoRef.current.muted);
                    }
                  }}
                  onClick={onTogglePlay}
                />
              </div>

              {/* Safe Area Dotted Border overlay */}
              {editor.showSafeArea && (
                <div
                  className="safe-area-overlay"
                  style={{
                    position: 'absolute',
                    top: '5%',
                    left: '5%',
                    right: '5%',
                    bottom: '5%',
                    border: '1.5px dashed rgba(59, 130, 246, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}
                />
              )}

              {/* Webcam Overlay video */}
              {webcamVideoSrc && editor.webcamLayoutPreset !== 'no-webcam' && (
                <video
                  src={toFileUrl(webcamVideoSrc)}
                  className="webcam-video"
                  style={{
                    ...(styles.webcamStyle as React.CSSProperties),
                    opacity: timelineTracks.webcam?.visible !== false ? 1 : 0,
                  }}
                  autoPlay
                  loop
                  muted
                />
              )}

              {/* Canvas Draw layer */}
              <canvas className="annotation-canvas" />

            </div>
          </div>
        </div>
      )}

      {/* Floating control overlay at bottom center */}
      <div
        className="preview-floating-bar"
        style={{
          position: 'absolute',
          bottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 16px',
          borderRadius: 24,
          background: 'rgba(15, 17, 26, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--line-strong)',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          userSelect: 'none'
        }}
      >
        <button
          className="timeline-control"
          onClick={onTogglePlay}
          style={{ width: 24, height: 24, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text)' }}>
          {formatTimecode(currentTimeMs)}
        </span>

        <div style={{ width: 1, height: 12, background: 'var(--line)' }} />

        {/* Fit / 100% scale */}
        <button
          className="timeline-control"
          style={{ padding: '3px 8px', fontSize: 10 }}
          onClick={() => {
            const nextProject = JSON.parse(JSON.stringify(project)) as EditorProjectData;
            nextProject.editor.padding = 0;
            onUpdateProject(nextProject);
          }}
          title="Fit view composition"
        >
          Fit
        </button>

        <button
          className="timeline-control"
          style={{ padding: '3px 8px', fontSize: 10 }}
          onClick={() => {
            const nextProject = JSON.parse(JSON.stringify(project)) as EditorProjectData;
            nextProject.editor.padding = 16;
            onUpdateProject(nextProject);
          }}
          title="Zoom to scale margin"
        >
          100%
        </button>

        <div style={{ width: 1, height: 12, background: 'var(--line)' }} />

        {/* Quality Mode */}
        <button
          className="timeline-control"
          style={{ padding: '3px 8px', fontSize: 10 }}
          onClick={handleToggleQuality}
          title="Toggle preview rendering quality"
        >
          {editor.previewQualityMode === 'performance' ? 'Perf' : 'HQ'}
        </button>

        {/* Safe Area */}
        <button
          className={`timeline-control ${editor.showSafeArea ? 'active' : ''}`}
          style={{ padding: '3px 8px', fontSize: 10, background: editor.showSafeArea ? 'var(--surface-3)' : 'transparent' }}
          onClick={handleToggleSafeArea}
          title="Toggle Title Safe Guide"
        >
          Safe
        </button>

        <div style={{ width: 1, height: 12, background: 'var(--line)' }} />

        {/* Fullscreen */}
        <button
          className="timeline-control"
          onClick={handleFullscreen}
          style={{ width: 24, height: 24, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
          title="Fullscreen preview"
          aria-label="Fullscreen"
        >
          <FullscreenIcon />
        </button>
      </div>
    </div>
  );
};
