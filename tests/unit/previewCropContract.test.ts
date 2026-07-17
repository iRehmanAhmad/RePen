import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../../src/renderer/editor.tsx'), 'utf8');

describe('preview crop contract', () => {
  it('uses shared normalized crop geometry for both video and annotation layers', () => {
    expect(source).toContain('normalizeCropForRender(project?.editor.cropRegion)');
    expect(source).toContain('className="crop-viewport"');
    expect(source).toContain('style={getCropMediaStyle()}');
  });
});
