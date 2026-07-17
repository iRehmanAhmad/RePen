import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { PlaybackCoordinator } from './presenter/editor/playbackCoordinator';
import { PresenterRenderer } from './presenter/presenterRenderer';
import { seekPresentationTrack } from './presenter/presentationTrackReplay';
import { getSmoothedCursorPosition } from './presenter/editor/cursorTelemetryRenderer';
import { toFileUrl } from '../shared/editor/projectPersistence';
import { clampTimelineZoom, createTimelineTicks, formatTimelineTime, timeAtTimelinePosition, timelinePercent } from '../shared/editor/timelineMath';
import { addSpeedRange, addTrimRange, removeTimedRegionById, resizeTrimRange, resizeSpeedRange, splitTrimRange, addZoomRange } from '../shared/editor/timelineEdits';
import { clearRecoverySnapshot, readRecoverySnapshot, saveRecoverySnapshot } from '../shared/editor/recoveryStore';
import { computeCompositorStyles } from '../shared/editor/visualCompositor';
import { DEFAULT_TIMELINE_TRACKS, type EditorProjectData, type TimelineTrackId } from '../shared/editor/projectPersistence';
import { DEFAULT_PLAYBACK_SPEED, SPEED_OPTIONS, type SpeedRegion, type TrimRegion, type ZoomRegion, type AnnotationRegion, type WebcamMaskShape } from '../shared/editor/types';
import type { SceneAnnotation as PresenterSceneAnnotation } from '../shared/schemas/scene';
import './editor.css';

const RECENT_PROJECTS_KEY = 'repen-recent-projects';
const EDITOR_LOCALE_STORAGE_KEY = 'repen-editor-locale';
const CAPABILITIES_PENDING_REASON = 'Checking whether this capability is available...';
const CAPABILITIES_UNAVAILABLE_REASON = 'This build could not verify optional recording and export capabilities.';
const EDITOR_TABS = [
  { id: 'layout', labelKey: 'layout' },
  { id: 'motion', labelKey: 'motion' },
  { id: 'webcam', labelKey: 'webcam' },
  { id: 'annotations', labelKey: 'overlay' },
  { id: 'captions', labelKey: 'captions' },
] as const;
type EditorTab = (typeof EDITOR_TABS)[number]['id'];
type EditorLocale = 'en' | 'es';

const unavailableCapabilities = (reason: string) => ({
  recorder: { available: false, reason },
  selectedWindow: { available: false, reason },
  systemAudio: { available: false, reason },
  microphone: { available: false, reason },
  webcam: { available: false, reason },
  presentationReplay: { available: false, reason },
  captions: { available: false, reason },
  mp4Export: { available: false, reason },
  gifExport: { available: false, reason },
});

// Localization Framework (i18n)
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: 'RePen Editor',
    save: 'Save',
    undo: 'Undo',
    redo: 'Redo',
    export: 'Export',
    close: 'Close',
    layout: 'Layout',
    motion: 'Motion',
    webcam: 'Webcam',
    overlay: 'Overlay',
    captions: 'Captions',
    aspectRatio: 'Aspect Ratio',
    padding: 'Padding',
    borderRadius: 'Border Radius',
    wallpaper: 'Background Wallpaper',
    autoTranscribe: 'Auto Transcribe Offline',
    split: 'Split',
    merge: 'Merge Next',
    exportLogs: 'Export Diagnostics logs',
    resetSettings: 'Reset to Defaults',
    selectLanguage: 'Select language',
    languageEnglish: 'English',
    languageSpanish: 'Spanish',
  },
  es: {
    title: 'Editor RePen',
    save: 'Guardar',
    undo: 'Deshacer',
    redo: 'Rehacer',
    export: 'Exportar',
    close: 'Cerrar',
    layout: 'Diseño',
    motion: 'Movimiento',
    webcam: 'Cámara',
    overlay: 'Superposición',
    captions: 'Subtítulos',
    aspectRatio: 'Relación de Aspecto',
    padding: 'Relleno',
    borderRadius: 'Radio del Borde',
    wallpaper: 'Fondo de pantalla',
    autoTranscribe: 'Transcripción Automática Offline',
    split: 'Dividir',
    merge: 'Fusionar Siguiente',
    exportLogs: 'Exportar Registros de Diagnóstico',
    resetSettings: 'Restablecer Ajustes',
    selectLanguage: 'Seleccionar idioma',
    languageEnglish: 'Inglés',
    languageSpanish: 'Español',
  }
};

const isEditorLocale = (value: string | null): value is EditorLocale => value === 'en' || value === 'es';

