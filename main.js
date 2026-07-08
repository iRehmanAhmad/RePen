const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, desktopCapturer, clipboard, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

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
  spotlight: {
    radius: 150,
    alpha: 0.75,
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
    };
    state.overlayVisible = true;
    // Do not restore desktop annotations on startup
    desktopPage = {
      annotations: [],
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
  const payload = deepClone(state);
  payload.currentPageIndex = currentPageIndex;
  payload.totalPages = pages.length;
  payload.dockSide = getDockSide();
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
        { label: 'Select Tool', type: 'radio', checked: state.activeTool === 'select', click: () => setTool('select') },
        { label: 'Spotlight', type: 'radio', checked: state.activeTool === 'spotlight', click: () => setTool('spotlight') },
        { label: 'Magnifier', type: 'radio', checked: state.activeTool === 'magnifier', click: () => setTool('magnifier') },
        { label: 'Eraser', type: 'radio', checked: state.activeTool === 'eraser', click: () => setTool('eraser') },
      ],
    },
    { type: 'separator' },
    { label: 'Settings...', click: () => showSettingsWindow() },
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
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#ff9f43"/>
          <stop offset="100%" stop-color="#ff5a5f"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="44" height="44" rx="14" fill="#121826"/>
      <path d="M18 39c7-12 15-18 28-18" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/>
      <circle cx="46" cy="20" r="4" fill="#ffe36d"/>
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${svg.toString('base64')}`);
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
    hasShadow: false,
    backgroundColor: '#00000000',
    show: true,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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
  return win;
}

function createToolbarWindow() {
  const primary = screen.getPrimaryDisplay();
  const isHorizontal = state.toolbarOrientation === 'horizontal';
  const toolbarWidth = isHorizontal ? Math.min(760, primary.workArea.width - 10) : 350;
  const toolbarHeight = isHorizontal ? 350 : Math.min(760, primary.workArea.height - 10);
  const x = isHorizontal
    ? Math.round(primary.bounds.x + (primary.bounds.width - toolbarWidth) / 2)
    : Math.round(primary.bounds.x + primary.bounds.width - toolbarWidth - 20);
  const y = isHorizontal
    ? Math.max(primary.bounds.y + 20, primary.workArea.y + 12)
    : Math.round(primary.bounds.y + Math.max(20, (primary.bounds.height - toolbarHeight) / 2));

  toolbarWindow = new BrowserWindow({
    x,
    y,
    width: toolbarWidth,
    height: toolbarHeight,
    transparent: true,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    show: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    return settingsWindow;
  }

  const primary = screen.getPrimaryDisplay();
  const settingsWidth = 920;
  const settingsHeight = 780;
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

function showSettingsWindow() {
  const win = createSettingsWindow();
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
  win.webContents.send('app:state-changed', getAppState());
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
  const ignoreForTool = state.activeTool === 'laser' || state.activeTool === 'spotlight' || state.activeTool === 'magnifier';
  const shouldIgnore = state.passThrough || ignoreForTool;

  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      if (shouldIgnore) {
        win.setIgnoreMouseEvents(true, { forward: true });
      } else {
        win.setIgnoreMouseEvents(false);
      }
      const isBoard = state.backgroundMode && state.backgroundMode !== 'transparent';
      const focusable = (isBoard || state.activeTool === 'text' || state.activeTool === 'select') && !shouldIgnore;
      win.setFocusable(focusable);
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
  state.activeTool = tool;
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
    const primary = screen.getPrimaryDisplay();
    if (state.toolbarOrientation === 'horizontal') {
      const width = Math.min(760, primary.workArea.width - 10);
      const height = 350;
      const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
      const y = Math.max(primary.bounds.y + 20, primary.workArea.y + 12);
      toolbarWindow.setBounds({ x, y, width, height });
    } else {
      const width = 350;
      const height = Math.min(760, primary.workArea.height - 10);
      const x = Math.round(primary.bounds.x + primary.bounds.width - width - 20);
      const y = Math.round(primary.bounds.y + Math.max(20, (primary.bounds.height - height) / 2));
      toolbarWindow.setBounds({ x, y, width, height });
    }
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
  } else {
    state.brushDefaults.pen.color = color;
  }
  broadcastState();
}

function setWidth(width) {
  const nextWidth = Math.max(1, Number(width) || 1);
  if (state.activeTool === 'highlighter') {
    state.brushDefaults.highlighter.width = nextWidth;
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
  const win = overlayWindows.values().next().value;
  if (!win || win.isDestroyed()) {
    return { ok: false, error: 'No active window to export' };
  }

  const { filePath, canceled } = await showModalDialog('save', {
    title: 'Export Document as PDF',
    defaultPath: path.join(app.getPath('documents'), `RePen_Document_${Date.now()}.pdf`),
    filters: [
      { name: 'PDF Document (*.pdf)', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled || !filePath) return { ok: false };

  try {
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: true
    });
    fs.writeFileSync(filePath, pdfData);
    return { ok: true, filePath };
  } catch (err) {
    console.error('Failed to export PDF:', err);
    return { ok: false, error: err.message };
  }
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

  if (stroke.tool === 'shapes' || stroke.shapeType) {
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
    for (const stroke of annotations) {
      const segments = eraseStrokeSegments(stroke, points, radius);
      nextAnnotations.push(...segments);
    }
    annotations = nextAnnotations;
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
      : stroke.color || state.brushDefaults.pen.color;
  const baseWidth =
    tool === 'highlighter'
      ? stroke.width || state.brushDefaults.highlighter.width
      : stroke.width || state.brushDefaults.pen.width;
  const baseOpacity =
    tool === 'highlighter'
      ? typeof stroke.opacity === 'number'
        ? stroke.opacity
        : state.brushDefaults.highlighter.opacity
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
  };
}

function applySettingsPayload(payload = {}) {
  const previousBrushDefaults = deepClone(state.brushDefaults);
  const previousHotkeys = deepClone(state.hotkeys);
  const previousExportDefaults = deepClone(state.exportDefaults);
  const normalized = normalizeSettingsPayload(payload);
  state.brushDefaults = normalized.brushDefaults;
  state.exportDefaults = normalized.exportDefaults;
  const hotkeyResult = applyHotkeys(normalized.hotkeys);
  if (!hotkeyResult.ok) {
    state.brushDefaults = previousBrushDefaults;
    state.hotkeys = previousHotkeys;
    state.exportDefaults = previousExportDefaults;
    registerShortcuts();
    return hotkeyResult;
  }

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
    if (state.toolbarHovered) {
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
  return getAppState();
});

ipcMain.handle('app:set-board-color', (_, color) => {
  setBoardColor(color);
  return getAppState();
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
  return getSceneState();
});

ipcMain.handle('scene:update-annotation', (_, updated) => {
  recordSceneChange(() => {
    const idx = annotations.findIndex((a) => a.id === updated.id);
    if (idx !== -1) {
      annotations[idx] = normalizeStroke(updated);
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
        annotations[idx] = normalizeStroke(updated);
      }
    }
  });
  return getSceneState();
});

ipcMain.handle('scene:delete-annotations', (_, ids = []) => {
  if (!ids || !ids.length) return getSceneState();
  recordSceneChange(() => {
    annotations = annotations.filter((a) => !ids.includes(a.id));
  });
  return getSceneState();
});

ipcMain.handle('scene:erase-path', (_, payload) => {
  erasePath(payload);
  return getSceneState();
});

ipcMain.handle('scene:clear', () => {
  clearScene();
  return getSceneState();
});

ipcMain.handle('scene:undo', () => {
  undo();
  return getSceneState();
});

ipcMain.handle('scene:redo', () => {
  redo();
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

let pendingExportResolve = null;

ipcMain.handle('app:render-export', async (_, payload) => {
  if (!payload || !payload.dataUrl) {
    if (pendingExportResolve) { pendingExportResolve(false); pendingExportResolve = null; }
    return false;
  }
  try {
    const base64Data = payload.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

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
    return true;
  } catch (err) {
    console.error('Failed to save exported screenshot:', err);
    if (pendingExportResolve) { pendingExportResolve(false); pendingExportResolve = null; }
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

  let bgDataUrl = null;
  if (state.exportDefaults.includeBackground) {
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
  }

  const win = overlayWindows.get(targetDisplay.id) || overlayWindows.values().next().value;
  if (!win || win.isDestroyed()) {
    console.error('Screenshot capture failed: no overlay window available');
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
      autoSavePath: state.exportDefaults.autoSavePath
    });
    setTimeout(() => {
      if (pendingExportResolve === resolve) {
        pendingExportResolve = null;
        resolve(false);
      }
    }, 10000);
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
  });
});

ipcMain.handle('settings:open', () => {
  showSettingsWindow();
  return { ok: true };
});

app.whenReady().then(() => {
  init();

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

app.on('before-quit', () => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
  writePersistedState();
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
