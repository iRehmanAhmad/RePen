import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { InspectorTabs } from '../../src/renderer/editor/InspectorTabs';

beforeAll(() => {
  (window as any).appBridge = {
    getBootstrap: vi.fn(),
  };
});

describe('editor accessibility component', () => {
  it('mounts InspectorTabs and handles keyboard arrow navigation', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let activeTab = 'layout';
    const onTabChange = vi.fn((tab) => { activeTab = tab; });
    const t = (key: string) => key;

    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(InspectorTabs, {
        activeTab: activeTab as any,
        onTabChange,
        t,
        isCompactMode: false,
      })
    );

    // Wait for render cycle
    await new Promise((resolve) => setTimeout(resolve, 50));

    const tabList = container.querySelector('[role="tablist"]');
    expect(tabList).not.toBeNull();

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(5);
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');

    // Simulate keydown ArrowRight on the tablist element
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    tabList?.dispatchEvent(event);

    expect(onTabChange).toHaveBeenCalledWith('motion');

    // Clean up
    root.unmount();
    container.remove();
  });
});
