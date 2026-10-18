import type { PcaDataset } from './types';

interface SamplingPool {
  count: number;
  columns: number;
  scale: number;
  encoding: string;
  files: string[];
}

type Manifest = Record<PcaDataset['id'], SamplingPool>;
export interface SurveySample {
  data: number[][];
  populationSize: number;
  plausibleValue: number | null;
}

const base = `${import.meta.env.BASE_URL}data/pca/samples/`;
let manifestPromise: Promise<Manifest> | undefined;
const pools = new Map<string, Promise<DataView>>();

/** Uniform integer, with rejection to avoid modulo bias. No seeded generator. */
function randomIndex(bound: number): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > 2 ** 32) throw new Error('Invalid pool size');
  const limit = Math.floor(2 ** 32 / bound) * bound;
  const random = new Uint32Array(1);
  do { crypto.getRandomValues(random); } while (random[0] >= limit);
  return random[0] % bound;
}

async function manifest(): Promise<Manifest> {
  manifestPromise ??= fetch(`${base}manifest.json`)
    .then((response) => {
      if (!response.ok) throw new Error('Survey manifest unavailable');
      return response.json() as Promise<Manifest>;
    })
    .catch((error: unknown) => { manifestPromise = undefined; throw error; });
  return manifestPromise;
}

function poolFile(filename: string, pool: SamplingPool): Promise<DataView> {
  const cached = pools.get(filename);
  if (cached) return cached;
  const promise = fetch(`${base}${filename}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('Survey pool unavailable');
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== pool.count * pool.columns * 4) throw new Error('Invalid survey pool');
      return new DataView(buffer);
    })
    .catch((error: unknown) => { pools.delete(filename); throw error; });
  pools.set(filename, promise);
  // At most three score files in memory, even after many PISA redraws.
  if (pools.size > 3) pools.delete(pools.keys().next().value!);
  return promise;
}

export async function sampleSurvey(id: PcaDataset['id']): Promise<SurveySample> {
  const pool = (await manifest())[id];
  if (pool.encoding !== 'int32-le' || pool.count < 10 || pool.scale <= 0 || !pool.files.length) {
    throw new Error('Invalid sampling metadata');
  }
  const fileIndex = randomIndex(pool.files.length);
  const values = await poolFile(pool.files[fileIndex], pool);
  // Uniform among respondents, without replacement within this draw. Identical
  // measurements do not identify a respondent and are never deduplicated.
  const rows = new Set<number>();
  while (rows.size < 10) rows.add(randomIndex(pool.count));
  const data = [...rows].map((row) => Array.from({ length: pool.columns }, (_, col) =>
    values.getInt32((row * pool.columns + col) * 4, true) / pool.scale));
  return { data, populationSize: pool.count, plausibleValue: id === 'pisa2022' ? fileIndex + 1 : null };
}
