import { describe, it, expect } from 'vitest';
import { generateFFmpegCommand } from '../../src/shared/editor/ffmpegCommandGenerator';

describe('FFmpegCommandGenerator Unit Test', () => {
  it('should generate basic map command without filters', () => {
    const cmd = generateFFmpegCommand({
      videoPath: 'input.mp4',
      outputPath: 'output.mp4',
      speeds: [],
      trims: [],
    });
    
    expect(cmd).toContain('-i "input.mp4"');
    expect(cmd).toContain('-map 0:v -map 0:a');
    expect(cmd).toContain('"output.mp4"');
  });

  it('should inject crop filter details correctly', () => {
    const cmd = generateFFmpegCommand({
      videoPath: 'input.mp4',
      outputPath: 'output.mp4',
      speeds: [],
      trims: [],
      cropRegion: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
    });
    
    expect(cmd).toContain('crop=w=iw*0.8:h=ih*0.6:x=iw*0.1:y=ih*0.2');
    expect(cmd).toContain('-map "[cropped_v]"');
  });

  it('should inject webcam scaling and overlay positioning parameters', () => {
    const cmd = generateFFmpegCommand({
      videoPath: 'input.mp4',
      webcamVideoPath: 'webcam.mp4',
      outputPath: 'output.mp4',
      speeds: [],
      trims: [],
      webcamLayoutPreset: 'picture-in-picture',
      webcamSizePreset: 30,
      webcamPosition: { cx: 0.8, cy: 0.8 },
    });
    
    expect(cmd).toContain('-i "webcam.mp4"');
    expect(cmd).toContain('scale=iw*0.3:-1');
    expect(cmd).toContain('overlay=x=main_w*0.8-w/2:y=main_h*0.8-h/2');
    expect(cmd).toContain('-map "[webcam_overlay_v]"');
  });
});
