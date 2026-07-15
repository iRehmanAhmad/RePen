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

export type SceneAnnotation = any; // Will hold custom geometry / paths / strokes
export type SceneScope = 'current' | 'all';
export interface BoardSnapshot {
  backgroundMode: string;
  boardColor: string;
  viewport: { panX: number; panY: number; zoom: number };
}
export interface BoardViewport {
  panX: number;
  panY: number;
  zoom: number;
}
export interface SpotlightState {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export type PresentationEvent =
  | { timeMs: number; type: 'annotation/add'; annotation: SceneAnnotation }
  | { timeMs: number; type: 'annotation/update'; annotation: SceneAnnotation }
  | { timeMs: number; type: 'annotation/delete'; annotationIds: string[] }
  | { timeMs: number; type: 'scene/clear'; scope: SceneScope }
  | { timeMs: number; type: 'board/change'; board: BoardSnapshot }
  | { timeMs: number; type: 'viewport/change'; viewport: BoardViewport }
  | { timeMs: number; type: 'spotlight/update'; state: SpotlightState }
  | { timeMs: number; type: 'laser/sample'; point: { x: number; y: number } };

export interface PresentationTrack {
  schemaVersion: 1;
  initialScene: {
    annotations: SceneAnnotation[];
    boardMode: string;
    boardColor: string;
    viewport: BoardViewport;
  };
  events: PresentationEvent[];
}

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
