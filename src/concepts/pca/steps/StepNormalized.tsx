import { quantityClass } from '../quantityColors';
import PointDetails from '../PointDetails';
import { BlockMath } from '../../../components/Math/KatexRenderer';
import EditableTable from '../../../components/EditableTable/EditableTable';
import ScatterPlot2D from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D from '../../../components/Charts/ScatterPlot3D';
import VectorDisplay from '../../../components/Math/VectorDisplay';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

interface Props {
  rawData: number[][];
  variableNames: string[];
  result: PcaResult;
}

export default function StepNormalized({ rawData, variableNames, result }: Props) {
  const is2D = variableNames.length === 2;
  const is3D = variableNames.length >= 3;

  return (
    <div className={styles.step}>
      <h2>Etape 3 : Normalisation (Standardisation)</h2>
      <p className={styles.description}>
        On divise chaque variable centree par son ecart-type. Cela rend les variables comparables
        en les ramenant toutes a une variance de 1. L'ACP normee travaille sur la matrice de correlation.
      </p>

      <div className={styles.formula}>
        <BlockMath math="Z_{ij} = \frac{\tilde{X}_{ij}}{\sigma_j}" />
      </div>

      <div className={styles.infoBox}>
        <h4>Vecteur des ecarts-types</h4>
        <VectorDisplay vector={result.stdDevs} entryClasses={variableNames.map((_, j) => quantityClass(j, 'std'))} label="\sigma" horizontal />
      </div>

      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <h3>Matrice normalisee Z</h3>
          <EditableTable
            headers={variableNames}
            columnClasses={variableNames.map((_, j) => quantityClass(j, 'z'))}
            data={result.normalizedData}
            onChange={() => {}}
            readOnly
            precision={3}
          />
        </div>

        {is2D && (
          <div className={styles.chartSection}>
            <h3>Donnees normalisees</h3>
            <ScatterPlot2D
              points={result.normalizedData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="normalized" />}
              xLabel={`${variableNames[0]} (normalisee)`}
              yLabel={`${variableNames[1]} (normalisee)`}
              originCenter
            />
          </div>
        )}

        {is3D && (
          <div className={styles.chartSection}>
            <h3>Donnees normalisees (3D)</h3>
            <ScatterPlot3D
              points={result.normalizedData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="normalized" />}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
              zLabel={variableNames[2]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
