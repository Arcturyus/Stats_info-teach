import PointDetails from '../PointDetails';
import { BlockMath } from '../../../components/Math/KatexRenderer';
import ScatterPlot2D from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D from '../../../components/Charts/ScatterPlot3D';
import MatrixDisplay from '../../../components/Math/MatrixDisplay';
import EditableTable from '../../../components/EditableTable/EditableTable';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

interface Props {
  rawData: number[][];
  variableNames: string[];
  result: PcaResult;
}

export default function StepProjection({ rawData, variableNames, result }: Props) {
  const is2D = variableNames.length === 2;
  const k = result.projectedData[0]?.length ?? 0;

  // Build projection matrix (p x k)
  const projMatrix: number[][] = [];
  const p = variableNames.length;
  for (let i = 0; i < p; i++) {
    const row: number[] = [];
    for (let j = 0; j < k; j++) {
      row.push(result.eigenvectors[j][i]);
    }
    projMatrix.push(row);
  }

  const cpLabels = Array.from({ length: k }, (_, i) => `CP${i + 1}`);
  const points2D = result.projectedData.map((p) => [p[0], p[1]]);

  return (
    <div className={styles.step}>
      <h2>Etape 6 : Projection sur les composantes principales</h2>
      <p className={styles.description}>
        On projette les donnees normalisees sur les {k} premieres composantes principales.
        Le nouvel espace maximise la variance expliquee tout en reduisant la dimensionnalite.
        {result.cumulativeVariance[k - 1] !== undefined &&
          ` Les ${k} premières composantes capturent ${(result.cumulativeVariance[k - 1] * 100).toFixed(1)}% de la variance totale.`}
      </p>

      <div className={styles.formula}>
        <BlockMath math="Y = Z \cdot P" />
      </div>

      <div className={styles.infoBox}>
        <h4>Matrice de projection P</h4>
        <MatrixDisplay matrix={projMatrix} label="P" precision={3} />
      </div>

      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <h3>Coordonnees dans le nouvel espace</h3>
          <EditableTable
            headers={cpLabels}
            data={result.projectedData}
            onChange={() => {}}
            readOnly
            precision={3}
          />
        </div>

        <div className={styles.chartSection}>
          <h3>Donnees projetees (CP1 vs CP2)</h3>
          {k >= 2 ? (
            <ScatterPlot2D
              points={points2D}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
              xLabel="CP1"
              yLabel="CP2"
              originCenter
            />
          ) : (
            <p className={styles.note}>
              Projection sur 1 seule composante (pas de graphique 2D).
            </p>
          )}
        </div>
      </div>

      {k >= 3 && (
        <div className={styles.comparison}>
          <h3>Vue 3D — CP1, CP2, CP3</h3>
          <div className={styles.chartSection}>
            <ScatterPlot3D
              points={result.projectedData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
              xLabel="CP1"
              yLabel="CP2"
              zLabel="CP3"
            />
          </div>
        </div>
      )}

      {is2D && (
        <div className={styles.comparison}>
          <h3>Comparaison : avant vs apres</h3>
          <div className={styles.splitView}>
            <div className={styles.chartSection}>
              <h4>Donnees originales (normalisees)</h4>
              <ScatterPlot2D
                points={result.normalizedData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
                xLabel={variableNames[0]}
                yLabel={variableNames[1]}
                originCenter
              />
            </div>
            <div className={styles.chartSection}>
              <h4>Apres projection (composantes principales)</h4>
              <ScatterPlot2D
                points={points2D}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />}
                xLabel="CP1"
                yLabel="CP2"
                originCenter
                colors={['#10b981']}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
