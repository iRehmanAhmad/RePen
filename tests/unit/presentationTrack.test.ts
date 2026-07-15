import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PresentationTrackService } from '../../electron/services/presentationTrack';

describe('PresentationTrackService Unit Test', () => {
  let tracker: PresentationTrackService;
  const mockPath = path.join(__dirname, 'mock-recording.mp4');

  beforeEach(() => {
    tracker = new PresentationTrackService();
  });

  afterEach(() => {
    tracker.stopTrack();
    const sidecar = mockPath + '.presentation.jsonl';
    if (fs.existsSync(sidecar)) {
      try {
        fs.unlinkSync(sidecar);
      } catch (err) {}
    }
  });

  it('should initialize and write initial scene to sidecar', () => {
    tracker.startTrack(mockPath, [], 'desktop', '#ffffff', { panX: 0, panY: 0, zoom: 1 });
    const sidecar = mockPath + '.presentation.jsonl';
    expect(fs.existsSync(sidecar)).toBe(true);

    const content = fs.readFileSync(sidecar, 'utf8').trim().split('\n');
    expect(content).toHaveLength(1);
    const parsed = JSON.parse(content[0]);
    expect(parsed.type).toBe('initial');
    expect(parsed.initialScene.boardMode).toBe('desktop');
  });

  it('should calculate active elapsed time correctly with pauses', async () => {
    tracker.startTrack(mockPath, [], 'desktop', '#ffffff', { panX: 0, panY: 0, zoom: 1 });
    
    // Simulate active recording time passing (50ms)
    await new Promise(resolve => setTimeout(resolve, 50));
    const t1 = tracker.getCurrentTimeMs();
    expect(t1).toBeGreaterThanOrEqual(40);

    // Pause tracking
    tracker.pauseTrack();
    await new Promise(resolve => setTimeout(resolve, 50));
    const t2 = tracker.getCurrentTimeMs();
    // Time should remain constant during pause
    expect(t2).toBeLessThanOrEqual(t1 + 5);

    // Resume tracking
    tracker.resumeTrack();
    await new Promise(resolve => setTimeout(resolve, 50));
    const t3 = tracker.getCurrentTimeMs();
    // Time should advance again after resume
    expect(t3).toBeGreaterThan(t2 + 40);
  });

  it('should append events correctly', () => {
    tracker.startTrack(mockPath, [], 'desktop', '#ffffff', { panX: 0, panY: 0, zoom: 1 });
    tracker.addEvent('annotation/add', { annotation: { id: '1', tool: 'pen' } });
    
    const sidecar = mockPath + '.presentation.jsonl';
    const content = fs.readFileSync(sidecar, 'utf8').trim().split('\n');
    expect(content).toHaveLength(2);
    const event = JSON.parse(content[1]);
    expect(event.type).toBe('annotation/add');
    expect(event.annotation.id).toBe('1');
  });
});
