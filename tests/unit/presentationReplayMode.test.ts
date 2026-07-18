import { describe, expect, it } from 'vitest';
import { migrateProjectData } from '../../src/shared/editor/projectPersistence';

describe('presentation replay data migration', () => {
  it('does not write a hydrated sidecar back into the project file during migration', () => {
    const track = { header: { presentationMode: 'sidecar' }, events: [], checkpoints: [] };
    const migrated = migrateProjectData({
      media: { screenVideoPath: 'C:\\video.mp4', presentationMode: 'sidecar' },
      presentationTrack: track as any
    });

    // presentationTrack should be removed from metadata to keep project persistence clean
    expect(migrated.presentationTrack).toBeUndefined();
  });
});
