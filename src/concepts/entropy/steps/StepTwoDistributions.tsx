import { useState, useMemo } from 'react';
import { BlockMath } from 'react-katex';
import Slider from '../../../components/Slider/Slider';
import DistributionChart, { type ChartSeries } from '../../../components/Charts/DistributionChart';
import {
  normalizeWeights,
  entropyDiscrete,
  crossEntropyDiscrete,
  entropyTerms,
  crossEntropyTerms,
  buildGrid,
  differentialEntropyContinuous,
  crossEntropyContinuous,
  continuousDomain,
  evalPdf,
} from '../entropyMath';
import { CONTINUOUS_FAMILIES, DISCRETE_CATEGORY_LABELS } from '../constants';
import type { ContinuousFamily } from '../types';
import TermsTable from './TermsTable';
import TermCurve from './TermCurve';
import styles from './Steps.module.css';

const COLOR_P = 'var(--color-primary)';
const COLOR_Q = 'var(--color-accent)';

function initParams(): Record<ContinuousFamily, Record<string, number>> {
  const init: Record<string, Record<string, number>> = {};
  CONTINUOUS_FAMILIES.forEach((f) => {
    init[f.id] = Object.fromEntries(f.params.map((p) => [p.key, p.default]));
  });
  return init as Record<ContinuousFamily, Record<string, number>>;
}

