/**
 * useAppBridge — typed access to the Electron contextBridge API.
 *
 * Centralises all `window.appBridge` calls in one place so the rest of
 * the editor never needs to cast to `any` or guess whether a method exists.
 */

import { useCallback } from 'react';
import type {
  AppCapabilities,
  BootstrapData,
  DownloadProgressPayload,
  ExportOptions,
  ExportProgressPayload,
  LoadProjectResult,
  RelinkMediaResult,
  RevealMediaResult,
  SaveProjectResult,
  TranscriptionStatusResult,
  UpdateCheckResult,
} from '../../shared/contracts/ipc';

// ---------------------------------------------------------------------------
// Raw bridge shape (matches what preload.js exposes)
// ---------------------------------------------------------------------------

interface RawBridge {
  getBootstrap?: () => Promise<BootstrapData | null>;
  getAppCapabilities?: () => Promise<AppCapabilities | null>;
  checkUpdates?: () => Promise<UpdateCheckResult | null>;

  saveProjectFile?: (projectData: unknown, suggestedName: string, existingPath: string) => Promise<SaveProjectResult>;
  loadProjectFile?: (projectFolder: string) => Promise<LoadProjectResult>;
  loadProjectFileFromPath?: (filePath: string) => Promise<LoadProjectResult>;
  relinkProjectMedia?: (currentMediaPath: string | null) => Promise<RelinkMediaResult>;
  revealProjectMedia?: (mediaPath: string) => Promise<RevealMediaResult>;
  getCurrentProjectPath?: () => Promise<{ success: boolean; path?: string }>;

  exportProject?: (project: unknown, options: ExportOptions) => Promise<{ success: boolean; error?: string; path?: string }>;
  cancelExport?: (outputPath: string) => Promise<void>;
  onExportProgress?: (callback: (_: unknown, payload: ExportProgressPayload) => void) => () => void;

  closeRecordingEditor?: () => Promise<void>;
  onEditorLoadProject?: (callback: (path: string) => void) => () => void;

  transcribeRecording?: (filePath: string) => Promise<{ success: boolean; error?: string; segments?: any[] }>;
  getTranscriptionStatus?: () => Promise<TranscriptionStatusResult | null>;
  downloadTranscriptionModel?: () => Promise<{ success: boolean; error?: string }>;
  cancelTranscriptionDownload?: () => Promise<void>;
  onTranscriptionDownloadProgress?: (callback: (payload: DownloadProgressPayload) => void) => () => void;

  exportDiagnostics?: () => Promise<{ success: boolean; error?: string; path?: string }>;
  openExternal?: (url: string) => Promise<void>;
}

