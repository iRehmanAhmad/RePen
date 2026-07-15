import { Display } from 'electron';
import { OverlayWindow } from './overlayWindow';
import { ToolbarWindow } from './toolbarWindow';
import { SettingsWindow } from './settingsWindow';
import { SelectorWindow } from './selectorWindow';
import { CountdownWindow } from './countdownWindow';
import { EditorWindow } from './editorWindow';

export class WindowRegistry {
  private overlayWindows: Map<number, OverlayWindow> = new Map();
  private toolbarWindow: ToolbarWindow | null = null;
  private settingsWindow: SettingsWindow | null = null;
  private selectorWindow: SelectorWindow | null = null;
  private countdownWindow: CountdownWindow | null = null;
  private editorWindow: EditorWindow | null = null;

  // Overlays
  getOverlay(displayId: number): OverlayWindow | undefined {
    return this.overlayWindows.get(displayId);
  }

  getOverlays(): OverlayWindow[] {
    return Array.from(this.overlayWindows.values());
  }

  createOverlay(display: Display): OverlayWindow {
    this.destroyOverlay(display.id);
    const win = new OverlayWindow(display);
    win.create();
    this.overlayWindows.set(display.id, win);
    return win;
  }

  destroyOverlay(displayId: number) {
    const win = this.overlayWindows.get(displayId);
    if (win) {
      win.destroy();
      this.overlayWindows.delete(displayId);
    }
  }

  clearOverlays() {
    for (const win of this.overlayWindows.values()) {
      win.destroy();
    }
    this.overlayWindows.clear();
  }

  // Toolbar
  getToolbar(): ToolbarWindow | null {
    return this.toolbarWindow;
  }

  createToolbar(bounds: { x: number; y: number; width: number; height: number }): ToolbarWindow {
    this.destroyToolbar();
    this.toolbarWindow = new ToolbarWindow(bounds);
    this.toolbarWindow.create();
    return this.toolbarWindow;
  }

  destroyToolbar() {
    if (this.toolbarWindow) {
      this.toolbarWindow.destroy();
      this.toolbarWindow = null;
    }
  }

  // Settings
  getSettings(): SettingsWindow | null {
    return this.settingsWindow;
  }

  createSettings(): SettingsWindow {
    this.destroySettings();
    this.settingsWindow = new SettingsWindow();
    this.settingsWindow.create();
    return this.settingsWindow;
  }

  destroySettings() {
    if (this.settingsWindow) {
      this.settingsWindow.destroy();
      this.settingsWindow = null;
    }
  }

  // Selector
  getSelector(): SelectorWindow | null {
    return this.selectorWindow;
  }

  createSelector(): SelectorWindow {
    this.destroySelector();
    this.selectorWindow = new SelectorWindow();
    this.selectorWindow.create();
    return this.selectorWindow;
  }

  destroySelector() {
    if (this.selectorWindow) {
      this.selectorWindow.destroy();
      this.selectorWindow = null;
    }
  }

  // Countdown
  getCountdown(): CountdownWindow | null {
    return this.countdownWindow;
  }

  createCountdown(display: Display): CountdownWindow {
    this.destroyCountdown();
    this.countdownWindow = new CountdownWindow(display);
    this.countdownWindow.create();
    return this.countdownWindow;
  }

  destroyCountdown() {
    if (this.countdownWindow) {
      this.countdownWindow.destroy();
      this.countdownWindow = null;
    }
  }

  // Editor
  getEditor(): EditorWindow | null {
    return this.editorWindow;
  }

  createEditor(): EditorWindow {
    this.destroyEditor();
    this.editorWindow = new EditorWindow();
    this.editorWindow.create();
    return this.editorWindow;
  }

  destroyEditor() {
    if (this.editorWindow) {
      this.editorWindow.destroy();
      this.editorWindow = null;
    }
  }

  // Clear all cached singletons/overlays on exit
  destroyAll() {
    this.clearOverlays();
    this.destroyToolbar();
    this.destroySettings();
    this.destroySelector();
    this.destroyCountdown();
    this.destroyEditor();
  }
}
