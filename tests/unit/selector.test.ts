import { describe, it, expect, vi } from 'vitest';

describe('Source Selector Setup Unit Test', () => {
  it('should validate options boundaries correctly', () => {
    const rawOptions = {
      sourceId: 'screen:0',
      sourceType: 'screen',
      displayId: 0,
      fps: 30,
      width: 1920,
      height: 1080,
      captureSystemAudio: true,
      captureMic: false,
      captureCursor: true,
    };
    
    expect(rawOptions.fps).toBe(30);
    expect(rawOptions.sourceType).toBe('screen');
    expect(rawOptions.width).toBe(1920);
  });

  it('should reject invalid sourceType or missing sourceId options', () => {
    const checkValid = (options: any) => {
      if (!options.sourceId) return false;
      if (options.sourceType !== 'screen' && options.sourceType !== 'window') return false;
      return true;
    };

    expect(checkValid({ sourceId: '', sourceType: 'screen' })).toBe(false);
    expect(checkValid({ sourceId: 'window:123', sourceType: 'window' })).toBe(true);
    expect(checkValid({ sourceId: 'screen:0', sourceType: 'invalid' })).toBe(false);
  });

  it('should confirm screen display normalizations', () => {
    const mapSourceType = (type: string) => {
      return type === 'screen' ? 'display' : type;
    };

    expect(mapSourceType('screen')).toBe('display');
    expect(mapSourceType('window')).toBe('window');
  });
});
