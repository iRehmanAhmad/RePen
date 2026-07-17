const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, desktopCapturer, clipboard, dialog, shell } = require('electron');
const { createAppCapabilities, getProjectExportAvailability } = require('./src/shared/recording/appCapabilities.js');
const {
  WindowRole,
  shouldExcludeFromCapture,
  nativeWindowHandleCandidates,
  filterRepenOwnedSources,
} = require('./src/shared/recording/capturePolicy.js');
const { canRunRecordingCommand, recordingCommandError, validateRecordingCommand } = require('./src/shared/recording/stateMachine.js');
const { validateFinalizedRecordingMedia } = require('./src/shared/editor/mediaValidation.js');
const { writeProjectFileAtomically } = require('./src/shared/editor/projectFile.js');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

const APP_NAME = 'RePen';
const DEFAULT_STATE = {
  overlayVisible: true,
  passThrough: false,
  toolbarOrientation: 'vertical',
  backgroundMode: 'transparent',
  clickHalo: false,
  activeTool: 'pen',
  activeShapeType: 'rectangle',
  textMode: 'plain',
  brushDefaults: {
    pen: {
      color: '#ff5a5f',
      width: 4,
      opacity: 1,
    },
    highlighter: {
      color: '#ffe36d',
      width: 18,
      opacity: 0.3,
    },
    calligraphy: {
      color: '#ff5a5f',
      width: 4,
      opacity: 1,
    },
    eraser: {
      radius: 18,
    },
  },
  exportDefaults: {
    format: 'png',
    quality: 0.9,
    includeBackground: false,
    autoSavePath: '',
    copyToClipboard: true,
  },
  rememberContentAfterExit: false,
  clearOnMinimize: false,
  startOnLogin: false,
  checkUpdatesOnStartup: false,
  spotlight: {
    radius: 150,
    alpha: 0.75,
  },
  boardViewport: {
    x: 0,
    zoom: 1,
  },
  hotkeys: {
    toggleOverlay: 'CommandOrControl+Alt+H',
    togglePassThrough: 'CommandOrControl+Shift+P',
    pen: 'CommandOrControl+Shift+1',
    highlighter: 'CommandOrControl+Shift+2',
    shapes: 'CommandOrControl+Shift+4',
    laser: 'CommandOrControl+Shift+L',
    text: 'CommandOrControl+Shift+T',
    select: 'CommandOrControl+Alt+V',
    cycleBackground: 'CommandOrControl+Shift+B',
    toggleClickHalo: 'CommandOrControl+Shift+K',
    eraser: 'CommandOrControl+Shift+3',
    undo: 'CommandOrControl+Shift+Z',
    redo: 'CommandOrControl+Shift+Y',
    clear: 'CommandOrControl+Alt+C',
    openSettings: 'CommandOrControl+Shift+O',
    takeScreenshot: 'CommandOrControl+Shift+S',
    revertAutoShape: 'CommandOrControl+Shift+R',
    saveSession: 'CommandOrControl+Alt+S',
    loadSession: 'CommandOrControl+Alt+O',
    prevPage: 'CommandOrControl+Alt+Left',
    nextPage: 'CommandOrControl+Alt+Right',
    pasteImage: 'CommandOrControl+Alt+I',
  },
  toolbarHovered: false,
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.setAppUserModelId('com.repen.app');

let tray = null;
let toolbarWindow = null;
let settingsWindow = null;
let selectorWindow = null;
let countdownWindow = null;
let editorWindow = null;
let presenterVisibilityBeforeEditor = null;
const overlayWindows = new Map();
let state = { ...DEFAULT_STATE };
let pages = [{ annotations: [], undoStack: [], redoStack: [] }];
let desktopPage = { annotations: [], undoStack: [], redoStack: [] };
let currentPageIndex = 0;
let annotations = desktopPage.annotations;
let undoStack = desktopPage.undoStack;
let redoStack = desktopPage.redoStack;

function syncPageStore() {
  if (state && state.backgroundMode && state.backgroundMode !== 'transparent') {
    if (pages[currentPageIndex]) {
      pages[currentPageIndex].annotations = annotations;
      pages[currentPageIndex].undoStack = undoStack;
      pages[currentPageIndex].redoStack = redoStack;
    }
  } else {
    desktopPage.annotations = annotations;
    desktopPage.undoStack = undoStack;
    desktopPage.redoStack = redoStack;
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStateFilePath() {
  return path.join(app.getPath('userData'), 'state.json');
}

function readPersistedState() {
  try {
    const file = getStateFilePath();
    if (!fs.existsSync(file)) {
      return {};
    }

    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writePersistedState() {
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    const file = getStateFilePath();
    const payload = {
      version: 2,
      state: {
        overlayVisible: state.overlayVisible,
        passThrough: state.passThrough,
        toolbarOrientation: state.toolbarOrientation || 'vertical',
        activeTool: state.activeTool,
        activeShapeType: state.activeShapeType || 'rectangle',
        textMode: state.textMode || 'plain',
        clickHalo: state.clickHalo,
        brushDefaults: state.brushDefaults,
        hotkeys: state.hotkeys,
        exportDefaults: state.exportDefaults,
        boardViewport: state.boardViewport,
        rememberContentAfterExit: state.rememberContentAfterExit,
        clearOnMinimize: state.clearOnMinimize,
        startOnLogin: state.startOnLogin,
        checkUpdatesOnStartup: state.checkUpdatesOnStartup,
        desktopPage: {
          annotations: state.backgroundMode === 'transparent' ? annotations : (desktopPage.annotations || [])
        },
        pages: pages.map((p, idx) => ({
          annotations: (state.backgroundMode !== 'transparent' && idx === currentPageIndex) ? annotations : (p.annotations || [])
        })),
        currentPageIndex,
      },
    };
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(temp, file);
  } catch (error) {
    console.error('Failed to persist state:', error);
  }
}

function loadState() {
  const persisted = readPersistedState();
  if (persisted && persisted.state) {
    if (!persisted.version || persisted.version < 2) {
      console.log('Migrating persisted state schema from v1 to v2...');
    }
    state = {
      ...DEFAULT_STATE,
      ...persisted.state,
      brushDefaults: {
        ...DEFAULT_STATE.brushDefaults,
        ...(persisted.state.brushDefaults || {}),
        pen: {
          ...DEFAULT_STATE.brushDefaults.pen,
          ...((persisted.state.brushDefaults && persisted.state.brushDefaults.pen) || {}),
        },
        highlighter: {
          ...DEFAULT_STATE.brushDefaults.highlighter,
          ...((persisted.state.brushDefaults && persisted.state.brushDefaults.highlighter) || {}),
        },
        calligraphy: {
          ...DEFAULT_STATE.brushDefaults.calligraphy,
          ...((persisted.state.brushDefaults && persisted.state.brushDefaults.calligraphy) || {}),
        },
        eraser: {
          ...DEFAULT_STATE.brushDefaults.eraser,
          ...((persisted.state.brushDefaults && persisted.state.brushDefaults.eraser) || {}),
        },
      },
      hotkeys: {
        ...DEFAULT_STATE.hotkeys,
        ...(persisted.state.hotkeys || {}),
      },
      exportDefaults: {
        ...DEFAULT_STATE.exportDefaults,
        ...(persisted.state.exportDefaults || {}),
      },
      boardViewport: normalizeBoardViewport(persisted.state.boardViewport),
    };
    state.overlayVisible = true;
    // Desktop annotations are session-only unless the user opts in.
    desktopPage = {
      annotations: state.rememberContentAfterExit ? deepClone(persisted.state.desktopPage?.annotations || []) : [],
      undoStack: [],
      redoStack: []
    };
    if (Array.isArray(persisted.state.pages) && persisted.state.pages.length > 0) {
      pages = persisted.state.pages.map(p => ({
        annotations: deepClone(p.annotations || []),
        undoStack: [],
        redoStack: []
      }));
      currentPageIndex = Math.min(Math.max(0, persisted.state.currentPageIndex || 0), pages.length - 1);
    }
    if (state.backgroundMode !== 'transparent') {
      annotations = pages[currentPageIndex].annotations;
      undoStack = pages[currentPageIndex].undoStack;
      redoStack = pages[currentPageIndex].redoStack;
    } else {
      annotations = desktopPage.annotations;
      undoStack = desktopPage.undoStack;
      redoStack = desktopPage.redoStack;
    }
  }

  if (state.color || state.width || state.opacity || state.highlightColor || state.highlightWidth || state.highlightOpacity || state.eraseRadius) {
    state.brushDefaults = {
      ...state.brushDefaults,
      pen: {
        ...state.brushDefaults.pen,
        color: state.color || state.brushDefaults.pen.color,
        width: state.width || state.brushDefaults.pen.width,
        opacity: typeof state.opacity === 'number' ? state.opacity : state.brushDefaults.pen.opacity,
      },
      highlighter: {
        ...state.brushDefaults.highlighter,
        color: state.highlightColor || state.brushDefaults.highlighter.color,
        width: state.highlightWidth || state.brushDefaults.highlighter.width,
        opacity:
          typeof state.highlightOpacity === 'number'
            ? state.highlightOpacity
            : state.brushDefaults.highlighter.opacity,
      },
      eraser: {
        ...state.brushDefaults.eraser,
        radius: state.eraseRadius || state.brushDefaults.eraser.radius,
      },
    };
    delete state.color;
    delete state.width;
    delete state.opacity;
    delete state.highlightColor;
    delete state.highlightWidth;
    delete state.highlightOpacity;
    delete state.eraseRadius;
  }
  state.backgroundMode = 'transparent';
  annotations = desktopPage.annotations;
  undoStack = desktopPage.undoStack;
  redoStack = desktopPage.redoStack;
}

function getDockSide() {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    return state.toolbarOrientation === 'horizontal' ? 'top' : 'right';
  }
  try {
    const bounds = toolbarWindow.getBounds();
    const display = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
    if (state.toolbarOrientation === 'horizontal') {
      const centerY = bounds.y + bounds.height / 2;
      const displayCenterY = display.bounds.y + display.bounds.height / 2;
      return centerY > displayCenterY ? 'bottom' : 'top';
    } else {
      const centerX = bounds.x + bounds.width / 2;
      const displayCenterX = display.bounds.x + display.bounds.width / 2;
      return centerX > displayCenterX ? 'right' : 'left';
    }
  } catch (e) {
    return state.toolbarOrientation === 'horizontal' ? 'top' : 'right';
  }
}

function getAppState() {
  state.boardViewport = normalizeBoardViewport(state.boardViewport);
  const payload = deepClone(state);
  payload.currentPageIndex = currentPageIndex;
  payload.totalPages = pages.length;
  payload.dockSide = getDockSide();
  payload.appVersion = app.getVersion();
  return payload;
}

function getBrushDefaults() {
  return state.brushDefaults;
}

function getPenBrushDefaults() {
  return state.brushDefaults.pen;
}

function getHighlighterBrushDefaults() {
  return state.brushDefaults.highlighter;
}

function getEraserBrushDefaults() {
  return state.brushDefaults.eraser;
}

function getHotkeys() {
  return state.hotkeys;
}

function getSceneState() {
  return {
    annotations: deepClone(annotations),
    currentPageIndex,
    totalPages: pages.length,
  };
}

function getBootstrapData(win) {
  const display = win.__overlayDisplay || null;
  return {
    appName: APP_NAME,
    appState: getAppState(),
    scene: getSceneState(),
    display,
    projectPath: win === editorWindow ? editorInitialPath : null,
  };
}

function broadcastState() {
  const payload = getAppState();
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send('app:state-changed', payload);
    }
  }

  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.webContents.send('app:state-changed', payload);
    toolbarWindow.moveTop();
  }

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('app:state-changed', payload);
  }

  updateTrayMenu();
  writePersistedState();
}

function isUsableWindow(win) {
  return Boolean(win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed());
}

function safeSend(win, channel, payload) {
  if (!isUsableWindow(win)) return false;
  win.webContents.send(channel, payload);
  return true;
}

function broadcastRecordingState(recordingState) {
  const payload = {
    ...recordingState,
    phase: recordingState?.phase || currentRecordingPhase || 'idle',
    sessionId: recordingState?.sessionId || activeRecordingSessionId,
    elapsedSeconds: recordingSeconds,
  };
  for (const win of overlayWindows.values()) {
    safeSend(win, 'recording:state-changed', payload);
  }
  if (isUsableWindow(toolbarWindow)) {
    const controlsActive = ['starting', 'recording', 'paused', 'finalizing'].includes(payload.phase);
    if (controlsActive) {
      toolbarWindow.setIgnoreMouseEvents(false);
      toolbarWindow.showInactive();
      toolbarWindow.moveTop();
    }
    safeSend(toolbarWindow, 'recording:state-changed', payload);
  }
  safeSend(settingsWindow, 'recording:state-changed', payload);
}

function broadcastScene() {
  syncPageStore();
  const payload = getSceneState();
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send('scene:changed', payload);
    }
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.moveTop();
  }
}

