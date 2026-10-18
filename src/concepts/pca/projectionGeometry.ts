/** The PCA eigenvectors are orthonormal in the standardized variable space. */
export function projectOntoPrincipalPlane(point: number[], basis: [number[], number[]]) {
  const scores = basis.map(vector => vector.reduce((sum, coefficient, j) => sum + coefficient * point[j], 0));
  const firstComponent = point.map((_, j) => scores[0] * basis[0][j]);
  const foot = point.map((_, j) => firstComponent[j] + scores[1] * basis[1][j]);
  const distance = Math.hypot(...point.map((value, j) => value - foot[j]));
  return { scores, firstComponent, foot, distance };
}