export default function StepTwoDistributions() {
  const [kind, setKind] = useState<'discrete' | 'continuous'>('discrete');

  const [k, setK] = useState(4);
  const [weightsP, setWeightsP] = useState<number[]>([4, 2, 1, 1, 1, 1]);
  const [weightsQ, setWeightsQ] = useState<number[]>([1, 1, 1, 1, 1, 1]);

  const [familyP, setFamilyP] = useState<ContinuousFamily>('normal');
  const [familyQ, setFamilyQ] = useState<ContinuousFamily>('normal');
  const [paramsP, setParamsP] = useState(initParams);
  const [paramsQ, setParamsQ] = useState(initParams);

  const probsP = useMemo(() => normalizeWeights(weightsP.slice(0, k)), [weightsP, k]);
  const probsQ = useMemo(() => normalizeWeights(weightsQ.slice(0, k)), [weightsQ, k]);

  const discreteStats = useMemo(() => {
    const Hp = entropyDiscrete(probsP);
    const Hq = entropyDiscrete(probsQ);
    const crossPQ = crossEntropyDiscrete(probsP, probsQ);
    const crossQP = crossEntropyDiscrete(probsQ, probsP);
    return { Hp, Hq, crossPQ, crossQP, klPQ: crossPQ - Hp, klQP: crossQP - Hq };
  }, [probsP, probsQ]);

  const termsHp = useMemo(() => entropyTerms(probsP), [probsP]);
  const termsHq = useMemo(() => entropyTerms(probsQ), [probsQ]);
  const termsCrossPQ = useMemo(() => crossEntropyTerms(probsP, probsQ), [probsP, probsQ]);
  const termsCrossQP = useMemo(() => crossEntropyTerms(probsQ, probsP), [probsP, probsQ]);

  const activeParamsP = paramsP[familyP];
  const activeParamsQ = paramsQ[familyQ];
  const familyDefP = CONTINUOUS_FAMILIES.find((f) => f.id === familyP)!;
  const familyDefQ = CONTINUOUS_FAMILIES.find((f) => f.id === familyQ)!;

  const continuousData = useMemo(() => {
    const domainP = continuousDomain(familyP, activeParamsP);
    const domainQ = continuousDomain(familyQ, activeParamsQ);
    const shared: [number, number] = [Math.min(domainP[0], domainQ[0]), Math.max(domainP[1], domainQ[1])];
    const { xs, dx } = buildGrid(shared, 1000);
    const fVals = xs.map((x) => evalPdf(familyP, activeParamsP, x));
    const gVals = xs.map((x) => evalPdf(familyQ, activeParamsQ, x));
    const Hp = differentialEntropyContinuous(fVals, dx);
    const Hq = differentialEntropyContinuous(gVals, dx);
    const crossPQ = crossEntropyContinuous(fVals, gVals, dx);
    const crossQP = crossEntropyContinuous(gVals, fVals, dx);
    return { xs, fVals, gVals, Hp, Hq, crossPQ, crossQP, klPQ: crossPQ - Hp, klQP: crossQP - Hq };
  }, [familyP, familyQ, activeParamsP, activeParamsQ]);

  const updateWeight = (which: 'P' | 'Q', i: number, value: number) => {
    const setter = which === 'P' ? setWeightsP : setWeightsQ;
    setter((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  };

  const updateParam = (which: 'P' | 'Q', key: string, value: number) => {
    const family = which === 'P' ? familyP : familyQ;
    const setter = which === 'P' ? setParamsP : setParamsQ;
    setter((prev) => ({ ...prev, [family]: { ...prev[family], [key]: value } }));
  };

  const renderResultsGrid = (s: {
    Hp: number;
    Hq: number;
    crossPQ: number;
    crossQP: number;
    klPQ: number;
    klQP: number;
  }) => (
    <div className={styles.resultsGrid}>
      <div className={styles.resultChip}>
        <span className={styles.resultLabel}>H(P)</span>
        <span className={styles.resultValue}>{s.Hp.toFixed(3)} bits</span>
      </div>
      <div className={styles.resultChip}>
        <span className={styles.resultLabel}>H(Q)</span>
        <span className={styles.resultValue}>{s.Hq.toFixed(3)} bits</span>
      </div>
      <div className={styles.resultChip}>
        <span className={styles.resultLabel}>H(P, Q)</span>
        <span className={styles.resultValue}>{s.crossPQ.toFixed(3)} bits</span>
      </div>
      <div className={styles.resultChip}>
        <span className={styles.resultLabel}>H(Q, P)</span>
        <span className={styles.resultValue}>{s.crossQP.toFixed(3)} bits</span>
      </div>
      <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
        <span className={styles.resultLabel}>D_KL(P&#8214;Q)</span>
        <span className={styles.resultValue}>{s.klPQ.toFixed(3)} bits</span>
      </div>
      <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
        <span className={styles.resultLabel}>D_KL(Q&#8214;P)</span>
        <span className={styles.resultValue}>{s.klQP.toFixed(3)} bits</span>
      </div>
    </div>
  );

  const discreteSeries: ChartSeries[] = [
    { kind: 'discrete', name: 'P', color: COLOR_P, labels: DISCRETE_CATEGORY_LABELS.slice(0, k), values: probsP },
    { kind: 'discrete', name: 'Q', color: COLOR_Q, labels: DISCRETE_CATEGORY_LABELS.slice(0, k), values: probsQ },
  ];

  const continuousSeries: ChartSeries[] = [
    { kind: 'continuous', name: 'f (P)', color: COLOR_P, xs: continuousData.xs, values: continuousData.fVals },
    { kind: 'continuous', name: 'g (Q)', color: COLOR_Q, xs: continuousData.xs, values: continuousData.gVals },
  ];

  return (
    <div className={styles.step}>
      <h2>Etape 2 : deux distributions, entropie croisee et divergence KL</h2>
      <p className={styles.description}>
        L'entropie croisee H(P, Q) mesure le cout moyen (en bits) si l'on code des evenements tires de P en utilisant
        un codage optimal pour Q. H(Q, P) est l'operation symetrique : coder Q avec le codage optimal de P — en
        general H(P,Q) &#8800; H(Q,P). La divergence de Kullback-Leibler D<sub>KL</sub>(P&#8214;Q) mesure l'ecart
        entre les deux distributions : c'est le surcout par rapport au codage optimal de P lui-meme.
      </p>

      <div className={styles.formula}>
        <BlockMath math="H(P, Q) = -\sum_i p_i \log_2 q_i \qquad H(Q, P) = -\sum_i q_i \log_2 p_i \qquad D_{KL}(P \| Q) = \sum_i p_i \log_2 \frac{p_i}{q_i} = H(P,Q) - H(P)" />
      </div>

      <div className={styles.infoBox}>
        <h4>A retenir</h4>
        <p>
          D<sub>KL</sub>(P&#8214;Q) &#8805; 0, avec egalite si et seulement si P = Q (inegalite de Gibbs). Mais D
          <sub>KL</sub>(P&#8214;Q) &#8800; D<sub>KL</sub>(Q&#8214;P) en general : la divergence KL n'est pas
          symetrique, ce n'est pas une distance mathematique au sens strict.
        </p>
      </div>

      <div className={styles.kindToggle}>
        <button
          className={kind === 'discrete' ? styles.kindActive : styles.kindBtn}
          onClick={() => setKind('discrete')}
        >
          Variables discretes
        </button>
        <button
          className={kind === 'continuous' ? styles.kindActive : styles.kindBtn}
          onClick={() => setKind('continuous')}
        >
          Variables continues
        </button>
      </div>

      {kind === 'discrete' ? (
        <>
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

          <div className={styles.splitView}>
            <div className={styles.flowColumn}>
              <div className={styles.distColumn}>
                <h3 style={{ color: COLOR_P }}>Distribution P</h3>
                <div className={styles.sliderGrid}>
                  {DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => (
                    <Slider
                      key={label}
                      label={`Poids ${label}`}
                      value={weightsP[i]}
                      min={0}
                      max={20}
                      step={0.1}
                      onChange={(v) => updateWeight('P', i, v)}
                      color={COLOR_P}
                      format={(v) => v.toFixed(1)}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.distColumn}>
                <h3 style={{ color: COLOR_Q }}>Distribution Q</h3>
                <div className={styles.sliderGrid}>
                  {DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => (
                    <Slider
                      key={label}
                      label={`Poids ${label}`}
                      value={weightsQ[i]}
                      min={0}
                      max={20}
                      step={0.1}
                      onChange={(v) => updateWeight('Q', i, v)}
                      color={COLOR_Q}
                      format={(v) => v.toFixed(1)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.chartColumn}>
              <DistributionChart series={discreteSeries} yLabel="Probabilite" xLabel="Categorie" />
              {renderResultsGrid(discreteStats)}
            </div>
          </div>

          <h3 className={styles.detailTitle}>Detail du calcul : chaque terme des sommes</h3>
          <TermsTable
            headers={[
              'Categorie',
              'p_i',
              'q_i',
              '-p_i.log2(p_i)\n(terme H(P))',
              '-q_i.log2(q_i)\n(terme H(Q))',
              '-p_i.log2(q_i)\n(terme H(P,Q))',
              '-q_i.log2(p_i)\n(terme H(Q,P))',
            ]}
            rows={DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => [
              label,
              probsP[i].toFixed(3),
              probsQ[i].toFixed(3),
              termsHp[i].toFixed(3),
              termsHq[i].toFixed(3),
              termsCrossPQ[i].toFixed(3),
              termsCrossQP[i].toFixed(3),
            ])}
            totalsRow={[
              'Somme',
              '',
              '',
              discreteStats.Hp.toFixed(3),
              discreteStats.Hq.toFixed(3),
              discreteStats.crossPQ.toFixed(3),
              discreteStats.crossQP.toFixed(3),
            ]}
          />

          <h3 className={styles.detailTitle}>La courbe -p . log2(p)</h3>
          <p className={styles.description}>
            Les termes de H(P) et H(Q) (colonnes "terme H(P)" et "terme H(Q)") sont chacun un point sur cette meme
            courbe : en indigo les categories de P, en cyan celles de Q.
          </p>
          <TermCurve
            title={`H(P) = ${discreteStats.Hp.toFixed(3)} bits   ·   H(Q) = ${discreteStats.Hq.toFixed(3)} bits`}
            markers={[
              ...DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => ({ x: probsP[i], label, color: COLOR_P })),
              ...DISCRETE_CATEGORY_LABELS.slice(0, k).map((label, i) => ({ x: probsQ[i], label, color: COLOR_Q })),
            ]}
          />
        </>
      ) : (
        <>
          <div className={styles.splitView}>
            <div>
              <div className={styles.distColumn}>
                <h3 style={{ color: COLOR_P }}>Distribution P</h3>
                <select value={familyP} onChange={(e) => setFamilyP(e.target.value as ContinuousFamily)}>
                  {CONTINUOUS_FAMILIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className={styles.sliderGrid}>
                  {familyDefP.params.map((p) => (
                    <Slider
                      key={p.key}
                      label={p.label}
                      value={activeParamsP[p.key]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onChange={(v) => updateParam('P', p.key, v)}
                      color={COLOR_P}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.distColumn}>
                <h3 style={{ color: COLOR_Q }}>Distribution Q</h3>
                <select value={familyQ} onChange={(e) => setFamilyQ(e.target.value as ContinuousFamily)}>
                  {CONTINUOUS_FAMILIES.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className={styles.sliderGrid}>
                  {familyDefQ.params.map((p) => (
                    <Slider
                      key={p.key}
                      label={p.label}
                      value={activeParamsQ[p.key]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onChange={(v) => updateParam('Q', p.key, v)}
                      color={COLOR_Q}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.chartColumn}>
              <DistributionChart series={continuousSeries} yLabel="Densite" xLabel="x" />
              {renderResultsGrid(continuousData)}
              <p className={styles.note}>
                Note : les integrales sont approximees numeriquement sur une grille commune aux deux densites ; la
                precision peut se degrader legerement si P et Q vivent sur des echelles tres differentes.
              </p>
            </div>
          </div>
        </>
      )}

      <div className={styles.infoBox}>
        <h4>Ce que mesurent ces bits</h4>
        <p>
          H(P, Q) est le nombre moyen de bits utilises si l'on encode des tirages de la vraie loi P avec le code
          optimal construit pour Q — et non pour P. Comme ce code n'est pas adapte a P, il est necessairement au
          moins aussi long en moyenne que le code optimal de P (H(P)), sauf si P = Q. D<sub>KL</sub>(P&#8214;Q) =
          H(P,Q) - H(P) est exactement ce surcout, en bits : l'information moyenne perdue quand on suppose Q alors
          que la realite suit P. Exemple simple : si P et Q sont deux pieces avec le meme biais, H(P,Q) = H(P) et
          D<sub>KL</sub> = 0 — coder P avec le code de Q ne coute rien de plus, puisque c'est deja le meme code.
          Plus P et Q different, plus ce surcout augmente.
        </p>
      </div>
    </div>
  );
}