function updateTrayMenu() {
  if (!tray) {
    return;
  }

  const template = [
    {
      label: state.overlayVisible ? 'Hide Overlay' : 'Show Overlay',
      click: () => toggleOverlayVisibility(),
    },
    {
      label: state.passThrough ? 'Disable Pass-through' : 'Enable Pass-through',
      click: () => setPassThrough(!state.passThrough),
    },
    { type: 'separator' },
    {
      label: 'Tools',
      submenu: [
        { label: 'Pen', type: 'radio', checked: state.activeTool === 'pen', click: () => setTool('pen') },
        { label: 'Highlighter', type: 'radio', checked: state.activeTool === 'highlighter', click: () => setTool('highlighter') },
        { label: 'Magic Shapes', type: 'radio', checked: state.activeTool === 'shapes', click: () => setTool('shapes') },
        { label: 'Laser Pointer', type: 'radio', checked: state.activeTool === 'laser', click: () => setTool('laser') },
        { label: 'Text Tool', type: 'radio', checked: state.activeTool === 'text', click: () => setTool('text') },
        { label: 'Desktop Cursor', type: 'radio', checked: state.passThrough || state.activeTool === 'cursor', click: () => setPassThrough(true) },
        { label: 'Spotlight', type: 'radio', checked: state.activeTool === 'spotlight', click: () => setTool('spotlight') },
        { label: 'Magnifier', type: 'radio', checked: state.activeTool === 'magnifier', click: () => setTool('magnifier') },
        { label: 'Eraser', type: 'radio', checked: state.activeTool === 'eraser', click: () => setTool('eraser') },
      ],
    },
    { type: 'separator' },
    { label: 'Settings...', click: () => showSettingsWindow() },
    { label: 'Visit Website...', click: () => shell.openExternal('https://rehmanahmad.pro') },
    { type: 'separator' },
    { label: 'Undo', click: () => undo() },
    { label: 'Redo', click: () => redo() },
    { label: 'Clear Annotations', click: () => clearScene() },
    { type: 'separator' },
    { label: 'Quit', click: () => quitApp() },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTrayIcon() {
  const trayPngPath = path.join(__dirname, 'src', 'renderer', 'assets', 'tray-icon.png');
  const pngIcon = nativeImage.createFromPath(trayPngPath);
  if (!pngIcon.isEmpty()) {
    const resizedPng = pngIcon.resize({ width: 20, height: 20, quality: 'best' });
    resizedPng.setTemplateImage(false);
    return resizedPng;
  }

  const traySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0b1220"/>
      <path d="M32 6 22 28l10 7 10-7L32 6Z" fill="#facc15"/>
      <path d="M22 28v26h8V34l-8-6Z" fill="#f8fafc"/>
      <path d="M42 28v26h-8V34l8-6Z" fill="#22d3ee"/>
      <path d="M26 48h12l-3 10h-6l-3-10Z" fill="#38bdf8"/>
      <path d="M27 25h10l-5 10-5-10Z" fill="#111827"/>
      <path d="M16 51h8" stroke="#67e8f9" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 51h8" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `.trim();
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(traySvg)}`);
  if (!img.isEmpty()) {
    const resized = img.resize({ width: 20, height: 20, quality: 'best' });
    resized.setTemplateImage(false);
    return resized;
  }
  const fallback = nativeImage.createFromPath(path.join(__dirname, 'src', 'renderer', 'icon.svg'));
  const resizedFallback = fallback.resize({ width: 20, height: 20, quality: 'best' });
  resizedFallback.setTemplateImage(false);
  return resizedFallback;
}

function createAppIcon() {
  const appPngPath = path.join(__dirname, 'src', 'renderer', 'assets', 'app-icon.png');
  const pngIcon = nativeImage.createFromPath(appPngPath);
  if (!pngIcon.isEmpty()) {
    pngIcon.setTemplateImage(false);
    return pngIcon;
  }
  const fallback = nativeImage.createFromPath(path.join(__dirname, 'src', 'renderer', 'icon.svg'));
  fallback.setTemplateImage(false);
  return fallback;
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip(APP_NAME);
  updateTrayMenu();
}

function windowUrl(fileName, query = {}) {
  const url = new URL(pathToFileURL(path.join(__dirname, 'src', 'renderer', fileName)).href);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function editorUrl(query = {}) {
  const url = new URL(pathToFileURL(path.join(__dirname, 'dist-renderer', 'editor.html')).href);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function applyCapturePolicy(win, role) {
  if (!win || win.isDestroyed()) return;
  const excludeFromCapture = shouldExcludeFromCapture(role);
  win.__repenWindowRole = role;
  win.__repenCaptureExcluded = excludeFromCapture;
  try {
    win.setContentProtection(excludeFromCapture);
  } catch (error) {
    console.error(`Failed to apply capture policy for ${role}:`, error);
  }
  if (!win.__repenCapturePolicyReloadListener) {
    win.__repenCapturePolicyReloadListener = true;
    win.webContents.on('did-finish-load', () => {
      if (!win.isDestroyed()) applyCapturePolicy(win, win.__repenWindowRole);
    });
  }
}

function getRepenOwnedWindowHandleCandidates() {
  const windows = [
    toolbarWindow,
    settingsWindow,
    selectorWindow,
    countdownWindow,
    editorWindow,
    ...overlayWindows.values(),
  ].filter((win) => win && !win.isDestroyed());
  const candidates = new Set();
  for (const win of windows) {
    for (const candidate of nativeWindowHandleCandidates(win.getNativeWindowHandle())) {
      candidates.add(candidate);
    }
  }
  return [...candidates];
}

function enterEditorMode() {
  if (!presenterVisibilityBeforeEditor) {
    presenterVisibilityBeforeEditor = {
      toolbar: Boolean(toolbarWindow && !toolbarWindow.isDestroyed() && toolbarWindow.isVisible()),
      overlays: new Map(
        [...overlayWindows.entries()].map(([displayId, win]) => [displayId, !win.isDestroyed() && win.isVisible()]),
      ),
    };
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) toolbarWindow.hide();
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) win.hide();
  }
}

function exitEditorMode() {
  const visibility = presenterVisibilityBeforeEditor;
  presenterVisibilityBeforeEditor = null;
  if (!visibility) return;
  for (const [displayId, wasVisible] of visibility.overlays.entries()) {
    const win = overlayWindows.get(displayId);
    if (wasVisible && win && !win.isDestroyed()) win.showInactive();
  }
  if (visibility.toolbar && toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.showInactive();
    toolbarWindow.moveTop();
  }
  updateOverlayIgnoreMouse();
}

function createOverlayWindow(display) {
  const windowBounds = display.bounds;
  const win = new BrowserWindow({
    x: windowBounds.x,
    y: windowBounds.y,
    width: windowBounds.width,
    height: windowBounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    skipTaskbar: true,
    type: 'utility',
    hasShadow: false,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(win, WindowRole.PRESENTATION_OVERLAY);
  win.__overlayDisplay = {
    id: display.id,
    bounds: deepClone(display.bounds),
    scaleFactor: display.scaleFactor,
  };

  win.loadURL(windowUrl('overlay.html', { displayId: display.id }));
  const logPath = path.join(__dirname, 'rep-debug.log');
  
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const logLine = `[Overlay Console] ${message} (${sourceId}:${line})\n`;
    console.log(logLine.trim());
    try { fs.appendFileSync(logPath, logLine); } catch (e) {}
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'v') {
      const boardActive = state.backgroundMode && state.backgroundMode !== 'transparent';
      if (boardActive || !state.passThrough) {
        pasteClipboardImage();
        event.preventDefault();
      }
    }
  });

  win.on('focus', () => {
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.moveTop();
    }
  });

  win.on('closed', () => {
    overlayWindows.delete(display.id);
  });

  overlayWindows.set(display.id, win);
  updateOverlayIgnoreMouse();
  win.showInactive();
  return win;
}

function createToolbarWindow() {
  const primary = screen.getPrimaryDisplay();
  const toolbarBounds = getToolbarWindowBounds(primary);

  toolbarWindow = new BrowserWindow({
    ...toolbarBounds,
    transparent: true,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    hasShadow: false,
    icon: createAppIcon(),
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(toolbarWindow, WindowRole.TOOLBAR);
  const logPath = path.join(__dirname, 'rep-debug.log');

  toolbarWindow.loadURL(windowUrl('toolbar.html'));
  
  toolbarWindow.setIgnoreMouseEvents(true, { forward: true });
  toolbarWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const logLine = `[Renderer Console] ${message} (${sourceId}:${line})\n`;
    console.log(logLine.trim());
    try { fs.appendFileSync(logPath, logLine); } catch (e) {}
  });
  
  toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
  toolbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  toolbarWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'v') {
      const boardActive = state.backgroundMode && state.backgroundMode !== 'transparent';
      if (boardActive || !state.passThrough) {
        pasteClipboardImage();
        event.preventDefault();
      }
    }
  });

  toolbarWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      toolbarWindow.hide();
    }
  });

  toolbarWindow.on('move', () => {
    if (!toolbarWindow._moveTimeout) {
      toolbarWindow._moveTimeout = setTimeout(() => {
        toolbarWindow._moveTimeout = null;
        broadcastState();
      }, 100);
    }
  });

  toolbarWindow.on('moved', () => {
    if (toolbarWindow._moveTimeout) {
      clearTimeout(toolbarWindow._moveTimeout);
      toolbarWindow._moveTimeout = null;
    }
    broadcastState();
  });
  toolbarWindow.showInactive();
}

function getToolbarWindowBounds(display = screen.getPrimaryDisplay()) {
  const isHorizontal = state.toolbarOrientation === 'horizontal';
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

function ensureToolbarWindowCapacity() {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) return;
  const current = toolbarWindow.getBounds();
  const display = screen.getDisplayMatching(current) || screen.getPrimaryDisplay();
  const target = getToolbarWindowBounds(display);
  if (state.toolbarOrientation === 'horizontal') {
    if (current.width < target.width || current.height < target.height) {
      toolbarWindow.setBounds({
        x: Math.max(display.workArea.x, current.x - Math.max(0, target.width - current.width) / 2),
        y: current.y,
        width: Math.max(current.width, target.width),
        height: Math.max(current.height, target.height),
      });
    }
    return;
  }
  if (current.width < target.width) {
    const rightEdge = current.x + current.width;
    toolbarWindow.setBounds({
      x: rightEdge - target.width,
      y: current.y,
      width: target.width,
      height: current.height,
    });
  }
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    return settingsWindow;
  }

  const primary = screen.getPrimaryDisplay();
  const settingsWidth = 820;
  const settingsHeight = 640;
  const x = Math.round(primary.bounds.x + primary.bounds.width / 2 - settingsWidth / 2);
  const y = Math.round(primary.bounds.y + primary.bounds.height / 2 - settingsHeight / 2);

  settingsWindow = new BrowserWindow({
    x,
    y,
    width: settingsWidth,
    height: settingsHeight,
    frame: false,
    transparent: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    type: 'utility',
    hasShadow: false,
    icon: createAppIcon(),
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(settingsWindow, WindowRole.SETTINGS);
  settingsWindow.loadURL(windowUrl('settings.html'));
  settingsWindow.setAlwaysOnTop(true, 'screen-saver');
  settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  settingsWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      settingsWindow.hide();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

function createSelectorWindow() {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    return selectorWindow;
  }

  const primary = screen.getPrimaryDisplay();
  const selectorWidth = 720;
  const selectorHeight = 520;
  const x = Math.round(primary.bounds.x + primary.bounds.width / 2 - selectorWidth / 2);
  const y = Math.round(primary.bounds.y + primary.bounds.height / 2 - selectorHeight / 2);

  selectorWindow = new BrowserWindow({
    x,
    y,
    width: selectorWidth,
    height: selectorHeight,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    type: 'utility',
    hasShadow: false,
    icon: createAppIcon(),
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(selectorWindow, WindowRole.SELECTOR);
  selectorWindow.loadURL(windowUrl('selector.html'));
  selectorWindow.setAlwaysOnTop(true, 'screen-saver');
  selectorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  selectorWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      selectorWindow.hide();
    }
  });

  selectorWindow.on('closed', () => {
    selectorWindow = null;
  });

  return selectorWindow;
}

function showSelectorWindow() {
  createSelectorWindow();
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.show();
    selectorWindow.moveTop();
  }
}

function hideSelectorWindow() {
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.hide();
  }
}

function createCountdownWindow(displayId) {
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.destroy();
  }

  const displays = screen.getAllDisplays();
  const selectedDisplay = displays.find((d) => d.id === displayId) || screen.getPrimaryDisplay();
  const bounds = selectedDisplay.bounds;

  countdownWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    type: 'utility',
    hasShadow: false,
    backgroundColor: '#00000000',
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(countdownWindow, WindowRole.COUNTDOWN);
  countdownWindow.loadURL(windowUrl('countdown.html'));
  countdownWindow.setIgnoreMouseEvents(true);
  countdownWindow.setAlwaysOnTop(true, 'screen-saver');
  countdownWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  countdownWindow.on('closed', () => {
    countdownWindow = null;
  });

  return countdownWindow;
}

let editorInitialPath = null;

function createEditorWindow(initialPath = null) {
  if (editorWindow && !editorWindow.isDestroyed()) {
    if (initialPath) {
      editorInitialPath = initialPath;
      editorWindow.webContents.send('editor:load-project', initialPath);
    }
    enterEditorMode();
    editorWindow.show();
    editorWindow.focus();
    return editorWindow;
  }

  editorInitialPath = initialPath;

  const primary = screen.getPrimaryDisplay();
  const width = 1280;
  const height = 800;
  const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
  const y = Math.round(primary.bounds.y + (primary.bounds.height - height) / 2);

  editorWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    autoHideMenuBar: true,
    show: false,
    icon: createAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  applyCapturePolicy(editorWindow, WindowRole.EDITOR);
  const query = {};
  if (initialPath) {
    query.projectPath = initialPath;
  }
  editorWindow.setMenuBarVisibility(false);
  editorWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Editor Console:${level}] ${message} (${sourceId}:${line})`);
  });
  editorWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Editor failed to load (${errorCode}): ${errorDescription} - ${validatedURL}`);
  });
  editorWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Editor renderer exited:', details);
  });
  editorWindow.loadURL(editorUrl(query));

  editorWindow.once('ready-to-show', () => {
    enterEditorMode();
    editorWindow.show();
    editorWindow.focus();
  });

  editorWindow.on('closed', () => {
    editorWindow = null;
    editorInitialPath = null;
    exitEditorMode();
  });

  return editorWindow;
}



function showSettingsWindow() {
  if (!toolbarWindow || toolbarWindow.isDestroyed()) {
    createToolbarWindow();
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    if (!toolbarWindow.isVisible()) {
      toolbarWindow.show();
    }
    toolbarWindow.moveTop();
    toolbarWindow.webContents.send('toolbar:open-settings', getAppState());
  }
}

function hideSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.hide();
  }
}

function createOverlayWindows() {
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
  overlayWindows.clear();

  for (const display of screen.getAllDisplays()) {
    createOverlayWindow(display);
  }
}

function showOverlayWindows() {
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.showInactive();
    }
  }
}

function hideOverlayWindows() {
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.hide();
    }
  }
}

function toggleOverlayVisibility(forceValue) {
  state.overlayVisible = typeof forceValue === 'boolean' ? forceValue : !state.overlayVisible;
  if (state.overlayVisible) {
    showOverlayWindows();
  } else {
    hideOverlayWindows();
  }
  broadcastState();
}

function updateOverlayIgnoreMouse() {
  const shouldIgnore = state.passThrough;

  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      if (shouldIgnore) {
        win.setIgnoreMouseEvents(true, { forward: true });
      } else {
        win.setIgnoreMouseEvents(false);
      }
      win.setFocusable(!shouldIgnore);
    }
  }
}

function setPassThrough(enabled) {
  state.passThrough = enabled;
  if (state.passThrough) {
    state.activeTool = 'cursor';
    state.magnifierBgUrls = null;
  } else if (state.activeTool === 'cursor') {
    state.activeTool = 'pen';
  }
  updateOverlayIgnoreMouse();
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.moveTop();
  }
  broadcastState();
}

function setBackgroundMode(mode) {
  const oldMode = state.backgroundMode || 'transparent';
  const newMode = mode || 'transparent';
  if (oldMode === newMode) return;

  syncPageStore();

  state.backgroundMode = newMode;
  if (newMode === 'whiteboard') state.boardColor = '#ffffff';
  if (newMode === 'blackboard') state.boardColor = '#18181c';

  if (newMode === 'transparent') {
    annotations = desktopPage.annotations || [];
    undoStack = desktopPage.undoStack || [];
    redoStack = desktopPage.redoStack || [];
  } else {
    const page = pages[currentPageIndex] || { annotations: [], undoStack: [], redoStack: [] };
    annotations = page.annotations || [];
    undoStack = page.undoStack || [];
    redoStack = page.redoStack || [];
  }

  if (state.backgroundMode !== 'transparent') {
    setPassThrough(false);
  } else {
    broadcastState();
  }
  broadcastScene();
}

function cycleBackgroundMode() {
  const modes = ['transparent', 'whiteboard', 'blackboard', 'grid', 'ruled', 'staff'];
  const nextIdx = (modes.indexOf(state.backgroundMode || 'transparent') + 1) % modes.length;
  setBackgroundMode(modes[nextIdx]);
}

function setBoardColor(color) {
  if (!color) return;
  state.boardColor = color;
  broadcastState();
  broadcastScene();
}

function normalizeBoardViewport(viewport = {}) {
  const x = Number(viewport.x);
  const zoom = Number(viewport.zoom);
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0,
    zoom: Number.isFinite(zoom) ? Math.max(0.35, Math.min(3, Math.round(zoom * 100) / 100)) : 1,
  };
}

function setBoardViewport(viewport = {}) {
  state.boardViewport = normalizeBoardViewport({
    ...state.boardViewport,
    ...(viewport || {}),
  });
  broadcastState();
  broadcastScene();
  return getAppState();
}

function setClickHalo(enabled) {
  state.clickHalo = Boolean(enabled);
  broadcastState();
}

function setExportIncludeBackground(enabled) {
  state.exportDefaults.includeBackground = Boolean(enabled);
  broadcastState();
}


let isCapturingMagnifier = false;

async function captureMagnifierBackground() {
  if (isCapturingMagnifier) return;
  isCapturingMagnifier = true;
  try {
    const allDisplays = screen.getAllDisplays();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    const bgUrls = {};
    for (const disp of allDisplays) {
      let matched = sources.find((s) => s.display_id === disp.id.toString() || s.id === `screen:${disp.id}:0` || s.id === `screen:${disp.id}`);
      if (!matched && sources.length > 0) {
        const idx = allDisplays.findIndex((d) => d.id === disp.id);
        matched = (idx >= 0 && sources[idx]) ? sources[idx] : sources[0];
      }
      if (matched && matched.thumbnail) {
        bgUrls[disp.id] = matched.thumbnail.toDataURL();
      }
    }
    if (state.activeTool !== 'magnifier' || state.passThrough) {
      state.magnifierBgUrls = null;
      broadcastState();
      return;
    }
    state.magnifierBgUrls = bgUrls;
    broadcastState();
  } catch (err) {
    console.error('Failed to capture magnifier background:', err);
  } finally {
    isCapturingMagnifier = false;
  }
}

function setSpotlight(radius, alpha) {
  if (!state.spotlight) state.spotlight = { radius: 150, alpha: 0.75 };
  if (typeof radius === 'number') state.spotlight.radius = Math.max(50, Math.min(500, radius));
  if (typeof alpha === 'number') state.spotlight.alpha = Math.max(0.1, Math.min(0.95, alpha));
  broadcastState();
}

function setTool(tool) {
  const previousTool = state.activeTool;
  const previousBrush =
    previousTool === 'highlighter'
      ? state.brushDefaults.highlighter
      : previousTool === 'calligraphy'
      ? state.brushDefaults.calligraphy
      : previousTool === 'eraser'
      ? state.brushDefaults.pen
      : state.brushDefaults.pen;

  state.activeTool = tool;
  if (tool === 'calligraphy' && previousBrush && previousBrush.color) {
    state.brushDefaults.calligraphy.color = previousBrush.color;
  }
  if (!state.overlayVisible) {
    state.overlayVisible = true;
    showOverlayWindows();
  }
  state.passThrough = false;
  broadcastState();
  updateOverlayIgnoreMouse();
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.moveTop();
  }
  if (tool === 'magnifier') {
    captureMagnifierBackground();
  } else {
    state.magnifierBgUrls = null;
  }
}

function setToolbarOrientation(orientation) {
  state.toolbarOrientation = orientation === 'horizontal' ? 'horizontal' : 'vertical';
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.setBounds(getToolbarWindowBounds(screen.getPrimaryDisplay()));
  }
  writePersistedState();
  broadcastState();
}

function setShapeType(shapeType) {
  state.activeShapeType = shapeType || 'rectangle';
  broadcastState();
  writePersistedState();
}

function setTextMode(mode) {
  state.textMode = mode || 'plain';
  broadcastState();
  writePersistedState();
}

function setColor(color) {
  if (state.activeTool === 'highlighter') {
    state.brushDefaults.highlighter.color = color;
  } else if (state.activeTool === 'calligraphy') {
    state.brushDefaults.calligraphy.color = color;
  } else {
    state.brushDefaults.pen.color = color;
  }
  broadcastState();
}

function setWidth(width) {
  const nextWidth = Math.max(1, Number(width) || 1);
  if (state.activeTool === 'highlighter') {
    state.brushDefaults.highlighter.width = nextWidth;
  } else if (state.activeTool === 'calligraphy') {
    state.brushDefaults.calligraphy.width = nextWidth;
  } else if (state.activeTool === 'eraser') {
    state.brushDefaults.eraser.radius = nextWidth;
  } else {
    state.brushDefaults.pen.width = nextWidth;
  }
  broadcastState();
}

function setOpacity(opacity) {
  const nextOpacity = Math.min(1, Math.max(0.1, Number(opacity) || 1));
  if (state.activeTool === 'highlighter') {
    state.brushDefaults.highlighter.opacity = nextOpacity;
  } else if (state.activeTool === 'calligraphy') {
    state.brushDefaults.calligraphy.opacity = nextOpacity;
  } else if (state.activeTool !== 'eraser') {
    state.brushDefaults.pen.opacity = nextOpacity;
  }
  broadcastState();
}

function pushUndoSnapshot() {
  undoStack.push(deepClone(annotations));
  if (undoStack.length > 50) {
    undoStack.shift();
  }
}

function recordSceneChange(mutator) {
  pushUndoSnapshot();
  redoStack = [];
  mutator();
  broadcastScene();
}

function undo() {
  if (!undoStack.length) {
    return;
  }
  redoStack.push(deepClone(annotations));
  annotations = undoStack.pop();
  broadcastScene();
}

function redo() {
  if (!redoStack.length) {
    return;
  }
  undoStack.push(deepClone(annotations));
  annotations = redoStack.pop();
  broadcastScene();
}

function clearScene() {
  if (!annotations.length) {
    return;
  }
  recordSceneChange(() => {
    annotations = [];
  });
}

function revertAutoShape() {
  let found = false;
  recordSceneChange(() => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (a.isAutoShape) {
        found = true;
        if (a.tool === 'shapes') {
          a.tool = a.origTool || 'pen';
          if (a.origPoints) {
            a.points = deepClone(a.origPoints);
          }
          delete a.shapeType;
          delete a.start;
          delete a.end;
        } else {
          a.tool = 'shapes';
          a.shapeType = a.origShapeType || 'circle';
          if (a.origStart) a.start = deepClone(a.origStart);
          if (a.origEnd) a.end = deepClone(a.origEnd);
        }
        break;
      }
    }
  });
  if (found) {
    broadcastScene();
  }
}

function setPage(index) {
  const target = Number(index);
  if (isNaN(target) || target < 0) return getAppState();
  syncPageStore();
  while (pages.length <= target) {
    pages.push({ annotations: [], undoStack: [], redoStack: [] });
  }
  currentPageIndex = target;
  state.boardViewport = normalizeBoardViewport({ ...state.boardViewport, x: 0 });
  const page = pages[currentPageIndex];
  annotations = page.annotations || [];
  undoStack = page.undoStack || [];
  redoStack = page.redoStack || [];
  broadcastScene();
  broadcastState();
  return getAppState();
}

function prevPage() {
  if (currentPageIndex > 0) {
    setPage(currentPageIndex - 1);
  }
  return getAppState();
}

function nextPage() {
  setPage(currentPageIndex + 1);
  return getAppState();
}

async function showModalDialog(type, options) {
  const helperWin = toolbarWindow || overlayWindows.values().next().value;
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  }
  try {
    if (type === 'save') {
      return helperWin && !helperWin.isDestroyed() ? await dialog.showSaveDialog(helperWin, options) : await dialog.showSaveDialog(options);
    } else {
      return helperWin && !helperWin.isDestroyed() ? await dialog.showOpenDialog(helperWin, options) : await dialog.showOpenDialog(options);
    }
  } finally {
    updateOverlayIgnoreMouse();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.moveTop();
    }
  }
}

function autoArchiveCurrentSession() {
  syncPageStore();
  const hasAnnotations = pages.some(p => p.annotations && p.annotations.length > 0);
  if (!hasAnnotations) return;

  try {
    const boardsDir = path.join(app.getPath('userData'), 'boards');
    fs.mkdirSync(boardsDir, { recursive: true });
    
    // Check if current session already matches the last saved state to avoid duplicates
    // But for simplicity, we just save a new timestamped file.
    const ts = new Date().toLocaleString().replace(/[:./\\]/g, '-');
    const filePath = path.join(boardsDir, `Board_${ts}.rpen`);
    
    const payload = {
      version: 2,
      type: 'repen-session',
      currentPageIndex,
      pages: pages.map(p => ({
        annotations: p.annotations || []
      })),
      state: {
        backgroundMode: state.backgroundMode,
        clickHalo: state.clickHalo,
        exportDefaults: state.exportDefaults
      }
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to auto-archive session:', err);
  }
}

async function saveSession() {
  syncPageStore();
  const { filePath, canceled } = await showModalDialog('save', {
    title: 'Save RePen Notebook (.rpen)',
    defaultPath: path.join(app.getPath('documents'), `RePen_Notebook_${Date.now()}.rpen`),
    filters: [
      { name: 'RePen Notebook (*.rpen)', extensions: ['rpen'] },
      { name: 'Legacy Session (*.ink)', extensions: ['ink'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return { ok: false };

  try {
    const payload = {
      version: 2,
      type: 'repen-session',
      currentPageIndex,
      pages: pages.map(p => ({
        annotations: p.annotations || []
      })),
      state: {
        backgroundMode: state.backgroundMode,
        clickHalo: state.clickHalo,
        exportDefaults: state.exportDefaults
      }
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { ok: true, filePath };
  } catch (err) {
    console.error('Failed to save session:', err);
    return { ok: false, error: err.message };
  }
}

async function loadSession() {
  const { filePaths, canceled } = await showModalDialog('open', {
    title: 'Open RePen Notebook (.rpen, .ink)',
    filters: [
      { name: 'RePen Notebooks (*.rpen, *.ink)', extensions: ['rpen', 'ink'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (canceled || !filePaths || !filePaths.length) return { ok: false };

  autoArchiveCurrentSession();
  const result = loadSessionFromFile(filePaths[0]);
  return result;
}

function loadSessionFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);

    if (parsed.type === 'repen-session') {
      if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        pages = parsed.pages.map(p => ({
          annotations: deepClone(p.annotations || []),
          undoStack: [],
          redoStack: []
        }));
      } else {
        return { ok: false, error: 'Invalid session file' };
      }
    } else {
      // Legacy .ink
      const legacyPages = Array.isArray(parsed) ? parsed : [parsed];
      pages = legacyPages.map(p => ({
        annotations: Array.isArray(p.annotations) ? deepClone(p.annotations) : [],
        undoStack: [],
        redoStack: []
      }));
    }

    const targetIndex = Math.min(Math.max(0, parsed.currentPageIndex || 0), pages.length - 1);
    currentPageIndex = targetIndex;
    const page = pages[currentPageIndex];
    annotations = page.annotations || [];
    undoStack = page.undoStack || [];
    redoStack = page.redoStack || [];
    
    if (parsed.state && parsed.state.backgroundMode && parsed.state.backgroundMode !== 'transparent') {
      state.backgroundMode = parsed.state.backgroundMode;
    } else if (state.backgroundMode === 'transparent') {
      state.backgroundMode = 'whiteboard';
    }

    broadcastScene();
    broadcastState();
    return { ok: true };
  } catch (err) {
    console.error('Failed to load session:', err);
    return { ok: false, error: err.message };
  }
}

function newSession() {
  autoArchiveCurrentSession();
  pages = [{ annotations: [], undoStack: [], redoStack: [] }];
  currentPageIndex = 0;
  state.boardViewport = { x: 0, zoom: 1 };
  if (state.backgroundMode === 'transparent') {
    desktopPage = { annotations: [], undoStack: [], redoStack: [] };
    annotations = desktopPage.annotations;
    undoStack = desktopPage.undoStack;
    redoStack = desktopPage.redoStack;
  } else {
    annotations = pages[0].annotations;
    undoStack = pages[0].undoStack;
    redoStack = pages[0].redoStack;
  }
  broadcastScene();
  broadcastState();
  return { ok: true };
}

async function exportPdf() {
  syncPageStore();

  const { filePath, canceled } = await showModalDialog('save', {
    title: 'Export Document as PDF',
    defaultPath: path.join(app.getPath('documents'), `RePen_Document_${Date.now()}.pdf`),
    filters: [
      { name: 'PDF Document (*.pdf)', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return { ok: false };

  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds || { x: 0, y: 0, width: 1280, height: 720 };
  const exportPages = state.backgroundMode && state.backgroundMode !== 'transparent'
    ? pages.map((page) => page.annotations || [])
    : [annotations || []];
  const html = buildPdfExportHtml({
    pages: exportPages,
    bounds,
    backgroundMode: state.backgroundMode || 'whiteboard',
    boardColor: state.boardColor,
  });
  let pdfWindow = null;
  try {
    pdfWindow = new BrowserWindow({
      show: false,
      width: Math.max(800, bounds.width),
      height: Math.max(600, bounds.height),
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: true,
      margins: {
        marginType: 'none',
      },
    });
    fs.writeFileSync(filePath, pdfData);
    return { ok: true, filePath };
  } catch (err) {
    console.error('Failed to export PDF:', err);
    return { ok: false, error: err.message };
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.destroy();
    }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSvgColor(value, fallback = '#ff5a5f') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toPdfPoint(point, bounds) {
  return {
    x: Number(point?.x || 0) - bounds.x,
    y: Number(point?.y || 0) - bounds.y,
  };
}

function getPdfPageBounds(pageAnnotations, baseBounds) {
  const baseX = Number(baseBounds.x || 0);
  const baseY = Number(baseBounds.y || 0);
  const baseWidth = Math.max(1, Number(baseBounds.width || 1280));
  const baseHeight = Math.max(1, Number(baseBounds.height || 720));
  let maxRight = baseX + baseWidth;
  const margin = 80;

  const includePoint = (point, extra = 0) => {
    if (!point) return;
    const x = Number(point.x);
    if (Number.isFinite(x)) {
      maxRight = Math.max(maxRight, x + extra);
    }
  };

  for (const stroke of pageAnnotations || []) {
    const extra = Math.max(12, Number(stroke?.width || 0) / 2);
    if (stroke?.tool === 'text' || stroke?.tool === 'image') {
      includePoint({ x: stroke.x + Number(stroke.width || (stroke.tool === 'image' ? 400 : 200)) }, margin);
      continue;
    }
    if (stroke?.tool === 'shapes' || stroke?.shapeType) {
      includePoint(stroke.start, extra + margin);
      includePoint(stroke.end, extra + margin);
    }
    if (Array.isArray(stroke?.points)) {
      for (const point of stroke.points) {
        includePoint(point, extra + margin);
      }
    }
  }

  return {
    x: baseX,
    y: baseY,
    width: Math.max(baseWidth, Math.ceil(maxRight - baseX)),
    height: baseHeight,
  };
}

function renderPdfBackground(mode, color, width, height) {
  const bg = normalizeSvgColor(color, mode === 'blackboard' ? '#18181c' : '#ffffff');
  const parts = [`<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeHtml(bg)}"/>`];
  if (mode === 'grid') {
    for (let x = 0; x <= width; x += 28) parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#e0e0e8" stroke-width="1"/>`);
    for (let y = 0; y <= height; y += 28) parts.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#e0e0e8" stroke-width="1"/>`);
  } else if (mode === 'ruled') {
    for (let y = 40; y <= height; y += 32) parts.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`);
    parts.push(`<line x1="80" y1="0" x2="80" y2="${height}" stroke="#f87171" stroke-width="1"/>`);
  } else if (mode === 'staff') {
    for (let y = 60; y <= height; y += 140) {
      for (let i = 0; i < 5; i += 1) {
        const sy = y + i * 14;
        parts.push(`<line x1="0" y1="${sy}" x2="${width}" y2="${sy}" stroke="#cbd5e1" stroke-width="1.5"/>`);
      }
    }
  }
  return parts.join('');
}

function renderPdfStroke(stroke, bounds) {
  if (!stroke || stroke.tool === 'eraser') return '';
  const color = escapeHtml(normalizeSvgColor(stroke.color));
  const width = Math.max(1, Number(stroke.width || 4));
  const opacity = typeof stroke.opacity === 'number' ? Math.max(0, Math.min(1, stroke.opacity)) : 1;

  if (stroke.tool === 'text') {
    const pt = toPdfPoint({ x: stroke.x, y: stroke.y }, bounds);
    const lines = String(stroke.text || '').split(/\r?\n/);
    const fontSizeMatch = String(stroke.font || '').match(/(\d+(?:\.\d+)?)px/);
    const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 22;
    const tspans = lines.map((line, index) => `<tspan x="${pt.x}" dy="${index === 0 ? fontSize : fontSize * 1.25}">${escapeHtml(line)}</tspan>`).join('');
    return `<text x="${pt.x}" y="${pt.y + fontSize}" fill="${color}" opacity="${opacity}" font-family="Segoe UI, sans-serif" font-size="${fontSize}" font-weight="700">${tspans}</text>`;
  }

  if (stroke.tool === 'image' && stroke.dataUrl) {
    const pt = toPdfPoint({ x: stroke.x, y: stroke.y }, bounds);
    const w = Number(stroke.width || 400);
    const h = Number(stroke.height || 300);
    return `<image href="${escapeHtml(stroke.dataUrl)}" x="${pt.x}" y="${pt.y}" width="${w}" height="${h}" opacity="${opacity}"/>`;
  }

  if (stroke.tool === 'shapes' || stroke.shapeType) {
    const start = toPdfPoint(stroke.start || stroke.points?.[0] || { x: 0, y: 0 }, bounds);
    const end = toPdfPoint(stroke.end || stroke.points?.[stroke.points.length - 1] || start, bounds);
    const shapeType = stroke.shapeType || 'rectangle';
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    const common = `fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"`;
    if (shapeType === 'circle') return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${common}/>`;
    if (shapeType === 'line') return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" ${common}/>`;
    if (shapeType === 'triangle') return `<polygon points="${start.x},${end.y} ${x + w / 2},${start.y} ${end.x},${end.y}" ${common}/>`;
    if (shapeType === 'arrow') {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const head = Math.max(12, width * 3);
      const ax1 = end.x - head * Math.cos(angle - Math.PI / 6);
      const ay1 = end.y - head * Math.sin(angle - Math.PI / 6);
      const ax2 = end.x - head * Math.cos(angle + Math.PI / 6);
      const ay2 = end.y - head * Math.sin(angle + Math.PI / 6);
      return `<g ${common}><line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}"/><line x1="${end.x}" y1="${end.y}" x2="${ax1}" y2="${ay1}"/><line x1="${end.x}" y1="${end.y}" x2="${ax2}" y2="${ay2}"/></g>`;
    }
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${common}/>`;
  }

  if (!Array.isArray(stroke.points) || stroke.points.length === 0) return '';
  const points = stroke.points.map((point) => {
    const pt = toPdfPoint(point, bounds);
    return `${pt.x},${pt.y}`;
  }).join(' ');
  return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function buildPdfExportHtml({ pages: pdfPages, bounds, backgroundMode, boardColor }) {
  const mode = backgroundMode === 'transparent' ? 'whiteboard' : backgroundMode;
  const pageHtml = (pdfPages.length ? pdfPages : [[]]).map((pageAnnotations, index) => {
    const pageBounds = getPdfPageBounds(pageAnnotations, bounds);
    const width = Math.max(1, Math.round(pageBounds.width || 1280));
    const height = Math.max(1, Math.round(pageBounds.height || 720));
    const strokes = (pageAnnotations || []).map((stroke) => renderPdfStroke(stroke, pageBounds)).join('');
    return `
      <section class="pdf-page" aria-label="Page ${index + 1}">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          ${renderPdfBackground(mode, boardColor, width, height)}
          ${strokes}
        </svg>
      </section>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .pdf-page { width: 297mm; height: 210mm; page-break-after: always; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; }
    .pdf-page:last-child { page-break-after: auto; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>${pageHtml}</body>
</html>`;
}

function pointDistance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return pointDistance(px, py, x1, y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  return pointDistance(px, py, nearestX, nearestY);
}

function ccw(ax, ay, bx, by, cx, cy) {
  return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
         ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);
}

function segmentToSegmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
  if (segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return 0;
  return Math.min(
    segmentDistance(x1, y1, x3, y3, x4, y4),
    segmentDistance(x2, y2, x3, y3, x4, y4),
    segmentDistance(x3, y3, x1, y1, x2, y2),
    segmentDistance(x4, y4, x1, y1, x2, y2)
  );
}

function strokeHitsEraserPath(stroke, erasePoints, radius) {
  if (erasePoints.length < 2) return false;

  if (stroke.tool === 'text' || stroke.tool === 'image') {
    const w = typeof stroke.width === 'number' ? stroke.width : 200;
    const h = typeof stroke.height === 'number' ? stroke.height : 80;
    
    for (let i = 0; i < erasePoints.length - 1; i++) {
      const a = erasePoints[i], b = erasePoints[i+1];
      const distTop = segmentToSegmentDistance(stroke.x, stroke.y, stroke.x + w, stroke.y, a.x, a.y, b.x, b.y);
      const distBottom = segmentToSegmentDistance(stroke.x, stroke.y + h, stroke.x + w, stroke.y + h, a.x, a.y, b.x, b.y);
      const distLeft = segmentToSegmentDistance(stroke.x, stroke.y, stroke.x, stroke.y + h, a.x, a.y, b.x, b.y);
      const distRight = segmentToSegmentDistance(stroke.x + w, stroke.y, stroke.x + w, stroke.y + h, a.x, a.y, b.x, b.y);
      if (Math.min(distTop, distBottom, distLeft, distRight) <= radius) return true;
      if (a.x >= stroke.x && a.x <= stroke.x + w && a.y >= stroke.y && a.y <= stroke.y + h) return true;
    }
    return false;
  }

  if ((stroke.tool === 'shapes' || stroke.shapeType) && stroke.shapeType !== 'freehand_arrow') {
    const sx = stroke.start?.x || 0, sy = stroke.start?.y || 0;
    const ex = stroke.end?.x || 0, ey = stroke.end?.y || 0;
    
    for (let i = 0; i < erasePoints.length - 1; i++) {
      const a = erasePoints[i], b = erasePoints[i+1];
      if (stroke.shapeType === 'line') {
        if (segmentToSegmentDistance(sx, sy, ex, ey, a.x, a.y, b.x, b.y) <= radius) return true;
      } else if (stroke.shapeType === 'rectangle') {
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        const distT = segmentToSegmentDistance(minX, minY, maxX, minY, a.x, a.y, b.x, b.y);
        const distB = segmentToSegmentDistance(minX, maxY, maxX, maxY, a.x, a.y, b.x, b.y);
        const distL = segmentToSegmentDistance(minX, minY, minX, maxY, a.x, a.y, b.x, b.y);
        const distR = segmentToSegmentDistance(maxX, minY, maxX, maxY, a.x, a.y, b.x, b.y);
        if (Math.min(distT, distB, distL, distR) <= radius) return true;
        if (a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY) return true;
      } else if (stroke.shapeType === 'circle') {
        const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
        const r = Math.hypot(ex - sx, ey - sy) / 2;
        const distToCenter = segmentDistance(cx, cy, a.x, a.y, b.x, b.y);
        if (Math.abs(distToCenter - r) <= radius || distToCenter <= r) return true;
      } else if (stroke.shapeType === 'triangle' || stroke.shapeType === 'arrow' || !stroke.shapeType) {
        // Fallback for triangle, arrow, and others using bounding box
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        if (a.x >= minX - radius && a.x <= maxX + radius && a.y >= minY - radius && a.y <= maxY + radius) return true;
      }
    }
    return false;
  }

  if (!Array.isArray(stroke.points)) return false;
  const threshold = radius + (typeof stroke.width === 'number' ? stroke.width : 4) / 2;
  
  for (let pIdx = 0; pIdx < stroke.points.length; pIdx++) {
    const p1 = stroke.points[pIdx];
    const p2 = pIdx < stroke.points.length - 1 ? stroke.points[pIdx + 1] : p1;
    for (let i = 0; i < erasePoints.length - 1; i++) {
      const a = erasePoints[i], b = erasePoints[i+1];
      if (segmentToSegmentDistance(p1.x, p1.y, p2.x, p2.y, a.x, a.y, b.x, b.y) <= threshold) {
        return true;
      }
    }
  }
  return false;
}

function eraseStrokeSegments(stroke, erasePoints, radius) {
  if (stroke.tool === 'text' || stroke.tool === 'shapes' || stroke.shapeType || stroke.tool === 'image') {
    if (strokeHitsEraserPath(stroke, erasePoints, radius)) {
      return [];
    }
    return [stroke];
  }

  if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
    return [stroke];
  }

  const threshold = radius + (typeof stroke.width === 'number' ? stroke.width : 4) / 2;
  const hits = new Array(stroke.points.length).fill(false);
  let anyHit = false;

  for (let pIdx = 0; pIdx < stroke.points.length; pIdx += 1) {
    const p1 = stroke.points[pIdx];
    const p2 = pIdx < stroke.points.length - 1 ? stroke.points[pIdx + 1] : p1;
    
    for (let i = 0; i < erasePoints.length - 1; i += 1) {
      const a = erasePoints[i];
      const b = erasePoints[i + 1];
      if (segmentToSegmentDistance(p1.x, p1.y, p2.x, p2.y, a.x, a.y, b.x, b.y) <= threshold) {
        hits[pIdx] = true;
        if (pIdx < stroke.points.length - 1) hits[pIdx + 1] = true;
        anyHit = true;
        break;
      }
    }
  }

  if (!anyHit) {
    return [stroke];
  }

  const resultingSegments = [];
  let currentChunk = [];

  for (let pIdx = 0; pIdx < stroke.points.length; pIdx += 1) {
    if (!hits[pIdx]) {
      currentChunk.push(stroke.points[pIdx]);
    } else {
      if (currentChunk.length > 0) {
        if (currentChunk.length === 1) {
          currentChunk.push({ ...currentChunk[0] });
        }
        resultingSegments.push({
          ...stroke,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          points: currentChunk,
        });
        currentChunk = [];
      }
    }
  }

  if (currentChunk.length > 0) {
    if (currentChunk.length === 1) {
      currentChunk.push({ ...currentChunk[0] });
    }
    resultingSegments.push({
      ...stroke,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      points: currentChunk,
    });
  }

  return resultingSegments;
}

function erasePath(payload) {
  let { points = [], radius = state.brushDefaults.eraser.radius } = payload || {};
  if (points.length === 1) {
    points = [points[0], { x: points[0].x + 0.1, y: points[0].y + 0.1 }];
  } else if (points.length < 2) {
    return;
  }

  recordSceneChange(() => {
    const nextAnnotations = [];
    const deletedIds = [];
    const addedSegments = [];
    for (const stroke of annotations) {
      const segments = eraseStrokeSegments(stroke, points, radius);
      if (segments.length === 0) {
        deletedIds.push(stroke.id);
      } else if (segments.length === 1 && segments[0] === stroke) {
        nextAnnotations.push(stroke);
      } else {
        deletedIds.push(stroke.id);
        for (const seg of segments) {
          nextAnnotations.push(seg);
          addedSegments.push(seg);
        }
      }
    }
    annotations = nextAnnotations;

    if (presentationTrackService && presentationTrackService.isRecording()) {
      if (deletedIds.length > 0) {
        presentationTrackService.addEvent('annotation/delete', { annotationIds: deletedIds });
      }
      for (const added of addedSegments) {
        presentationTrackService.addEvent('annotation/add', { annotation: added });
      }
    }
  });
}

function extractAutoShapeMeta(stroke) {
  if (!stroke || !stroke.isAutoShape) return {};
  return {
    isAutoShape: true,
    origTool: stroke.origTool || 'pen',
    origPoints: Array.isArray(stroke.origPoints)
      ? stroke.origPoints.map((point) => ({ x: point.x, y: point.y }))
      : null,
    origShapeType: stroke.origShapeType || 'circle',
    origStart: stroke.origStart ? { x: stroke.origStart.x, y: stroke.origStart.y } : null,
    origEnd: stroke.origEnd ? { x: stroke.origEnd.x, y: stroke.origEnd.y } : null,
  };
}

function normalizeStroke(stroke) {
  const autoMeta = extractAutoShapeMeta(stroke);
  const tool = stroke.tool || 'pen';
  const id = stroke.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (tool === 'text') {
    return {
      id,
      tool: 'text',
      color: stroke.color || state.brushDefaults.pen.color,
      font: typeof stroke.font === 'string' ? stroke.font : 'bold 22px sans-serif',
      text: typeof stroke.text === 'string' ? stroke.text : '',
      textMode: stroke.textMode || state.textMode || 'plain',
      x: typeof stroke.x === 'number' ? stroke.x : 0,
      y: typeof stroke.y === 'number' ? stroke.y : 0,
      width: typeof stroke.width === 'number' ? stroke.width : 200,
      height: typeof stroke.height === 'number' ? stroke.height : 80,
    };
  }

  if (tool === 'image') {
    return {
      id,
      tool: 'image',
      dataUrl: typeof stroke.dataUrl === 'string' ? stroke.dataUrl : '',
      x: typeof stroke.x === 'number' ? stroke.x : 0,
      y: typeof stroke.y === 'number' ? stroke.y : 0,
      width: typeof stroke.width === 'number' ? stroke.width : 400,
      height: typeof stroke.height === 'number' ? stroke.height : 300,
      opacity: typeof stroke.opacity === 'number' ? stroke.opacity : 1,
    };
  }

  if (tool === 'shapes' || stroke.shapeType) {
    return {
      ...autoMeta,
      id,
      tool: 'shapes',
      shapeType: stroke.shapeType || 'rectangle',
      color: stroke.color || state.brushDefaults.pen.color,
      width: typeof stroke.width === 'number' ? stroke.width : state.brushDefaults.pen.width,
      opacity: typeof stroke.opacity === 'number' ? stroke.opacity : state.brushDefaults.pen.opacity,
      start: stroke.start ? { x: stroke.start.x, y: stroke.start.y } : { x: 0, y: 0 },
      end: stroke.end ? { x: stroke.end.x, y: stroke.end.y } : { x: 0, y: 0 },
      points: Array.isArray(stroke.points) ? stroke.points.map((point) => ({ x: point.x, y: point.y })) : [],
    };
  }

  const baseColor =
    tool === 'highlighter'
      ? stroke.color || state.brushDefaults.highlighter.color
      : tool === 'calligraphy'
      ? stroke.color || state.brushDefaults.calligraphy.color
      : stroke.color || state.brushDefaults.pen.color;
  const baseWidth =
    tool === 'highlighter'
      ? stroke.width || state.brushDefaults.highlighter.width
      : tool === 'calligraphy'
      ? typeof stroke.width === 'number' ? stroke.width : state.brushDefaults.calligraphy.width
      : stroke.width || state.brushDefaults.pen.width;
  const baseOpacity =
    tool === 'highlighter'
      ? typeof stroke.opacity === 'number'
        ? stroke.opacity
        : state.brushDefaults.highlighter.opacity
      : tool === 'calligraphy'
      ? typeof stroke.opacity === 'number'
        ? stroke.opacity
        : state.brushDefaults.calligraphy.opacity || 1
      : typeof stroke.opacity === 'number'
        ? stroke.opacity
        : state.brushDefaults.pen.opacity;

  return {
    ...autoMeta,
    id,
    tool,
    color: baseColor,
    width: baseWidth,
    opacity: baseOpacity,
    points: Array.isArray(stroke.points) ? stroke.points.map((point) => ({ x: point.x, y: point.y })) : [],
  };
}

function addStroke(stroke) {
  const normalized = normalizeStroke(stroke);
  if (normalized.tool !== 'text' && normalized.tool !== 'shapes' && normalized.tool !== 'image' && (!normalized.points || !normalized.points.length)) {
    return;
  }

  recordSceneChange(() => {
    annotations.push(normalized);
  });
}

function pasteClipboardImage() {
  let image = clipboard.readImage();
  let dataUrl = null;
  
  if (image && !image.isEmpty()) {
    dataUrl = image.toDataURL();
  } else {
    try {
      const rawFilePath = clipboard.read('FileNameW');
      if (rawFilePath) {
        const str = rawFilePath.toString('utf16le').replace(/\0/g, '');
        if (str && fs.existsSync(str)) {
          const ext = path.extname(str).toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) {
            const buffer = fs.readFileSync(str);
            let mime = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
            else if (ext === '.webp') mime = 'image/webp';
            else if (ext === '.gif') mime = 'image/gif';
            else if (ext === '.bmp') mime = 'image/bmp';
            dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
            image = nativeImage.createFromDataURL(dataUrl);
          }
        }
      }
    } catch (err) {
      console.error('Failed to read image file from clipboard', err);
    }
  }

  if (!dataUrl) {
    return { ok: false, error: 'No image found in clipboard' };
  }

  const size = image.getSize();
  let w = size.width || 400;
  let h = size.height || 300;
  const maxDim = 450;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const screenW = primaryDisplay ? primaryDisplay.bounds.width : 1000;
  const screenH = primaryDisplay ? primaryDisplay.bounds.height : 800;
  const x = Math.max(50, Math.round((screenW - w) / 2));
  const y = Math.max(50, Math.round((screenH - h) / 2));

  recordSceneChange(() => {
    const stroke = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tool: 'image',
      dataUrl: dataUrl,
      x,
      y,
      width: w,
      height: h,
      opacity: state.brushDefaults.pen.opacity || 1
    };
    annotations.push(stroke);
  });
  return { ok: true, dataUrl };
}

function quitApp() {
  app.isQuitting = true;
  writePersistedState();
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.destroy();
    }
  }
  overlayWindows.clear();
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.destroy();
  }
  app.quit();
}

function getShortcutActions() {
  return {
    toggleOverlay: () => toggleOverlayVisibility(),
    togglePassThrough: () => setPassThrough(!state.passThrough),
    pen: () => setTool('pen'),
    highlighter: () => setTool('highlighter'),
    shapes: () => setTool('shapes'),
    laser: () => setTool('laser'),
    text: () => setTool('text'),
    select: () => setTool('select'),
    cycleBackground: () => cycleBackgroundMode(),
    toggleClickHalo: () => setClickHalo(!state.clickHalo),
    eraser: () => setTool('eraser'),
    undo: () => undo(),
    redo: () => redo(),
    clear: () => clearScene(),
    openSettings: () => showSettingsWindow(),
    takeScreenshot: () => takeScreenshot(),
    revertAutoShape: () => revertAutoShape(),
    saveSession: () => saveSession(),
    loadSession: () => loadSession(),
    prevPage: () => prevPage(),
    nextPage: () => nextPage(),
    pasteImage: () => pasteClipboardImage(),
    toggleRecording: () => handleToggleRecordingShortcut(),
    pauseRecording: () => handlePauseRecordingShortcut(),
  };
}

function normalizeHotkeys(nextHotkeys = {}) {
  return {
    ...DEFAULT_STATE.hotkeys,
    ...(nextHotkeys || {}),
  };
}

function normalizeBrushDefaults(nextBrushDefaults = {}) {
  const incoming = nextBrushDefaults || {};
  return {
    pen: {
      ...DEFAULT_STATE.brushDefaults.pen,
      ...(incoming.pen || {}),
    },
    highlighter: {
      ...DEFAULT_STATE.brushDefaults.highlighter,
      ...(incoming.highlighter || {}),
    },
    calligraphy: {
      ...DEFAULT_STATE.brushDefaults.calligraphy,
      ...(incoming.calligraphy || {}),
    },
    eraser: {
      ...DEFAULT_STATE.brushDefaults.eraser,
      ...(incoming.eraser || {}),
    },
  };
}

function normalizeExportDefaults(nextExportDefaults = {}) {
  const incoming = nextExportDefaults || {};
  return {
    ...DEFAULT_STATE.exportDefaults,
    ...incoming,
  };
}

function normalizeSettingsPayload(payload = {}) {
  return {
    brushDefaults: normalizeBrushDefaults(payload.brushDefaults),
    hotkeys: normalizeHotkeys(payload.hotkeys),
    exportDefaults: normalizeExportDefaults(payload.exportDefaults),
    clickHalo: typeof payload.clickHalo === 'boolean' ? payload.clickHalo : state.clickHalo,
    rememberContentAfterExit: typeof payload.rememberContentAfterExit === 'boolean' ? payload.rememberContentAfterExit : state.rememberContentAfterExit,
    clearOnMinimize: typeof payload.clearOnMinimize === 'boolean' ? payload.clearOnMinimize : state.clearOnMinimize,
    startOnLogin: typeof payload.startOnLogin === 'boolean' ? payload.startOnLogin : state.startOnLogin,
    checkUpdatesOnStartup: typeof payload.checkUpdatesOnStartup === 'boolean' ? payload.checkUpdatesOnStartup : state.checkUpdatesOnStartup,
  };
}

function applySettingsPayload(payload = {}) {
  const previousBrushDefaults = deepClone(state.brushDefaults);
  const previousHotkeys = deepClone(state.hotkeys);
  const previousExportDefaults = deepClone(state.exportDefaults);
  const previousPreferences = {
    clickHalo: state.clickHalo,
    rememberContentAfterExit: state.rememberContentAfterExit,
    clearOnMinimize: state.clearOnMinimize,
    startOnLogin: state.startOnLogin,
    checkUpdatesOnStartup: state.checkUpdatesOnStartup,
  };
  const normalized = normalizeSettingsPayload(payload);
  state.brushDefaults = normalized.brushDefaults;
  state.exportDefaults = normalized.exportDefaults;
  state.clickHalo = normalized.clickHalo;
  state.rememberContentAfterExit = normalized.rememberContentAfterExit;
  state.clearOnMinimize = normalized.clearOnMinimize;
  state.startOnLogin = normalized.startOnLogin;
  state.checkUpdatesOnStartup = normalized.checkUpdatesOnStartup;
  const hotkeyResult = applyHotkeys(normalized.hotkeys);
  if (!hotkeyResult.ok) {
    state.brushDefaults = previousBrushDefaults;
    state.hotkeys = previousHotkeys;
    state.exportDefaults = previousExportDefaults;
    Object.assign(state, previousPreferences);
    registerShortcuts();
    return hotkeyResult;
  }
  try {
    app.setLoginItemSettings({ openAtLogin: state.startOnLogin });
  } catch (err) {
    console.error('Failed to update login item settings:', err);
  }
  broadcastState();

  return {
    ok: true,
    failures: [],
  };
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const shortcuts = normalizeHotkeys(state.hotkeys);
  const actions = getShortcutActions();
  const failures = [];

  for (const [name, accelerator] of Object.entries(shortcuts)) {
    if (!accelerator) {
      continue;
    }

    const registered = globalShortcut.register(accelerator, actions[name]);
    if (!registered) {
      failures.push({ name, accelerator });
    }
  }

  return failures;
}

function applyHotkeys(nextHotkeys) {
  const previousHotkeys = deepClone(state.hotkeys);
  state.hotkeys = normalizeHotkeys(nextHotkeys);
  const failures = registerShortcuts();

  if (failures.length > 0) {
    state.hotkeys = previousHotkeys;
    registerShortcuts();
    return {
      ok: false,
      failures,
    };
  }

  broadcastState();
  return {
    ok: true,
    failures: [],
  };
}

function rebuildWindows() {
  createOverlayWindows();
  if (toolbarWindow) {
    toolbarWindow.destroy();
    toolbarWindow = null;
  }
  createToolbarWindow();
  broadcastState();
  broadcastScene();
  if (state.overlayVisible) {
    showOverlayWindows();
  } else {
    hideOverlayWindows();
  }
}

function init() {
  loadState();
  createTray();
  createOverlayWindows();
  createToolbarWindow();
  if (toolbarWindow) {
    toolbarWindow.show();
    toolbarWindow.focus();
  }
  registerShortcuts();
  broadcastState();
  broadcastScene();
  if (state.overlayVisible) {
    showOverlayWindows();
  } else {
    hideOverlayWindows();
  }
}

let recorderService = null;
let presentationTrackService = null;
let lastEnumeratedSources = new Map();
try {
  const { RecorderService } = require('./dist-electron/services/recorder.js');
  const { PresentationTrackService } = require('./dist-electron/services/presentationTrack.js');
  recorderService = new RecorderService();
  presentationTrackService = new PresentationTrackService();
} catch (err) {
  console.error('Failed to initialize RecorderService/PresentationTrackService in legacy main.js:', err);
}

let recordingTimer = null;
let recordingSeconds = 0;
let currentRecordingPhase = 'idle';
let preRecordingState = null;
let lastStartOptions = null;
let lastStartEvent = null;
let activePresentationMode = 'baked';
let activeRecordingSessionId = null;
const processedRecordingCommandIds = new Set();
const approvedRecordingDirectories = new Set();

function isTrustedRecordingSender(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return Boolean(senderWindow && [toolbarWindow, settingsWindow, selectorWindow, countdownWindow, editorWindow].includes(senderWindow));
}

function validateActiveRecordingCommand(command, expectedPhase) {
  const error = validateRecordingCommand({
    command,
    activeSessionId: activeRecordingSessionId,
    currentPhase: currentRecordingPhase,
    expectedPhase,
    processedCommandIds: processedRecordingCommandIds,
  });
  if (error) return error;
  processedRecordingCommandIds.add(command.commandId);
  if (processedRecordingCommandIds.size > 256) processedRecordingCommandIds.clear();
  return null;
}

function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeRecordingOptions(rawOptions) {
  if (!rawOptions || typeof rawOptions !== 'object' || Array.isArray(rawOptions)) {
    throw new Error('Recording options are required.');
  }

  const sourceId = typeof rawOptions.sourceId === 'string' ? rawOptions.sourceId : '';
  const source = lastEnumeratedSources.get(sourceId);
  if (!source) throw new Error('The selected recording source is no longer available. Refresh the source list.');

  const sourceType = sourceId.startsWith('window:') ? 'window' : 'display';
  const presentationMode = sourceType === 'window' ? 'sidecar' : 'baked';
  const displayIdFromSource = Number(source.display_id);
  const requestedDisplayId = Number(rawOptions.displayId);
  const displays = screen.getAllDisplays();
  const selectedDisplay = displays.find((display) => display.id === requestedDisplayId)
    || displays.find((display) => display.id === displayIdFromSource)
    || screen.getPrimaryDisplay();
  const windowHandle = sourceType === 'window' ? sourceId.match(/^window:([^:]+):/)?.[1] || null : null;
  if (sourceType === 'window' && (!windowHandle || !/^(?:0x[0-9a-f]+|[1-9][0-9]*)$/i.test(windowHandle))) {
    throw new Error('The selected window does not expose a valid native window handle.');
  }

  const defaultDirectory = app.getPath('videos');
  const defaultOutputPath = path.join(defaultDirectory, `recording-${Date.now()}.mp4`);
  const outputPath = path.resolve(typeof rawOptions.outputPath === 'string' && rawOptions.outputPath.trim()
    ? rawOptions.outputPath.trim()
    : defaultOutputPath);
  const allowedRoots = [defaultDirectory, state.exportDefaults?.autoSavePath, ...approvedRecordingDirectories].filter(Boolean);
  if (path.extname(outputPath).toLowerCase() !== '.mp4' || !allowedRoots.some((root) => isPathInside(root, outputPath))) {
    throw new Error('Recording output must be an MP4 inside a directory selected in RePen.');
  }

  const sourceBounds = { ...selectedDisplay.bounds };
  const scaleFactor = selectedDisplay.scaleFactor || 1;
  const optionalString = (value, maxLength = 4096) =>
    typeof value === 'string' && value.length <= maxLength && !value.includes('\0') ? value : null;

  return {
    recorder: {
      sourceId,
      sourceType,
      windowHandle,
      displayId: selectedDisplay.id,
      width: boundedInteger(rawOptions.width, Math.round(sourceBounds.width * scaleFactor), 2, 16384),
      height: boundedInteger(rawOptions.height, Math.round(sourceBounds.height * scaleFactor), 2, 16384),
      fps: boundedInteger(rawOptions.fps, 30, 1, 120),
      captureSystemAudio: rawOptions.captureSystemAudio === true,
      captureMic: rawOptions.captureMic === true,
      microphoneDeviceId: optionalString(rawOptions.microphoneDeviceId),
      microphoneDeviceName: optionalString(rawOptions.microphoneDeviceName, 512),
      microphoneGain: Math.min(4, Math.max(0, Number(rawOptions.microphoneGain) || 1)),
      webcamEnabled: rawOptions.webcamEnabled === true,
      webcamDeviceId: optionalString(rawOptions.webcamDeviceId),
      webcamDeviceName: optionalString(rawOptions.webcamDeviceName, 512),
      webcamDirectShowClsid: optionalString(rawOptions.webcamDirectShowClsid),
      webcamWidth: boundedInteger(rawOptions.webcamWidth, 1280, 2, 7680),
      webcamHeight: boundedInteger(rawOptions.webcamHeight, 720, 2, 4320),
      webcamFps: boundedInteger(rawOptions.webcamFps, 30, 1, 120),
      captureCursor: rawOptions.captureCursor !== false,
      outputPath,
      webcamOutputPath: rawOptions.webcamEnabled === true ? outputPath.replace(/\.mp4$/i, '-webcam.mp4') : null,
    },
    track: {
      presentationMode,
      source: {
        id: sourceId,
        name: optionalString(source.name, 512) || (sourceType === 'display' ? `Display ${selectedDisplay.id}` : 'Selected window'),
        type: sourceType,
        displayId: sourceType === 'display' ? selectedDisplay.id : null,
        windowHandle,
        bounds: sourceBounds,
        scaleFactor,
      },
      canvas: {
        width: sourceBounds.width,
        height: sourceBounds.height,
        originX: sourceBounds.x,
        originY: sourceBounds.y,
        coordinateSpace: 'desktop-dip',
      },
    },
  };
}

function getPresentationSceneSnapshot() {
  return {
    annotations: deepClone(annotations),
    board: {
      backgroundMode: state.backgroundMode || 'transparent',
      boardColor: state.boardColor || '#ffffff',
      viewport: {
        panX: state.boardViewport?.panX ?? state.boardViewport?.x ?? 0,
        panY: state.boardViewport?.panY ?? 0,
        zoom: state.boardViewport?.zoom ?? 1,
      },
    },
    page: { id: `board-page-${currentPageIndex}`, index: currentPageIndex },
    spotlight: null,
    laserPoints: [],
  };
}

async function handleRecordingFailure(error) {
  stopRecordingTimer();
  try { await recorderService?.cancel(); } catch (cancelError) {
    console.error('Failed to cancel recorder after failure:', cancelError);
  }
  try { await presentationTrackService?.discardTrack(); } catch (trackError) {
    console.error('Failed to discard presentation track after failure:', trackError);
  }
  currentRecordingPhase = 'failed';
  broadcastRecordingState({
    isRecording: false,
    isPaused: false,
    error: error instanceof Error ? error.message : String(error),
  });
  restorePresenterState();
}

recorderService?.on('crash', (error) => void handleRecordingFailure(error));
presentationTrackService?.on('failure', (error) => void handleRecordingFailure(error));

function savePresenterState() {
  preRecordingState = {
    activeTool: state.activeTool,
    passThrough: state.passThrough,
    backgroundMode: state.backgroundMode,
  };
}

function restorePresenterState() {
  if (preRecordingState) {
    setTool(preRecordingState.activeTool);
    setPassThrough(preRecordingState.passThrough);
    setBackgroundMode(preRecordingState.backgroundMode);
    preRecordingState = null;
  }
}


function broadcastRecordingTimer(timeStr) {
  for (const win of overlayWindows.values()) {
    safeSend(win, 'recording:timer-tick', timeStr);
  }
  safeSend(toolbarWindow, 'recording:timer-tick', timeStr);
  safeSend(settingsWindow, 'recording:timer-tick', timeStr);
}

function startRecordingTimer() {
  recordingSeconds = 0;
  if (recordingTimer) clearInterval(recordingTimer);
  
  recordingTimer = setInterval(() => {
    if (recorderService && recorderService.getState().isPaused) return;
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

async function handleStartRecording(options) {
  if (!recorderService) {
    throw new Error('RecorderService is not available.');
  }
  lastStartOptions = options;
  savePresenterState();
  currentRecordingPhase = 'starting';
  broadcastRecordingState({ isRecording: false, isPaused: false });

  const normalized = normalizeRecordingOptions(options);
  activePresentationMode = normalized.track.presentationMode;
  const sessionId = `recording-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  activeRecordingSessionId = sessionId;
  processedRecordingCommandIds.clear();
  await recorderService.start(normalized.recorder);
  
  if (presentationTrackService) {
    presentationTrackService.startTrack(normalized.recorder.outputPath, {
      sessionId,
      createdAtEpochMs: Date.now(),
      source: normalized.track.source,
      canvas: normalized.track.canvas,
      initialScene: getPresentationSceneSnapshot(),
      presentationMode: normalized.track.presentationMode,
    });
  }
  
  startRecordingTimer();
  currentRecordingPhase = 'recording';
  broadcastRecordingState({ isRecording: true, isPaused: false, sessionId });
  return sessionId;
}

async function handleStopRecording() {
  if (!recorderService) throw new Error('RecorderService is not available.');
  currentRecordingPhase = 'finalizing';
  broadcastRecordingState({ isRecording: true, isPaused: false });
  stopRecordingTimer();

  const outputPath = await recorderService.stop();
  const trackSummary = presentationTrackService ? await presentationTrackService.finalizeTrack() : null;
  currentRecordingPhase = 'completed';
  broadcastRecordingState({ isRecording: false, isPaused: false });
  currentRecordingPhase = 'idle';
  activeRecordingSessionId = null;
  processedRecordingCommandIds.clear();
  restorePresenterState();
  return { outputPath, presentationTrackPath: trackSummary?.sidecarPath || null, presentationMode: activePresentationMode };
}

function createProjectForCompletedRecording({ outputPath, presentationTrackPath, presentationMode = 'baked' }) {
  if (typeof outputPath !== 'string' || !outputPath) {
    throw new Error('The finalized recording file could not be found.');
  }
  const { createRecordingProject } = require('./src/shared/editor/projectFactory.js');
  const webcamPath = outputPath.replace(/\.mp4$/i, '-webcam.mp4');
  const media = {
    screenVideoPath: outputPath,
    ...(fs.existsSync(webcamPath) ? { webcamVideoPath: webcamPath } : {}),
    ...(presentationTrackPath ? { nativeSessionPath: presentationTrackPath } : {}),
    presentationMode: presentationMode === 'sidecar' ? 'sidecar' : 'baked',
    durationMs: Math.max(1, recordingSeconds * 1000),
  };
  validateFinalizedRecordingMedia(media);
  const project = createRecordingProject(media);
  const projectPath = outputPath.replace(/\.mp4$/i, '.repen-project');
  writeProjectFileAtomically(projectPath, project);
  currentProjectPath = projectPath;
  return projectPath;
}

async function handleCancelRecording() {
  currentRecordingPhase = 'finalizing';
  broadcastRecordingState({ isRecording: true, isPaused: false });
  stopRecordingTimer();
  if (recorderService) {
    await recorderService.cancel();
  }
  if (presentationTrackService) {
    await presentationTrackService.discardTrack();
  }
  currentRecordingPhase = 'idle';
  activeRecordingSessionId = null;
  processedRecordingCommandIds.clear();
  broadcastRecordingState({ isRecording: false, isPaused: false });
  restorePresenterState();
}

async function handlePauseRecording() {
  if (!recorderService) return;
  await recorderService.pause();
  if (presentationTrackService) {
    presentationTrackService.pauseTrack();
  }
  currentRecordingPhase = 'paused';
  broadcastRecordingState({ isRecording: true, isPaused: true });
}

async function handleResumeRecording() {
  if (!recorderService) return;
  await recorderService.resume();
  if (presentationTrackService) {
    presentationTrackService.resumeTrack();
  }
  currentRecordingPhase = 'recording';
  broadcastRecordingState({ isRecording: true, isPaused: false });
}

async function handleRestartRecording() {
  if (!recorderService) throw new Error('RecorderService is not available.');
  stopRecordingTimer();
  if (presentationTrackService) {
    await presentationTrackService.discardTrack();
  }
  await recorderService.cancel();
  
  if (lastStartOptions) {
    currentRecordingPhase = 'countdown';
    broadcastRecordingState({ isRecording: false, isPaused: false });
    createCountdownWindow(lastStartOptions.displayId || 0);
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      countdownWindow.show();
    }
  } else {
    currentRecordingPhase = 'idle';
    broadcastRecordingState({ isRecording: false, isPaused: false });
    restorePresenterState();
  }
}

