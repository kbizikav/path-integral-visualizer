import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "./constants";
import { calculateIntensityDistribution, sumPathAmplitudes } from "./intensity";
import { addPathToPhaseState, createEmptyPhaseState } from "./phaseAccumulation";
import { generatePathSamples } from "./paths";

describe("path integral simulation", () => {
  it("generates stable path samples for the same parameters", () => {
    const first = generatePathSamples(DEFAULT_PARAMS);
    const second = generatePathSamples(DEFAULT_PARAMS);

    expect(first).toEqual(second);
    expect(first).toHaveLength(DEFAULT_PARAMS.pathCount);
  });

  it("changes the intensity distribution when the action phase scale changes", () => {
    const base = calculateIntensityDistribution(DEFAULT_PARAMS, 48);
    const shifted = calculateIntensityDistribution(
      { ...DEFAULT_PARAMS, reducedPlanck: DEFAULT_PARAMS.reducedPlanck * 1.45 },
      48,
    );

    expect(shifted).not.toEqual(base);
  });

  it("calculates each sampled phase from the free-particle action", () => {
    const [path] = generatePathSamples(DEFAULT_PARAMS);

    expect(path.phase).toBeCloseTo(path.action / DEFAULT_PARAMS.reducedPlanck);
    expect(path.action).toBeGreaterThan(0);
  });

  it("scales the action phase with particle mass", () => {
    const [basePath] = generatePathSamples(DEFAULT_PARAMS);
    const heavierParams = { ...DEFAULT_PARAMS, mass: DEFAULT_PARAMS.mass * 1.5 };
    const [heavierPath] = generatePathSamples(heavierParams);

    expect(heavierPath.action).toBeCloseTo(basePath.action * 1.5);
    expect(heavierPath.phase).toBeCloseTo(heavierPath.action / heavierParams.reducedPlanck);
  });

  it("normalizes intensity values between 0 and 1", () => {
    const distribution = calculateIntensityDistribution(DEFAULT_PARAMS, 96);

    expect(distribution.length).toBe(96);
    for (const point of distribution) {
      expect(point.intensity).toBeGreaterThanOrEqual(0);
      expect(point.intensity).toBeLessThanOrEqual(1);
    }
  });

  it("targets every sampled path at the selected detector point", () => {
    const detectorY = -0.24;
    const paths = generatePathSamples({ ...DEFAULT_PARAMS, detectorY });

    expect(paths.every((path) => path.detectorY === detectorY)).toBe(true);
  });

  it("sums path amplitudes into a bounded constructive ratio", () => {
    const paths = generatePathSamples(DEFAULT_PARAMS);
    const pathSum = sumPathAmplitudes(paths);

    expect(pathSum.rawIntensity).toBeGreaterThanOrEqual(0);
    expect(pathSum.normalizedIntensity).toBeGreaterThanOrEqual(0);
    expect(pathSum.normalizedIntensity).toBeLessThanOrEqual(1);
  });

  it("accumulates phase samples from zero as paths arrive", () => {
    const [firstPath, secondPath] = generatePathSamples(DEFAULT_PARAMS);
    const initial = createEmptyPhaseState();
    const afterFirst = addPathToPhaseState(initial, firstPath);
    const afterSecond = addPathToPhaseState(afterFirst, secondPath);

    expect(initial.count).toBe(0);
    expect(afterFirst.count).toBe(1);
    expect(afterSecond.count).toBe(2);
    expect(afterSecond.coherence).toBeGreaterThanOrEqual(0);
    expect(afterSecond.coherence).toBeLessThanOrEqual(1);
  });
});
