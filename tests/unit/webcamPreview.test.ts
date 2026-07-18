import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { CompositorPreview } from '../../src/renderer/editor/CompositorPreview';

const createMockProject = (webcamPath: string, preset: 'picture-in-picture' | 'no-webcam') => ({
  projectPath: 'C:\\project.repen',
  videoPath: 'C:\\video.mp4',
  media: {
    screenVideoPath: 'C:\\video.mp4',
    webcamVideoPath: webcamPath,
  },
  editor: {
    aspectRatio: '16:9',
    cropRegion: { x: 0, y: 0, width: 1, height: 1 },
    padding: 0,
    borderRadius: 0,
    zoomRegions: [],
    webcamLayoutPreset: preset,
    webcamSizePreset: 25 as any,
    webcamMirrored: false,
    webcamMaskShape: 'rectangle' as any,
    annotationRegions: [],
    trimRegions: [],
    speedRegions: [],
    timelineTracks: {
      screen: { visible: true, locked: false },
      webcam: { visible: true, locked: false },
      presentation: { visible: true, locked: false },
      audio: { visible: true, locked: false },
      captions: { visible: true, locked: false },
      effects: { visible: true, locked: false },
    },
  },
});

describe('webcam preview overlay component', () => {
  it('renders webcam video when webcam is enabled in layout options', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const project = createMockProject('C:\\camera.mp4', 'picture-in-picture');
    const videoRef = React.createRef<HTMLVideoElement>();
    const webcamVideoRef = React.createRef<HTMLVideoElement>();
    const canvasRef = React.createRef<HTMLCanvasElement>();

    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(CompositorPreview, {
        project,
        currentTimeMs: 0,
        sourceVideoWidth: 1920,
        sourceVideoHeight: 1080,
        cursorPosition: null,
        reducedMotion: false,
        mediaMissing: false,
        onMetadataLoaded: vi.fn(),
        onIsPlayingChange: vi.fn(),
        onVolumeChange: vi.fn(),
        onRelink: vi.fn(),
        onRevealMedia: vi.fn(),
        onRemoveMedia: vi.fn(),
        onWebcamNoticeChange: vi.fn(),
        timelineTracks: project.editor.timelineTracks,
        isPlaying: false,
        onTogglePlay: vi.fn(),
        onUpdateProject: vi.fn(),
        videoRef,
        webcamVideoRef,
        canvasRef,
      })
    );

    // Wait for render cycle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify webcam video is rendered
    const webcamVideo = container.querySelector('video.webcam-video');
    expect(webcamVideo).not.toBeNull();
    expect(videoRef.current).toBe(container.querySelector('video.video-element'));
    expect(webcamVideoRef.current).toBe(webcamVideo);
    expect(canvasRef.current).toBe(container.querySelector('canvas.annotation-canvas'));

    // Clean up
    root.unmount();
    container.remove();
  });

  it('hides webcam video when no-webcam layout preset is active', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const project = createMockProject('C:\\camera.mp4', 'no-webcam');
    const videoRef = React.createRef<HTMLVideoElement>();
    const webcamVideoRef = React.createRef<HTMLVideoElement>();
    const canvasRef = React.createRef<HTMLCanvasElement>();

    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(CompositorPreview, {
        project,
        currentTimeMs: 0,
        sourceVideoWidth: 1920,
        sourceVideoHeight: 1080,
        cursorPosition: null,
        reducedMotion: false,
        mediaMissing: false,
        onMetadataLoaded: vi.fn(),
        onIsPlayingChange: vi.fn(),
        onVolumeChange: vi.fn(),
        onRelink: vi.fn(),
        onRevealMedia: vi.fn(),
        onRemoveMedia: vi.fn(),
        onWebcamNoticeChange: vi.fn(),
        timelineTracks: project.editor.timelineTracks,
        isPlaying: false,
        onTogglePlay: vi.fn(),
        onUpdateProject: vi.fn(),
        videoRef,
        webcamVideoRef,
        canvasRef,
      })
    );

    // Wait for render cycle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify webcam video is NOT rendered
    const webcamVideo = container.querySelector('video.webcam-video');
    expect(webcamVideo).toBeNull();
    expect(videoRef.current).toBe(container.querySelector('video.video-element'));
    expect(webcamVideoRef.current).toBeNull();

    // Clean up
    root.unmount();
    container.remove();
  });
});
