import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';

vi.mock('child_process', () => {
  const { EventEmitter } = require('events');
  const spawnMock = vi.fn(() => {
    const process = new EventEmitter() as any;
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    process.stdin = {
      destroyed: false,
      writable: true,
      write: vi.fn((_data: string, callback?: (error?: Error | null) => void) => {
        callback?.(null);
        return true;
      }),
    };
    process.killed = false;
    process.kill = vi.fn(() => {
      process.killed = true;
      return true;
    });
    return process;
  });
  return { spawn: spawnMock, default: { spawn: spawnMock } };
});

vi.mock('electron', () => ({
  app: { isPackaged: false },
  default: { app: { isPackaged: false } },
}));

import { spawn } from 'child_process';
import { RecorderOptions, RecorderService } from '../../electron/services/recorder';

const spawnMock = vi.mocked(spawn);
const helperPath = 'C:\\RePen\\wgc-capture.exe';

function options(overrides: Partial<RecorderOptions> = {}): RecorderOptions {
  return {
    sourceId: 'screen:0',
    sourceType: 'screen',
    width: 1920,
    height: 1080,
    fps: 30,
    captureSystemAudio: true,
    captureMic: false,
    webcamEnabled: false,
    captureCursor: true,
    outputPath: 'C:\\Videos\\recording.mp4',
    ...overrides,
  };
}

function latestProcess() {
  return spawnMock.mock.results.at(-1)?.value as any;
}

async function startRecorder(recorder: RecorderService, overrides: Partial<RecorderOptions> = {}) {
  const startPromise = recorder.start(options(overrides));
  const process = latestProcess();
  process.stdout.emit('data', Buffer.from('{"event":"recording-started","schemaVersion":2}\n'));
  await startPromise;
  return process;
}

