import { useState } from 'react';
import { MAX_SAMPLE_SIZE } from './sampleSurvey';
import styles from './SamplingControls.module.css';

interface Props {
  sampleSize: number;
  loading: boolean;
  onDrawSample: (size: number) => void;
}

export default function SamplingControls({ sampleSize, loading, onDrawSample }: Props) {
  const [draftSize, setDraftSize] = useState(String(sampleSize));
  const requestedSize = Number(draftSize);
  const validSize = Number.isInteger(requestedSize) && requestedSize >= 2 && requestedSize <= MAX_SAMPLE_SIZE;

  return (
    <form className={styles.controls} aria-label="Tirer un nouvel échantillon" onSubmit={(event) => {
      event.preventDefault();
      if (validSize && !loading) onDrawSample(requestedSize);
    }}>
      <label htmlFor="pca-sample-size">n =</label>
      <input id="pca-sample-size" type="number" min={2} max={MAX_SAMPLE_SIZE} step={1} required
        aria-label="Nombre de personnes à tirer" aria-describedby="pca-sample-range"
        value={draftSize} onChange={(event) => setDraftSize(event.target.value)} disabled={loading} />
      <button type="submit" disabled={loading}>
        {loading ? 'Tirage en cours…' : `Piocher ${validSize ? requestedSize : '…'} personnes au hasard`}
      </button>
      <span id="pca-sample-range" className={styles.range}>2 à {MAX_SAMPLE_SIZE} personnes</span>
    </form>
  );
}
