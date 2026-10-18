import { colorTex } from './quantityColors';
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
  const entry = (i: number, j: number) => `\\frac{${colorTex(j, 'centered', `\\tilde{X}_{${i + 1},${j + 1}}`)}}{${colorTex(j, 'std', `\\sigma_{${j + 1}}`)}}`;
  const columns = Array.from({ length: p }, (_, j) => j);
  const symbolicZ = indices.map((i) => columns.map((j) => i === null ? '\\vdots' : entry(i, j)));
  const symbolicTranspose = columns.map((j) => indices.map((i) => i === null ? '\\cdots' : entry(i, j)));
  const numericZ = indices.map((i) => columns.map((j) => i === null ? '\\vdots' : colorTex(j, 'z', fixed(z[i][j]))));
  const numericTranspose = columns.map((j) => indices.map((i) => i === null ? '\\cdots' : colorTex(j, 'z', fixed(z[i][j]))));
  const gram = columns.map((j) => columns.map((k) => z.reduce((sum, row) => sum + row[j] * row[k], 0)));
  const formula = `\\begin{aligned}Z^{\\mathsf T}Z&=${texMatrix(symbolicTranspose)}\\times${texMatrix(symbolicZ)}\\\\&\\approx${texMatrix(numericTranspose)}\\times${texMatrix(numericZ)}\\\\&\\approx${texMatrix(gram.map((row) => row.map(fixed)))}\\end{aligned}`;
  return {
    n, p, condensed: n > 4, gram,
    formula,
  };
}
