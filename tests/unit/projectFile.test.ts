import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { writeProjectFileAtomically } = require('../../src/shared/editor/projectFile.js');

describe('atomic project persistence', () => {
  it('replaces a project with complete JSON and leaves no temporary file behind', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'repen-project-'));
    const target = path.join(directory, 'recording.repen-project');
    try {
      fs.writeFileSync(target, '{"version":1}', 'utf8');
      const expected = { version: 2, editor: { aspectRatio: '16:9' } };

      writeProjectFileAtomically(target, expected);

      expect(JSON.parse(fs.readFileSync(target, 'utf8'))).toEqual(expected);
      expect(fs.readdirSync(directory)).toEqual(['recording.repen-project']);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('removes a temporary file when replacement fails', () => {
    const writes: string[] = [];
    const fakeFs = {
      writeFileSync(filePath: string) { writes.push(filePath); },
      renameSync() { throw new Error('replacement denied'); },
      unlinkSync(filePath: string) { writes.push(`removed:${filePath}`); },
    };

    expect(() => writeProjectFileAtomically('C:\\projects\\recording.repen-project', { version: 2 }, fakeFs))
      .toThrow('replacement denied');
    expect(writes).toHaveLength(2);
    expect(writes[1]).toBe(`removed:${writes[0]}`);
  });
});
