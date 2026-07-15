import { Point, SceneAnnotation } from '../../shared/schemas/scene';

export function pointDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function segmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return pointDistance(px, py, x1, y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  return pointDistance(px, py, nearestX, nearestY);
}

export function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

export function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  return ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
         ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy);
}

export function segmentToSegmentDistance(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): number {
  if (segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return 0;
  return Math.min(
    segmentDistance(x1, y1, x3, y3, x4, y4),
    segmentDistance(x2, y2, x3, y3, x4, y4),
    segmentDistance(x3, y3, x1, y1, x2, y2),
    segmentDistance(x4, y4, x1, y1, x2, y2)
  );
}

export function strokeHitsEraserPath(stroke: SceneAnnotation, erasePoints: Point[], radius: number): boolean {
  if (erasePoints.length < 2) return false;

  if (stroke.tool === 'text' || stroke.tool === 'image') {
    const w = typeof stroke.width === 'number' ? stroke.width : 200;
    const h = typeof stroke.height === 'number' ? stroke.height : 80;
    
    for (let i = 0; i < erasePoints.length - 1; i++) {
      const a = erasePoints[i], b = erasePoints[i+1];
      const distTop = segmentToSegmentDistance(stroke.x, stroke.y, stroke.x + w, stroke.y, a.x, a.y, b.x, b.y);
      const distBottom = segmentToSegmentDistance(stroke.x, stroke.y + h, stroke.x + w, stroke.y + h, a.x, a.y, b.x, b.y);
      const distLeft = segmentToSegmentDistance(stroke.x, stroke.y, stroke.x, stroke.y + h, a.x, a.y, b.x, b.y);
      const distRight = segmentToSegmentDistance(stroke.x + w, stroke.y, stroke.x + w, stroke.y + h, a.x, a.y, b.x, b.y);
      if (Math.min(distTop, distBottom, distLeft, distRight) <= radius) return true;
      if (a.x >= stroke.x && a.x <= stroke.x + w && a.y >= stroke.y && a.y <= stroke.y + h) return true;
    }
    return false;
  }

  if (stroke.tool === 'shapes') {
    const sx = stroke.start?.x || 0, sy = stroke.start?.y || 0;
    const ex = stroke.end?.x || 0, ey = stroke.end?.y || 0;
    
    for (let i = 0; i < erasePoints.length - 1; i++) {
      const a = erasePoints[i], b = erasePoints[i+1];
      if (stroke.shapeType === 'line') {
        if (segmentToSegmentDistance(sx, sy, ex, ey, a.x, a.y, b.x, b.y) <= radius) return true;
      } else if (stroke.shapeType === 'rectangle') {
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        const distT = segmentToSegmentDistance(minX, minY, maxX, minY, a.x, a.y, b.x, b.y);
        const distB = segmentToSegmentDistance(minX, maxY, maxX, maxY, a.x, a.y, b.x, b.y);
        const distL = segmentToSegmentDistance(minX, minY, minX, maxY, a.x, a.y, b.x, b.y);
        const distR = segmentToSegmentDistance(maxX, minY, maxX, maxY, a.x, a.y, b.x, b.y);
        if (Math.min(distT, distB, distL, distR) <= radius) return true;
        if (a.x >= minX && a.x <= maxX && a.y >= minY && a.y <= maxY) return true;
      } else if (stroke.shapeType === 'circle') {
        const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
        const r = Math.hypot(ex - sx, ey - sy) / 2;
        const distToCenter = segmentDistance(cx, cy, a.x, a.y, b.x, b.y);
        if (Math.abs(distToCenter - r) <= radius || distToCenter <= r) return true;
      } else if (stroke.shapeType === 'triangle' || stroke.shapeType === 'arrow' || stroke.shapeType === 'freehand_arrow') {
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        if (a.x >= minX - radius && a.x <= maxX + radius && a.y >= minY - radius && a.y <= maxY + radius) return true;
      }
    }
    return false;
  }

  if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'calligraphy') {
    if (!Array.isArray(stroke.points)) return false;
    const threshold = radius + (typeof stroke.width === 'number' ? stroke.width : 4) / 2;
    
    for (let pIdx = 0; pIdx < stroke.points.length; pIdx++) {
      const p1 = stroke.points[pIdx];
      const p2 = pIdx < stroke.points.length - 1 ? stroke.points[pIdx + 1] : p1;
      for (let i = 0; i < erasePoints.length - 1; i++) {
        const a = erasePoints[i], b = erasePoints[i+1];
        if (segmentToSegmentDistance(p1.x, p1.y, p2.x, p2.y, a.x, a.y, b.x, b.y) <= threshold) {
          return true;
        }
      }
    }
  }
  return false;
}

export function eraseStrokeSegments(stroke: SceneAnnotation, erasePoints: Point[], radius: number): SceneAnnotation[] {
  if (stroke.tool === 'text' || stroke.tool === 'image' || stroke.tool === 'shapes') {
    if (strokeHitsEraserPath(stroke, erasePoints, radius)) {
      return [];
    }
    return [stroke];
  }

  if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
    return [stroke];
  }

  const threshold = radius + (typeof stroke.width === 'number' ? stroke.width : 4) / 2;
  const hits = new Array(stroke.points.length).fill(false);
  let anyHit = false;

  for (let pIdx = 0; pIdx < stroke.points.length; pIdx += 1) {
    const p1 = stroke.points[pIdx];
    const p2 = pIdx < stroke.points.length - 1 ? stroke.points[pIdx + 1] : p1;
    
    for (let i = 0; i < erasePoints.length - 1; i += 1) {
      const a = erasePoints[i];
      const b = erasePoints[i + 1];
      if (segmentToSegmentDistance(p1.x, p1.y, p2.x, p2.y, a.x, a.y, b.x, b.y) <= threshold) {
        hits[pIdx] = true;
        if (pIdx < stroke.points.length - 1) hits[pIdx + 1] = true;
        anyHit = true;
        break;
      }
    }
  }

  if (!anyHit) {
    return [stroke];
  }

  const resultingSegments: SceneAnnotation[] = [];
  let currentChunk: Point[] = [];

  for (let pIdx = 0; pIdx < stroke.points.length; pIdx += 1) {
    if (!hits[pIdx]) {
      currentChunk.push(stroke.points[pIdx]);
    } else {
      if (currentChunk.length > 0) {
        if (currentChunk.length === 1) {
          currentChunk.push({ ...currentChunk[0] });
        }
        resultingSegments.push({
          ...stroke,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          points: currentChunk,
        } as any);
        currentChunk = [];
      }
    }
  }

  if (currentChunk.length > 0) {
    if (currentChunk.length === 1) {
      currentChunk.push({ ...currentChunk[0] });
    }
    resultingSegments.push({
      ...stroke,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      points: currentChunk,
    } as any);
  }

  return resultingSegments;
}
