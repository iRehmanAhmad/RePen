import { app, screen } from 'electron';
import EventEmitter from 'events';

export class DisplayManager extends EventEmitter {
  private listenersRegistered = false;

  constructor() {
    super();
    if (app.isReady()) {
      this.registerListeners();
    } else {
      app.once('ready', () => this.registerListeners());
    }
  }

  getDisplays() {
    return screen.getAllDisplays();
  }

  getPrimaryDisplay() {
    return screen.getPrimaryDisplay();
  }

  getDisplayMatching(bounds: { x: number; y: number; width: number; height: number }) {
    return screen.getDisplayMatching(bounds) || this.getPrimaryDisplay();
  }

  private registerListeners() {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    screen.on('display-added', () => {
      this.emit('change');
    });

    screen.on('display-removed', () => {
      this.emit('change');
    });

    screen.on('display-metrics-changed', () => {
      this.emit('change');
    });
  }
}
