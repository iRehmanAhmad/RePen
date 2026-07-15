import { BaseWindow } from './baseWindow';
import { loadWindowContent } from './loader';
import { Display } from 'electron';

export class CountdownWindow extends BaseWindow {
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
      closable: false,
      focusable: false,
      skipTaskbar: true,
      type: 'utility',
      hasShadow: false,
      backgroundColor: '#00000000',
      show: false,
      alwaysOnTop: true,
    });
  }

  protected loadContent() {
    if (!this.window) return;
    loadWindowContent(this.window, 'countdown.html');
    this.window.setIgnoreMouseEvents(true);
    this.window.setAlwaysOnTop(true, 'screen-saver');
  }
}
