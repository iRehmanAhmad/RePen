import { app, BrowserWindow, ipcMain, dialog, desktopCapturer, screen } from 'electron';
import { initializeSingleInstanceLock } from './bootstrap/instance';
import { StateManager } from './services/state';
import { DisplayManager } from './services/display';
import { ShortcutManager } from './services/shortcuts';
import { WindowRegistry } from './windows/registry';

import { RecorderService } from './services/recorder';
import { PresentationTrackService } from './services/presentationTrack';
import path from 'path';
import fs from 'fs';

// Global singleton instances
let stateManager: StateManager;
let displayManager: DisplayManager;
let shortcutManager: ShortcutManager;
let windowRegistry: WindowRegistry;
let recorderService: RecorderService;
let presentationTrackService: PresentationTrackService;
let lastEnumeratedSources = new Map<string, any>();
const approvedRecordingDirectories = new Set<string>();
let activeExportProcess: any = null;

let recordingTimer: NodeJS.Timeout | null = null;
let recordingSeconds = 0;
let lastStartOptions: any = null;

function broadcastRecordingTimer(timeStr: string) {
  for (const overlay of windowRegistry.getOverlays()) {
    const win = overlay.getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('recording:timer-tick', timeStr);
  }
  const toolbar = windowRegistry.getToolbar()?.getWindow();
  if (toolbar && !toolbar.isDestroyed()) toolbar.webContents.send('recording:timer-tick', timeStr);
  const settings = windowRegistry.getSettings()?.getWindow();
  if (settings && !settings.isDestroyed()) settings.webContents.send('recording:timer-tick', timeStr);
}

