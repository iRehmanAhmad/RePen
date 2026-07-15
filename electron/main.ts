import { app, ipcMain } from 'electron';
import { initializeSingleInstanceLock } from './bootstrap/instance';
import { StateManager } from './services/state';
import { DisplayManager } from './services/display';
import { ShortcutManager } from './services/shortcuts';
import { WindowRegistry } from './windows/registry';

// Global singleton instances
let stateManager: StateManager;
let displayManager: DisplayManager;
let shortcutManager: ShortcutManager;
let windowRegistry: WindowRegistry;

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
