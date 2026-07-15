import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';

export interface RecorderOptions {
  sourceId: string;
  sourceType: 'screen' | 'window';
  windowHandle?: string | null;
  displayId?: number;
  width: number;
  height: number;
  fps: number;
  captureSystemAudio: boolean;
  captureMic: boolean;
  microphoneDeviceId?: string | null;
  webcamEnabled: boolean;
  webcamDeviceId?: string | null;
  webcamWidth?: number;
  webcamHeight?: number;
  webcamFps?: number;
  captureCursor: boolean;
  outputPath: string;
  webcamOutputPath?: string | null;
}

export class RecorderService extends EventEmitter {
  private activeProcess: ChildProcessWithoutNullStreams | null = null;
  private isRecording = false;
  private isPaused = false;
  private outputLogs = '';
  private helperPath: string;

  constructor() {
    super();
    this.helperPath = path.join(__dirname, '../native/bin/win32-x64/wgc-capture.exe');
  }

  getHelperPath(): string {
    return this.helperPath;
  }

  isAvailable(): boolean {
    return fs.existsSync(this.helperPath);
  }

  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
    };
  }

  async start(options: RecorderOptions): Promise<void> {
    if (this.activeProcess) {
      throw new Error('Recording process is already running.');
    }
    if (!this.isAvailable()) {
      throw new Error(`Native Windows capture helper not found at: ${this.helperPath}`);
    }

    const config = {
      schemaVersion: 2,
      recordingId: Date.now(),
      outputPath: options.outputPath,
      sourceType: options.sourceType === 'screen' ? 'display' : options.sourceType,
      sourceId: options.sourceId,
      displayId: options.displayId ?? 0,
      windowHandle: options.windowHandle ?? null,
      fps: options.fps,
      videoWidth: options.width,
      videoHeight: options.height,
      captureSystemAudio: options.captureSystemAudio,
      captureMic: options.captureMic,
      microphoneDeviceId: options.microphoneDeviceId ?? null,
      microphoneGain: 1.0,
      webcamEnabled: options.webcamEnabled,
      webcamDeviceId: options.webcamDeviceId ?? null,
      webcamWidth: options.webcamWidth ?? 640,
      webcamHeight: options.webcamHeight ?? 480,
      webcamFps: options.webcamFps ?? 30,
      captureCursor: options.captureCursor,
      outputs: {
        screenPath: options.outputPath,
        webcamPath: options.webcamOutputPath ?? null,
      },
    };

    const recordingsDir = path.dirname(options.outputPath);
    fs.mkdirSync(recordingsDir, { recursive: true });

    this.outputLogs = '';
    this.isRecording = false;
    this.isPaused = false;

    console.log('[RecorderService] Spawning WGC capture helper...', { config });

    const proc = spawn(this.helperPath, [JSON.stringify(config)], {
      cwd: recordingsDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.activeProcess = proc;

    // Await capture startup output: "Recording started"
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        proc.kill();
        this.activeProcess = null;
        reject(new Error('Timeout waiting for native Windows capture helper to start'));
      }, 10000);

      const onOutput = (chunk: Buffer) => {
        this.outputLogs += chunk.toString();
        if (this.outputLogs.includes('Recording started')) {
          cleanup();
          this.isRecording = true;
          this.emit('start');
          resolve();
        }
      };

      const onError = (err: Error) => {
        cleanup();
        this.activeProcess = null;
        reject(err);
      };

      const onExit = (code: number | null) => {
        cleanup();
        this.activeProcess = null;
        reject(new Error(`Helper exited prematurely (code=${code}): ${this.outputLogs.trim()}`));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        proc.stdout.off('data', onOutput);
        proc.stderr.off('data', onOutput);
        proc.off('error', onError);
        proc.off('exit', onExit);
      };

      proc.stdout.on('data', onOutput);
      proc.stderr.on('data', onOutput);
      proc.once('error', onError);
      proc.once('exit', onExit);
    });

    this.setupActiveProcessListeners();
  }

  pause() {
    if (!this.activeProcess || !this.isRecording || this.isPaused) return;
    this.activeProcess.stdin.write('pause\n');
    this.isPaused = true;
    this.emit('pause');
  }

  resume() {
    if (!this.activeProcess || !this.isRecording || !this.isPaused) return;
    this.activeProcess.stdin.write('resume\n');
    this.isPaused = false;
    this.emit('resume');
  }

  async stop(): Promise<string> {
    const proc = this.activeProcess;
    if (!proc || !this.isRecording) {
      throw new Error('No active recording is running.');
    }

    this.isRecording = false;
    this.isPaused = false;
    this.activeProcess = null;

    proc.stdin.write('stop\n');

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        if (!proc.killed) {
          proc.kill();
        }
        reject(new Error('Timeout waiting for native Windows capture helper to stop.'));
      }, 10000);

      const onOutput = (chunk: Buffer) => {
        this.outputLogs += chunk.toString();
      };

      const onClose = (code: number | null) => {
        cleanup();
        const match = this.outputLogs.match(/Recording stopped\. Output path: (.+)/);
        if (match?.[1]) {
          resolve(match[1].trim());
          return;
        }
        resolve('');
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        proc.stdout.off('data', onOutput);
        proc.stderr.off('data', onOutput);
        proc.off('close', onClose);
        proc.off('error', onError);
      };

      proc.stdout.on('data', onOutput);
      proc.stderr.on('data', onOutput);
      proc.once('close', onClose);
      proc.once('error', onError);
    });
  }

  cancel() {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = null;
    }
    this.isRecording = false;
    this.isPaused = false;
    this.emit('cancel');
  }

  private setupActiveProcessListeners() {
    const proc = this.activeProcess;
    if (!proc) return;

    proc.on('close', (code) => {
      if (this.activeProcess === proc) {
        this.activeProcess = null;
        this.isRecording = false;
        this.isPaused = false;
        this.emit('exit', code);
      }
    });
  }
}
