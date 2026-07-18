import { describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { TimelineTracks } from '../../src/renderer/editor/TimelineTracks';

const timelineTracks = {
  screen: { visible: true, locked: false },
  webcam: { visible: true, locked: false },
  presentation: { visible: true, locked: false },
  audio: { visible: true, locked: false },
  captions: { visible: true, locked: false },
  effects: { visible: true, locked: false },
};

function project(overrides: Record<string, unknown> = {}) {
  return {
    videoPath: 'C:\\recording.mp4',
    media: { screenVideoPath: 'C:\\recording.mp4' },
    editor: {
      annotationRegions: [],
      trimRegions: [],
      speedRegions: [],
      zoomRegions: [],
      ...overrides,
    },
  } as any;
}

function props(editMode: 'select' | 'cut' | 'speed' | 'zoom' | 'caption', projectData = project()) {
  return {
    project: projectData,
    currentTimeMs: 0,
    durationMs: 10_000,
    timelineZoom: 1,
    timelineTicks: [0, 5_000, 10_000],
    selectedTrimId: null,
    selectedSpeedId: null,
    selectedZoomId: null,
    selectedCaptionId: null,
    trimStartMs: null,
    speedStartMs: null,
    draggingRegion: null,
    tempResizeState: null,
    onSeek: vi.fn(),
    onSelectTrimId: vi.fn(),
    onSelectSpeedId: vi.fn(),
    onSelectZoomId: vi.fn(),
    onSelectCaptionId: vi.fn(),
    onDragStart: vi.fn(),
    onUpdateTimelineTrack: vi.fn(),
    timelineTracks,
    editMode,
    onTimelineTrackClick: vi.fn(),
  } as any;
}

async function renderTracks(componentProps: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  await act(async () => root.render(React.createElement(TimelineTracks, componentProps)));
  return { container, root };
}

describe('timeline runtime rendering', () => {
  it('shows an honest unavailable audio state rather than a fabricated waveform', async () => {
    const { container, root } = await renderTracks(props('select'));
    const audioTrack = container.querySelector('[data-track="audio"]');
    expect(audioTrack?.textContent).toContain('Audio waveform unavailable');
    expect(audioTrack?.querySelector('svg')).toBeNull();
    root.unmount();
    container.remove();
  });

  it('exposes an empty effects track while Zoom mode is active', async () => {
    const { container, root } = await renderTracks(props('zoom'));
    expect(container.querySelector('[data-track="effects"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it('exposes an empty captions track while Caption mode is active', async () => {
    const { container, root } = await renderTracks(props('caption'));
    expect(container.querySelector('[data-track="captions"]')).not.toBeNull();
    root.unmount();
    container.remove();
  });

  it('passes the measured timeline canvas width when a trim handle starts dragging', async () => {
    const onDragStart = vi.fn();
    const componentProps = props('select', project({ trimRegions: [{ id: 'trim-1', startMs: 1_000, endMs: 2_000 }] }));
    componentProps.selectedTrimId = 'trim-1';
    componentProps.onDragStart = onDragStart;
    const { container, root } = await renderTracks(componentProps);
    const canvas = container.querySelector('.timeline-canvas') as HTMLDivElement;
    canvas.getBoundingClientRect = () => ({ width: 640 } as DOMRect);
    (container.querySelector('.left-handle') as HTMLDivElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onDragStart).toHaveBeenCalledWith(expect.anything(), 'trim-1', 'trim', 'left', 1_000, 2_000, 640);
    root.unmount();
    container.remove();
  });
});
