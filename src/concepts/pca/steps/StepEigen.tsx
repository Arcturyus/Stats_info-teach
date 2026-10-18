import { BlockMath } from '../../../components/Math/KatexRenderer';
import ScatterPlot2D, { type Arrow } from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D, { type Arrow3D } from '../../../components/Charts/ScatterPlot3D';
import BarChart from '../../../components/Charts/BarChart';
import VectorDisplay from '../../../components/Math/VectorDisplay';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

interface Props {
  variableNames: string[];
  result: PcaResult;
}

const ARROW_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

export default function StepEigen({ variableNames, result }: Props) {
  const is2D = variableNames.length === 2;
  const is3D = variableNames.length >= 3;
  const componentLabels = result.eigenvalues.map((_, i) => `CP${i + 1}`);

  // Build arrows for eigenvectors (scaled by sqrt(eigenvalue) for visibility)
  const arrows2D: Arrow[] = is2D
    ? result.eigenvectors.map((vec, i) => {
        const scale = Math.sqrt(result.eigenvalues[i]) * 1.5;
        return {
          dx: vec[0] * scale,
          dy: vec[1] * scale,
          label: `CP${i + 1}`,
          color: ARROW_COLORS[i],
        };
      })
    : [];

  const arrows3D: Arrow3D[] = is3D
    ? result.eigenvectors.map((vec, i) => {
        const scale = Math.sqrt(result.eigenvalues[i]) * 1.5;
        return {
          dx: vec[0] * scale,
          dy: vec[1] * scale,
          dz: vec[2] * scale,
          label: `CP${i + 1}`,
          color: ARROW_COLORS[i % ARROW_COLORS.length],
        };
      })
    : [];

  return (
    <div className={styles.step}>
      <h2>Etape 5 : Valeurs propres et vecteurs propres</h2>
      <p className={styles.description}>
        On diagonalise la matrice de correlation pour trouver les composantes principales.
        Chaque valeur propre represente la quantite de variance capturee par la composante correspondante.
        Les vecteurs propres definissent les directions des nouvelles composantes.
      </p>

      <div className={styles.formula}>
        <BlockMath math="\det(R - \lambda I) = 0" />
      </div>

      <div className={styles.eigenGrid}>
        {result.eigenvectors.map((vec, i) => (
          <div key={i} className={styles.eigenCard}>
            <h4 style={{ color: ARROW_COLORS[i] }}>
              Composante {i + 1} — {'\u03BB'}{i + 1} = {result.eigenvalues[i].toFixed(3)}
              {' '}({(result.varianceExplained[i] * 100).toFixed(1)}%)
            </h4>
            <VectorDisplay vector={vec} label={`v_{${i + 1}}`} precision={3} />
          </div>
        ))}
      </div>

      <div className={styles.splitView}>
        <div className={styles.chartSection}>
          <h3>Eboulis des valeurs propres (Scree plot)</h3>
          <BarChart
            values={result.varianceExplained}
            labels={componentLabels}
            yLabel="% variance"
            showLine={{ data: result.cumulativeVariance, label: 'Cumul' }}
          />
        </div>

        {is2D && (
          <div className={styles.chartSection}>
            <h3>Axes propres sur les donnees normalisees</h3>
            <ScatterPlot2D
              points={result.normalizedData}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
              arrows={arrows2D}
              originCenter
            />
          </div>
        )}

        {is3D && (
          <div className={styles.chartSection}>
            <h3>Axes propres (3D)</h3>
            <ScatterPlot3D
              points={result.normalizedData}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
              zLabel={variableNames[2]}
              arrows={arrows3D}
              originCenter
            />
          </div>
        )}
      </div>
    </div>
  );
}
