import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { PresenterRenderer } from './presenter/presenterRenderer';
import { seekPresentationTrack } from './presenter/presentationTrackReplay';
import { clampTimelineZoom, createTimelineTicks } from '../shared/editor/timelineMath';
import { addSpeedRange, addTrimRange, resizeTrimRange, resizeSpeedRange, splitTrimRange, addZoomRange } from '../shared/editor/timelineEdits';
import { DEFAULT_TIMELINE_TRACKS, type TimelineTrackId } from '../shared/editor/projectPersistence';
import { DEFAULT_PLAYBACK_SPEED, type ZoomRegion, type AnnotationRegion } from '../shared/editor/types';
import type { SceneAnnotation as PresenterSceneAnnotation } from '../shared/schemas/scene';

// Modular imports from index barrel file in the editor directory
import {
  useAppBridge,
  useCapabilities,
  useProjectManager,
  usePlaybackState,
  LayoutPanel,
  WebcamPanel,
  MotionPanel,
  AnnotationsPanel,
  CaptionsPanel,
  CompositorPreview,
  TimelinePanel,
  useResizableEditorLayout,
  EditorHeader,
  InspectorTabs,
  InspectorSection,
} from './editor/index';

import './editor.css';

const EDITOR_LOCALE_STORAGE_KEY = 'repen-editor-locale';
const EDITOR_TABS = [
  { id: 'layout', labelKey: 'layout' },
  { id: 'motion', labelKey: 'motion' },
  { id: 'webcam', labelKey: 'webcam' },
  { id: 'annotations', labelKey: 'overlay' },
  { id: 'captions', labelKey: 'captions' },
] as const;

