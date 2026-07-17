import { describe, expect, it } from 'vitest';
import { clearRecoverySnapshot, readRecoverySnapshot, saveRecoverySnapshot } from '../../src/shared/editor/recoveryStore';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] || null; }
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('bounded editor recovery snapshots', () => {
  it('round-trips a project snapshot and clears it after a successful save', () => {
    const storage = new MemoryStorage();
    saveRecoverySnapshot(storage, { projectPath: 'C:\\video.repen-project', savedAtEpochMs: 1, project: { version: 2 } });
    expect(readRecoverySnapshot<{ version: number }>(storage, 'C:\\video.repen-project')?.project.version).toBe(2);
    clearRecoverySnapshot(storage, 'C:\\video.repen-project');
    expect(readRecoverySnapshot(storage, 'C:\\video.repen-project')).toBeNull();
  });

  it('keeps recovery storage bounded to ten snapshots', () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 12; index += 1) {
      saveRecoverySnapshot(storage, { projectPath: `C:\\${index}.repen-project`, savedAtEpochMs: index, project: { index } });
    }
    expect(storage.length).toBe(10);
  });
});
