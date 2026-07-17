import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../..');
const editorSource = fs.readFileSync(path.join(repositoryRoot, 'src/renderer/editor.tsx'), 'utf8');
const preloadSource = fs.readFileSync(path.join(repositoryRoot, 'src/preload.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(repositoryRoot, 'main.js'), 'utf8');

describe('missing recording media recovery', () => {
  it('uses an explicit media-file picker rather than guessing a recording.mp4 path', () => {
    expect(editorSource).toContain('Relink Recording File');
    expect(editorSource).toContain('appBridge.relinkProjectMedia');
    expect(editorSource).not.toContain('${folder}/recording.mp4');
    expect(preloadSource).toContain("ipcRenderer.invoke('project:relink-media', currentMediaPath)");
    expect(mainSource).toContain("ipcMain.handle('project:relink-media'");
    expect(mainSource).toContain("properties: ['openFile']");
    expect(mainSource).toContain('validateFinalizedRecordingMedia({ screenVideoPath: result.filePaths[0] })');
  });

  it('offers safe recovery actions for a missing reference', () => {
    expect(editorSource).toContain('Reveal in Explorer');
    expect(editorSource).toContain('Remove Media Reference');
    expect(editorSource).toContain('appBridge.revealProjectMedia');
    expect(preloadSource).toContain("ipcRenderer.invoke('project:reveal-media', mediaPath)");
    expect(mainSource).toContain("ipcMain.handle('project:reveal-media'");
    expect(mainSource).toContain('shell.showItemInFolder(mediaPath)');
  });
});
