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

export default function StepCentered({ rawData, variableNames, result }: Props) {
  const is2D = variableNames.length === 2;
  const is3D = variableNames.length >= 3;

  return (
    <div className={styles.step}>
      <h2>Etape 2 : Centrage des donnees</h2>
      <p className={styles.description}>
        On centre les donnees en soustrayant la moyenne de chaque variable.
        Cela place le nuage de points autour de l'origine.
      </p>

      <div className={styles.formula}>
        <BlockMath math="\tilde{X}_{ij} = X_{ij} - \bar{X}_j" />
      </div>

      <div className={styles.infoBox}>
        <h4>Vecteur des moyennes</h4>
        <VectorDisplay vector={result.means} entryClasses={variableNames.map((_, j) => quantityClass(j, 'mean'))} label="\bar{X}" horizontal />
      </div>

      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <h3>Matrice centree</h3>
          <EditableTable
            headers={variableNames}
            columnClasses={variableNames.map((_, j) => quantityClass(j, 'centered'))}
            data={result.centeredData}
            onChange={() => {}}
            readOnly
            precision={3}
          />
        </div>

        {is2D && (
          <div className={styles.chartSection}>
            <h3>Donnees centrees</h3>
            <ScatterPlot2D
              points={result.centeredData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="centered" />}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
              originCenter
            />
          </div>
        )}

        {is3D && (
          <div className={styles.chartSection}>
            <h3>Donnees centrees (3D)</h3>
            <ScatterPlot3D
              points={result.centeredData}
              pointTooltip={(index) => <PointDetails index={index} names={variableNames} raw={rawData[index]} result={result} stage="centered" />}
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
