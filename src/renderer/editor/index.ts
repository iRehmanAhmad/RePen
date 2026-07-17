/**
 * Editor module barrel export.
 * Import from this file to access extracted hooks and components.
 */

// Typed bridge
export { useAppBridge } from './useAppBridge';

// State hooks
export { useCapabilities } from './useCapabilities';
export { useProjectManager } from './useProjectManager';
export type { ProjectManagerResult } from './useProjectManager';
export { usePlaybackState } from './usePlaybackState';
export type { PlaybackStateResult } from './usePlaybackState';

// Sidebar panels
export { LayoutPanel } from './LayoutPanel';
export { WebcamPanel } from './WebcamPanel';
export { MotionPanel } from './MotionPanel';

// Preview
export { CompositorPreview } from './CompositorPreview';
