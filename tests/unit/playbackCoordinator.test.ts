import { describe, it, expect } from 'vitest';
import { PlaybackCoordinator } from '../../src/renderer/presenter/editor/playbackCoordinator';
import { getSmoothedCursorPosition } from '../../src/renderer/presenter/editor/cursorTelemetryRenderer';
import { CursorTelemetryPoint } from '../../src/shared/editor/types';

describe('PlaybackCoordinator Unit Test', () => {
  it('should resolve correct speed regions', () => {
    const coordinator = new PlaybackCoordinator();
    coordinator.setRegions(
      [
        { id: 's1', startMs: 1000, endMs: 2000, speed: 2.0 },
        { id: 's2', startMs: 3000, endMs: 5000, speed: 0.5 },
      ],
      []
    );
    
    expect(coordinator.getSpeedAtTime(500)).toBe(1.0);
    expect(coordinator.getSpeedAtTime(1500)).toBe(2.0);
    expect(coordinator.getSpeedAtTime(2500)).toBe(1.0);
    expect(coordinator.getSpeedAtTime(4000)).toBe(0.5);
  });

  it('should identify trim regions and skip boundaries', () => {
    const coordinator = new PlaybackCoordinator();
    let seekedTime: number | null = null;
    
    // Mock standard HTML5 video element seek behavior
    const mockVideo = {
      get currentTime() { return 1.5; },
      set currentTime(val: number) { seekedTime = val * 1000; }
    } as any;
    
    coordinator.setElements(mockVideo);
    coordinator.setRegions(
      [],
      [
        { id: 't1', startMs: 1000, endMs: 2000 }
      ]
    );

    const hit = coordinator.checkTrimRegions(1500);
    expect(hit).toBe(true);
    expect(seekedTime).toBe(2000);
  });
});

describe('CursorTelemetryRenderer Unit Test', () => {
  it('should interpolate cursor coordinates linearly', () => {
    const points: CursorTelemetryPoint[] = [
      { timeMs: 0, cx: 10, cy: 20, cursorType: 'arrow' },
      { timeMs: 100, cx: 20, cy: 40, cursorType: 'text' },
    ];
    
    const c1 = getSmoothedCursorPosition(points, 0);
    expect(c1.cx).toBe(10);
    expect(c1.cy).toBe(20);
    expect(c1.type).toBe('arrow');
    
    const c2 = getSmoothedCursorPosition(points, 50);
    expect(c2.cx).toBe(15);
    expect(c2.cy).toBe(30);
    expect(c2.type).toBe('arrow');
    
    const c3 = getSmoothedCursorPosition(points, 100);
    expect(c3.cx).toBe(20);
    expect(c3.cy).toBe(40);
    expect(c3.type).toBe('text');
  });

  it('should flag mouse click overlay bounces in window interval', () => {
    const points: CursorTelemetryPoint[] = [
      { timeMs: 50, cx: 10, cy: 10, interactionType: 'click' },
      { timeMs: 200, cx: 20, cy: 20 },
    ];
    
    const c1 = getSmoothedCursorPosition(points, 100, 150);
    expect(c1.click).toBe(true);
    
    const c2 = getSmoothedCursorPosition(points, 250, 150);
    expect(c2.click).toBe(false);
  });
});
