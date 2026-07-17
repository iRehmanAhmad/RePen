import { describe, expect, it } from 'vitest';

// This is production code consumed by both Electron entry points.
// Do not recreate FFmpeg commands in this test: the export pipeline remains
// capability-gated until its licensed compositor implementation is verified.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createAppCapabilities, getProjectExportAvailability } = require('../../src/shared/recording/appCapabilities.js');

describe('production export capability contract', () => {
  it('fails closed when native recording cannot be verified', () => {
    const capabilities = createAppCapabilities({
      recorder: { available: true, supported: false, reason: 'Native probe failed.' },
    });

    expect(capabilities.recorder).toEqual({ available: false, reason: 'Native probe failed.' });
    expect(capabilities.selectedWindow.available).toBe(false);
    expect(capabilities.microphone.available).toBe(false);
    expect(capabilities.webcam.available).toBe(false);
  });

  it('reports only recorder features confirmed by the native probe', () => {
    const capabilities = createAppCapabilities({
      recorder: {
        available: true,
        supported: true,
        systemAudio: true,
        microphone: false,
        webcam: true,
      },
    });

    expect(capabilities.recorder.available).toBe(true);
    expect(capabilities.selectedWindow.available).toBe(true);
    expect(capabilities.systemAudio.available).toBe(true);
    expect(capabilities.microphone).toEqual({
      available: false,
      reason: 'Microphone capture was not reported by the native recorder.',
    });
    expect(capabilities.webcam.available).toBe(true);
  });

  it('does not advertise captions, presentation replay, MP4, or GIF before their production gates exist', () => {
    const capabilities = createAppCapabilities({
      recorder: { available: true, supported: true, systemAudio: true, microphone: true, webcam: true },
    });

    expect(capabilities.presentationReplay.available).toBe(false);
    expect(capabilities.captions.available).toBe(false);
    expect(capabilities.mp4Export.available).toBe(false);
    expect(capabilities.gifExport.available).toBe(false);
    expect(getProjectExportAvailability().available).toBe(false);
  });
});
