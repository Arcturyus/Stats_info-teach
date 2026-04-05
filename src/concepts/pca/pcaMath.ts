import { eigs, multiply, transpose, matrix, type Matrix } from 'mathjs';

/**
 * Compute column means.
 */
export function computeMeans(data: number[][]): number[] {
  const n = data.length;
  const p = data[0].length;
  const means = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) {
      means[j] += data[i][j];
    }
    means[j] /= n;
  }
  return means;
}

/**
 * Center data by subtracting column means.
 */
export function centerData(data: number[][], means: number[]): number[][] {
  return data.map((row) => row.map((val, j) => val - means[j]));
}

/**
 * Compute column standard deviations (population std, /n).
 */
export function computeStdDevs(centered: number[][]): number[] {
  const n = centered.length;
  const p = centered[0].length;
  const stds = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    for (let i = 0; i < n; i++) {
      stds[j] += centered[i][j] ** 2;
    }
    stds[j] = Math.sqrt(stds[j] / n);
  }
  return stds;
}

/**
 * Normalize (standardize) centered data by dividing by std devs.
 */
export function normalizeData(centered: number[][], stdDevs: number[]): number[][] {
  return centered.map((row) =>
    row.map((val, j) => (stdDevs[j] !== 0 ? val / stdDevs[j] : 0))
  );
}

/**
 * Compute correlation matrix: R = (1/n) * Z^T * Z
 */
export function computeCorrelationMatrix(normalized: number[][]): number[][] {
  const n = normalized.length;
  const Z = matrix(normalized);
  const Zt = transpose(Z);
  const R = multiply(1 / n, multiply(Zt, Z));
  return (R as Matrix).toArray() as number[][];
}

/**
 * Compute eigenvalues and eigenvectors, sorted by descending eigenvalue.
 */
export function computeEigen(corrMatrix: number[][]): {
  values: number[];
  vectors: number[][];
} {
  const result = eigs(matrix(corrMatrix));

  // eigs returns eigenvectors array with {value, vector} entries
  const eigEntries = result.eigenvectors;
  const valuesRaw = eigEntries.map((e) => Number(e.value));
  const vectorsRawArrays = eigEntries.map((e) => (e.vector as Matrix).toArray() as number[]);

  // Pair and sort by descending eigenvalue
  const paired = valuesRaw.map((value, i) => ({
    value,
    vector: vectorsRawArrays[i],
  }));

  paired.sort((a, b) => b.value - a.value);

  return {
    values: paired.map((p) => p.value),
    vectors: paired.map((p) => p.vector),
  };
}

/**
 * Project normalized data onto the first k principal components.
 */
export function projectData(
  normalized: number[][],
  eigenvectors: number[][],
  k: number
): number[][] {
  // eigenvectors[i] is the i-th eigenvector (column)
  // Build projection matrix P (p x k): columns are the first k eigenvectors
  const p = normalized[0].length;
  const P: number[][] = [];
  for (let i = 0; i < p; i++) {
    const row: number[] = [];
    for (let j = 0; j < k; j++) {
      row.push(eigenvectors[j][i]);
    }
    P.push(row);
  }

  // Y = Z * P
  const Z = matrix(normalized);
  const Pm = matrix(P);
  const Y = multiply(Z, Pm);
  return (Y as Matrix).toArray() as number[][];
}

/**
 * Compute percentage of variance explained by each component.
 */
export function computeVarianceExplained(eigenvalues: number[]): number[] {
  const total = eigenvalues.reduce((sum, v) => sum + v, 0);
  return eigenvalues.map((v) => v / total);
}

/**
 * Compute cumulative variance explained.
 */
export function computeCumulativeVariance(varianceExplained: number[]): number[] {
  const cumulative: number[] = [];
  let sum = 0;
  for (const v of varianceExplained) {
    sum += v;
    cumulative.push(sum);
  }
  return cumulative;
}