async function handleToggleRecordingShortcut() {
  try {
    if (['recording', 'paused'].includes(currentRecordingPhase)) {
      await handleStopRecording();
    } else if (currentRecordingPhase === 'idle' || currentRecordingPhase === 'selecting') {
      if (lastStartOptions) {
        await handleStartRecording(lastStartOptions);
      } else {
        showSelectorWindow();
      }
    }
  } catch (err) {
    console.error('Failed to toggle recording via shortcut:', err);
  }
}

async function handlePauseRecordingShortcut() {
  try {
    if (currentRecordingPhase === 'recording') {
      await handlePauseRecording();
    } else if (currentRecordingPhase === 'paused') {
      await handleResumeRecording();
    }
  } catch (err) {
    console.error('Failed to pause/resume recording via shortcut:', err);
  }
}

ipcMain.handle('recording:open-setup', async (event) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'openSetup')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'open setup') };
  currentRecordingPhase = 'selecting';
  showSelectorWindow();
  broadcastRecordingState({ isRecording: false, isPaused: false });
  return { success: true };
});

ipcMain.handle('recording:close-setup', async (event) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'closeSetup')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'close setup') };
  currentRecordingPhase = 'idle';
  hideSelectorWindow();
  broadcastRecordingState({ isRecording: false, isPaused: false });
  return { success: true };
});

