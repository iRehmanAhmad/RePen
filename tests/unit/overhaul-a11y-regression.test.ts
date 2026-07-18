import { describe, expect, it, vi, beforeAll } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { InspectorTabs } from '../../src/renderer/editor/InspectorTabs';
import { EditorTimelineToolbar } from '../../src/renderer/editor/EditorTimelineToolbar';
import { TrackControls } from '../../src/renderer/editor/TrackControls';

beforeAll(() => {
  (window as any).appBridge = { getBootstrap: vi.fn() };
});

// ---------------------------------------------------------------------------
// InspectorTabs — ARIA conformance
// ---------------------------------------------------------------------------
describe('InspectorTabs ARIA conformance', () => {
  it('has role="tablist" and aria-label="Inspector tabs"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'layout',
          onTabChange: vi.fn(),
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    expect(tablist!.getAttribute('aria-label')).toBe('Inspector tabs');

    root.unmount();
    container.remove();
  });

  it('every button has role="tab" and aria-selected', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'layout',
          onTabChange: vi.fn(),
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]');
    const buttons = tablist ? tablist.querySelectorAll('button') : [];
    expect(buttons.length).toBe(5);

    buttons.forEach((btn) => {
      expect(btn.getAttribute('role')).toBe('tab');
      expect(btn.hasAttribute('aria-selected')).toBe(true);
    });

    root.unmount();
    container.remove();
  });

  it('active tab has correct aria-controls and id, tabIndex=0; others tabIndex=-1', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'motion',
          onTabChange: vi.fn(),
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    // Find the active tab button
    const activeBtn = container.querySelector('[aria-selected="true"]') as HTMLButtonElement | null;
    expect(activeBtn).not.toBeNull();
    expect(activeBtn!.getAttribute('aria-controls')).toBe('editor-panel-motion');
    expect(activeBtn!.getAttribute('id')).toBe('editor-tab-motion');
    expect(activeBtn!.tabIndex).toBe(0);

    // Check inactive buttons have tabIndex=-1
    const inactiveBtns = container.querySelectorAll('[aria-selected="false"]');
    inactiveBtns.forEach((btn) => {
      expect((btn as HTMLButtonElement).tabIndex).toBe(-1);
    });

    root.unmount();
    container.remove();
  });
});

// ---------------------------------------------------------------------------
// InspectorTabs — keyboard navigation
// ---------------------------------------------------------------------------
describe('InspectorTabs keyboard navigation', () => {
  it('ArrowRight on tablist calls onTabChange with next tab', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onTabChange = vi.fn();

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'layout',
          onTabChange,
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onTabChange).toHaveBeenCalledWith('motion');

    root.unmount();
    container.remove();
  });

  it('ArrowLeft on tablist wraps to last tab (captions)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onTabChange = vi.fn();

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'layout',
          onTabChange,
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(onTabChange).toHaveBeenCalledWith('captions');

    root.unmount();
    container.remove();
  });

  it('Home key calls onTabChange with "layout" (first)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onTabChange = vi.fn();

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'motion',
          onTabChange,
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(onTabChange).toHaveBeenCalledWith('layout');

    root.unmount();
    container.remove();
  });

  it('End key calls onTabChange with "captions" (last)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onTabChange = vi.fn();

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(InspectorTabs, {
          activeTab: 'layout',
          onTabChange,
          t: (k: string) => k,
          isCompactMode: false,
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const tablist = container.querySelector('[role="tablist"]')!;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(onTabChange).toHaveBeenCalledWith('captions');

    root.unmount();
    container.remove();
  });
});

