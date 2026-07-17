/**
 * CompositorPreview — the visual preview panel for the editor.
 *
 * Wraps the main screen video, the webcam overlay video, and the
 * annotation canvas together using layout styles provided by the
 * shared `computeCompositorStyles` function.
 *
 * This component is purely presentational — it owns no state. All
 * data and callbacks come from props.
 */

import React from 'react';
import { computeCompositorStyles } from '../../shared/editor/visualCompositor';
import { toFileUrl } from '../../shared/editor/projectPersistence';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import type { WebcamMaskShape } from '../../shared/editor/types';

interface CompositorPreviewProps {
  project: EditorProjectData;
  currentTimeMs: number;
  sourceVideoWidth: number | null;
  sourceVideoHeight: number | null;
  cursorPosition: { cx: number; cy: number; visible: boolean } | null;
  reducedMotion: boolean;
  mediaMissing: boolean;
  webcamMissing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onTogglePlay: () => void;
  onMetadataLoaded: () => void;
  onMediaError: () => void;
  onWebcamError: () => void;
  onIsPlayingChange: (v: boolean) => void;
  onVolumeChange: (volume: number, muted: boolean) => void;
  onRelink: () => void;
  onRevealMedia: () => void;
  onRemoveMedia: () => void;
  onWebcamNoticeChange: (msg: string) => void;
  timelineTracks: Record<string, { visible: boolean; locked: boolean }>;
}

export const CompositorPreview: React.FC<CompositorPreviewProps> = ({
  project,
  currentTimeMs,
  sourceVideoWidth,
  sourceVideoHeight,
  cursorPosition,
  reducedMotion,
  mediaMissing,
  webcamMissing,
  videoRef,
  webcamVideoRef,
  canvasRef,
  onTogglePlay,
  onMetadataLoaded,
  onMediaError,
  onWebcamError,
  onIsPlayingChange,
  onVolumeChange,
  onRelink,
  onRevealMedia,
  onRemoveMedia,
  onWebcamNoticeChange,
  timelineTracks,
}) => {
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
      <div className="missing-media-overlay">
        <h2>Missing Recording File</h2>
        <p>RePen cannot locate the video assets for this project.</p>
        <button className="btn-primary" onClick={onRelink}>Relink Recording File</button>
        <button className="btn-secondary" onClick={onRevealMedia}>Reveal in Explorer</button>
        <button className="btn-secondary" onClick={onRemoveMedia}>Remove Media Reference</button>
      </div>
    );
  }

  if (!styles) return null;

  return (
    <div style={styles.aspectStyle as React.CSSProperties}>
      <div style={styles.compositorStyle as React.CSSProperties}>
        <div className="crop-viewport" style={styles.viewportStyle as React.CSSProperties}>
          {/* Screen Video */}
          <div className="screen-container" style={styles.mediaStyle as React.CSSProperties}>
            <video
              ref={videoRef}
              src={activeVideoSrc ? toFileUrl(activeVideoSrc) : undefined}
              className="video-element"
              style={{
                ...(styles.cropMediaStyle as React.CSSProperties),
                opacity: timelineTracks.screen?.visible ? 1 : 0,
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
              onError={onMediaError}
            />
            <canvas
              ref={canvasRef}
              className="annotation-canvas"
              style={{
                ...(styles.cropMediaStyle as React.CSSProperties),
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            />

            {/* Cursor Overlay */}
            {cursorPosition?.visible && (
              <div
                className="cursor-overlay"
                style={{
                  position: 'absolute',
                  left: `${cursorPosition.cx * 100}%`,
                  top: `${cursorPosition.cy * 100}%`,
                  width: 20,
                  height: 20,
                  pointerEvents: 'none',
                  zIndex: 100,
                  transform: 'translate(-2px, -2px)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4.5 3V19.5L9.5625 14.4375H17.4375L4.5 3Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>

          {/* Webcam Video */}
          {webcamVideoSrc && timelineTracks.webcam?.visible && editor.webcamLayoutPreset !== 'no-webcam' && !webcamMissing && (
            <video
              ref={webcamVideoRef}
              src={toFileUrl(webcamVideoSrc)}
              className="webcam-video"
              style={styles.webcamStyle as React.CSSProperties}
              muted
              onError={() => {
                onWebcamError();
                onWebcamNoticeChange('Webcam media could not be loaded. Screen editing can continue without it.');
              }}
            />
          )}

          {/* Webcam Missing Placeholder */}
          {editor.webcamLayoutPreset !== 'no-webcam' && (webcamMissing || !webcamVideoSrc) && (
            <div
              className="webcam-missing-placeholder"
              style={{
                ...(styles.webcamStyle as React.CSSProperties),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1f2937',
                color: 'var(--text-muted)',
                border: '1px dashed var(--line)',
                boxSizing: 'border-box',
                fontSize: '11px',
                zIndex: 10,
              }}
            >
              <span>📷 Webcam Unavailable</span>
            </div>
          )}

          {/* Safe Area Guidelines */}
          {(editor as any).showSafeArea && (
            <div className="safe-area-guidelines" aria-hidden="true">
              <div className="safe-area-action" title="Action Safe Area (90%)" />
              <div className="safe-area-title" title="Title Safe Area (93%)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
