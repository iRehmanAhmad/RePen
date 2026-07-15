import {
  DEFAULT_EDITOR_APPEARANCE_SETTINGS,
  DEFAULT_EDITOR_LAYOUT_SETTINGS,
  DEFAULT_EXPORT_SETTINGS,
  DEFAULT_GIF_SETTINGS,
  DEFAULT_WEBCAM_SETTINGS,
  type AspectRatio,
  type ExportFormat,
  type ExportQuality,
  type GifFrameRate,
  type GifSizePreset,
} from "./editorDefaults";
import {
  type AnnotationRegion,
  type CropRegion,
  clampPlaybackSpeed,
  DEFAULT_ANNOTATION_POSITION,
  DEFAULT_ANNOTATION_SIZE,
  DEFAULT_ANNOTATION_STYLE,
  DEFAULT_BLUR_BLOCK_SIZE,
  DEFAULT_BLUR_DATA,
  DEFAULT_BLUR_FREEHAND_POINTS,
  DEFAULT_BLUR_INTENSITY,
  DEFAULT_FIGURE_DATA,
  DEFAULT_PLAYBACK_SPEED,
  DEFAULT_WEBCAM_MIRRORED,
  DEFAULT_WEBCAM_REACTIVE_ZOOM,
  DEFAULT_ZOOM_DEPTH,
  DEFAULT_ZOOM_MOTION_BLUR,
  MAX_BLUR_BLOCK_SIZE,
  MAX_BLUR_INTENSITY,
  MAX_PLAYBACK_SPEED,
  MIN_BLUR_BLOCK_SIZE,
  MIN_BLUR_INTENSITY,
  MIN_PLAYBACK_SPEED,
  type SpeedRegion,
  type TrimRegion,
  type WebcamLayoutPreset,
  type WebcamMaskShape,
  type WebcamPosition,
  type WebcamSizePreset,
  type ZoomRegion,
} from "./types";

export const PROJECT_FILE_EXTENSION = "repen-project";
export const LEGACY_PROJECT_FILE_EXTENSION = "openscreen";
export const PROJECT_VERSION = 2;

export interface ProjectMedia {
  screenVideoPath: string;
  webcamVideoPath?: string;
  nativeSessionPath?: string;
  durationMs?: number;
}

export interface ProjectEditorState {
  wallpaper: string;
  shadowIntensity: number;
  showBlur: boolean;
  showTrimWaveform: boolean;
  motionBlurAmount: number;
  borderRadius: number;
  padding: number;
  cropRegion: CropRegion;
  zoomRegions: ZoomRegion[];
  autoZoomEnabled: boolean;
  autoFocusAll: boolean;
  trimRegions: TrimRegion[];
  speedRegions: SpeedRegion[];
  annotationRegions: AnnotationRegion[];
  aspectRatio: AspectRatio;
  webcamLayoutPreset: WebcamLayoutPreset;
  webcamMaskShape: WebcamMaskShape;
  webcamMirrored: boolean;
  webcamReactiveZoom: boolean;
  webcamSizePreset: WebcamSizePreset;
  webcamPosition: WebcamPosition | null;
  exportQuality: ExportQuality;
  exportFormat: ExportFormat;
  gifFrameRate: GifFrameRate;
  gifLoop: boolean;
  gifSizePreset: GifSizePreset;
  cursorTheme: string;
}

export interface EditorProjectData {
  version: number;
  media?: ProjectMedia;
  editor: ProjectEditorState;
  videoPath?: string;
}

const VALID_BLUR_SHAPES = new Set(["rectangle", "oval", "freehand"] as const);

export function normalizeTextAnimation(val: any): string {
  const valid = ["none", "fade", "rise", "pop", "slide-left", "typewriter", "pulse"];
  return valid.includes(val) ? val : "none";
}

export function normalizeBlurType(val: any): string {
  return val === "blur" || val === "mosaic" ? val : "mosaic";
}

export function normalizeBlurColor(val: any): string {
  return val === "white" || val === "black" ? val : "white";
}

export function normalizeCursorThemeId(val: any): string {
  return typeof val === "string" ? val : "default";
}