describe('RecorderService native protocol', () => {
  beforeEach(() => {
    spawnMock.mockClear();
    vi.spyOn(fs, 'existsSync').mockImplementation((candidate) => candidate === helperPath);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'statSync').mockReturnValue({ isFile: () => true, size: 1024 } as any);
    vi.spyOn(fs, 'rmSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes the renderer screen alias and passes native device mapping fields', async () => {
    const recorder = new RecorderService(helperPath);
    await startRecorder(recorder, {
      captureMic: true,
      microphoneDeviceId: 'browser-mic-id',
      microphoneDeviceName: 'USB Microphone',
      microphoneGain: 1.5,
      webcamEnabled: true,
      webcamDeviceId: 'browser-camera-id',
      webcamDeviceName: 'Virtual Camera',
      webcamDirectShowClsid: '{00000000-0000-0000-0000-000000000001}',
      webcamOutputPath: 'C:\\Videos\\recording-webcam.mp4',
    });

    const [, args] = spawnMock.mock.calls[0];
    const config = JSON.parse(args[0]);
    expect(config.sourceType).toBe('display');
    expect(config.microphoneDeviceName).toBe('USB Microphone');
    expect(config.microphoneGain).toBe(1.5);
    expect(config.webcamDeviceName).toBe('Virtual Camera');
    expect(config.webcamDirectShowClsid).toContain('00000001');
    expect(recorder.getState()).toMatchObject({
      isRecording: true,
      isPaused: false,
      outputPath: 'C:\\Videos\\recording.mp4',
    });
    expect(recorder.getState().sessionId).toEqual(expect.any(Number));
  });

  it('probes real native capabilities through the structured helper protocol', async () => {
    const recorder = new RecorderService(helperPath);
    const probePromise = recorder.probeCapabilities();
    const process = latestProcess();
    process.stdout.emit('data', Buffer.from(
      '{"event":"capabilities","schemaVersion":2,"wgcSupported":true,"systemAudio":true,"microphone":true,"webcam":true}\n',
    ));
    process.emit('close', 0, null);
    await expect(probePromise).resolves.toMatchObject({
      available: true,
      supported: true,
      nativeProbe: true,
      wgcSupported: true,
      systemAudio: true,
      microphone: true,
      webcam: true,
    });
  });

  it('changes pause state only after the native acknowledgement', async () => {
    const recorder = new RecorderService(helperPath);
    const process = await startRecorder(recorder);

    const pausePromise = recorder.pause();
    expect(recorder.getState().isPaused).toBe(false);
    expect(process.stdin.write).toHaveBeenCalledWith('pause\n', expect.any(Function));
    process.stdout.emit('data', Buffer.from('{"event":"recording-paused","schemaVersion":2}\n'));
    await pausePromise;
    expect(recorder.getState().isPaused).toBe(true);

    const resumePromise = recorder.resume();
    expect(recorder.getState().isPaused).toBe(true);
    process.stdout.emit('data', Buffer.from('{"event":"recording-resumed","schemaVersion":2}\n'));
    await resumePromise;
    expect(recorder.getState().isPaused).toBe(false);
  });

  it('requires a structured completion marker, matching path, non-empty file, and zero exit', async () => {
    const recorder = new RecorderService(helperPath);
    const process = await startRecorder(recorder);
    const stopPromise = recorder.stop();
    process.stdout.emit('data', Buffer.from(
      '{"event":"recording-stopped","schemaVersion":2,"screenPath":"C:\\\\Videos\\\\recording.mp4"}\n',
    ));
    process.emit('close', 0, null);
    await expect(stopPromise).resolves.toBe('C:\\Videos\\recording.mp4');
  });

  it('rejects a zero exit without the structured completion marker', async () => {
    const recorder = new RecorderService(helperPath);
    const process = await startRecorder(recorder);
    const stopPromise = recorder.stop();
    process.stdout.emit('data', Buffer.from('Recording stopped. Output path: C:\\Videos\\recording.mp4\n'));
    process.emit('close', 0, null);
    await expect(stopPromise).rejects.toThrow('without a valid completion marker');
  });

  it('rejects a completion marker when the native process exits nonzero', async () => {
    const recorder = new RecorderService(helperPath);
    const process = await startRecorder(recorder);
    const stopPromise = recorder.stop();
    process.stdout.emit('data', Buffer.from(
      '{"event":"recording-stopped","schemaVersion":2,"screenPath":"C:\\\\Videos\\\\recording.mp4"}\n',
    ));
    process.stderr.emit('data', Buffer.from('ERROR: finalize failed\n'));
    process.emit('close', 1, null);
    await expect(stopPromise).rejects.toThrow('code=1');
  });

  it('gracefully cancels and removes both partial assets after native acknowledgement', async () => {
    const recorder = new RecorderService(helperPath);
    const process = await startRecorder(recorder, {
      webcamEnabled: true,
      webcamOutputPath: 'C:\\Videos\\recording-webcam.mp4',
    });
    const cancelPromise = recorder.cancel();
    expect(process.stdin.write).toHaveBeenCalledWith('cancel\n', expect.any(Function));
    process.stdout.emit('data', Buffer.from('{"event":"recording-cancelled","schemaVersion":2}\n'));
    process.emit('close', 0, null);
    await cancelPromise;
    expect(fs.rmSync).toHaveBeenCalledWith('C:\\Videos\\recording.mp4', { force: true });
    expect(fs.rmSync).toHaveBeenCalledWith('C:\\Videos\\recording-webcam.mp4', { force: true });
  });

  it('emits a crash and clears state after an unexpected helper exit', async () => {
    const recorder = new RecorderService(helperPath);
    const crashListener = vi.fn();
    recorder.on('crash', crashListener);
    const process = await startRecorder(recorder);
    process.stderr.emit('data', Buffer.from('ERROR: device removed\n'));
    process.emit('close', 2, null);
    expect(crashListener).toHaveBeenCalledOnce();
    expect(crashListener.mock.calls[0][0].message).toContain('device removed');
    expect(recorder.getState()).toEqual({
      isRecording: false,
      isPaused: false,
      sessionId: null,
      outputPath: null,
    });
  });

  it.each([
    [{ outputPath: 'relative.mp4' }, 'absolute .mp4'],
    [{ outputPath: 'C:\\Videos\\recording.webm' }, 'absolute .mp4'],
    [{ fps: 0 }, 'fps must be'],
    [{ sourceType: 'window', sourceId: 'window:invalid' }, 'valid HWND'],
    [{ microphoneGain: 10 }, 'microphoneGain'],
  ] as Array<[Partial<RecorderOptions>, string]>)('rejects invalid options %#', async (override, message) => {
    const recorder = new RecorderService(helperPath);
    await expect(recorder.start(options(override))).rejects.toThrow(message);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
