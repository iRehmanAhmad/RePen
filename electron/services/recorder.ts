import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';

export interface RecorderOptions {
  sourceId: string;
  sourceType: 'screen' | 'display' | 'window';
  windowHandle?: string | null;
  displayId?: number;
  width: number;
  height: number;
  fps: number;
  captureSystemAudio: boolean;
  captureMic: boolean;
  microphoneDeviceId?: string | null;
  microphoneDeviceName?: string | null;
  microphoneGain?: number;
  webcamEnabled: boolean;
  webcamDeviceId?: string | null;
  webcamDeviceName?: string | null;
  webcamDirectShowClsid?: string | null;
  webcamWidth?: number;
  webcamHeight?: number;
  webcamFps?: number;
  captureCursor: boolean;
  outputPath: string;
  webcamOutputPath?: string | null;
}

export interface RecorderCapabilities {
  available: boolean;
  supported: boolean;
  platform: NodeJS.Platform;
  architecture: string;
  helperPath: string;
  reason?: string;
  nativeProbe?: boolean;
  wgcSupported?: boolean;
  systemAudio?: boolean;
  microphone?: boolean;
  webcam?: boolean;
}

type NativeEvent = {
  event?: string;
  schemaVersion?: number;
  screenPath?: string;
  webcamPath?: string;
  message?: string;
};

type Waiter<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  settled: boolean;
  timer: NodeJS.Timeout;
  extendTimeout?: (ms: number) => void;
};

const MAX_LOG_BYTES = 1024 * 1024;
const START_TIMEOUT_MS = 15_000;
const CONTROL_TIMEOUT_MS = 5_000;
const STOP_TIMEOUT_MS = 30_000;
const STOP_HARD_TIMEOUT_MS = 10 * 60_000;

function createWaiter<T>(timeoutMs: number, timeoutMessage: string): Waiter<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error: Error) => void;
  const waiter: Waiter<T> = {
    promise: new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    }),
    resolve: (_value: T) => undefined,
    reject: (_error: Error) => undefined,
    settled: false,
    timer: null as unknown as NodeJS.Timeout,
  };

  let currentTimeoutMs = timeoutMs;

  waiter.resolve = (value: T) => {
    if (waiter.settled) return;
    waiter.settled = true;
    clearTimeout(waiter.timer);
    resolvePromise(value);
  };
  waiter.reject = (error: Error) => {
    if (waiter.settled) return;
    waiter.settled = true;
    clearTimeout(waiter.timer);
    rejectPromise(error);
  };
  waiter.extendTimeout = (extraMs: number) => {
    if (waiter.settled) return;
    clearTimeout(waiter.timer);
    currentTimeoutMs = extraMs;
    waiter.timer = setTimeout(() => waiter.reject(new Error(timeoutMessage)), extraMs);
  };
  waiter.timer = setTimeout(() => waiter.reject(new Error(timeoutMessage)), timeoutMs);
  return waiter;
}

