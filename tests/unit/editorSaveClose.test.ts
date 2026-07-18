import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { EditorHeader } from '../../src/renderer/editor/EditorHeader';

describe('editor save status and close callbacks', () => {
  it('renders dirty indicators and triggers save/close buttons', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const onSave = vi.fn();
    const onClose = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onExport = vi.fn();
    const onLocaleChange = vi.fn();

    const root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(EditorHeader, {
        projectPath: 'C:\\project.repen',
        saveStatus: 'saving',
        isSaving: false,
        canUndo: true,
        canRedo: false,
        capabilities: {
          mp4Export: { available: true },
          gifExport: { available: true },
        },
        onSave,
        onUndo,
        onRedo,
        onExport,
        onClose,
        onExportDiagnostics: vi.fn(),
        locale: 'en',
        onLocaleChange,
        onResetLayout: vi.fn(),
        t: (key: string) => key,
      })
    );

    // Wait for render cycle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify dirty indicator exists
    const dirty = container.querySelector('.dirty-indicator');
    expect(dirty).not.toBeNull();

    // Verify status text shows saving
    expect(container.textContent?.toLowerCase()).toContain('saving');

    // Find and click buttons
    const buttons = container.querySelectorAll('button');
    // Find the Save button by its aria-label or text
    let saveBtn: HTMLButtonElement | null = null;
    let closeBtn: HTMLButtonElement | null = null;

    buttons.forEach((btn) => {
      const label = btn.getAttribute('aria-label') || '';
      if (label === 'save') saveBtn = btn;
      if (label === 'close') closeBtn = btn;
    });

    expect(saveBtn).not.toBeNull();
    expect(closeBtn).not.toBeNull();

    saveBtn?.click();
    closeBtn?.click();

    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();

    // Clean up
    root.unmount();
    container.remove();
  });
});
