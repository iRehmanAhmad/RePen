/**
 * usePlaybackState — manages video playback state.
 *
 * Owns:
 *  - isPlaying, currentTimeMs, durationMs
 *  - volume, isMuted, playbackRate
 *  - sourceVideoWidth / sourceVideoHeight
 *  - cursorPosition derived from cursor telemetry
 *  - reducedMotion system preference
 *  - refs to the main video, webcam video, canvas, and PlaybackCoordinator
 *  - all playback actions: togglePlay, handleSeek, handleVolume, etc.
 *
 * The component simply destructures what it needs without holding playback
 * logic itself.
 */

import { useState, useEffect, useRef } from 'react';
import { PlaybackCoordinator } from '../presenter/editor/playbackCoordinator';
import { getSmoothedCursorPosition } from '../presenter/editor/cursorTelemetryRenderer';
import type { EditorProjectData } from '../../shared/editor/projectPersistence';

export interface PlaybackStateResult {
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  coordinatorRef: React.RefObject<PlaybackCoordinator>;
  // State
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentTimeMs: number;
  setCurrentTimeMs: (ms: number) => void;
  durationMs: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  sourceVideoWidth: number | null;
  sourceVideoHeight: number | null;
  cursorPosition: { cx: number; cy: number; visible: boolean } | null;
  reducedMotion: boolean;
  // Actions
  togglePlay: () => void;
  handleSeek: (timeMs: number, project: EditorProjectData | null) => void;
  handleFrameStep: (direction: -1 | 1) => void;
  handlePlaybackRate: (rate: number) => void;
  handleVolume: (v: number) => void;
  handleMute: () => void;
  handleMetadataLoaded: () => void;
}

export function usePlaybackState(): PlaybackStateResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coordinatorRef = useRef(new PlaybackCoordinator());

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(10000);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [sourceVideoWidth, setSourceVideoWidth] = useState<number | null>(null);
  const [sourceVideoHeight, setSourceVideoHeight] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ cx: number; cy: number; visible: boolean } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

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

  const handleSeek = (timeMs: number, project: EditorProjectData | null) => {
    coordinatorRef.current.seek(timeMs);
    setCurrentTimeMs(timeMs);
    const telemetry = (project as any)?.cursorTelemetry || [];
    if (telemetry.length > 0) {
      const cursor = getSmoothedCursorPosition(telemetry, timeMs);
      setCursorPosition({ cx: cursor.cx, cy: cursor.cy, visible: true });
    } else {
      setCursorPosition(null);
    }
  };

  const handleFrameStep = (direction: -1 | 1) => {
    const video = videoRef.current;
    if (!video) return;
    coordinatorRef.current.pause();
    setIsPlaying(false);
    const nextMs = Math.max(0, Math.min(durationMs, Math.round(video.currentTime * 1000) + direction * Math.round(1000 / 30)));
    coordinatorRef.current.seek(nextMs);
    setCurrentTimeMs(nextMs);
  };

  const handlePlaybackRate = (nextRate: number) => {
    const safe = [0.5, 0.75, 1, 1.25, 1.5, 2].includes(nextRate) ? nextRate : 1;
    coordinatorRef.current.setDefaultSpeed(safe);
    setPlaybackRate(safe);
  };

  const handleVolume = (nextVolume: number) => {
    const safe = Math.min(1, Math.max(0, nextVolume));
    if (videoRef.current) {
      videoRef.current.volume = safe;
      videoRef.current.muted = safe === 0;
    }
    setVolume(safe);
    setIsMuted(safe === 0);
  };

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setIsMuted(next);
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDurationMs(Math.round(videoRef.current.duration * 1000));
      setSourceVideoWidth(videoRef.current.videoWidth);
      setSourceVideoHeight(videoRef.current.videoHeight);
    }
  };

  return {
    videoRef,
    webcamVideoRef,
    canvasRef,
    coordinatorRef,
    isPlaying,
    setIsPlaying,
    currentTimeMs,
    setCurrentTimeMs,
    durationMs,
    playbackRate,
    volume,
    isMuted,
    sourceVideoWidth,
    sourceVideoHeight,
    cursorPosition,
    reducedMotion,
    togglePlay,
    handleSeek,
    handleFrameStep,
    handlePlaybackRate,
    handleVolume,
    handleMute,
    handleMetadataLoaded,
  };
}