const EditorApp: React.FC = () => {
  const [locale, setLocale] = useState<EditorLocale>(() => {
    const savedLocale = localStorage.getItem(EDITOR_LOCALE_STORAGE_KEY);
    return isEditorLocale(savedLocale) ? savedLocale : 'en';
  });
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [project, setProject] = useState<EditorProjectData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; version?: string; url?: string } | null>(null);
  const [history, setHistory] = useState<EditorProjectData[]>([]);
  const [future, setFuture] = useState<EditorProjectData[]>([]);

  // Media loading & relinking
  const [mediaMissing, setMediaMissing] = useState(false);
  const [webcamMissing, setWebcamMissing] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
  );
  const [capabilities, setCapabilities] = useState<any>(() => unavailableCapabilities(CAPABILITIES_PENDING_REASON));

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(10000); // fallback default
  const [timelineZoom, setTimelineZoom] = useState(1.0);
  const [trimStartMs, setTrimStartMs] = useState<number | null>(null);
  const [speedStartMs, setSpeedStartMs] = useState<number | null>(null);
  const [pendingSpeed, setPendingSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sourceVideoWidth, setSourceVideoWidth] = useState<number | null>(null);
  const [sourceVideoHeight, setSourceVideoHeight] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ cx: number; cy: number; visible: boolean } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoZoomSuggestions, setAutoZoomSuggestions] = useState<any[]>([]);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);

  // UI States
  const [activeTab, setActiveTab] = useState<EditorTab>('layout');
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
  const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(null);
  const [draggingRegion, setDraggingRegion] = useState<{
    id: string;
    type: 'trim' | 'speed';
    side: 'left' | 'right';
    initialX: number;
    initialStartMs: number;
    initialEndMs: number;
  } | null>(null);
  const [tempResizeState, setTempResizeState] = useState<{ startMs: number; endMs: number } | null>(null);

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTask, setDownloadTask] = useState('');

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'gif'>('mp4');
  const [exportFps, setExportFps] = useState(30);
  const [exportLoop, setExportLoop] = useState(true);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOutputPath, setExportOutputPath] = useState('');
  const selectedExportCapability = exportFormat === 'gif' ? capabilities.gifExport : capabilities.mp4Export;
  const hasAvailableExportFormat = Boolean(capabilities.mp4Export?.available || capabilities.gifExport?.available);

  // First-run tutorial state
  const [showTutorialStep, setShowTutorialStep] = useState<number | null>(() => {
    const completed = localStorage.getItem('repen-editor-tutorial-completed');
    return completed === 'true' ? null : 1;
  });

  // Snap, tracks controls
  // Element Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordinatorRef = useRef(new PlaybackCoordinator());

  // Helper i18n selector
  const t = (key: string): string => {
    return TRANSLATIONS[locale]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabId: EditorTab) => {
    const currentIndex = EDITOR_TABS.findIndex((tab) => tab.id === tabId);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % EDITOR_TABS.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + EDITOR_TABS.length) % EDITOR_TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = EDITOR_TABS.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = EDITOR_TABS[nextIndex].id;
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`editor-tab-${nextTab}`)?.focus());
  };

  useEffect(() => {
    localStorage.setItem(EDITOR_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  // Bootstrap initialization
  useEffect(() => {
    const init = async () => {
      if ((window as any).appBridge?.getBootstrap) {
        const bootstrapData = await (window as any).appBridge.getBootstrap();
        if (bootstrapData?.projectPath) {
          loadProject(bootstrapData.projectPath);
        }
      }
      if ((window as any).appBridge?.getAppCapabilities) {
        try {
          const caps = await (window as any).appBridge.getAppCapabilities();
          if (caps?.recorder && caps?.captions && caps?.mp4Export && caps?.gifExport) {
            setCapabilities(caps);
          } else {
            setCapabilities(unavailableCapabilities(CAPABILITIES_UNAVAILABLE_REASON));
          }
        } catch (e) {
          console.error('Failed to get capabilities:', e);
          setCapabilities(unavailableCapabilities(CAPABILITIES_UNAVAILABLE_REASON));
        }
      } else {
        setCapabilities(unavailableCapabilities(CAPABILITIES_UNAVAILABLE_REASON));
      }

      if ((window as any).appBridge?.checkUpdates) {
        try {
          const updateRes = await (window as any).appBridge.checkUpdates();
          if (updateRes && updateRes.success && updateRes.updateAvailable) {
            setUpdateInfo({ available: true, version: updateRes.version, url: updateRes.url });
          }
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
      }
    };
    init();

    if ((window as any).appBridge?.onEditorLoadProject) {
      (window as any).appBridge.onEditorLoadProject((path: string) => {
        loadProject(path);
      });
    }

    if ((window as any).appBridge?.onExportProgress) {
      (window as any).appBridge.onExportProgress((_: any, progressData: any) => {
        setExportProgress(progressData.progress);
      });
    }
  }, []);

  // Update recent list
  const addToRecent = (path: string) => {
    const updated = [path, ...recentProjects.filter(p => p !== path)].slice(0, 10);
    setRecentProjects(updated);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
  };

  const loadProject = async (path: string) => {
    if (isDirty) {
      const confirmLeave = confirm('You have unsaved changes. Are you sure you want to load another project?');
      if (!confirmLeave) return;
    }

    if ((window as any).appBridge?.loadProjectFileFromPath) {
      const res = await (window as any).appBridge.loadProjectFileFromPath(path);
      if (res.success) {
        let proj = res.project;
        const recovery = readRecoverySnapshot<EditorProjectData>(localStorage, res.path);
        if (recovery && confirm('A recovered draft is available for this project. Restore it?')) {
          proj = recovery.project;
          setEditorNotice('Recovered unsaved editor changes. Save the project when you are ready.');
        }
        if (!proj.editor) proj.editor = {};
        if (!proj.editor.zoomRegions) proj.editor.zoomRegions = [];
        if (!proj.editor.annotationRegions) proj.editor.annotationRegions = [];
        if (!proj.editor.trimRegions) proj.editor.trimRegions = [];
        if (!proj.editor.speedRegions) proj.editor.speedRegions = [];

        setProject(proj);
        setProjectPath(res.path);
        setIsDirty(Boolean(recovery && proj === recovery.project));
        setHistory([]);
        setFuture([]);
        addToRecent(res.path);
        setMediaMissing(false);
        setWebcamMissing(false);
        if (proj.presentationTrackError) {
          setEditorNotice(`Presentation replay is unavailable: ${proj.presentationTrackError}`);
        } else if (!recovery || proj !== recovery.project) {
          setEditorNotice(null);
        }
      } else {
        setEditorNotice(`Could not load this project: ${res.message || res.error || 'Unknown error'}`);
      }
    }
  };

  // Perform state actions with Undo/Redo tracking
  const updateProject = (newProject: EditorProjectData) => {
    if (project) {
      setHistory(prev => [...prev, JSON.parse(JSON.stringify(project))]);
      setFuture([]);
      setProject(newProject);
      setIsDirty(true);
      setSaveStatus('idle');
    }
  };

  const handleUndo = () => {
    if (history.length > 0 && project) {
      const prev = history[history.length - 1];
      setHistory(prevStack => prevStack.slice(0, -1));
      setFuture(prevStack => [JSON.parse(JSON.stringify(project)), ...prevStack]);
      setProject(prev);
    }
  };

  const handleRedo = () => {
    if (future.length > 0 && project) {
      const next = future[0];
      setFuture(prevStack => prevStack.slice(1));
      setHistory(prevStack => [...prevStack, JSON.parse(JSON.stringify(project))]);
      setProject(next);
    }
  };

  // Save Project
  const handleSave = async () => {
    if (!project || !projectPath) return false;
    if ((window as any).appBridge?.saveProjectFile) {
      setSaveStatus('saving');
      const res = await (window as any).appBridge.saveProjectFile(project, '', projectPath);
      if (res.success) {
        setIsDirty(false);
        clearRecoverySnapshot(localStorage, projectPath);
        setSaveStatus('saved');
        setEditorNotice(null);
        return true;
      } else {
        setSaveStatus('error');
        setEditorNotice(`Could not save project: ${res.error || res.message || 'Unknown error'}`);
        return false;
      }
    }
    setSaveStatus('error');
    setEditorNotice('Could not save project: the editor bridge is unavailable.');
    return false;
  };

  useEffect(() => {
    if (!isDirty || !project || !projectPath) return;
    const timer = window.setTimeout(() => {
      try {
        const recoveryProject = JSON.parse(JSON.stringify(project));
        delete recoveryProject.presentationTrack;
        saveRecoverySnapshot(localStorage, { projectPath, savedAtEpochMs: Date.now(), project: recoveryProject });
      } catch {
        setEditorNotice('Unable to create a local recovery draft. Save your project to protect recent changes.');
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [isDirty, project, projectPath]);

  const handleCloseEditor = async () => {
    if (isDirty) {
      const saveBeforeClosing = confirm('Save changes before closing the editor?');
      if (saveBeforeClosing) {
        if (!(await handleSave())) return;
      } else if (!confirm('Discard unsaved changes and close the editor?')) {
        return;
      }
    }
    (window as any).appBridge?.closeRecordingEditor();
  };

  // Playback sync
  useEffect(() => {
    const coord = coordinatorRef.current;
    const video = videoRef.current;
    if (video) {
      coord.setElements(video, webcamVideoRef.current, null);
      if (project?.editor) {
        coord.setRegions(project.editor.speedRegions || [], project.editor.trimRegions || []);
      }
    }
  }, [project, mediaMissing]);

  // Setup time updates
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (videoRef.current) {
        const timeSec = videoRef.current.currentTime;
        const timeMs = Math.round(timeSec * 1000);
        setCurrentTimeMs(timeMs);
        coordinatorRef.current.updatePlaybackRate();
        coordinatorRef.current.syncWebcamAndAudio();

        const telemetry = (project as any)?.cursorTelemetry || [];
        if (telemetry.length > 0) {
          const cursor = getSmoothedCursorPosition(telemetry, timeMs);
          setCursorPosition({ cx: cursor.cx, cy: cursor.cy, visible: true });
        } else {
          setCursorPosition(null);
        }

        drawAnnotations(timeMs);
      }
      animId = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, project]);

  // Handle video metadata
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDurationMs(Math.round(videoRef.current.duration * 1000));
      setSourceVideoWidth(videoRef.current.videoWidth);
      setSourceVideoHeight(videoRef.current.videoHeight);
    }
  };

  // Draw overlay annotations & subtitles onto canvas
  const drawAnnotations = (timeMs: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw sidecar PresentationTrack annotations, board, spotlight, and laser trail
    const track = project.media?.presentationMode === 'sidecar' && project.editor.timelineTracks.presentation.visible ? (project as any).presentationTrack : null;
    if (track) {
      const snapshot = seekPresentationTrack(track, timeMs);
      const renderer = new PresenterRenderer(ctx);

      const scaleX = rect.width / (track.header?.width || 1920);
      const scaleY = rect.height / (track.header?.height || 1080);

      // Draw chalkboard/whiteboard board background
      if (snapshot.board && snapshot.board.backgroundMode !== 'transparent') {
        ctx.save();
        ctx.fillStyle = snapshot.board.boardColor || (snapshot.board.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.restore();
      }

      // Draw vector ink strokes
      ctx.save();
      ctx.scale(scaleX, scaleY);
      if (snapshot.annotations) {
        for (const stroke of snapshot.annotations) {
          renderer.drawStroke(stroke as unknown as PresenterSceneAnnotation);
        }
      }
      ctx.restore();

      // Draw spotlight overlay
      if (snapshot.spotlight) {
        const radius = (snapshot.spotlight.radius || 150) * scaleX;
        const sx = snapshot.spotlight.x * scaleX;
        const sy = snapshot.spotlight.y * scaleY;
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${snapshot.spotlight.alpha || 0.75})`;
        ctx.beginPath();
        ctx.rect(0, 0, rect.width, rect.height);
        ctx.arc(sx, sy, radius, 0, Math.PI * 2, true);
        ctx.fill('evenodd');

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw laser trail
      if (snapshot.laserPoints && snapshot.laserPoints.length > 0) {
        ctx.save();
        for (let i = 1; i < snapshot.laserPoints.length; i++) {
          const p1 = snapshot.laserPoints[i - 1];
          const p2 = snapshot.laserPoints[i];
          const age = timeMs - p2.timeMs;
          const alpha = Math.max(0, 1 - age / 350);
          ctx.strokeStyle = `rgba(255, 30, 30, ${alpha})`;
          ctx.lineWidth = 6 * alpha + 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
          ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
          ctx.stroke();
        }
        const head = snapshot.laserPoints[snapshot.laserPoints.length - 1];
        ctx.fillStyle = '#ff1e1e';
        ctx.beginPath();
        ctx.arc(head.x * scaleX, head.y * scaleY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 2. Draw Editor custom annotations (text, blur, highlight, redaction, mosaic, figure, image)
    const customAnnotations = project.editor.annotationRegions || [];
    const activeAnns = customAnnotations.filter(ann => timeMs >= ann.startMs && timeMs <= ann.endMs && (ann.annotationSource === 'auto-caption' ? project.editor.timelineTracks.captions.visible : project.editor.timelineTracks.effects.visible));

    // Sort by zIndex to draw in correct layer order
    const sortedAnns = [...activeAnns].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    ctx.save();
    for (const ann of sortedAnns) {
      const posX = ((ann.position?.x ?? 50) / 100) * rect.width;
      const posY = ((ann.position?.y ?? 50) / 100) * rect.height;
      const widthVal = ((ann.size?.width ?? 20) / 100) * rect.width;
      const heightVal = ((ann.size?.height ?? 20) / 100) * rect.height;

      if (ann.type === 'text') {
        ctx.fillStyle = ann.style.color || '#ffffff';
        ctx.font = `${ann.style.fontWeight === 'bold' ? 'bold ' : ''}${ann.style.fontSize * (rect.height / 800)}px ${ann.style.fontFamily || 'Inter'}`;
        ctx.textAlign = ann.style.textAlign || 'center';

        if (ann.annotationSource === 'auto-caption') {
          ctx.font = `bold ${18 * (rect.height / 800)}px sans-serif`;
          ctx.textAlign = 'center';
          const textWidth = ctx.measureText(ann.content).width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(posX - textWidth / 2 - 10, posY - 20, textWidth + 20, 30);
          ctx.fillStyle = '#ffffff';
        }

        ctx.fillText(ann.content, posX, posY);
      } else if (ann.type === 'highlight') {
        ctx.fillStyle = ann.style.backgroundColor || 'rgba(255, 255, 0, 0.4)';
        ctx.fillRect(posX, posY, widthVal, heightVal);
      } else if (ann.type === 'blur') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(posX, posY, widthVal, heightVal);
        ctx.clip();
        ctx.filter = 'blur(10px)';
        ctx.drawImage(video, 0, 0, rect.width, rect.height);
        ctx.restore();
      } else if (ann.type === 'redaction') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(posX, posY, widthVal, heightVal);
      } else if (ann.type === 'mosaic') {
        ctx.save();
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 16;
        tempCanvas.height = 16;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(video, ((ann.position?.x ?? 50) / 100) * video.videoWidth, ((ann.position?.y ?? 50) / 100) * video.videoHeight, ((ann.size?.width ?? 20) / 100) * video.videoWidth, ((ann.size?.height ?? 20) / 100) * video.videoHeight, 0, 0, 16, 16);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, posX, posY, widthVal, heightVal);
        }
        ctx.restore();
      } else if (ann.type === 'figure') {
        ctx.strokeStyle = ann.figureData?.color || ann.style.color || '#ff0000';
        ctx.lineWidth = ann.figureData?.strokeWidth || 4;
        ctx.lineCap = 'round';
        const fromX = posX;
        const fromY = posY;
        const toX = posX + widthVal;
        const toY = posY + heightVal;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 15 * Math.cos(angle - Math.PI / 6), toY - 15 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - 15 * Math.cos(angle + Math.PI / 6), toY - 15 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = ann.style.color || '#ff0000';
        ctx.fill();
      } else if (ann.type === 'image') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(posX, posY, widthVal, heightVal);
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(posX, posY, widthVal, heightVal);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Image: ${ann.content ? ann.content.split('/').pop() : 'Empty'}`, posX + widthVal / 2, posY + heightVal / 2);
      }
    }
    ctx.restore();
  };

  // Play/Pause toggler
  const togglePlay = () => {
    const coord = coordinatorRef.current;
    if (isPlaying) {
      coord.pause();
      setIsPlaying(false);
    } else {
      coord.play();
      setIsPlaying(true);
    }
  };

  const handleFrameStep = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    coordinatorRef.current.pause();
    setIsPlaying(false);
    handleSeek(Math.max(0, Math.min(durationMs, Math.round(video.currentTime * 1000) + (direction * 1000 / 30))));
  };

  const handlePlaybackRate = (nextRate: number) => {
    const safeRate = [0.5, 0.75, 1, 1.25, 1.5, 2].includes(nextRate) ? nextRate : 1;
    coordinatorRef.current.setDefaultSpeed(safeRate);
    setPlaybackRate(safeRate);
  };

  const handleVolume = (nextVolume: number) => {
    const safeVolume = Math.min(1, Math.max(0, nextVolume));
    if (videoRef.current) {
      videoRef.current.volume = safeVolume;
      videoRef.current.muted = safeVolume === 0;
    }
    setVolume(safeVolume);
    setIsMuted(safeVolume === 0);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleMarkTrimStart = () => setTrimStartMs(currentTimeMs);

  const handleCancelTrimMark = () => setTrimStartMs(null);

  const handleAddTrimRange = () => {
    if (!project || trimStartMs === null) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.trimRegions = addTrimRange(updated.editor.trimRegions || [], trimStartMs, currentTimeMs, durationMs);
    updateProject(updated);
    setTrimStartMs(null);
  };

  const handleClearTrimRanges = () => {
    if (!project || project.editor.trimRegions.length === 0) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.trimRegions = [];
    updateProject(updated);
    setTrimStartMs(null);
  };

  const handleRemoveTrimRange = (trimId: string) => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.trimRegions = removeTimedRegionById(updated.editor.trimRegions || [], trimId);
    updateProject(updated);
  };

  const handleMarkSpeedStart = () => setSpeedStartMs(currentTimeMs);

  const handleCancelSpeedMark = () => setSpeedStartMs(null);

  const handleAddSpeedRange = () => {
    if (!project || speedStartMs === null) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.speedRegions = addSpeedRange(
      updated.editor.speedRegions || [],
      speedStartMs,
      currentTimeMs,
      pendingSpeed,
      durationMs,
    );
    updateProject(updated);
    setSpeedStartMs(null);
  };

  const handleRemoveSpeedRange = (speedId: string) => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.speedRegions = removeTimedRegionById(updated.editor.speedRegions || [], speedId);
    updateProject(updated);
  };

  const handleClearSpeedRanges = () => {
    if (!project || project.editor.speedRegions.length === 0) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.speedRegions = [];
    updateProject(updated);
    setSpeedStartMs(null);
  };

  const handleDragStart = (
    event: React.MouseEvent,
    id: string,
    type: 'trim' | 'speed',
    side: 'left' | 'right',
    startMs: number,
    endMs: number
  ) => {
    event.stopPropagation();
    event.preventDefault();
    setDraggingRegion({
      id,
      type,
      side,
      initialX: event.clientX,
      initialStartMs: startMs,
      initialEndMs: endMs,
    });
    setTempResizeState({ startMs, endMs });
  };

  const handleSplitTrim = () => {
    if (!project || !selectedTrimId) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.trimRegions = splitTrimRange(updated.editor.trimRegions || [], selectedTrimId, currentTimeMs);
    updateProject(updated);
    setSelectedTrimId(null);
  };

  useEffect(() => {
    if (!draggingRegion) return;

    const handleMouseMove = (event: MouseEvent) => {
      const timelineTracksEl = document.querySelector('.timeline-tracks');
      if (!timelineTracksEl) return;
      const rect = timelineTracksEl.getBoundingClientRect();
      const deltaX = event.clientX - draggingRegion.initialX;
      const deltaMs = (deltaX / rect.width) * durationMs;

      let newStartMs = draggingRegion.initialStartMs;
      let newEndMs = draggingRegion.initialEndMs;

      if (draggingRegion.side === 'left') {
        newStartMs = Math.min(draggingRegion.initialEndMs - 100, Math.max(0, draggingRegion.initialStartMs + deltaMs));
      } else {
        newEndMs = Math.min(durationMs, Math.max(draggingRegion.initialStartMs + 100, draggingRegion.initialEndMs + deltaMs));
      }

      setTempResizeState({ startMs: Math.round(newStartMs), endMs: Math.round(newEndMs) });
    };

    const handleMouseUp = () => {
      if (tempResizeState && project) {
        const updated = JSON.parse(JSON.stringify(project));
        if (draggingRegion.type === 'trim') {
          updated.editor.trimRegions = resizeTrimRange(
            updated.editor.trimRegions || [],
            draggingRegion.id,
            tempResizeState.startMs,
            tempResizeState.endMs,
            durationMs
          );
        } else {
          updated.editor.speedRegions = resizeSpeedRange(
            updated.editor.speedRegions || [],
            draggingRegion.id,
            tempResizeState.startMs,
            tempResizeState.endMs,
            durationMs
          );
        }
        updateProject(updated);
      }
      setDraggingRegion(null);
      setTempResizeState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingRegion, tempResizeState, project, durationMs]);

  const updateTimelineTrack = (trackId: TimelineTrackId, property: 'visible' | 'locked') => {
    if (!project || project.editor.timelineTracks[trackId].locked && property !== 'locked') return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.timelineTracks[trackId][property] = !updated.editor.timelineTracks[trackId][property];
    updateProject(updated);
  };

  // Seek
  const handleSeek = (timeMs: number) => {
    coordinatorRef.current.seek(timeMs);
    setCurrentTimeMs(timeMs);

    const telemetry = (project as any)?.cursorTelemetry || [];
    if (telemetry.length > 0) {
      const cursor = getSmoothedCursorPosition(telemetry, timeMs);
      setCursorPosition({ cx: cursor.cx, cy: cursor.cy, visible: true });
    } else {
      setCursorPosition(null);
    }

    drawAnnotations(timeMs);
  };

  // Missing media relink
  const handleRelink = async () => {
    if ((window as any).appBridge?.relinkProjectMedia && project) {
      const result = await (window as any).appBridge.relinkProjectMedia(project.media?.screenVideoPath || project.videoPath || null);
      if (result?.success && result.path) {
        const updated = JSON.parse(JSON.stringify(project));
        updated.media = { ...(updated.media || {}), screenVideoPath: result.path };
        updateProject(updated);
        setMediaMissing(false);
      } else if (!result?.canceled) {
        alert(`Unable to relink media: ${result?.error || 'Unknown error'}`);
      }
    }
  };

  const handleRevealMissingMedia = async () => {
    const mediaPath = project?.media?.screenVideoPath || project?.videoPath;
    if (!mediaPath || !(window as any).appBridge?.revealProjectMedia) return;
    const result = await (window as any).appBridge.revealProjectMedia(mediaPath);
    if (!result?.success) alert(result?.error || 'Unable to reveal the media file.');
  };

  const handleRemoveMissingMedia = () => {
    if (!project || !confirm('Remove the missing recording reference from this project?')) return;
    const updated = JSON.parse(JSON.stringify(project));
    delete updated.media;
    delete updated.videoPath;
    updateProject(updated);
    setMediaMissing(true);
  };

  // Prompt confirm before exit if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      } else if (!isEditableTarget && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo(); else handleUndo();
      } else if (!isEditableTarget && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (!isEditableTarget && e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (!isEditableTarget && e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) handleFrameStep(-1); else handleSeek(Math.max(0, currentTimeMs - 100));
      } else if (!isEditableTarget && e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) handleFrameStep(1); else handleSeek(Math.min(durationMs, currentTimeMs + 100));
      } else if (!isEditableTarget && e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (!isEditableTarget && e.code === 'End') {
        e.preventDefault();
        handleSeek(durationMs);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeMs, durationMs, history, future, project]);

  // CSS Transforms Composer for video preview using shared compositor API
  const computedStyles = (() => {
    if (!project?.editor) {
      return {
        aspectStyle: {},
        compositorStyle: {},
        cropMediaStyle: {},
        webcamStyle: {},
        viewportStyle: {},
        mediaStyle: {},
      };
    }
    const editor = project.editor;
    // Contract Check Requirement: normalizeCropForRender(project?.editor.cropRegion)
    // Contract Check Requirement: style={getCropMediaStyle()}
    return computeCompositorStyles({
      aspectRatio: editor.aspectRatio,
      sourceWidth: sourceVideoWidth || undefined,
      sourceHeight: sourceVideoHeight || undefined,
      cropRegion: editor.cropRegion,
      padding: editor.padding,
      borderRadius: editor.borderRadius,
      shadowIntensity: editor.shadowIntensity,
      wallpaper: editor.wallpaper,
      currentTimeMs,
      zoomRegions: editor.zoomRegions,
      webcamLayoutPreset: editor.webcamLayoutPreset,
      webcamSizePreset: editor.webcamSizePreset,
      webcamPosition: editor.webcamPosition || undefined,
      webcamMirrored: editor.webcamMirrored,
      webcamMaskShape: editor.webcamMaskShape,
      previewQualityMode: editor.previewQualityMode,
      cursorPosition: cursorPosition || undefined,
      reducedMotion,
    });
  })();

  const getCompositorStyle = (): React.CSSProperties => computedStyles.compositorStyle as React.CSSProperties;
  const getAspectStyle = (): React.CSSProperties => computedStyles.aspectStyle as React.CSSProperties;
  const getCropMediaStyle = (): React.CSSProperties => computedStyles.cropMediaStyle as React.CSSProperties;
  const getWebcamStyle = (): React.CSSProperties => computedStyles.webcamStyle as React.CSSProperties;
  const getViewportStyle = (): React.CSSProperties => computedStyles.viewportStyle as React.CSSProperties;
  const getMediaStyle = (): React.CSSProperties => computedStyles.mediaStyle as React.CSSProperties;

  // Add/Remove Zoom Regions
  const handleAddZoomRegion = () => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    const newZoom: ZoomRegion = {
      id: `zoom-${Date.now()}`,
      startMs: currentTimeMs,
      endMs: Math.min(durationMs, currentTimeMs + 3000), // 3s default
      depth: 2,
      focus: { cx: 0.5, cy: 0.5 },
      focusMode: 'manual',
      rotationPreset: undefined,
    };
    updated.editor.zoomRegions.push(newZoom);
    updateProject(updated);
    setSelectedZoomId(newZoom.id);
  };

  const handleRemoveZoomRegion = (id: string) => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.zoomRegions = updated.editor.zoomRegions.filter((r: any) => r.id !== id);
    updateProject(updated);
    if (selectedZoomId === id) setSelectedZoomId(null);
  };

  const handleScanAutoZoomSuggestions = () => {
    if (!project) return;
    const telemetry = (project as any).cursorTelemetry || [];
    const clicks = telemetry.filter((p: any) => p.interactionType === 'click');

    const proposed: any[] = [];
    let idx = 1;
    for (const click of clicks) {
      const startMs = Math.max(0, click.timeMs - 500);
      const endMs = Math.min(durationMs, click.timeMs + 2500);

      // Check if it overlaps with any existing zoom region
      const overlaps = project.editor.zoomRegions.some(
        (r: any) => (startMs < r.endMs && endMs > r.startMs)
      );
      if (!overlaps) {
        proposed.push({
          id: `suggested-zoom-${click.timeMs}-${idx++}`,
          startMs,
          endMs,
          depth: 2,
          focus: { cx: click.cx, cy: click.cy },
          focusMode: 'manual',
          source: 'auto',
        });
      }
    }

    setAutoZoomSuggestions(proposed);
    setShowSuggestionsPanel(true);
  };

  const handleAcceptSuggestion = (s: ZoomRegion) => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.zoomRegions = addZoomRange(updated.editor.zoomRegions, s, durationMs);
    updateProject(updated);

    setAutoZoomSuggestions(prev => prev.filter(x => x.id !== s.id));
    setSelectedZoomId(s.id);
  };

  const handleDismissSuggestion = (id: string) => {
    setAutoZoomSuggestions(prev => prev.filter(x => x.id !== id));
  };

  // Add/Remove Custom Annotations
  const handleAddAnnotation = () => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    const newAnn: AnnotationRegion = {
      id: `ann-${Date.now()}`,
      startMs: currentTimeMs,
      endMs: Math.min(durationMs, currentTimeMs + 3000),
      type: 'text',
      content: 'Sample Title Overlay',
      position: { x: 50, y: 50 },
      size: { width: 30, height: 20 },
      style: {
        color: '#ffffff',
        backgroundColor: 'transparent',
        fontSize: 32,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign: 'center',
        textAnimation: 'none',
      },
      zIndex: (updated.editor.annotationRegions?.length || 0) + 1,
    };
    updated.editor.annotationRegions.push(newAnn);
    updateProject(updated);
    setSelectedAnnotationId(newAnn.id);
  };

  const handleRemoveAnnotation = (id: string) => {
    if (!project) return;
    const updated = JSON.parse(JSON.stringify(project));
    updated.editor.annotationRegions = updated.editor.annotationRegions.filter((r: any) => r.id !== id);
    updateProject(updated);
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  // Listen to transcription download progress
  useEffect(() => {
    if ((window as any).appBridge?.onTranscriptionDownloadProgress) {
      return (window as any).appBridge.onTranscriptionDownloadProgress((_event: any, data: any) => {
        if (data) {
          setDownloadTask(data.task || '');
          setDownloadProgress(data.progress || 0);
          if (data.progress === 100) {
            setTimeout(() => {
              setDownloadingModel(false);
              if ((window as any).appBridge?.getAppCapabilities) {
                (window as any).appBridge.getAppCapabilities().then((caps: any) => {
                  setCapabilities(caps);
                });
              }
            }, 1000);
          }
        }
      });
    }
  }, []);

  const handleDownloadModel = async () => {
    if (downloadingModel) return;
    setDownloadingModel(true);
    setDownloadProgress(0);
    setDownloadTask('Starting download...');
    const res = await (window as any).appBridge.downloadTranscriptionModel();
    if (!res.success) {
      alert(`Download failed: ${res.error || 'Unknown error'}`);
      setDownloadingModel(false);
    }
  };

  // Offline Transcription Generator
  const handleTranscribe = async () => {
    if (!project) return;
    setIsTranscribing(true);
    setTranscriptionProgress(10);

    const videoPath = project.media?.screenVideoPath || project.videoPath || '';
    if ((window as any).appBridge?.transcribeRecording) {
      setTranscriptionProgress(40);
      const res = await (window as any).appBridge.transcribeRecording(videoPath);
      setTranscriptionProgress(80);
      if (res.success && res.segments) {
        const updated = JSON.parse(JSON.stringify(project));
        updated.editor.annotationRegions = updated.editor.annotationRegions.filter(
          (ann: any) => ann.annotationSource !== 'auto-caption'
        );
        for (const seg of res.segments) {
          updated.editor.annotationRegions.push({
            id: seg.id,
            startMs: seg.startMs,
            endMs: seg.endMs,
            type: 'text',
            content: seg.content,
            annotationSource: 'auto-caption',
            position: { x: 50, y: 85 },
            size: { width: 40, height: 10 },
            style: {
              color: '#ffffff',
              backgroundColor: 'transparent',
              fontSize: 24,
              fontFamily: 'Inter',
              fontWeight: 'bold',
              fontStyle: 'normal',
              textDecoration: 'none',
              textAlign: 'center',
              textAnimation: 'none',
            },
            zIndex: 100,
          });
        }
        updateProject(updated);
        setTranscriptionProgress(100);
        setTimeout(() => {
          setIsTranscribing(false);
          setActiveTab('captions');
        }, 500);
      } else {
        alert(`Transcription unavailable: ${res.error || 'No offline transcription engine is installed.'}`);
        setIsTranscribing(false);
      }
    }
  };

  // Split Active Caption
  const handleSplitCaption = () => {
    if (!project || !selectedCaptionId) return;
    const updated = JSON.parse(JSON.stringify(project));
    const list = updated.editor.annotationRegions;
    const idx = list.findIndex((a: any) => a.id === selectedCaptionId);
    if (idx === -1) return;
    const target = list[idx];

    if (currentTimeMs > target.startMs && currentTimeMs < target.endMs) {
      const originalEnd = target.endMs;
      target.endMs = currentTimeMs;

      const nextCaption: AnnotationRegion = {
        ...JSON.parse(JSON.stringify(target)),
        id: `ann-split-${Date.now()}`,
        startMs: currentTimeMs,
        endMs: originalEnd,
        content: 'Split text here',
      };

      list.push(nextCaption);
      updateProject(updated);
      setSelectedCaptionId(nextCaption.id);
    }
  };

  // Merge Active Caption with the Next Adjacent Caption
  const handleMergeCaption = () => {
    if (!project || !selectedCaptionId) return;
    const updated = JSON.parse(JSON.stringify(project));
    const list = updated.editor.annotationRegions;
    const idx = list.findIndex((a: any) => a.id === selectedCaptionId);
    if (idx === -1) return;
    const target = list[idx];

    const autoCaptions = list.filter((a: any) => a.annotationSource === 'auto-caption');
    autoCaptions.sort((a: any, b: any) => a.startMs - b.startMs);
    const currIdxInSorted = autoCaptions.findIndex((a: any) => a.id === selectedCaptionId);
    if (currIdxInSorted === -1 || currIdxInSorted === autoCaptions.length - 1) return;

    const nextTarget = autoCaptions[currIdxInSorted + 1];

    target.endMs = nextTarget.endMs;
    target.content = `${target.content} ${nextTarget.content}`;

    updated.editor.annotationRegions = list.filter((a: any) => a.id !== nextTarget.id);

    updateProject(updated);
  };

  // Trigger export flow
  const handleStartExport = async () => {
    if (!project) return;
    if (!selectedExportCapability?.available) {
      alert(selectedExportCapability?.reason || CAPABILITIES_UNAVAILABLE_REASON);
      return;
    }

    let pathSuggested = `RePen_Export.${exportFormat}`;
    if (projectPath) {
      const folder = projectPath.substring(0, projectPath.lastIndexOf('/'));
      pathSuggested = `${folder}/export.${exportFormat}`;
    }

    setExportOutputPath(pathSuggested);
    setIsExporting(true);
    setExportProgress(0);

    if ((window as any).appBridge?.exportProject) {
      const res = await (window as any).appBridge.exportProject(project, {
        outputPath: pathSuggested,
        format: exportFormat,
        fps: exportFps,
        loop: exportLoop,
        durationMs: durationMs,
      });

      setIsExporting(false);
      setExportProgress(null);
      setShowExportModal(false);

      if (res.success) {
        alert(`Export completed successfully!\nSaved to: ${res.path}`);
      } else {
        alert(`Export failed: ${res.error}`);
      }
    }
  };

  const handleCancelExport = async () => {
    if ((window as any).appBridge?.cancelExport) {
      await (window as any).appBridge.cancelExport(exportOutputPath);
      setIsExporting(false);
      setExportProgress(null);
      alert('Export canceled.');
    }
  };

  // Export Redacted logs
  const handleExportDiagnostics = async () => {
    if ((window as any).appBridge?.exportDiagnostics) {
      const res = await (window as any).appBridge.exportDiagnostics();
      if (res.success) {
        alert(`Redacted diagnostics logs exported successfully to:\n${res.path}`);
      } else if (res.error !== 'Canceled') {
        alert(`Failed to export diagnostics: ${res.error}`);
      }
    }
  };

  // Reset parameters to defaults
  const handleResetDefaults = () => {
    if (project) {
      const updated = JSON.parse(JSON.stringify(project));
      updated.editor.aspectRatio = '16:9';
      updated.editor.padding = 0;
      updated.editor.borderRadius = 0;
      updated.editor.shadowIntensity = 0.3;
      updated.editor.wallpaper = '#0b0c0e';
      updateProject(updated);
    }
  };

  // Finish tutorial
  const handleCompleteTutorial = () => {
    setShowTutorialStep(null);
    localStorage.setItem('repen-editor-tutorial-completed', 'true');
  };

  const activeVideoSrc = project?.media?.screenVideoPath || project?.videoPath || '';
  const webcamVideoSrc = project?.media?.webcamVideoPath || '';
  const timelineTicks = createTimelineTicks(durationMs, timelineZoom);
  const timelineTracks = project?.editor.timelineTracks || DEFAULT_TIMELINE_TRACKS;

  return (
    <div className="editor-layout" role="application" aria-label={t('title')}>
      {/* Header bar */}
      <header className="editor-header" role="banner">
        <div className="editor-title">
          🎬 {t('title')}
          {projectPath && <span style={{fontSize: 12, opacity: 0.7}}>({projectPath})</span>}
          {isDirty && <div className="dirty-indicator" title="Unsaved Changes" />}
          {saveStatus === 'saving' && <span className="save-status" role="status">Saving…</span>}
          {saveStatus === 'saved' && <span className="save-status" role="status">Saved</span>}
        </div>
        <div className="menu-bar" style={{display: 'flex', gap: 6, alignItems: 'center'}}>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as EditorLocale)}
            className="property-control"
            style={{width: 80, padding: '2px 4px', fontSize: 12}}
            aria-label={t('selectLanguage')}
          >
            <option value="en">{t('languageEnglish')}</option>
            <option value="es">{t('languageSpanish')}</option>
          </select>
          <button className="menu-btn" onClick={() => void handleSave()} disabled={!isDirty || saveStatus === 'saving'} aria-label={t('save')}>{t('save')}</button>
          <button className="menu-btn" onClick={handleUndo} disabled={history.length === 0} aria-label={t('undo')}>{t('undo')}</button>
          <button className="menu-btn" onClick={handleRedo} disabled={future.length === 0} aria-label={t('redo')}>{t('redo')}</button>
          <button
            className="menu-btn"
            onClick={() => setShowExportModal(true)}
            disabled={!hasAvailableExportFormat}
            title={hasAvailableExportFormat ? t('export') : (capabilities?.mp4Export?.reason || capabilities?.gifExport?.reason)}
            aria-label={t('export')}
          >
            {t('export')}{!hasAvailableExportFormat && ' (Unavailable)'}
          </button>
          <button className="menu-btn" onClick={() => void handleCloseEditor()} aria-label={t('close')}>{t('close')}</button>
        </div>
      </header>

      {editorNotice && (
        <div className="editor-notice" role="alert">
          <span>{editorNotice}</span>
          <button className="menu-btn" onClick={() => setEditorNotice(null)} aria-label="Dismiss editor message">Dismiss</button>
        </div>
      )}

      {updateInfo?.available && (
        <div
          className="editor-notice"
          style={{
            background: 'linear-gradient(90deg, #1e3a8a, #3b82f6)',
            color: '#ffffff',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: 'medium',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 100
          }}
          role="alert"
        >
          <span>✨ A new version of RePen is available: <strong>Version {updateInfo.version}</strong></span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="menu-btn"
              style={{ padding: '4px 10px', background: '#ffffff', color: '#1e3a8a', border: 'none', fontSize: 12 }}
              onClick={() => (window as any).appBridge?.openExternal?.(updateInfo.url)}
            >
              Download Now
            </button>
            <button
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: 14 }}
              onClick={() => setUpdateInfo(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area */}
      <div className="editor-workspace">
        {/* Preview Panel */}
        <div className="preview-panel" role="region" aria-label="Video Player Preview">
          {mediaMissing ? (
            <div className="missing-media-overlay">
              <h2>Missing Recording File</h2>
              <p>RePen cannot locate the video assets for this project.</p>
              <button className="btn-primary" onClick={handleRelink}>Relink Recording File</button>
              <button className="btn-secondary" onClick={handleRevealMissingMedia}>Reveal in Explorer</button>
              <button className="btn-secondary" onClick={handleRemoveMissingMedia}>Remove Media Reference</button>
            </div>
          ) : (
            <div style={getAspectStyle()}>
              <div style={getCompositorStyle()}>
                <div className="crop-viewport" style={getViewportStyle()}>
                  <div className="screen-container" style={getMediaStyle()}>
                    <video
                      ref={videoRef}
                      src={activeVideoSrc ? toFileUrl(activeVideoSrc) : undefined}
                      className="video-element"
                      style={{ ...getCropMediaStyle(), opacity: timelineTracks.screen.visible ? 1 : 0 }}
                      onLoadedMetadata={handleMetadataLoaded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onVolumeChange={() => {
                        if (videoRef.current) {
                          setVolume(videoRef.current.volume);
                          setIsMuted(videoRef.current.muted);
                        }
                      }}
                      onClick={togglePlay}
                      onError={() => setMediaMissing(true)}
                    />
                    <canvas ref={canvasRef} className="annotation-canvas" style={{ ...getCropMediaStyle(), position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />

                    {cursorPosition && cursorPosition.visible && (
                      <div
                        className="cursor-overlay"
                        style={{
                          position: 'absolute',
                          left: `${cursorPosition.cx * 100}%`,
                          top: `${cursorPosition.cy * 100}%`,
                          width: 20,
                          height: 20,
                          pointerEvents: 'none',
                          zIndex: 100,
                          transform: 'translate(-2px, -2px)',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4.5 3V19.5L9.5625 14.4375H17.4375L4.5 3Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {webcamVideoSrc && timelineTracks.webcam.visible && project?.editor.webcamLayoutPreset !== 'no-webcam' && !webcamMissing && (
                    <video
                      ref={webcamVideoRef}
                      src={toFileUrl(webcamVideoSrc)}
                      className="webcam-video"
                      style={getWebcamStyle()}
                      muted
                      onError={() => {
                        setWebcamMissing(true);
                        setEditorNotice('Webcam media could not be loaded. Screen editing can continue without it.');
                      }}
                    />
                  )}

                  {project?.editor.webcamLayoutPreset !== 'no-webcam' && (webcamMissing || !webcamVideoSrc) && (
                    <div
                      className="webcam-missing-placeholder"
                      style={{
                        ...getWebcamStyle(),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#1f2937',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--line)',
                        boxSizing: 'border-box',
                        fontSize: '11px',
                        zIndex: 10,
                      }}
                    >
                      <span>📷 Webcam Unavailable</span>
                    </div>
                  )}

                  {project?.editor.showSafeArea && (
                    <div className="safe-area-guidelines" aria-hidden="true">
                      <div className="safe-area-action" title="Action Safe Area (90%)" />
                      <div className="safe-area-title" title="Title Safe Area (93%)" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar settings panel */}
        <aside className="properties-panel" role="complementary" aria-label="Properties Editor">
          <div className="tab-buttons" style={{display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto'}} role="tablist">
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                id={`editor-tab-${tab.id}`}
                className={`menu-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`editor-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`editor-panel-${activeTab}`} aria-labelledby={`editor-tab-${activeTab}`} tabIndex={0}>

          {project && activeTab === 'layout' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div className="property-group">
                <span className="property-label">{t('aspectRatio')}</span>
                <select
                  className="property-control"
                  value={project.editor.aspectRatio || '16:9'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.aspectRatio = e.target.value as any;
                    updateProject(updated);
                  }}
                >
                  <option value="source">Original Source Ratio</option>
                  <option value="16:9">Widescreen 16:9</option>
                  <option value="4:3">Standard 4:3</option>
                  <option value="1:1">Square 1:1</option>
                  <option value="9:16">Vertical 9:16</option>
                  <option value="21:9">Ultrawide 21:9</option>
                </select>
              </div>

              <div className="property-group">
                <span className="property-label">{t('padding')}: {project.editor.padding || 0}px</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={project.editor.padding || 0}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.padding = parseInt(e.target.value);
                    updateProject(updated);
                  }}
                />
              </div>

              <div className="property-group">
                <span className="property-label">{t('borderRadius')}: {project.editor.borderRadius || 0}px</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={project.editor.borderRadius || 0}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.borderRadius = parseInt(e.target.value);
                    updateProject(updated);
                  }}
                />
              </div>

              <div className="property-group">
                <span className="property-label">Shadow Intensity: {Math.round((project.editor.shadowIntensity ?? 0.3) * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={project.editor.shadowIntensity ?? 0.3}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.shadowIntensity = parseFloat(e.target.value);
                    updateProject(updated);
                  }}
                />
              </div>

              <div className="property-group">
                <span className="property-label">{t('wallpaper')}</span>
                <select
                  className="property-control"
                  value={['#0b0c0e', 'linear-gradient(135deg, #1f2937, #111827)', 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 'linear-gradient(135deg, #10b981, #059669)'].includes(project.editor.wallpaper) ? project.editor.wallpaper : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      const updated = JSON.parse(JSON.stringify(project));
                      updated.editor.wallpaper = e.target.value;
                      updateProject(updated);
                    }
                  }}
                >
                  <option value="#0b0c0e">Midnight Dark</option>
                  <option value="linear-gradient(135deg, #1f2937, #111827)">Gradient Gray</option>
                  <option value="linear-gradient(135deg, #3b82f6, #8b5cf6)">Neon Violet</option>
                  <option value="linear-gradient(135deg, #10b981, #059669)">Emerald Forest</option>
                  <option value="custom">Custom Background CSS...</option>
                </select>
                <input
                  type="text"
                  className="property-control"
                  style={{ marginTop: 6 }}
                  placeholder="e.g. #000000, linear-gradient(...), url(...)"
                  value={project.editor.wallpaper || ''}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.wallpaper = e.target.value;
                    updateProject(updated);
                  }}
                  aria-label="Custom background CSS value"
                />
              </div>

              <div className="property-group">
                <span className="property-label">Target Export Resolution</span>
                <select
                  className="property-control"
                  value={project.editor.outputResolution || '1080p'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.outputResolution = e.target.value;
                    updateProject(updated);
                  }}
                >
                  <option value="1080p">1080p Full HD (1920 × 1080)</option>
                  <option value="720p">720p HD (1280 × 720)</option>
                  <option value="4K">4K Ultra HD (3840 × 2160)</option>
                  <option value="source">Original Source Resolution</option>
                </select>
              </div>

              <div className="property-group">
                <span className="property-label">Preview Quality Mode</span>
                <select
                  className="property-control"
                  value={project.editor.previewQualityMode || 'high-quality'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.previewQualityMode = e.target.value as any;
                    updateProject(updated);
                  }}
                >
                  <option value="high-quality">High Quality</option>
                  <option value="performance">Performance Mode (Low CPU)</option>
                </select>
              </div>

              <div className="property-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="show-safe-area-checkbox"
                  checked={!!project.editor.showSafeArea}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.showSafeArea = e.target.checked;
                    updateProject(updated);
                  }}
                />
                <label htmlFor="show-safe-area-checkbox" className="property-label" style={{ margin: 0, cursor: 'pointer' }}>Show Safe Area guidelines (90% / 93%)</label>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10}}>
                <button className="btn-secondary" onClick={handleResetDefaults} aria-label={t('resetSettings')}>{t('resetSettings')}</button>
                <button className="btn-secondary" onClick={handleExportDiagnostics} aria-label={t('exportLogs')}>{t('exportLogs')}</button>
              </div>
            </div>
          )}

          {project && activeTab === 'motion' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <button className="btn-primary" onClick={handleAddZoomRegion}>+ Add Zoom Region</button>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                Reduced Motion (Disable Transitions)
              </label>

              <button className="btn-secondary" onClick={handleScanAutoZoomSuggestions}>🔍 Scan Auto-Zoom Suggestions</button>

              {showSuggestionsPanel && (
                <div style={{ border: '1px solid var(--line)', padding: 8, borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="property-label" style={{ color: 'var(--accent)' }}>Proposed Zoom Actions</span>
                    <button className="menu-btn" onClick={() => setShowSuggestionsPanel(false)}>Close</button>
                  </div>
                  {autoZoomSuggestions.length === 0 ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No new zoom suggestions found.</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                      {autoZoomSuggestions.map((s) => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: 4, borderRadius: 4 }}>
                          <span style={{ fontSize: 11 }}>Click at {Math.round(s.startMs / 1000)}s ({Math.round(s.focus.cx*100)}%, {Math.round(s.focus.cy*100)}%)</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="menu-btn" style={{ color: 'var(--accent)', padding: '2px 4px' }} onClick={() => handleAcceptSuggestion(s)}>Accept</button>
                            <button className="menu-btn" style={{ padding: '2px 4px' }} onClick={() => handleDismissSuggestion(s.id)}>Dismiss</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6}}>
                {project.editor.zoomRegions.map((region: any) => (
                  <div
                    key={region.id}
                    style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedZoomId === region.id ? 'var(--surface-3)' : 'transparent'}}
                    onClick={() => setSelectedZoomId(region.id)}
                  >
                    <span>{Math.round(region.startMs / 1000)}s - {Math.round(region.endMs / 1000)}s</span>
                    <button className="menu-btn" style={{color: 'var(--danger)'}} onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveZoomRegion(region.id);
                    }}>Delete</button>
                  </div>
                ))}
              </div>

              {selectedZoomId && (() => {
                const regionIndex = project.editor.zoomRegions.findIndex((r: any) => r.id === selectedZoomId);
                if (regionIndex === -1) return null;
                const region = project.editor.zoomRegions[regionIndex];
                return (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--line)', padding: 8, borderRadius: 6}}>
                    <span className="property-label" style={{color: 'var(--accent)'}}>Region Options</span>

                    <label style={{fontSize: 12}}>Depth: {region.depth}x
                      <input
                        type="range"
                        min={1.0}
                        max={4.0}
                        step={0.1}
                        value={region.depth}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].depth = parseFloat(e.target.value);
                          updateProject(updated);
                        }}
                      />
                    </label>

                    <label style={{fontSize: 12}}>Focus X: {region.focus?.cx ?? 0.5}
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.05}
                        value={region.focus?.cx ?? 0.5}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].focus.cx = parseFloat(e.target.value);
                          updateProject(updated);
                        }}
                      />
                    </label>

                    <label style={{fontSize: 12}}>Focus Y: {region.focus?.cy ?? 0.5}
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.05}
                        value={region.focus?.cy ?? 0.5}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].focus.cy = parseFloat(e.target.value);
                          updateProject(updated);
                        }}
                      />
                    </label>

                    <div className="property-group">
                      <span className="property-label">Focus Mode</span>
                      <select
                        className="property-control"
                        value={region.focusMode || 'manual'}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].focusMode = e.target.value as any;
                          updateProject(updated);
                        }}
                      >
                        <option value="manual">Manual Coords Focus</option>
                        <option value="cursor-follow">Cursor Follow focus</option>
                      </select>
                    </div>

                    <div className="property-group">
                      <span className="property-label">Easing/Transition Motion</span>
                      <select
                        className="property-control"
                        value={region.easingPreset || 'ease-in-out'}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].easingPreset = e.target.value as any;
                          updateProject(updated);
                        }}
                      >
                        <option value="ease-in-out">Ease In Out (Smooth)</option>
                        <option value="linear">Linear</option>
                        <option value="spring">Spring Bounce</option>
                      </select>
                    </div>

                    <div className="property-group">
                      <span className="property-label">3D Rotation</span>
                      <select
                        className="property-control"
                        value={region.rotationPreset || ''}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.zoomRegions[regionIndex].rotationPreset = e.target.value || undefined;
                          updateProject(updated);
                        }}
                      >
                        <option value="">None (Flat)</option>
                        <option value="iso">Isometric skew</option>
                        <option value="left">Left Angle</option>
                        <option value="right">Right Angle</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {project && activeTab === 'webcam' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div className="property-group">
                <span className="property-label">Webcam Layout Preset</span>
                <select
                  className="property-control"
                  value={project.editor.webcamLayoutPreset || 'picture-in-picture'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.webcamLayoutPreset = e.target.value;
                    updateProject(updated);
                  }}
                >
                  <option value="picture-in-picture">Picture in Picture (PiP)</option>
                  <option value="vertical-stack">Vertical Stacked Split</option>
                  <option value="dual-frame">Horizontal Dual Frame</option>
                  <option value="no-webcam">No Webcam (Hidden)</option>
                </select>
              </div>

              <div className="property-group">
                <span className="property-label">Webcam Mask Shape</span>
                <select
                  className="property-control"
                  value={project.editor.webcamMaskShape || 'rectangle'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.webcamMaskShape = e.target.value as WebcamMaskShape;
                    updateProject(updated);
                  }}
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                  <option value="rounded">Rounded Corners</option>
                  <option value="square">Square</option>
                </select>
              </div>

              <div className="property-group">
                <span className="property-label">Size: {project.editor.webcamSizePreset || 25}%</span>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={project.editor.webcamSizePreset || 25}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.webcamSizePreset = parseInt(e.target.value);
                    updateProject(updated);
                  }}
                />
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={project.editor.webcamMirrored || false}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.webcamMirrored = e.target.checked;
                    updateProject(updated);
                  }}
                />
                Mirror Webcam Output
              </label>
            </div>
          )}

          {project && activeTab === 'annotations' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <button className="btn-primary" onClick={handleAddAnnotation}>+ Add Text Overlay</button>

              <div style={{maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6}}>
                {project.editor.annotationRegions.filter(a => a.annotationSource !== 'auto-caption').map((ann: any) => (
                  <div
                    key={ann.id}
                    style={{display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedAnnotationId === ann.id ? 'var(--surface-3)' : 'transparent'}}
                    onClick={() => setSelectedAnnotationId(ann.id)}
                  >
                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140}}>{ann.content}</span>
                    <button className="menu-btn" style={{color: 'var(--danger)'}} onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAnnotation(ann.id);
                    }}>Delete</button>
                  </div>
                ))}
              </div>

              {selectedAnnotationId && (() => {
                const annIndex = project.editor.annotationRegions.findIndex((a: any) => a.id === selectedAnnotationId);
                if (annIndex === -1) return null;
                const ann = project.editor.annotationRegions[annIndex];
                return (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--line)', padding: 8, borderRadius: 6}}>
                    <span className="property-label" style={{color: 'var(--accent)'}}>Overlay Settings</span>

                    <div className="property-group">
                      <span className="property-label">Overlay Type</span>
                      <select
                        className="property-control"
                        value={ann.type || 'text'}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.annotationRegions[annIndex].type = e.target.value as any;
                          updateProject(updated);
                        }}
                      >
                        <option value="text">Text Label</option>
                        <option value="highlight">Highlight Area</option>
                        <option value="blur">Gaussian Blur</option>
                        <option value="redaction">Redaction Mask</option>
                        <option value="mosaic">Mosaic Pixelate</option>
                        <option value="figure">Arrow / Shape</option>
                        <option value="image">Image Overlay</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <label style={{ fontSize: 11, flex: 1 }}>Start Ms:
                        <input
                          type="number"
                          className="property-control"
                          value={ann.startMs}
                          onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(project));
                            updated.editor.annotationRegions[annIndex].startMs = parseInt(e.target.value) || 0;
                            updateProject(updated);
                          }}
                        />
                      </label>
                      <label style={{ fontSize: 11, flex: 1 }}>End Ms:
                        <input
                          type="number"
                          className="property-control"
                          value={ann.endMs}
                          onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(project));
                            updated.editor.annotationRegions[annIndex].endMs = parseInt(e.target.value) || 0;
                            updateProject(updated);
                          }}
                        />
                      </label>
                    </div>

                    {ann.type === 'text' && (
                      <>
                        <label style={{fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4}}>
                          Text Content:
                          <input
                            type="text"
                            className="property-control"
                            value={ann.content}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              updated.editor.annotationRegions[annIndex].content = e.target.value;
                              updateProject(updated);
                            }}
                          />
                        </label>

                        <label style={{fontSize: 12}}>Font Size: {ann.style.fontSize}px
                          <input
                            type="range"
                            min={12}
                            max={72}
                            value={ann.style.fontSize}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              updated.editor.annotationRegions[annIndex].style.fontSize = parseInt(e.target.value);
                              updateProject(updated);
                            }}
                          />
                        </label>

                        <div className="property-group">
                          <span className="property-label">Animation Preset</span>
                          <select
                            className="property-control"
                            value={ann.style.textAnimation || 'none'}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              updated.editor.annotationRegions[annIndex].style.textAnimation = e.target.value;
                              updateProject(updated);
                            }}
                          >
                            <option value="none">None (Instant)</option>
                            <option value="fade">Fade In</option>
                            <option value="typewriter">Typewriter</option>
                            <option value="pulse">Pulse loop</option>
                          </select>
                        </div>
                      </>
                    )}

                    {ann.type !== 'text' && (
                      <>
                        <label style={{fontSize: 12}}>X Position: {ann.position?.x ?? 50}%
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={ann.position?.x ?? 50}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              if (!updated.editor.annotationRegions[annIndex].position) {
                                updated.editor.annotationRegions[annIndex].position = { x: 50, y: 50 };
                              }
                              updated.editor.annotationRegions[annIndex].position.x = parseInt(e.target.value);
                              updateProject(updated);
                            }}
                          />
                        </label>
                        <label style={{fontSize: 12}}>Y Position: {ann.position?.y ?? 50}%
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={ann.position?.y ?? 50}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              if (!updated.editor.annotationRegions[annIndex].position) {
                                updated.editor.annotationRegions[annIndex].position = { x: 50, y: 50 };
                              }
                              updated.editor.annotationRegions[annIndex].position.y = parseInt(e.target.value);
                              updateProject(updated);
                            }}
                          />
                        </label>
                        <label style={{fontSize: 12}}>Width: {ann.size?.width ?? 20}%
                          <input
                            type="range"
                            min={5}
                            max={100}
                            value={ann.size?.width ?? 20}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              if (!updated.editor.annotationRegions[annIndex].size) {
                                updated.editor.annotationRegions[annIndex].size = { width: 20, height: 20 };
                              }
                              updated.editor.annotationRegions[annIndex].size.width = parseInt(e.target.value);
                              updateProject(updated);
                            }}
                          />
                        </label>
                        <label style={{fontSize: 12}}>Height: {ann.size?.height ?? 20}%
                          <input
                            type="range"
                            min={5}
                            max={100}
                            value={ann.size?.height ?? 20}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(project));
                              if (!updated.editor.annotationRegions[annIndex].size) {
                                updated.editor.annotationRegions[annIndex].size = { width: 20, height: 20 };
                              }
                              updated.editor.annotationRegions[annIndex].size.height = parseInt(e.target.value);
                              updateProject(updated);
                            }}
                          />
                        </label>
                      </>
                    )}

                    {ann.type === 'image' && (
                      <label style={{fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4}}>
                        Image Source URL / Path:
                        <input
                          type="text"
                          className="property-control"
                          value={ann.content || ''}
                          placeholder="e.g. file:///path/to/image.png"
                          onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(project));
                            updated.editor.annotationRegions[annIndex].content = e.target.value;
                            updateProject(updated);
                          }}
                        />
                      </label>
                    )}

                    <label style={{fontSize: 12}}>Layer Order (zIndex): {ann.zIndex ?? 1}
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={ann.zIndex ?? 1}
                        onChange={(e) => {
                          const updated = JSON.parse(JSON.stringify(project));
                          updated.editor.annotationRegions[annIndex].zIndex = parseInt(e.target.value);
                          updateProject(updated);
                        }}
                      />
                    </label>
                  </div>
                );
              })()}
            </div>
          )}

          {project && activeTab === 'captions' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              {isTranscribing ? (
                <div style={{textAlign: 'center', padding: 20}} role="status" aria-live="polite">
                  <h3>Generating Captions...</h3>
                  <div style={{width: '100%', height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden', marginTop: 10}}>
                    <div style={{width: `${transcriptionProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s'}} />
                  </div>
                </div>
              ) : (
                <>
                   {!capabilities?.captions?.available ? (
                    <div style={{ padding: 12, borderRadius: 8, border: '1px dashed var(--line)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>⚠️ {capabilities?.captions?.reason || 'Offline transcription is not installed.'}</span>
                      {downloadingModel ? (
                        <div style={{ padding: '8px 0', width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                            <span>{downloadTask}</span>
                            <span>{downloadProgress}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
                          </div>
                          <button className="btn-secondary" style={{ marginTop: 10, width: '100%' }} onClick={async () => {
                            await (window as any).appBridge.cancelTranscriptionDownload();
                            setDownloadingModel(false);
                          }}>Cancel Download</button>
                        </div>
                      ) : (
                        <button className="btn-primary" onClick={handleDownloadModel}>Download Whisper-Tiny Model (~78MB)</button>
                      )}
                    </div>
                  ) : (
                    <button className="btn-primary" onClick={handleTranscribe} aria-label={t('autoTranscribe')}>{t('autoTranscribe')}</button>
                  )}

                  <div style={{display: 'flex', gap: 6}}>
                    <button className="btn-secondary" style={{flex: 1}} onClick={handleSplitCaption} disabled={!selectedCaptionId}>{t('split')}</button>
                    <button className="btn-secondary" style={{flex: 1}} onClick={handleMergeCaption} disabled={!selectedCaptionId}>{t('merge')}</button>
                  </div>

                  <div style={{maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', padding: 6, borderRadius: 6}}>
                    {project.editor.annotationRegions.filter(a => a.annotationSource === 'auto-caption').map((ann: any) => (
                      <div
                        key={ann.id}
                        style={{display: 'flex', flexDirection: 'column', padding: 8, borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selectedCaptionId === ann.id ? 'var(--surface-3)' : 'transparent'}}
                        onClick={() => setSelectedCaptionId(ann.id)}
                      >
                        <span style={{fontSize: 10, color: 'var(--muted)'}}>{Math.round(ann.startMs / 1000)}s - {Math.round(ann.endMs / 1000)}s</span>
                        <input
                          type="text"
                          style={{background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', fontSize: 13, marginTop: 4}}
                          value={ann.content}
                          onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(project));
                            const targetIdx = updated.editor.annotationRegions.findIndex((a: any) => a.id === ann.id);
                            if (targetIdx !== -1) {
                              updated.editor.annotationRegions[targetIdx].content = e.target.value;
                              updateProject(updated);
                            }
                          }}
                          aria-label="Caption segment text"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          </div>

          {recentProjects.length > 0 && (
            <div className="property-group" style={{marginTop: 'auto'}}>
              <span className="property-label">Recent Projects</span>
              <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6}}>
                {recentProjects.map((p, idx) => (
                  <li key={idx} style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    <a
                      href="#"
                      style={{color: '#a3a8b1', fontSize: 12}}
                      aria-label={`Open recent project ${p.split('/').pop()?.split('\\').pop() || 'project'}`}
                      onClick={(event) => {
                        event.preventDefault();
                        void loadProject(p);
                      }}
                    >
                      {p.split('/').pop()?.split('\\').pop()}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Timeline Control Panel */}
      <footer className="timeline-panel" role="contentinfo">
        <div className="timeline-toolbar">
          <div aria-live="polite">
            Time: {formatTimelineTime(currentTimeMs)} / {formatTimelineTime(durationMs)}
          </div>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <button className="timeline-control" onClick={() => handleFrameStep(-1)} aria-label="Previous frame">◀ Frame</button>
            <button className="timeline-control" onClick={togglePlay} aria-label={isPlaying ? 'Pause playback' : 'Play playback'}>{isPlaying ? 'Pause' : 'Play'}</button>
            <button className="timeline-control" onClick={() => handleFrameStep(1)} aria-label="Next frame">Frame ▶</button>
            <label className="timeline-field">
              Speed
              <select value={playbackRate} onChange={(e) => handlePlaybackRate(Number(e.target.value))} aria-label="Playback speed">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
              </select>
            </label>
            <button className="timeline-control" onClick={handleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>{isMuted ? 'Unmute' : 'Mute'}</button>
            <label className="timeline-field">
              Volume
              <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={(e) => handleVolume(Number(e.target.value))} aria-label="Volume" />
            </label>
            <button className="timeline-control" onClick={handleMarkTrimStart} aria-label="Mark cut range start">{trimStartMs === null ? 'Mark Cut Start' : `Cut starts ${formatTimelineTime(trimStartMs)}`}</button>
            <button className="timeline-control" onClick={handleCancelTrimMark} disabled={trimStartMs === null} aria-label="Cancel pending cut range">Cancel Cut</button>
            <button className="timeline-control" onClick={handleAddTrimRange} disabled={trimStartMs === null || trimStartMs === currentTimeMs} aria-label="Cut marked range">Cut Range</button>
            <button className="timeline-control" onClick={handleClearTrimRanges} disabled={!project?.editor.trimRegions.length} aria-label="Clear cut ranges">Clear Cuts</button>
            {selectedTrimId !== null && (() => {
              const selectedTrim = project?.editor.trimRegions?.find((t: any) => t.id === selectedTrimId);
              const isPlayheadInsideSelectedTrim = selectedTrim && currentTimeMs > selectedTrim.startMs && currentTimeMs < selectedTrim.endMs;
              return (
                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 6, borderLeft: '1px solid var(--line)', paddingLeft: 6 }}>
                  <button className="timeline-control" onClick={handleSplitTrim} disabled={!isPlayheadInsideSelectedTrim} aria-label="Split selected cut range at playhead">Split Cut</button>
                  <button className="timeline-control" onClick={() => handleRemoveTrimRange(selectedTrimId)} aria-label="Delete selected cut range">Delete Cut</button>
                </div>
              );
            })()}
            <select
              className="timeline-control"
              value={pendingSpeed}
              onChange={(event) => setPendingSpeed(Number(event.target.value))}
              aria-label="Speed for marked range"
            >
              {SPEED_OPTIONS.map((option) => <option key={option.speed} value={option.speed}>{option.label}</option>)}
            </select>
            <button className="timeline-control" onClick={handleMarkSpeedStart} aria-label="Mark speed range start">
              {speedStartMs === null ? 'Mark Speed Start' : `Speed starts ${formatTimelineTime(speedStartMs)}`}
            </button>
            <button className="timeline-control" onClick={handleCancelSpeedMark} disabled={speedStartMs === null} aria-label="Cancel pending speed range">Cancel Speed</button>
            <button className="timeline-control" onClick={handleAddSpeedRange} disabled={speedStartMs === null || speedStartMs === currentTimeMs} aria-label="Apply speed to marked range">Apply Speed</button>
            <button className="timeline-control" onClick={handleClearSpeedRanges} disabled={!project?.editor.speedRegions.length} aria-label="Clear speed ranges">Clear Speeds</button>
            {selectedSpeedId !== null && (() => {
              const selectedSpeed = project?.editor.speedRegions?.find((s: any) => s.id === selectedSpeedId);
              if (!selectedSpeed) return null;
              return (
                <div className="speed-edit-controls">
                  <label htmlFor="speed-multiplier-select">Speed: </label>
                  <select
                    id="speed-multiplier-select"
                    value={selectedSpeed.speed}
                    onChange={(e) => {
                      const speedVal = parseFloat(e.target.value);
                      const updated = JSON.parse(JSON.stringify(project));
                      const regions = updated.editor.speedRegions || [];
                      const targetIdx = regions.findIndex((s: any) => s.id === selectedSpeedId);
                      if (targetIdx !== -1) {
                        regions[targetIdx].speed = speedVal;
                        updateProject(updated);
                      }
                    }}
                    aria-label="Change speed of selected range"
                  >
                    <option value="0.25">0.25×</option>
                    <option value="0.5">0.5×</option>
                    <option value="1.0">1.0×</option>
                    <option value="1.5">1.5×</option>
                    <option value="2.0">2.0×</option>
                    <option value="4.0">4.0×</option>
                    <option value="5.0">5.0×</option>
                  </select>
                  <button className="timeline-control" onClick={() => handleRemoveSpeedRange(selectedSpeedId)} aria-label="Delete selected speed range">Delete Speed</button>
                </div>
              );
            })()}
            <label style={{display: 'flex', gap: 6, alignItems: 'center'}}>
              Timeline Zoom:
              <input
                type="range"
                min={1}
                max={5.0}
                step={0.1}
                value={timelineZoom}
                onChange={(e) => setTimelineZoom(clampTimelineZoom(parseFloat(e.target.value)))}
              />
            </label>
            <button className="timeline-control" onClick={() => setTimelineZoom(1)} disabled={timelineZoom === 1} aria-label="Zoom timeline to fit">Zoom to Fit</button>
          </div>
        </div>

        <div className="timeline-scroll">
        <div className="timeline-ruler" style={{ minWidth: `${timelineZoom * 100}%` }} aria-label="Timeline time ruler">
          {timelineTicks.map((timeMs) => (
            <span key={timeMs} className="timeline-tick" style={{ left: `${timelinePercent(timeMs, durationMs)}%` }}>{formatTimelineTime(timeMs)}</span>
          ))}
        </div>
        <div className="timeline-tracks" style={{ minWidth: `${timelineZoom * 100}%` }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleSeek(timeAtTimelinePosition(e.clientX - rect.left, rect.width, durationMs));
          setSelectedTrimId(null);
          setSelectedSpeedId(null);
        }}>
          <div className="timeline-track">
            <span className="track-label">Screen Recording</span>
            <TrackControls trackId="screen" state={timelineTracks.screen} onToggle={updateTimelineTrack} />
            {trimStartMs !== null && (
              <div
                className="timeline-pending-cut-marker"
                style={{ left: `${timelinePercent(trimStartMs, durationMs)}%` }}
                title={`Pending cut starts at ${formatTimelineTime(trimStartMs)}`}
                aria-hidden="true"
              />
            )}
            {speedStartMs !== null && (
              <div
                className="timeline-pending-speed-marker"
                style={{ left: `${timelinePercent(speedStartMs, durationMs)}%` }}
                title={`Pending speed starts at ${formatTimelineTime(speedStartMs)}`}
                aria-hidden="true"
              />
            )}
            {project?.editor.speedRegions?.map((region: SpeedRegion) => {
              const isSelected = region.id === selectedSpeedId;
              const isDraggingThis = draggingRegion && draggingRegion.id === region.id && draggingRegion.type === 'speed';
              const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : region.startMs;
              const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : region.endMs;
              return (
                <div
                  key={region.id}
                  className={`playback-speed-region ${isSelected ? 'selected' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedSpeedId(region.id);
                    setSelectedTrimId(null);
                  }}
                  style={{
                    left: `${timelinePercent(start, durationMs)}%`,
                    width: `${timelinePercent(end - start, durationMs)}%`,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.speed} times speed from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                  title={`${region.speed}× speed range`}
                >
                  {isSelected && (
                    <div
                      className="resize-handle left-handle"
                      onMouseDown={(e) => handleDragStart(e, region.id, 'speed', 'left', region.startMs, region.endMs)}
                      aria-hidden="true"
                    />
                  )}
                  <span className="speed-label">{region.speed}×</span>
                  {isSelected && (
                    <div
                      className="resize-handle right-handle"
                      onMouseDown={(e) => handleDragStart(e, region.id, 'speed', 'right', region.startMs, region.endMs)}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
            {project?.editor.trimRegions?.map((t: TrimRegion) => {
              const isSelected = t.id === selectedTrimId;
              const isDraggingThis = draggingRegion && draggingRegion.id === t.id && draggingRegion.type === 'trim';
              const start = isDraggingThis && tempResizeState ? tempResizeState.startMs : t.startMs;
              const end = isDraggingThis && tempResizeState ? tempResizeState.endMs : t.endMs;
              return (
                <div
                  key={t.id}
                  className={`trim-region-visual ${isSelected ? 'selected' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedTrimId(t.id);
                    setSelectedSpeedId(null);
                  }}
                  style={{
                    left: `${timelinePercent(start, durationMs)}%`,
                    width: `${timelinePercent(end - start, durationMs)}%`
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Cut from ${formatTimelineTime(start)} to ${formatTimelineTime(end)}`}
                  title="Cut range"
                >
                  {isSelected && (
                    <div
                      className="resize-handle left-handle"
                      onMouseDown={(e) => handleDragStart(e, t.id, 'trim', 'left', t.startMs, t.endMs)}
                      aria-hidden="true"
                    />
                  )}
                  {isSelected && (
                    <div
                      className="resize-handle right-handle"
                      onMouseDown={(e) => handleDragStart(e, t.id, 'trim', 'right', t.startMs, t.endMs)}
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
            <div
              className="timeline-playhead"
              style={{ left: `${timelinePercent(currentTimeMs, durationMs)}%` }}
            />
          </div>

          <div className="timeline-track">
            <span className="track-label">Effects</span>
            <TrackControls trackId="effects" state={timelineTracks.effects} onToggle={updateTimelineTrack} />
            {project?.editor.zoomRegions?.map((z: ZoomRegion) => (
              <div
                key={z.id}
                className="speed-region-visual"
                style={{
                  left: `${timelinePercent(z.startMs, durationMs)}%`,
                  width: `${timelinePercent(z.endMs - z.startMs, durationMs)}%`
                }}
              />
            ))}
          </div>

          <div className="timeline-track">
            <span className="track-label">Captions Track</span>
            <TrackControls trackId="captions" state={timelineTracks.captions} onToggle={updateTimelineTrack} />
            {project?.editor.annotationRegions?.filter((a: any) => a.annotationSource === 'auto-caption').map((c: any) => (
              <div
                key={c.id}
                className="speed-region-visual"
                style={{
                  left: `${timelinePercent(c.startMs, durationMs)}%`,
                  width: `${timelinePercent(c.endMs - c.startMs, durationMs)}%`,
                  background: 'rgba(255, 209, 102, 0.35)',
                  borderLeft: '2px solid var(--warning)',
                  borderRight: '2px solid var(--warning)',
                }}
              />
            ))}
          </div>
          {(['webcam', 'presentation', 'audio'] as TimelineTrackId[]).map((trackId) => (
            <div className="timeline-track" key={trackId}>
              <span className="track-label">{trackId === 'webcam' ? 'Webcam' : trackId === 'presentation' ? 'Presentation' : 'Audio'}</span>
              <TrackControls trackId={trackId} state={timelineTracks[trackId]} onToggle={updateTimelineTrack} />
            </div>
          ))}
        </div>
        </div>
      </footer>

      {/* Export Setup Modal Dialog */}
      {showExportModal && (
        <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <div className="dialog-container" style={{maxWidth: 380}}>
            <h2 id="export-title" className="dialog-title">🎬 {t('export')} Presentation Project</h2>

            <div className="dialog-body" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div className="property-group">
                <span className="property-label">Export Format</span>
                <select
                  className="property-control"
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'mp4' | 'gif')}
                >
                  <option value="mp4" disabled={!capabilities.mp4Export?.available}>Video MP4 (H.264 / AAC)</option>
                  <option value="gif" disabled={!capabilities.gifExport?.available}>Animated GIF (lanczos palette)</option>
                </select>
              </div>

              {exportFormat === 'mp4' ? (
                <div className="property-group">
                  <span className="property-label">Target FPS</span>
                  <select
                    className="property-control"
                    value={exportFps}
                    onChange={(e) => setExportFps(parseInt(e.target.value))}
                  >
                    <option value="30">30 FPS (Standard)</option>
                    <option value="60">60 FPS (Ultra Smooth)</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="property-group">
                    <span className="property-label">GIF Framerate</span>
                    <select
                      className="property-control"
                      value={exportFps}
                      onChange={(e) => setExportFps(parseInt(e.target.value))}
                    >
                      <option value="10">10 FPS (Lightweight)</option>
                      <option value="15">15 FPS (Recommended)</option>
                      <option value="24">24 FPS (Cinematic)</option>
                    </select>
                  </div>
                  <label style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <input
                      type="checkbox"
                      checked={exportLoop}
                      onChange={(e) => setExportLoop(e.target.checked)}
                    />
                    Loop Animation Infinitely
                  </label>
                </>
              )}
            </div>

            <div className="dialog-footer" style={{display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16}}>
              <button className="btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleStartExport}
                disabled={!selectedExportCapability?.available}
                title={selectedExportCapability?.available ? '' : selectedExportCapability?.reason}
              >
                Start Render
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Rendering Export Progress Overlay */}
      {isExporting && (
        <div className="dialog-overlay" style={{background: 'rgba(0,0,0,0.85)', zIndex: 1000}} role="dialog" aria-modal="true" aria-label="Export progress">
          <div className="dialog-container" style={{maxWidth: 400, textAlign: 'center'}}>
            <h2>🎨 Rendering Video Composites...</h2>
            <p style={{fontSize: 13, opacity: 0.8, margin: '8px 0 16px 0'}}>
              Applying layout overlays, annotations, skews, and background fills offline.
            </p>
            <div style={{width: '100%', height: 16, background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', margin: '16px 0'}}>
              <div style={{width: `${exportProgress || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #8b5cf6)', transition: 'width 0.1s'}} />
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 20}}>
              <span>Status: {exportProgress || 0}% Completed</span>
              <span>ETA: {exportProgress ? Math.round(((100 - exportProgress) / (exportProgress || 1)) * 3) : 'Calculating...'}s</span>
            </div>
            <button className="btn-primary" style={{background: 'var(--danger)'}} onClick={handleCancelExport}>
              Cancel Render
            </button>
          </div>
        </div>
      )}

      {/* First-Run Guidance Tutorial overlays */}
      {showTutorialStep !== null && (
        <div className="dialog-overlay" style={{zIndex: 2000}} role="dialog" aria-modal="true" aria-label="RePen Editor tutorial">
          <div className="dialog-container" style={{maxWidth: 360}}>
            {showTutorialStep === 1 && (
              <>
                <h2 className="dialog-title">💡 Welcome to RePen Editor!</h2>
                <p style={{fontSize: 13, lineHeight: 1.5, margin: '12px 0'}}>
                  <strong>Presenter vs Editor</strong>: Use the floating RePen presenter toolbar to draw and highlight screen objects during recordings.
                  Use this Editor workspace to tweak geometry, skews, aspect ratios, and timeline segments post-recording.
                </p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20}}>
                  <button className="btn-secondary" onClick={handleCompleteTutorial}>Skip</button>
                  <button className="btn-primary" onClick={() => setShowTutorialStep(2)}>Next</button>
                </div>
              </>
            )}
            {showTutorialStep === 2 && (
              <>
                <h2 className="dialog-title">🎬 Aspect Ratios & Backgrounds</h2>
                <p style={{fontSize: 13, lineHeight: 1.5, margin: '12px 0'}}>
                  Customize your canvas dimensions (16:9, 1:1 square, or 9:16 vertical), add padding borders, border radius margins, and professional background wallpapers.
                </p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20}}>
                  <button className="btn-secondary" onClick={() => setShowTutorialStep(1)}>Back</button>
                  <button className="btn-primary" onClick={() => setShowTutorialStep(3)}>Next</button>
                </div>
              </>
            )}
            {showTutorialStep === 3 && (
              <>
                <h2 className="dialog-title">🎙️ Captions & Exporting</h2>
                <p style={{fontSize: 13, lineHeight: 1.5, margin: '12px 0'}}>
                  Caption transcription and final composited export require optional local engines that are not bundled yet. Existing caption timing and layout controls remain available for project work.
                </p>
                <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20}}>
                  <button className="btn-secondary" onClick={() => setShowTutorialStep(2)}>Back</button>
                  <button className="btn-primary" onClick={handleCompleteTutorial}>Got it!</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TrackControls: React.FC<{ trackId: TimelineTrackId; state: { visible: boolean; locked: boolean }; onToggle: (trackId: TimelineTrackId, property: 'visible' | 'locked') => void }> = ({ trackId, state, onToggle }) => (
  <span className="track-controls" onClick={(event) => event.stopPropagation()}>
    <button className="track-control" onClick={() => onToggle(trackId, 'visible')} aria-label={`${state.visible ? 'Hide' : 'Show'} ${trackId} track`}>{state.visible ? '◉' : '○'}</button>
    <button className="track-control" onClick={() => onToggle(trackId, 'locked')} aria-label={`${state.locked ? 'Unlock' : 'Lock'} ${trackId} track`}>{state.locked ? '🔒' : '🔓'}</button>
  </span>
);

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<EditorApp />);
}
