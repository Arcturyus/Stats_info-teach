import { useCallback, useMemo, useState } from 'react';
import ComponentDetails from '../ComponentDetails';
import { axisClass, quantityClass } from '../quantityColors';
import PointDetails from '../PointDetails';
import { BlockMath } from '../../../components/Math/KatexRenderer';
import ScatterPlot2D, { type Arrow } from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D, { type Arrow3D } from '../../../components/Charts/ScatterPlot3D';
import MatrixDisplay from '../../../components/Math/MatrixDisplay';
import EditableTable from '../../../components/EditableTable/EditableTable';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

const CP_COLORS = ['#b63227', '#805e00', '#006b80'];

interface Props {
  rawData: number[][];
  variableNames: string[];
  result: PcaResult;
}

export default function StepProjection({ rawData, variableNames, result }: Props) {
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [labelsOverride, setLabelsOverride] = useState<boolean | null>(null);
  const showLabels = labelsOverride ?? rawData.length <= 20;
  const pointLabels = useMemo(() => rawData.map((_, i) => String(i + 1)), [rawData]);
  const pointTooltip = useCallback((index: number) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="projection" />, [variableNames, rawData, result]);
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
  const points2D = useMemo(() => result.projectedData.map((p) => [p[0], p[1]]), [result]);
  // A shared scale and equal units in both directions preserve the geometry of the rotation.
  const extent = Math.max(1, ...result.normalizedData.flat().map(Math.abs), ...result.projectedData.flat().map(Math.abs)) * 1.2;
  const beforeAxes: Arrow[] = useMemo(() => result.eigenvectors.slice(0, 2).map((vec, i) => ({
    dx: vec[0] * extent * .85, dy: vec[1] * extent * .85,
    label: `CP${i + 1}`,
    color: CP_COLORS[i], bidirectional: true,
    tooltip: <ComponentDetails index={i} names={variableNames} vector={vec} eigenvalue={result.eigenvalues[i]} variance={result.varianceExplained[i]} cumulative={result.cumulativeVariance[i]} />,
  })), [result, extent, variableNames]);
  const afterAxes: Arrow[] = useMemo(() => beforeAxes.map((axis, i) => ({ ...axis,
    dx: i === 0 ? extent * .85 : 0, dy: i === 1 ? extent * .85 : 0,
  })), [beforeAxes, extent]);

  const beforeAxes3D: Arrow3D[] = useMemo(() => result.eigenvectors.slice(0, 3).map((vec, i) => ({
    dx: vec[0] * extent * .85, dy: vec[1] * extent * .85, dz: (vec[2] ?? 0) * extent * .85,
    label: `CP${i + 1}`, color: CP_COLORS[i],
    tooltip: <ComponentDetails index={i} names={variableNames} vector={vec} eigenvalue={result.eigenvalues[i]} variance={result.varianceExplained[i]} cumulative={result.cumulativeVariance[i]} />,
  })), [result, extent, variableNames]);

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

      <label className={styles.note}>
        <input type="checkbox" checked={showLabels} onChange={event => setLabelsOverride(event.target.checked)} /> Afficher les numéros des individus (mêmes numéros dans toutes les vues)
      </label>
      <p className={styles.note}>Survolez un point pour retrouver le même individu dans les autres graphiques. Les numéros correspondent aux lignes du tableau.</p>

      <div className={styles.infoBox}>
        <h4>Matrice de projection P</h4>
        <MatrixDisplay matrix={projMatrix} cellClassName={(row) => quantityClass(row, 'coefficient')} label="P" precision={3} />
      </div>

      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <h3>Coordonnees dans le nouvel espace</h3>
          <EditableTable
            headers={cpLabels}
            columnClasses={cpLabels.map((_, k) => axisClass(k))}
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
              pointTooltip={pointTooltip}
              pointLabels={pointLabels}
              showPointLabels={showLabels}
              highlightedIndex={highlightedIndex}
              onPointHover={setHighlightedIndex}
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
          <p className={styles.note}>Avant et après le changement de repère : mêmes individus, même échelle et axes CP colorés.</p>
          <div className={styles.splitView}>
            <div className={styles.chartSection}>
              <h4>Données originales (normalisées)</h4>
              <ScatterPlot3D points={result.normalizedData} pointTooltip={pointTooltip}
                xLabel={`Z(${variableNames[0]})`} yLabel={`Z(${variableNames[1]})`} zLabel={`Z(${variableNames[2]})`}
                arrows={beforeAxes3D} originCenter symmetricExtent={extent}
                pointLabels={pointLabels} showPointLabels={showLabels} highlightedIndex={highlightedIndex} onPointHover={setHighlightedIndex} />
            </div>
            <div className={styles.chartSection}>
              <h4>Après projection (composantes principales)</h4>
              <ScatterPlot3D points={result.projectedData} pointTooltip={pointTooltip}
                xLabel="CP1" yLabel="CP2" zLabel="CP3" axisColors={CP_COLORS} originCenter symmetricExtent={extent}
                pointLabels={pointLabels} showPointLabels={showLabels} highlightedIndex={highlightedIndex} onPointHover={setHighlightedIndex} />
            </div>
          </div>
        </div>
      )}

      {is2D && (
        <div className={styles.comparison}>
          <h3>Comparaison : avant vs après</h3>
          <p className={styles.note}>Les axes colorés montrent CP1 et CP2 avant et après le changement de repère. Même échelle dans les deux vues : distances et angles sont conservés.</p>
          <div className={styles.splitView}>
            <div className={styles.chartSection}>
              <h4>Données originales (normalisées)</h4>
              <ScatterPlot2D
                points={result.normalizedData}
                pointTooltip={pointTooltip}
                pointLabels={pointLabels}
                showPointLabels={showLabels}
                highlightedIndex={highlightedIndex}
                onPointHover={setHighlightedIndex}
                xLabel={`Z(${variableNames[0]})`}
                yLabel={`Z(${variableNames[1]})`}
                arrows={beforeAxes}
                symmetricExtent={extent}
                originCenter
              />
            </div>
            <div className={styles.chartSection}>
              <h4>Après projection (composantes principales)</h4>
              <ScatterPlot2D
                points={points2D}
                pointTooltip={pointTooltip}
                pointLabels={pointLabels}
                showPointLabels={showLabels}
                highlightedIndex={highlightedIndex}
                onPointHover={setHighlightedIndex}
                xLabel="CP1"
                yLabel="CP2"
                originCenter
                arrows={afterAxes}
                symmetricExtent={extent}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
