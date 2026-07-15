export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  color: string;
  width: number;
  opacity: number;
}

export interface StrokeAnnotation extends BaseAnnotation {
  tool: 'pen' | 'highlighter' | 'calligraphy';
  points: Point[];
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'freehand_arrow' | 'arrow' | 'triangle';

export interface ShapeAnnotation extends BaseAnnotation {
  tool: 'shapes';
  shapeType: ShapeType;
  start: Point;
  end: Point;
  points: Point[]; // Used for freehand arrow drawing
  origShapeType?: ShapeType;
  origPoints?: Point[] | null;
  origStart?: Point | null;
  origEnd?: Point | null;
}

export interface TextAnnotation {
  id: string;
  tool: 'text';
  color: string;
  font: string;
  text: string;
  textMode: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAnnotation {
  id: string;
  tool: 'image';
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export type SceneAnnotation =
  | StrokeAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | ImageAnnotation;
