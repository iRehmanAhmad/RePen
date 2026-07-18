import React, { useState } from 'react';

export function useResizableEditorLayout() {
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => {
    const saved = localStorage.getItem('repen.editor.layout.v1.inspectorWidth');
    const parsed = saved ? parseInt(saved, 10) : 340;
    return parsed >= 300 && parsed <= 440 ? parsed : 340;
  });

  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    const saved = localStorage.getItem('repen.editor.layout.v1.timelineHeight');
    const parsed = saved ? parseInt(saved, 10) : 300;
    return parsed >= 230 ? parsed : 300;
  });

  const [isResizingInspector, setIsResizingInspector] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);

  const handleInspectorResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingInspector(true);
  };

  const handleInspectorResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingInspector) return;
    const windowWidth = window.innerWidth;
    const nextWidth = Math.max(300, Math.min(440, windowWidth - e.clientX));
    setInspectorWidth(nextWidth);
  };

  const handleInspectorResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingInspector(false);
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', inspectorWidth.toString());
  };

  const handleInspectorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let step = 0;
    if (e.key === 'ArrowLeft') step = 10;
    else if (e.key === 'ArrowRight') step = -10;
    else return;

    e.preventDefault();
    const nextWidth = Math.max(300, Math.min(440, inspectorWidth + step));
    setInspectorWidth(nextWidth);
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', nextWidth.toString());
  };

  const handleTimelineResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingTimeline(true);
  };

  const handleTimelineResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingTimeline) return;
    const windowHeight = window.innerHeight;
    const maxTimeline = Math.min(
      windowHeight * 0.55,
      windowHeight - 56 - 280
    );
    const nextHeight = Math.max(230, Math.min(maxTimeline, windowHeight - e.clientY));
    setTimelineHeight(nextHeight);
  };

  const handleTimelineResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingTimeline(false);
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', timelineHeight.toString());
  };

  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let step = 0;
    if (e.key === 'ArrowUp') step = 10;
    else if (e.key === 'ArrowDown') step = -10;
    else return;

    e.preventDefault();
    const windowHeight = window.innerHeight;
    const maxTimeline = Math.min(
      windowHeight * 0.55,
      windowHeight - 56 - 280
    );
    const nextHeight = Math.max(230, Math.min(maxTimeline, timelineHeight + step));
    setTimelineHeight(nextHeight);
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', nextHeight.toString());
  };

  const resetLayout = () => {
    setInspectorWidth(340);
    setTimelineHeight(300);
    localStorage.removeItem('repen.editor.layout.v1.inspectorWidth');
    localStorage.removeItem('repen.editor.layout.v1.timelineHeight');
  };

  return {
    inspectorWidth,
    timelineHeight,
    isResizingInspector,
    isResizingTimeline,
    handleInspectorResizeStart,
    handleInspectorResizeMove,
    handleInspectorResizeEnd,
    handleInspectorKeyDown,
    handleTimelineResizeStart,
    handleTimelineResizeMove,
    handleTimelineResizeEnd,
    handleTimelineKeyDown,
    resetLayout,
  };
}