export function normalizeProjectMedia(media: any): ProjectMedia | null {
  if (media && typeof media === "object" && typeof media.screenVideoPath === "string") {
    return {
      screenVideoPath: media.screenVideoPath,
      webcamVideoPath: media.webcamVideoPath,
      nativeSessionPath: media.nativeSessionPath,
      durationMs: media.durationMs,
    };
  }
  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.match(/^[a-zA-Z]:/)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized}`;
}

export function fromFileUrl(fileUrl: string): string {
  if (!fileUrl.startsWith("file://")) {
    return fileUrl;
  }
  const clean = fileUrl.replace(/^file:\/\/\/?/, "");
  return clean.replace(/^\/([a-zA-Z]:)/, "$1");
}

export function normalizeProjectEditor(editor: Partial<ProjectEditorState>): ProjectEditorState {
  const normalizedAspectRatio: AspectRatio =
    editor.aspectRatio === "16:9" ||
    editor.aspectRatio === "4:3" ||
    editor.aspectRatio === "1:1" ||
    editor.aspectRatio === "9:16" ||
    editor.aspectRatio === "21:9"
      ? editor.aspectRatio
      : DEFAULT_EDITOR_LAYOUT_SETTINGS.aspectRatio;

  const normalizedWebcamLayoutPreset: WebcamLayoutPreset =
    editor.webcamLayoutPreset === "picture-in-picture" ||
    editor.webcamLayoutPreset === "no-webcam" ||
    editor.webcamLayoutPreset === "vertical-stack" ||
    editor.webcamLayoutPreset === "dual-frame"
      ? editor.webcamLayoutPreset
      : DEFAULT_WEBCAM_SETTINGS.layoutPreset;

  const normalizedWebcamPosition: WebcamPosition | null =
    normalizedWebcamLayoutPreset === "picture-in-picture" &&
    editor.webcamPosition &&
    typeof editor.webcamPosition === "object" &&
    isFiniteNumber(editor.webcamPosition.cx) &&
    isFiniteNumber(editor.webcamPosition.cy)
      ? {
          cx: clamp(editor.webcamPosition.cx, 0, 1),
          cy: clamp(editor.webcamPosition.cy, 0, 1),
        }
      : DEFAULT_WEBCAM_SETTINGS.position;

  const normalizedZoomRegions: ZoomRegion[] = Array.isArray(editor.zoomRegions)
    ? editor.zoomRegions
        .filter((region): region is ZoomRegion => Boolean(region && typeof region.id === "string"))
        .map((region) => {
          const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
          const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
          const startMs = Math.max(0, Math.min(rawStart, rawEnd));
          const endMs = Math.max(startMs + 1, rawEnd);
          return {
            id: region.id,
            startMs,
            endMs,
            depth: [1, 2, 3, 4, 5, 6].includes(region.depth) ? region.depth : DEFAULT_ZOOM_DEPTH,
            focus: {
              cx: clamp(isFiniteNumber(region.focus?.cx) ? region.focus.cx : 0.5, 0, 1),
              cy: clamp(isFiniteNumber(region.focus?.cy) ? region.focus.cy : 0.5, 0, 1),
            },
            focusMode: region.focusMode === "auto" ? "auto" : "manual",
            source: region.source === "auto" ? "auto" : "manual",
            rotationPreset: region.rotationPreset,
            customScale: region.customScale,
          };
        })
    : [];

  const normalizedTrimRegions: TrimRegion[] = Array.isArray(editor.trimRegions)
    ? editor.trimRegions
        .filter((region): region is TrimRegion => Boolean(region && typeof region.id === "string"))
        .map((region) => {
          const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
          const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
          return {
            id: region.id,
            startMs: Math.max(0, Math.min(rawStart, rawEnd)),
            endMs: Math.max(0, rawEnd),
          };
        })
    : [];

  const normalizedSpeedRegions: SpeedRegion[] = Array.isArray(editor.speedRegions)
    ? editor.speedRegions
        .filter((region): region is SpeedRegion => Boolean(region && typeof region.id === "string"))
        .map((region) => {
          const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
          const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
          return {
            id: region.id,
            startMs: Math.max(0, Math.min(rawStart, rawEnd)),
            endMs: Math.max(0, rawEnd),
            speed: isFiniteNumber(region.speed) ? clampPlaybackSpeed(region.speed) : DEFAULT_PLAYBACK_SPEED,
          };
        })
    : [];

  const normalizedAnnotationRegions: AnnotationRegion[] = Array.isArray(editor.annotationRegions)
    ? editor.annotationRegions
        .filter((region): region is AnnotationRegion => Boolean(region && typeof region.id === "string"))
        .map((region, index) => {
          const rawStart = isFiniteNumber(region.startMs) ? Math.round(region.startMs) : 0;
          const rawEnd = isFiniteNumber(region.endMs) ? Math.round(region.endMs) : rawStart + 1000;
          const blurShape =
            typeof region.blurData?.shape === "string" && VALID_BLUR_SHAPES.has(region.blurData.shape as any)
              ? region.blurData.shape
              : DEFAULT_BLUR_DATA.shape;
          const blurType = normalizeBlurType(region.blurData?.type) as any;
          const blurColor = normalizeBlurColor(region.blurData?.color) as any;

          return {
            id: region.id,
            startMs: Math.max(0, Math.min(rawStart, rawEnd)),
            endMs: Math.max(0, rawEnd),
            type:
              region.type === "image" || region.type === "figure" || region.type === "blur"
                ? region.type
                : "text",
            content: typeof region.content === "string" ? region.content : "",
            textContent: region.textContent,
            imageContent: region.imageContent,
            position: {
              x: clamp(isFiniteNumber(region.position?.x) ? region.position.x : DEFAULT_ANNOTATION_POSITION.x, 0, 100),
              y: clamp(isFiniteNumber(region.position?.y) ? region.position.y : DEFAULT_ANNOTATION_POSITION.y, 0, 100),
            },
            size: {
              width: clamp(isFiniteNumber(region.size?.width) ? region.size.width : DEFAULT_ANNOTATION_SIZE.width, 1, 200),
              height: clamp(isFiniteNumber(region.size?.height) ? region.size.height : DEFAULT_ANNOTATION_SIZE.height, 1, 200),
            },
            style: {
              ...DEFAULT_ANNOTATION_STYLE,
              ...region.style,
              textAnimation: normalizeTextAnimation(region.style?.textAnimation) as any,
            },
            zIndex: isFiniteNumber(region.zIndex) ? region.zIndex : index + 1,
            figureData: region.figureData,
            blurData: region.blurData
              ? {
                  ...DEFAULT_BLUR_DATA,
                  ...region.blurData,
                  type: blurType,
                  shape: blurShape as any,
                  color: blurColor,
                  intensity: isFiniteNumber(region.blurData.intensity)
                    ? clamp(region.blurData.intensity, MIN_BLUR_INTENSITY, MAX_BLUR_INTENSITY)
                    : DEFAULT_BLUR_INTENSITY,
                  blockSize: isFiniteNumber(region.blurData.blockSize)
                    ? clamp(region.blurData.blockSize, MIN_BLUR_BLOCK_SIZE, MAX_BLUR_BLOCK_SIZE)
                    : DEFAULT_BLUR_BLOCK_SIZE,
                }
              : undefined,
          };
        })
    : [];

  const rawCropX = isFiniteNumber(editor.cropRegion?.x) ? editor.cropRegion.x : DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion.x;
  const rawCropY = isFiniteNumber(editor.cropRegion?.y) ? editor.cropRegion.y : DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion.y;
  const rawCropWidth = isFiniteNumber(editor.cropRegion?.width) ? editor.cropRegion.width : DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion.width;
  const rawCropHeight = isFiniteNumber(editor.cropRegion?.height) ? editor.cropRegion.height : DEFAULT_EDITOR_LAYOUT_SETTINGS.cropRegion.height;

  const cropX = clamp(rawCropX, 0, 1);
  const cropY = clamp(rawCropY, 0, 1);

  return {
    cursorTheme: normalizeCursorThemeId(editor.cursorTheme),
    wallpaper: typeof editor.wallpaper === "string" ? editor.wallpaper : DEFAULT_EDITOR_LAYOUT_SETTINGS.wallpaper,
    shadowIntensity: typeof editor.shadowIntensity === "number" ? editor.shadowIntensity : DEFAULT_EDITOR_APPEARANCE_SETTINGS.shadowIntensity,
    showBlur: typeof editor.showBlur === "boolean" ? editor.showBlur : DEFAULT_EDITOR_APPEARANCE_SETTINGS.showBlur,
    showTrimWaveform: typeof editor.showTrimWaveform === "boolean" ? editor.showTrimWaveform : DEFAULT_EDITOR_APPEARANCE_SETTINGS.showTrimWaveform,
    motionBlurAmount: isFiniteNumber(editor.motionBlurAmount) ? clamp(editor.motionBlurAmount, 0, 1) : DEFAULT_EDITOR_APPEARANCE_SETTINGS.motionBlurAmount,
    borderRadius: typeof editor.borderRadius === "number" ? editor.borderRadius : DEFAULT_EDITOR_APPEARANCE_SETTINGS.borderRadius,
    padding: isFiniteNumber(editor.padding) ? clamp(editor.padding, 0, 100) : DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
    cropRegion: {
      x: cropX,
      y: cropY,
      width: clamp(rawCropWidth, 0.01, 1 - cropX),
      height: clamp(rawCropHeight, 0.01, 1 - cropY),
    },
    zoomRegions: normalizedZoomRegions,
    autoZoomEnabled: typeof editor.autoZoomEnabled === "boolean" ? editor.autoZoomEnabled : true,
    autoFocusAll: typeof editor.autoFocusAll === "boolean" ? editor.autoFocusAll : false,
    trimRegions: normalizedTrimRegions,
    speedRegions: normalizedSpeedRegions,
    annotationRegions: normalizedAnnotationRegions,
    aspectRatio: normalizedAspectRatio,
    webcamLayoutPreset: normalizedWebcamLayoutPreset,
    webcamMaskShape:
      editor.webcamMaskShape === "rectangle" ||
      editor.webcamMaskShape === "circle" ||
      editor.webcamMaskShape === "square" ||
      editor.webcamMaskShape === "rounded"
        ? editor.webcamMaskShape
        : DEFAULT_WEBCAM_SETTINGS.maskShape,
    webcamMirrored: typeof editor.webcamMirrored === "boolean" ? editor.webcamMirrored : DEFAULT_WEBCAM_MIRRORED,
    webcamReactiveZoom: typeof editor.webcamReactiveZoom === "boolean" ? editor.webcamReactiveZoom : DEFAULT_WEBCAM_REACTIVE_ZOOM,
    webcamSizePreset:
      typeof editor.webcamSizePreset === "number" && isFiniteNumber(editor.webcamSizePreset)
        ? Math.max(10, Math.min(50, editor.webcamSizePreset))
        : DEFAULT_WEBCAM_SETTINGS.sizePreset,
    webcamPosition: normalizedWebcamPosition,
    exportQuality:
      editor.exportQuality === "medium" || editor.exportQuality === "source"
        ? editor.exportQuality
        : DEFAULT_EXPORT_SETTINGS.quality,
    exportFormat: editor.exportFormat === "gif" ? "gif" : DEFAULT_EXPORT_SETTINGS.format,
    gifFrameRate:
      editor.gifFrameRate === 15 || editor.gifFrameRate === 20 || editor.gifFrameRate === 25 || editor.gifFrameRate === 30
        ? editor.gifFrameRate
        : DEFAULT_GIF_SETTINGS.frameRate,
    gifLoop: typeof editor.gifLoop === "boolean" ? editor.gifLoop : DEFAULT_GIF_SETTINGS.loop,
    gifSizePreset:
      editor.gifSizePreset === "medium" || editor.gifSizePreset === "large" || editor.gifSizePreset === "original"
        ? editor.gifSizePreset
        : DEFAULT_GIF_SETTINGS.sizePreset,
  };
}

export function validateProjectData(candidate: unknown): candidate is EditorProjectData {
  if (!candidate || typeof candidate !== "object") return false;
  const project = candidate as Partial<EditorProjectData>;
  // Support version 1 (legacy OpenScreen) and version 2 (RePen/OpenScreen current)
  if (typeof project.version !== "number") return false;
  if (!project.editor || typeof project.editor !== "object") return false;
  return true;
}

export function migrateProjectData(project: any): EditorProjectData {
  // Perform structural upgrades here if migrating from legacy schemas
  return {
    version: PROJECT_VERSION,
    media: normalizeProjectMedia(project.media) || undefined,
    editor: normalizeProjectEditor(project.editor || {}),
    videoPath: typeof project.videoPath === "string" ? project.videoPath : undefined,
  };
}
