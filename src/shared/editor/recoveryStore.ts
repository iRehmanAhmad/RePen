export interface RecoveryStorage {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RecoverySnapshot<T> {
  projectPath: string;
  savedAtEpochMs: number;
  project: T;
}

export const RECOVERY_PREFIX = 'repen-editor-recovery:';
export const MAX_RECOVERY_SNAPSHOTS = 10;

export function recoveryKey(projectPath: string): string {
  return `${RECOVERY_PREFIX}${encodeURIComponent(projectPath)}`;
}

export function readRecoverySnapshot<T>(storage: RecoveryStorage, projectPath: string): RecoverySnapshot<T> | null {
  try {
    const raw = storage.getItem(recoveryKey(projectPath));
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as RecoverySnapshot<T>;
    return snapshot?.projectPath === projectPath && snapshot.project ? snapshot : null;
  } catch {
    return null;
  }
}

export function saveRecoverySnapshot<T>(storage: RecoveryStorage, snapshot: RecoverySnapshot<T>): void {
  const entries: Array<{ key: string; savedAtEpochMs: number }> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(RECOVERY_PREFIX)) continue;
    try { entries.push({ key, savedAtEpochMs: JSON.parse(storage.getItem(key) || '{}').savedAtEpochMs || 0 }); } catch {}
  }
  entries.sort((a, b) => b.savedAtEpochMs - a.savedAtEpochMs);
  for (const stale of entries.slice(MAX_RECOVERY_SNAPSHOTS - 1)) storage.removeItem(stale.key);
  storage.setItem(recoveryKey(snapshot.projectPath), JSON.stringify(snapshot));
}

export function clearRecoverySnapshot(storage: RecoveryStorage, projectPath: string): void {
  storage.removeItem(recoveryKey(projectPath));
}
