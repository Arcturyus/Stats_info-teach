import { axisClass, axisTex, quantityClass } from '../quantityColors';
import ComponentDetails from '../ComponentDetails';
import PointDetails from '../PointDetails';
import { BlockMath } from '../../../components/Math/KatexRenderer';
import ScatterPlot2D, { type Arrow } from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D, { type Arrow3D } from '../../../components/Charts/ScatterPlot3D';
import BarChart from '../../../components/Charts/BarChart';
import VectorDisplay from '../../../components/Math/VectorDisplay';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

interface Props {
  rawData: number[][];
  variableNames: string[];
  result: PcaResult;
}

const ARROW_COLORS = ['#b63227', '#805e00', '#006b80', '#f59e0b'];

export default function StepEigen({ rawData, variableNames, result }: Props) {
  const is2D = variableNames.length === 2;
  const is3D = variableNames.length >= 3;
  const componentLabels = result.eigenvalues.map((_, i) => `CP${i + 1}`);
  const roundedEigenvalues = result.eigenvalues.map((value, i) => axisTex(i, value.toFixed(3)));

  // Build arrows for eigenvectors (scaled by sqrt(eigenvalue) for visibility)
  const arrows2D: Arrow[] = is2D
    ? result.eigenvectors.map((vec, i) => {
        const scale = Math.sqrt(Math.max(0, result.eigenvalues[i])) * 1.5;
        return {
          dx: vec[0] * scale,
          dy: vec[1] * scale,
          label: `CP${i + 1}`,
          tooltip: <ComponentDetails index={i} names={variableNames} vector={vec} eigenvalue={result.eigenvalues[i]} variance={result.varianceExplained[i]} cumulative={result.cumulativeVariance[i]} arrow />,
          color: ARROW_COLORS[i],
        };
      })
    : [];

  const arrows3D: Arrow3D[] = is3D
    ? result.eigenvectors.map((vec, i) => {
        const scale = Math.sqrt(Math.max(0, result.eigenvalues[i])) * 1.5;
        return {
          dx: vec[0] * scale,
          dy: vec[1] * scale,
          dz: vec[2] * scale,
          label: `CP${i + 1}`,
          tooltip: <ComponentDetails index={i} names={variableNames} vector={vec} eigenvalue={result.eigenvalues[i]} variance={result.varianceExplained[i]} cumulative={result.cumulativeVariance[i]} arrow />,
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

      <p className={styles.description}>
        La part de variance d’un axe est sa valeur propre divisée par la somme des valeurs propres.
        On multiplie par 100 pour obtenir un pourcentage.
      </p>
      <div className={styles.calculationFormula}>
        <BlockMath math="\mathrm{Part}_i=\frac{\lambda_i}{\lambda_1+\cdots+\lambda_p}\times 100\%" />
      </div>

      <div className={styles.eigenGrid}>
        {result.eigenvectors.map((vec, i) => (
          <div key={i} className={styles.eigenCard} title={`CP${i + 1} : combinaison des variables réduites. Coefficients : ${vec.map((v, j) => `${variableNames[j]} : ${v.toFixed(4)}`).join('; ')}. Cumul : ${(result.cumulativeVariance[i] * 100).toFixed(2)} %. Le signe global peut être inversé.`}>
            <h4><span className={axisClass(i)}>
              Composante {i + 1} — {'\u03BB'}{i + 1} = {result.eigenvalues[i].toFixed(3)}
              {' '}({(result.varianceExplained[i] * 100).toFixed(1)}%)
            </span></h4>
            <div className={styles.calculationFormula}>
              <BlockMath colorClasses math={`\\frac{${roundedEigenvalues[i]}}{${roundedEigenvalues.join(' + ')}}\\times 100\\approx ${axisTex(i, `${(result.varianceExplained[i] * 100).toFixed(1)}\\%`)}`} />
            </div>
            <VectorDisplay vector={vec} entryClasses={variableNames.map((_, j) => quantityClass(j, 'coefficient'))} label={`v_{${i + 1}}`} precision={3} />
          </div>
        ))}
      </div>

      <p className={styles.note}>Valeurs affichées arrondies ; pourcentages calculés avec les valeurs propres non arrondies.</p>

      <div className={styles.splitView}>
        <div className={styles.chartSection}>
          <h3>Eboulis des valeurs propres (Scree plot)</h3>
          <BarChart
            values={result.varianceExplained}
            barTooltip={(i) => <ComponentDetails index={i} names={variableNames} vector={result.eigenvectors[i]} eigenvalue={result.eigenvalues[i]} variance={result.varianceExplained[i]} cumulative={result.cumulativeVariance[i]} />}
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
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
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
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
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
