const PROJECT_VERSION = 2;

function createDefaultEditorState(overrides = {}) {
  return {
    cursorTheme: 'default',
    wallpaper: '/wallpapers/wallpaper1.jpg',
    shadowIntensity: 0,
    showBlur: false,
    showTrimWaveform: true,
    motionBlurAmount: 0,
    borderRadius: 0,
    padding: 50,
    cropRegion: { x: 0, y: 0, width: 1, height: 1, ...(overrides.cropRegion || {}) },
    zoomRegions: [],
    autoZoomEnabled: true,
    autoFocusAll: false,
    trimRegions: [],
    speedRegions: [],
    annotationRegions: [],
    aspectRatio: '16:9',
    webcamLayoutPreset: 'picture-in-picture',
    webcamMaskShape: 'rectangle',
    webcamMirrored: false,
    webcamReactiveZoom: true,
    webcamSizePreset: 25,
    webcamPosition: null,
    exportQuality: 'good',
    exportFormat: 'mp4',
    gifFrameRate: 15,
    gifLoop: true,
    gifSizePreset: 'medium',
    ...overrides,
    cropRegion: { x: 0, y: 0, width: 1, height: 1, ...(overrides.cropRegion || {}) },
    zoomRegions: Array.isArray(overrides.zoomRegions) ? overrides.zoomRegions : [],
    trimRegions: Array.isArray(overrides.trimRegions) ? overrides.trimRegions : [],
    speedRegions: Array.isArray(overrides.speedRegions) ? overrides.speedRegions : [],
    annotationRegions: Array.isArray(overrides.annotationRegions) ? overrides.annotationRegions : [],
  };
}

function migrateProjectData(project = {}) {
  const media = project.media && typeof project.media.screenVideoPath === 'string'
    ? {
        screenVideoPath: project.media.screenVideoPath,
        ...(typeof project.media.webcamVideoPath === 'string' ? { webcamVideoPath: project.media.webcamVideoPath } : {}),
        ...(typeof project.media.nativeSessionPath === 'string' ? { nativeSessionPath: project.media.nativeSessionPath } : {}),
        presentationMode: project.media.presentationMode === 'sidecar' ? 'sidecar' : 'baked',
        ...(Number.isFinite(project.media.durationMs) ? { durationMs: project.media.durationMs } : {}),
      }
    : undefined;
  return {
    version: PROJECT_VERSION,
    ...(media ? { media } : {}),
    editor: createDefaultEditorState(project.editor || {}),
    ...(typeof project.videoPath === 'string' ? { videoPath: project.videoPath } : {}),
  };
}

function createRecordingProject(media) {
  return migrateProjectData({ version: PROJECT_VERSION, media, editor: {} });
}

module.exports = {
  PROJECT_VERSION,
  createDefaultEditorState,
  createRecordingProject,
  migrateProjectData,
};
