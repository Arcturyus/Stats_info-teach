import { fitStudy, normalNoise } from './causalMath.ts';

export type RiskCell = { tobacco: 0 | 1; stained: 0 | 1; n: number; cancers: number };

// Artificial independent cohorts, not the matched BMJ Open sample.
export const DISCRETE_SAMPLE: RiskCell[] = [
  { tobacco: 1, stained: 1, n: 4400, cancers: 770 },
  { tobacco: 1, stained: 0, n: 5600, cancers: 941 },
  { tobacco: 0, stained: 1, n: 1000, cancers: 14 },
  { tobacco: 0, stained: 0, n: 9900, cancers: 129 },
];

export function riskDifference(first: { n: number; cancers: number }, second: { n: number; cancers: number }) {
  const p1 = first.cancers / first.n, p0 = second.cancers / second.n;
  const difference = p1 - p0;
  const se = Math.sqrt(p1 * (1 - p1) / first.n + p0 * (1 - p0) / second.n);
  return { p1, p0, difference, se,
    ci95: [difference - 1.959963984540054 * se, difference + 1.959963984540054 * se],
    ci90: [difference - 1.6448536269514722 * se, difference + 1.6448536269514722 * se] };
}

export type CoffeeRow = { coffee: 0 | 1; sleep: number; grade: number };

export const CONTINUOUS_SAMPLE: CoffeeRow[] = Array.from({ length: 80 }, (_, i) => {
  const coffee = (i % 2) as 0 | 1;
  const sleep = Number(Math.max(4.5, Math.min(9.5, 6.2 + 1.2 * coffee + 0.9 * normalNoise(i + 720))).toFixed(2));
  const grade = Number((1 + 1.6 * sleep + 0.8 * normalNoise(i + 1840)).toFixed(2));
  return { coffee, sleep, grade };
});

export function fitCoffee(rows: CoffeeRow[]) {
  const fit = fitStudy(rows.map((r) => ({ revision: r.coffee, sleep: r.sleep, grade: r.grade })));
  if (!fit) return null;
  const residualCoffeeSS = fit.rr - fit.rs ** 2 / fit.ss;
  const residualCross = fit.rn - fit.rs * fit.sn / fit.ss;
  const se = fit.sigma / Math.sqrt(residualCoffeeSS);
  const groups = [0, 1].map((c) => {
    const group = rows.filter((r) => r.coffee === c);
    return { n: group.length, sleep: group.reduce((s, r) => s + r.sleep, 0) / group.length,
      grade: group.reduce((s, r) => s + r.grade, 0) / group.length };
  });
  return { ...fit, se, residualCoffeeSS, residualCross, groups, crude: groups[1].grade - groups[0].grade,
    gammaCoffee: fit.rs / fit.ss, gammaGrade: fit.sn / fit.ss };
}

// Cornish–Fisher expansion through df^-3; only used at df=77 here.
// At these degrees of freedom the error is well below displayed precision.
export function studentCritical(df: number, level: 90 | 95) {
  const z = level === 95 ? 1.959963984540054 : 1.6448536269514722;
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2)
    + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
}
