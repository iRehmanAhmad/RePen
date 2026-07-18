import React, { useState, useEffect } from 'react';

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

  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxTimelineHeight = Math.floor(Math.min(
    viewportHeight * 0.55,
    viewportHeight - 56 - 280
  ));

  const [isResizingInspector, setIsResizingInspector] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);

  const handleInspectorResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingInspector(true);
  };

  const handleInspectorResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingInspector) return;
    const nextWidth = Math.max(300, Math.min(440, viewportWidth - e.clientX));
    setInspectorWidth(nextWidth);
  };

  const handleInspectorResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingInspector(false);
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', inspectorWidth.toString());
  };

  const handleInspectorResizeCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingInspector(false);
  };

  const handleInspectorDoubleClick = () => {
    setInspectorWidth(340);
    localStorage.setItem('repen.editor.layout.v1.inspectorWidth', '340');
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
    const nextHeight = Math.max(230, Math.min(maxTimelineHeight, viewportHeight - e.clientY));
    setTimelineHeight(nextHeight);
  };

  const handleTimelineResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingTimeline(false);
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', timelineHeight.toString());
  };

  const handleTimelineResizeCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingTimeline(false);
  };

  const handleTimelineDoubleClick = () => {
    setTimelineHeight(300);
    localStorage.setItem('repen.editor.layout.v1.timelineHeight', '300');
  };

  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let step = 0;
    if (e.key === 'ArrowUp') step = 10;
    else if (e.key === 'ArrowDown') step = -10;
    else return;

    e.preventDefault();
    const nextHeight = Math.max(230, Math.min(maxTimelineHeight, timelineHeight + step));
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
    maxTimelineHeight,
    isResizingInspector,
    isResizingTimeline,
    handleInspectorResizeStart,
    handleInspectorResizeMove,
    handleInspectorResizeEnd,
    handleInspectorResizeCancel,
    handleInspectorDoubleClick,
    handleInspectorKeyDown,
    handleTimelineResizeStart,
    handleTimelineResizeMove,
    handleTimelineResizeEnd,
    handleTimelineResizeCancel,
    handleTimelineDoubleClick,
    handleTimelineKeyDown,
    resetLayout,
  };
}