function startRecordingTimer() {
  recordingSeconds = 0;
  if (recordingTimer) clearInterval(recordingTimer);
  
  recordingTimer = setInterval(() => {
    if (recorderService.getState().isPaused) return;
    recordingSeconds++;
    const mm = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const ss = String(recordingSeconds % 60).padStart(2, '0');
    const timeStr = `${mm}:${ss}`;
    broadcastRecordingTimer(timeStr);
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
    const controlsActive = ['starting', 'recording', 'paused', 'finalizing'].includes(recordingState?.phase);
    if (controlsActive) {
      tb.setIgnoreMouseEvents(false);
      tb.showInactive();
      tb.moveTop();
    }
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

  const isTrustedRecordingSender = (event: Electron.IpcMainInvokeEvent) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    return senderWindow === windowRegistry.getToolbar()?.getWindow() || 
           senderWindow === windowRegistry.getSettings()?.getWindow() ||
           senderWindow === windowRegistry.getSelector()?.getWindow() ||
           senderWindow === windowRegistry.getCountdown()?.getWindow() ||
           senderWindow === windowRegistry.getEditor()?.getWindow();
  };

  const handleRecordingFailure = async (error: unknown) => {
    stopRecordingTimer();
    try {
      if (recorderService.getState().isRecording) await recorderService.cancel();
    } catch (cancelError) {
      console.error('Failed to cancel recorder after failure:', cancelError);
    }
    try {
      await presentationTrackService.discardTrack();
    } catch (trackError) {
      console.error('Failed to discard presentation track after failure:', trackError);
    }
    broadcastRecordingState({
      isRecording: false,
      isPaused: false,
      phase: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  };

  recorderService.on('crash', (error) => void handleRecordingFailure(error));
  presentationTrackService.on('failure', (error) => void handleRecordingFailure(error));

  ipcMain.handle('recording:open-setup', async () => {
    const win = windowRegistry.createSelector();
    win.getWindow()?.show();
    return { success: true };
  });

  ipcMain.handle('recording:close-setup', async () => {
    // The selector continues the countdown/start flow after this await.
    // Hiding it keeps its renderer alive; destroying it aborts that flow.
    windowRegistry.getSelector()?.hide();
    return { success: true };
  });

  ipcMain.handle('recording:open-editor', async (_, initialPath = null) => {
    const win = windowRegistry.createEditor();
    if (initialPath) {
      // Pass the path in the load URL or via message
      win.getWindow()?.webContents.send('editor:load-project', initialPath);
    }
    win.getWindow()?.show();
    return { success: true };
  });

  ipcMain.handle('recording:close-editor', async () => {
    windowRegistry.destroyEditor();
    return { success: true };
  });

  ipcMain.handle('recording:transcribe', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized transcription request.' };
    return {
      success: false,
      supported: false,
      error: 'Offline transcription is not installed. No caption model is bundled with this build.',
    };
  });

  ipcMain.handle('project:export', async (event, _project, _options) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized export request.' };
    // The modular shell must not run command strings through a system shell.
    // Export remains capability-gated until a licensed executable/compositor is packaged.
    return { success: false, supported: false, error: 'Video export is not available in the modular shell build.' };
    /* c8 ignore start -- retained until the typed compositor replaces this legacy prototype.
    if (activeExportProcess) {
      return { success: false, error: 'Export already in progress' };
    }

    const durationMs = options.durationMs || 10000;
    const command = generateExportFFmpegCommand({
      videoPath: project.media?.screenVideoPath || project.videoPath || '',
      webcamVideoPath: project.media?.webcamVideoPath || '',
      outputPath: options.outputPath,
      format: options.format || 'mp4',
      fps: options.fps || 30,
      loop: options.loop !== false,
      cropRegion: project.editor?.cropRegion,
      webcamLayoutPreset: project.editor?.webcamLayoutPreset,
      webcamSizePreset: project.editor?.webcamSizePreset,
      webcamPosition: project.editor?.webcamPosition,
    });

    return new Promise((resolve) => {
      activeExportProcess = spawn(command, { shell: true });

      activeExportProcess.stderr.on('data', (data: any) => {
        const log = data.toString();
        const match = log.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (match) {
          const hh = parseInt(match[1]);
          const mm = parseInt(match[2]);
          const ss = parseFloat(match[3] + '.' + match[4]);
          const currentMs = (hh * 3600 + mm * 60 + ss) * 1000;
          const progress = Math.min(100, Math.round((currentMs / durationMs) * 100));
          
          const editorWin = windowRegistry.getEditor();
          if (editorWin) {
            const win = editorWin.getWindow();
            if (win && !win.isDestroyed()) {
              win.webContents.send('project:export-progress', { progress });
            }
          }
        }
      });

      activeExportProcess.on('close', (code: number) => {
        activeExportProcess = null;
        if (code === 0) {
          resolve({ success: true, path: options.outputPath });
        } else {
          resolve({ success: false, error: `FFmpeg exited with code ${code}` });
        }
      });
    });
    c8 ignore stop */
  });

  ipcMain.handle('project:export-cancel', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized export request.' };
    if (activeExportProcess) {
      activeExportProcess.kill();
      activeExportProcess = null;
    }
    return { success: true };
  });

  /* Legacy prototype retained as design reference only. It must not be called
     until it returns argv and uses shell:false with a packaged executable.
  function generateExportFFmpegCommand(options: any) {
    const parts = ['ffmpeg', '-y'];

    parts.push('-i', `"${options.videoPath}"`);

    let filterGraph = [];
    let videoOut = '0:v';
    let audioOut = '0:a';

    if (options.cropRegion) {
      const crop = options.cropRegion;
      filterGraph.push(`[${videoOut}]crop=w=iw*${crop.width}:h=ih*${crop.height}:x=iw*${crop.x}:y=ih*${crop.y}[cropped_v]`);
      videoOut = 'cropped_v';
    }

    if (options.webcamVideoPath && options.webcamLayoutPreset !== 'no-webcam') {
      parts.push('-i', `"${options.webcamVideoPath}"`);
      const sizePct = (options.webcamSizePreset || 25) / 100;
      filterGraph.push(`[1:v]scale=iw*${sizePct}:-1[scaled_webcam]`);
      
      let overlayX = 'main_w-w-20';
      let overlayY = 'main_h-h-20';
      if (options.webcamPosition) {
        overlayX = `main_w*${options.webcamPosition.cx}-w/2`;
        overlayY = `main_h*${options.webcamPosition.cy}-h/2`;
      }
      filterGraph.push(`[${videoOut}][scaled_webcam]overlay=x=${overlayX}:y=${overlayY}:shortest=1[webcam_overlay_v]`);
      videoOut = 'webcam_overlay_v';
    }

    if (options.format === 'gif') {
      const fps = options.fps || 15;
      filterGraph.push(`[${videoOut}]fps=${fps},scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse[gif_v]`);
      videoOut = 'gif_v';
    }

    if (filterGraph.length > 0) {
      parts.push('-filter_complex', `"${filterGraph.join('; ')}"`);
      parts.push('-map', `"[${videoOut}]"`);
      if (options.format !== 'gif') {
        parts.push('-map', `"${audioOut}"`);
      }
    } else {
      parts.push('-map', '0:v');
      if (options.format !== 'gif') {
        parts.push('-map', '0:a');
      }
    }

    if (options.format === 'gif') {
      parts.push('-loop', options.loop ? '0' : '-1');
    } else {
      parts.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
      parts.push('-c:a', 'aac', '-b:a', '192k');
    }

    parts.push(`"${options.outputPath}"`);
    return parts.join(' ');
  }
  */

  ipcMain.handle('recording:get-sources', async (event, opts) => {
    if (!isTrustedRecordingSender(event)) return [];
    const sources = await desktopCapturer.getSources(opts || {
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });
    lastEnumeratedSources = new Map(sources.map((source) => [source.id, source]));
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      display_id: source.display_id,
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : null,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
    }));
  });

  ipcMain.handle('recording:get-system-info', async (event) => {
    if (!isTrustedRecordingSender(event)) throw new Error('Unauthorized recording request.');
    const displays = screen.getAllDisplays().map((d) => ({
      id: d.id,
      name: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      scaleFactor: d.scaleFactor,
      isPrimary: d.id === screen.getPrimaryDisplay().id,
    }));

    const defaultDir = app.getPath('videos');
    let freeSpaceBytes = 0;
    try {
      const stats = fs.statfsSync(defaultDir);
      freeSpaceBytes = stats.bavail * stats.bsize;
    } catch (err) {
      console.error('Failed to get disk space:', err);
    }

    return {
      displays,
      defaultDestination: defaultDir,
      freeSpaceBytes,
    };
  });

  ipcMain.handle('recording:select-directory', async (event) => {
    if (!isTrustedRecordingSender(event)) return null;
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const dir = result.filePaths[0];
    approvedRecordingDirectories.add(path.resolve(dir));
    let freeSpaceBytes = 0;
    try {
      const stats = fs.statfsSync(dir);
      freeSpaceBytes = stats.bavail * stats.bsize;
    } catch (err) {
      console.error('Failed to get disk space for selected dir:', err);
    }
    return {
      path: dir,
      freeSpaceBytes,
    };
  });

  ipcMain.handle('recording:start-countdown', async (event, payload: any = {}) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    const displayId = Number(payload.displayId);
    const selectedDisplay = screen.getAllDisplays().find(d => d.id === displayId) || screen.getPrimaryDisplay();
    const win = windowRegistry.createCountdown(selectedDisplay);
    win.getWindow()?.show();
    return { success: true };
  });

  ipcMain.handle('recording:close-countdown', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    windowRegistry.destroyCountdown();
    return { success: true };
  });

  ipcMain.handle('recording:start', async (event, options) => {
    if (!isTrustedRecordingSender(event)) {
      return { success: false, error: 'This window is not allowed to control recording.' };
    }
    lastStartOptions = options;
    try {
      if (!options || typeof options !== 'object') throw new Error('Recording options are required.');
      const selectedSource = lastEnumeratedSources.get(options.sourceId);
      if (!selectedSource) throw new Error('The selected recording source is no longer available.');
      const defaultPath = path.join(app.getPath('videos'), `recording-${Date.now()}.mp4`);
      const outputPath = path.resolve(options.outputPath || defaultPath);
      const allowedRoots = [app.getPath('videos'), ...approvedRecordingDirectories];
      const isAllowedOutput = allowedRoots.some((root) => {
        const relative = path.relative(path.resolve(root), outputPath);
        return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
      });
      if (path.extname(outputPath).toLowerCase() !== '.mp4' || !isAllowedOutput) {
        throw new Error('Recording output must be an MP4 inside a directory selected in RePen.');
      }
      const sourceType = options.sourceType === 'window' ? 'window' : 'display';
      const sourceDisplayId = Number(selectedSource.display_id || options.displayId);
      const selectedDisplay = displayManager.getDisplays().find((display) => display.id === sourceDisplayId) || displayManager.getPrimaryDisplay();
      const windowHandle = sourceType === 'window' ? options.sourceId.match(/^window:([^:]+):/)?.[1] || null : null;
      if (sourceType === 'window' && !windowHandle) throw new Error('Selected window has no valid native handle.');
      const sessionId = `recording-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      await recorderService.start({
        sourceId: options.sourceId,
        sourceType,
        windowHandle,
        displayId: selectedDisplay.id,
        width: options.width || 1920,
        height: options.height || 1080,
        fps: options.fps || 30,
        captureSystemAudio: options.captureSystemAudio ?? true,
        captureMic: options.captureMic ?? false,
        microphoneDeviceId: options.microphoneDeviceId || null,
        microphoneDeviceName: options.microphoneDeviceName || null,
        microphoneGain: options.microphoneGain ?? 1,
        webcamEnabled: options.webcamEnabled ?? false,
        webcamDeviceId: options.webcamDeviceId || null,
        webcamDeviceName: options.webcamDeviceName || null,
        webcamDirectShowClsid: options.webcamDirectShowClsid || null,
        captureCursor: options.captureCursor ?? true,
        outputPath: outputPath,
        webcamOutputPath: options.webcamEnabled ? outputPath.replace('.mp4', '-webcam.mp4') : null,
      });
      
      const appState = stateManager.getState();
      presentationTrackService.startTrack(outputPath, {
        sessionId,
        createdAtEpochMs: Date.now(),
        source: {
          id: options.sourceId,
          name: selectedSource.name || (sourceType === 'display' ? `Display ${selectedDisplay.id}` : 'Selected window'),
          type: sourceType,
          displayId: sourceType === 'display' ? selectedDisplay.id : null,
          windowHandle,
          bounds: options.sourceBounds || selectedDisplay.bounds,
          scaleFactor: selectedDisplay.scaleFactor || 1,
        },
        canvas: {
          width: (options.sourceBounds || selectedDisplay.bounds).width,
          height: (options.sourceBounds || selectedDisplay.bounds).height,
          originX: (options.sourceBounds || selectedDisplay.bounds).x,
          originY: (options.sourceBounds || selectedDisplay.bounds).y,
          coordinateSpace: 'desktop-dip',
        },
        initialScene: {
          annotations: [],
          board: {
            backgroundMode: appState.backgroundMode || 'transparent',
            boardColor: appState.boardColor || '#ffffff',
            viewport: {
              panX: appState.boardViewport?.x ?? 0,
              panY: 0,
              zoom: appState.boardViewport?.zoom ?? 1,
            },
          },
          page: { id: 'board-page-0', index: 0 },
          spotlight: null,
          laserPoints: [],
        },
      });

      startRecordingTimer();
      broadcastRecordingState({ isRecording: true, isPaused: false, phase: 'recording', sessionId });
      return { success: true, sessionId };
    } catch (err: any) {
      await handleRecordingFailure(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('recording:pause', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    await recorderService.pause();
    presentationTrackService.pauseTrack();
    broadcastRecordingState({ isRecording: true, isPaused: true, phase: 'paused' });
    return { success: true };
  });

  ipcMain.handle('recording:resume', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    await recorderService.resume();
    presentationTrackService.resumeTrack();
    broadcastRecordingState({ isRecording: true, isPaused: false, phase: 'recording' });
    return { success: true };
  });

  ipcMain.handle('recording:stop', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    try {
      stopRecordingTimer();
      const outputPath = await recorderService.stop();
      const trackSummary = await presentationTrackService.finalizeTrack();
      broadcastRecordingState({ isRecording: false, isPaused: false, phase: 'idle' });
      return { success: true, outputPath, presentationTrackPath: trackSummary.sidecarPath };
    } catch (err: any) {
      await handleRecordingFailure(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('recording:cancel', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    stopRecordingTimer();
    await recorderService.cancel();
    await presentationTrackService.discardTrack();
    broadcastRecordingState({ isRecording: false, isPaused: false, phase: 'idle' });
    return { success: true };
  });

  ipcMain.handle('recording:restart', async (event) => {
    if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
    stopRecordingTimer();
    await recorderService.cancel();
    await presentationTrackService.discardTrack();

    if (lastStartOptions) {
      const selectedDisplay = screen.getAllDisplays().find(d => d.id === lastStartOptions.displayId) || screen.getPrimaryDisplay();
      const win = windowRegistry.createCountdown(selectedDisplay);
      win.getWindow()?.show();
      broadcastRecordingState({ isRecording: false, isPaused: false, phase: 'countdown' });
      return { success: true };
    }
    broadcastRecordingState({ isRecording: false, isPaused: false, phase: 'idle' });
    return { success: false, error: 'No active session options found to restart.' };
  });

  ipcMain.handle('recording:get-state', async (event) => {
    if (!isTrustedRecordingSender(event)) return { isRecording: false, isPaused: false, phase: 'idle' };
    return recorderService.getState();
  });

  ipcMain.handle('recording:get-capabilities', async (event) => {
    if (!isTrustedRecordingSender(event)) return { available: false, supported: false };
    return recorderService.probeCapabilities();
  });

  let currentProjectPath: string | null = null;

  ipcMain.handle('project:save', async (_, projectData: any, suggestedName?: string, existingProjectPath?: string) => {
    try {
      const targetPath = existingProjectPath || currentProjectPath;
      if (targetPath && fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, JSON.stringify(projectData, null, 2), 'utf-8');
        currentProjectPath = targetPath;
        return { success: true, path: targetPath, message: 'Project saved successfully' };
      }

      const safeName = (suggestedName || `project-${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, '_');
      const defaultName = safeName.endsWith('.repen-project') ? safeName : `${safeName}.repen-project`;

      const result = await dialog.showSaveDialog({
        title: 'Save RePen Project',
        defaultPath: path.join(app.getPath('videos'), defaultName),
        filters: [
          { name: 'RePen Project', extensions: ['repen-project'] },
          { name: 'OpenScreen Project', extensions: ['openscreen'] },
          { name: 'JSON', extensions: ['json'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true, message: 'Save project canceled' };
      }

      fs.writeFileSync(result.filePath, JSON.stringify(projectData, null, 2), 'utf-8');
      currentProjectPath = result.filePath;
      return { success: true, path: result.filePath, message: 'Project saved successfully' };
    } catch (error) {
      console.error('Failed to save project:', error);
      return { success: false, message: 'Failed to save project', error: String(error) };
    }
  });

  ipcMain.handle('project:load', async (_, projectFolder?: string) => {
    try {
      const defaultDir = projectFolder && fs.existsSync(projectFolder) ? projectFolder : app.getPath('videos');
      const result = await dialog.showOpenDialog({
        title: 'Open RePen Project',
        defaultPath: defaultDir,
        filters: [
          { name: 'RePen Project', extensions: ['repen-project', 'openscreen'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true, message: 'Open project canceled' };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      let project = JSON.parse(content);
      currentProjectPath = filePath;

      if (filePath.endsWith('.openscreen') || (project.version && project.version === 1)) {
        const { migrateProjectData } = require('../src/shared/editor/projectPersistence');
        project = migrateProjectData(project);
      }

      return { success: true, path: filePath, project };
    } catch (error) {
      console.error('Failed to load project:', error);
      return { success: false, message: 'Failed to load project', error: String(error) };
    }
  });

  ipcMain.handle('project:load-from-path', async (_, filePath: string) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, message: 'File not found' };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      let project = JSON.parse(content);
      currentProjectPath = filePath;

      if (filePath.endsWith('.openscreen') || (project.version && project.version === 1)) {
        const { migrateProjectData } = require('../src/shared/editor/projectPersistence');
        project = migrateProjectData(project);
      }

      return { success: true, path: filePath, project };
    } catch (error) {
      console.error('Failed to load project from path:', error);
      return { success: false, message: 'Failed to load project', error: String(error) };
    }
  });

  ipcMain.handle('project:get-current-path', async () => {
    return currentProjectPath;
  });

  ipcMain.handle('app:export-diagnostics', async () => {
    let logContent = 'No diagnostic logs found.';
    
    let videosDir = '';
    try {
      videosDir = app.getPath('videos');
    } catch (e) {}

    const pathsToTry = [
      path.join(videosDir, 'recording-diagnostics.log'),
      path.join(process.env.TEMP || process.env.TMP || '.', 'repen-diagnostics', 'recording-diagnostics.log')
    ];

    for (const logPath of pathsToTry) {
      if (logPath && fs.existsSync(logPath)) {
        try {
          logContent = fs.readFileSync(logPath, 'utf8');
          break;
        } catch (e) {}
      }
    }

    const redacted = logContent.replace(/C:\\Users\\[a-zA-Z0-9_\-\.]+/gi, 'C:\\Users\\<Redacted>');

    const editorWin = windowRegistry.getEditor();
    const win = editorWin ? editorWin.getWindow() : null;

    const dialogOptions = {
      title: 'Export Redacted Diagnostics',
      defaultPath: path.join(app.getPath('downloads') || app.getPath('desktop'), 'repen-diagnostics.log'),
      filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
    };

    const { filePath, canceled } = win
      ? await dialog.showSaveDialog(win, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (!canceled && filePath) {
      try {
        fs.writeFileSync(filePath, redacted, 'utf8');
        return { success: true, path: filePath };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'Canceled' };
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

  let recordingCleanupComplete = false;
  let recordingCleanup: Promise<void> | null = null;
  app.on('before-quit', (event) => {
    const needsCleanup = !recordingCleanupComplete && (
      recorderService.getState().isRecording || presentationTrackService.isRecording()
    );
    if (!needsCleanup) return;

    event.preventDefault();
    if (!recordingCleanup) {
      recordingCleanup = (async () => {
        try {
          await recorderService.cancel();
        } catch (error) {
          console.error('Failed to cancel native recorder during shutdown:', error);
        }
        try {
          await presentationTrackService.discardTrack();
        } catch (error) {
          console.error('Failed to discard presentation track during shutdown:', error);
        }
      })().finally(() => {
        recordingCleanupComplete = true;
        recordingCleanup = null;
        app.quit();
      });
    }
  });

  app.on('will-quit', () => {
    shortcutManager.unregisterAll();
    windowRegistry.destroyAll();
  });
}

// Start bootstrapper
bootstrap();
