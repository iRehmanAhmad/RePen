import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

function isTrustedNavigation(targetUrl: string): boolean {
  try {
    const url = new URL(targetUrl);
    if (url.protocol === 'file:') {
      const rendererRoot = path.resolve(__dirname, '../../dist-renderer');
      const targetPath = path.resolve(fileURLToPath(url));
      return targetPath === rendererRoot || targetPath.startsWith(`${rendererRoot}${path.sep}`);
    }

    const devServerUrl = process.env.REPEN_VITE_DEV_SERVER_URL?.trim();
    if (!devServerUrl) return false;

    const configuredUrl = new URL(devServerUrl);
    const isLocalDevServer =
      configuredUrl.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '::1'].includes(configuredUrl.hostname);
    return isLocalDevServer && url.origin === configuredUrl.origin;
  } catch {
    return false;
  }
}

export abstract class BaseWindow {
  protected window: BrowserWindow | null = null;
  protected options: BrowserWindowConstructorOptions;

  constructor(options: BrowserWindowConstructorOptions) {
    const requestedWebPreferences = options.webPreferences || {};
    this.options = {
      ...options,
      webPreferences: {
        ...requestedWebPreferences,
        preload: path.join(__dirname, '../../src/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    };
  }

  create() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow(this.options);
    // RePen composites its own presentation track. Its controls and overlays
    // should not be baked into a clean display/window capture.
    this.window.setContentProtection(true);
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

    this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    this.window.webContents.on('will-navigate', (event, targetUrl) => {
      if (!isTrustedNavigation(targetUrl)) {
        event.preventDefault();
      }
    });
  }
}
