import { BlockMath } from 'react-katex';
import MatrixDisplay from '../../../components/Math/MatrixDisplay';
import Heatmap from '../../../components/Charts/Heatmap';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

interface Props {
  variableNames: string[];
  result: PcaResult;
}

export default function StepCorrelation({ variableNames, result }: Props) {
  return (
    <div className={styles.step}>
      <h2>Etape 4 : Matrice de correlation</h2>
      <p className={styles.description}>
        La matrice de correlation R mesure les liens lineaires entre chaque paire de variables.
        Les valeurs vont de -1 (anti-correlation parfaite) a +1 (correlation parfaite).
        La diagonale vaut toujours 1.
      </p>

      <div className={styles.formula}>
        <BlockMath math="R = \frac{1}{n} Z^T Z" />
      </div>

      <div className={styles.splitView}>
        <div className={styles.tableSection}>
          <h3>Matrice R</h3>
          <MatrixDisplay matrix={result.correlationMatrix} label="R" precision={3} />
        </div>

        <div className={styles.chartSection}>
          <h3>Heatmap des correlations</h3>
          <Heatmap
            matrix={result.correlationMatrix}
            labels={variableNames}
          />
        </div>
      </div>
    </div>
  );
}
