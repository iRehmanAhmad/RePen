import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const cssPath = path.resolve(__dirname, '../../src/renderer/editor.css');
const css = fs.readFileSync(cssPath, 'utf-8');

describe('Phase 6 CSS design-system tokens', () => {
  it('contains --muted: (alias CSS variable)', () => {
    expect(css).toContain('--muted:');
  });

  it('contains --radius-sm:', () => {
    expect(css).toContain('--radius-sm:');
  });

  it('contains --radius-md:', () => {
    expect(css).toContain('--radius-md:');
  });

  it('contains --radius-lg:', () => {
    expect(css).toContain('--radius-lg:');
  });

  it('contains --ease-spring:', () => {
    expect(css).toContain('--ease-spring:');
  });

  it('contains --ease-out:', () => {
    expect(css).toContain('--ease-out:');
  });

  it('contains data-track="screen" selector fragment', () => {
    expect(css).toContain('[data-track="screen"]');
  });

  it('contains data-track="audio" selector fragment', () => {
    expect(css).toContain('[data-track="audio"]');
  });

  it('contains data-track="captions" selector fragment', () => {
    expect(css).toContain('[data-track="captions"]');
  });

  it('contains border-left-color (used by data-track selectors)', () => {
    expect(css).toContain('border-left-color');
  });

  it('contains kbd.shortcut-chip class', () => {
    expect(css).toContain('kbd.shortcut-chip');
  });

  it('contains .resize-handle class', () => {
    expect(css).toContain('.resize-handle');
  });

  it('contains cursor: ew-resize', () => {
    expect(css).toContain('cursor: ew-resize');
  });

  it('contains @keyframes shimmer', () => {
    expect(css).toContain('@keyframes shimmer');
  });

  it('contains .track-clip-block:hover::after (shimmer trigger)', () => {
    expect(css).toContain('.track-clip-block:hover::after');
  });

  it('contains border-top: 8px solid var(--danger) (playhead caret)', () => {
    expect(css).toContain('border-top: 8px solid var(--danger)');
  });

  it('contains .trim-region-visual.selected or .trim-region-visual:hover', () => {
    const hasSelected = css.includes('.trim-region-visual.selected');
    const hasHover = css.includes('.trim-region-visual:hover');
    expect(hasSelected || hasHover).toBe(true);
  });

  it('contains @keyframes pulse-accent', () => {
    expect(css).toContain('@keyframes pulse-accent');
  });
});
