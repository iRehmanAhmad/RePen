import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  parsePresentationTrackJsonl,
  PresentationTrackService,
  replayPresentationTrack,
  type PresentationTrackServiceOptions,
  type PresentationTrackStartOptions,
  type PresentationTrackWriter,
  type PresentationTrackWriterFactory,
} from '../../electron/services/presentationTrack';
import { seekPresentationTrack } from '../../src/renderer/presenter/presentationTrackReplay';

const temporaryDirectories: string[] = [];

function createOutputPath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'repen-presentation-track-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'recording.mp4');
}

function createStartOptions(createdAtEpochMs = 1_000): PresentationTrackStartOptions {
  return {
    sessionId: 'session-test-001',
    createdAtEpochMs,
    source: {
      id: 'display:2528732444',
      name: 'Primary display',
      type: 'display',
      displayId: 2_528_732_444,
      windowHandle: null,
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1.25,
    },
    canvas: {
      width: 1920,
      height: 1080,
      originX: -1920,
      originY: 0,
      coordinateSpace: 'desktop-dip',
    },
    initialScene: {
      annotations: [],
      board: {
        backgroundMode: 'transparent',
        boardColor: '#ffffff',
        viewport: { panX: 0, panY: 0, zoom: 1 },
      },
      page: { id: 'desktop', index: 0 },
      spotlight: null,
      laserPoints: [],
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('PresentationTrackService', () => {
  it('writes a deterministic schema-v2 header with source, canvas, DPI, and page metadata', async () => {
    let now = 1_000;
    const outputPath = createOutputPath();
    const tracker = new PresentationTrackService({ now: () => now, flushIntervalMs: -1 });
    const options = createStartOptions(now);

    const header = tracker.startTrack(outputPath, options);
    now = 1_025;
    tracker.addEvent('annotation/add', { annotation: { id: 'ink-1', tool: 'pen' } });
    const summary = await tracker.finalizeTrack();

    const parsed = parsePresentationTrackJsonl(fs.readFileSync(summary.sidecarPath, 'utf8'));
    expect(header).toEqual(parsed.header);
    expect(parsed.header).toMatchObject({
      type: 'header',
      schemaVersion: 2,
      sessionId: 'session-test-001',
      createdAtEpochMs: 1_000,
      source: {
        id: 'display:2528732444',
        type: 'display',
        displayId: 2_528_732_444,
        windowHandle: null,
        bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
        scaleFactor: 1.25,
      },
      canvas: {
        width: 1920,
        height: 1080,
        originX: -1920,
        originY: 0,
        coordinateSpace: 'desktop-dip',
      },
      initialScene: { page: { id: 'desktop', index: 0 } },
    });
    expect(parsed.events[0]).toMatchObject({ seq: 1, timeMs: 25, type: 'annotation/add' });
    expect(summary).toMatchObject({ durationMs: 25, lastSequence: 1, failure: null });
  });

  it('uses active recording time and freezes timestamps while paused', async () => {
    let now = 5_000;
    const tracker = new PresentationTrackService({ now: () => now, flushIntervalMs: -1 });
    tracker.startTrack(createOutputPath(), createStartOptions(now));

    now += 50;
    expect(tracker.getCurrentTimeMs()).toBe(50);
    tracker.pauseTrack();
    now += 2_000;
    expect(tracker.getCurrentTimeMs()).toBe(50);
    tracker.resumeTrack();
    now += 30;
    expect(tracker.getCurrentTimeMs()).toBe(80);

    await tracker.finalizeTrack();
  });

  it('preserves selected-window HWND and capture bounds in the header', async () => {
    const outputPath = createOutputPath();
    const tracker = new PresentationTrackService({ now: () => 2_000, flushIntervalMs: -1 });
    const options = createStartOptions(2_000);
    options.source = {
      id: 'window:987654:0',
      name: 'Lesson slides',
      type: 'window',
      displayId: null,
      windowHandle: '987654',
      bounds: { x: 120, y: 80, width: 1280, height: 720 },
      scaleFactor: 1.5,
    };
    tracker.startTrack(outputPath, options);

    const summary = await tracker.finalizeTrack();
    const parsed = parsePresentationTrackJsonl(fs.readFileSync(summary.sidecarPath, 'utf8'));
    expect(parsed.header.source).toEqual(options.source);
  });

  it('creates checkpoints and deterministically seeks from the nearest checkpoint', async () => {
    let now = 10_000;
    const outputPath = createOutputPath();
    const tracker = new PresentationTrackService({
      now: () => now,
      flushIntervalMs: -1,
      checkpointEveryEvents: 2,
    });
    tracker.startTrack(outputPath, createStartOptions(now));

    now += 10;
    tracker.addEvent('annotation/add', { annotation: { id: 'a', tool: 'pen', color: '#f00' } });
    now += 10;
    tracker.addEvent('annotation/update', { annotation: { id: 'a', tool: 'pen', color: '#0f0' } });
    now += 10;
    tracker.addEvent('annotation/add', { annotation: { id: 'b', tool: 'text' } });
    now += 10;
    tracker.addEvent('annotation/delete', { annotationIds: ['a'] });
    now += 10;
    tracker.addEvent('laser/sample', { point: { x: 200, y: 150 } });
    const summary = await tracker.finalizeTrack();
    const track = parsePresentationTrackJsonl(fs.readFileSync(summary.sidecarPath, 'utf8'));

    expect(track.checkpoints.map((checkpoint) => checkpoint.seq)).toEqual([3, 6]);
    expect(replayPresentationTrack(track, 15).annotations).toEqual([
      { id: 'a', tool: 'pen', color: '#f00' },
    ]);
    expect(replayPresentationTrack(track, 35).annotations).toEqual([
      { id: 'a', tool: 'pen', color: '#0f0' },
      { id: 'b', tool: 'text' },
    ]);
    expect(replayPresentationTrack(track, 40).annotations).toEqual([
      { id: 'b', tool: 'text' },
    ]);
    expect(seekPresentationTrack(track, 35)).toEqual(replayPresentationTrack(track, 35));
    expect(seekPresentationTrack(track, 55).laserPoints).toEqual([
      { x: 200, y: 150, timeMs: 50 },
    ]);
    expect(seekPresentationTrack(track, 500).laserPoints).toEqual([]);
  });

  it('surfaces asynchronous writer failures and stops accepting events', async () => {
    const writeError = new Error('disk full');
    const writer: PresentationTrackWriter = {
      append: vi.fn().mockRejectedValue(writeError),
      sync: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const writerFactory: PresentationTrackWriterFactory = {
      create: vi.fn().mockResolvedValue(writer),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const options: PresentationTrackServiceOptions = {
      now: () => 1_000,
      flushIntervalMs: -1,
      writerFactory,
    };
    const tracker = new PresentationTrackService(options);
    const failureListener = vi.fn();
    tracker.on('failure', failureListener);
    tracker.startTrack(createOutputPath(), createStartOptions());

    await expect(tracker.flush()).rejects.toThrow('disk full');
    expect(failureListener).toHaveBeenCalledWith(writeError);
    expect(tracker.getFailure()).toBe(writeError);
    expect(tracker.isRecording()).toBe(false);
    expect(() => tracker.addEvent('scene/clear', { scope: 'current' })).toThrow('disk full');
    await tracker.discardTrack();
  });

  it('rejects corrupt or out-of-order tracks before replay', () => {
    const header = {
      type: 'header',
      schemaVersion: 2,
      ...createStartOptions(),
      clock: { unit: 'milliseconds', origin: 'recording-active-time' },
    };
    const contents = [
      JSON.stringify(header),
      JSON.stringify({ seq: 2, timeMs: 10, type: 'scene/clear', scope: 'current' }),
      JSON.stringify({ seq: 1, timeMs: 20, type: 'scene/clear', scope: 'current' }),
    ].join('\n');

    expect(() => parsePresentationTrackJsonl(contents)).toThrow('strictly increasing');
  });
});
