import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Windows release packaging assets check', () => {
  it('should have third_party_notices.md file in the workspace root', () => {
    const noticesPath = path.join(__dirname, '../../third_party_notices.md');
    expect(fs.existsSync(noticesPath)).toBe(true);
    
    const content = fs.readFileSync(noticesPath, 'utf8');
    expect(content).toContain('OpenScreen');
    expect(content).toContain('MIT License');
    expect(content).toContain('FFmpeg');
  });

  it('should have standard icon assets for windows installers', () => {
    const iconPath = path.join(__dirname, '../../src/renderer/assets/app-icon.png');
    expect(fs.existsSync(iconPath)).toBe(true);
  });
});
