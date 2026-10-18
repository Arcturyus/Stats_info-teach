import { BlockMath, InlineMath } from '../../../components/Math/KatexRenderer';
import MatrixDisplay from '../../../components/Math/MatrixDisplay';
import VectorDisplay from '../../../components/Math/VectorDisplay';
import { buildCorrelationCalculation } from '../correlationCalculation';
import type { PcaResult } from '../types';
import styles from './Steps.module.css';

export default function CorrelationCalculation({ result, variableNames }: { result: PcaResult; variableNames: string[] }) {
  const calculation = buildCorrelationCalculation(result);
  return (
    <div className={styles.correlationCalculation}>
      <p>À partir des valeurs centrées <InlineMath math="\\tilde{X}" />, on réduit chaque colonne : <InlineMath math="Z_{ij}=\\frac{\\tilde{X}_{ij}}{\\sigma_j}" />.</p>
      <p className={styles.note}>Ordre des variables : {variableNames.join(' · ')}. Ici, n = {calculation.n} et p = {calculation.p}.</p>
      <VectorDisplay vector={result.stdDevs} label="\\sigma" horizontal precision={3} />

      <h4>1. Écrire Zᵀ et Z</h4>
      <div className={styles.calculationFormula}><BlockMath math={calculation.symbolicTranspose} /></div>
      <div className={styles.calculationFormula}><BlockMath math={calculation.symbolicZ} /></div>
      <p className={styles.note}>Zᵀ : {calculation.p} × {calculation.n} · Z : {calculation.n} × {calculation.p}.</p>
      {calculation.condensed && <p className={styles.note}>Les deux premières personnes et la dernière sont affichées. Toutes les {calculation.n} personnes sont utilisées dans le calcul.</p>}
      <details>
        <summary>Substitution numérique dans Zᵀ et Z</summary>
        <div className={styles.calculationFormula}><BlockMath math={calculation.numericTranspose} /></div>
        <div className={styles.calculationFormula}><BlockMath math={calculation.numericZ} /></div>
      </details>

      <h4>2. Multiplier Zᵀ par Z</h4>
      <MatrixDisplay matrix={calculation.gram} label="Z^{\\mathsf T}Z" precision={3} />

      <h4>3. Diviser chaque case par n = {calculation.n}</h4>
      <p>Exemple : corrélation entre {variableNames[0]} et {variableNames[1]}.</p>
      <div className={styles.calculationFormula}><BlockMath math={calculation.pairFormula} /></div>
      <p className={styles.note}>Les valeurs affichées sont arrondies à trois décimales. Le résultat utilise toutes les lignes avec leur précision complète.</p>
      <h4>Résultat : matrice R</h4>
    </div>
  );
}
