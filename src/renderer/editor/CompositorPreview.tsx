import React, { useEffect, useRef } from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { WebcamMaskShape } from '../../shared/editor/types';
import { computeCompositorStyles } from '../../shared/editor/visualCompositor';
import { usePreviewViewport } from './usePreviewViewport';

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
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.match(/^[a-zA-Z]:/)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

const FullscreenIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
);

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
  onTogglePlay,
  onUpdateProject,
  videoRef,
  webcamVideoRef,
  canvasRef,
}) => {
  const compositorRef = useRef<HTMLDivElement | null>(null);

  const hasProject = project !== null;
  const webcamVideoSrcPrimitive = project?.media?.webcamVideoPath || '';
  const layoutPresetPrimitive = project?.editor?.webcamLayoutPreset || 'picture-in-picture';

  const {
    stageRef,
    zoomMode,
    setZoomMode,
    width: previewWidth,
    height: previewHeight,
  } = usePreviewViewport({
    aspectRatio: project?.editor?.aspectRatio || '16:9',
    sourceWidth: sourceVideoWidth,
    sourceHeight: sourceVideoHeight,
  });

  // Handle webcam missing notifications
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

  if (!activeVideoSrc) {
    return (
      <div className="preview-empty-state" role="status">
        <div className="preview-empty-icon" aria-hidden="true">▶</div>
        <h2>Recording not available</h2>
        <p>Reconnect the recording file to edit it, or return to RePen and create a new recording.</p>
        <button className="btn-primary" onClick={onRelink}>Relink Recording File</button>
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
      className={`preview-stage${zoomMode === '100%' ? ' preview-stage--pixel-zoom' : ''}`}
    >
      {/* Compositor Preview Box */}
      {styles && (
        <div
          ref={compositorRef}
          className="compositor-composition-container"
          style={{
            ...(styles.aspectStyle as React.CSSProperties),
            width: previewWidth,
            height: previewHeight,
            maxWidth: zoomMode === '100%' ? 'none' : '100%',
            maxHeight: zoomMode === '100%' ? 'none' : '100%',
          }}
        >
          <div style={{ ...(styles.compositorStyle as React.CSSProperties), width: '100%', height: '100%' }}>
            <div className="crop-viewport" style={styles.viewportStyle as React.CSSProperties}>

              {/* Main Screen Video */}
              <div
                className="screen-container"
                style={{
                  ...(styles.mediaStyle as React.CSSProperties),
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                <video
                  ref={videoRef}
                  src={activeVideoSrc ? toFileUrl(activeVideoSrc) : undefined}
                  className="video-element"
                  style={{
                    ...(styles.cropMediaStyle as React.CSSProperties),
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#000',
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
                  ref={webcamVideoRef}
                  src={toFileUrl(webcamVideoSrc)}
                  className="webcam-video"
                  style={{
                    ...(styles.webcamStyle as React.CSSProperties),
                    opacity: timelineTracks.webcam?.visible !== false ? 1 : 0,
                  }}
                  muted
                  playsInline
                />
              )}

              {/* Canvas Draw layer */}
              <canvas ref={canvasRef} className="annotation-canvas" />

            </div>
          </div>
        </div>
      )}

      <div className="preview-stage-actions" aria-label="Preview actions">
        <button className={`preview-action${zoomMode === 'fit' ? ' active' : ''}`} onClick={() => setZoomMode('fit')} title="Fit preview">Fit</button>
        <button className={`preview-action${zoomMode === '100%' ? ' active' : ''}`} onClick={() => setZoomMode('100%')} title="Preview at source size">100%</button>
        <button className={`preview-action${editor.previewQualityMode === 'performance' ? ' active' : ''}`} onClick={handleToggleQuality} title="Toggle preview quality">HQ</button>
        <button className={`preview-action${editor.showSafeArea ? ' active' : ''}`} onClick={handleToggleSafeArea} title="Toggle title safe guide">Safe</button>
        <button className="preview-action preview-action--icon" onClick={handleFullscreen} title="Fullscreen preview" aria-label="Fullscreen preview"><FullscreenIcon /></button>
      </div>
    </div>
  );
};