type EditorTab = (typeof EDITOR_TABS)[number]['id'];
type EditorLocale = 'en' | 'es';

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
  const bridge = useAppBridge();
  const { capabilities } = useCapabilities();
  const pm = useProjectManager();
  const pb = usePlaybackState();
  const layout = useResizableEditorLayout();

  const [locale, setLocale] = useState<EditorLocale>(() => {
    const savedLocale = localStorage.getItem(EDITOR_LOCALE_STORAGE_KEY);
    return isEditorLocale(savedLocale) ? savedLocale : 'en';
  });

  const [activeTab, setActiveTab] = useState<EditorTab>('layout');
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);
  const [selectedSpeedId, setSelectedSpeedId] = useState<string | null>(null);

  // Suggested speed, zoom, drag resize
  const [pendingSpeed, setPendingSpeed] = useState(DEFAULT_PLAYBACK_SPEED);
  const [timelineZoom, setTimelineZoom] = useState(1.0);
  const [trimStartMs, setTrimStartMs] = useState<number | null>(null);
  const [speedStartMs, setSpeedStartMs] = useState<number | null>(null);
  const [autoZoomSuggestions, setAutoZoomSuggestions] = useState<any[]>([]);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);

  // Element dragging states
  const [draggingRegion, setDraggingRegion] = useState<{
    id: string;
    type: 'trim' | 'speed';
    side: 'left' | 'right';
    initialX: number;
    initialStartMs: number;
    initialEndMs: number;
  } | null>(null);
  const [tempResizeState, setTempResizeState] = useState<{ startMs: number; endMs: number } | null>(null);

  // Caption/transcribe downloading
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
  const [updateInfo, setUpdateInfo] = useState<{ available: boolean; version?: string; url?: string } | null>(null);

  // Tutorial overlay
  const [showTutorialStep, setShowTutorialStep] = useState<number | null>(() => {
    const completed = localStorage.getItem('repen-editor-tutorial-completed');
    return completed === 'true' ? null : 1;
  });

  const selectedExportCapability = exportFormat === 'gif' ? capabilities.gifExport : capabilities.mp4Export;

  // Translate helper
  const t = (key: string): string => TRANSLATIONS[locale]?.[key] || TRANSLATIONS['en']?.[key] || key;

  useEffect(() => {
    localStorage.setItem(EDITOR_LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  // Initial bootstrap and load notifications
  useEffect(() => {
    const bootstrap = async () => {
      if (bridge.getBootstrap) {
        const data = await bridge.getBootstrap();
        if (data?.projectPath) {
          void pm.loadProject(data.projectPath);
        }
      }
      if (bridge.checkUpdates) {
        try {
          const res = await bridge.checkUpdates();
          if (res?.success && res.updateAvailable) {
            setUpdateInfo({ available: true, version: res.version, url: res.url });
          }
        } catch (e) {
          console.error('Failed check for updates:', e);
        }
      }
    };
    bootstrap();

    if (bridge.onEditorLoadProject) {
      bridge.onEditorLoadProject((path: string) => {
        void pm.loadProject(path);
      });
    }

    if (bridge.onExportProgress) {
      bridge.onExportProgress((progressData) => {
        setExportProgress(progressData.progress);
      });
    }
  }, [bridge, pm]);

  // Draw overlay annotations & subtitles onto canvas
  const drawAnnotations = (timeMs: number) => {
    const canvas = pb.canvasRef.current;
    const video = pb.videoRef.current;
    if (!canvas || !video || !pm.project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw sidecar presentationTrack
    const timelineTracks = pm.project.editor.timelineTracks || DEFAULT_TIMELINE_TRACKS;
    const track = pm.project.media?.presentationMode === 'sidecar' && timelineTracks.presentation.visible ? (pm.project as any).presentationTrack : null;
    if (track) {
      const snapshot = seekPresentationTrack(track, timeMs);
      const renderer = new PresenterRenderer(ctx);

      const scaleX = rect.width / (track.header?.width || 1920);
      const scaleY = rect.height / (track.header?.height || 1080);

      if (snapshot.board && snapshot.board.backgroundMode !== 'transparent') {
        ctx.save();
        ctx.fillStyle = snapshot.board.boardColor || (snapshot.board.backgroundMode === 'blackboard' ? '#18181c' : '#ffffff');
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.restore();
      }

      ctx.save();
      ctx.scale(scaleX, scaleY);
      if (snapshot.annotations) {
        for (const stroke of snapshot.annotations) {
          renderer.drawStroke(stroke as unknown as PresenterSceneAnnotation);
        }
      }
      ctx.restore();

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

    // 2. Draw Editor custom annotations
    const customAnnotations: AnnotationRegion[] = pm.project.editor.annotationRegions || [];
    const activeAnns = customAnnotations.filter(
      (ann: AnnotationRegion) =>
        timeMs >= ann.startMs &&
        timeMs <= ann.endMs &&
        (ann.annotationSource === 'auto-caption' ? timelineTracks.captions.visible : timelineTracks.effects.visible),
    );

    const sortedAnns = [...activeAnns].sort((a: AnnotationRegion, b: AnnotationRegion) => (a.zIndex || 0) - (b.zIndex || 0));

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
          tempCtx.drawImage(
            video,
            ((ann.position?.x ?? 50) / 100) * video.videoWidth,
            ((ann.position?.y ?? 50) / 100) * video.videoHeight,
            ((ann.size?.width ?? 20) / 100) * video.videoWidth,
            ((ann.size?.height ?? 20) / 100) * video.videoHeight,
            0,
            0,
            16,
            16,
          );
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

  // Playback sync effects
  useEffect(() => {
    const video = pb.videoRef.current;
    if (video) {
      pb.coordinatorRef.current.setElements(video, pb.webcamVideoRef.current, null);
      if (pm.project?.editor) {
        pb.coordinatorRef.current.setRegions(pm.project.editor.speedRegions || [], pm.project.editor.trimRegions || []);
      }
    }
  }, [pm.project, pm.mediaMissing, pb]);

  // Request Animation Frame ticker
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (pb.videoRef.current) {
        const timeSec = pb.videoRef.current.currentTime;
        const timeMs = Math.round(timeSec * 1000);
        pb.setCurrentTimeMs(timeMs);
        pb.coordinatorRef.current.updatePlaybackRate();
        pb.coordinatorRef.current.syncWebcamAndAudio();
        drawAnnotations(timeMs);
      }
      animId = requestAnimationFrame(tick);
    };

    if (pb.isPlaying) {
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [pb.isPlaying, pm.project, pb]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void pm.handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) pm.handleRedo(); else pm.handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        pm.handleRedo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        pb.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) pb.handleFrameStep(-1); else pb.handleSeek(Math.max(0, pb.currentTimeMs - 100), pm.project);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) pb.handleFrameStep(1); else pb.handleSeek(Math.min(pb.durationMs, pb.currentTimeMs + 100), pm.project);
      } else if (e.code === 'Home') {
        e.preventDefault();
        pb.handleSeek(0, pm.project);
      } else if (e.code === 'End') {
        e.preventDefault();
        pb.handleSeek(pb.durationMs, pm.project);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pb.isPlaying, pb.currentTimeMs, pb.durationMs, pm]);

  // Before unload confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pm.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pm.isDirty]);

  // Zoom management
  const handleAddZoom = () => {
    if (!pm.project) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    const newZoom: ZoomRegion = {
      id: `zoom-${Date.now()}`,
      startMs: pb.currentTimeMs,
      endMs: Math.min(pb.durationMs, pb.currentTimeMs + 3000),
      depth: 2,
      focus: { cx: 0.5, cy: 0.5 },
      focusMode: 'manual',
      rotationPreset: undefined,
    };
    updated.editor.zoomRegions.push(newZoom);
    pm.updateProject(updated);
    setSelectedZoomId(newZoom.id);
  };

  const handleRemoveZoom = (id: string) => {
    if (!pm.project) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    updated.editor.zoomRegions = updated.editor.zoomRegions.filter((r: ZoomRegion) => r.id !== id);
    pm.updateProject(updated);
    if (selectedZoomId === id) setSelectedZoomId(null);
  };

  const handleScanSuggestions = () => {
    if (!pm.project) return;
    const telemetry = (pm.project as any).cursorTelemetry || [];
    const clicks = telemetry.filter((p: any) => p.interactionType === 'click');

    const proposed: any[] = [];
    let idx = 1;
    for (const click of clicks) {
      const startMs = Math.max(0, click.timeMs - 500);
      const endMs = Math.min(pb.durationMs, click.timeMs + 2500);

      const overlaps = pm.project.editor.zoomRegions.some(
        (r: ZoomRegion) => startMs < r.endMs && endMs > r.startMs,
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
    if (!pm.project) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    updated.editor.zoomRegions = addZoomRange(updated.editor.zoomRegions, s, pb.durationMs);
    pm.updateProject(updated);

    setAutoZoomSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    setSelectedZoomId(s.id);
  };

  const handleDismissSuggestion = (id: string) => {
    setAutoZoomSuggestions((prev) => prev.filter((x) => x.id !== id));
  };

  // Annotations management
  const handleAddAnnotation = () => {
    if (!pm.project) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    const newAnn: AnnotationRegion = {
      id: `ann-${Date.now()}`,
      startMs: pb.currentTimeMs,
      endMs: Math.min(pb.durationMs, pb.currentTimeMs + 3000),
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
    pm.updateProject(updated);
    setSelectedAnnotationId(newAnn.id);
  };

  const handleRemoveAnnotation = (id: string) => {
    if (!pm.project) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    updated.editor.annotationRegions = updated.editor.annotationRegions.filter((r: AnnotationRegion) => r.id !== id);
    pm.updateProject(updated);
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  // Transcription model downloading progress
  useEffect(() => {
    if (bridge.onTranscriptionDownloadProgress) {
      return bridge.onTranscriptionDownloadProgress((data) => {
        if (data) {
          setDownloadTask(data.task || '');
          setDownloadProgress(data.progress || 0);
          if (data.progress === 100) {
            setTimeout(() => {
              setDownloadingModel(false);
            }, 1000);
          }
        }
      });
    }
  }, [bridge]);

  const handleDownloadModel = async () => {
    if (downloadingModel) return;
    setDownloadingModel(true);
    setDownloadProgress(0);
    setDownloadTask('Starting download...');
    const res = await bridge.downloadTranscriptionModel();
    if (!res.success) {
      alert(`Download failed: ${res.error || 'Unknown error'}`);
      setDownloadingModel(false);
    }
  };

  const handleTranscribe = async () => {
    if (!pm.project) return;
    setIsTranscribing(true);
    setTranscriptionProgress(10);

    const videoPath = pm.project.media?.screenVideoPath || pm.project.videoPath || '';
    if (bridge.transcribeRecording) {
      setTranscriptionProgress(40);
      const res = await bridge.transcribeRecording(videoPath);
      setTranscriptionProgress(80);
      if (res.success && res.segments) {
        const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
        updated.editor.annotationRegions = updated.editor.annotationRegions.filter(
          (ann: AnnotationRegion) => ann.annotationSource !== 'auto-caption',
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
        pm.updateProject(updated);
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

  const handleSplitCaption = () => {
    if (!pm.project || !selectedCaptionId) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    const list = updated.editor.annotationRegions;
    const idx = list.findIndex((a: AnnotationRegion) => a.id === selectedCaptionId);
    if (idx === -1) return;
    const target = list[idx];

    if (pb.currentTimeMs > target.startMs && pb.currentTimeMs < target.endMs) {
      const originalEnd = target.endMs;
      target.endMs = pb.currentTimeMs;

      const nextCaption: AnnotationRegion = {
        ...JSON.parse(JSON.stringify(target)),
        id: `ann-split-${Date.now()}`,
        startMs: pb.currentTimeMs,
        endMs: originalEnd,
        content: 'Split text here',
      };

      list.push(nextCaption);
      pm.updateProject(updated);
      setSelectedCaptionId(nextCaption.id);
    }
  };

  const handleMergeCaption = () => {
    if (!pm.project || !selectedCaptionId) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    const list = updated.editor.annotationRegions;
    const idx = list.findIndex((a: AnnotationRegion) => a.id === selectedCaptionId);
    if (idx === -1) return;
    const target = list[idx];

    const autoCaptions = list.filter((a: AnnotationRegion) => a.annotationSource === 'auto-caption');
    autoCaptions.sort((a: AnnotationRegion, b: AnnotationRegion) => a.startMs - b.startMs);
    const currIdx = autoCaptions.findIndex((a: AnnotationRegion) => a.id === selectedCaptionId);
    if (currIdx === -1 || currIdx === autoCaptions.length - 1) return;

    const nextTarget = autoCaptions[currIdx + 1];
    target.endMs = nextTarget.endMs;
    target.content = `${target.content} ${nextTarget.content}`;

    updated.editor.annotationRegions = list.filter((a: AnnotationRegion) => a.id !== nextTarget.id);
    pm.updateProject(updated);
  };

  // Timeline resize actions
  const handleDragStart = (
    event: React.MouseEvent,
    id: string,
    type: 'trim' | 'speed',
    side: 'left' | 'right',
    startMs: number,
    endMs: number,
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

  useEffect(() => {
    if (!draggingRegion) return;

    const handleMouseMove = (event: MouseEvent) => {
      const timelineTracksEl = document.querySelector('.timeline-tracks');
      if (!timelineTracksEl) return;
      const rect = timelineTracksEl.getBoundingClientRect();
      const deltaX = event.clientX - draggingRegion.initialX;
      const deltaMs = (deltaX / rect.width) * pb.durationMs;

      let newStartMs = draggingRegion.initialStartMs;
      let newEndMs = draggingRegion.initialEndMs;

      if (draggingRegion.side === 'left') {
        newStartMs = Math.min(draggingRegion.initialEndMs - 100, Math.max(0, draggingRegion.initialStartMs + deltaMs));
      } else {
        newEndMs = Math.min(pb.durationMs, Math.max(draggingRegion.initialStartMs + 100, draggingRegion.initialEndMs + deltaMs));
      }

      setTempResizeState({ startMs: Math.round(newStartMs), endMs: Math.round(newEndMs) });
    };

    const handleMouseUp = () => {
      if (tempResizeState && pm.project) {
        const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
        if (draggingRegion.type === 'trim') {
          updated.editor.trimRegions = resizeTrimRange(
            updated.editor.trimRegions || [],
            draggingRegion.id,
            tempResizeState.startMs,
            tempResizeState.endMs,
            pb.durationMs,
          );
        } else {
          updated.editor.speedRegions = resizeSpeedRange(
            updated.editor.speedRegions || [],
            draggingRegion.id,
            tempResizeState.startMs,
            tempResizeState.endMs,
            pb.durationMs,
          );
        }
        pm.updateProject(updated);
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
  }, [draggingRegion, tempResizeState, pm.project, pb.durationMs, pm]);

  const handleUpdateTimelineTrack = (trackId: TimelineTrackId, property: 'visible' | 'locked') => {
    if (!pm.project || (pm.project.editor.timelineTracks[trackId].locked && property !== 'locked')) return;
    const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
    updated.editor.timelineTracks[trackId][property] = !updated.editor.timelineTracks[trackId][property];
    pm.updateProject(updated);
  };



  // Export pipeline
  const handleStartExport = async () => {
    if (!pm.project) return;
    if (!selectedExportCapability?.available) {
      alert(selectedExportCapability?.reason || 'Capabilities unavailable');
      return;
    }

    let pathSuggested = `RePen_Export.${exportFormat}`;
    if (pm.projectPath) {
      const folder = pm.projectPath.substring(0, pm.projectPath.lastIndexOf('/'));
      pathSuggested = `${folder}/export.${exportFormat}`;
    }

    setExportOutputPath(pathSuggested);
    setIsExporting(true);
    setExportProgress(0);

    if (bridge.exportProject) {
      const res = await bridge.exportProject(pm.project, {
        outputPath: pathSuggested,
        format: exportFormat,
        fps: exportFps,
        loop: exportLoop,
        durationMs: pb.durationMs,
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
    if (bridge.cancelExport) {
      await bridge.cancelExport(exportOutputPath);
      setIsExporting(false);
      setExportProgress(null);
      alert('Export canceled.');
    }
  };



  const handleExportDiagnostics = async () => {
    if (bridge.exportDiagnostics) {
      const res = await bridge.exportDiagnostics();
      if (res.success) {
        alert(`Redacted diagnostics logs exported successfully to:\n${res.path}`);
      } else if (res.error !== 'Canceled') {
        alert(`Failed to export diagnostics: ${res.error}`);
      }
    }
  };

  const handleCompleteTutorial = () => {
    setShowTutorialStep(null);
    localStorage.setItem('repen-editor-tutorial-completed', 'true');
  };

  const timelineTicks = createTimelineTicks(pb.durationMs, timelineZoom);
  const timelineTracks = pm.project?.editor.timelineTracks || DEFAULT_TIMELINE_TRACKS;

  return (
    <div
      className="editor-layout"
      role="application"
      aria-label={t('title')}
      style={{
        display: 'grid',
        gridTemplateRows: `56px 1fr 4px ${layout.timelineHeight}px`,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <EditorHeader
        projectPath={pm.projectPath}
        saveStatus={pm.isDirty ? 'unsaved' : pm.saveStatus}
        isSaving={pm.saveStatus === 'saving'}
        canUndo={pm.canUndo}
        canRedo={pm.canRedo}
        capabilities={capabilities}
        locale={locale}
        onSave={() => void pm.handleSave()}
        onUndo={pm.handleUndo}
        onRedo={pm.handleRedo}
        onExport={() => setShowExportModal(true)}
        onClose={() => void pm.handleCloseEditor()}
        onExportDiagnostics={handleExportDiagnostics}
        onLocaleChange={(nextLocale) => {
          if (nextLocale === 'en' || nextLocale === 'es') {
            setLocale(nextLocale);
          }
        }}
        onResetLayout={layout.resetLayout}
        t={t}
      />

      {/* Notices */}
      {pm.editorNotice && (
        <div className="editor-notice" role="alert">
          <span>{pm.editorNotice}</span>
          <button className="menu-btn" onClick={() => pm.setEditorNotice(null)} aria-label="Dismiss message">Dismiss</button>
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
              {"\u2715"}
            </button>
          </div>
        </div>
      )}

      {/* Workspace Area */}
      <div
        className="editor-workspace"
        style={{
          display: 'grid',
          gridTemplateColumns: `1fr 4px ${layout.inspectorWidth}px`,
          minHeight: 0,
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Preview Panel */}
        <div className="preview-panel" role="region" aria-label="Video Player Preview">
          <CompositorPreview
            project={pm.project}
            currentTimeMs={pb.currentTimeMs}
            sourceVideoWidth={pb.sourceVideoWidth}
            sourceVideoHeight={pb.sourceVideoHeight}
            cursorPosition={pb.cursorPosition}
            reducedMotion={pb.reducedMotion}
            mediaMissing={pm.mediaMissing}
            onMetadataLoaded={pb.handleMetadataLoaded}
            onIsPlayingChange={() => {}}
            onVolumeChange={() => {}}
            onRelink={pm.handleRelinkMedia}
            onRevealMedia={pm.handleRevealMissingMedia}
            onRemoveMedia={pm.handleRemoveMissingMedia}
            onWebcamNoticeChange={pm.setEditorNotice}
            timelineTracks={timelineTracks}
            isPlaying={pb.isPlaying}
            onTogglePlay={pb.togglePlay}
            onUpdateProject={pm.updateProject}
          />
        </div>

        {/* Inspector Resizer handle */}
        <div
          role="separator"
          aria-valuenow={layout.inspectorWidth}
          aria-valuemin={300}
          aria-valuemax={440}
          aria-label="Inspector width resizer"
          tabIndex={0}
          style={{
            width: 4,
            cursor: 'col-resize',
            background: layout.isResizingInspector ? 'var(--accent)' : 'var(--line)',
            transition: 'background 0.2s',
          }}
          onPointerDown={layout.handleInspectorResizeStart}
          onPointerMove={layout.handleInspectorResizeMove}
          onPointerUp={layout.handleInspectorResizeEnd}
          onKeyDown={layout.handleInspectorKeyDown}
        />

        {/* Sidebar settings panel */}
        <aside
          className="properties-panel"
          role="complementary"
          aria-label="Properties Editor"
          style={{
            width: layout.inspectorWidth,
            minWidth: layout.inspectorWidth,
            maxWidth: layout.inspectorWidth,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 12,
            boxSizing: 'border-box',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <InspectorTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            t={t}
            isCompactMode={layout.inspectorWidth < 350}
          />

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <InspectorSection activeTab={activeTab} t={t}>
              {pm.project && activeTab === 'layout' && (
                <LayoutPanel
                  project={pm.project}
                  onUpdate={pm.updateProject}
                  t={t}
                />
              )}

              {pm.project && activeTab === 'motion' && (
                <MotionPanel
                  project={pm.project}
                  currentTimeMs={pb.currentTimeMs}
                  durationMs={pb.durationMs}
                  selectedZoomId={selectedZoomId}
                  reducedMotion={pb.reducedMotion}
                  autoZoomSuggestions={autoZoomSuggestions}
                  showSuggestionsPanel={showSuggestionsPanel}
                  onUpdate={pm.updateProject}
                  onSelectZoom={setSelectedZoomId}
                  onAddZoom={handleAddZoom}
                  onRemoveZoom={handleRemoveZoom}
                  onReducedMotionChange={() => {}}
                  onScanSuggestions={handleScanSuggestions}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismissSuggestion={handleDismissSuggestion}
                  onShowSuggestionsChange={setShowSuggestionsPanel}
                />
              )}

              {pm.project && activeTab === 'webcam' && (
                <WebcamPanel
                  project={pm.project}
                  onUpdate={pm.updateProject}
                />
              )}

              {pm.project && activeTab === 'annotations' && (
                <AnnotationsPanel
                  project={pm.project}
                  selectedAnnotationId={selectedAnnotationId}
                  onUpdate={pm.updateProject}
                  onSelectAnnotation={setSelectedAnnotationId}
                  onAddAnnotation={handleAddAnnotation}
                  onRemoveAnnotation={handleRemoveAnnotation}
                />
              )}

              {pm.project && activeTab === 'captions' && (
                <CaptionsPanel
                  project={pm.project}
                  capabilities={capabilities}
                  isTranscribing={isTranscribing}
                  transcriptionProgress={transcriptionProgress}
                  downloadingModel={downloadingModel}
                  downloadProgress={downloadProgress}
                  downloadTask={downloadTask}
                  selectedCaptionId={selectedCaptionId}
                  t={t}
                  onUpdate={pm.updateProject}
                  onSelectCaption={setSelectedCaptionId}
                  onTranscribe={handleTranscribe}
                  onDownloadModel={handleDownloadModel}
                  onCancelDownload={() => {
                    bridge.cancelTranscriptionDownload().then(() => {
                      setDownloadingModel(false);
                    });
                  }}
                  onSplitCaption={handleSplitCaption}
                  onMergeCaption={handleMergeCaption}
                />
              )}
            </InspectorSection>
          </div>

          {pm.recentProjects.length > 0 && layout.inspectorWidth >= 340 && (
            <div className="property-group" style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span className="property-label">Recent Projects</span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pm.recentProjects.slice(0, 3).map((p: string, idx: number) => (
                  <li key={idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a
                      href="#"
                      style={{ color: '#a3a8b1', fontSize: 11 }}
                      aria-label={`Open recent project ${p.split('/').pop()?.split('\\').pop() || 'project'}`}
                      onClick={(event) => {
                        event.preventDefault();
                        void pm.loadProject(p);
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

      {/* Timeline Resizer handle */}
      <div
        role="separator"
        aria-valuenow={layout.timelineHeight}
        aria-valuemin={230}
        aria-valuemax={500}
        aria-label="Timeline height resizer"
        tabIndex={0}
        style={{
          height: 4,
          cursor: 'row-resize',
          background: layout.isResizingTimeline ? 'var(--accent)' : 'var(--line)',
          transition: 'background 0.2s',
          zIndex: 10
        }}
        onPointerDown={layout.handleTimelineResizeStart}
        onPointerMove={layout.handleTimelineResizeMove}
        onPointerUp={layout.handleTimelineResizeEnd}
        onKeyDown={layout.handleTimelineKeyDown}
      />

      {/* Timeline Controls */}
      <TimelinePanel
        project={pm.project}
        currentTimeMs={pb.currentTimeMs}
        durationMs={pb.durationMs}
        isPlaying={pb.isPlaying}
        volume={pb.volume}
        isMuted={pb.isMuted}
        playbackRate={pb.playbackRate}
        timelineZoom={timelineZoom}
        timelineTicks={timelineTicks}
        selectedTrimId={selectedTrimId}
        selectedSpeedId={selectedSpeedId}
        trimStartMs={trimStartMs}
        speedStartMs={speedStartMs}
        pendingSpeed={pendingSpeed}
        draggingRegion={draggingRegion}
        tempResizeState={tempResizeState}
        onTogglePlay={pb.togglePlay}
        onFrameStep={pb.handleFrameStep}
        onSeek={(ms: number) => pb.handleSeek(ms, pm.project)}
        onPlaybackRate={pb.handlePlaybackRate}
        onVolume={pb.handleVolume}
        onMute={pb.handleMute}
        onMarkTrimStart={() => setTrimStartMs(pb.currentTimeMs)}
        onCancelTrimMark={() => setTrimStartMs(null)}
        onAddTrimRange={() => {
          if (!pm.project || trimStartMs === null) return;
          const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
          updated.editor.trimRegions = addTrimRange(updated.editor.trimRegions || [], trimStartMs, pb.currentTimeMs, pb.durationMs);
          pm.updateProject(updated);
          setTrimStartMs(null);
        }}
        onClearTrimRanges={() => {
          if (!pm.project) return;
          const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
          updated.editor.trimRegions = [];
          pm.updateProject(updated);
          setTrimStartMs(null);
        }}
        onSplitTrim={() => {
          if (!pm.project || !selectedTrimId) return;
          const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
          updated.editor.trimRegions = splitTrimRange(updated.editor.trimRegions || [], selectedTrimId, pb.currentTimeMs);
          pm.updateProject(updated);
          setSelectedTrimId(null);
        }}
        onSelectTrimId={setSelectedTrimId}
        onMarkSpeedStart={() => setSpeedStartMs(pb.currentTimeMs)}
        onCancelSpeedMark={() => setSpeedStartMs(null)}
        onAddSpeedRange={() => {
          if (!pm.project || speedStartMs === null) return;
          const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
          updated.editor.speedRegions = addSpeedRange(
            updated.editor.speedRegions || [],
            speedStartMs,
            pb.currentTimeMs,
            pendingSpeed,
            pb.durationMs,
          );
          pm.updateProject(updated);
          setSpeedStartMs(null);
        }}
        onClearSpeedRanges={() => {
          if (!pm.project) return;
          const updated = JSON.parse(JSON.stringify(pm.project)) as typeof pm.project;
          updated.editor.speedRegions = [];
          pm.updateProject(updated);
          setSpeedStartMs(null);
        }}
        onSelectSpeedId={setSelectedSpeedId}
        onTimelineZoomChange={(zoomVal: number) => setTimelineZoom(clampTimelineZoom(zoomVal))}
        onPendingSpeedChange={setPendingSpeed}
        onDragStart={handleDragStart}
        onUpdateTimelineTrack={handleUpdateTimelineTrack}
        timelineTracks={timelineTracks}
        selectedCaptionId={selectedCaptionId}
        onSplitCaption={handleSplitCaption}
        onMergeCaption={handleMergeCaption}
      />

      {/* Export Setup Modal Dialog */}
      {showExportModal && (
        <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <div className="dialog-container" style={{ maxWidth: 380 }}>
            <h2 id="export-title" className="dialog-title">{"\uD83C\uDFAC"} {t('export')} Presentation Project</h2>

            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

            <div className="dialog-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
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
        <div className="dialog-overlay" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }} role="dialog" aria-modal="true" aria-label="Export progress">
          <div className="dialog-container" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2>🎨 Rendering Video Composites...</h2>
            <p style={{ fontSize: 13, opacity: 0.8, margin: '8px 0 16px 0' }}>
              Applying layout overlays, annotations, skews, and background fills offline.
            </p>
            <div style={{ width: '100%', height: 16, background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', margin: '16px 0' }}>
              <div style={{ width: `${exportProgress || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), #8b5cf6)', transition: 'width 0.1s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
              <span>Status: {exportProgress || 0}% Completed</span>
              <span>ETA: {exportProgress ? Math.round(((100 - exportProgress) / (exportProgress || 1)) * 3) : 'Calculating...'}s</span>
            </div>
            <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={handleCancelExport}>
              Cancel Render
            </button>
          </div>
        </div>
      )}

      {/* First-Run Guidance Tutorial overlays */}
      {showTutorialStep !== null && (
        <div className="dialog-overlay" style={{ zIndex: 2000 }} role="dialog" aria-modal="true" aria-label="RePen Editor tutorial">
          <div className="dialog-container" style={{ maxWidth: 360 }}>
            {showTutorialStep === 1 && (
              <>
                <h2 className="dialog-title">💡 Welcome to RePen Editor!</h2>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: '12px 0' }}>
                  <strong>Presenter vs Editor</strong>: Use the floating RePen presenter toolbar to draw and highlight screen objects during recordings.
                  Use this Editor workspace to tweak geometry, skews, aspect ratios, and timeline segments post-recording.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                  <button className="btn-secondary" onClick={handleCompleteTutorial}>Skip</button>
                  <button className="btn-primary" onClick={() => setShowTutorialStep(2)}>Next</button>
                </div>
              </>
            )}
            {showTutorialStep === 2 && (
              <>
                <h2 className="dialog-title">{"\uD83C\uDFAC"} Aspect Ratios & Backgrounds</h2>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: '12px 0' }}>
                  Customize your canvas dimensions (16:9, 1:1 square, or 9:16 vertical), add padding borders, border radius margins, and professional background wallpapers.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                  <button className="btn-secondary" onClick={() => setShowTutorialStep(1)}>Back</button>
                  <button className="btn-primary" onClick={() => setShowTutorialStep(3)}>Next</button>
                </div>
              </>
            )}
            {showTutorialStep === 3 && (
              <>
                <h2 className="dialog-title">💡 Captions & Exporting</h2>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: '12px 0' }}>
                  Caption transcription and final composited export require optional local engines that are not bundled yet. Existing caption timing and layout controls remain available for project work.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
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

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<EditorApp />);
}
