import './quantityColors.css';

export type QuantityKind = 'x' | 'centered' | 'z' | 'mean' | 'std' | 'coefficient';

/** One variable keeps its hue in tables, formulas and hover details. */
export const quantityClass = (variable: number, kind: QuantityKind = 'z') =>
  `pca-quantity pca-variable-${variable % 3} pca-${kind}`;
export const axisClass = (axis: number) => `pca-axis-${axis % 3}`;
export const colorTex = (variable: number, kind: QuantityKind, tex: string) =>
  `\\htmlClass{${quantityClass(variable, kind)}}{${tex}}`;
export const axisTex = (axis: number, tex: string) => `\\htmlClass{${axisClass(axis)}}{${tex}}`;
