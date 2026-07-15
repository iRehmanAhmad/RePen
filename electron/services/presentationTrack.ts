import { EventEmitter } from 'events';
import fs from 'fs';
import type { FileHandle } from 'fs/promises';

export const PRESENTATION_TRACK_SCHEMA_VERSION = 2 as const;
export const PRESENTATION_LASER_TRAIL_DURATION_MS = 350;

export interface Point {
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
  laserPoints: Array<Point & { timeMs: number }>;
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
  | { type: 'laser/sample'; point: Point }
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

export interface PresentationTrackSummary {
  sidecarPath: string;
  durationMs: number;
  lastSequence: number;
  failure: Error | null;
}

export interface PresentationTrackWriter {
  append(content: string): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;
}

export interface PresentationTrackWriterFactory {
  create(filePath: string): Promise<PresentationTrackWriter>;
  remove(filePath: string): Promise<void>;
}

export interface PresentationTrackServiceOptions {
  now?: () => number;
  flushIntervalMs?: number;
  maxBufferedBytes?: number;
  checkpointEveryEvents?: number;
  writerFactory?: PresentationTrackWriterFactory;
}

class FileHandlePresentationTrackWriter implements PresentationTrackWriter {
  constructor(private readonly handle: FileHandle) {}

  async append(content: string): Promise<void> {
    await this.handle.appendFile(content, 'utf8');
  }

  async sync(): Promise<void> {
    await this.handle.sync();
  }

  async close(): Promise<void> {
    await this.handle.close();
  }
}

const defaultWriterFactory: PresentationTrackWriterFactory = {
  async create(filePath) {
    const handle = await fs.promises.open(filePath, 'w');
    return new FileHandlePresentationTrackWriter(handle);
  },
  async remove(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function annotationId(annotation: SceneAnnotation): string | undefined {
  return typeof annotation.id === 'string' ? annotation.id : undefined;
}

export function applyPresentationEvent(
  snapshot: PresentationSceneSnapshot,
  event: PresentationEvent,
): PresentationSceneSnapshot {
  const next = clone(snapshot);

  switch (event.type) {
    case 'annotation/add': {
      const id = annotationId(event.annotation);
      if (id) next.annotations = next.annotations.filter((item) => annotationId(item) !== id);
      next.annotations.push(clone(event.annotation));
      break;
    }
    case 'annotation/update': {
      const id = annotationId(event.annotation);
      if (!id) break;
      const index = next.annotations.findIndex((item) => annotationId(item) === id);
      if (index >= 0) next.annotations[index] = clone(event.annotation);
      break;
    }
    case 'annotation/delete':
      next.annotations = next.annotations.filter((item) => {
        const id = annotationId(item);
        return !id || !event.annotationIds.includes(id);
      });
      break;
    case 'scene/clear':
      next.annotations = [];
      break;
    case 'board/change':
      next.board = clone(event.board);
      break;
    case 'viewport/change':
      next.board.viewport = clone(event.viewport);
      break;
    case 'page/change':
      return clone({ ...event.scene, page: event.page });
    case 'spotlight/update':
      next.spotlight = clone(event.state);
      break;
    case 'laser/sample':
      next.laserPoints = next.laserPoints.filter(
        (point) => point.timeMs >= event.timeMs - PRESENTATION_LASER_TRAIL_DURATION_MS,
      );
      next.laserPoints.push({ ...clone(event.point), timeMs: event.timeMs });
      break;
  }

  return next;
}

export function parsePresentationTrackJsonl(contents: string): PresentationTrackV2 {
  const records = contents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as PresentationTrackRecord;
      } catch (error) {
        throw new Error(`Invalid presentation-track JSON at line ${index + 1}: ${String(error)}`);
      }
    });

  const header = records[0];
  if (!header || header.type !== 'header' || header.schemaVersion !== PRESENTATION_TRACK_SCHEMA_VERSION) {
    throw new Error(`Presentation track must begin with a schema-v${PRESENTATION_TRACK_SCHEMA_VERSION} header.`);
  }

