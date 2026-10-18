import { useState, useMemo, useEffect } from 'react';
import type { PcaResult } from './types';
import { MAX_SAMPLE_SIZE, sampleSurvey, type SurveySample } from './sampleSurvey';
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
  const [request, setRequest] = useState({ datasetIndex: 0, version: 0, sampleSize: 10 });
  const [outcome, setOutcome] = useState<{
    request: typeof request;
    sample?: SurveySample;
    error?: string;
    edited: boolean;
  } | null>(null);
  const [step, setStep] = useState(0);
  const datasetIndex = request.datasetIndex;
  const variableNames = DATASETS[datasetIndex].variableNames;
  const current = outcome?.request === request ? outcome : null;
  const rawData = useMemo(() => current?.sample?.data ?? [], [current]);
  const loading = !current;

  useEffect(() => {
    let cancelled = false;
    sampleSurvey(DATASETS[request.datasetIndex].id, request.sampleSize).then(
      (sample) => { if (!cancelled) setOutcome({ request, sample, edited: false }); },
      () => { if (!cancelled) setOutcome({ request, error: 'Le tirage n’a pas pu être chargé. Réessayez.', edited: false }); },
    );
    return () => { cancelled = true; };
  }, [request]);

  const setRawData = (data: number[][]) => setOutcome((previous) =>
    previous?.request === request && previous.sample
      ? { ...previous, sample: { ...previous.sample, data }, edited: true } : previous);

  const drawSample = (size = request.sampleSize) => {
    if (!Number.isInteger(size) || size < 2 || size > MAX_SAMPLE_SIZE) return;
    setRequest((previous) => ({ ...previous, sampleSize: size, version: previous.version + 1 }));
  };

  const selectDataset = (index: number) => {
    if (!DATASETS[index]) return;
    setRequest((previous) => ({ ...previous, datasetIndex: index, version: previous.version + 1 }));
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
    setStep,
    selectDataset,
    drawSample,
    sampleSize: request.sampleSize,
    loading,
    sampleError: current?.error,
    sampleInfo: current?.sample,
    edited: current?.edited ?? false,
  };
}
