'use strict';

const RecordingPhase = Object.freeze({
  IDLE: 'idle',
  SELECTING: 'selecting',
  COUNTDOWN: 'countdown',
  STARTING: 'starting',
  RECORDING: 'recording',
  PAUSED: 'paused',
  FINALIZING: 'finalizing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RECOVERING: 'recovering',
});

const COMMAND_PHASES = Object.freeze({
  openSetup: new Set([RecordingPhase.IDLE, RecordingPhase.FAILED]),
  closeSetup: new Set([RecordingPhase.SELECTING]),
  startCountdown: new Set([RecordingPhase.SELECTING]),
  closeCountdown: new Set([RecordingPhase.COUNTDOWN]),
  start: new Set([RecordingPhase.IDLE, RecordingPhase.SELECTING, RecordingPhase.COUNTDOWN, RecordingPhase.FAILED]),
  pause: new Set([RecordingPhase.RECORDING]),
  resume: new Set([RecordingPhase.PAUSED]),
  stop: new Set([RecordingPhase.RECORDING, RecordingPhase.PAUSED]),
  cancel: new Set([RecordingPhase.STARTING, RecordingPhase.RECORDING, RecordingPhase.PAUSED, RecordingPhase.FAILED]),
  restart: new Set([RecordingPhase.STARTING, RecordingPhase.RECORDING, RecordingPhase.PAUSED, RecordingPhase.FAILED]),
});

function canRunRecordingCommand(phase, command) {
  return Boolean(COMMAND_PHASES[command]?.has(phase));
}

function recordingCommandError(phase, command) {
  return `Cannot ${command} while recording state is ${phase}.`;
}

function validateRecordingCommand({ command, activeSessionId, currentPhase, expectedPhase, processedCommandIds }) {
  if (!command || typeof command !== 'object') return 'Recording command metadata is required.';
  if (command.sessionId !== activeSessionId || !activeSessionId) return 'This recording command belongs to an inactive session.';
  if (command.expectedPhase !== expectedPhase || currentPhase !== expectedPhase) {
    return `This recording command is stale; current state is ${currentPhase}.`;
  }
  if (typeof command.commandId !== 'string' || command.commandId.length < 8 || command.commandId.length > 256) {
    return 'Recording command ID is invalid.';
  }
  if (processedCommandIds.has(command.commandId)) return 'This recording command was already processed.';
  return null;
}

module.exports = {
  RecordingPhase,
  canRunRecordingCommand,
  recordingCommandError,
  validateRecordingCommand,
};
