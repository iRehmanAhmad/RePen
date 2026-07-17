'use strict';

function unavailable(reason) {
  return { available: false, reason };
}

function available() {
  return { available: true, reason: '' };
}

function recorderFailureReason(recorder) {
  return recorder?.reason || 'The native Windows capture capability is unavailable on this system.';
}

/**
 * Maps the native recorder probe to the user-facing feature contract.
 *
 * This module intentionally fails closed: a feature is available only when the
 * process that owns it has reported the capability. Features that need a later
 * licensed/compositor implementation remain explicitly unavailable instead of
 * exposing an enabled control that cannot fulfill its promise.
 */
function createAppCapabilities({ recorder = null } = {}) {
  const recorderReady = Boolean(recorder?.available && recorder?.supported);
  const recorderReason = recorderFailureReason(recorder);
  const optionalRecorderCapability = (enabled, unavailableReason) => (
    recorderReady && enabled === true ? available() : unavailable(recorderReady ? unavailableReason : recorderReason)
  );

  return {
    recorder: recorderReady ? available() : unavailable(recorderReason),
    selectedWindow: recorderReady ? available() : unavailable(recorderReason),
    systemAudio: optionalRecorderCapability(recorder?.systemAudio, 'System-audio capture was not reported by the native recorder.'),
    microphone: optionalRecorderCapability(recorder?.microphone, 'Microphone capture was not reported by the native recorder.'),
    webcam: optionalRecorderCapability(recorder?.webcam, 'Webcam capture was not reported by the native recorder.'),
    presentationReplay: unavailable('Presentation-track replay is not yet implemented in the production editor.'),
    captions: unavailable('Offline transcription is not installed. No caption model is bundled with this build.'),
    mp4Export: unavailable('MP4 export is disabled until the licensed compositor/export pipeline is packaged and verified.'),
    gifExport: unavailable('GIF export is disabled until the licensed compositor/export pipeline is packaged and verified.'),
  };
}

function getProjectExportAvailability() {
  return unavailable('Video export is disabled until the licensed compositor/export pipeline is packaged and verified.');
}

module.exports = {
  createAppCapabilities,
  getProjectExportAvailability,
};
