import { GEOMETRY, INTENSITY_SAMPLE_COUNT } from "./constants";
import { calculatePolylineAction } from "./action";
import { addComplex, complexFromPhase, distance, magnitudeSquared } from "./math";
import { getSlitPositions } from "./paths";
import type {
  ComplexAmplitude,
  IntensityPoint,
  PathSample,
  PathSumResult,
  SimulationParams,
} from "./types";

export function calculateAmplitudeAtY(
  detectorY: number,
  params: Pick<SimulationParams, "slitSeparation" | "mass" | "reducedPlanck">,
): ComplexAmplitude {
  const slitPositions = getSlitPositions(params.slitSeparation);

  return slitPositions.reduce<ComplexAmplitude>(
    (sum, slitY) => {
      const firstLeg = distance(GEOMETRY.sourceX, GEOMETRY.sourceY, GEOMETRY.slitX, slitY);
      const secondLeg = distance(GEOMETRY.slitX, slitY, GEOMETRY.screenX, detectorY);
      const length = firstLeg + secondLeg;
      const phase =
        calculatePolylineAction(
          [
            { x: GEOMETRY.sourceX, y: GEOMETRY.sourceY },
            { x: GEOMETRY.slitX, y: slitY },
            { x: GEOMETRY.screenX, y: detectorY },
          ],
          params.mass,
        ) / params.reducedPlanck;
      const verticalFalloff = Math.exp(-Math.abs(detectorY) * 0.32);

      return addComplex(sum, complexFromPhase(phase, verticalFalloff / Math.sqrt(length)));
    },
    { real: 0, imaginary: 0 },
  );
}

export function calculateIntensityDistribution(
  params: Pick<SimulationParams, "slitSeparation" | "mass" | "reducedPlanck">,
  sampleCount = INTENSITY_SAMPLE_COUNT,
): IntensityPoint[] {
  const points: IntensityPoint[] = [];
  let maxIntensity = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = sampleCount === 1 ? 0.5 : index / (sampleCount - 1);
    const y = GEOMETRY.screenHalfHeight - ratio * GEOMETRY.screenHalfHeight * 2;
    const amplitude = calculateAmplitudeAtY(y, params);
    const intensity = magnitudeSquared(amplitude);

    points.push({ y, intensity });
    maxIntensity = Math.max(maxIntensity, intensity);
  }

  return points.map((point) => ({
    y: point.y,
    intensity: maxIntensity === 0 ? 0 : point.intensity / maxIntensity,
  }));
}

export function sumPathAmplitudes(paths: PathSample[]): PathSumResult {
  const amplitude = paths.reduce<ComplexAmplitude>(
    (sum, path) => addComplex(sum, complexFromPhase(path.phase, path.amplitudeWeight)),
    { real: 0, imaginary: 0 },
  );
  const totalWeight = paths.reduce((sum, path) => sum + path.amplitudeWeight, 0);
  const rawIntensity = magnitudeSquared(amplitude);
  const maxConstructiveIntensity = totalWeight * totalWeight;
  const constructiveRatio =
    maxConstructiveIntensity === 0 ? 0 : rawIntensity / maxConstructiveIntensity;

  return {
    amplitude,
    rawIntensity,
    normalizedIntensity: Math.min(constructiveRatio, 1),
    constructiveRatio,
  };
}
