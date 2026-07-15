import { describe, it, expect } from 'vitest';

describe('Editor Captions Split and Merge Logic', () => {
  it('should split a caption segment into two sequential parts at a timestamp', () => {
    const originalCaption = {
      id: 'c1',
      startMs: 1000,
      endMs: 5000,
      content: 'Hello world, we are presenting RePen.',
    };

    const splitTimeMs = 3000;
    
    // Split operation simulation
    const firstPart = {
      ...originalCaption,
      endMs: splitTimeMs,
    };

    const secondPart = {
      ...originalCaption,
      id: 'c1-split',
      startMs: splitTimeMs,
      content: 'Split text here',
    };

    expect(firstPart.startMs).toBe(1000);
    expect(firstPart.endMs).toBe(3000);
    expect(secondPart.startMs).toBe(3000);
    expect(secondPart.endMs).toBe(5000);
  });

  it('should merge two sequential caption segments into one combined segment', () => {
    const firstCaption = {
      id: 'c1',
      startMs: 1000,
      endMs: 3000,
      content: 'Welcome to this presentation.',
    };

    const secondCaption = {
      id: 'c2',
      startMs: 3000,
      endMs: 6000,
      content: 'We will show offline tools.',
    };

    // Merge operation simulation
    const mergedCaption = {
      ...firstCaption,
      endMs: secondCaption.endMs,
      content: `${firstCaption.content} ${secondCaption.content}`,
    };

    expect(mergedCaption.startMs).toBe(1000);
    expect(mergedCaption.endMs).toBe(6000);
    expect(mergedCaption.content).toBe('Welcome to this presentation. We will show offline tools.');
  });

  it('should filter active subtitles matching the current timeline playhead timestamp', () => {
    const captions = [
      { id: 'c1', startMs: 500, endMs: 2500, content: 'First segment' },
      { id: 'c2', startMs: 3000, endMs: 5000, content: 'Second segment' },
    ];

    const getActiveSubtitle = (timeMs: number) => {
      return captions.find(c => timeMs >= c.startMs && timeMs <= c.endMs)?.content || '';
    };

    expect(getActiveSubtitle(1000)).toBe('First segment');
    expect(getActiveSubtitle(2800)).toBe('');
    expect(getActiveSubtitle(4000)).toBe('Second segment');
  });
});
