import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

describe('Update Check Version Comparison Logic', () => {
  it('correctly compares version numbers', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.10.0', '1.2.0')).toBe(1);
  });

  it('verifies update check IPC registrations in main.js and preload.js', () => {
    const root = path.resolve(__dirname, '..', '..');
    const mainContent = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    const preloadContent = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');

    expect(mainContent).toContain("ipcMain.handle('app:check-updates'");
    expect(preloadContent).toContain("checkUpdates: () => ipcRenderer.invoke('app:check-updates')");
  });
});
