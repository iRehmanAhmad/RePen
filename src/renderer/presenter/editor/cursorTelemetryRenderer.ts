import { CursorTelemetryPoint } from '../../../shared/editor/types';

export function getSmoothedCursorPosition(
  points: CursorTelemetryPoint[],
  timeMs: number,
  clickWindowMs = 150
): { cx: number; cy: number; type: string; click: boolean } {
  if (!points || points.length === 0) {
    return { cx: 0.5, cy: 0.5, type: 'arrow', click: false };
  }

  const nextIdx = points.findIndex(p => p.timeMs > timeMs);
  
  if (nextIdx === -1) {
    const last = points[points.length - 1];
    const isClick = last.interactionType === 'click' && (timeMs - last.timeMs >= 0) && (timeMs - last.timeMs < clickWindowMs);
    return { cx: last.cx, cy: last.cy, type: last.cursorType || 'arrow', click: isClick };
  }
  
  if (nextIdx === 0) {
    const first = points[0];
    const isClick = first.interactionType === 'click' && (first.timeMs - timeMs >= 0) && (first.timeMs - timeMs < clickWindowMs);
    return { cx: first.cx, cy: first.cy, type: first.cursorType || 'arrow', click: isClick };
  }

  const prev = points[nextIdx - 1];
  const next = points[nextIdx];
  
  const den = next.timeMs - prev.timeMs;
  const ratio = den > 0 ? (timeMs - prev.timeMs) / den : 0;
  const cx = prev.cx + (next.cx - prev.cx) * ratio;
  const cy = prev.cy + (next.cy - prev.cy) * ratio;

  const isClick = prev.interactionType === 'click' && (timeMs - prev.timeMs >= 0) && (timeMs - prev.timeMs < clickWindowMs);

  return {
    cx,
    cy,
    type: prev.cursorType || 'arrow',
    click: isClick,
  };
}