  const sequenced = records.slice(1) as Array<PresentationEvent | PresentationCheckpointRecord>;
  let priorSequence = 0;
  for (const record of sequenced) {
    if (!Number.isInteger(record.seq) || record.seq <= priorSequence) {
      throw new Error(`Presentation track sequence must be strictly increasing; received ${record.seq}.`);
    }
    priorSequence = record.seq;
  }

  return {
    schemaVersion: PRESENTATION_TRACK_SCHEMA_VERSION,
    header,
    events: sequenced.filter((record): record is PresentationEvent => record.type !== 'checkpoint'),
    checkpoints: sequenced.filter((record): record is PresentationCheckpointRecord => record.type === 'checkpoint'),
  };
}

export function replayPresentationTrack(
  track: PresentationTrackV2,
  targetTimeMs: number,
): PresentationSceneSnapshot {
  const target = Math.max(0, targetTimeMs);
  const checkpoint = track.checkpoints
    .filter((record) => record.timeMs <= target)
    .sort((left, right) => right.seq - left.seq)[0];
  let snapshot = checkpoint ? clone(checkpoint.scene) : clone(track.header.initialScene);
  const startingSequence = checkpoint?.seq ?? 0;

  for (const event of track.events) {
    if (event.seq <= startingSequence || event.timeMs > target) continue;
    snapshot = applyPresentationEvent(snapshot, event);
  }

  snapshot.laserPoints = snapshot.laserPoints.filter(
    (point) => point.timeMs >= target - PRESENTATION_LASER_TRAIL_DURATION_MS && point.timeMs <= target,
  );

  return snapshot;
}

export class PresentationTrackService extends EventEmitter {
  private readonly now: () => number;
  private readonly flushIntervalMs: number;
  private readonly maxBufferedBytes: number;
  private readonly checkpointEveryEvents: number;
  private readonly writerFactory: PresentationTrackWriterFactory;
  private startTime: number | null = null;
  private totalPauseDuration = 0;
  private pauseStartTime: number | null = null;
  private sidecarPath: string | null = null;
  private isActive = false;
  private isFinalizing = false;
  private sequence = 0;
  private eventCountSinceCheckpoint = 0;
  private currentScene: PresentationSceneSnapshot | null = null;
  private writerPromise: Promise<PresentationTrackWriter> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private bufferedLines: string[] = [];
  private bufferedBytes = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private failure: Error | null = null;

  constructor(options: PresentationTrackServiceOptions = {}) {
    super();
    this.now = options.now ?? Date.now;
    this.flushIntervalMs = options.flushIntervalMs ?? 50;
    this.maxBufferedBytes = options.maxBufferedBytes ?? 256 * 1024;
    this.checkpointEveryEvents = Math.max(1, options.checkpointEveryEvents ?? 100);
    this.writerFactory = options.writerFactory ?? defaultWriterFactory;
  }

  startTrack(outputPath: string, options: PresentationTrackStartOptions): PresentationTrackHeaderV2;
  startTrack(
    outputPath: string,
    initialAnnotations: SceneAnnotation[],
    boardMode: string,
    boardColor: string,
    viewport: BoardViewport,
  ): PresentationTrackHeaderV2;
  startTrack(
    outputPath: string,
    optionsOrAnnotations: PresentationTrackStartOptions | SceneAnnotation[],
    boardMode = 'transparent',
    boardColor = '#ffffff',
    viewport: BoardViewport = { panX: 0, panY: 0, zoom: 1 },
  ): PresentationTrackHeaderV2 {
    if (this.isActive || this.isFinalizing || this.writerPromise) {
      throw new Error('A presentation track is already active or finalizing.');
    }

    const createdAtEpochMs = this.now();
    const options = Array.isArray(optionsOrAnnotations)
      ? this.createLegacyStartOptions(
          optionsOrAnnotations,
          boardMode,
          boardColor,
          viewport,
          createdAtEpochMs,
        )
      : optionsOrAnnotations;
    const header: PresentationTrackHeaderV2 = {
      type: 'header',
      schemaVersion: PRESENTATION_TRACK_SCHEMA_VERSION,
      sessionId: options.sessionId,
      createdAtEpochMs: options.createdAtEpochMs ?? createdAtEpochMs,
      source: clone(options.source),
      canvas: clone(options.canvas),
      initialScene: clone(options.initialScene),
      clock: {
        unit: 'milliseconds',
        origin: 'recording-active-time',
      },
    };

    this.sidecarPath = `${outputPath}.presentation.jsonl`;
    this.startTime = this.now();
    this.totalPauseDuration = 0;
    this.pauseStartTime = null;
    this.sequence = 0;
    this.eventCountSinceCheckpoint = 0;
    this.currentScene = clone(header.initialScene);
    this.failure = null;
    this.bufferedLines = [];
    this.bufferedBytes = 0;
    this.writeQueue = Promise.resolve();
    this.isActive = true;
    this.writerPromise = this.writerFactory.create(this.sidecarPath);
    void this.writerPromise.catch((error: unknown) => this.recordFailure(error));
    this.bufferRecord(header);
    return header;
  }

