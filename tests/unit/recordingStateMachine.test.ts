import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RecordingPhase, canRunRecordingCommand, recordingCommandError, validateRecordingCommand } = require('../../src/shared/recording/stateMachine.js');

describe('recording command state machine', () => {
  it('allows only the commands appropriate to each authoritative phase', () => {
    expect(canRunRecordingCommand(RecordingPhase.IDLE, 'start')).toBe(true);
    expect(canRunRecordingCommand(RecordingPhase.SELECTING, 'startCountdown')).toBe(true);
    expect(canRunRecordingCommand(RecordingPhase.COUNTDOWN, 'start')).toBe(true);
    expect(canRunRecordingCommand(RecordingPhase.RECORDING, 'pause')).toBe(true);
    expect(canRunRecordingCommand(RecordingPhase.PAUSED, 'resume')).toBe(true);
    expect(canRunRecordingCommand(RecordingPhase.PAUSED, 'stop')).toBe(true);
  });

  it('rejects duplicate and stale commands without changing recorder state', () => {
    expect(canRunRecordingCommand(RecordingPhase.STARTING, 'start')).toBe(false);
    expect(canRunRecordingCommand(RecordingPhase.FINALIZING, 'stop')).toBe(false);
    expect(canRunRecordingCommand(RecordingPhase.IDLE, 'pause')).toBe(false);
    expect(recordingCommandError(RecordingPhase.STARTING, 'start')).toBe('Cannot start while recording state is starting.');
  });

  it('rejects a command from a different session, phase, or duplicate command ID', () => {
    const processed = new Set(['already-used']);
    const base = {
      activeSessionId: 'session-1',
      currentPhase: RecordingPhase.RECORDING,
      expectedPhase: RecordingPhase.RECORDING,
      processedCommandIds: processed,
    };
    expect(validateRecordingCommand({ ...base, command: { sessionId: 'old-session', commandId: 'command-123', expectedPhase: 'recording' } }))
      .toBe('This recording command belongs to an inactive session.');
    expect(validateRecordingCommand({ ...base, command: { sessionId: 'session-1', commandId: 'command-123', expectedPhase: 'paused' } }))
      .toBe('This recording command is stale; current state is recording.');
    expect(validateRecordingCommand({ ...base, command: { sessionId: 'session-1', commandId: 'already-used', expectedPhase: 'recording' } }))
      .toBe('This recording command was already processed.');
    expect(validateRecordingCommand({ ...base, command: { sessionId: 'session-1', commandId: 'command-123', expectedPhase: 'recording' } }))
      .toBeNull();
  });
});
