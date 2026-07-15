import fs from 'fs';

export interface Point {
  x: number;
  y: number;
}

export interface BoardViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export type SceneAnnotation = any;

export interface PresentationTrackEvent {
  timeMs: number;
  type: string;
  [key: string]: any;
}

export class PresentationTrackService {
  private startTime: number | null = null;
  private totalPauseDuration = 0;
  private pauseStartTime: number | null = null;
  private sidecarPath: string | null = null;
  private isActive = false;

  startTrack(
    outputPath: string,
    initialAnnotations: SceneAnnotation[],
    boardMode: string,
    boardColor: string,
    viewport: BoardViewport
  ) {
    this.sidecarPath = outputPath + '.presentation.jsonl';
    this.startTime = Date.now();
    this.totalPauseDuration = 0;
    this.pauseStartTime = null;
    this.isActive = true;

    // Delete existing sidecar if present
    if (fs.existsSync(this.sidecarPath)) {
      try {
        fs.unlinkSync(this.sidecarPath);
      } catch (err) {
        console.error('Failed to clear previous sidecar:', err);
      }
    }

    const initialHeader = {
      type: 'initial',
      schemaVersion: 1,
      initialScene: {
        annotations: JSON.parse(JSON.stringify(initialAnnotations)),
        boardMode,
        boardColor,
        viewport: { ...viewport },
      },
    };

    fs.writeFileSync(this.sidecarPath, JSON.stringify(initialHeader) + '\n', 'utf8');
  }

  pauseTrack() {
    if (!this.isActive || this.pauseStartTime !== null) return;
    this.pauseStartTime = Date.now();
  }

  resumeTrack() {
    if (!this.isActive || this.pauseStartTime === null) return;
    this.totalPauseDuration += Date.now() - this.pauseStartTime;
    this.pauseStartTime = null;
  }

  addEvent(type: string, payload: Record<string, any>) {
    if (!this.isActive || !this.sidecarPath) return;

    const event: PresentationTrackEvent = {
      timeMs: this.getCurrentTimeMs(),
      type,
      ...payload,
    };

    try {
      fs.appendFileSync(this.sidecarPath, JSON.stringify(event) + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to append event to presentation track:', err);
    }
  }

  stopTrack() {
    this.isActive = false;
    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPauseDuration = 0;
  }

  cancelTrack() {
    this.stopTrack();
    if (this.sidecarPath && fs.existsSync(this.sidecarPath)) {
      try {
        fs.unlinkSync(this.sidecarPath);
      } catch (err) {
        console.error('Failed to clean up sidecar on cancel:', err);
      }
    }
    this.sidecarPath = null;
  }

  getCurrentTimeMs(): number {
    if (this.startTime === null) return 0;
    let elapsed = Date.now() - this.startTime;
    if (this.pauseStartTime !== null) {
      elapsed -= Date.now() - this.pauseStartTime;
    }
    return Math.max(0, elapsed - this.totalPauseDuration);
  }

  isRecording(): boolean {
    return this.isActive;
  }
}