  pauseTrack(): void {
    this.assertHealthy();
    if (!this.isActive || this.pauseStartTime !== null) return;
    this.pauseStartTime = this.now();
  }

  resumeTrack(): void {
    this.assertHealthy();
    if (!this.isActive || this.pauseStartTime === null) return;
    this.totalPauseDuration += this.now() - this.pauseStartTime;
    this.pauseStartTime = null;
  }

  addEvent<T extends PresentationEvent['type']>(
    type: T,
    payload: Omit<Extract<PresentationEvent, { type: T }>, 'seq' | 'timeMs' | 'type'>,
  ): PresentationEvent {
    this.assertHealthy();
    if (!this.isActive || !this.currentScene) {
      throw new Error('No presentation track is active.');
    }

    const event = {
      seq: ++this.sequence,
      timeMs: this.getCurrentTimeMs(),
      type,
      ...clone(payload),
    } as unknown as PresentationEvent;
    this.currentScene = applyPresentationEvent(this.currentScene, event);
    this.bufferRecord(event);
    this.eventCountSinceCheckpoint += 1;

    if (this.eventCountSinceCheckpoint >= this.checkpointEveryEvents) {
      this.addCheckpoint();
    }
    return event;
  }

  addCheckpoint(scene: PresentationSceneSnapshot | null = null): PresentationCheckpointRecord {
    this.assertHealthy();
    const snapshot = scene ?? this.currentScene;
    if (!this.isActive || !snapshot) throw new Error('No presentation track is active.');

    this.currentScene = clone(snapshot);
    const checkpoint: PresentationCheckpointRecord = {
      type: 'checkpoint',
      seq: ++this.sequence,
      timeMs: this.getCurrentTimeMs(),
      scene: clone(snapshot),
    };
    this.eventCountSinceCheckpoint = 0;
    this.bufferRecord(checkpoint);
    return checkpoint;
  }

  async flush(): Promise<void> {
    this.assertHealthy();
    await this.enqueueFlush(true);
    this.assertHealthy();
  }

  async finalizeTrack(): Promise<PresentationTrackSummary> {
    if (!this.sidecarPath || !this.writerPromise) {
      throw new Error('No presentation track is active.');
    }
    if (this.isFinalizing) throw new Error('Presentation track finalization is already in progress.');

    this.isActive = false;
    this.isFinalizing = true;
    const durationMs = this.getCurrentTimeMs();
    const sidecarPath = this.sidecarPath;
    try {
      await this.enqueueFlush(true);
      const writer = await this.writerPromise;
      await writer.close();
      this.assertHealthy();
      return {
        sidecarPath,
        durationMs,
        lastSequence: this.sequence,
        failure: null,
      };
    } catch (error) {
      this.recordFailure(error);
      throw this.failure;
    } finally {
      this.resetAfterClose();
    }
  }

  /** Compatibility shim for legacy callers. New runtime wiring must await finalizeTrack(). */
  stopTrack(): void {
    if (!this.writerPromise || this.isFinalizing) return;
    void this.finalizeTrack().catch(() => undefined);
  }

