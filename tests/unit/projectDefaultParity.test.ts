import { describe, expect, it } from 'vitest';
import { normalizeProjectEditor } from '../../src/shared/editor/projectPersistence';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createDefaultEditorState } = require('../../src/shared/editor/projectFactory.js');

describe('production project default parity', () => {
  it('keeps the main-process factory defaults aligned with typed editor normalization', () => {
    expect(createDefaultEditorState()).toEqual(normalizeProjectEditor({}));
  });

  it('keeps normalized collection defaults when a recording project is created', () => {
    const created = createDefaultEditorState({ zoomRegions: null, trimRegions: null, speedRegions: null, annotationRegions: null });
    expect(created.zoomRegions).toEqual([]);
    expect(created.trimRegions).toEqual([]);
    expect(created.speedRegions).toEqual([]);
    expect(created.annotationRegions).toEqual([]);
  });
});
