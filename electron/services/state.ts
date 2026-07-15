import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export const DEFAULT_STATE = {
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

export class StateManager {
  private state: any;
  private filePath: string;

  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.filePath = path.join(app.getPath('userData'), 'state.json');
    this.load();
  }

  getState() {
    return this.state;
  }

  updateState(updates: Partial<typeof DEFAULT_STATE>) {
    this.state = {
      ...this.state,
      ...updates,
      brushDefaults: {
        ...this.state.brushDefaults,
        ...(updates.brushDefaults || {}),
      },
      hotkeys: {
        ...this.state.hotkeys,
        ...(updates.hotkeys || {}),
      },
      exportDefaults: {
        ...this.state.exportDefaults,
        ...(updates.exportDefaults || {}),
      },
    };
    this.save();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state) {
        this.state = {
          ...DEFAULT_STATE,
          ...parsed.state,
          brushDefaults: {
            ...DEFAULT_STATE.brushDefaults,
            ...(parsed.state.brushDefaults || {}),
          },
          hotkeys: {
            ...DEFAULT_STATE.hotkeys,
            ...(parsed.state.hotkeys || {}),
          },
          exportDefaults: {
            ...DEFAULT_STATE.exportDefaults,
            ...(parsed.state.exportDefaults || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }

  save() {
    try {
      const payload = {
        version: 2,
        state: this.state,
      };
      const temp = `${this.filePath}.tmp`;
      fs.writeFileSync(temp, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(temp, this.filePath);
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }
}
