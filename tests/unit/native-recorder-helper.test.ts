import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const helperPath = path.resolve(
  'dist-electron',
  'native',
  'bin',
  'win32-x64',
  'wgc-capture.exe',
);
const nativeIt = process.platform === 'win32' && fs.existsSync(helperPath) ? it : it.skip;

describe('native recorder executable contract', () => {
  nativeIt('reports structured WGC capabilities without opening a capture session', () => {
    const result = spawnSync(helperPath, ['--probe'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const event = JSON.parse(result.stdout.trim());
    expect([0, 2]).toContain(result.status);
    expect(event).toMatchObject({ event: 'capabilities', schemaVersion: 2 });
    expect(typeof event.wgcSupported).toBe('boolean');
  });

  nativeIt('emits structured readiness and a nonzero exit for an unsupported source without creating output', () => {
    const outputPath = path.resolve('dist-electron', `native-contract-${process.pid}-${Date.now()}.mp4`);
    const result = spawnSync(helperPath, [JSON.stringify({
      schemaVersion: 2,
      sourceType: 'unsupported',
      outputs: { screenPath: outputPath },
    })], {
      encoding: 'utf8',
      windowsHide: true,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('{"event":"ready","schemaVersion":2}');
    expect(result.stderr).toContain('Unsupported native capture source type');
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  nativeIt('rejects an invalid HWND explicitly before opening an output file', () => {
    const outputPath = path.resolve('dist-electron', `native-window-contract-${process.pid}-${Date.now()}.mp4`);
    const result = spawnSync(helperPath, [JSON.stringify({
      schemaVersion: 2,
      sourceType: 'window',
      windowHandle: '0',
      outputs: { screenPath: outputPath },
    })], {
      encoding: 'utf8',
      windowsHide: true,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('{"event":"ready","schemaVersion":2}');
    expect(result.stderr).toContain('requires a valid HWND');
    expect(fs.existsSync(outputPath)).toBe(false);
  });
});
