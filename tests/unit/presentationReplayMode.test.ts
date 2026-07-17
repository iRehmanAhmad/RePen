import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { migrateProjectData } from '../../src/shared/editor/projectPersistence';

const editorSource = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.tsx'), 'utf8');
const mainSource = fs.readFileSync(path.resolve(__dirname, '../../main.js'), 'utf8');

describe('presentation replay mode', () => {
  it('replays a presentation sidecar only for sidecar projects', () => {
    expect(editorSource).toContain("project.media?.presentationMode === 'sidecar'");
    expect(mainSource).toContain('function hydratePresentationTrack(project)');
    expect(mainSource).toContain('parsePresentationTrackJsonl');
  });

  it('does not write a hydrated sidecar back into the project file', () => {
    const track = { header: { presentationMode: 'sidecar' }, events: [], checkpoints: [] };
    expect(migrateProjectData({ media: { screenVideoPath: 'C:\\video.mp4', presentationMode: 'sidecar' }, presentationTrack: track }).presentationTrack)
      .toBeUndefined();
  });
});
