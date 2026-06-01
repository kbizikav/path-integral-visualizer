import { GEOMETRY, PATH_POINTS_PER_LEG, PATH_ROUGHNESS, PATH_SEED, SLIT_APERTURE_WIDTH } from "./constants";
import { calculatePolylineAction } from "./action";
import { distance, seededRandom } from "./math";
import type { PathPoint, PathSample, SimulationParams } from "./types";

export function getSlitPositions(slitSeparation: number): [number, number] {
  return [-slitSeparation / 2, slitSeparation / 2];
}

export function calculatePathLength(slitY: number, detectorY: number): number {
  return (
    distance(GEOMETRY.sourceX, GEOMETRY.sourceY, GEOMETRY.slitX, slitY) +
    distance(GEOMETRY.slitX, slitY, GEOMETRY.screenX, detectorY)
  );
}

export function calculatePolylineLength(points: PathPoint[]): number {
  return points.slice(1).reduce(
    (sum, point, index) => sum + distance(points[index].x, points[index].y, point.x, point.y),
    0,
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
    const source = { x: GEOMETRY.sourceX, y: GEOMETRY.sourceY };
    const slit = { x: GEOMETRY.slitX, y: slitY };
    const detector = { x: GEOMETRY.screenX, y: detectorY };
    const firstLegPoints = generateJaggedLeg(source, slit, random);
    const secondLegPoints = generateJaggedLeg(slit, detector, random);
    const points = [...firstLegPoints, ...secondLegPoints.slice(1)];
    const pathLength = calculatePolylineLength(points);
    const action = calculatePolylineAction(points, params.mass);
    const phase = action / params.reducedPlanck;

    samples.push({
      id: index,
      slitIndex,
      slitY,
      detectorY,
      points,
      pathLength,
      action,
      phase,
      amplitudeWeight: 1 / Math.sqrt(pathLength),
    });
  }

  return samples;
}

function generateJaggedLeg(
  start: PathPoint,
  end: PathPoint,
  random: () => number,
): PathPoint[] {
  const points: PathPoint[] = [];
  const baseDy = end.y - start.y;

  for (let index = 0; index <= PATH_POINTS_PER_LEG; index += 1) {
    const t = index / PATH_POINTS_PER_LEG;
    const bridgeEnvelope = Math.sin(Math.PI * t);
    const alternatingKick = (index % 2 === 0 ? 1 : -1) * (0.35 + random() * 0.65);
    const randomKick = random() * 2 - 1;
    const roughOffset =
      (randomKick * 0.72 + alternatingKick * 0.28) * PATH_ROUGHNESS * bridgeEnvelope;

    points.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + baseDy * t + roughOffset,
    });
  }

  points[0] = start;
  points[points.length - 1] = end;

  return points;
}
