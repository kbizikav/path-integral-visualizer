import { TAU } from "./constants";
import type { ComplexAmplitude } from "./types";

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function phaseToHue(phase: number): number {
  const normalizedPhase = ((phase % TAU) + TAU) % TAU;
  return Math.round((normalizedPhase / TAU) * 360);
}

export function complexFromPhase(phase: number, weight: number): ComplexAmplitude {
  return {
    real: Math.cos(phase) * weight,
    imaginary: Math.sin(phase) * weight,
  };
}

export function addComplex(
  left: ComplexAmplitude,
  right: ComplexAmplitude,
): ComplexAmplitude {
  return {
    real: left.real + right.real,
    imaginary: left.imaginary + right.imaginary,
  };
}

export function magnitudeSquared(amplitude: ComplexAmplitude): number {
  return amplitude.real * amplitude.real + amplitude.imaginary * amplitude.imaginary;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
