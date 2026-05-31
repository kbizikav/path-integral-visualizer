import { TRAVERSAL_TIME } from "./constants";

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

export function calculateSlitPathAction(
  firstLegLength: number,
  secondLegLength: number,
  mass: number,
): number {
  const legDuration = TRAVERSAL_TIME / 2;

  return (
    calculateFreeParticleAction(firstLegLength, legDuration, mass) +
    calculateFreeParticleAction(secondLegLength, legDuration, mass)
  );
}

export function calculateAccumulatedAction(
  firstLegLength: number,
  secondLegLength: number,
  pathProgress: number,
  mass: number,
): number {
  const legDuration = TRAVERSAL_TIME / 2;
  const firstLegAction = calculateFreeParticleAction(firstLegLength, legDuration, mass);
  const secondLegAction = calculateFreeParticleAction(secondLegLength, legDuration, mass);

  if (pathProgress <= 0.5) {
    return firstLegAction * (pathProgress / 0.5);
  }

  return firstLegAction + secondLegAction * ((pathProgress - 0.5) / 0.5);
}
