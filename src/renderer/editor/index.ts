/**
 * Editor module barrel export.
 * Import from this file to access all extracted hooks and components.
 */

// ── Typed bridge ──────────────────────────────────────────────────────────
export { useAppBridge } from './useAppBridge';

// ── State hooks ───────────────────────────────────────────────────────────
export { useCapabilities } from './useCapabilities';
export { useProjectManager } from './useProjectManager';
export type { ProjectManagerResult } from './useProjectManager';
export { usePlaybackState } from './usePlaybackState';
export type { PlaybackStateResult } from './usePlaybackState';

// ── Sidebar panels ────────────────────────────────────────────────────────
export { LayoutPanel } from './LayoutPanel';
export { WebcamPanel } from './WebcamPanel';
export { MotionPanel } from './MotionPanel';
export { AnnotationsPanel } from './AnnotationsPanel';
export { CaptionsPanel } from './CaptionsPanel';

// ── Preview ───────────────────────────────────────────────────────────────
export { CompositorPreview } from './CompositorPreview';

// ── Timeline ──────────────────────────────────────────────────────────────
export { TrackControls } from './TrackControls';
export { TimelinePanel } from './TimelinePanel';
export { TimelineTracks } from './TimelineTracks';
export { EditorTimelineToolbar } from './EditorTimelineToolbar';

// ── Resizable Layout & Inspector Overhauls ────────────────────────────────
export { useResizableEditorLayout } from './useResizableEditorLayout';
export { EditorHeader } from './EditorHeader';
export { InspectorTabs } from './InspectorTabs';
export { InspectorSection } from './InspectorSection';
