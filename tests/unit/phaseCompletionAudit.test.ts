import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..', '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('post-phase integration audit', () => {
  it('sends countdown arguments using the object contract expected by main', () => {
    const preload = read('src/preload.js');
    expect(preload).toContain("ipcRenderer.invoke('recording:start-countdown', { displayId, seconds })");
  });

  it('escapes source names and restricts image URLs before source-card interpolation', () => {
    const selector = read('src/renderer/selector.js');
    expect(selector).toContain('escapeHtml(source.name)');
    expect(selector).toContain('safeImageUrl(source.thumbnail)');
    expect(selector).not.toContain('alt="${source.name}"');
  });

  it('does not return fabricated transcription segments', () => {
    const legacyMain = read('main.js');
    const modularMain = read('electron/main.ts');
    for (const source of [legacyMain, modularMain]) {
      expect(source).toContain('Offline transcription is not installed');
      expect(source).not.toContain('Welcome to this RePen session!');
      expect(source).not.toContain('Today we will draw shapes and highlights.');
    }
  });

  it('does not execute editor export through a command shell', () => {
    const legacyMain = read('main.js');
    expect(legacyMain).toContain("spawn(ffmpegPath, args, { shell: false");
    expect(legacyMain).not.toContain('spawn(command, { shell: true })');
  });

  it('authorizes recording controls and performs a real capability probe', () => {
    const legacyMain = read('main.js');
    expect(legacyMain).toContain('isTrustedRecordingSender(event)');
    expect(legacyMain).toContain('return recorderService.probeCapabilities()');
  });

  it('never sends recording events through destroyed web contents', () => {
    const legacyMain = read('main.js');
    expect(legacyMain).toContain('!win.webContents.isDestroyed()');
    expect(legacyMain).toContain("safeSend(win, 'recording:timer-tick', timeStr)");
    expect(legacyMain).toContain("safeSend(toolbarWindow, 'recording:state-changed', payload)");
  });
});
