import { GEOMETRY, PATH_SEED, SLIT_APERTURE_WIDTH } from "./constants";
import { calculateSlitPathAction } from "./action";
import { distance, seededRandom } from "./math";
import type { PathSample, SimulationParams } from "./types";

export function getSlitPositions(slitSeparation: number): [number, number] {
  return [-slitSeparation / 2, slitSeparation / 2];
}

export function calculatePathLength(slitY: number, detectorY: number): number {
  return (
    distance(GEOMETRY.sourceX, GEOMETRY.sourceY, GEOMETRY.slitX, slitY) +
    distance(GEOMETRY.slitX, slitY, GEOMETRY.screenX, detectorY)
  );
}

export function generatePathSamples(params: SimulationParams): PathSample[] {
  const random = seededRandom(
    PATH_SEED +
      Math.round(params.slitSeparation * 1000) +
      Math.round((params.detectorY + GEOMETRY.screenHalfHeight) * 1000),
  );
  const slitPositions = getSlitPositions(params.slitSeparation);
  const samples: PathSample[] = [];

  for (let index = 0; index < params.pathCount; index += 1) {
    const slitIndex = (index % 2) as 0 | 1;
    const apertureOffset = (random() * 2 - 1) * (SLIT_APERTURE_WIDTH / 2);
    const slitY = slitPositions[slitIndex] + apertureOffset;
    const detectorY = params.detectorY;
    const controlY = slitY + (random() * 2 - 1) * 0.18;
    const firstLegLength = distance(GEOMETRY.sourceX, GEOMETRY.sourceY, GEOMETRY.slitX, slitY);
    const secondLegLength = distance(GEOMETRY.slitX, slitY, GEOMETRY.screenX, detectorY);
    const pathLength = firstLegLength + secondLegLength;
    const action = calculateSlitPathAction(firstLegLength, secondLegLength);
    const phase = action / params.reducedPlanck;

    samples.push({
      id: index,
      slitIndex,
      slitY,
      detectorY,
      controlY,
      firstLegLength,
      secondLegLength,
      pathLength,
      action,
      phase,
      amplitudeWeight: 1 / Math.sqrt(pathLength),
    });
  }

  return samples;
}
