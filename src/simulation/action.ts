import { PARTICLE_MASS, TRAVERSAL_TIME } from "./constants";

export function calculateFreeParticleAction(distance: number, duration: number): number {
  if (duration <= 0) {
    throw new Error("duration must be positive");
  }

  return (PARTICLE_MASS * distance * distance) / (2 * duration);
}

export function calculateSlitPathAction(firstLegLength: number, secondLegLength: number): number {
  const legDuration = TRAVERSAL_TIME / 2;

  return (
    calculateFreeParticleAction(firstLegLength, legDuration) +
    calculateFreeParticleAction(secondLegLength, legDuration)
  );
}

export function calculateAccumulatedAction(
  firstLegLength: number,
  secondLegLength: number,
  pathProgress: number,
): number {
  const legDuration = TRAVERSAL_TIME / 2;
  const firstLegAction = calculateFreeParticleAction(firstLegLength, legDuration);
  const secondLegAction = calculateFreeParticleAction(secondLegLength, legDuration);

  if (pathProgress <= 0.5) {
    return firstLegAction * (pathProgress / 0.5);
  }

  return firstLegAction + secondLegAction * ((pathProgress - 0.5) / 0.5);
}
