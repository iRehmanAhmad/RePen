import { describe, it, expect } from 'vitest';
import {
  toFileUrl,
  fromFileUrl,
  normalizeProjectEditor,
  validateProjectData,
  migrateProjectData,
} from '../../src/shared/editor/projectPersistence';

describe('ProjectPersistence Utilities Unit Test', () => {
  it('should convert path to file URL', () => {
    expect(toFileUrl('C:\\temp\\recording.mp4')).toBe('file:///C:/temp/recording.mp4');
    expect(toFileUrl('/absolute/path')).toBe('file:///absolute/path');
  });

  it('should convert file URL to path', () => {
    expect(fromFileUrl('file:///C:/temp/recording.mp4')).toBe('C:/temp/recording.mp4');
  });

  it('should validate project data', () => {
    const invalid = { version: 1 };
    expect(validateProjectData(invalid)).toBe(false);

    const valid = {
      version: 2,
      editor: {
        wallpaper: '/wallpapers/wallpaper1.jpg',
        aspectRatio: '16:9',
      },
    };
    expect(validateProjectData(valid)).toBe(true);
  });

  it('should normalize editor states', () => {
    const raw = {
      padding: 150, // exceeds max, will be clamped
      aspectRatio: 'invalid-ratio' as any,
    };
    const norm = normalizeProjectEditor(raw);
    expect(norm.padding).toBe(100);
    expect(norm.aspectRatio).toBe('16:9');
  });
});
