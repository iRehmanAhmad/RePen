import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { PlaybackCoordinator } from './presenter/editor/playbackCoordinator';
import { PresenterRenderer } from './presenter/presenterRenderer';
import { seekPresentationTrack } from './presenter/presentationTrackReplay';
import { toFileUrl, fromFileUrl, validateProjectData, migrateProjectData } from '../shared/editor/projectPersistence';
import type { EditorProjectData, ProjectMedia } from '../shared/editor/projectPersistence';
import type { TrimRegion, SpeedRegion } from '../shared/editor/types';
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

  // Track settings
  const [webcamVisible, setWebcamVisible] = useState(true);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
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

    // Listen for new project load events
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
        setProject(res.project);
        setProjectPath(res.path);
        setIsDirty(false);
        setHistory([]);
        setFuture([]);
        addToRecent(res.path);
        
        // Verify media existence (relink check)
        const videoPath = res.project.media?.screenVideoPath || res.project.videoPath;
        if (videoPath) {
          // Simple verification check: check if it resolves cleanly or fails
          setMediaMissing(false);
        }
      } else {
        alert(`Failed to load project: ${res.message}`);
      }
    }
  };

  // Perform state actions with Undo/Redo tracking
  const updateProject = (newProject: EditorProjectData) => {
    if (project) {
      setHistory(prev => [...prev, project]);
      setFuture([]);
      setProject(newProject);
      setIsDirty(true);
    }
  };

  const handleUndo = () => {
    if (history.length > 0 && project) {
      const prev = history[history.length - 1];
      setHistory(prevStack => prevStack.slice(0, -1));
      setFuture(prevStack => [project, ...prevStack]);
      setProject(prev);
    }
  };

  const handleRedo = () => {
    if (future.length > 0 && project) {
      const next = future[0];
      setFuture(prevStack => prevStack.slice(1));
      setHistory(prevStack => [...prevStack, project]);
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
  }, [isPlaying]);

  // Handle video meta loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDurationMs(Math.round(videoRef.current.duration * 1000));
    }
  };

  // Draw overlay annotations onto canvas
  const drawAnnotations = (timeMs: number) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !annotationsVisible || !project) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match dimensions to video display bounds
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If project has presentationTrack, seek and render
    const track = (project as any).presentationTrack;
    if (track) {
      const snapshot = seekPresentationTrack(track, timeMs);
      const renderer = new PresenterRenderer(ctx);
      
      // Calculate scale to match design resolution (e.g. 1920x1080)
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
        // Relink path
        const updated = {
          ...project,
          media: {
            ...project.media,
            screenVideoPath: `${folder}/recording.mp4`, // guess standard
          }
        } as any;
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
        handleSeek(Math.max(0, currentTimeMs - 100)); // 100ms step
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(durationMs, currentTimeMs + 100));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeMs, durationMs]);

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
            <div className="video-container">
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
          )}
        </div>

        {/* Sidebar settings panel */}
        <aside className="properties-panel">
          <div className="property-group">
            <span className="property-label">Webcam Options</span>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={webcamVisible} 
                onChange={(e) => setWebcamVisible(e.target.checked)} 
              />
              Show Webcam Track
            </label>
          </div>

          <div className="property-group">
            <span className="property-label">Annotation Options</span>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={annotationsVisible} 
                onChange={(e) => setAnnotationsVisible(e.target.checked)} 
              />
              Draw Presentations Overlay
            </label>
          </div>

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
            {/* Playhead indicator */}
            <div 
              className="timeline-playhead" 
              style={{ left: `${(currentTimeMs / (durationMs || 1)) * 100}%` }}
            />
          </div>

          <div className="timeline-track">
            <span className="track-label">Webcam Stream</span>
            {/* Display timeline elements */}
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
