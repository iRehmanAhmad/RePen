import type {
  PresentationEvent,
  PresentationSceneSnapshot,
  PresentationTrackV2,
  SceneAnnotation,
} from '../../shared/contracts/presentationTrack';
import { PRESENTATION_LASER_TRAIL_DURATION_MS } from '../../shared/contracts/presentationTrack';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function annotationId(annotation: SceneAnnotation): string | undefined {
  return typeof annotation.id === 'string' ? annotation.id : undefined;
}

export function applyPresentationEvent(
  snapshot: PresentationSceneSnapshot,
  event: PresentationEvent,
): PresentationSceneSnapshot {
  const next = clone(snapshot);

  switch (event.type) {
    case 'annotation/add': {
      const id = annotationId(event.annotation);
      if (id) next.annotations = next.annotations.filter((item) => annotationId(item) !== id);
      next.annotations.push(clone(event.annotation));
      break;
    }
    case 'annotation/update': {
      const id = annotationId(event.annotation);
      if (!id) break;
      const index = next.annotations.findIndex((item) => annotationId(item) === id);
      if (index >= 0) next.annotations[index] = clone(event.annotation);
      break;
    }
    case 'annotation/delete':
      next.annotations = next.annotations.filter((item) => {
        const id = annotationId(item);
        return !id || !event.annotationIds.includes(id);
      });
      break;
    case 'scene/clear':
      next.annotations = [];
      break;
    case 'board/change':
      next.board = clone(event.board);
      break;
    case 'viewport/change':
      next.board.viewport = clone(event.viewport);
      break;
    case 'page/change':
      return clone({ ...event.scene, page: event.page });
    case 'spotlight/update':
      next.spotlight = clone(event.state);
      break;
    case 'laser/sample':
      next.laserPoints = next.laserPoints.filter(
        (point) => point.timeMs >= event.timeMs - PRESENTATION_LASER_TRAIL_DURATION_MS,
      );
      next.laserPoints.push({ ...clone(event.point), timeMs: event.timeMs });
      break;
  }

  return next;
}

/** Rebuilds presenter state at a timeline position from the nearest prior checkpoint. */
export function seekPresentationTrack(
  track: PresentationTrackV2,
  targetTimeMs: number,
): PresentationSceneSnapshot {
  const target = Math.max(0, targetTimeMs);
  const checkpoint = track.checkpoints
    .filter((record) => record.timeMs <= target)
    .sort((left, right) => right.seq - left.seq)[0];
  let snapshot = checkpoint ? clone(checkpoint.scene) : clone(track.header.initialScene);
  const startingSequence = checkpoint?.seq ?? 0;

  for (const event of track.events) {
    if (event.seq <= startingSequence || event.timeMs > target) continue;
    snapshot = applyPresentationEvent(snapshot, event);
  }

  snapshot.laserPoints = snapshot.laserPoints.filter(
    (point) => point.timeMs >= target - PRESENTATION_LASER_TRAIL_DURATION_MS && point.timeMs <= target,
  );

  return snapshot;
}
