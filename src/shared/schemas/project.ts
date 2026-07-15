import type { PresentationTrackV2 } from '../contracts/presentationTrack';

export type {
  BoardSnapshot,
  BoardViewport,
  PresentationEvent,
  PresentationTrackV2,
  SceneAnnotation,
  SceneScope,
  SpotlightState,
} from '../contracts/presentationTrack';

export interface CaptureSourceDescriptor {
  id: string;
  name: string;
  type: 'screen' | 'window';
  thumbnailUrl?: string;
}

export interface CursorTrack {
  points: Array<{
    timeMs: number;
    x: number;
    y: number;
    clicks: boolean;
  }>;
}

export type PresentationTrack = PresentationTrackV2;

export interface EditorState {
  trims: Array<{ startMs: number; endMs: number }>;
  webcamSettings?: {
    visible: boolean;
    size: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    mask: 'circle' | 'rectangle';
  };
}

export interface RePenRecordingProjectV1 {
  schemaVersion: 1;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  source: CaptureSourceDescriptor;
  media: {
    screenVideoPath: string;
    webcamVideoPath?: string;
    nativeSessionPath?: string;
    durationMs: number;
  };
  cursorTrack?: CursorTrack;
  presentationTrack?: PresentationTrack;
  editor: EditorState;
  provenance: {
    appVersion: string;
    platform: string;
    captureBackend: string;
  };
}
