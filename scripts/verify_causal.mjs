// Run with Node 24+: node scripts/verify_causal.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CALIBRATION_ROWS, fitStudy, normalNoise, revisionResults } from '../src/concepts/causal/causalMath.ts';
import { CONTINUOUS_SAMPLE, DISCRETE_SAMPLE, fitCoffee, riskDifference, studentCritical } from '../src/concepts/causal/dagStatistics.ts';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);

test('risk intervals use the difference and do not equate non-significance with equivalence', () => {
  const smokers = riskDifference(DISCRETE_SAMPLE[0], DISCRETE_SAMPLE[1]);
  close(smokers.p1, 0.175); close(smokers.p0, 941 / 5600);
  close(smokers.difference, 0.006964285714285701);
  close(smokers.se, 0.007601100871986101);
  assert.ok(smokers.ci95[0] < 0 && smokers.ci95[1] > 0);
  // Zero is compatible, but the 90% interval does not fit inside +/- 1 pp.
  assert.ok(smokers.ci90[1] > 0.01);
  assert.ok(smokers.ci90[0] > -0.02 && smokers.ci90[1] < 0.02);
  const enlarged = riskDifference({ n: 44000, cancers: 7700 }, { n: 56000, cancers: 9410 });
  close(enlarged.difference, smokers.difference);
  close(enlarged.se, smokers.se / Math.sqrt(10));
});

test('continuous adjustment matches a regression on both sets of sleep residuals', () => {
  const fit = fitCoffee(CONTINUOUS_SAMPLE);
  let uu = 0, uv = 0, residualSS = 0;
  for (const row of CONTINUOUS_SAMPLE) {
    const u = row.coffee - fit.meanR - fit.gammaCoffee * (row.sleep - fit.meanS);
    const v = row.grade - fit.meanN - fit.gammaGrade * (row.sleep - fit.meanS);
    uu += u * u; uv += u * v;
    residualSS += (row.grade - fit.intercept - fit.a * row.coffee - fit.b * row.sleep) ** 2;
  }
  close(uv / uu, fit.a);
  close(fit.se, Math.sqrt(residualSS / (80 - 3) / uu));
  close(fit.crude, 1.977);
  assert.ok(Math.abs(fit.a) < 0.15);
  // Adding a known direct contribution shifts the coffee coefficient exactly,
  // while leaving sleep's coefficient and the uncertainty unchanged.
  const changed = fitCoffee(CONTINUOUS_SAMPLE.map((r) => ({ ...r, grade: r.grade + 0.7 * r.coffee })));
  close(changed.a - fit.a, 0.7); close(changed.b, fit.b); close(changed.se, fit.se);
  close(studentCritical(77, 95), 1.991254395388, 1e-6);
  assert.ok(studentCritical(77, 90) < studentCritical(77, 95));
  assert.equal(fitCoffee(CONTINUOUS_SAMPLE.map((r) => ({ ...r, coffee: 1 }))), null);
});

test('calibration recovers the worked coefficients, means and residual standard deviation', () => {
  const fit = fitStudy(CALIBRATION_ROWS);
  close(fit.meanR, 4); close(fit.meanS, 7); close(fit.meanN, 10.4);
  close(fit.a, 1.2); close(fit.b, 0.8); close(fit.intercept, 0);
  close(fit.sigma, Math.sqrt(1.28 / 5));
  const changed = CALIBRATION_ROWS.map((row, i) => ({ ...row, grade: row.grade + (i === 0 ? 1 : 0) }));
  const newFit = fitStudy(changed);
  assert.notEqual(newFit.a, fit.a);
  // A fit with an intercept has zero mean residual, also after editing.
  close(changed.reduce((sum, row) => sum + row.grade - newFit.intercept - newFit.a * row.revision - newFit.b * row.sleep, 0), 0);
});

test('multiple regression handles correlated predictors and rejects an unidentified design', () => {
  const rows = [[1, 3], [2, 4], [4, 4], [3, 7], [7, 8]].map(([revision, sleep]) => ({ revision, sleep, grade: 3 + 1.5 * revision - 0.4 * sleep }));
  const fit = fitStudy(rows);
  close(fit.a, 1.5); close(fit.b, -0.4); close(fit.intercept, 3); close(fit.sigma, 0);
  assert.equal(fitStudy(rows.map((row) => ({ ...row, sleep: row.revision * 2 }))), null);
});

test('Gaussian simulation matches its equations and preserves unbounded analytic expectations', () => {
  const noise = Array.from({ length: 10000 }, (_, i) => normalNoise(i + 1));
  const mean = noise.reduce((a, b) => a + b, 0) / noise.length;
  close(mean, 0, 0.04);
  close(noise.reduce((a, b) => a + (b - mean) ** 2, 0) / noise.length, 1, 0.06);
  const params = { muR: 4, muS: 7, aR: 1.2, aS: 0.8, intercept: 0, noise: 2 };
  const observed = revisionResults(params, null);
  close(observed.expected, 10.4); close(observed.monteCarlo, observed.expected, 0.1);
  const intervention = revisionResults(params, { variable: 'R', value: 8 });
  close(intervention.r, 8); close(intervention.s, 7); close(intervention.expected, 15.2);
  close(intervention.monteCarlo, intervention.expected, 0.1);
  const high = revisionResults({ ...params, intercept: 25, aR: 0, aS: 0, noise: 0 }, null);
  close(high.expected, 25); close(high.monteCarlo, 25); // No hidden clipping at 20.
});

test('audit the exercise contrasts from their counts, independently of the printed answers', () => {
  const coffee = (80 * 14 + 20 * 10) / 100;
  const control = (20 * 14 + 80 * 10) / 100;
  close(coffee - control, 2.4);
  // Pearson correlation from the complete synthetic joint distribution.
  const cells = [[80, 1, 14], [20, 1, 10], [20, 0, 14], [80, 0, 10]];
  const cov = cells.reduce((sum, [n, c, y]) => sum + n * (c - 0.5) * (y - 12), 0) / 200;
  close(cov / Math.sqrt(0.25 * 4), 0.6);
  close((80 + 30) / 1000 - (140 + 15) / 1000, -0.045);
  close(650 / 1000 - 245 / 550, 0.2045454545454546);
  const p1 = 1720 / 10000, p0 = 130 / 10000;
  close(p1 - p0, 0.159); close(p1 / p0, 13.23076923076923);
  close((1720 / 8280) / (130 / 9870), 15.771460423634337, 1e-6);
  const se = Math.sqrt((p1 * (1 - p1) + p0 * (1 - p0)) / 10000);
  close((p1 - p0 - 1.96 * se) * 100, 15.13, 0.01);
  close((Math.atanh(0.7) - Math.atanh(0.4)) / Math.sqrt(2 / 117), 3.39, 0.01);
  const invited = (120 * 14 + 80 * 11) / 200;
  const uninvited = (40 * 13 + 160 * 11.5) / 200;
  close(invited - uninvited, 1); close((invited - uninvited) / (120 / 200 - 40 / 200), 2.5);
  close((120 * 14 + 40 * 13) / 160 - (80 * 11 + 160 * 11.5) / 240, 2.416666666666666);
});
