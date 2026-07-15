import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process and electron inside self-contained closures to prevent hoisting ReferenceErrors
vi.mock('child_process', () => {
  const EventEmitter = require('events');
  const mockProcess = new EventEmitter() as any;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.stdin = {
    write: vi.fn(),
  };
  mockProcess.kill = vi.fn();
  
  const spawnMock = vi.fn().mockReturnValue(mockProcess);
  return {
    spawn: spawnMock,
    default: {
      spawn: spawnMock,
    },
  };
});

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('C:/mock-path'),
  },
  default: {
    app: {
      getPath: vi.fn().mockReturnValue('C:/mock-path'),
    },
  },
}));

import { RecorderService } from '../../electron/services/recorder';
import { spawn } from 'child_process';

describe('RecorderService Unit Test', () => {
  let recorder: RecorderService;

  beforeEach(() => {
    recorder = new RecorderService();
    vi.clearAllMocks();
  });

  it('should verify helper path resolves to wgc-capture.exe', () => {
    expect(recorder.getHelperPath()).toContain('wgc-capture.exe');
  });

  it('should handle start success when subprocess outputs Recording started', async () => {
    recorder.isAvailable = () => true;

    const startPromise = recorder.start({
      sourceId: '123',
      sourceType: 'screen',
      width: 1920,
      height: 1080,
      fps: 30,
      captureSystemAudio: true,
      captureMic: false,
      webcamEnabled: false,
      captureCursor: true,
      outputPath: 'C:/temp/recording.mp4',
    });

    const mockProcess = vi.mocked(spawn)().stdout;

    // Simulate stdout output from native recorder binary
    setTimeout(() => {
      mockProcess.emit('data', Buffer.from('Recording started\n'));
    }, 10);

    await expect(startPromise).resolves.toBeUndefined();
    expect(recorder.getState().isRecording).toBe(true);
  });
});
