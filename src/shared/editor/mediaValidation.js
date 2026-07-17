'use strict';

function assertNonEmptyFile(filePath, label, fileSystem) {
  if (typeof filePath !== 'string' || !filePath) throw new Error(`${label} path is missing.`);
  let stats;
  try {
    stats = fileSystem.statSync(filePath);
  } catch {
    throw new Error(`${label} file could not be found.`);
  }
  if (!stats.isFile() || stats.size <= 0) throw new Error(`${label} file is empty or invalid.`);
}

function validateFinalizedRecordingMedia(media, fileSystem = require('fs')) {
  if (!media || typeof media !== 'object') throw new Error('Recording media is required.');
  assertNonEmptyFile(media.screenVideoPath, 'Screen recording', fileSystem);
  if (media.webcamVideoPath) assertNonEmptyFile(media.webcamVideoPath, 'Webcam recording', fileSystem);
  if (media.nativeSessionPath) assertNonEmptyFile(media.nativeSessionPath, 'Presentation sidecar', fileSystem);
  return true;
}

module.exports = { validateFinalizedRecordingMedia };