function optionalString(value: string | null | undefined, label: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 4096 || value.includes('\0')) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function finiteInteger(value: number, label: string, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function booleanOption(value: boolean, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

export class RecorderService extends EventEmitter {
  private activeProcess: ChildProcessWithoutNullStreams | null = null;
  private isRecording = false;
  private isPaused = false;
  private outputLogs = '';
  private stdoutRemainder = '';
  private helperPath: string;
  private startWaiter: Waiter<void> | null = null;
  private stopWaiter: Waiter<string> | null = null;
  private cancelWaiter: Waiter<void> | null = null;
  private pauseWaiter: Waiter<void> | null = null;
  private resumeWaiter: Waiter<void> | null = null;
  private completionEvent: NativeEvent | null = null;
  private cancellationMarker = false;
  private expectedExit: 'stop' | 'cancel' | null = null;
  private currentSessionId: number | null = null;
  private currentOutputPath: string | null = null;
  private currentWebcamOutputPath: string | null = null;
  private currentSessionStartedAt: string | null = null;

  constructor(helperPath?: string) {
    super();
    this.helperPath = helperPath ?? this.resolveHelperPath();
  }

  redactLogs(text: string): string {
    return text.replace(/(?:[a-zA-Z]:\\Users\\)([^\\]+)/gi, 'C:\\Users\\<User>');
  }

  writeDiagnosticsLog(message: string) {
    let logDir = '.';
    if (this.currentOutputPath) {
      logDir = path.dirname(this.currentOutputPath);
    } else if (app && typeof app.getPath === 'function') {
      try {
        logDir = app.getPath('videos');
      } catch {
        logDir = '.';
      }
    }
    const logPath = path.join(logDir, 'recording-diagnostics.log');
    const timestamp = new Date().toISOString();
    const redactedMessage = this.redactLogs(message);
    try {
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(logPath, `[${timestamp}] ${redactedMessage}\n`);
    } catch (e) {
      try {
        const fallbackDir = path.join(process.env.TEMP || process.env.TMP || '.', 'repen-diagnostics');
        fs.mkdirSync(fallbackDir, { recursive: true });
        fs.appendFileSync(path.join(fallbackDir, 'recording-diagnostics.log'), `[${timestamp}] ${redactedMessage}\n`);
      } catch {
        // fail silently to keep test output clean
      }
    }
  }

  getManifestPath(): string | null {
    if (!this.currentOutputPath) return null;
    return this.currentOutputPath + '.session.json';
  }

  writeSessionManifest(status: 'recording' | 'finalizing' | 'interrupted') {
    const manifestPath = this.getManifestPath();
    if (!manifestPath) return;
    if (!this.currentSessionStartedAt) this.currentSessionStartedAt = new Date().toISOString();
    const manifest = {
      sessionId: this.currentSessionId,
      status,
      outputPath: this.currentOutputPath,
      webcamOutputPath: this.currentWebcamOutputPath,
      startTime: this.currentSessionStartedAt,
      updatedAt: new Date().toISOString(),
    };
    const temporaryPath = `${manifestPath}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(temporaryPath, JSON.stringify(manifest, null, 2), 'utf8');
      if (fs.existsSync(manifestPath)) {
        try { fs.unlinkSync(manifestPath); } catch {}
      }
      fs.renameSync(temporaryPath, manifestPath);
      this.writeDiagnosticsLog(`Session manifest written with status "${status}": ${manifestPath}`);
    } catch (e) {
      try { fs.unlinkSync(temporaryPath); } catch {}
      this.writeDiagnosticsLog(`Failed to write session manifest: ${String(e)}`);
    }
  }

  deleteSessionManifest() {
    const manifestPath = this.getManifestPath();
    if (!manifestPath) return;
    try {
      if (fs.existsSync(manifestPath)) {
        fs.unlinkSync(manifestPath);
        this.writeDiagnosticsLog(`Session manifest deleted: ${manifestPath}`);
      }
    } catch (e) {
      this.writeDiagnosticsLog(`Failed to delete session manifest: ${String(e)}`);
    }
  }

  private resolveHelperPath(): string {
    const architecture = process.arch === 'x64' ? 'win32-x64' : `win32-${process.arch}`;
    const candidates = [
      process.env.REPEN_WGC_HELPER_PATH,
      app?.isPackaged
        ? path.join(
          process.resourcesPath,
          'app.asar.unpacked',
          'dist-electron',
          'native',
          'bin',
          architecture,
          'wgc-capture.exe',
        )
        : null,
      app?.isPackaged
        ? path.join(process.resourcesPath, 'native', 'bin', architecture, 'wgc-capture.exe')
        : null,
      path.join(__dirname, '..', 'native', 'bin', architecture, 'wgc-capture.exe'),
      path.join(__dirname, '..', '..', 'third_party', 'openscreen', 'wgc-capture', 'build', 'wgc-capture.exe'),
    ].filter((candidate): candidate is string => Boolean(candidate));

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
  }

  getHelperPath(): string {
    return this.helperPath;
  }

  getCapabilities(): RecorderCapabilities {
    if (process.platform !== 'win32') {
      return {
        available: false,
        supported: false,
        platform: process.platform,
        architecture: process.arch,
        helperPath: this.helperPath,
        reason: 'Native Windows recording is only supported on Windows.',
      };
    }
    if (process.arch !== 'x64') {
      return {
        available: false,
        supported: false,
        platform: process.platform,
        architecture: process.arch,
        helperPath: this.helperPath,
        reason: `No native recorder binary is available for ${process.arch}.`,
      };
    }
    const available = fs.existsSync(this.helperPath);
    return {
      available,
      supported: true,
      platform: process.platform,
      architecture: process.arch,
      helperPath: this.helperPath,
      ...(available ? {} : { reason: `Native Windows capture helper not found at: ${this.helperPath}` }),
    };
  }

  async probeCapabilities(): Promise<RecorderCapabilities> {
    const base = this.getCapabilities();
    if (!base.supported || !base.available) return base;

    return new Promise<RecorderCapabilities>((resolve) => {
      const proc = spawn(this.helperPath, ['--probe'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        if (!proc.killed) proc.kill();
        resolve({
          ...base,
          supported: false,
          nativeProbe: false,
          reason: 'Native recorder capability probe timed out.',
        });
      }, CONTROL_TIMEOUT_MS);

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout = (stdout + chunk.toString()).slice(-64 * 1024);
      });
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-64 * 1024);
      });
      proc.once('error', (error) => {
        clearTimeout(timer);
        resolve({ ...base, supported: false, nativeProbe: false, reason: error.message });
      });
      proc.once('close', (code) => {
        clearTimeout(timer);
        const event = stdout
          .split(/\r?\n/)
          .map((line) => {
            try {
              return JSON.parse(line) as NativeEvent & Record<string, unknown>;
            } catch {
              return null;
            }
          })
          .find((candidate) => candidate?.event === 'capabilities' && candidate.schemaVersion === 2);
        const wgcSupported = event?.wgcSupported === true;
        resolve({
          ...base,
          supported: code === 0 && wgcSupported,
          nativeProbe: Boolean(event),
          wgcSupported,
          systemAudio: event?.systemAudio === true,
          microphone: event?.microphone === true,
          webcam: event?.webcam === true,
          ...((code === 0 && wgcSupported)
            ? {}
            : { reason: stderr.trim() || 'Windows Graphics Capture is not supported on this system.' }),
        });
      });
    });
  }

  isAvailable(): boolean {
    const capabilities = this.getCapabilities();
    return capabilities.supported && capabilities.available;
  }

  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      sessionId: this.currentSessionId,
      outputPath: this.currentOutputPath,
    };
  }

  private validateOptions(options: RecorderOptions) {
    if (!options || typeof options !== 'object') {
      throw new Error('Recording options are required.');
    }
    if (typeof options.sourceId !== 'string' || options.sourceId.length === 0 || options.sourceId.length > 4096) {
      throw new Error('sourceId is invalid.');
    }
    const sourceType = options.sourceType === 'screen' ? 'display' : options.sourceType;
    if (sourceType !== 'display' && sourceType !== 'window') {
      throw new Error('sourceType must be display, screen, or window.');
    }
    const windowHandle = optionalString(options.windowHandle, 'windowHandle');
    if (sourceType === 'window') {
      const sourceHandle = options.sourceId.match(/^window:([^:]+)/)?.[1] ?? null;
      const candidate = windowHandle ?? sourceHandle;
      if (!candidate || !/^(?:0[xX][0-9a-fA-F]+|[1-9][0-9]*)$/.test(candidate)) {
        throw new Error('Window recording requires a valid HWND.');
      }
    }

    const outputPath = options.outputPath;
    if (typeof outputPath !== 'string' || !path.isAbsolute(outputPath) || path.extname(outputPath).toLowerCase() !== '.mp4') {
      throw new Error('outputPath must be an absolute .mp4 path.');
    }
    if (outputPath.length > 30_000 || outputPath.includes('\0')) {
      throw new Error('outputPath is invalid.');
    }
    if (fs.existsSync(outputPath)) {
      throw new Error('outputPath already exists; refusing to overwrite it.');
    }
    const webcamOutputPath = optionalString(options.webcamOutputPath, 'webcamOutputPath');
    if (webcamOutputPath) {
      if (!path.isAbsolute(webcamOutputPath) || path.extname(webcamOutputPath).toLowerCase() !== '.mp4') {
        throw new Error('webcamOutputPath must be an absolute .mp4 path.');
      }
      if (path.resolve(webcamOutputPath).toLowerCase() === path.resolve(outputPath).toLowerCase()) {
        throw new Error('webcamOutputPath must differ from outputPath.');
      }
      if (fs.existsSync(webcamOutputPath)) {
        throw new Error('webcamOutputPath already exists; refusing to overwrite it.');
      }
    }

    const microphoneGain = options.microphoneGain ?? 1.0;
    if (!Number.isFinite(microphoneGain) || microphoneGain < 0 || microphoneGain > 4) {
      throw new Error('microphoneGain must be between 0 and 4.');
    }

    return {
      sourceType,
      windowHandle,
      displayId: finiteInteger(options.displayId ?? 0, 'displayId', -9_007_199_254_740_991, 9_007_199_254_740_991),
      fps: finiteInteger(options.fps, 'fps', 1, 120),
      width: finiteInteger(options.width, 'width', 2, 16_384),
      height: finiteInteger(options.height, 'height', 2, 16_384),
      webcamWidth: finiteInteger(options.webcamWidth ?? 640, 'webcamWidth', 2, 7680),
      webcamHeight: finiteInteger(options.webcamHeight ?? 480, 'webcamHeight', 2, 4320),
      webcamFps: finiteInteger(options.webcamFps ?? 30, 'webcamFps', 1, 120),
      outputPath: path.resolve(outputPath),
      webcamOutputPath: webcamOutputPath ? path.resolve(webcamOutputPath) : null,
      microphoneGain,
      microphoneDeviceId: optionalString(options.microphoneDeviceId, 'microphoneDeviceId'),
      microphoneDeviceName: optionalString(options.microphoneDeviceName, 'microphoneDeviceName'),
      webcamDeviceId: optionalString(options.webcamDeviceId, 'webcamDeviceId'),
      webcamDeviceName: optionalString(options.webcamDeviceName, 'webcamDeviceName'),
      webcamDirectShowClsid: optionalString(options.webcamDirectShowClsid, 'webcamDirectShowClsid'),
      captureSystemAudio: booleanOption(options.captureSystemAudio, 'captureSystemAudio'),
      captureMic: booleanOption(options.captureMic, 'captureMic'),
      webcamEnabled: booleanOption(options.webcamEnabled, 'webcamEnabled'),
      captureCursor: booleanOption(options.captureCursor, 'captureCursor'),
    };
  }

  async start(options: RecorderOptions): Promise<void> {
    if (this.activeProcess) {
      throw new Error('Recording process is already running.');
    }
    const capabilities = this.getCapabilities();
    if (!capabilities.supported || !capabilities.available) {
      throw new Error(capabilities.reason ?? 'Native Windows capture helper is unavailable.');
    }

    const validated = this.validateOptions(options);
    const recordingId = Date.now();
    const config = {
      schemaVersion: 2,
      recordingId,
      outputPath: validated.outputPath,
      sourceType: validated.sourceType,
      sourceId: options.sourceId,
      displayId: validated.displayId,
      windowHandle: validated.windowHandle,
      fps: validated.fps,
      videoWidth: validated.width,
      videoHeight: validated.height,
      captureSystemAudio: validated.captureSystemAudio,
      captureMic: validated.captureMic,
      microphoneDeviceId: validated.microphoneDeviceId,
      microphoneDeviceName: validated.microphoneDeviceName,
      microphoneGain: validated.microphoneGain,
      webcamEnabled: validated.webcamEnabled,
      webcamDeviceId: validated.webcamDeviceId,
      webcamDeviceName: validated.webcamDeviceName,
      webcamDirectShowClsid: validated.webcamDirectShowClsid,
      webcamWidth: validated.webcamWidth,
      webcamHeight: validated.webcamHeight,
      webcamFps: validated.webcamFps,
      captureCursor: validated.captureCursor,
      outputs: {
        screenPath: validated.outputPath,
        webcamPath: validated.webcamOutputPath,
      },
    };

    fs.mkdirSync(path.dirname(validated.outputPath), { recursive: true });
    if (validated.webcamOutputPath) {
      fs.mkdirSync(path.dirname(validated.webcamOutputPath), { recursive: true });
    }

    this.resetProtocolState();
    this.currentSessionId = recordingId;
    this.currentSessionStartedAt = new Date().toISOString();
    this.currentOutputPath = validated.outputPath;
    this.currentWebcamOutputPath = validated.webcamOutputPath;

    const proc = spawn(this.helperPath, [JSON.stringify(config)], {
      cwd: path.dirname(validated.outputPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.activeProcess = proc;
    this.attachProcessListeners(proc);
    this.startWaiter = createWaiter<void>(START_TIMEOUT_MS, 'Timeout waiting for native recorder start acknowledgement.');

    try {
      await this.startWaiter.promise;
      this.writeDiagnosticsLog(`Recording started successfully. Session ID: ${recordingId}`);
      this.writeSessionManifest('recording');
    } catch (error) {
      if (!proc.killed) proc.kill();
      this.cleanupPartialFiles();
      this.clearCurrentSession();
      this.writeDiagnosticsLog(`Recording failed to start: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.startWaiter = null;
    }
  }

  async pause(): Promise<void> {
    if (!this.activeProcess || !this.isRecording) {
      throw new Error('No active recording is running.');
    }
    if (this.isPaused) return;
    if (this.pauseWaiter) return this.pauseWaiter.promise;
    this.pauseWaiter = createWaiter<void>(CONTROL_TIMEOUT_MS, 'Timeout waiting for native pause acknowledgement.');
    this.writeCommand('pause', this.pauseWaiter);
    try {
      await this.pauseWaiter.promise;
    } finally {
      this.pauseWaiter = null;
    }
  }

  async resume(): Promise<void> {
    if (!this.activeProcess || !this.isRecording) {
      throw new Error('No active recording is running.');
    }
    if (!this.isPaused) return;
    if (this.resumeWaiter) return this.resumeWaiter.promise;
    this.resumeWaiter = createWaiter<void>(CONTROL_TIMEOUT_MS, 'Timeout waiting for native resume acknowledgement.');
    this.writeCommand('resume', this.resumeWaiter);
    try {
      await this.resumeWaiter.promise;
    } finally {
      this.resumeWaiter = null;
    }
  }

  async stop(): Promise<string> {
    if (!this.activeProcess || !this.isRecording) {
      throw new Error('No active recording is running.');
    }
    if (this.stopWaiter) return this.stopWaiter.promise;
    this.expectedExit = 'stop';
    this.writeSessionManifest('finalizing');
    this.writeDiagnosticsLog('Stopping recording, waiting for finalization...');
    this.stopWaiter = createWaiter<string>(STOP_TIMEOUT_MS, 'Timeout waiting for native recorder to finalize.');
    this.writeCommand('stop', this.stopWaiter);

    let lastSize = 0;
    const finalizationStartedAt = Date.now();
    const pollInterval = setInterval(() => {
      if (!this.currentOutputPath) {
        clearInterval(pollInterval);
        return;
      }
      try {
        if (fs.existsSync(this.currentOutputPath)) {
          const stats = fs.statSync(this.currentOutputPath);
          const currentSize = stats.size;
          if (currentSize > lastSize && lastSize > 0) {
            const hardDeadlineRemaining = STOP_HARD_TIMEOUT_MS - (Date.now() - finalizationStartedAt);
            if (hardDeadlineRemaining > 0 && this.stopWaiter) {
              const inactivityTimeout = Math.min(STOP_TIMEOUT_MS, hardDeadlineRemaining);
              this.stopWaiter.extendTimeout?.(inactivityTimeout);
              this.writeDiagnosticsLog(`Recording file size increased from ${lastSize} to ${currentSize} bytes. Resetting finalization inactivity timeout to ${inactivityTimeout}ms.`);
            }
          }
          lastSize = currentSize;
        }
      } catch (e) {
        // ignore errors during size checks
      }
    }, 2000);

    try {
      const outputPath = await this.stopWaiter.promise;
      clearInterval(pollInterval);
      this.writeDiagnosticsLog(`Recording stopped cleanly. Output path: ${outputPath}`);
      this.clearCurrentSession();
      return outputPath;
    } catch (error) {
      clearInterval(pollInterval);
      this.writeDiagnosticsLog(`Recording stop failed: ${error instanceof Error ? error.message : String(error)}`);
      if (this.activeProcess && !this.activeProcess.killed) this.activeProcess.kill();
      // Preserve partial media for recovery by NOT calling cleanupPartialFiles
      this.writeSessionManifest('interrupted');
      this.clearCurrentSession();
      throw error;
    } finally {
      this.stopWaiter = null;
    }
  }

  async cancel(): Promise<void> {
    this.writeDiagnosticsLog('Cancelling/discarding recording session...');
    this.deleteSessionManifest();
    if (!this.activeProcess) {
      this.cleanupPartialFiles();
      this.clearCurrentSession();
      return;
    }
    if (this.cancelWaiter) return this.cancelWaiter.promise;
    this.expectedExit = 'cancel';
    this.cancelWaiter = createWaiter<void>(STOP_TIMEOUT_MS, 'Timeout waiting for native recorder cancellation.');
    this.writeCommand('cancel', this.cancelWaiter);
    try {
      await this.cancelWaiter.promise;
      this.cleanupPartialFiles();
      this.clearCurrentSession();
      this.writeDiagnosticsLog('Recording session cancelled and partial files deleted.');
    } catch (error) {
      this.writeDiagnosticsLog(`Recording cancellation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (this.activeProcess && !this.activeProcess.killed) this.activeProcess.kill();
      this.cleanupPartialFiles();
      this.clearCurrentSession();
      throw error;
    } finally {
      this.cancelWaiter = null;
    }
  }

  private resetProtocolState() {
    this.outputLogs = '';
    this.stdoutRemainder = '';
    this.isRecording = false;
    this.isPaused = false;
    this.completionEvent = null;
    this.cancellationMarker = false;
    this.expectedExit = null;
  }

  private writeCommand<T>(command: string, waiter: Waiter<T>) {
    const proc = this.activeProcess;
    if (!proc || proc.stdin.destroyed || !proc.stdin.writable) {
      waiter.reject(new Error(`Cannot send ${command}: native recorder stdin is unavailable.`));
      return;
    }
    proc.stdin.write(`${command}\n`, (error) => {
      if (error) waiter.reject(new Error(`Failed to send ${command} command: ${error.message}`));
    });
  }

  private attachProcessListeners(proc: ChildProcessWithoutNullStreams) {
    proc.stdout.on('data', (chunk: Buffer) => this.consumeStdout(chunk));
    proc.stderr.on('data', (chunk: Buffer) => this.appendLog(chunk.toString()));
    proc.once('error', (error) => this.handleProcessError(proc, error));
    proc.once('close', (code, signal) => this.handleProcessClose(proc, code, signal));
  }

  private consumeStdout(chunk: Buffer) {
    const text = chunk.toString();
    this.appendLog(text);
    this.stdoutRemainder += text;
    const lines = this.stdoutRemainder.split(/\r?\n/);
    this.stdoutRemainder = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{')) continue;
      try {
        this.handleNativeEvent(JSON.parse(trimmed) as NativeEvent);
      } catch {
        this.appendLog(`Invalid native protocol line: ${trimmed}\n`);
      }
    }
  }

  private handleNativeEvent(event: NativeEvent) {
    if (event.schemaVersion !== 2 || typeof event.event !== 'string') return;
    switch (event.event) {
      case 'recording-started':
        this.isRecording = true;
        this.isPaused = false;
        this.startWaiter?.resolve(undefined);
        this.emit('start');
        break;
      case 'recording-paused':
        this.isPaused = true;
        this.pauseWaiter?.resolve(undefined);
        this.emit('pause');
        break;
      case 'recording-resumed':
        this.isPaused = false;
        this.resumeWaiter?.resolve(undefined);
        this.emit('resume');
        break;
      case 'recording-stopped':
        this.completionEvent = event;
        break;
      case 'recording-cancelled':
        this.cancellationMarker = true;
        break;
      case 'error':
        this.appendLog(`Native recorder error: ${event.message ?? 'unknown error'}\n`);
        break;
    }
  }

  private handleProcessError(proc: ChildProcessWithoutNullStreams, error: Error) {
    if (this.activeProcess !== proc) return;
    this.rejectPending(error);
  }

  private handleProcessClose(
    proc: ChildProcessWithoutNullStreams,
    code: number | null,
    signal: NodeJS.Signals | null,
  ) {
    if (this.activeProcess !== proc) return;
    this.activeProcess = null;
    const wasRecording = this.isRecording;
    this.isRecording = false;
    this.isPaused = false;

    if (this.startWaiter && !this.startWaiter.settled) {
      this.startWaiter.reject(this.processExitError('before start acknowledgement', code, signal));
    }
    this.pauseWaiter?.reject(this.processExitError('while pausing', code, signal));
    this.resumeWaiter?.reject(this.processExitError('while resuming', code, signal));

    if (this.expectedExit === 'stop' && this.stopWaiter) {
      if (code !== 0) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(this.processExitError('while finalizing', code, signal));
      } else if (!this.completionEvent?.screenPath) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(new Error(`Native recorder exited without a valid completion marker.${this.logSuffix()}`));
      } else if (!this.samePath(this.completionEvent.screenPath, this.currentOutputPath)) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(new Error('Native recorder completion path did not match the requested output path.'));
      } else if (this.currentWebcamOutputPath &&
        !this.samePath(this.completionEvent.webcamPath, this.currentWebcamOutputPath)) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(new Error('Native recorder webcam completion path did not match the requested output path.'));
      } else if (!this.isNonEmptyFile(this.currentOutputPath)) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(new Error('Native recorder reported success but the output file is missing or empty.'));
      } else if (this.currentWebcamOutputPath && !this.isNonEmptyFile(this.currentWebcamOutputPath)) {
        this.writeSessionManifest('interrupted');
        this.stopWaiter.reject(new Error('Native recorder reported success but the webcam output is missing or empty.'));
      } else {
        this.deleteSessionManifest();
        this.stopWaiter.resolve(this.currentOutputPath as string);
        this.emit('stop', this.currentOutputPath);
      }
    } else if (this.expectedExit === 'cancel' && this.cancelWaiter) {
      this.cleanupPartialFiles();
      if (code !== 0) {
        this.cancelWaiter.reject(this.processExitError('while cancelling', code, signal));
      } else if (!this.cancellationMarker) {
        this.cancelWaiter.reject(new Error('Native recorder exited without a cancellation marker.'));
      } else {
        this.cancelWaiter.resolve(undefined);
        this.emit('cancel');
      }
    } else if (wasRecording) {
      this.writeSessionManifest('interrupted');
      const error = this.processExitError('unexpectedly', code, signal);
      // Preserve partial media by NOT calling cleanupPartialFiles()
      this.clearCurrentSession();
      this.emit('crash', error);
      this.emit('exit', code);
    }

    this.expectedExit = null;
  }

  private rejectPending(error: Error) {
    this.startWaiter?.reject(error);
    this.stopWaiter?.reject(error);
    this.cancelWaiter?.reject(error);
    this.pauseWaiter?.reject(error);
    this.resumeWaiter?.reject(error);
  }

  private processExitError(context: string, code: number | null, signal: NodeJS.Signals | null) {
    return new Error(`Native recorder exited ${context} (code=${code}, signal=${signal ?? 'none'}).${this.logSuffix()}`);
  }

  private appendLog(text: string) {
    this.outputLogs = (this.outputLogs + text).slice(-MAX_LOG_BYTES);
  }

  private logSuffix() {
    const trimmed = this.outputLogs.trim();
    return trimmed ? ` Native output: ${trimmed}` : '';
  }

  private samePath(left: string | null | undefined, right: string | null | undefined) {
    if (!left || !right) return false;
    return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
  }

  private isNonEmptyFile(filePath: string | null) {
    if (!filePath) return false;
    try {
      const stat = fs.statSync(filePath);
      return stat.isFile() && stat.size > 0;
    } catch {
      return false;
    }
  }

  private cleanupPartialFiles() {
    for (const filePath of [this.currentOutputPath, this.currentWebcamOutputPath]) {
      if (!filePath) continue;
      try {
        fs.rmSync(filePath, { force: true });
      } catch (error) {
        this.appendLog(`Failed to remove partial recording ${filePath}: ${String(error)}\n`);
      }
    }
  }

  private clearCurrentSession() {
    this.currentSessionId = null;
    this.currentOutputPath = null;
    this.currentWebcamOutputPath = null;
    this.currentSessionStartedAt = null;
  }
}
