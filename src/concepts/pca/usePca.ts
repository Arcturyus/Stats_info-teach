import { useState, useMemo } from 'react';
import type { PcaDataset, PcaResult } from './types';
import {
  computeMeans,
  centerData,
  computeStdDevs,
  normalizeData,
  computeCorrelationMatrix,
  computeEigen,
  projectData,
  computeVarianceExplained,
  computeCumulativeVariance,
} from './pcaMath';
import { DATASETS } from './constants';

export function usePca() {
  const [datasetIndex, setDatasetIndex] = useState(0);
  const [rawData, setRawData] = useState<number[][]>(DATASETS[0].data);
  const [variableNames, setVariableNames] = useState<string[]>(DATASETS[0].variableNames);
  const [step, setStep] = useState(0);

  const selectDataset = (index: number) => {
    const ds: PcaDataset = DATASETS[index];
    setDatasetIndex(index);
    setRawData(ds.data.map((row) => [...row]));
    setVariableNames([...ds.variableNames]);
    setStep(0);
  };

  const result: PcaResult | null = useMemo(() => {
    try {
      if (rawData.length < 2 || rawData[0].length < 2) return null;

      const means = computeMeans(rawData);
      const centered = centerData(rawData, means);
      const stdDevs = computeStdDevs(centered);
      const normalized = normalizeData(centered, stdDevs);
      const corrMatrix = computeCorrelationMatrix(normalized);
      const { values: eigenvalues, vectors: eigenvectors } = computeEigen(corrMatrix);
      const k = Math.min(3, eigenvalues.length);
      const projected = projectData(normalized, eigenvectors, k);
      const varExplained = computeVarianceExplained(eigenvalues);
      const cumVar = computeCumulativeVariance(varExplained);

      return {
        means,
        stdDevs,
        centeredData: centered,
        normalizedData: normalized,
        correlationMatrix: corrMatrix,
        eigenvalues,
        eigenvectors,
        projectedData: projected,
        varianceExplained: varExplained,
        cumulativeVariance: cumVar,
      };
    } catch {
      return null;
    }
  }, [rawData]);

  return {
    datasetIndex,
    rawData,
    variableNames,
    step,
    result,
    setRawData,
    setVariableNames,
    setStep,
    selectDataset,
  };
}
