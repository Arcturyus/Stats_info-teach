import type { PcaDataset } from './types';

interface SamplingPool {
  count: number;
  columns: number;
  scale: number;
  encoding: string;
  files: string[];
  blockSize?: number;
}

type Manifest = Record<PcaDataset['id'], SamplingPool>;
export interface SurveySample {
  data: number[][];
  populationSize: number;
  plausibleValue: number | null;
}

export const MAX_SAMPLE_SIZE = 100;

const base = `${import.meta.env.BASE_URL}data/pca/samples/`;
let manifestPromise: Promise<Manifest> | undefined;
const pools = new Map<string, Promise<DataView>>();
// One score set per survey for this page visit, shared by every redraw.
const chosenFiles = new Map<PcaDataset['id'], number>();

/** Uniform integer, with rejection to avoid modulo bias. No seeded generator. */
function randomIndex(bound: number): number {
  if (!Number.isInteger(bound) || bound < 1 || bound > 2 ** 32) throw new Error('Invalid pool size');
  const limit = Math.floor(2 ** 32 / bound) * bound;
  const random = new Uint32Array(1);
  do { crypto.getRandomValues(random); } while (random[0] >= limit);
  return random[0] % bound;
}

async function manifest(): Promise<Manifest> {
  manifestPromise ??= fetch(`${base}manifest.json?format=blocks-v1`)
    .then((response) => {
      if (!response.ok) throw new Error('Survey manifest unavailable');
      return response.json() as Promise<Manifest>;
    })
    .catch((error: unknown) => { manifestPromise = undefined; throw error; });
  return manifestPromise;
}

function poolFile(filename: string, pool: SamplingPool, rowCount: number): Promise<DataView> {
  const cached = pools.get(filename);
  if (cached) return cached;
  const promise = fetch(`${base}${filename}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('Survey pool unavailable');
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== rowCount * pool.columns * 4) throw new Error('Invalid survey pool');
      return new DataView(buffer);
    })
    .catch((error: unknown) => { pools.delete(filename); throw error; });
  pools.set(filename, promise);
  return promise;
}

export async function sampleSurvey(id: PcaDataset['id'], size = 10): Promise<SurveySample> {
  if (!Number.isInteger(size) || size < 2 || size > MAX_SAMPLE_SIZE) throw new Error('Invalid sample size');
  const pool = (await manifest())[id];
  if (pool.encoding !== 'int32-le' || pool.count < size || pool.scale <= 0 || !pool.files.length) {
    throw new Error('Invalid sampling metadata');
  }
  let fileIndex = chosenFiles.get(id);
  if (fileIndex === undefined) {
    fileIndex = randomIndex(pool.files.length);
    chosenFiles.set(id, fileIndex);
  }
  // Uniform among respondents, without replacement within this draw. Identical
  // measurements do not identify a respondent and are never deduplicated.
  const rows = new Set<number>();
  while (rows.size < size) rows.add(randomIndex(pool.count));
  // Choose people globally BEFORE loading blocks. Choosing one block and then
  // all people within it would couple the draw to the file's country ordering.
  const blockSize = pool.blockSize ?? pool.count;
  if (!Number.isInteger(blockSize) || blockSize < 1) throw new Error('Invalid block size');
  const blockIds = [...new Set([...rows].map((row) => Math.floor(row / blockSize)))];
  const blocks = new Map(await Promise.all(blockIds.map(async (block) => {
    const filename = pool.blockSize
      ? `${pool.files[fileIndex]}/${String(block).padStart(4, '0')}.i32`
      : pool.files[fileIndex];
    const rowCount = Math.min(blockSize, pool.count - block * blockSize);
    return [block, await poolFile(filename, pool, rowCount)] as const;
  })));
  const data = [...rows].map((row) => {
    const values = blocks.get(Math.floor(row / blockSize))!;
    return Array.from({ length: pool.columns }, (_, col) =>
      values.getInt32(((row % blockSize) * pool.columns + col) * 4, true) / pool.scale);
  });
  return { data, populationSize: pool.count, plausibleValue: id === 'pisa2022' ? fileIndex + 1 : null };
}
