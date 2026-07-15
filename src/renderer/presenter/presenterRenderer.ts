import { Point, SceneAnnotation } from '../../shared/schemas/scene';

export function hexToRgba(hex: string, opacity: number): string {
  if (!hex) return `rgba(255, 90, 95, ${opacity})`;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export class PresenterRenderer {
  private ctx: CanvasRenderingContext2D;
  private zoom = 1;
  private panX = 0;
  private scale = 1;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.scale = window.devicePixelRatio || 1;
  }

  setViewport(panX: number, zoom: number) {
    this.panX = panX;
    this.zoom = zoom;
  }

  globalToLocal(pt: Point): Point {
    return {
      x: (pt.x + this.panX) * this.zoom,
      y: pt.y * this.zoom,
    };
  }

  localToGlobal(pt: Point): Point {
    return {
      x: pt.x / this.zoom - this.panX,
      y: pt.y / this.zoom,
    };
  }

  worldToScreenLength(len: number): number {
    return len * this.zoom;
  }

  drawStroke(stroke: SceneAnnotation) {
    const targetCtx = this.ctx;
    
    if (stroke.tool === 'text') {
      const pt = this.globalToLocal({ x: stroke.x, y: stroke.y });
      targetCtx.save();
      const boxW = this.worldToScreenLength(stroke.width || 200);
      const boxH = this.worldToScreenLength(stroke.height || 80);
      const mode = stroke.textMode || 'plain';
      
      if (mode === 'sticky') {
        targetCtx.fillStyle = 'rgba(255, 255, 220, 0.95)';
        targetCtx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        targetCtx.shadowBlur = 8;
        targetCtx.shadowOffsetY = 4;
        targetCtx.fillRect(pt.x, pt.y, boxW, boxH);
        targetCtx.shadowColor = 'transparent';
        targetCtx.strokeStyle = '#e0e0b0';
        targetCtx.lineWidth = Math.max(1, this.scale);
        targetCtx.strokeRect(pt.x, pt.y, boxW, boxH);
      } else {
        targetCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        targetCtx.shadowBlur = 5;
        targetCtx.shadowOffsetX = 1;
        targetCtx.shadowOffsetY = 1;
      }

      targetCtx.fillStyle = stroke.color || '#333';
      const font = stroke.font || 'bold 22px sans-serif';
      targetCtx.font = this.scale === 1 ? font : font.replace(/(\d+(?:\.\d+)?)px/, (_, size) => `${Number(size) * this.scale}px`);
      targetCtx.textBaseline = 'top';
      const paddingX = (mode === 'sticky' ? 10 : 4) * this.scale;
      const paddingY = (mode === 'sticky' ? 10 : 4) * this.scale;
      const maxLineWidth = Math.max(50, boxW - paddingX * 2);
      const rawLines = stroke.text.split('\n');
      let lineY = pt.y + paddingY;
      
      for (const rawLine of rawLines) {
        if (!rawLine) {
          lineY += 26 * this.scale;
          continue;
        }
        const words = rawLine.split(' ');
        let currentLine = words[0];
        for (let i = 1; i < words.length; i += 1) {
          const word = words[i];
          const testLine = `${currentLine} ${word}`;
          const metrics = targetCtx.measureText(testLine);
          if (metrics.width > maxLineWidth && currentLine.length > 0) {
            targetCtx.fillText(currentLine, pt.x + paddingX, lineY);
            lineY += 26 * this.scale;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        targetCtx.fillText(currentLine, pt.x + paddingX, lineY);
        lineY += 26 * this.scale;
      }
      targetCtx.restore();
      return;
    }

    if (stroke.tool === 'image') {
      const pt = this.globalToLocal({ x: stroke.x, y: stroke.y });
      const w = this.worldToScreenLength(stroke.width || 400);
      const h = this.worldToScreenLength(stroke.height || 300);
      targetCtx.save();
      targetCtx.globalAlpha = stroke.opacity || 1;
      // Placeholder drawing if image is loading
      targetCtx.fillStyle = 'rgba(200, 200, 200, 0.3)';
      targetCtx.fillRect(pt.x, pt.y, w, h);
      targetCtx.restore();
      return;
    }

    if (stroke.tool === 'shapes') {
      const pStart = stroke.start ? this.globalToLocal(stroke.start) : (stroke.points?.[0] ? this.globalToLocal(stroke.points[0]) : { x: 0, y: 0 });
      const pEnd = stroke.end ? this.globalToLocal(stroke.end) : (stroke.points?.[stroke.points.length - 1] ? this.globalToLocal(stroke.points[stroke.points.length - 1]) : pStart);
      const shapeType = stroke.shapeType || 'rectangle';

      targetCtx.save();
      targetCtx.globalCompositeOperation = 'source-over';
      targetCtx.strokeStyle = hexToRgba(stroke.color || '#ff5a5f', stroke.opacity || 1);
      targetCtx.lineWidth = this.worldToScreenLength(stroke.width || 4);
      targetCtx.lineCap = 'round';
      targetCtx.lineJoin = 'round';

      targetCtx.beginPath();
      if (shapeType === 'rectangle') {
        const x = Math.min(pStart.x, pEnd.x);
        const y = Math.min(pStart.y, pEnd.y);
        const w = Math.abs(pEnd.x - pStart.x);
        const h = Math.abs(pEnd.y - pStart.y);
        targetCtx.strokeRect(x, y, w, h);
      } else if (shapeType === 'circle') {
        const cx = (pStart.x + pEnd.x) / 2;
        const cy = (pStart.y + pEnd.y) / 2;
        const rx = Math.abs(pEnd.x - pStart.x) / 2;
        const ry = Math.abs(pEnd.y - pStart.y) / 2;
        targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        targetCtx.stroke();
      } else if (shapeType === 'triangle') {
        const topX = (pStart.x + pEnd.x) / 2;
        const topY = Math.min(pStart.y, pEnd.y);
        const bottomY = Math.max(pStart.y, pEnd.y);
        targetCtx.moveTo(topX, topY);
        targetCtx.lineTo(pEnd.x, bottomY);
        targetCtx.lineTo(pStart.x, bottomY);
        targetCtx.closePath();
        targetCtx.stroke();
      } else if (shapeType === 'line') {
        targetCtx.moveTo(pStart.x, pStart.y);
        targetCtx.lineTo(pEnd.x, pEnd.y);
        targetCtx.stroke();
      } else if (shapeType === 'freehand_arrow') {
        const localPts = stroke.points ? stroke.points.map(pt => this.globalToLocal(pt)) : [];
        if (localPts.length >= 2) {
          targetCtx.moveTo(localPts[0].x, localPts[0].y);
          for (let i = 1; i < localPts.length; i++) {
            targetCtx.lineTo(localPts[i].x, localPts[i].y);
          }
          targetCtx.stroke();

          const pLast = localPts[localPts.length - 1];
          const pPrev = localPts[localPts.length - 2];
          const angle = Math.atan2(pLast.y - pPrev.y, pLast.x - pPrev.x);
          const headLen = Math.max(12, this.worldToScreenLength(stroke.width || 4) * 3);
          targetCtx.beginPath();
          targetCtx.moveTo(pLast.x, pLast.y);
          targetCtx.lineTo(pLast.x - headLen * Math.cos(angle - Math.PI / 6), pLast.y - headLen * Math.sin(angle - Math.PI / 6));
          targetCtx.moveTo(pLast.x, pLast.y);
          targetCtx.lineTo(pLast.x - headLen * Math.cos(angle + Math.PI / 6), pLast.y - headLen * Math.sin(angle + Math.PI / 6));
          targetCtx.stroke();
        }
      } else if (shapeType === 'arrow') {
        targetCtx.moveTo(pStart.x, pStart.y);
        targetCtx.lineTo(pEnd.x, pEnd.y);
        targetCtx.stroke();

        const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
        const headLen = Math.max(12, this.worldToScreenLength(stroke.width || 4) * 3);
        targetCtx.beginPath();
        targetCtx.moveTo(pEnd.x, pEnd.y);
        targetCtx.lineTo(pEnd.x - headLen * Math.cos(angle - Math.PI / 6), pEnd.y - headLen * Math.sin(angle - Math.PI / 6));
        targetCtx.moveTo(pEnd.x, pEnd.y);
        targetCtx.lineTo(pEnd.x - headLen * Math.cos(angle + Math.PI / 6), pEnd.y - headLen * Math.sin(angle + Math.PI / 6));
        targetCtx.stroke();
      }
      targetCtx.restore();
      return;
    }

    if (!stroke.points || stroke.points.length === 0) return;

    const points = stroke.points.map(pt => this.globalToLocal(pt));
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.strokeStyle = hexToRgba(stroke.color, stroke.opacity);
    targetCtx.fillStyle = hexToRgba(stroke.color, stroke.opacity);
    targetCtx.lineWidth = this.worldToScreenLength(stroke.width || 4);
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';

    if (stroke.tool === 'calligraphy') {
      const angle = Math.PI / 4;
      const w = this.worldToScreenLength(stroke.width || 4);
      const offsetX = Math.cos(angle) * (w / 2);
      const offsetY = -Math.sin(angle) * (w / 2);
      
      targetCtx.beginPath();
      targetCtx.moveTo(points[0].x - offsetX, points[0].y - offsetY);
      targetCtx.lineTo(points[0].x + offsetX, points[0].y + offsetY);
      targetCtx.lineWidth = Math.max(1, this.scale);
      targetCtx.stroke();
      
      for (let i = 1; i < points.length; i++) {
        targetCtx.beginPath();
        targetCtx.moveTo(points[i - 1].x - offsetX, points[i - 1].y - offsetY);
        targetCtx.lineTo(points[i].x - offsetX, points[i].y - offsetY);
        targetCtx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
        targetCtx.lineTo(points[i - 1].x + offsetX, points[i - 1].y + offsetY);
        targetCtx.closePath();
        targetCtx.fill();
      }
    } else {
      targetCtx.beginPath();
      targetCtx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        targetCtx.lineTo(points[i].x, points[i].y);
      }
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  redrawAll(annotations: SceneAnnotation[]) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    for (const stroke of annotations) {
      this.drawStroke(stroke);
    }
  }
}
