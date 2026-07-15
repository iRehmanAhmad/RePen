import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { createAppIcon } from './icons';
import { screen } from 'electron';

export class SettingsWindow extends BaseWindow {
  constructor() {
    const primary = screen.getPrimaryDisplay();
    const settingsWidth = 820;
    const settingsHeight = 640;
    const x = Math.round(primary.bounds.x + primary.bounds.width / 2 - settingsWidth / 2);
    const y = Math.round(primary.bounds.y + primary.bounds.height / 2 - settingsHeight / 2);

    super({
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
    });
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'settings.html');
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
}
