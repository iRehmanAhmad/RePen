/**
 * useProjectManager — loads, saves, and manages the editor project lifecycle.
 *
 * Owns:
 *  - project data and projectPath
 *  - dirty / saveStatus tracking
 *  - crash-recovery snapshot reads/writes
 *  - undo/redo stacks (history + future)
 *  - recent-projects list
 *  - media-missing/webcam-missing flags
 *  - editor notice message
 *
 * Everything that previously lived in EditorApp and touched `project` directly.
 */

import { useState, useEffect, useCallback } from 'react';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';
import { readRecoverySnapshot, saveRecoverySnapshot, clearRecoverySnapshot } from '../../shared/editor/recoveryStore';
import { useAppBridge } from './useAppBridge';

const RECENT_PROJECTS_KEY = 'repen-recent-projects';

export interface ProjectManagerResult {
  project: EditorProjectData | null;
  projectPath: string | null;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  editorNotice: string | null;
  setEditorNotice: (msg: string | null) => void;
  mediaMissing: boolean;
  setMediaMissing: (v: boolean) => void;
  webcamMissing: boolean;
  setWebcamMissing: (v: boolean) => void;
  recentProjects: string[];
  canUndo: boolean;
  canRedo: boolean;
  loadProject: (path: string) => Promise<void>;
  updateProject: (next: EditorProjectData) => void;
  handleSave: () => Promise<boolean>;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCloseEditor: () => Promise<void>;
  handleRelinkMedia: () => Promise<void>;
  handleRevealMissingMedia: () => Promise<void>;
  handleRemoveMissingMedia: () => void;
}

