import { SceneAnnotation } from '../../shared/schemas/scene';

export class HistoryManager {
  private annotations: SceneAnnotation[] = [];
  private undoStack: SceneAnnotation[][] = [];
  private redoStack: SceneAnnotation[][] = [];
  private maxHistory = 50;

  getAnnotations(): SceneAnnotation[] {
    return this.annotations;
  }

  setAnnotations(annotations: SceneAnnotation[]) {
    this.annotations = annotations;
  }

  recordChange(mutator: () => void) {
    this.pushUndoSnapshot();
    this.redoStack = [];
    mutator();
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(this.clone(this.annotations));
    this.annotations = this.undoStack.pop()!;
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(this.clone(this.annotations));
    this.annotations = this.redoStack.pop()!;
    return true;
  }

  clear() {
    if (this.annotations.length === 0) return;
    this.recordChange(() => {
      this.annotations = [];
    });
  }

  private pushUndoSnapshot() {
    this.undoStack.push(this.clone(this.annotations));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
