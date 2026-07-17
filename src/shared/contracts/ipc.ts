/**
 * Typed IPC contract for all channels exposed through the appBridge preload.
 * Every channel, its request payload, and response shape are declared here.
 * The renderer uses AppBridge (hook) to call these without raw `window.appBridge` casts.
 */

// ---------------------------------------------------------------------------
// Primitive result wrapper
// ---------------------------------------------------------------------------

export interface IpcResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface CapabilityStatus {
  available: boolean;
  reason?: string;
}

export interface AppCapabilities {
  recorder: CapabilityStatus;
  selectedWindow: CapabilityStatus;
  systemAudio: CapabilityStatus;
  microphone: CapabilityStatus;
  webcam: CapabilityStatus;
  presentationReplay: CapabilityStatus;
  captions: CapabilityStatus;
  mp4Export: CapabilityStatus;
  gifExport: CapabilityStatus;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export interface BootstrapData {
  projectPath?: string | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Update Check
// ---------------------------------------------------------------------------

export interface UpdateCheckResult {
  success: boolean;
  updateAvailable?: boolean;
  version?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface SaveProjectResult {
  success: boolean;
  path?: string;
  error?: string;
  message?: string;
}

export interface LoadProjectResult {
  success: boolean;
  project?: unknown;
  path?: string;
  error?: string;
  message?: string;
}

export interface RelinkMediaResult {
  success: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
}

export interface RevealMediaResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface ExportProgressPayload {
  progress: number;
  outputPath?: string;
}

export interface ExportOptions {
  format: 'mp4' | 'gif';
  fps?: number;
  loop?: boolean;
  outputPath?: string;
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Transcription
// ---------------------------------------------------------------------------

export interface TranscriptionStatusResult {
  modelReady?: boolean;
  modelPath?: string;
  available?: boolean;
  [key: string]: unknown;
}

export interface DownloadProgressPayload {
  progress: number;
  task?: string;
  done?: boolean;
}

// ---------------------------------------------------------------------------
// All IPC channel names (for documentation / contract tests)
// ---------------------------------------------------------------------------

export type EditorIpcChannel =
  // App
  | 'bootstrap:get'
  | 'app:get-capabilities'
  | 'app:check-updates'
  | 'app:export-diagnostics'
  | 'app:open-external'
  // Project
  | 'project:save'
  | 'project:load'
  | 'project:load-from-path'
  | 'project:export'
  | 'project:export-cancel'
  | 'project:relink-media'
  | 'project:reveal-media'
  | 'project:get-current-path'
  // Recording (editor-facing)
  | 'recording:open-editor'
  | 'recording:close-editor'
  | 'recording:transcribe'
  | 'recording:get-transcription-status'
  | 'recording:download-model'
  | 'recording:cancel-transcription-download'
  // Events (listened from main)
  | 'editor:load-project'
  | 'project:export-progress'
  | 'transcription:download-progress';
