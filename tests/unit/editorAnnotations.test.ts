import { describe, expect, it } from 'vitest';
import { AnnotationRegion } from '../../src/shared/editor/types';

describe('Editor custom annotations sorting and filtering', () => {
  it('correctly filters active annotations based on playhead timeMs', () => {
    const annotations: AnnotationRegion[] = [
      {
        id: 'ann-1',
        startMs: 1000,
        endMs: 3000,
        type: 'text',
        content: 'Hello',
        position: { x: 50, y: 50 },
        size: { width: 30, height: 20 },
        style: {
          color: '#ffffff',
          backgroundColor: 'transparent',
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          textAnimation: 'none',
        },
        zIndex: 1,
      },
      {
        id: 'ann-2',
        startMs: 2000,
        endMs: 5000,
        type: 'highlight',
        content: '',
        position: { x: 10, y: 10 },
        size: { width: 10, height: 10 },
        style: {
          color: '#ffffff',
          backgroundColor: 'yellow',
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          textAnimation: 'none',
        },
        zIndex: 2,
      },
    ];

    // Seek to 1500ms -> only ann-1 should be active
    const activeAt1500 = annotations.filter(a => 1500 >= a.startMs && 1500 <= a.endMs);
    expect(activeAt1500).toHaveLength(1);
    expect(activeAt1500[0].id).toBe('ann-1');

    // Seek to 2500ms -> both should be active
    const activeAt2500 = annotations.filter(a => 2500 >= a.startMs && 2500 <= a.endMs);
    expect(activeAt2500).toHaveLength(2);

    // Seek to 4000ms -> only ann-2 should be active
    const activeAt4000 = annotations.filter(a => 4000 >= a.startMs && 4000 <= a.endMs);
    expect(activeAt4000).toHaveLength(1);
    expect(activeAt4000[0].id).toBe('ann-2');
  });

  it('correctly sorts active annotations by zIndex layer order', () => {
    const annotations: AnnotationRegion[] = [
      {
        id: 'ann-top',
        startMs: 1000,
        endMs: 3000,
        type: 'redaction',
        content: '',
        position: { x: 50, y: 50 },
        size: { width: 30, height: 20 },
        style: {
          color: '#ffffff',
          backgroundColor: 'transparent',
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          textAnimation: 'none',
        },
        zIndex: 10,
      },
      {
        id: 'ann-bottom',
        startMs: 1000,
        endMs: 3000,
        type: 'text',
        content: 'Underneath',
        position: { x: 50, y: 50 },
        size: { width: 30, height: 20 },
        style: {
          color: '#ffffff',
          backgroundColor: 'transparent',
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'center',
          textAnimation: 'none',
        },
        zIndex: 1,
      },
    ];

    const sorted = [...annotations].sort((a, b) => a.zIndex - b.zIndex);
    expect(sorted[0].id).toBe('ann-bottom');
    expect(sorted[1].id).toBe('ann-top');
  });
});
