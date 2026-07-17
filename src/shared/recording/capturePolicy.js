'use strict';

const WindowRole = Object.freeze({
  PRESENTATION_OVERLAY: 'presentation-overlay',
  TOOLBAR: 'toolbar',
  SELECTOR: 'selector',
  COUNTDOWN: 'countdown',
  SETTINGS: 'settings',
  EDITOR: 'editor',
  DIALOG: 'dialog',
  RECOVERY: 'recovery',
  WEBCAM_PREVIEW: 'webcam-preview',
});

const CONTROL_WINDOW_ROLES = new Set([
  WindowRole.TOOLBAR,
  WindowRole.SELECTOR,
  WindowRole.COUNTDOWN,
  WindowRole.SETTINGS,
  WindowRole.DIALOG,
  WindowRole.RECOVERY,
  WindowRole.WEBCAM_PREVIEW,
]);

function shouldExcludeFromCapture(role) {
  return CONTROL_WINDOW_ROLES.has(role);
}

function sourceHandleCandidates(sourceId) {
  if (typeof sourceId !== 'string') return [];
  const match = sourceId.match(/^window:([^:]+):/i);
  if (!match) return [];
  const raw = match[1].toLowerCase();
  if (/^0x[0-9a-f]+$/.test(raw)) {
    try {
      const value = BigInt(raw);
      return [raw, value.toString(10)];
    } catch {
      return [raw];
    }
  }
  if (/^[1-9][0-9]*$/.test(raw)) {
    try {
      const value = BigInt(raw);
      return [raw, `0x${value.toString(16)}`];
    } catch {
      return [raw];
    }
  }
  return [];
}

function nativeWindowHandleCandidates(nativeWindowHandle) {
  if (!Buffer.isBuffer(nativeWindowHandle) || nativeWindowHandle.length < 4) return [];
  try {
    const value = nativeWindowHandle.length >= 8
      ? nativeWindowHandle.readBigUInt64LE(0)
      : BigInt(nativeWindowHandle.readUInt32LE(0));
    return [value.toString(10), `0x${value.toString(16)}`];
  } catch {
    return [];
  }
}

function filterRepenOwnedSources(sources, ownedHandleCandidates) {
  const owned = new Set((ownedHandleCandidates || []).map((value) => String(value).toLowerCase()));
  return (sources || []).filter((source) => !sourceHandleCandidates(source?.id).some((candidate) => owned.has(candidate)));
}

module.exports = {
  WindowRole,
  shouldExcludeFromCapture,
  sourceHandleCandidates,
  nativeWindowHandleCandidates,
  filterRepenOwnedSources,
};