ipcMain.handle('recording:open-editor', async (_, initialPath = null) => {
  createEditorWindow(initialPath);
  return { success: true };
});

ipcMain.handle('recording:close-editor', async () => {
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.close();
  }
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

function resolveFfmpegPath() {
  const candidates = [
    process.env.REPEN_FFMPEG_PATH,
    app.isPackaged ? path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe') : null,
  ].filter(Boolean);
  return candidates.find((candidate) => path.isAbsolute(candidate) && fs.existsSync(candidate)) || null;
}

function generateExportFFmpegArgs(options) {
  const args = ['-y', '-i', options.videoPath];
  const filters = [];
  let videoOut = '0:v';
  if (options.cropRegion) {
    const crop = options.cropRegion;
    for (const value of [crop.width, crop.height, crop.x, crop.y]) {
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid crop region.');
    }
    filters.push(`[${videoOut}]crop=w=iw*${crop.width}:h=ih*${crop.height}:x=iw*${crop.x}:y=ih*${crop.y}[cropped_v]`);
    videoOut = 'cropped_v';
  }
  if (options.format === 'gif') {
    const fps = boundedInteger(options.fps, 15, 1, 30);
    filters.push(`[${videoOut}]fps=${fps},scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse[gif_v]`);
    videoOut = 'gif_v';
  }
  if (filters.length) args.push('-filter_complex', filters.join(';'), '-map', `[${videoOut}]`);
  else args.push('-map', '0:v');
  if (options.format === 'gif') args.push('-loop', options.loop === false ? '-1' : '0');
  else args.push('-map', '0:a?', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k');
  args.push(options.outputPath);
  return args;
}

ipcMain.handle('project:export', async (event, project, options = {}) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized export request.' };
  const exportCapability = getProjectExportAvailability();
  if (!exportCapability.available) {
    return { success: false, supported: false, error: exportCapability.reason };
  }
  if (activeExportProcess) {
    return { success: false, error: 'Export already in progress' };
  }
  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath) {
    return { success: false, supported: false, error: 'Video export is unavailable because a licensed FFmpeg executable is not bundled with this build.' };
  }
  const inputPath = path.resolve(project?.media?.screenVideoPath || project?.videoPath || '');
  if (!path.isAbsolute(inputPath) || !fs.existsSync(inputPath)) return { success: false, error: 'The source video is missing.' };
  const format = options.format === 'gif' ? 'gif' : 'mp4';
  const saveDialogOptions = {
    title: 'Export RePen Project',
    defaultPath: path.join(app.getPath('videos'), `RePen-Export.${format}`),
    filters: [{ name: format === 'gif' ? 'Animated GIF' : 'MP4 Video', extensions: [format] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  };
  const exportParent = editorWindow && !editorWindow.isDestroyed() ? editorWindow : toolbarWindow;
  const saveResult = exportParent && !exportParent.isDestroyed()
    ? await dialog.showSaveDialog(exportParent, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);
  if (saveResult.canceled || !saveResult.filePath) return { success: false, canceled: true, error: 'Export canceled.' };
  const outputPath = path.resolve(saveResult.filePath);
  const durationMs = boundedInteger(options.durationMs, 10000, 1, 24 * 60 * 60 * 1000);
  let args;
  try {
    args = generateExportFFmpegArgs({ videoPath: inputPath, outputPath, format, fps: options.fps, loop: options.loop, cropRegion: project?.editor?.cropRegion });
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }

  return new Promise((resolve) => {
    activeExportOutputPath = outputPath;
    activeExportProcess = spawn(ffmpegPath, args, { shell: false, windowsHide: true });

    activeExportProcess.stderr.on('data', (data) => {
      const log = data.toString();
      const match = log.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (match) {
        const hh = parseInt(match[1]);
        const mm = parseInt(match[2]);
        const ss = parseFloat(match[3] + '.' + match[4]);
        const currentMs = (hh * 3600 + mm * 60 + ss) * 1000;
        const progress = Math.min(100, Math.round((currentMs / durationMs) * 100));
        
        if (editorWindow && !editorWindow.isDestroyed()) {
          editorWindow.webContents.send('project:export-progress', { progress });
        }
      }
    });

    activeExportProcess.on('close', (code) => {
      activeExportProcess = null;
      activeExportOutputPath = null;
      if (code === 0) {
        resolve({ success: true, path: outputPath });
      } else {
        resolve({ success: false, error: `FFmpeg exited with code ${code}` });
      }
    });
    activeExportProcess.on('error', (error) => {
      activeExportProcess = null;
      activeExportOutputPath = null;
      resolve({ success: false, error: error.message });
    });
  });
});

ipcMain.handle('project:export-cancel', async (event, outputPath) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized export request.' };
  const partialOutputPath = activeExportOutputPath || (typeof outputPath === 'string' && path.isAbsolute(outputPath) ? outputPath : null);
  if (activeExportProcess) {
    activeExportProcess.kill();
    activeExportProcess = null;
  }
  activeExportOutputPath = null;
  if (partialOutputPath && fs.existsSync(partialOutputPath)) {
    try {
      fs.unlinkSync(partialOutputPath);
    } catch (e) {
      // Ignore cleanup error
    }
  }
  return { success: true };
});

ipcMain.handle('recording:get-sources', async (event, opts) => {
  if (!isTrustedRecordingSender(event)) return [];
  const sources = await desktopCapturer.getSources(opts || {
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  const selectableSources = filterRepenOwnedSources(sources, getRepenOwnedWindowHandleCandidates());
  lastEnumeratedSources = new Map(selectableSources.map((source) => [source.id, source]));
  return selectableSources.map((source) => ({
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

ipcMain.handle('recording:start-countdown', async (event, payload = {}) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'startCountdown')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'start countdown') };
  const displayId = Number(payload.displayId);
  const seconds = boundedInteger(payload.seconds, 3, 0, 10);
  currentRecordingPhase = 'countdown';
  createCountdownWindow(displayId);
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.show();
  }
  broadcastRecordingState({ isRecording: false, isPaused: false });
  return { success: true, seconds };
});

ipcMain.handle('recording:close-countdown', async (event) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'closeCountdown')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'close countdown') };
  // Keep the state in countdown until recording:start owns the atomic
  // transition to starting. Moving early makes the next command reject itself.
  if (countdownWindow && !countdownWindow.isDestroyed()) {
    countdownWindow.close();
  }
  broadcastRecordingState({ isRecording: false, isPaused: false });
  return { success: true };
});

