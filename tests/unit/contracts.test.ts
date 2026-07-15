import { describe, it, expect } from 'vitest';
import { IpcResult } from '../../src/shared/contracts/ipc';

describe('IPC Contracts Types Test', () => {
  it('should successfully match IPC result payload schema', () => {
    const mockResult: IpcResult<string> = {
      success: true,
      data: 'Hello OpenScreen!'
    };
    expect(mockResult.success).toBe(true);
    expect(mockResult.data).toBe('Hello OpenScreen!');
  });
});
