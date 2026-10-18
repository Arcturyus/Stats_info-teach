import { BlockMath } from '../../../components/Math/KatexRenderer';
import EditableTable from '../../../components/EditableTable/EditableTable';
import ScatterPlot2D from '../../../components/Charts/ScatterPlot2D';
import ScatterPlot3D from '../../../components/Charts/ScatterPlot3D';
import SamplingControls from '../SamplingControls';
import styles from './Steps.module.css';

interface Props {
  rawData: number[][];
  variableNames: string[];
  onDataChange: (data: number[][]) => void;
  onDrawSample: (size: number) => void;
  sampleSize: number;
  loading: boolean;
  error?: string;
}

export default function StepRawData({ rawData, variableNames, onDataChange, onDrawSample, sampleSize, loading, error }: Props) {
  const is2D = variableNames.length === 2;
  const is3D = variableNames.length >= 3;

  return (
    <div className={styles.step}>
      <h2>Etape 1 : Donnees brutes</h2>
      <p className={styles.description}>
        Voici le jeu de donnees initial. Vous pouvez modifier les valeurs, ajouter ou supprimer des observations.
        L'ACP va chercher les directions de variance maximale dans ces donnees.
      </p>

      {!loading && !error && <div className={styles.formula}>
        <BlockMath math={`X \\in \\mathbb{R}^{${rawData.length} \\times ${variableNames.length}}`} />
      </div>}

      <div className={styles.dataHeader}>
        <h3>Matrice des donnees X</h3>
        <SamplingControls sampleSize={sampleSize} loading={loading} onDrawSample={onDrawSample} />
      </div>

      {loading && <p role="status">Chargement du tirage…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error &&
      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <EditableTable
            headers={variableNames}
            data={rawData}
            onChange={onDataChange}
          />
        </div>

        {is2D && (
          <div className={styles.chartSection}>
            <h3>Nuage de points</h3>
            <ScatterPlot2D
              points={rawData}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
            />
          </div>
        )}

        {is3D && (
          <div className={styles.chartSection}>
            <h3>Nuage de points 3D</h3>
            <ScatterPlot3D
              points={rawData}
              xLabel={variableNames[0]}
              yLabel={variableNames[1]}
              zLabel={variableNames[2]}
            />
          </div>
        )}
      </div>
      }
    </div>
  );
}
