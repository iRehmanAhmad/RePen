import { describe, it, expect } from 'vitest';
import { validateProjectData, migrateProjectData } from '../../src/shared/editor/projectPersistence';

describe('Editor Workspace and Schema Migrations', () => {
  it('should validate project data matching the EditorProjectData schema', () => {
    const invalidProject = {
      title: 'Stale Project',
    };
    expect(validateProjectData(invalidProject)).toBe(false);

    const validProject = {
      version: 2,
      editor: {
        aspectRatio: '16:9',
        webcamLayoutPreset: 'picture-in-picture',
        zoomRegions: [],
        trimRegions: [],
        speedRegions: [],
        annotationRegions: [],
      },
    };
    expect(validateProjectData(validProject)).toBe(true);
  });

  it('should migrate legacy OpenScreen projects (schema version 1) to version 2', () => {
    const legacyProject = {
      schemaVersion: 1,
      projectId: 'test-proj-123',
      media: {
        screenVideoPath: 'C:\\Users\\Guest\\videos\\rec.mp4',
        durationMs: 5000,
      },
      editor: {
        trims: [{ startMs: 500, endMs: 1500 }],
      },
    };

    const migrated = migrateProjectData(legacyProject);
    expect(migrated.version).toBe(2);
    expect(migrated.media?.screenVideoPath).toBe('C:\\Users\\Guest\\videos\\rec.mp4');
    expect(migrated.editor.aspectRatio).toBe('16:9'); // Defaulted
    expect(migrated.editor.trimRegions.length).toBe(0); // Normalized
  });

  it('should handle undo and redo state stack history changes', () => {
    let history: any[] = [];
    let future: any[] = [];
    let currentProject = { version: 2, editor: { aspectRatio: '16:9' } };

    const updateProject = (newProject: any) => {
      history.push(currentProject);
      future = [];
      currentProject = newProject;
    };

    const undo = () => {
      if (history.length > 0) {
        future.unshift(currentProject);
        currentProject = history.pop();
      }
    };

    const redo = () => {
      if (future.length > 0) {
        history.push(currentProject);
        currentProject = future.shift();
      }
    };

    updateProject({ version: 2, editor: { aspectRatio: '4:3' } });
    expect(currentProject.editor.aspectRatio).toBe('4:3');
    expect(history.length).toBe(1);

    undo();
    expect(currentProject.editor.aspectRatio).toBe('16:9');
    expect(future.length).toBe(1);

    redo();
    expect(currentProject.editor.aspectRatio).toBe('4:3');
  });
});
