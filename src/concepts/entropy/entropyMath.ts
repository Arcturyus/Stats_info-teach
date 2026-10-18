import { gamma } from 'mathjs';
import type { ContinuousFamily } from './types';

const EPS = 1e-12;

// --- Distributions discretes ---

export function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + Math.max(w, 0), 0);
  if (sum <= EPS) return weights.map(() => 1 / weights.length);
  return weights.map((w) => Math.max(w, 0) / sum);
}

export function entropyDiscrete(probs: number[]): number {
  return probs.reduce((h, p) => (p > EPS ? h - p * Math.log2(p) : h), 0);
}

export function crossEntropyDiscrete(p: number[], q: number[]): number {
  return p.reduce((h, pi, i) => {
    if (pi <= EPS) return h;
    return h - pi * Math.log2(Math.max(q[i], EPS));
  }, 0);
}

export function klDiscrete(p: number[], q: number[]): number {
  return crossEntropyDiscrete(p, q) - entropyDiscrete(p);
}

export function entropyTerms(probs: number[]): number[] {
  return probs.map((p) => (p > EPS ? -p * Math.log2(p) : 0));
}

export function crossEntropyTerms(p: number[], q: number[]): number[] {
  return p.map((pi, i) => (pi > EPS ? -pi * Math.log2(Math.max(q[i], EPS)) : 0));
}

// --- Integration numerique pour les distributions continues ---

export interface Grid {
  xs: number[];
  dx: number;
}

export function buildGrid(domain: [number, number], n = 600): Grid {
  const [a, b] = domain;
  const dx = (b - a) / n;
  const xs = Array.from({ length: n }, (_, i) => a + (i + 0.5) * dx);
  return { xs, dx };
}

export function differentialEntropyContinuous(fVals: number[], dx: number): number {
  return fVals.reduce((h, f) => (f > EPS ? h - f * Math.log2(f) * dx : h), 0);
}

export function crossEntropyContinuous(fVals: number[], gVals: number[], dx: number): number {
  return fVals.reduce((h, f, i) => {
    if (f <= EPS) return h;
    return h - f * Math.log2(Math.max(gVals[i], EPS)) * dx;
  }, 0);
}

export function klContinuous(fVals: number[], gVals: number[], dx: number): number {
  return crossEntropyContinuous(fVals, gVals, dx) - differentialEntropyContinuous(fVals, dx);
}

// --- Familles de lois continues ---

export function normalPdf(x: number, mu: number, sigma: number): number {
  const s = Math.max(sigma, 1e-6);
  return Math.exp(-((x - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
}

export function uniformPdf(x: number, a: number, b: number): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b, lo + 1e-6);
  return x >= lo && x <= hi ? 1 / (hi - lo) : 0;
}

export function exponentialPdf(x: number, lambda: number): number {
  const l = Math.max(lambda, 1e-6);
  return x >= 0 ? l * Math.exp(-l * x) : 0;
}

export function betaPdf(x: number, alpha: number, betaParam: number): number {
  if (x <= 0 || x >= 1) return 0;
  const a = Math.max(alpha, 0.05);
  const b = Math.max(betaParam, 0.05);
  const B = (Number(gamma(a)) * Number(gamma(b))) / Number(gamma(a + b));
  return x ** (a - 1) * (1 - x) ** (b - 1) / B;
}

export function continuousDomain(family: ContinuousFamily, params: Record<string, number>): [number, number] {
  if (family === 'normal') {
    const mu = params.mu ?? 0;
    const sigma = Math.max(params.sigma ?? 1, 0.05);
    return [mu - 5 * sigma, mu + 5 * sigma];
  }
  if (family === 'uniform') {
    const lo = Math.min(params.a, params.b);
    const hi = Math.max(params.a, params.b);
    const pad = Math.max(hi - lo, 0.5) * 0.2;
    return [lo - pad, hi + pad];
  }
  if (family === 'exponential') {
    return [0, 6 / Math.max(params.lambda, 0.05)];
  }
  return [0, 1];
}

export function evalPdf(family: ContinuousFamily, params: Record<string, number>, x: number): number {
  if (family === 'normal') return normalPdf(x, params.mu, params.sigma);
  if (family === 'uniform') return uniformPdf(x, params.a, params.b);
  if (family === 'exponential') return exponentialPdf(x, params.lambda);
  return betaPdf(x, params.alpha, params.beta);
}
