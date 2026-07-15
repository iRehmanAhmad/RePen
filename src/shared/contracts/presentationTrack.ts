export const PRESENTATION_TRACK_SCHEMA_VERSION = 2 as const;
export const PRESENTATION_LASER_TRAIL_DURATION_MS = 350;

export interface PresentationPoint {
  x: number;
  y: number;
}

export interface PresentationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PresentationSourceMetadata {
  id: string;
  name: string;
  type: 'display' | 'window';
  displayId: number | null;
  windowHandle: string | null;
  bounds: PresentationBounds;
  /** Multiply desktop-DIP positions by this value when compositing into capture pixels. */
  scaleFactor: number;
}

export interface PresentationCanvasMetadata {
  width: number;
  height: number;
  originX: number;
  originY: number;
  /** RePen annotations and display bounds are stored in Electron desktop DIPs. */
  coordinateSpace: 'desktop-dip';
}

export interface PresentationPageMetadata {
  id: string;
  index: number;
}

export interface BoardViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface BoardSnapshot {
  backgroundMode: string;
  boardColor: string;
  viewport: BoardViewport;
}

export interface SpotlightState {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export type SceneAnnotation = Record<string, unknown> & { id?: string };
export type SceneScope = 'current' | 'all';

export interface PresentationSceneSnapshot {
  annotations: SceneAnnotation[];
  board: BoardSnapshot;
  page: PresentationPageMetadata;
  spotlight: SpotlightState | null;
  laserPoints: Array<PresentationPoint & { timeMs: number }>;
}

interface SequencedPresentationRecord {
  seq: number;
  timeMs: number;
}

export type PresentationEvent = SequencedPresentationRecord & (
  | { type: 'annotation/add'; annotation: SceneAnnotation }
  | { type: 'annotation/update'; annotation: SceneAnnotation }
  | { type: 'annotation/delete'; annotationIds: string[] }
  | { type: 'scene/clear'; scope: SceneScope }
  | { type: 'board/change'; board: BoardSnapshot }
  | { type: 'viewport/change'; viewport: BoardViewport }
  | { type: 'page/change'; page: PresentationPageMetadata; scene: PresentationSceneSnapshot }
  | { type: 'spotlight/update'; state: SpotlightState | null }
  | { type: 'laser/sample'; point: PresentationPoint }
);

export interface PresentationTrackHeaderV2 {
  type: 'header';
  schemaVersion: typeof PRESENTATION_TRACK_SCHEMA_VERSION;
  sessionId: string;
  createdAtEpochMs: number;
  source: PresentationSourceMetadata;
  canvas: PresentationCanvasMetadata;
  initialScene: PresentationSceneSnapshot;
  clock: {
    unit: 'milliseconds';
    origin: 'recording-active-time';
  };
}

export interface PresentationCheckpointRecord extends SequencedPresentationRecord {
  type: 'checkpoint';
  scene: PresentationSceneSnapshot;
}

export type PresentationTrackRecord =
  | PresentationTrackHeaderV2
  | PresentationEvent
  | PresentationCheckpointRecord;

export interface PresentationTrackV2 {
  schemaVersion: typeof PRESENTATION_TRACK_SCHEMA_VERSION;
  header: PresentationTrackHeaderV2;
  events: PresentationEvent[];
  checkpoints: PresentationCheckpointRecord[];
}

export interface PresentationTrackStartOptions {
  sessionId: string;
  createdAtEpochMs?: number;
  source: PresentationSourceMetadata;
  canvas: PresentationCanvasMetadata;
  initialScene: PresentationSceneSnapshot;
}
