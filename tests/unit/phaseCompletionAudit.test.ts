import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { useResizableEditorLayout } from '../../src/renderer/editor/useResizableEditorLayout';

const root = path.resolve(__dirname, '..', '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

beforeAll(() => {
  (window as any).appBridge = {
    getBootstrap: vi.fn(),
  };
});

describe('post-phase integration audit', () => {
  it('sends countdown arguments using the object contract expected by main', () => {
    const preload = read('src/preload.js');
    expect(preload).toContain("ipcRenderer.invoke('recording:start-countdown', { displayId, seconds })");
  });

  it('lets recording:start own the countdown-to-starting transition', () => {
    const legacyMain = read('main.js');
    const closeCountdownHandler = legacyMain.slice(
      legacyMain.indexOf("ipcMain.handle('recording:close-countdown'"),
      legacyMain.indexOf("ipcMain.handle('recording:start'"),
    );
    expect(closeCountdownHandler).not.toContain("currentRecordingPhase = 'starting'");
    expect(legacyMain).toContain("canRunRecordingCommand(currentRecordingPhase, 'start')");
  });

  it('keeps setup in selecting until the countdown transition dismisses it', () => {
    const selector = read('src/renderer/selector.js');
    const selectorStartFlow = selector.slice(
      selector.indexOf('async function startRecordingFlow()'),
      selector.indexOf("window.addEventListener('DOMContentLoaded'"),
    );
    const legacyMain = read('main.js');
    const countdownHandler = legacyMain.slice(
      legacyMain.indexOf("ipcMain.handle('recording:start-countdown'"),
      legacyMain.indexOf("ipcMain.handle('recording:close-countdown'"),
    );
    expect(selectorStartFlow).toContain('window.appBridge.startCountdown(recordingOptions.displayId, 3)');
    expect(selectorStartFlow).not.toContain('window.appBridge.closeRecordingSetup()');
    expect(countdownHandler).toContain("currentRecordingPhase = 'countdown'");
    expect(countdownHandler).toContain('hideSelectorWindow()');
  });

  it('restores the setup surface with an actionable native-start error', () => {
    const selector = read('src/renderer/selector.js');
    expect(selector).toContain('await window.appBridge.openRecordingSetup()');
    expect(selector).toContain('Recording failed to start: ${error}');
    expect(selector).not.toContain('alert(`Recording failed to start: ${startRes.error}`)');
  });

  it('loads subsequent recordings into an editor through the preload bridge', () => {
    const preload = read('src/preload.js');
    expect(preload).toContain("onEditorLoadProject: (callback) => on('editor:load-project', callback)");
  });

  it('does not shorten the native finalization timeout while output is growing', () => {
    const recorder = read('electron/services/recorder.ts');
    expect(recorder).toContain('const STOP_HARD_TIMEOUT_MS = 10 * 60_000');
    expect(recorder).toContain('this.stopWaiter.extendTimeout?.(inactivityTimeout)');
    expect(recorder).toContain('Math.min(STOP_TIMEOUT_MS, hardDeadlineRemaining)');
    expect(recorder).not.toContain('this.stopWaiter.extendTimeout?.(5000)');
  });

  it('uses a runtime project factory available in npm and packaged layouts', () => {
    const legacyMain = read('main.js');
    expect(legacyMain).toContain("require('./src/shared/editor/projectFactory.js')");
    expect(legacyMain).not.toContain("require('./dist-electron/shared/editor/projectPersistence.js')");
    expect(read('src/shared/editor/projectFactory.js')).toContain('function createRecordingProject(media)');
  });

  it('builds the React editor before npm start instead of loading raw TSX', () => {
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.main).toBe('main.js');
    expect(packageJson.scripts.prestart).toBe('npm run build:all');
    expect(packageJson.scripts.start).toBe('electron .');
    expect(read('main.js')).toContain("path.join(__dirname, 'dist-renderer', 'editor.html')");
  });

  it('uses the shared fail-closed capability contract in both Electron entry points', () => {
    const legacyMain = read('main.js');
    const modularMain = read('electron/main.ts');
    for (const source of [legacyMain, modularMain]) {
      expect(source).toContain("createAppCapabilities({ recorder: recorderCapabilities })");
      expect(source).toContain('await recorderService.probeCapabilities()');
    }
    expect(legacyMain).toContain('getProjectExportAvailability()');
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

  it('verifies useResizableEditorLayout hook integration', async () => {
    const TestComponent = () => {
      const layout = useResizableEditorLayout();
      return React.createElement('div', {
        'data-inspector-width': layout.inspectorWidth,
        'data-timeline-height': layout.timelineHeight,
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

    const w = parseInt(element?.getAttribute('data-inspector-width') || '0', 10);
    const h = parseInt(element?.getAttribute('data-timeline-height') || '0', 10);

    expect(w).toBe(340);
    expect(h).toBe(280);

    root.unmount();
    container.remove();
  });
});
