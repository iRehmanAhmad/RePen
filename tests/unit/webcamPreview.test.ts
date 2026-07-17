import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.tsx'), 'utf8');

describe('webcam preview media', () => {
  it('synchronizes optional webcam media and surfaces a non-blocking missing state', () => {
    expect(source).toContain('coord.setElements(video, webcamVideoRef.current, null)');
    expect(source).toContain('className="webcam-video"');
    expect(source).toContain('setWebcamMissing(true)');
    expect(source).toContain('Screen editing can continue without it.');
  });
});
