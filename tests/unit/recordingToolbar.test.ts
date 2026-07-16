import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');
const toolbarSource = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'toolbar.js'), 'utf8');
const mainSource = fs.readFileSync(path.join(projectRoot, 'main.js'), 'utf8');

describe('recording toolbar lifecycle', () => {
  it('keeps the RePen pen toolbar visible while the recorder HUD is active', () => {
    expect(toolbarSource).not.toMatch(/penBar\.style\.display\s*=\s*['"]none['"]/);
  });

  it('treats the recording HUD as an interactive hover region', () => {
    expect(toolbarSource).toContain("'.pen-bar, .recording-hud,");
  });

  it('renders the HUD from the authoritative recording state used by selector-based starts', () => {
    expect(toolbarSource).toContain('window.appBridge.onRecordingStateChanged(renderRecordingState)');
    expect(toolbarSource).toContain("['starting', 'recording', 'paused', 'finalizing'].includes(phase)");
    expect(toolbarSource).toContain("elements.recordingHud.style.display = hudVisible ? 'flex' : 'none'");
    expect(toolbarSource).toContain('window.appBridge.getRecordingState()');
  });

  it('keeps recorder controls clickable and above other windows for every active phase', () => {
    expect(mainSource).toContain("['starting', 'recording', 'paused', 'finalizing'].includes(payload.phase)");
    expect(mainSource).toContain('toolbarWindow.setIgnoreMouseEvents(false)');
    expect(mainSource).toContain('toolbarWindow.showInactive()');
    expect(mainSource).toContain('toolbarWindow.moveTop()');
  });
});
