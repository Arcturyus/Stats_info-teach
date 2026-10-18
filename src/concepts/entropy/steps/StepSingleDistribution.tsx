import { useState, useMemo } from 'react';
import { BlockMath, InlineMath } from 'react-katex';
import Slider from '../../../components/Slider/Slider';
import DistributionChart, { type ChartSeries } from '../../../components/Charts/DistributionChart';
import {
  normalizeWeights,
  entropyDiscrete,
  entropyTerms,
  buildGrid,
  differentialEntropyContinuous,
  continuousDomain,
  evalPdf,
} from '../entropyMath';
import { CONTINUOUS_FAMILIES, DISCRETE_CATEGORY_LABELS, DISCRETE_CATEGORY_COLORS } from '../constants';
import type { ContinuousFamily } from '../types';
import TermsTable from './TermsTable';
import TermCurve from './TermCurve';
import styles from './Steps.module.css';

function initParams(): Record<ContinuousFamily, Record<string, number>> {
  const init: Record<string, Record<string, number>> = {};
  CONTINUOUS_FAMILIES.forEach((f) => {
    init[f.id] = Object.fromEntries(f.params.map((p) => [p.key, p.default]));
  });
  return init as Record<ContinuousFamily, Record<string, number>>;
}

export default function StepSingleDistribution() {
  const [kind, setKind] = useState<'discrete' | 'continuous'>('discrete');

  const [k, setK] = useState(4);
  const [weights, setWeights] = useState<number[]>([3, 2, 1, 1, 1, 1]);

  const [family, setFamily] = useState<ContinuousFamily>('normal');
  const [paramsByFamily, setParamsByFamily] = useState(initParams);

  const activeWeights = weights.slice(0, k);
  const probs = useMemo(() => normalizeWeights(activeWeights), [activeWeights]);
  const entropyD = useMemo(() => entropyDiscrete(probs), [probs]);
  const termsD = useMemo(() => entropyTerms(probs), [probs]);
  const maxEntropyD = Math.log2(k);

  const activeFamilyDef = CONTINUOUS_FAMILIES.find((f) => f.id === family)!;
  const activeParams = paramsByFamily[family];

  const { xs, values: pdfValues, dx } = useMemo(() => {
    const domain = continuousDomain(family, activeParams);
    const grid = buildGrid(domain);
    const values = grid.xs.map((x) => evalPdf(family, activeParams, x));
    return { xs: grid.xs, values, dx: grid.dx };
  }, [family, activeParams]);

  const entropyC = useMemo(() => differentialEntropyContinuous(pdfValues, dx), [pdfValues, dx]);

  const updateParam = (key: string, value: number) => {
    setParamsByFamily((prev) => ({ ...prev, [family]: { ...prev[family], [key]: value } }));
  };

  const updateWeight = (i: number, value: number) => {
    setWeights((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  };

  const applyPreset = (preset: 'uniform' | 'spike' | 'random') => {
    if (preset === 'uniform') setWeights(Array(6).fill(1));
    else if (preset === 'spike') setWeights(Array.from({ length: 6 }, (_, i) => (i === 0 ? 20 : 0.3)));
    else setWeights(Array.from({ length: 6 }, () => Math.random() * 5 + 0.2));
  };

  const discreteSeries: ChartSeries[] = [
    {
      kind: 'discrete',
      name: 'P',
      color: 'var(--color-primary)',
      labels: DISCRETE_CATEGORY_LABELS.slice(0, k),
      values: probs,
    },
  ];

  const continuousSeries: ChartSeries[] = [
    { kind: 'continuous', name: 'f', color: 'var(--color-primary)', xs, values: pdfValues },
  ];

  return (
    <div className={styles.step}>
      <h2>Etape 1 : une distribution, son entropie</h2>
      <p className={styles.description}>
        L'entropie mesure l'incertitude moyenne portee par une variable aleatoire, ou la quantite d'information
        necessaire en moyenne pour decrire un tirage. Une distribution tres piquee (peu d'incertitude) a une entropie
        faible ; une distribution etalee ou uniforme (beaucoup d'incertitude) a une entropie elevee. Choisissez une
        variable discrete ou continue et faites varier ses parametres pour observer l'effet sur l'entropie.
      </p>

      <div className={styles.infoBox}>
        <h4>Ce que signifie "mesurer en bits"</h4>
        <p>
          Un bit correspond a l'information necessaire pour distinguer deux issues equiprobables (par exemple pile ou
          face). Pour un evenement de probabilite p<sub>i</sub>, la quantite -log&#8322;(p<sub>i</sub>) est le nombre
          de bits necessaires pour le coder de facon optimale : plus un evenement est rare (p<sub>i</sub> petit), plus
          il est "surprenant" quand il se produit, et plus son codage coute de bits. L'entropie H(P) est la moyenne
          de ces couts ponderee par leur probabilite : c'est le nombre moyen de bits necessaires pour decrire un
          tirage de P avec le code le plus efficace possible.
        </p>
        <p>
          Exemples simples : pour une piece equilibree (2 issues, p = 0,5 chacune), H = log&#8322;(2) = 1 bit — une
          seule question oui/non bien posee ("pile ?") suffit toujours a connaitre le resultat. Pour un de a 8 faces
          uniforme, H = log&#8322;(8) = 3 bits — il faut en moyenne 3 questions oui/non (par dichotomie) pour
          identifier la face tiree. A l'inverse, si une categorie a une probabilite proche de 1 (evenement quasi
          certain), son terme -p log&#8322;(p) tend vers 0 : un evenement tres attendu n'apporte presque aucune
          information quand il se realise.
        </p>
      </div>

      <div className={styles.kindToggle}>
        <button
          className={kind === 'discrete' ? styles.kindActive : styles.kindBtn}
          onClick={() => setKind('discrete')}
        >
          Variable discrete
        </button>
        <button
          className={kind === 'continuous' ? styles.kindActive : styles.kindBtn}
          onClick={() => setKind('continuous')}
        >
          Variable continue
        </button>
      </div>

      {kind === 'discrete' ? (
        <>
          <div className={styles.formula}>
            <BlockMath math="H(P) = -\sum_{i=1}^{k} p_i \log_2 p_i \quad \text{(en bits)}" />
          </div>

          <div className={styles.splitView}>
            <div className={styles.flowColumn}>
              <div className={styles.controlsRow}>
                <label className={styles.kSelector}>
                  Nombre de categories k :
                  <select value={k} onChange={(e) => setK(Number(e.target.value))}>
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={styles.presetButtons}>
                  <button onClick={() => applyPreset('uniform')}>Uniforme</button>
                  <button onClick={() => applyPreset('spike')}>Piquee</button>
                  <button onClick={() => applyPreset('random')}>Aleatoire</button>
                </div>
              </div>

              <div className={styles.sliderGrid}>
                {DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => (
                  <Slider
                    key={label}
                    label={`Poids categorie ${label}`}
                    value={weights[i]}
                    min={0}
                    max={20}
                    step={0.1}
                    onChange={(v) => updateWeight(i, v)}
                    color={DISCRETE_CATEGORY_COLORS[i]}
                    format={(v) => v.toFixed(1)}
                  />
                ))}
              </div>

              <div className={styles.chartColumn}>
                <DistributionChart series={discreteSeries} yLabel="Probabilite" xLabel="Categorie" />
              </div>

              <div className={styles.resultCard}>
                <span className={styles.resultLabel}>Entropie H(P)</span>
                <span className={styles.resultValue}>{entropyD.toFixed(3)} bits</span>
                <span className={styles.resultNote}>
                  0 &#8804; H(P) &#8804; log&#8322;(k) = {maxEntropyD.toFixed(3)} bits — le maximum est atteint pour la
                  loi uniforme.
                </span>
              </div>
            </div>

            <div className={styles.flowColumn}>
              <h3 className={styles.detailTitle}>Detail du calcul : chaque terme de la somme</h3>
              <TermsTable
                headers={['Categorie', 'Poids', 'p_i', 'log2(p_i)', '-p_i . log2(p_i)']}
                rows={DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => [
                  label,
                  weights[i].toFixed(1),
                  probs[i].toFixed(3),
                  probs[i] > 1e-9 ? Math.log2(probs[i]).toFixed(3) : '—',
                  termsD[i].toFixed(3),
                ])}
                totalsRow={['Somme = H(P)', '', '', '', entropyD.toFixed(3)]}
              />

              <h3 className={styles.detailTitle}>La courbe -p . log2(p)</h3>
              <p className={styles.description}>
                Chaque terme est un point sur cette courbe : elle vaut 0 aux deux extremes (evenement impossible ou
                certain, p = 0 ou p = 1) et atteint son maximum (&#8776; 0,531 bit) en p = 1/e &#8776; 0,368 — pas en
                p = 0,5. Attention : cela ne veut pas dire que H(P) est maximale quand chaque p_i vaut 1/e — comme les
                p_i doivent sommer a 1, la somme de ces termes est en fait maximale quand tous les p_i sont egaux
                (loi uniforme), meme si ce n'est pas le sommet de la courbe individuelle.
              </p>
              <div className={styles.chartColumn}>
                <TermCurve
                  title={`H(P) = ${entropyD.toFixed(3)} bits`}
                  markers={DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => ({
                    x: probs[i],
                    label,
                    color: DISCRETE_CATEGORY_COLORS[i],
                  }))}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.formula}>
            <BlockMath math="h(f) = -\int_{-\infty}^{+\infty} f(x) \log_2 f(x)\, dx \quad \text{(entropie differentielle, en bits)}" />
          </div>

          <div className={styles.splitView}>
            <div>
              <div className={styles.controlsRow}>
                <label className={styles.kSelector}>
                  Famille :
                  <select value={family} onChange={(e) => setFamily(e.target.value as ContinuousFamily)}>
                    {CONTINUOUS_FAMILIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.formulaSmall}>
                <InlineMath math={activeFamilyDef.formula} />
              </div>

              <div className={styles.sliderGrid}>
                {activeFamilyDef.params.map((p) => (
                  <Slider
                    key={p.key}
                    label={p.label}
                    value={activeParams[p.key]}
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    onChange={(v) => updateParam(p.key, v)}
                  />
                ))}
              </div>
            </div>

            <div className={styles.chartColumn}>
              <DistributionChart series={continuousSeries} yLabel="Densite f(x)" xLabel="x" />
            </div>
          </div>

          <div className={styles.resultCard}>
            <span className={styles.resultLabel}>Entropie differentielle h(f)</span>
            <span className={styles.resultValue}>{entropyC.toFixed(3)} bits</span>
            <span className={styles.resultNote}>
              Contrairement au cas discret, h(f) peut etre negative (ex : distribution tres concentree, faible
              variance) — ce n'est pas une quantite d'information absolue, mais une mesure relative a l'echelle de x.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
