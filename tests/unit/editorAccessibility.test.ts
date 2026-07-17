import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.css'), 'utf8');
const editor = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.tsx'), 'utf8');

describe('editor accessibility baseline', () => {
  it('provides visible keyboard focus and honors reduced-motion preferences', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps timeline controls accessible by name', () => {
    expect(editor).toContain('aria-label="Zoom timeline to fit"');
    expect(editor).toContain('aria-label="Playback speed"');
    expect(editor).toContain('aria-label="Volume"');
  });

  it('uses the tab pattern and labels modal workflows', () => {
    expect(editor).toContain('aria-selected={activeTab === tab.id}');
    expect(editor).toContain('aria-controls={`editor-panel-${tab.id}`}');
    expect(editor).toContain('role="tabpanel"');
    expect(editor).toContain("event.key === 'ArrowRight'");
    expect(editor).toContain('aria-label="Export progress"');
    expect(editor).toContain('aria-label="RePen Editor tutorial"');
  });
});