// ---------------------------------------------------------------------------
// EditorTimelineToolbar — aria-pressed on mode buttons
// ---------------------------------------------------------------------------
describe('EditorTimelineToolbar aria-pressed on mode buttons', () => {
  function makeProps(editMode: string) {
    return {
      isPlaying: false,
      volume: 1,
      isMuted: false,
      currentTimeMs: 0,
      durationMs: 0,
      playbackRate: 1,
      timelineZoom: 1,
      editMode: editMode as any,
      onEditModeChange: vi.fn(),
      onTogglePlay: vi.fn(),
      onFrameStep: vi.fn(),
      onMute: vi.fn(),
      onVolumeChange: vi.fn(),
      onPlaybackRateChange: vi.fn(),
      onTimelineZoomChange: vi.fn(),
      trimStartMs: null,
      onMarkTrimStart: vi.fn(),
      onCancelTrimMark: vi.fn(),
      onAddTrimRange: vi.fn(),
      onClearTrimRanges: vi.fn(),
      onSplitTrim: vi.fn(),
      selectedTrimId: null,
      speedStartMs: null,
      pendingSpeed: 1,
      onMarkSpeedStart: vi.fn(),
      onCancelSpeedMark: vi.fn(),
      onAddSpeedRange: vi.fn(),
      onClearSpeedRanges: vi.fn(),
      onPendingSpeedChange: vi.fn(),
      selectedCaptionId: null,
      onSplitCaption: vi.fn(),
      onMergeCaption: vi.fn(),
    };
  }

  it('Select button has aria-pressed="true" and Cut has aria-pressed="false" when editMode="select"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(React.createElement(EditorTimelineToolbar, makeProps('select')));
    });
    await new Promise((r) => setTimeout(r, 50));

    // Find mode buttons by aria-label containing the mode label
    const allButtons = Array.from(container.querySelectorAll('button[aria-pressed]'));

    const selectBtn = allButtons.find((b) => b.getAttribute('aria-label')?.includes('Select'));
    const cutBtn = allButtons.find((b) => b.getAttribute('aria-label')?.includes('Cut'));

    expect(selectBtn).not.toBeNull();
    expect(selectBtn!.getAttribute('aria-pressed')).toBe('true');

    expect(cutBtn).not.toBeNull();
    expect(cutBtn!.getAttribute('aria-pressed')).toBe('false');

    root.unmount();
    container.remove();
  });

  it('all five mode buttons render: Select, Cut, Speed, Zoom, Caption', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(React.createElement(EditorTimelineToolbar, makeProps('select')));
    });
    await new Promise((r) => setTimeout(r, 50));

    const allButtons = Array.from(container.querySelectorAll('button[aria-pressed]'));
    const labels = allButtons.map((b) => b.getAttribute('aria-label') ?? '');

    expect(labels.some((l) => l.includes('Select'))).toBe(true);
    expect(labels.some((l) => l.includes('Cut'))).toBe(true);
    expect(labels.some((l) => l.includes('Speed'))).toBe(true);
    expect(labels.some((l) => l.includes('Zoom'))).toBe(true);
    expect(labels.some((l) => l.includes('Caption'))).toBe(true);

    root.unmount();
    container.remove();
  });
});

// ---------------------------------------------------------------------------
// TrackControls — ARIA labels
// ---------------------------------------------------------------------------
describe('TrackControls ARIA labels', () => {
  it('visible=true shows "Hide" + trackId; locked=false shows "Lock" + trackId', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(TrackControls, {
          trackId: 'screen' as any,
          state: { visible: true, locked: false },
          onToggle: vi.fn(),
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);

    const visBtn = buttons[0];
    const lockBtn = buttons[1];

    expect(visBtn.getAttribute('aria-label')).toContain('Hide');
    expect(visBtn.getAttribute('aria-label')).toContain('screen');

    expect(lockBtn.getAttribute('aria-label')).toContain('Lock');
    expect(lockBtn.getAttribute('aria-label')).toContain('screen');

    root.unmount();
    container.remove();
  });

  it('visible=false shows "Show"; locked=true shows "Unlock"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await act(async () => {
      root.render(
        React.createElement(TrackControls, {
          trackId: 'screen' as any,
          state: { visible: false, locked: true },
          onToggle: vi.fn(),
        })
      );
    });
    await new Promise((r) => setTimeout(r, 50));

    const buttons = container.querySelectorAll('button');
    const visBtn = buttons[0];
    const lockBtn = buttons[1];

    expect(visBtn.getAttribute('aria-label')).toContain('Show');
    expect(visBtn.getAttribute('aria-label')).toContain('screen');

    expect(lockBtn.getAttribute('aria-label')).toContain('Unlock');
    expect(lockBtn.getAttribute('aria-label')).toContain('screen');

    root.unmount();
    container.remove();
  });
});
