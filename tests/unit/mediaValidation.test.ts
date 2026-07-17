import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateFinalizedRecordingMedia } = require('../../src/shared/editor/mediaValidation.js');

function fakeFs(files: Record<string, { isFile: boolean; size: number }>) {
  return {
    statSync(filePath: string) {
      const file = files[filePath];
      if (!file) throw new Error('ENOENT');
      return { isFile: () => file.isFile, size: file.size };
    },
  };
}

describe('finalized recording media validation', () => {
  it('accepts complete, non-empty screen and optional sidecar media', () => {
    const fs = fakeFs({
      'C:\\recording.mp4': { isFile: true, size: 1024 },
      'C:\\recording.presentation.jsonl': { isFile: true, size: 128 },
      'C:\\recording-webcam.mp4': { isFile: true, size: 512 },
    });
    expect(validateFinalizedRecordingMedia({
      screenVideoPath: 'C:\\recording.mp4',
      nativeSessionPath: 'C:\\recording.presentation.jsonl',
      webcamVideoPath: 'C:\\recording-webcam.mp4',
    }, fs)).toBe(true);
  });

  it('rejects missing or empty media instead of creating a broken project', () => {
    const fs = fakeFs({
      'C:\\empty.mp4': { isFile: true, size: 0 },
      'C:\\recording.mp4': { isFile: true, size: 10 },
    });
    expect(() => validateFinalizedRecordingMedia({ screenVideoPath: 'C:\\missing.mp4' }, fs))
      .toThrow('Screen recording file could not be found.');
    expect(() => validateFinalizedRecordingMedia({ screenVideoPath: 'C:\\empty.mp4' }, fs))
      .toThrow('Screen recording file is empty or invalid.');
    expect(() => validateFinalizedRecordingMedia({
      screenVideoPath: 'C:\\recording.mp4',
      nativeSessionPath: 'C:\\missing.presentation.jsonl',
    }, fs)).toThrow('Presentation sidecar file could not be found.');
  });
});