function getBridge(): RawBridge | null {
  return (window as unknown as { appBridge?: RawBridge }).appBridge ?? null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAppBridge() {
  // Bootstrap
  const getBootstrap = useCallback(async (): Promise<BootstrapData | null> => {
    return (await getBridge()?.getBootstrap?.()) ?? null;
  }, []);

  // Capabilities
  const getAppCapabilities = useCallback(async (): Promise<AppCapabilities | null> => {
    return (await getBridge()?.getAppCapabilities?.()) ?? null;
  }, []);

  // Updates
  const checkUpdates = useCallback(async (): Promise<UpdateCheckResult | null> => {
    return (await getBridge()?.checkUpdates?.()) ?? null;
  }, []);

  // Project — save/load
  const saveProjectFile = useCallback(
    async (projectData: unknown, suggestedName: string, existingPath: string): Promise<SaveProjectResult> => {
      const bridge = getBridge();
      if (!bridge?.saveProjectFile) return { success: false, error: 'Editor bridge unavailable.' };
      return bridge.saveProjectFile(projectData, suggestedName, existingPath);
    },
    [],
  );

  const loadProjectFileFromPath = useCallback(async (filePath: string): Promise<LoadProjectResult> => {
    const bridge = getBridge();
    if (!bridge?.loadProjectFileFromPath) return { success: false, error: 'Editor bridge unavailable.' };
    return bridge.loadProjectFileFromPath(filePath);
  }, []);

  // Project — media
  const relinkProjectMedia = useCallback(async (currentMediaPath: string | null): Promise<RelinkMediaResult> => {
    const bridge = getBridge();
    if (!bridge?.relinkProjectMedia) return { success: false, error: 'Editor bridge unavailable.' };
    return bridge.relinkProjectMedia(currentMediaPath);
  }, []);

  const revealProjectMedia = useCallback(async (mediaPath: string): Promise<RevealMediaResult> => {
    const bridge = getBridge();
    if (!bridge?.revealProjectMedia) return { success: false, error: 'Editor bridge unavailable.' };
    return bridge.revealProjectMedia(mediaPath);
  }, []);

  // Export
  const exportProject = useCallback(
    async (project: unknown, options: ExportOptions): Promise<{ success: boolean; error?: string; path?: string }> => {
      const bridge = getBridge();
      if (!bridge?.exportProject) return { success: false, error: 'Editor bridge unavailable.' };
      return bridge.exportProject(project, options);
    },
    [],
  );

  const cancelExport = useCallback(async (outputPath: string): Promise<void> => {
    await getBridge()?.cancelExport?.(outputPath);
  }, []);

  const onExportProgress = useCallback(
    (callback: (payload: ExportProgressPayload) => void): (() => void) => {
      const off = getBridge()?.onExportProgress?.((_: unknown, payload: ExportProgressPayload) => callback(payload));
      return off ?? (() => {});
    },
    [],
  );

  // Editor lifecycle
  const closeRecordingEditor = useCallback(async (): Promise<void> => {
    await getBridge()?.closeRecordingEditor?.();
  }, []);

  const onEditorLoadProject = useCallback(
    (callback: (path: string) => void): (() => void) => {
      const off = getBridge()?.onEditorLoadProject?.(callback);
      return off ?? (() => {});
    },
    [],
  );

  // Transcription
  const transcribeRecording = useCallback(
    async (filePath: string): Promise<{ success: boolean; error?: string; segments?: any[] }> => {
      const bridge = getBridge();
      if (!bridge?.transcribeRecording) return { success: false, error: 'Editor bridge unavailable.' };
      return bridge.transcribeRecording(filePath);
    },
    [],
  );

  const getTranscriptionStatus = useCallback(async (): Promise<TranscriptionStatusResult | null> => {
    return (await getBridge()?.getTranscriptionStatus?.()) ?? null;
  }, []);

  const downloadTranscriptionModel = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      const bridge = getBridge();
      if (!bridge?.downloadTranscriptionModel) return { success: false, error: 'Editor bridge unavailable.' };
      return bridge.downloadTranscriptionModel();
    },
    [],
  );

  const cancelTranscriptionDownload = useCallback(async (): Promise<void> => {
    await getBridge()?.cancelTranscriptionDownload?.();
  }, []);

  const onTranscriptionDownloadProgress = useCallback(
    (callback: (payload: DownloadProgressPayload) => void): (() => void) => {
      const off = getBridge()?.onTranscriptionDownloadProgress?.(callback);
      return off ?? (() => {});
    },
    [],
  );

  // Diagnostics
  const exportDiagnostics = useCallback(async (): Promise<{ success: boolean; error?: string; path?: string }> => {
    const bridge = getBridge();
    if (!bridge?.exportDiagnostics) return { success: false, error: 'Editor bridge unavailable.' };
    return bridge.exportDiagnostics();
  }, []);

  const openExternal = useCallback(async (url: string): Promise<void> => {
    await getBridge()?.openExternal?.(url);
  }, []);

  return {
    getBootstrap,
    getAppCapabilities,
    checkUpdates,
    saveProjectFile,
    loadProjectFileFromPath,
    relinkProjectMedia,
    revealProjectMedia,
    exportProject,
    cancelExport,
    onExportProgress,
    closeRecordingEditor,
    onEditorLoadProject,
    transcribeRecording,
    getTranscriptionStatus,
    downloadTranscriptionModel,
    cancelTranscriptionDownload,
    onTranscriptionDownloadProgress,
    exportDiagnostics,
    openExternal,
  };
}
