import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { createAppIcon } from './icons';
import { screen } from 'electron';

export class SelectorWindow extends BaseWindow {
  constructor() {
    const primary = screen.getPrimaryDisplay();
    const width = 720;
    const height = 500;
    const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
    const y = Math.round(primary.bounds.y + (primary.bounds.height - height) / 2);

    super({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      show: false,
      icon: createAppIcon(),
      backgroundColor: '#00000000',
    });
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'selector.html');
  }
}