ipcMain.handle('recording:start', async (event, options) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'start')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'start') };
  try {
    lastStartEvent = event;
    const sessionId = await handleStartRecording(options);
    return { success: true, sessionId };
  } catch (error) {
    stopRecordingTimer();
    try { await recorderService?.cancel(); } catch {}
    try { await presentationTrackService?.discardTrack(); } catch {}
    activeRecordingSessionId = null;
    processedRecordingCommandIds.clear();
    currentRecordingPhase = 'failed';
    broadcastRecordingState({ isRecording: false, isPaused: false, error: error.message || String(error) });
    restorePresenterState();
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('recording:pause', async (event, command) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'pause')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'pause') };
  const commandError = validateActiveRecordingCommand(command, 'recording');
  if (commandError) return { success: false, error: commandError };
  try { await handlePauseRecording(); return { success: true }; }
  catch (error) { return { success: false, error: error.message || String(error) }; }
});

ipcMain.handle('recording:resume', async (event, command) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'resume')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'resume') };
  const commandError = validateActiveRecordingCommand(command, 'paused');
  if (commandError) return { success: false, error: commandError };
  try { await handleResumeRecording(); return { success: true }; }
  catch (error) { return { success: false, error: error.message || String(error) }; }
});

ipcMain.handle('recording:stop', async (event, command) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'stop')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'stop') };
  const commandError = validateActiveRecordingCommand(command, currentRecordingPhase);
  if (commandError) return { success: false, error: commandError };
  try {
    const result = await handleStopRecording();
    try {
      const projectPath = createProjectForCompletedRecording(result);
      createEditorWindow(projectPath);
      return { success: true, ...result, projectPath };
    } catch (editorError) {
      console.error('Recording saved, but editor project creation failed:', editorError);
      return {
        success: true,
        ...result,
        editorError: editorError.message || String(editorError),
      };
    }
  } catch (error) {
    currentRecordingPhase = 'failed';
    broadcastRecordingState({ isRecording: false, isPaused: false, error: error.message || String(error) });
    restorePresenterState();
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('recording:cancel', async (event, command) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'cancel')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'cancel') };
  const commandError = validateActiveRecordingCommand(command, currentRecordingPhase);
  if (commandError) return { success: false, error: commandError };
  try { await handleCancelRecording(); return { success: true }; }
  catch (error) { return { success: false, error: error.message || String(error) }; }
});

