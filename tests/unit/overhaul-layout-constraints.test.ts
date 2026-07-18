import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { useResizableEditorLayout } from '../../src/renderer/editor/useResizableEditorLayout';

// Module-level ref that the TestHook component populates on every render.
// Tests read/write via this ref after mount.
let layoutRef: ReturnType<typeof useResizableEditorLayout> | null = null;

function TestHook() {
  const layout = useResizableEditorLayout();
  // Store the latest layout object so tests can call handlers on it
  layoutRef = layout;
  return React.createElement('div', {
    'data-inspector-width': layout.inspectorWidth,
    'data-timeline-height': layout.timelineHeight,
  });
}

// Helper: mount the hook component, return { root, container }
async function mountHook(): Promise<{
  root: ReactDOM.Root;
  container: HTMLDivElement;
}> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  await act(async () => {
    root.render(React.createElement(TestHook));
  });
  await new Promise((r) => setTimeout(r, 50));
  return { root, container };
}

async function unmountHook(root: ReactDOM.Root, container: HTMLDivElement) {
  root.unmount();
  container.remove();
  layoutRef = null;
}

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - localStorage versioned key persistence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('reads inspectorWidth from repen.editor.layout.v1.inspectorWidth', async () => {
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', '380');
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-inspector-width]');
    expect(div!.getAttribute('data-inspector-width')).toBe('380');

    await unmountHook(root, container);
  });

  it('reads timelineHeight from repen.editor.layout.v1.timelineHeight', async () => {
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', '260');
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-timeline-height]');
    expect(div!.getAttribute('data-timeline-height')).toBe('260');

    await unmountHook(root, container);
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - default fallback values', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('inspectorWidth defaults to 340 when localStorage is empty', async () => {
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-inspector-width]');
    expect(div!.getAttribute('data-inspector-width')).toBe('340');

    await unmountHook(root, container);
  });

  it('timelineHeight defaults to the compact 240px workspace height when localStorage is empty', async () => {
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-timeline-height]');
    expect(div!.getAttribute('data-timeline-height')).toBe('240');

    await unmountHook(root, container);
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - width clamping', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('clamps inspectorWidth to default 340 when stored value 9999 is out of range 300-440', async () => {
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', '9999');
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-inspector-width]');
    expect(div!.getAttribute('data-inspector-width')).toBe('340');

    await unmountHook(root, container);
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - height minimum clamping', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('clamps timelineHeight to the compact default when stored value 50 is below the minimum', async () => {
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', '50');
    const { root, container } = await mountHook();

    const div = container.querySelector('[data-timeline-height]');
    expect(div!.getAttribute('data-timeline-height')).toBe('240');

    await unmountHook(root, container);
  });

  it('clamps a persisted timeline height to the live viewport maximum on startup', async () => {
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 720 });
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', '700');

    const { root, container } = await mountHook();
    const div = container.querySelector('[data-timeline-height]');
    expect(div!.getAttribute('data-timeline-height')).toBe('244');

    await unmountHook(root, container);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - resetLayout', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('resetLayout restores defaults and clears localStorage', async () => {
    // Start with custom values
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', '400');
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', '350');

    const { root, container } = await mountHook();

    // Call resetLayout inside act so React processes the state update
    await act(async () => {
      layoutRef!.resetLayout();
    });
    await new Promise((r) => setTimeout(r, 50));

    const div = container.querySelector('[data-inspector-width]');
    expect(div!.getAttribute('data-inspector-width')).toBe('340');
    expect(div!.getAttribute('data-timeline-height')).toBe('240');

    // localStorage should be cleared
    expect(localStorage.getItem('repen.editor.layout.v1.inspectorWidth')).toBeNull();
    expect(localStorage.getItem('repen.editor.layout.v1.timelineHeight')).toBeNull();

    await unmountHook(root, container);
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - keyboard step for inspector', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('ArrowLeft widens inspector from 340 to 350', async () => {
    const { root, container } = await mountHook();

    // Default width is 340; ArrowLeft adds step=10 → 350
    const syntheticEvent = {
      key: 'ArrowLeft',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    await act(async () => {
      layoutRef!.handleInspectorKeyDown(syntheticEvent);
    });
    await new Promise((r) => setTimeout(r, 50));

    const div = container.querySelector('[data-inspector-width]');
    expect(div!.getAttribute('data-inspector-width')).toBe('350');

    await unmountHook(root, container);
  });
});

// ---------------------------------------------------------------------------
describe('useResizableEditorLayout - keyboard step for timeline', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('ArrowUp increases the compact timeline height within the viewport bound', async () => {
    const { root, container } = await mountHook();

    // The compact default is 240; ArrowUp adds 10px while staying within the viewport bound.
    const syntheticEvent = {
      key: 'ArrowUp',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    await act(async () => {
      layoutRef!.handleTimelineKeyDown(syntheticEvent);
    });
    await new Promise((r) => setTimeout(r, 50));

    const div = container.querySelector('[data-timeline-height]');
    expect(div!.getAttribute('data-timeline-height')).toBe('250');

    await unmountHook(root, container);
  });
});
