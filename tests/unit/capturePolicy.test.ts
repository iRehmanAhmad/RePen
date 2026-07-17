import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  WindowRole,
  shouldExcludeFromCapture,
  nativeWindowHandleCandidates,
  filterRepenOwnedSources,
} = require('../../src/shared/recording/capturePolicy.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRecordingProject, migrateProjectData } = require('../../src/shared/editor/projectFactory.js');

describe('RePen capture policy', () => {
  it('excludes every control role while allowing the presentation overlay in baked display recordings', () => {
    expect(shouldExcludeFromCapture(WindowRole.PRESENTATION_OVERLAY)).toBe(false);
    expect(shouldExcludeFromCapture(WindowRole.EDITOR)).toBe(false);
    for (const role of [
      WindowRole.TOOLBAR,
      WindowRole.SELECTOR,
      WindowRole.COUNTDOWN,
      WindowRole.SETTINGS,
      WindowRole.DIALOG,
      WindowRole.RECOVERY,
      WindowRole.WEBCAM_PREVIEW,
    ]) {
      expect(shouldExcludeFromCapture(role)).toBe(true);
    }
  });

  it('removes RePen-owned window sources using decimal or hexadecimal native handles', () => {
    const handle = Buffer.alloc(8);
    handle.writeBigUInt64LE(1234n);
    expect(nativeWindowHandleCandidates(handle)).toEqual(['1234', '0x4d2']);

    const filtered = filterRepenOwnedSources([
      { id: 'window:1234:0', name: 'RePen toolbar' },
      { id: 'window:0x4D2:0', name: 'RePen selector' },
      { id: 'window:777:0', name: 'Presentation app' },
      { id: 'screen:0:0', name: 'Display 1' },
    ], nativeWindowHandleCandidates(handle));

    expect(filtered.map((source: { id: string }) => source.id)).toEqual(['window:777:0', 'screen:0:0']);
  });

  it('records baked or sidecar presentation mode in a project and migrates legacy projects to baked', () => {
    const sidecarProject = createRecordingProject({
      screenVideoPath: 'C:\\video.mp4',
      nativeSessionPath: 'C:\\video.presentation.jsonl',
      presentationMode: 'sidecar',
    });
    expect(sidecarProject.media.presentationMode).toBe('sidecar');
    expect(migrateProjectData({ media: { screenVideoPath: 'C:\\legacy.mp4' } }).media.presentationMode).toBe('baked');
  });

  it('applies centralized capture policy before any control window is made visible', () => {
    const mainSource = fs.readFileSync(path.resolve(__dirname, '..', '..', 'main.js'), 'utf8');
    for (const [windowName, role] of [
      ['toolbarWindow', 'WindowRole.TOOLBAR'],
      ['settingsWindow', 'WindowRole.SETTINGS'],
      ['selectorWindow', 'WindowRole.SELECTOR'],
      ['countdownWindow', 'WindowRole.COUNTDOWN'],
      ['editorWindow', 'WindowRole.EDITOR'],
    ]) {
      expect(mainSource).toContain(`applyCapturePolicy(${windowName}, ${role})`);
    }
    expect(mainSource).toContain('filterRepenOwnedSources(sources, getRepenOwnedWindowHandleCandidates())');
  });
});
