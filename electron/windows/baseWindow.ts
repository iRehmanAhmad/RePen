import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';

export abstract class BaseWindow {
  protected window: BrowserWindow | null = null;
  protected options: BrowserWindowConstructorOptions;

  constructor(options: BrowserWindowConstructorOptions) {
    this.options = {
      ...options,
      webPreferences: {
        preload: path.join(__dirname, '../../src/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        ...(options.webPreferences || {}),
      },
    };
  }

  create() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow(this.options);
    this.setupListeners();
    this.loadContent();
  }

  getWindow() {
    return this.window;
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }

  isVisible(): boolean {
    return !!(this.window && !this.window.isDestroyed() && this.window.isVisible());
  }

  show() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
    }
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
    }
  }

  protected abstract loadContent(): void;

  protected setupListeners() {
    if (!this.window) return;

    this.window.on('closed', () => {
      this.window = null;
    });
  }
}
