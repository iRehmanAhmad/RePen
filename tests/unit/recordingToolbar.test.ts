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

  it('keeps recorder controls clickable and above other windows for every active phase', () => {
    expect(mainSource).toContain("['starting', 'recording', 'paused', 'finalizing'].includes(recordingState?.phase)");
    expect(mainSource).toContain('toolbarWindow.setIgnoreMouseEvents(!(controlsActive || state.toolbarHovered)');
    expect(mainSource).toContain('toolbarWindow.showInactive()');
    expect(mainSource).toContain('toolbarWindow.moveTop()');
  });
});