ipcMain.handle('recording:restart', async (event) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized recording control.' };
  if (!canRunRecordingCommand(currentRecordingPhase, 'restart')) return { success: false, error: recordingCommandError(currentRecordingPhase, 'restart') };
  if (!lastStartOptions) return { success: false, error: 'No recording options are available to restart.' };
  try {
    await handleCancelRecording();
    await handleStartRecording(lastStartOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('recording:get-state', async (event) => {
  if (!isTrustedRecordingSender(event)) return { isRecording: false, isPaused: false, phase: 'idle' };
  return { ...(recorderService?.getState() || { isRecording: false, isPaused: false }), phase: currentRecordingPhase, elapsedSeconds: recordingSeconds };
});

ipcMain.handle('recording:get-capabilities', async (event) => {
  if (!isTrustedRecordingSender(event) || !recorderService) return { available: false, supported: false, reason: 'Recorder unavailable.' };
  return recorderService.probeCapabilities();
});

ipcMain.handle('app:get-capabilities', async (event) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized capabilities request.' };
  const recorderCapabilities = recorderService
    ? await recorderService.probeCapabilities()
    : { available: false, supported: false, reason: 'Native Windows capture helper is not initialized.' };
  return createAppCapabilities({ recorder: recorderCapabilities });
});

// window.webContents.send('recording:countdown-tick');


let currentProjectPath = null;

function normalizeProjectPayload(projectData) {
  if (!projectData || typeof projectData !== 'object') {
    throw new Error('Project data must be an object.');
  }
  const { migrateProjectData } = require('./src/shared/editor/projectFactory.js');
  return migrateProjectData(projectData);
}

function hydratePresentationTrack(project) {
  if (project?.media?.presentationMode !== 'sidecar' || !project.media.nativeSessionPath) return project;
  try {
    const { parsePresentationTrackJsonl } = require('./dist-electron/services/presentationTrack.js');
    return {
      ...project,
      presentationTrack: parsePresentationTrackJsonl(fs.readFileSync(project.media.nativeSessionPath, 'utf8')),
    };
  } catch (error) {
    return { ...project, presentationTrackError: error.message || String(error) };
  }
}

ipcMain.handle('project:save', async (_, projectData, suggestedName, existingProjectPath) => {
  try {
    const normalizedProject = normalizeProjectPayload(projectData);
    const targetPath = existingProjectPath || currentProjectPath;
    if (targetPath && fs.existsSync(targetPath)) {
      writeProjectFileAtomically(targetPath, normalizedProject);
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

    writeProjectFileAtomically(result.filePath, normalizedProject);
    currentProjectPath = result.filePath;
    return { success: true, path: result.filePath, message: 'Project saved successfully' };
  } catch (error) {
    console.error('Failed to save project:', error);
    return { success: false, message: 'Failed to save project', error: String(error) };
  }
});

ipcMain.handle('project:load', async (_, projectFolder) => {
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
    const project = hydratePresentationTrack(normalizeProjectPayload(JSON.parse(content)));
    currentProjectPath = filePath;

    return { success: true, path: filePath, project };
  } catch (error) {
    console.error('Failed to load project:', error);
    return { success: false, message: 'Failed to load project', error: String(error) };
  }
});

ipcMain.handle('project:load-from-path', async (_, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, message: 'File not found' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const project = hydratePresentationTrack(normalizeProjectPayload(JSON.parse(content)));
    currentProjectPath = filePath;

    return { success: true, path: filePath, project };
  } catch (error) {
    console.error('Failed to load project from path:', error);
    return { success: false, message: 'Failed to load project', error: String(error) };
  }
});

ipcMain.handle('project:get-current-path', async () => {
  return currentProjectPath;
});

ipcMain.handle('bootstrap:get', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return getBootstrapData(win);
});

