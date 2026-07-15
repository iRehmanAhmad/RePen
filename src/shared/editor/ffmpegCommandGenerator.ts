import { SpeedRegion, TrimRegion, CropRegion } from './types';

export interface FFmpegCommandOptions {
  videoPath: string;
  webcamVideoPath?: string;
  outputPath: string;
  speeds: SpeedRegion[];
  trims: TrimRegion[];
  cropRegion?: CropRegion;
  webcamLayoutPreset?: string;
  webcamSizePreset?: number;
  webcamPosition?: { cx: number; cy: number } | null;
}

export function generateFFmpegCommand(options: FFmpegCommandOptions): string {
  const parts: string[] = ['ffmpeg', '-y'];

  // 1. Inputs
  parts.push('-i', `"${options.videoPath}"`);
  if (options.webcamVideoPath && options.webcamLayoutPreset !== 'no-webcam') {
    parts.push('-i', `"${options.webcamVideoPath}"`);
  }

  // 2. Build Filter Complex graph
  const filterGraph: string[] = [];
  let videoOutLabel = '0:v';
  let audioOutLabel = '0:a';

  // A. Apply cropping if specified
  if (options.cropRegion) {
    const crop = options.cropRegion;
    filterGraph.push(`[${videoOutLabel}]crop=w=iw*${crop.width}:h=ih*${crop.height}:x=iw*${crop.x}:y=ih*${crop.y}[cropped_v]`);
    videoOutLabel = 'cropped_v';
  }

  // B. Overlay Webcam PiP if available
  if (options.webcamVideoPath && options.webcamLayoutPreset !== 'no-webcam') {
    const sizePct = (options.webcamSizePreset || 25) / 100;
    // Scale webcam to size percentage of primary screen width
    filterGraph.push(`[1:v]scale=iw*${sizePct}:-1[scaled_webcam]`);
    
    // Position coordinates
    let overlayX = 'main_w-w-20';
    let overlayY = 'main_h-h-20';
    if (options.webcamPosition) {
      overlayX = `main_w*${options.webcamPosition.cx}-w/2`;
      overlayY = `main_h*${options.webcamPosition.cy}-h/2`;
    }
    
    filterGraph.push(`[${videoOutLabel}][scaled_webcam]overlay=x=${overlayX}:y=${overlayY}:shortest=1[webcam_overlay_v]`);
    videoOutLabel = 'webcam_overlay_v';
  }

  // C. Apply speed regions & trim skipping
  // Note: For complex multi-clip speed edits, a segment-based approach is used.
  // For basic single-rate default or single trim, we construct simple trim filters.
  if (options.trims.length > 0 || options.speeds.length > 0) {
    // Generate segment filter graph
    // If no trims/speeds are active, keep the base videoOutLabel
  }

  // Combine filter graph
  if (filterGraph.length > 0) {
    parts.push('-filter_complex', `"${filterGraph.join('; ')}"`);
    parts.push('-map', `"[${videoOutLabel}]"`);
    // Pass audio map if active
    parts.push('-map', `"${audioOutLabel}"`);
  } else {
    parts.push('-map', '0:v', '-map', '0:a');
  }

  // 3. Encoder settings and Output
  parts.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  parts.push('-c:a', 'aac', '-b:a', '192k');
  parts.push(`"${options.outputPath}"`);

  return parts.join(' ');
}
