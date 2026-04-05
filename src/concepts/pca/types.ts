export interface PcaDataset {
  name: string;
  description: string;
  variableNames: string[];
  data: number[][];
}

export interface PcaResult {
  means: number[];
  stdDevs: number[];
  centeredData: number[][];
  normalizedData: number[][];
  correlationMatrix: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  projectedData: number[][];
  varianceExplained: number[];
  cumulativeVariance: number[];
}
