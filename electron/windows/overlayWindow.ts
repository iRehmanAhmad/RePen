import { Display, ipcMain } from 'electron';
import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { appendRendererDebugLog } from '../services/debugLog';

export class OverlayWindow extends BaseWindow {
  public display: Display;

  constructor(display: Display) {
    const bounds = display.bounds;
    super({
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
      closable: true,
      focusable: true,
      skipTaskbar: true,
      type: 'utility',
      hasShadow: false,
      backgroundColor: '#00000000',
      show: true,
      alwaysOnTop: true,
      fullscreenable: false,
    });
    this.display = display;
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'overlay.html', { displayId: String(this.display.id) });
    this.window.setAlwaysOnTop(true, 'floating');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  protected setupListeners() {
    super.setupListeners();
    if (!this.window) return;

    this.window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const logLine = `[Overlay Console] ${message} (${sourceId}:${line})\n`;
      console.log(logLine.trim());
      appendRendererDebugLog('Overlay Console', message, line, sourceId);
    });

    this.window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && (input.control || input.meta) && input.key.toLowerCase() === 'v') {
        ipcMain.emit('app:paste-image-requested');
        event.preventDefault();
      }
    });
  }

  setIgnoreMouseEvents(ignore: boolean) {
    if (!this.window) return;
    this.window.setIgnoreMouseEvents(ignore, { forward: true });
  }
}
