import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { CompositorPreview } from '../../src/renderer/editor/CompositorPreview';

describe('missing recording media recovery component', () => {
  it('renders recovery overlay and responds to button clicks', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const onRelink = vi.fn();
    const onRevealMedia = vi.fn();
    const onRemoveMedia = vi.fn();

    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(CompositorPreview, {
        project: {
          projectPath: 'C:\\project.repen',
          videoPath: 'C:\\video.mp4',
          editor: {
            aspectRatio: '16:9',
            cropRegion: { x: 0, y: 0, width: 1, height: 1 },
            padding: 0,
            borderRadius: 0,
            zoomRegions: [],
            webcamLayoutPreset: 'no-webcam',
            webcamSizePreset: 25,
            webcamMirrored: false,
            webcamMaskShape: 'rectangle',
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
        },
        currentTimeMs: 0,
        sourceVideoWidth: 1920,
        sourceVideoHeight: 1080,
        cursorPosition: null,
        reducedMotion: false,
        mediaMissing: true,
        onMetadataLoaded: vi.fn(),
        onIsPlayingChange: vi.fn(),
        onVolumeChange: vi.fn(),
        onRelink,
        onRevealMedia,
        onRemoveMedia,
        onWebcamNoticeChange: vi.fn(),
        timelineTracks: {
          screen: { visible: true, locked: false },
          webcam: { visible: true, locked: false },
          presentation: { visible: true, locked: false },
          audio: { visible: true, locked: false },
          captions: { visible: true, locked: false },
          effects: { visible: true, locked: false },
        },
        isPlaying: false,
        onTogglePlay: vi.fn(),
        onUpdateProject: vi.fn(),
        videoRef: React.createRef<HTMLVideoElement>(),
        webcamVideoRef: React.createRef<HTMLVideoElement>(),
        canvasRef: React.createRef<HTMLCanvasElement>(),
      })
    );

    // Wait for render cycle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify recovery title is visible
    expect(container.textContent).toContain('Missing Recording File');

    // Click Relink buttons
    const buttons = container.querySelectorAll('button');
    let relinkBtn: HTMLButtonElement | null = null;
    let revealBtn: HTMLButtonElement | null = null;
    let removeBtn: HTMLButtonElement | null = null;

    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Relink')) relinkBtn = btn;
      if (btn.textContent?.includes('Reveal')) revealBtn = btn;
      if (btn.textContent?.includes('Remove')) removeBtn = btn;
    });

    expect(relinkBtn).not.toBeNull();
    expect(revealBtn).not.toBeNull();
    expect(removeBtn).not.toBeNull();

    relinkBtn?.click();
    revealBtn?.click();
    removeBtn?.click();

    expect(onRelink).toHaveBeenCalled();
    expect(onRevealMedia).toHaveBeenCalled();
    expect(onRemoveMedia).toHaveBeenCalled();

    // Clean up
    root.unmount();
    container.remove();
  });
});
