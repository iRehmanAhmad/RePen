import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { createAppIcon } from './icons';
import { screen } from 'electron';

export class EditorWindow extends BaseWindow {
  constructor() {
    const primary = screen.getPrimaryDisplay();
    const width = 1280;
    const height = 800;
    const x = Math.round(primary.bounds.x + (primary.bounds.width - width) / 2);
    const y = Math.round(primary.bounds.y + (primary.bounds.height - height) / 2);

    super({
      x,
      y,
      width,
      height,
      frame: true,
      resizable: true,
      minimizable: true,
      maximizable: true,
      show: false,
      icon: createAppIcon(),
    });
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'editor.html');
  }
}
