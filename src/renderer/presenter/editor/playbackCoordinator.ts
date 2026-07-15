import { SpeedRegion, TrimRegion } from '../../../shared/editor/types';

export class PlaybackCoordinator {
  private screenVideo: HTMLVideoElement | null = null;
  private webcamVideo: HTMLVideoElement | null = null;
  private audioTrack: HTMLAudioElement | null = null;
  
  private speedRegions: SpeedRegion[] = [];
  private trimRegions: TrimRegion[] = [];
  private defaultPlaybackSpeed = 1.0;
  private isPlaying = false;
  
  constructor() {}
  
  setElements(screen: HTMLVideoElement | null, webcam?: HTMLVideoElement | null, audio?: HTMLAudioElement | null) {
    this.screenVideo = screen;
    this.webcamVideo = webcam || null;
    this.audioTrack = audio || null;
  }
  
  setRegions(speeds: SpeedRegion[], trims: TrimRegion[]) {
    this.speedRegions = speeds || [];
    this.trimRegions = trims || [];
    this.updatePlaybackRate();
  }
  
  setDefaultSpeed(speed: number) {
    this.defaultPlaybackSpeed = speed;
    this.updatePlaybackRate();
  }
  
  play() {
    this.isPlaying = true;
    if (this.screenVideo) this.screenVideo.play().catch(() => {});
    if (this.webcamVideo) this.webcamVideo.play().catch(() => {});
    if (this.audioTrack) this.audioTrack.play().catch(() => {});
  }
  
  pause() {
    this.isPlaying = false;
    if (this.screenVideo) this.screenVideo.pause();
    if (this.webcamVideo) this.webcamVideo.pause();
    if (this.audioTrack) this.audioTrack.pause();
  }
  
  seek(timeMs: number) {
    const timeSec = timeMs / 1000;
    if (this.screenVideo) this.screenVideo.currentTime = timeSec;
    if (this.webcamVideo) this.webcamVideo.currentTime = timeSec;
    if (this.audioTrack) this.audioTrack.currentTime = timeSec;
    this.checkTrimRegions(timeMs);
  }
  
  updatePlaybackRate() {
    const timeMs = this.getCurrentTimeMs();
    const rate = this.getSpeedAtTime(timeMs);
    
    if (this.screenVideo) this.screenVideo.playbackRate = rate;
    if (this.webcamVideo) this.webcamVideo.playbackRate = rate;
    if (this.audioTrack) this.audioTrack.playbackRate = rate;
  }
  
  getCurrentTimeMs(): number {
    if (!this.screenVideo) return 0;
    return Math.round(this.screenVideo.currentTime * 1000);
  }
  
  getSpeedAtTime(timeMs: number): number {
    const active = this.speedRegions.find(r => timeMs >= r.startMs && timeMs < r.endMs);
    return active ? active.speed : this.defaultPlaybackSpeed;
  }
  
  checkTrimRegions(currentTimeMs: number): boolean {
    const activeTrim = this.trimRegions.find(r => currentTimeMs >= r.startMs && currentTimeMs < r.endMs);
    if (activeTrim) {
      this.seek(activeTrim.endMs);
      return true;
    }
    return false;
  }
  
  syncWebcamAndAudio() {
    if (!this.screenVideo) return;
    const targetSec = this.screenVideo.currentTime;
    
    if (this.webcamVideo && Math.abs(this.webcamVideo.currentTime - targetSec) > 0.15) {
      this.webcamVideo.currentTime = targetSec;
    }
    if (this.audioTrack && Math.abs(this.audioTrack.currentTime - targetSec) > 0.15) {
      this.audioTrack.currentTime = targetSec;
    }
  }
}
