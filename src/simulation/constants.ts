import type { SimulationGeometry, SimulationParams } from "./types";

export const DEFAULT_PARAMS: SimulationParams = {
  slitSeparation: 0.28,
  mass: 1,
  reducedPlanck: 0.035,
  pathCount: 180,
  animationSpeed: 1,
  detectorY: 0.16,
};

export const PARAM_LIMITS = {
  slitSeparation: { min: 0.12, max: 0.5, step: 0.01 },
  mass: { min: 0.35, max: 2.5, step: 0.05 },
  reducedPlanck: { min: 0.018, max: 0.075, step: 0.001 },
  pathCount: { min: 40, max: 420, step: 10 },
  animationSpeed: { min: 0.35, max: 2.5, step: 0.05 },
  detectorY: { min: -0.52, max: 0.52, step: 0.01 },
} as const;

export const GEOMETRY: SimulationGeometry = {
  sourceX: 0.08,
  sourceY: 0,
  slitX: 0.42,
  screenX: 0.92,
  screenHalfHeight: 0.52,
};

export const TAU = Math.PI * 2;
export const INTENSITY_SAMPLE_COUNT = 180;
export const PATH_SEED = 0x51f15e;
export const SLIT_APERTURE_WIDTH = 0.074;
export const PATH_POINTS_PER_LEG = 10;
export const PATH_ROUGHNESS = 0.16;
export const TRAVERSAL_TIME = 1;