ipcMain.handle('app:set-tool', (_, tool) => {
  setTool(tool);
  return getAppState();
});

ipcMain.handle('app:set-shape-type', (_, shapeType) => {
  setShapeType(shapeType);
  return getAppState();
});

ipcMain.handle('app:set-text-mode', (_, mode) => {
  setTextMode(mode);
  return getAppState();
});

ipcMain.handle('app:set-toolbar-orientation', (_, orientation) => {
  setToolbarOrientation(orientation);
  return getAppState();
});

ipcMain.handle('app:set-pass-through', (_, enabled) => {
  setPassThrough(Boolean(enabled));
  return getAppState();
});

ipcMain.handle('app:set-toolbar-hover', (_, hovered) => {
  state.toolbarHovered = Boolean(hovered);
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    const recordingControlsActive = ['starting', 'recording', 'paused', 'finalizing'].includes(currentRecordingPhase);
    if (state.toolbarHovered || recordingControlsActive) {
      toolbarWindow.setIgnoreMouseEvents(false);
    } else {
      toolbarWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }
  updateOverlayIgnoreMouse();
  return getAppState();
});

ipcMain.handle('app:toggle-visibility', (_, forceValue) => {
  toggleOverlayVisibility(forceValue);
  return getAppState();
});

ipcMain.handle('app:set-color', (_, color) => {
  setColor(color);
  return getAppState();
});

ipcMain.handle('app:set-background-mode', (_, mode) => {
  setBackgroundMode(mode);
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('board/change', {
      board: {
        backgroundMode: mode,
        boardColor: state.boardColor || '#ffffff',
        viewport: state.boardViewport || { panX: 0, panY: 0, zoom: 1 }
      }
    });
  }
  return getAppState();
});

ipcMain.handle('app:set-board-color', (_, color) => {
  setBoardColor(color);
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('board/change', {
      board: {
        backgroundMode: state.backgroundMode,
        boardColor: color,
        viewport: state.boardViewport || { panX: 0, panY: 0, zoom: 1 }
      }
    });
  }
  return getAppState();
});

ipcMain.handle('app:set-toolbar-settings-open', (_, open) => {
  if (open) {
    ensureToolbarWindowCapacity();
  }
  return getAppState();
});

ipcMain.handle('app:set-board-viewport', (_, viewport) => {
  const res = setBoardViewport(viewport);
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('viewport/change', {
      viewport: {
        panX: viewport.panX ?? 0,
        panY: viewport.panY ?? 0,
        zoom: viewport.zoom ?? 1
      }
    });
  }
  return res;
});

ipcMain.handle('app:set-click-halo', (_, enabled) => {
  setClickHalo(enabled);
  return getAppState();
});

ipcMain.handle('app:set-export-bg', (_, enabled) => {
  setExportIncludeBackground(enabled);
  return getAppState();
});

ipcMain.handle('app:set-width', (_, width) => {
  setWidth(Number(width));
  return getAppState();
});

ipcMain.handle('app:set-opacity', (_, opacity) => {
  setOpacity(Number(opacity));
  return getAppState();
});

ipcMain.handle('app:set-spotlight', (_, payload) => {
  const { radius, alpha } = payload || {};
  setSpotlight(radius, alpha);
  return getAppState();
});

ipcMain.handle('app:paste-image', () => {
  return pasteClipboardImage();
});

ipcMain.handle('scene:add-stroke', (_, stroke) => {
  addStroke(stroke);
  const added = annotations[annotations.length - 1];
  if (added && presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('annotation/add', { annotation: added });
  }
  return getSceneState();
});

ipcMain.handle('scene:update-annotation', (_, updated) => {
  recordSceneChange(() => {
    const idx = annotations.findIndex((a) => a.id === updated.id);
    if (idx !== -1) {
      const norm = normalizeStroke(updated);
      annotations[idx] = norm;
      if (presentationTrackService && presentationTrackService.isRecording()) {
        presentationTrackService.addEvent('annotation/update', { annotation: norm });
      }
    }
  });
  return getSceneState();
});

ipcMain.handle('scene:update-annotations', (_, updatedList = []) => {
  if (!Array.isArray(updatedList) || !updatedList.length) return getSceneState();
  recordSceneChange(() => {
    for (const updated of updatedList) {
      const idx = annotations.findIndex((a) => a.id === updated.id);
      if (idx !== -1) {
        const norm = normalizeStroke(updated);
        annotations[idx] = norm;
        if (presentationTrackService && presentationTrackService.isRecording()) {
          presentationTrackService.addEvent('annotation/update', { annotation: norm });
        }
      }
    }
  });
  return getSceneState();
});

ipcMain.handle('scene:delete-annotations', (_, ids = []) => {
  if (!ids || !ids.length) return getSceneState();
  recordSceneChange(() => {
    annotations = annotations.filter((a) => !ids.includes(a.id));
    if (presentationTrackService && presentationTrackService.isRecording()) {
      presentationTrackService.addEvent('annotation/delete', { annotationIds: ids });
    }
  });
  return getSceneState();
});

ipcMain.handle('scene:erase-path', (_, payload) => {
  erasePath(payload);
  return getSceneState();
});

ipcMain.handle('scene:clear', () => {
  clearScene();
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('scene/clear', { scope: 'current' });
  }
  return getSceneState();
});

ipcMain.handle('scene:undo', () => {
  undo();
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('scene/clear', { scope: 'current' });
    for (const stroke of annotations) {
      presentationTrackService.addEvent('annotation/add', { annotation: stroke });
    }
  }
  return getSceneState();
});

ipcMain.handle('scene:redo', () => {
  redo();
  if (presentationTrackService && presentationTrackService.isRecording()) {
    presentationTrackService.addEvent('scene/clear', { scope: 'current' });
    for (const stroke of annotations) {
      presentationTrackService.addEvent('annotation/add', { annotation: stroke });
    }
  }
  return getSceneState();
});

