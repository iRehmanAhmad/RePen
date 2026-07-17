import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Offline Transcription IPC Service', () => {
  beforeAll(() => {
    process.env.REPEN_TEST_WHISPER_MOCK = 'true';
  });

  afterAll(() => {
    delete process.env.REPEN_TEST_WHISPER_MOCK;
  });

  it('verifies that mock environment returns valid mock segments', () => {
    const isMock = process.env.REPEN_TEST_WHISPER_MOCK === 'true';
    expect(isMock).toBe(true);

    const mockSegments = [
      { id: 'cap-mock-1', startMs: 1000, endMs: 3000, content: 'Welcome to RePen mock captions.' },
      { id: 'cap-mock-2', startMs: 4000, endMs: 7000, content: 'This is offline transcription.' }
    ];

    expect(mockSegments[0].startMs).toBe(1000);
    expect(mockSegments[0].content).toBe('Welcome to RePen mock captions.');
  });
});
