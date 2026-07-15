import { describe, expect, it } from 'vitest';
import type { BrowserWindowConstructorOptions } from 'electron';
import { BaseWindow } from '../../electron/windows/baseWindow';

class TestWindow extends BaseWindow {
  constructor(options: BrowserWindowConstructorOptions) {
    super(options);
  }

  getOptions() {
    return this.options;
  }

  protected loadContent() {}
}

describe('BaseWindow security defaults', () => {
  it('does not allow a subclass to weaken renderer isolation', () => {
    const window = new TestWindow({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        sandbox: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
      },
    });

    expect(window.getOptions().webPreferences).toMatchObject({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    });
  });
});
