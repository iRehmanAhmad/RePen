import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { usePreviewViewport } from '../../src/renderer/editor/usePreviewViewport';

describe('usePreviewViewport hook', () => {
  it('initializes with fit zoomMode and computes bounds', async () => {
    const TestComponent = () => {
      const { zoomMode, setZoomMode, width, height } = usePreviewViewport({
        aspectRatio: '16:9',
        sourceWidth: 1920,
        sourceHeight: 1080,
      });

      return React.createElement('div', {
        'data-zoom': zoomMode,
        'data-width': width,
        'data-height': height,
        onClick: () => setZoomMode('100%'),
      });
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(React.createElement(TestComponent));
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const element = container.querySelector('div');
    expect(element).not.toBeNull();
    expect(element?.getAttribute('data-zoom')).toBe('fit');

    // In fit mode with default stage size (800x450), fit result will compute widescreen bounds
    const initialWidth = parseInt(element?.getAttribute('data-width') || '0', 10);
    expect(initialWidth).toBeGreaterThan(0);

    // Switch to 100% zoomMode
    await act(async () => {
      element?.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(element?.getAttribute('data-zoom')).toBe('100%');
    expect(parseInt(element?.getAttribute('data-width') || '0', 10)).toBe(1920);
    expect(parseInt(element?.getAttribute('data-height') || '0', 10)).toBe(1080);

    root.unmount();
    container.remove();
  });
});
