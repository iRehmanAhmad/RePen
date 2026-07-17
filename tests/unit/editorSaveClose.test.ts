import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const editorSource = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.tsx'), 'utf8');

describe('editor save and close recovery', () => {
  it('keeps save failures visible inside the editor and exposes save state', () => {
    expect(editorSource).toContain("const [saveStatus, setSaveStatus]");
    expect(editorSource).toContain("setEditorNotice(`Could not save project:");
    expect(editorSource).toContain('role="alert"');
    expect(editorSource).toContain('Saving…');
  });

  it('requires an explicit save or discard decision before the editor close action', () => {
    expect(editorSource).toContain("const handleCloseEditor = async () => {");
    expect(editorSource).toContain("Save changes before closing the editor?");
    expect(editorSource).toContain("Discard unsaved changes and close the editor?");
    expect(editorSource).toContain('void handleCloseEditor()');
  });

  it('implements the documented playback and editor shortcuts without stealing input editing keys', () => {
    expect(editorSource).toContain("e.key.toLowerCase() === 's'");
    expect(editorSource).toContain("e.code === 'Home'");
    expect(editorSource).toContain("e.code === 'End'");
    expect(editorSource).toContain('const isEditableTarget =');
  });
});
