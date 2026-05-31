import { complexFromPhase, magnitudeSquared } from "./math";
import type { AccumulatedPhaseState, PathSample } from "./types";

const RECENT_SAMPLE_LIMIT = 96;

export function createEmptyPhaseState(): AccumulatedPhaseState {
  return {
    count: 0,
    totalWeight: 0,
    amplitude: { real: 0, imaginary: 0 },
    average: { real: 0, imaginary: 0 },
    coherence: 0,
    recentSamples: [],
  };
}

export function addPathToPhaseState(
  current: AccumulatedPhaseState,
  path: PathSample,
): AccumulatedPhaseState {
  const vector = complexFromPhase(path.phase, path.amplitudeWeight);
  const amplitude = {
    real: current.amplitude.real + vector.real,
    imaginary: current.amplitude.imaginary + vector.imaginary,
  };
  const totalWeight = current.totalWeight + path.amplitudeWeight;
  const average =
    totalWeight === 0
      ? { real: 0, imaginary: 0 }
      : {
          real: amplitude.real / totalWeight,
          imaginary: amplitude.imaginary / totalWeight,
        };
  const recentSamples = [
    ...current.recentSamples,
    { id: current.count, phase: path.phase, weight: path.amplitudeWeight },
  ].slice(-RECENT_SAMPLE_LIMIT);

  return {
    count: current.count + 1,
    totalWeight,
    amplitude,
    average,
    coherence: Math.min(magnitudeSquared(average), 1),
    recentSamples,
  };
}