export function useProjectManager(): ProjectManagerResult {
  const bridge = useAppBridge();

  const [project, setProject] = useState<EditorProjectData | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<EditorProjectData[]>([]);
  const [future, setFuture] = useState<EditorProjectData[]>([]);
  const [mediaMissing, setMediaMissing] = useState(false);
  const [webcamMissing, setWebcamMissing] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]'),
  );

  // ── Recent list ──────────────────────────────────────────────────────────
  const addToRecent = useCallback((path: string) => {
    setRecentProjects((prev) => {
      const updated = [path, ...prev.filter((p) => p !== path)].slice(0, 10);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadProject = useCallback(async (path: string) => {
    const res = await bridge.loadProjectFileFromPath(path);
    if (res.success && res.project) {
      let proj = res.project as EditorProjectData;
      const recovery = readRecoverySnapshot<EditorProjectData>(localStorage, res.path!);
      if (recovery && confirm('A recovered draft is available for this project. Restore it?')) {
        proj = recovery.project;
        setEditorNotice('Recovered unsaved editor changes. Save the project when you are ready.');
      }
      // Ensure editor sub-objects exist (backwards-compat)
      if (!proj.editor) (proj as any).editor = {};
      if (!proj.editor.zoomRegions) proj.editor.zoomRegions = [];
      if (!proj.editor.annotationRegions) proj.editor.annotationRegions = [];
      if (!proj.editor.trimRegions) proj.editor.trimRegions = [];
      if (!proj.editor.speedRegions) proj.editor.speedRegions = [];

      setProject(proj);
      setProjectPath(res.path!);
      setIsDirty(Boolean(recovery && proj === recovery.project));
      setHistory([]);
      setFuture([]);
      addToRecent(res.path!);
      setMediaMissing(false);
      setWebcamMissing(false);
      if ((proj as any).presentationTrackError) {
        setEditorNotice(`Presentation replay is unavailable: ${(proj as any).presentationTrackError}`);
      } else if (!recovery || proj !== recovery.project) {
        setEditorNotice(null);
      }
    } else {
      setEditorNotice(`Could not load this project: ${res.message || res.error || 'Unknown error'}`);
    }
  }, [bridge, addToRecent]);

  // ── Recovery auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || !project || !projectPath) return;
    const timer = window.setTimeout(() => {
      try {
        const snap = JSON.parse(JSON.stringify(project));
        delete snap.presentationTrack;
        saveRecoverySnapshot(localStorage, { projectPath, savedAtEpochMs: Date.now(), project: snap });
      } catch {
        setEditorNotice('Unable to create a local recovery draft. Save your project to protect recent changes.');
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [isDirty, project, projectPath]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!project || !projectPath) return false;
    setSaveStatus('saving');
    const res = await bridge.saveProjectFile(project, '', projectPath);
    if (res.success) {
      setIsDirty(false);
      clearRecoverySnapshot(localStorage, projectPath);
      setSaveStatus('saved');
      setEditorNotice(null);
      return true;
    }
    setSaveStatus('error');
    setEditorNotice(`Could not save project: ${res.error || res.message || 'Unknown error'}`);
    return false;
  }, [project, projectPath, bridge]);

  // ── Undo / Redo ──────────────────────────────────────────────────────────
  const updateProject = useCallback((next: EditorProjectData) => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(next))]);
    setFuture([]);
    setProject(next);
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  const handleUndo = useCallback(() => {
    setProject((current) => {
      if (!current || history.length === 0) return current;
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setFuture((f) => [JSON.parse(JSON.stringify(current)), ...f]);
      return prev;
    });
  }, [history]);

  const handleRedo = useCallback(() => {
    setProject((current) => {
      if (!current || future.length === 0) return current;
      const next = future[0];
      setFuture((f) => f.slice(1));
      setHistory((h) => [...h, JSON.parse(JSON.stringify(current))]);
      return next;
    });
  }, [future]);

  // ── Close ────────────────────────────────────────────────────────────────
  const handleCloseEditor = useCallback(async () => {
    if (isDirty) {
      const saveFirst = confirm('Save changes before closing the editor?');
      if (saveFirst) {
        if (!(await handleSave())) return;
      } else if (!confirm('Discard unsaved changes and close the editor?')) {
        return;
      }
    }
    await bridge.closeRecordingEditor();
  }, [isDirty, handleSave, bridge]);

  // ── Media management ─────────────────────────────────────────────────────
  const handleRelinkMedia = useCallback(async () => {
    if (!project) return;
    const result = await bridge.relinkProjectMedia(
      (project as any).media?.screenVideoPath || (project as any).videoPath || null,
    );
    if (result?.success && result.path) {
      const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
      (updated as any).media = { ...((updated as any).media || {}), screenVideoPath: result.path };
      updateProject(updated);
      setMediaMissing(false);
    } else if (!result?.canceled) {
      alert(`Unable to relink media: ${result?.error || 'Unknown error'}`);
    }
  }, [project, bridge, updateProject]);

  const handleRevealMissingMedia = useCallback(async () => {
    const mediaPath = (project as any)?.media?.screenVideoPath || (project as any)?.videoPath;
    if (!mediaPath) return;
    const result = await bridge.revealProjectMedia(mediaPath);
    if (!result?.success) alert(result?.error || 'Unable to reveal the media file.');
  }, [project, bridge]);

  const handleRemoveMissingMedia = useCallback(() => {
    if (!project || !confirm('Remove the missing recording reference from this project?')) return;
    const updated = JSON.parse(JSON.stringify(project)) as EditorProjectData;
    delete (updated as any).media;
    delete (updated as any).videoPath;
    updateProject(updated);
    setMediaMissing(true);
  }, [project, updateProject]);

  return {
    project,
    projectPath,
    isDirty,
    saveStatus,
    editorNotice,
    setEditorNotice,
    mediaMissing,
    setMediaMissing,
    webcamMissing,
    setWebcamMissing,
    recentProjects,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    loadProject,
    updateProject,
    handleSave,
    handleUndo,
    handleRedo,
    handleCloseEditor,
    handleRelinkMedia,
    handleRevealMissingMedia,
    handleRemoveMissingMedia,
  };
}