ipcMain.handle('scene:revert-auto-shape', () => {
  revertAutoShape();
  return getSceneState();
});

ipcMain.handle('session:save', () => saveSession());
ipcMain.handle('session:load', () => loadSession());
ipcMain.handle('session:showLoadMenu', (event, x, y) => {
  const boardsDir = path.join(app.getPath('userData'), 'boards');
  let files = [];
  try {
    if (fs.existsSync(boardsDir)) {
      files = fs.readdirSync(boardsDir).filter(f => f.endsWith('.rpen')).map(f => {
        const stats = fs.statSync(path.join(boardsDir, f));
        return { name: f, path: path.join(boardsDir, f), mtime: stats.mtimeMs };
      });
      files.sort((a, b) => b.mtime - a.mtime);
    }
  } catch(e) {}

  const template = files.map(f => ({
    label: f.name.replace('.rpen', '').replace(/_/g, ' '),
    click: () => {
      autoArchiveCurrentSession();
      loadSessionFromFile(f.path);
    }
  }));

  if (template.length > 0) {
    template.push({ type: 'separator' });
  }
  template.push({
    label: 'Browse for file...',
    click: () => loadSession()
  });

  const menu = Menu.buildFromTemplate(template);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    menu.popup({ window: win, x: Math.round(x), y: Math.round(y) });
  }
});
ipcMain.handle('session:new', () => newSession());
ipcMain.handle('session:export-pdf', () => exportPdf());
ipcMain.handle('session:prev-page', () => prevPage());
ipcMain.handle('session:next-page', () => nextPage());
ipcMain.handle('session:set-page', (_, idx) => setPage(idx));

ipcMain.on('app:move-toolbar', (event, dx, dy) => {
  if (toolbarWindow) {
    const bounds = toolbarWindow.getBounds();
    toolbarWindow.setBounds({
      x: bounds.x + dx,
      y: bounds.y + dy,
      width: bounds.width,
      height: bounds.height
    });
  }
});

ipcMain.handle('settings:get', () => {
  return {
    appState: getAppState(),
  };
});

ipcMain.handle('settings:save', (_, payload) => {
  return applySettingsPayload(payload);
});

ipcMain.handle('app:open-external', (_, url) => {
  if (typeof url !== 'string' || !/^https:\/\/(github\.com|rehmanahmad\.pro)(\/|$)/.test(url)) {
    return { ok: false };
  }
  shell.openExternal(url);
  return { ok: true };
});

let pendingExportResolve = null;
let activeExportProcess = null;
let activeExportOutputPath = null;

ipcMain.handle('app:render-export', async (_, payload) => {
  if (!payload || !payload.dataUrl) {
    if (pendingExportResolve) { pendingExportResolve(false); pendingExportResolve = null; }
    updateOverlayIgnoreMouse();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.show();
    }
    return false;
  }
  try {
    const base64Data = payload.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (payload.copyOnly) {
      const image = nativeImage.createFromBuffer(buffer);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      }
      if (pendingExportResolve) { pendingExportResolve(true); pendingExportResolve = null; }
      updateOverlayIgnoreMouse();
      if (toolbarWindow && !toolbarWindow.isDestroyed()) {
        toolbarWindow.show();
      }
      return true;
    }

    if (payload.copyToClipboard || state.exportDefaults.copyToClipboard) {
      const image = nativeImage.createFromBuffer(buffer);
      if (!image.isEmpty()) {
        clipboard.writeImage(image);
      }
    }

    const format = payload.format || state.exportDefaults.format || 'png';
    let savePath = payload.autoSavePath || state.exportDefaults.autoSavePath;
    if (!savePath) {
      const { filePath, canceled } = await showModalDialog('save', {
        title: 'Save Screenshot / Export',
        defaultPath: path.join(app.getPath('pictures'), `RePen_${Date.now()}.${format}`),
        filters: [
          { name: format.toUpperCase(), extensions: [format] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (canceled || !filePath) {
        if (pendingExportResolve) { pendingExportResolve(false); pendingExportResolve = null; }
        updateOverlayIgnoreMouse();
        if (toolbarWindow && !toolbarWindow.isDestroyed()) {
          toolbarWindow.show();
        }
        return false;
      }
      savePath = filePath;
    } else {
      try {
        if (fs.existsSync(savePath) && fs.statSync(savePath).isDirectory()) {
          savePath = path.join(savePath, `RePen_${Date.now()}.${format}`);
        }
      } catch (e) {
        // ignore
      }
    }

    fs.writeFileSync(savePath, buffer);
    if (pendingExportResolve) { pendingExportResolve(true); pendingExportResolve = null; }
    updateOverlayIgnoreMouse();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.show();
    }
    return true;
  } catch (err) {
    console.error('Failed to save exported screenshot:', err);
    if (pendingExportResolve) { pendingExportResolve(false); pendingExportResolve = null; }
    updateOverlayIgnoreMouse();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.show();
    }
    return false;
  }
});

async function takeScreenshot() {
  const targetPoint = screen.getCursorScreenPoint();
  const targetDisplay = screen.getDisplayNearestPoint(targetPoint) || screen.getPrimaryDisplay();
  const { width, height } = targetDisplay.bounds;
  const scale = targetDisplay.scaleFactor || 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  // 1. Hide overlay windows and toolbar so desktopCapturer captures a clean desktop without overlay components
  for (const w of overlayWindows.values()) {
    if (!w.isDestroyed()) {
      w.hide();
    }
  }
  if (toolbarWindow && !toolbarWindow.isDestroyed()) {
    toolbarWindow.hide();
  }
  // Wait a small moment for OS window manager to hide windows
  await new Promise((resolve) => setTimeout(resolve, 150));

  let bgDataUrl = null;
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: targetWidth, height: targetHeight },
    });
    if (sources && sources.length > 0) {
      let matched = sources.find((s) => s.display_id === targetDisplay.id.toString() || s.id === `screen:${targetDisplay.id}:0` || s.id === `screen:${targetDisplay.id}`);
      if (!matched) {
        const allDisplays = screen.getAllDisplays();
        const idx = allDisplays.findIndex((d) => d.id === targetDisplay.id);
        matched = (idx >= 0 && sources[idx]) ? sources[idx] : sources[0];
      }
      if (matched && matched.thumbnail && !matched.thumbnail.isEmpty()) {
        bgDataUrl = matched.thumbnail.toDataURL();
      }
    }
  } catch (err) {
    console.error('desktopCapturer failed:', err);
  }

  // 2. Bring overlay windows back (keep main toolbar hidden during snipping)
  showOverlayWindows();

  // 3. Make overlay windows capture mouse events during selection
  for (const w of overlayWindows.values()) {
    if (!w.isDestroyed()) {
      w.setIgnoreMouseEvents(false);
      w.setFocusable(true);
    }
  }

  const win = overlayWindows.get(targetDisplay.id) || overlayWindows.values().next().value;
  if (!win || win.isDestroyed()) {
    console.error('Screenshot capture failed: no overlay window available');
    updateOverlayIgnoreMouse();
    if (toolbarWindow && !toolbarWindow.isDestroyed()) {
      toolbarWindow.show();
    }
    return false;
  }

  return new Promise((resolve) => {
    pendingExportResolve = resolve;
    win.webContents.send('scene:request-export', {
      bgDataUrl,
      format: state.exportDefaults.format || 'png',
      quality: state.exportDefaults.quality || 0.9,
      width: targetWidth,
      height: targetHeight,
      copyToClipboard: state.exportDefaults.copyToClipboard,
      autoSavePath: state.exportDefaults.autoSavePath,
      includeBackground: state.exportDefaults.includeBackground
    });
    setTimeout(() => {
      if (pendingExportResolve === resolve) {
        pendingExportResolve = null;
        updateOverlayIgnoreMouse();
        if (toolbarWindow && !toolbarWindow.isDestroyed()) {
          toolbarWindow.show();
        }
        resolve(false);
      }
    }, 120000);
  });
}

ipcMain.handle('app:take-screenshot', () => takeScreenshot());

ipcMain.handle('app:select-directory', async () => {
  const { filePaths, canceled } = await showModalDialog('open', {
    title: 'Select Screenshot Output Directory',
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled || !filePaths || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

ipcMain.handle('settings:reset', () => {
  return applySettingsPayload({
    brushDefaults: DEFAULT_STATE.brushDefaults,
    hotkeys: DEFAULT_STATE.hotkeys,
    exportDefaults: DEFAULT_STATE.exportDefaults,
    clickHalo: DEFAULT_STATE.clickHalo,
    rememberContentAfterExit: DEFAULT_STATE.rememberContentAfterExit,
    clearOnMinimize: DEFAULT_STATE.clearOnMinimize,
    startOnLogin: DEFAULT_STATE.startOnLogin,
    checkUpdatesOnStartup: DEFAULT_STATE.checkUpdatesOnStartup,
  });
});

ipcMain.handle('settings:open', () => {
  showSettingsWindow();
  return { ok: true };
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

  // Redact usernames
  const redacted = logContent.replace(/C:\\Users\\[a-zA-Z0-9_\-\.]+/gi, 'C:\\Users\\<Redacted>');

  const { filePath, canceled } = await dialog.showSaveDialog(editorWindow || null, {
    title: 'Export Redacted Diagnostics',
    defaultPath: path.join(app.getPath('downloads') || app.getPath('desktop'), 'repen-diagnostics.log'),
    filters: [{ name: 'Log Files', extensions: ['log', 'txt'] }]
  });

  if (!canceled && filePath) {
    try {
      fs.writeFileSync(filePath, redacted, 'utf8');
      return { success: true, path: filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'Canceled' };
});

function checkInterruptedSessions() {
  if (process.env.NODE_ENV === 'test' || !app || typeof app.getPath !== 'function' || !dialog || typeof dialog.showMessageBoxSync !== 'function') {
    return;
  }
  const videosDir = app.getPath('videos');
  try {
    if (!fs.existsSync(videosDir)) return;
    const files = fs.readdirSync(videosDir);
    const manifests = files.filter(f => f.endsWith('.session.json'));
    
    for (const file of manifests) {
      const manifestPath = path.join(videosDir, file);
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest.status === 'interrupted') {
          const result = dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Interrupted Recording Detected',
            message: 'RePen detected a recording session that was interrupted or crashed.',
            detail: `File: ${path.basename(manifest.outputPath || '')}`,
            buttons: ['Recover', 'Reveal in Explorer', 'Discard'],
            defaultId: 0,
            cancelId: 2,
          });

          if (result === 0) {
            const mp4Path = manifest.outputPath;
            if (mp4Path && fs.existsSync(mp4Path)) {
              fs.unlinkSync(manifestPath);
              dialog.showMessageBoxSync({
                type: 'info',
                title: 'Recovery Complete',
                message: 'Recording has been recovered successfully.',
              });
            } else {
              dialog.showMessageBoxSync({
                type: 'error',
                title: 'Recovery Failed',
                message: 'The partial recording file could not be found.',
              });
              fs.unlinkSync(manifestPath);
            }
          } else if (result === 1) {
            const mp4Path = manifest.outputPath;
            if (mp4Path && fs.existsSync(mp4Path)) {
              require('electron').shell.showItemInFolder(mp4Path);
            } else {
              require('electron').shell.openPath(videosDir);
            }
          } else {
            const mp4Path = manifest.outputPath;
            if (mp4Path && fs.existsSync(mp4Path)) {
              fs.unlinkSync(mp4Path);
            }
            const webcamPath = manifest.webcamOutputPath;
            if (webcamPath && fs.existsSync(webcamPath)) {
              fs.unlinkSync(webcamPath);
            }
            fs.unlinkSync(manifestPath);
            dialog.showMessageBoxSync({
              type: 'info',
              title: 'Session Discarded',
              message: 'The partial recording assets have been deleted.',
            });
          }
        }
      } catch (e) {
        console.error('Failed to parse or recover manifest:', e);
      }
    }
  } catch (err) {
    console.error('Error scanning for interrupted sessions:', err);
  }
}

app.whenReady().then(() => {
  init();
  checkInterruptedSessions();

  app.on('activate', () => {
    if (toolbarWindow && toolbarWindow.isDestroyed()) {
      createToolbarWindow();
    } else if (!toolbarWindow) {
      createToolbarWindow();
    } else {
      toolbarWindow.show();
    }
    if (state.overlayVisible) {
      showOverlayWindows();
    }
  });

  screen.on('display-added', rebuildWindows);
  screen.on('display-removed', rebuildWindows);
  screen.on('display-metrics-changed', rebuildWindows);
});

let recordingQuitCleanupComplete = false;
let recordingQuitCleanup = null;

app.on('before-quit', (event) => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
  writePersistedState();
  const needsCleanup = !recordingQuitCleanupComplete && (
    recorderService?.getState().isRecording ||
    ['starting', 'recording', 'paused', 'finalizing'].includes(currentRecordingPhase) ||
    presentationTrackService?.isRecording()
  );
  if (!needsCleanup) return;

  event.preventDefault();
  if (!recordingQuitCleanup) {
    recordingQuitCleanup = (async () => {
      try { await recorderService?.cancel(); } catch (error) {
        console.error('Failed to cancel recording during shutdown:', error);
      }
      try { await presentationTrackService?.discardTrack(); } catch (error) {
        console.error('Failed to discard presentation track during shutdown:', error);
      }
      stopRecordingTimer();
      recordingQuitCleanupComplete = true;
      app.quit();
    })();
  }
});

ipcMain.handle('project:relink-media', async (event, currentMediaPath = null) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized project request.' };
  const defaultPath = typeof currentMediaPath === 'string' && currentMediaPath
    ? path.dirname(currentMediaPath)
    : app.getPath('videos');
  const result = await dialog.showOpenDialog(editorWindow && !editorWindow.isDestroyed() ? editorWindow : undefined, {
    title: 'Relink RePen Recording Media',
    defaultPath,
    properties: ['openFile'],
    filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
  try {
    validateFinalizedRecordingMedia({ screenVideoPath: result.filePaths[0] });
    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('project:reveal-media', async (event, mediaPath) => {
  if (!isTrustedRecordingSender(event)) return { success: false, error: 'Unauthorized project request.' };
  if (typeof mediaPath !== 'string' || !mediaPath || !fs.existsSync(mediaPath)) {
    return { success: false, error: 'The media file is no longer available to reveal.' };
  }
  shell.showItemInFolder(mediaPath);
  return { success: true };
});

app.on('window-all-closed', (event) => {
  if (!app.isQuitting) {
    event.preventDefault();
  }
});

app.on('second-instance', () => {
  if (toolbarWindow) {
    toolbarWindow.show();
    toolbarWindow.focus();
  }
  if (state.overlayVisible) {
    showOverlayWindows();
  }
});
