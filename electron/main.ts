import { app, ipcMain } from 'electron';
import { initializeSingleInstanceLock } from './bootstrap/instance';
import { StateManager } from './services/state';
import { DisplayManager } from './services/display';
import { ShortcutManager } from './services/shortcuts';
import { WindowRegistry } from './windows/registry';

import { RecorderService } from './services/recorder';
import { PresentationTrackService } from './services/presentationTrack';
import path from 'path';

// Global singleton instances
let stateManager: StateManager;
let displayManager: DisplayManager;
let shortcutManager: ShortcutManager;
let windowRegistry: WindowRegistry;
let recorderService: RecorderService;
let presentationTrackService: PresentationTrackService;

let recordingTimer: NodeJS.Timeout | null = null;
let recordingSeconds = 0;

function startRecordingTimer(event: Electron.IpcMainInvokeEvent) {
  recordingSeconds = 0;
  if (recordingTimer) clearInterval(recordingTimer);
  
  recordingTimer = setInterval(() => {
    if (recorderService.getState().isPaused) return;
    recordingSeconds++;
    const mm = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const ss = String(recordingSeconds % 60).padStart(2, '0');
    const timeStr = `${mm}:${ss}`;
    event.sender.send('recording:timer-tick', timeStr);
  }, 1000);
}

function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function broadcastRecordingState(recordingState: any) {
  for (const win of windowRegistry.getOverlays()) {
    const w = win.getWindow();
    if (w && !w.isDestroyed()) {
      w.webContents.send('recording:state-changed', recordingState);
    }
  }
  const tb = windowRegistry.getToolbar()?.getWindow();
  if (tb && !tb.isDestroyed()) {
    tb.webContents.send('recording:state-changed', recordingState);
  }
  const st = windowRegistry.getSettings()?.getWindow();
  if (st && !st.isDestroyed()) {
    st.webContents.send('recording:state-changed', recordingState);
  }
}

function calculateToolbarBounds(display: any, orientation: string) {
  const isHorizontal = orientation === 'horizontal';
  const width = isHorizontal
    ? Math.min(820, display.workArea.width - 10)
    : Math.min(430, Math.max(350, display.workArea.width - 10));
  const height = isHorizontal ? 350 : Math.min(760, display.workArea.height - 10);
  const x = isHorizontal
    ? Math.round(display.bounds.x + (display.bounds.width - width) / 2)
    : Math.round(display.bounds.x + display.bounds.width - width - 20);
  const y = isHorizontal
    ? Math.max(display.bounds.y + 20, display.workArea.y + 12)
    : Math.round(display.bounds.y + Math.max(20, (display.bounds.height - height) / 2));
  return { x, y, width, height };
}

function rebuildOverlays() {
  windowRegistry.clearOverlays();
  const displays = displayManager.getDisplays();
  for (const display of displays) {
    windowRegistry.createOverlay(display);
  }
}

function bootstrap() {
  if (!initializeSingleInstanceLock()) {
    return;
  }

  stateManager = new StateManager();
  displayManager = new DisplayManager();
  shortcutManager = new ShortcutManager();
  windowRegistry = new WindowRegistry();
  recorderService = new RecorderService();
  presentationTrackService = new PresentationTrackService();

  ipcMain.handle('recording:start', async (event, options) => {
    try {
      const defaultPath = path.join(app.getPath('videos'), `recording-${Date.now()}.mp4`);
      const outputPath = options.outputPath || defaultPath;
      
      await recorderService.start({
        sourceId: options.sourceId || 'screen:0',
        sourceType: options.sourceType || 'screen',
        windowHandle: options.windowHandle || null,
        displayId: options.displayId || 0,
        width: options.width || 1920,
        height: options.height || 1080,
        fps: options.fps || 30,
        captureSystemAudio: options.captureSystemAudio ?? true,
        captureMic: options.captureMic ?? false,
        microphoneDeviceId: options.microphoneDeviceId || null,
        webcamEnabled: options.webcamEnabled ?? false,
        webcamDeviceId: options.webcamDeviceId || null,
        captureCursor: options.captureCursor ?? true,
        outputPath: outputPath,
        webcamOutputPath: options.webcamEnabled ? outputPath.replace('.mp4', '-webcam.mp4') : null,
      });
      
      const appState = stateManager.getState();
      presentationTrackService.startTrack(
        outputPath,
        [],
        appState.backgroundMode || 'transparent',
        appState.boardColor || '#ffffff',
        appState.boardViewport || { panX: 0, panY: 0, zoom: 1 }
      );
      
      startRecordingTimer(event);
      broadcastRecordingState({ isRecording: true, isPaused: false });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('recording:pause', async () => {
    recorderService.pause();
    presentationTrackService.pauseTrack();
    broadcastRecordingState({ isRecording: true, isPaused: true });
    return { success: true };
  });

  ipcMain.handle('recording:resume', async () => {
    recorderService.resume();
    presentationTrackService.resumeTrack();
    broadcastRecordingState({ isRecording: true, isPaused: false });
    return { success: true };
  });

  ipcMain.handle('recording:stop', async () => {
    try {
      stopRecordingTimer();
      const outputPath = await recorderService.stop();
      presentationTrackService.stopTrack();
      broadcastRecordingState({ isRecording: false, isPaused: false });
      return { success: true, outputPath };
    } catch (err: any) {
      presentationTrackService.stopTrack();
      broadcastRecordingState({ isRecording: false, isPaused: false });
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('recording:cancel', async () => {
    stopRecordingTimer();
    recorderService.cancel();
    presentationTrackService.cancelTrack();
    broadcastRecordingState({ isRecording: false, isPaused: false });
    return { success: true };
  });

  ipcMain.handle('recording:get-state', async () => {
    return recorderService.getState();
  });

  app.whenReady().then(() => {
    // 1. Build overlays per screen
    rebuildOverlays();

    // 2. Build toolbar on primary screen
    const primary = displayManager.getPrimaryDisplay();
    const toolbarState = stateManager.getState();
    const toolbarBounds = calculateToolbarBounds(primary, toolbarState.toolbarOrientation);
    windowRegistry.createToolbar(toolbarBounds);

    // 3. Listen to display changes
    displayManager.on('change', () => {
      rebuildOverlays();
    });

    app.on('activate', () => {
      if (windowRegistry.getOverlays().length === 0) {
        rebuildOverlays();
      }
      if (!windowRegistry.getToolbar()) {
        const p = displayManager.getPrimaryDisplay();
        const b = calculateToolbarBounds(p, stateManager.getState().toolbarOrientation);
        windowRegistry.createToolbar(b);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    shortcutManager.unregisterAll();
    windowRegistry.destroyAll();
  });
}

// Start bootstrapper
bootstrap();
