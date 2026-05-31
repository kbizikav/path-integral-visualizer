export type SimulationParams = {
  slitSeparation: number;
  reducedPlanck: number;
  pathCount: number;
  animationSpeed: number;
  detectorY: number;
};

export type ComplexAmplitude = {
  real: number;
  imaginary: number;
};

export type PathSample = {
  id: number;
  slitIndex: 0 | 1;
  slitY: number;
  detectorY: number;
  controlY: number;
  firstLegLength: number;
  secondLegLength: number;
  pathLength: number;
  action: number;
  phase: number;
  amplitudeWeight: number;
};

export type IntensityPoint = {
  y: number;
  intensity: number;
};

export type PathSumResult = {
  amplitude: ComplexAmplitude;
  rawIntensity: number;
  normalizedIntensity: number;
  constructiveRatio: number;
};

export type PhaseSample = {
  id: number;
  phase: number;
  weight: number;
};

export type AccumulatedPhaseState = {
  count: number;
  totalWeight: number;
  amplitude: ComplexAmplitude;
  average: ComplexAmplitude;
  coherence: number;
  recentSamples: PhaseSample[];
};

export type SimulationGeometry = {
  sourceX: number;
  sourceY: number;
  slitX: number;
  screenX: number;
  screenHalfHeight: number;
};
