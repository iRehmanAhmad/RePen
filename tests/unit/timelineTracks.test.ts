import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMELINE_TRACKS, normalizeProjectEditor } from '../../src/shared/editor/projectPersistence';

describe('timeline track state', () => {
  it('defaults every persisted track to visible and unlocked', () => {
    expect(Object.keys(DEFAULT_TIMELINE_TRACKS)).toEqual(['screen', 'webcam', 'presentation', 'effects', 'captions', 'audio']);
    expect(normalizeProjectEditor({}).timelineTracks).toEqual(DEFAULT_TIMELINE_TRACKS);
  });

  it('persists validated visibility and lock choices', () => {
    const tracks = normalizeProjectEditor({ timelineTracks: { ...DEFAULT_TIMELINE_TRACKS, captions: { visible: false, locked: true } } });
    expect(tracks.timelineTracks.captions).toEqual({ visible: false, locked: true });
  });
});
