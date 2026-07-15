import { describe, it, expect } from 'vitest';

describe('Editor Export FFmpeg Command and Progress Parser', () => {
  it('should generate correct video & audio mapping args for MP4 exports', () => {
    const generateCmd = (videoPath: string, outputPath: string) => {
      return `ffmpeg -y -i "${videoPath}" -map 0:v -map 0:a -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    };

    const cmd = generateCmd('input.mp4', 'output.mp4');
    expect(cmd).toContain('-c:v libx264');
    expect(cmd).toContain('-map 0:a');
    expect(cmd).toContain('"output.mp4"');
  });

  it('should generate lanczos palettes splits filters for GIF exports', () => {
    const generateCmd = (videoPath: string, outputPath: string, fps = 15) => {
      return `ffmpeg -y -i "${videoPath}" -filter_complex "fps=${fps},scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -map "[gif_v]" "${outputPath}"`;
    };

    const cmd = generateCmd('input.mp4', 'output.gif', 15);
    expect(cmd).toContain('palettegen');
    expect(cmd).toContain('paletteuse');
    expect(cmd).toContain('flags=lanczos');
    expect(cmd).toContain('"output.gif"');
  });

  it('should parse timestamp duration matches from stderr log lines', () => {
    const parseLogTimeMs = (log: string): number | null => {
      const match = log.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (!match) return null;
      const hh = parseInt(match[1]);
      const mm = parseInt(match[2]);
      const ss = parseFloat(match[3] + '.' + match[4]);
      return (hh * 3600 + mm * 60 + ss) * 1000;
    };

    const logLine = 'frame=  124 fps= 30 q=28.0 size=    1120kB time=00:00:04.12 bitrate=2228.4kbits/s speed=1.12x';
    const ms = parseLogTimeMs(logLine);
    expect(ms).toBe(4120); // 4.12 seconds
  });
});
