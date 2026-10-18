import type { PcaResult } from './types';

const texMatrix = (rows: string[][]) => `\\begin{pmatrix}${rows.map((row) => row.join(' & ')).join(' \\\\ ')}\\end{pmatrix}`;
const fixed = (value: number) => value.toFixed(3);

/** Compact displays only: every observation contributes to the numeric product. */
export function buildCorrelationCalculation(result: PcaResult) {
  const z = result.normalizedData;
  const n = z.length;
  const p = result.stdDevs.length;
  const indices: (number | null)[] = n <= 4
    ? Array.from({ length: n }, (_, i) => i)
    : [0, 1, null, n - 1];
  const entry = (i: number, j: number) => `\\frac{\\tilde{X}_{${i + 1},${j + 1}}}{\\sigma_{${j + 1}}}`;
  const columns = Array.from({ length: p }, (_, j) => j);
  const symbolicZ = indices.map((i) => columns.map((j) => i === null ? '\\vdots' : entry(i, j)));
  const symbolicTranspose = columns.map((j) => indices.map((i) => i === null ? '\\cdots' : entry(i, j)));
  const numericZ = indices.map((i) => columns.map((j) => i === null ? '\\vdots' : fixed(z[i][j])));
  const numericTranspose = columns.map((j) => indices.map((i) => i === null ? '\\cdots' : fixed(z[i][j])));
  const gram = columns.map((j) => columns.map((k) => z.reduce((sum, row) => sum + row[j] * row[k], 0)));
  const terms = indices.map((i) => i === null ? '\\cdots' : `(${fixed(z[i][0])})\\times(${fixed(z[i][1])})`);
  const pairFormula = `\\begin{aligned}R_{1,2}&=\\frac{1}{${n}}\\sum_{i=1}^{${n}}\\frac{\\tilde{X}_{i,1}\\tilde{X}_{i,2}}{\\sigma_1\\sigma_2}\\\\&\\approx\\frac{1}{${n}}\\left[${terms.join(' + ')}\\right]\\\\&\\approx ${fixed(result.correlationMatrix[0][1])}\\end{aligned}`;
  return {
    n, p, condensed: n > 4, gram,
    symbolicZ: `Z=${texMatrix(symbolicZ)}`,
    symbolicTranspose: `Z^{\\mathsf T}=${texMatrix(symbolicTranspose)}`,
    numericZ: `Z\\approx ${texMatrix(numericZ)}`,
    numericTranspose: `Z^{\\mathsf T}\\approx ${texMatrix(numericTranspose)}`,
    pairFormula,
  };
}
