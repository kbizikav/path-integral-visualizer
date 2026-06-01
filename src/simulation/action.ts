import { TRAVERSAL_TIME } from "./constants";
import { distance } from "./math";
import type { PathPoint } from "./types";

export function calculateFreeParticleAction(
  distance: number,
  duration: number,
  mass: number,
): number {
  if (duration <= 0) {
    throw new Error("duration must be positive");
  }
  if (mass <= 0) {
    throw new Error("mass must be positive");
  }

  return (mass * distance * distance) / (2 * duration);
}

export function calculatePolylineAction(points: PathPoint[], mass: number): number {
  const segmentCount = points.length - 1;
  if (segmentCount <= 0) {
    return 0;
  }

  const segmentDuration = TRAVERSAL_TIME / segmentCount;

  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    const segmentLength = distance(previous.x, previous.y, point.x, point.y);

    return sum + calculateFreeParticleAction(segmentLength, segmentDuration, mass);
  }, 0);
}

export function calculateAccumulatedPolylineAction(
  points: PathPoint[],
  pathProgress: number,
  mass: number,
): number {
  const segmentCount = points.length - 1;
  if (segmentCount <= 0) {
    return 0;
  }

  const progress = Math.min(Math.max(pathProgress, 0), 1) * segmentCount;
  const completeSegments = Math.floor(progress);
  const segmentFraction = progress - completeSegments;
  const segmentDuration = TRAVERSAL_TIME / segmentCount;
  let action = 0;

  for (let index = 0; index < completeSegments; index += 1) {
    const segmentLength = distance(
      points[index].x,
      points[index].y,
      points[index + 1].x,
      points[index + 1].y,
    );
    action += calculateFreeParticleAction(segmentLength, segmentDuration, mass);
  }

  if (completeSegments < segmentCount && segmentFraction > 0) {
    const segmentLength =
      distance(
        points[completeSegments].x,
        points[completeSegments].y,
        points[completeSegments + 1].x,
        points[completeSegments + 1].y,
      ) * segmentFraction;
    action += calculateFreeParticleAction(segmentLength, segmentDuration * segmentFraction, mass);
  }

  return action;
}
