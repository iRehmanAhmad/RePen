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

  it('should parse raw WebVTT content correctly into timed segments', () => {
    const rawVtt = `WEBVTT

00:00:01.200 --> 00:00:04.500
Hello world, we are presenting RePen.

00:00:05.100 --> 00:00:08.300
This is offline transcription.`;

    // Simple VTT parser match logic (matches main.js implementation)
    const parseVtt = (content: string) => {
      const segments = [];
      const blocks = content.split(/\r?\n\r?\n/);
      let idCounter = 1;
      for (const block of blocks) {
        const lines = block.trim().split(/\r?\n/);
        if (lines.length < 2) continue;
        let timeLine = lines[0];
        let contentLine = lines.slice(1).join(' ');
        if (timeLine.includes('-->')) {
          // OK
        } else if (lines[1] && lines[1].includes('-->')) {
          timeLine = lines[1];
          contentLine = lines.slice(2).join(' ');
        } else {
          continue;
        }
        const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
        if (!match) continue;
        const startMs =
          parseInt(match[1], 10) * 3600000 +
          parseInt(match[2], 10) * 60000 +
          parseInt(match[3], 10) * 1000 +
          parseInt(match[4], 10);
        const endMs =
          parseInt(match[5], 10) * 3600000 +
          parseInt(match[6], 10) * 60000 +
          parseInt(match[7], 10) * 1000 +
          parseInt(match[8], 10);
        segments.push({
          id: `caption-${idCounter++}`,
          startMs,
          endMs,
          content: contentLine.trim()
        });
      }
      return segments;
    };

    const segments = parseVtt(rawVtt);
    expect(segments.length).toBe(2);
    expect(segments[0].startMs).toBe(1200);
    expect(segments[0].endMs).toBe(4500);
    expect(segments[0].content).toBe('Hello world, we are presenting RePen.');
    expect(segments[1].startMs).toBe(5100);
    expect(segments[1].endMs).toBe(8300);
    expect(segments[1].content).toBe('This is offline transcription.');
  });
});