  async discardTrack(): Promise<void> {
    const sidecarPath = this.sidecarPath;
    this.isActive = false;
    this.clearFlushTimer();
    this.bufferedLines = [];
    this.bufferedBytes = 0;
    try {
      await this.writeQueue;
      if (this.writerPromise) {
        const writer = await this.writerPromise;
        await writer.close();
      }
    } catch (error) {
      this.recordFailure(error);
    } finally {
      this.resetAfterClose();
      if (sidecarPath) await this.writerFactory.remove(sidecarPath);
    }
  }

  /** Compatibility shim for legacy callers. New runtime wiring must await discardTrack(). */
  cancelTrack(): void {
    void this.discardTrack().catch((error: unknown) => this.recordFailure(error));
  }

  getCurrentTimeMs(): number {
    if (this.startTime === null) return 0;
    const now = this.now();
    let elapsed = now - this.startTime;
    if (this.pauseStartTime !== null) elapsed -= now - this.pauseStartTime;
    return Math.max(0, elapsed - this.totalPauseDuration);
  }

  isRecording(): boolean {
    return this.isActive;
  }

  getFailure(): Error | null {
    return this.failure;
  }

  getSidecarPath(): string | null {
    return this.sidecarPath;
  }

  private createLegacyStartOptions(
    annotations: SceneAnnotation[],
    boardMode: string,
    boardColor: string,
    viewport: BoardViewport,
    createdAtEpochMs: number,
  ): PresentationTrackStartOptions {
    const normalizedViewport = {
      panX: viewport.panX ?? 0,
      panY: viewport.panY ?? 0,
      zoom: viewport.zoom ?? 1,
    };
    return {
      sessionId: `legacy-${createdAtEpochMs}`,
      createdAtEpochMs,
      source: {
        id: 'legacy-unresolved',
        name: 'Legacy unresolved source',
        type: 'display',
        displayId: null,
        windowHandle: null,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        scaleFactor: 1,
      },
      canvas: {
        width: 0,
        height: 0,
        originX: 0,
        originY: 0,
        coordinateSpace: 'desktop-dip',
      },
      initialScene: {
        annotations: clone(annotations),
        board: { backgroundMode: boardMode, boardColor, viewport: normalizedViewport },
        page: { id: 'legacy-page-0', index: 0 },
        spotlight: null,
        laserPoints: [],
      },
    };
  }

  private bufferRecord(record: PresentationTrackRecord): void {
    const line = `${JSON.stringify(record)}\n`;
    this.bufferedLines.push(line);
    this.bufferedBytes += Buffer.byteLength(line, 'utf8');
    if (this.bufferedBytes >= this.maxBufferedBytes) {
      void this.enqueueFlush(true).catch(() => undefined);
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer || this.flushIntervalMs < 0) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.enqueueFlush(true).catch(() => undefined);
    }, this.flushIntervalMs);
  }

  private enqueueFlush(durable: boolean): Promise<void> {
    this.clearFlushTimer();
    const content = this.bufferedLines.join('');
    this.bufferedLines = [];
    this.bufferedBytes = 0;
    const writerPromise = this.writerPromise;
    if (!writerPromise) return Promise.reject(new Error('Presentation-track writer is not open.'));

    const operation = this.writeQueue.then(async () => {
      const writer = await writerPromise;
      if (content) await writer.append(content);
      if (durable) await writer.sync();
    });
    const observed = operation.catch((error: unknown) => {
      this.recordFailure(error);
      throw this.failure;
    });
    this.writeQueue = observed.catch(() => undefined);
    return observed;
  }

  private recordFailure(error: unknown): void {
    if (this.failure) return;
    this.failure = error instanceof Error ? error : new Error(String(error));
    this.isActive = false;
    this.clearFlushTimer();
    this.emit('failure', this.failure);
  }

  private assertHealthy(): void {
    if (this.failure) throw this.failure;
  }

  private clearFlushTimer(): void {
    if (!this.flushTimer) return;
    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  private resetAfterClose(): void {
    this.clearFlushTimer();
    this.isActive = false;
    this.isFinalizing = false;
    this.startTime = null;
    this.pauseStartTime = null;
    this.totalPauseDuration = 0;
    this.sidecarPath = null;
    this.writerPromise = null;
    this.currentScene = null;
    this.bufferedLines = [];
    this.bufferedBytes = 0;
  }
}
