import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../../electron/services/state';

describe('State Manager Defaults Test', () => {
  it('should load correct default state keys', () => {
    expect(DEFAULT_STATE.overlayVisible).toBe(true);
    expect(DEFAULT_STATE.passThrough).toBe(false);
    expect(DEFAULT_STATE.activeTool).toBe('pen');
    expect(DEFAULT_STATE.hotkeys.toggleOverlay).toBe('CommandOrControl+Alt+H');
  });
});
