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

module.exports = {
  RecordingPhase,
  canRunRecordingCommand,
  recordingCommandError,
};
