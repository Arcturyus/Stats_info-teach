import { BlockMath } from '../../../components/Math/KatexRenderer';
import { buildCorrelationCalculation } from '../correlationCalculation';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

export default function CorrelationCalculation({ result, variableNames }: { result: PcaResult; variableNames: string[] }) {
  const calculation = buildCorrelationCalculation(result);
  return (
    <div className={styles.correlationCalculation}>
      <p className={styles.note}>{variableNames.join(' · ')} · n = {calculation.n}</p>
      <div className={styles.calculationFormula}><BlockMath math={calculation.formula} /></div>
      <p className={styles.note}>{calculation.condensed ? 'Affichage abrégé ; toutes les lignes participent au calcul. ' : ''}Valeurs affichées arrondies.</p>
      <h4>Résultat : matrice R</h4>
    </div>
  );
}
