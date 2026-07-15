import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { PlaybackCoordinator } from './presenter/editor/playbackCoordinator';
import { PresenterRenderer } from './presenter/presenterRenderer';
import { seekPresentationTrack } from './presenter/presentationTrackReplay';
import { toFileUrl, fromFileUrl, validateProjectData, migrateProjectData } from '../shared/editor/projectPersistence';
import type { EditorProjectData } from '../shared/editor/projectPersistence';
import type { TrimRegion, SpeedRegion, ZoomRegion, AnnotationRegion, WebcamPosition, WebcamMaskShape, WebcamLayoutPreset, AspectRatio } from '../shared/editor/types';
import './editor.css';

const RECENT_PROJECTS_KEY = 'repen-recent-projects';

const EditorApp: React.FC = () => {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [project, setProject] = useState<EditorProjectData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<EditorProjectData[]>([]);
  const [future, setFuture] = useState<EditorProjectData[]>([]);

  // Media loading & relinking
  const [mediaMissing, setMediaMissing] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>(() => 
    JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]')
  );

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(10000); // fallback default
  const [volume, setVolume] = useState(1.0);
  const [timelineZoom, setTimelineZoom] = useState(1.0);

  // UI States
  const [activeTab, setActiveTab] = useState<'layout' | 'motion' | 'webcam' | 'annotations'>('layout');
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Snap, tracks controls
  const [timelineSnap, setTimelineSnap] = useState(true);

  // Element Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordinatorRef = useRef(new PlaybackCoordinator());

  // Bootstrap initialization
  useEffect(() => {
    const init = async () => {
      if ((window as any).appBridge?.getBootstrap) {
        const bootstrapData = await (window as any).appBridge.getBootstrap();
        if (bootstrapData?.projectPath) {
          loadProject(bootstrapData.projectPath);
        }
      }
    };
    init();

    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.on('editor:load-project', (_: any, path: string) => {
        loadProject(path);
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
        // Ensure regions arrays exist in editor state
        const proj = res.project;
        if (!proj.editor) proj.editor = {};
        if (!proj.editor.zoomRegions) proj.editor.zoomRegions = [];
        if (!proj.editor.annotationRegions) proj.editor.annotationRegions = [];
        if (!proj.editor.trimRegions) proj.editor.trimRegions = [];
        if (!proj.editor.speedRegions) proj.editor.speedRegions = [];

        setProject(proj);
        setProjectPath(res.path);
        setIsDirty(false);
        setHistory([]);
        setFuture([]);
        addToRecent(res.path);
        setMediaMissing(false);
      } else {
        alert(`Failed to load project: ${res.message}`);
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
    if (!project || !projectPath) return;
    if ((window as any).appBridge?.saveProjectFile) {
      const res = await (window as any).appBridge.saveProjectFile(project, '', projectPath);
      if (res.success) {
        setIsDirty(false);
        alert('Project saved successfully!');
      } else {
        alert(`Save failed: ${res.error}`);
      }
    }
  };

  // Playback sync
  useEffect(() => {
    const coord = coordinatorRef.current;
    const video = videoRef.current;
    if (video) {
      coord.setElements(video, null, null);
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
    }
  };

  // Draw overlay annotations onto canvas
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

    // 1. Draw sidecar PresentationTrack annotations
    const track = (project as any).presentationTrack;
    if (track) {
      const snapshot = seekPresentationTrack(track, timeMs);
      const renderer = new PresenterRenderer(ctx);
      
      const scaleX = rect.width / (track.header?.width || 1920);
      const scaleY = rect.height / (track.header?.height || 1080);
      
      ctx.save();
      ctx.scale(scaleX, scaleY);
      
      if (snapshot.annotations) {
        for (const stroke of snapshot.annotations) {
          renderer.drawStroke(stroke);
        }
      }
      ctx.restore();
    }

    // 2. Draw Editor custom text/blur annotations
    const customAnnotations = project.editor.annotationRegions || [];
    const activeAnns = customAnnotations.filter(ann => timeMs >= ann.startMs && timeMs <= ann.endMs);
    
    ctx.save();
    for (const ann of activeAnns) {
      if (ann.type === 'text') {
        ctx.fillStyle = ann.style.color || '#ffffff';
        ctx.font = `${ann.style.fontWeight === 'bold' ? 'bold ' : ''}${ann.style.fontSize * (rect.height / 800)}px ${ann.style.fontFamily || 'Inter'}`;
        ctx.textAlign = ann.style.textAlign || 'center';
        
        const posX = (ann.position.x / 100) * rect.width;
        const posY = (ann.position.y / 100) * rect.height;
        ctx.fillText(ann.content, posX, posY);
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

  // Seek
  const handleSeek = (timeMs: number) => {
    coordinatorRef.current.seek(timeMs);
    setCurrentTimeMs(timeMs);
    drawAnnotations(timeMs);
  };

  // Missing media relink
  const handleRelink = async () => {
    if ((window as any).appBridge?.selectDirectory) {
      const folder = await (window as any).appBridge.selectDirectory();
      if (folder && project) {
        const updated = JSON.parse(JSON.stringify(project));
        if (!updated.media) updated.media = {};
        updated.media.screenVideoPath = `${folder}/recording.mp4`;
        updateProject(updated);
        setMediaMissing(false);
      }
    }
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
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTimeMs - 100));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(durationMs, currentTimeMs + 100));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeMs, durationMs]);

  // CSS Transforms Composer for video preview
  const getCompositorStyle = (): React.CSSProperties => {
    if (!project?.editor) return {};
    const editor = project.editor;

    // Background color/wallpaper
    const style: React.CSSProperties = {
      padding: `${editor.padding || 0}px`,
      borderRadius: `${editor.borderRadius || 0}px`,
      boxShadow: `0 20px 60px rgba(0,0,0,${editor.shadowIntensity ?? 0.3})`,
      transition: 'all 0.15s ease-out',
      background: editor.wallpaper || '#0b0c0e',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    // Zoom/3D Rotation regions mapping
    const zoomRegions = editor.zoomRegions || [];
    const activeZoom = zoomRegions.find(r => currentTimeMs >= r.startMs && currentTimeMs <= r.endMs);
    
    if (activeZoom) {
      const depth = activeZoom.depth || 1.5;
      const focusX = (activeZoom.focus?.cx ?? 0.5) * 100;
      const focusY = (activeZoom.focus?.cy ?? 0.5) * 100;
      
      let transformStr = `scale(${depth})`;
      
      // Add 3D Rotation transforms
      if (activeZoom.rotationPreset === 'iso') {
        transformStr = `${transformStr} perspective(1000px) rotateX(-10deg) rotateY(-16deg)`;
      } else if (activeZoom.rotationPreset === 'left') {
        transformStr = `${transformStr} perspective(1000px) rotateY(-22deg)`;
      } else if (activeZoom.rotationPreset === 'right') {
        transformStr = `${transformStr} perspective(1000px) rotateY(22deg)`;
      }

      style.transform = transformStr;
      style.transformOrigin = `${focusX}% ${focusY}%`;
    }

    return style;
  };

  const getAspectStyle = (): React.CSSProperties => {
    if (!project?.editor) return { width: '100%', height: '100%' };
    const ratio = project.editor.aspectRatio || '16:9';
    switch (ratio) {
      case '16:9': return { aspectRatio: '16/9', width: '100%', height: 'auto' };
      case '4:3': return { aspectRatio: '4/3', width: '80%', height: 'auto' };
      case '1:1': return { aspectRatio: '1/1', width: '60%', height: 'auto' };
      case '9:16': return { aspectRatio: '9/16', height: '100%', width: 'auto' };
      default: return { aspectRatio: '16/9', width: '100%', height: 'auto' };
    }
  };

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

  const activeVideoSrc = project?.media?.screenVideoPath || project?.videoPath || '';

  return (
    <div className="editor-layout">
      {/* Header bar */}
      <header className="editor-header">
        <div className="editor-title">
          🎬 RePen Editor 
          {projectPath && <span style={{fontSize: 12, opacity: 0.7}}>({projectPath})</span>}
          {isDirty && <div className="dirty-indicator" title="Unsaved Changes" />}
        </div>
        <div className="menu-bar">
          <button className="menu-btn" onClick={handleSave} disabled={!isDirty}>Save</button>
          <button className="menu-btn" onClick={handleUndo} disabled={history.length === 0}>Undo</button>
          <button className="menu-btn" onClick={handleRedo} disabled={future.length === 0}>Redo</button>
          <button className="menu-btn" onClick={() => (window as any).appBridge?.closeRecordingEditor()}>Close</button>
        </div>
      </header>

      {/* Workspace Area */}
      <div className="editor-workspace">
        {/* Preview Panel */}
        <div className="preview-panel">
          {mediaMissing ? (
            <div className="missing-media-overlay">
              <h2>Missing Recording File</h2>
              <p>RePen cannot locate the video assets for this project.</p>
              <button className="btn-primary" onClick={handleRelink}>Relink Media Folder</button>
            </div>
          ) : (
            <div style={getAspectStyle()}>
              <div style={getCompositorStyle()}>
                <video
                  ref={videoRef}
                  src={activeVideoSrc ? toFileUrl(activeVideoSrc) : undefined}
                  className="video-element"
                  onLoadedMetadata={handleMetadataLoaded}
                  onClick={togglePlay}
                  onError={() => setMediaMissing(true)}
                />
                <canvas ref={canvasRef} className="annotation-canvas" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar settings panel */}
        <aside className="properties-panel">
          <div className="tab-buttons" style={{display: 'flex', gap: 6, marginBottom: 12}}>
            <button className={`menu-btn ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveTab('layout')}>Layout</button>
            <button className={`menu-btn ${activeTab === 'motion' ? 'active' : ''}`} onClick={() => setActiveTab('motion')}>Motion</button>
            <button className={`menu-btn ${activeTab === 'webcam' ? 'active' : ''}`} onClick={() => setActiveTab('webcam')}>Webcam</button>
            <button className={`menu-btn ${activeTab === 'annotations' ? 'active' : ''}`} onClick={() => setActiveTab('annotations')}>Overlay</button>
          </div>

          {project && activeTab === 'layout' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div className="property-group">
                <span className="property-label">Aspect Ratio</span>
                <select 
                  className="property-control"
                  value={project.editor.aspectRatio || '16:9'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.aspectRatio = e.target.value as AspectRatio;
                    updateProject(updated);
                  }}
                >
                  <option value="16:9">Widescreen 16:9</option>
                  <option value="4:3">Standard 4:3</option>
                  <option value="1:1">Square 1:1</option>
                  <option value="9:16">Vertical 9:16</option>
                </select>
              </div>

              <div className="property-group">
                <span className="property-label">Padding: {project.editor.padding || 0}px</span>
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
                <span className="property-label">Border Radius: {project.editor.borderRadius || 0}px</span>
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
                <span className="property-label">Background Wallpaper</span>
                <select 
                  className="property-control"
                  value={project.editor.wallpaper || '#0b0c0e'}
                  onChange={(e) => {
                    const updated = JSON.parse(JSON.stringify(project));
                    updated.editor.wallpaper = e.target.value;
                    updateProject(updated);
                  }}
                >
                  <option value="#0b0c0e">Midnight Dark</option>
                  <option value="linear-gradient(135deg, #1f2937, #111827)">Gradient Gray</option>
                  <option value="linear-gradient(135deg, #3b82f6, #8b5cf6)">Neon Violet</option>
                  <option value="linear-gradient(135deg, #10b981, #059669)">Emerald Forest</option>
                </select>
              </div>
            </div>
          )}

          {project && activeTab === 'motion' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <button className="btn-primary" onClick={handleAddZoomRegion}>+ Add Zoom Region</button>
              
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
                {project.editor.annotationRegions.map((ann: any) => (
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
                  </div>
                );
              })()}
            </div>
          )}

          {recentProjects.length > 0 && (
            <div className="property-group" style={{marginTop: 'auto'}}>
              <span className="property-label">Recent Projects</span>
              <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6}}>
                {recentProjects.map((p, idx) => (
                  <li key={idx} style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    <a href="#" style={{color: '#a3a8b1', fontSize: 12}} onClick={() => loadProject(p)}>
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
      <footer className="timeline-panel">
        <div className="timeline-toolbar">
          <div>
            Time: {Math.round(currentTimeMs / 1000)}s / {Math.round(durationMs / 1000)}s
          </div>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <label style={{display: 'flex', gap: 6, alignItems: 'center'}}>
              Timeline Zoom:
              <input 
                type="range" 
                min={0.5} 
                max={5.0} 
                step={0.1}
                value={timelineZoom} 
                onChange={(e) => setTimelineZoom(parseFloat(e.target.value))} 
              />
            </label>
          </div>
        </div>

        <div className="timeline-tracks" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = clickX / rect.width;
          handleSeek(Math.round(pct * durationMs));
        }}>
          {/* Main timeline track with playhead */}
          <div className="timeline-track">
            <span className="track-label">Screen Recording</span>
            
            {/* Trim blocks */}
            {project?.editor.trimRegions?.map((t: TrimRegion) => (
              <div 
                key={t.id} 
                className="trim-region-visual"
                style={{
                  left: `${(t.startMs / durationMs) * 100}%`,
                  width: `${((t.endMs - t.startMs) / durationMs) * 100}%`
                }}
              />
            ))}

            {/* Playhead indicator */}
            <div 
              className="timeline-playhead" 
              style={{ left: `${(currentTimeMs / (durationMs || 1)) * 100}%` }}
            />
          </div>

          <div className="timeline-track">
            <span className="track-label">Zoom Regions</span>
            {project?.editor.zoomRegions?.map((z: ZoomRegion) => (
              <div 
                key={z.id}
                className="speed-region-visual"
                style={{
                  left: `${(z.startMs / durationMs) * 100}%`,
                  width: `${((z.endMs - z.startMs) / durationMs) * 100}%`
                }}
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<EditorApp />);
}
