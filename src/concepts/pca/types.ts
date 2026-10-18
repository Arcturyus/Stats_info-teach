export interface PcaDataset {
  id: 'inca3' | 'pisa2022';
  name: string;
  variableNames: string[];
  source: { label: string; url: string };
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
