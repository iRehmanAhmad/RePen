import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { createAppIcon } from './icons';
import fs from 'fs';
import path from 'path';
import { ipcMain, app } from 'electron';

export class ToolbarWindow extends BaseWindow {
  private moveTimeout: NodeJS.Timeout | null = null;

  constructor(bounds: { x: number; y: number; width: number; height: number }) {
    super({
      ...bounds,
      transparent: true,
      frame: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      skipTaskbar: false,
      hasShadow: false,
      icon: createAppIcon(),
      backgroundColor: '#00000000',
      show: true,
      alwaysOnTop: true,
    });
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'toolbar.html');
    this.window.setIgnoreMouseEvents(true, { forward: true });
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  protected setupListeners() {
    super.setupListeners();
    if (!this.window) return;

    const logPath = path.join(app.getPath('userData'), 'rep-debug.log');

    this.window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const logLine = `[Renderer Console] ${message} (${sourceId}:${line})\n`;
      console.log(logLine.trim());
      try {
        fs.appendFileSync(logPath, logLine);
      } catch (e) {}
    });

    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'v') {
        ipcMain.emit('app:paste-image-requested');
        event.preventDefault();
      }
    });

    this.window.on('move', () => {
      if (!this.moveTimeout) {
        this.moveTimeout = setTimeout(() => {
          this.moveTimeout = null;
          ipcMain.emit('app:toolbar-moved');
        }, 100);
      }
    });

    this.window.on('moved', () => {
      if (this.moveTimeout) {
        clearTimeout(this.moveTimeout);
        this.moveTimeout = null;
      }
      ipcMain.emit('app:toolbar-moved');
    });
  }
}
