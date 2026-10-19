export type StudyRow = { revision: number; sleep: number; grade: number };

// A balanced factorial design: the residuals sum to zero at each (R, S).
export const CALIBRATION_ROWS: StudyRow[] = [
  { revision: 2, sleep: 6, grade: 6.8 }, { revision: 2, sleep: 6, grade: 7.6 },
  { revision: 2, sleep: 8, grade: 8.4 }, { revision: 2, sleep: 8, grade: 9.2 },
  { revision: 6, sleep: 6, grade: 11.6 }, { revision: 6, sleep: 6, grade: 12.4 },
  { revision: 6, sleep: 8, grade: 13.2 }, { revision: 6, sleep: 8, grade: 14 },
];

export function fitStudy(rows: StudyRow[]) {
  const n = rows.length;
  const meanR = rows.reduce((s, row) => s + row.revision, 0) / n;
  const meanS = rows.reduce((s, row) => s + row.sleep, 0) / n;
  const meanN = rows.reduce((s, row) => s + row.grade, 0) / n;
  let rr = 0, ss = 0, rs = 0, rn = 0, sn = 0;
  for (const row of rows) {
    const r = row.revision - meanR, s = row.sleep - meanS, y = row.grade - meanN;
    rr += r * r; ss += s * s; rs += r * s; rn += r * y; sn += s * y;
  }
  const determinant = rr * ss - rs * rs;
  if (n <= 3 || Math.abs(determinant) < 1e-10) return null;
  const a = (rn * ss - sn * rs) / determinant;
  const b = (sn * rr - rn * rs) / determinant;
  const rawIntercept = meanN - a * meanR - b * meanS;
  const intercept = Math.abs(rawIntercept) < 1e-12 ? 0 : rawIntercept;
  const sse = rows.reduce((s, row) => s + (row.grade - intercept - a * row.revision - b * row.sleep) ** 2, 0);
  return { meanR, meanS, meanN, a, b, intercept, sigma: Math.sqrt(sse / (n - 3)), rr, ss, rs, rn, sn };
}

function uniform(seed: number) {
  // Integer hash gives reproducible uniforms without coupling consecutive
  // Gaussian draws to the smooth sine of their seeds.
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (((value ^ (value >>> 15)) >>> 0) + 0.5) / 4294967296;
}

export function normalNoise(seed: number) {
  return Math.sqrt(-2 * Math.log(uniform(seed * 2))) * Math.cos(2 * Math.PI * uniform(seed * 2 + 1));
}

export function revisionResults(params: Record<string, number>, intervention: { variable: string; value: number } | null) {
  const r = intervention?.variable === 'R' ? intervention.value : params.muR;
  const s = intervention?.variable === 'S' ? intervention.value : params.muS;
  const expected = params.intercept + params.aR * r + params.aS * s;
  let total = 0;
  for (let i = 1; i <= 10000; i++) {
    const ri = intervention?.variable === 'R' ? r : r + 2 * normalNoise(i * 3);
    const si = intervention?.variable === 'S' ? s : s + normalNoise(i * 3 + 1);
    total += params.intercept + params.aR * ri + params.aS * si + params.noise * normalNoise(i * 3 + 2);
  }
  return { r, s, expected, monteCarlo: total / 10000 };
}
