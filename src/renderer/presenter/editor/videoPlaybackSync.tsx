import React, { useRef, useState, useEffect } from 'react';
import { PlaybackCoordinator } from './playbackCoordinator';
import { getSmoothedCursorPosition } from './cursorTelemetryRenderer';
import { SpeedRegion, TrimRegion, CursorTelemetryPoint } from '../../../shared/editor/types';

export interface VideoPlaybackSyncProps {
  videoPath: string;
  webcamVideoPath?: string;
  audioTrackPath?: string;
  speeds: SpeedRegion[];
  trims: TrimRegion[];
  cursorTelemetry: CursorTelemetryPoint[];
  aspectRatio: string;
  webcamLayoutPreset: string;
  webcamSizePreset: number;
  webcamPosition: { cx: number; cy: number } | null;
  webcamMirrored?: boolean;
}

export const VideoPlaybackSync: React.FC<VideoPlaybackSyncProps> = ({
  videoPath,
  webcamVideoPath,
  audioTrackPath,
  speeds,
  trims,
  cursorTelemetry,
  aspectRatio,
  webcamLayoutPreset,
  webcamSizePreset,
  webcamPosition,
  webcamMirrored = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const coordinatorRef = useRef(new PlaybackCoordinator());
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  
  const [cursorState, setCursorState] = useState({ cx: 0.5, cy: 0.5, type: 'arrow', click: false });

  // Initialize playback coordinator
  useEffect(() => {
    const coord = coordinatorRef.current;
    coord.setElements(videoRef.current, webcamRef.current, audioRef.current);
    coord.setRegions(speeds, trims);
    
    // Duration resolution
    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        setDurationMs(Math.round(videoRef.current.duration * 1000));
      }
    };
    
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }
    }
    
    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [videoPath, webcamVideoPath, speeds, trims]);

  // Tick update loop
  useEffect(() => {
    let animId: number;
    
    const tick = () => {
      const coord = coordinatorRef.current;
      coord.syncWebcamAndAudio();
      coord.updatePlaybackRate();
      
      const timeMs = coord.getCurrentTimeMs();
      
      // Check trim skipping
      const skipped = coord.checkTrimRegions(timeMs);
      const activeTimeMs = skipped ? coord.getCurrentTimeMs() : timeMs;
      
      setCurrentTimeMs(activeTimeMs);
      
      // Update cursor
      const cursor = getSmoothedCursorPosition(cursorTelemetry, activeTimeMs);
      setCursorState(cursor);
      
      animId = requestAnimationFrame(tick);
    };
    
    if (isPlaying) {
      animId = requestAnimationFrame(tick);
    }
    
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, cursorTelemetry]);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetMs = Number(e.target.value);
    coordinatorRef.current.seek(targetMs);
    setCurrentTimeMs(targetMs);
    
    const cursor = getSmoothedCursorPosition(cursorTelemetry, targetMs);
    setCursorState(cursor);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const stepMs = Math.max(0, currentTimeMs - 33);
        coordinatorRef.current.seek(stepMs);
        setCurrentTimeMs(stepMs);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const stepMs = Math.min(durationMs, currentTimeMs + 33);
        coordinatorRef.current.seek(stepMs);
        setCurrentTimeMs(stepMs);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTimeMs, durationMs]);

  // Format aspect ratio class
  const getAspectRatioStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case '16:9': return { aspectRatio: '16/9' };
      case '4:3': return { aspectRatio: '4/3' };
      case '1:1': return { aspectRatio: '1/1' };
      case '9:16': return { aspectRatio: '9/16' };
      default: return { aspectRatio: '16/9' };
    }
  };

  // PiP webcam style builder
  const getWebcamStyle = (): React.CSSProperties => {
    if (webcamLayoutPreset === 'no-webcam') {
      return { display: 'none' };
    }
    
    const sizePct = webcamSizePreset || 25;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: `${sizePct}%`,
      height: 'auto',
      aspectRatio: '16/9',
      zIndex: 10,
      transform: webcamMirrored ? 'scaleX(-1)' : 'none',
      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      border: '2px solid rgba(255,255,255,0.2)',
      borderRadius: '8px',
      overflow: 'hidden',
    };
    
    // Position PiP absolute percentages
    if (webcamPosition) {
      baseStyle.left = `${webcamPosition.cx * 100}%`;
      baseStyle.top = `${webcamPosition.cy * 100}%`;
      baseStyle.transform = `${baseStyle.transform} translate(-50%, -50%)`;
    } else {
      // Default to bottom right
      baseStyle.right = '20px';
      baseStyle.bottom = '20px';
    }
    
    return baseStyle;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto overflow-hidden bg-black rounded-xl border border-white/10 shadow-2xl"
      style={getAspectRatioStyle()}
    >
      {/* Primary Video Screen */}
      <video
        ref={videoRef}
        src={videoPath}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* Synchronized Webcam PiP Overlay */}
      {webcamVideoPath && webcamLayoutPreset !== 'no-webcam' && (
        <video
          ref={webcamRef}
          src={webcamVideoPath}
          style={getWebcamStyle()}
          className="object-cover"
          muted
        />
      )}

      {/* Supplemental Audio Asset */}
      {audioTrackPath && (
        <audio ref={audioRef} src={audioTrackPath} />
      )}

      {/* Smoothed Cursor Indicator Overlay */}
      <div
        className="absolute pointer-events-none transition-all duration-75 ease-out"
        style={{
          left: `${cursorState.cx * 100}%`,
          top: `${cursorState.cy * 100}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
        }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-white bg-yellow-400/80 shadow-md flex items-center justify-center">
          {cursorState.click && (
            <div className="absolute w-12 h-12 rounded-full border-4 border-yellow-500 animate-ping" />
          )}
        </div>
      </div>

      {/* Glassmorphic Playback controls bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 z-30">
        {/* Scrubber slider */}
        <input
          type="range"
          min={0}
          max={durationMs || 1000}
          value={currentTimeMs}
          onChange={handleSeek}
          className="w-full accent-red-500 cursor-pointer h-1.5 rounded-lg bg-white/20"
        />
        
        {/* Controls row */}
        <div className="flex items-center justify-between text-white text-sm">
          <button
            onClick={togglePlay}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold active:scale-95 transition-all"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <div>
            {Math.round(currentTimeMs / 1000)}s / {Math.round(durationMs / 1000)}s
          </div>
        </div>
      </div>
    </div>
  );
};
