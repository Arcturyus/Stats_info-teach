import { useMemo, useState } from 'react';
import { BlockMath, InlineMath } from '../../../components/Math/KatexRenderer';
import Slider from '../../../components/Slider/Slider';
import DistributionChart, { type ChartSeries } from '../../../components/Charts/DistributionChart';
import { buildGrid, normalPdf, uniformPdf } from '../entropyMath';
import { allDivergences, klBits, fmtDiv, normalizeDensity } from '../divergences';
import styles from './Steps.module.css';

const COLOR_P = 'var(--color-primary)';
const COLOR_Q = 'var(--color-accent)';
const COLOR_FWD = '#10b981';
const COLOR_REV = '#f59e0b';

/* ------------------------------------------------------------------ */
/* Bloc A : approcher une loi bimodale par une seule gaussienne        */
/* ------------------------------------------------------------------ */

const MIXTURE = [
  { w: 0.65, mu: -2, sigma: 0.7 },
  { w: 0.35, mu: 2.5, sigma: 0.7 },
];

function mixturePdf(x: number): number {
  return MIXTURE.reduce((s, c) => s + c.w * normalPdf(x, c.mu, c.sigma), 0);
}

const A_DOMAIN: [number, number] = [-7, 8];

interface Optimum {
  mu: number;
  sigma: number;
  val: number;
}

/**
 * Cherche les couples (mu, sigma) minimisant chacune des deux KL, en deux passes :
 * un balayage grossier sur tout le domaine, puis un raffinement local au centieme.
 */
function searchOptima() {
  const { xs, dx } = buildGrid(A_DOMAIN, 400);
  const p = xs.map(mixturePdf);
  const q: number[] = new Array(xs.length);

  const sweep = (
    muRange: [number, number],
    sigmaRange: [number, number],
    step: number,
    seedFwd: Optimum,
    seedRev: Optimum,
  ) => {
    let bestFwd = seedFwd;
    let bestRev = seedRev;
    for (let mu = muRange[0]; mu <= muRange[1] + 1e-9; mu += step) {
      for (let sigma = Math.max(sigmaRange[0], 0.15); sigma <= sigmaRange[1] + 1e-9; sigma += step) {
        for (let i = 0; i < xs.length; i++) q[i] = normalPdf(xs[i], mu, sigma);
        const fwd = klBits(p, q, dx);
        const rev = klBits(q, p, dx);
        if (fwd < bestFwd.val) bestFwd = { mu, sigma, val: fwd };
        if (rev < bestRev.val) bestRev = { mu, sigma, val: rev };
      }
    }
    return { forward: bestFwd, reverse: bestRev };
  };

  const seed = { mu: 0, sigma: 1, val: Infinity };
  const coarse = sweep([-6, 6], [0.3, 4], 0.1, seed, seed);
  const fine = sweep(
    [coarse.forward.mu - 0.1, coarse.forward.mu + 0.1],
    [coarse.forward.sigma - 0.1, coarse.forward.sigma + 0.1],
    0.01,
    coarse.forward,
    { ...seed },
  );
  const fineRev = sweep(
    [coarse.reverse.mu - 0.1, coarse.reverse.mu + 0.1],
    [coarse.reverse.sigma - 0.1, coarse.reverse.sigma + 0.1],
    0.01,
    { ...seed },
    coarse.reverse,
  );
  return { forward: fine.forward, reverse: fineRev.reverse };
}

/* ------------------------------------------------------------------ */
/* Bloc B : deux lois que l'on eloigne progressivement                 */
/* ------------------------------------------------------------------ */

type ShiftMode = 'gauss' | 'uniform';

const SHIFTS = Array.from({ length: 61 }, (_, i) => i * 0.05);
const DIV_CAP = 4;

function buildShiftPair(mode: ShiftMode, d: number) {
  // Domaine large cote gaussien : le khi-deux integre f^2/g, dont la masse se trouve
  // loin dans la queue gauche ; une fenetre trop etroite le sous-estimerait fortement.
  const domain: [number, number] = mode === 'gauss' ? [-8, d + 8] : [-0.4, d + 1.4];
  const { xs, dx } = buildGrid(domain, 1200);
  const f = xs.map((x) => (mode === 'gauss' ? normalPdf(x, 0, 1) : uniformPdf(x, 0, 1)));
  const g = xs.map((x) => (mode === 'gauss' ? normalPdf(x, d, 1) : uniformPdf(x, d, d + 1)));
  // Les bords francs des lois uniformes tombent entre deux points de grille : sans
  // renormalisation, les masses valent 1 a 0,2 % pres et les bornes theoriques
  // (variation totale et Jensen-Shannon plafonnees a 1) seraient legerement depassees.
  return { xs, dx, f: normalizeDensity(f, dx), g: normalizeDensity(g, dx) };
}

/* ------------------------------------------------------------------ */

export default function StepWhyKL() {
  /* --- Bloc A --- */
  const [muQ, setMuQ] = useState(-2);
  const [sigmaQ, setSigmaQ] = useState(0.7);
  const [showOptima, setShowOptima] = useState(true);

  const gridA = useMemo(() => buildGrid(A_DOMAIN, 900), []);
  const pVals = useMemo(() => gridA.xs.map(mixturePdf), [gridA]);
  const optima = useMemo(() => searchOptima(), []);

  const qVals = useMemo(() => gridA.xs.map((x) => normalPdf(x, muQ, sigmaQ)), [gridA, muQ, sigmaQ]);
  const fwdOptVals = useMemo(
    () => gridA.xs.map((x) => normalPdf(x, optima.forward.mu, optima.forward.sigma)),
    [gridA, optima],
  );
  const revOptVals = useMemo(
    () => gridA.xs.map((x) => normalPdf(x, optima.reverse.mu, optima.reverse.sigma)),
    [gridA, optima],
  );

  const klFwd = useMemo(() => klBits(pVals, qVals, gridA.dx), [pVals, qVals, gridA.dx]);
  const klRev = useMemo(() => klBits(qVals, pVals, gridA.dx), [pVals, qVals, gridA.dx]);
  const klFwdOpt = useMemo(() => klBits(pVals, fwdOptVals, gridA.dx), [pVals, fwdOptVals, gridA.dx]);
  const klRevOpt = useMemo(() => klBits(revOptVals, pVals, gridA.dx), [pVals, revOptVals, gridA.dx]);

  const seriesA: ChartSeries[] = [
    { kind: 'continuous', name: 'P (cible bimodale)', color: COLOR_P, xs: gridA.xs, values: pVals },
    { kind: 'continuous', name: 'Q reglable', color: COLOR_Q, xs: gridA.xs, values: qVals },
    ...(showOptima
      ? ([
          {
            kind: 'continuous',
            name: 'optimum forward',
            color: COLOR_FWD,
            xs: gridA.xs,
            values: fwdOptVals,
            dash: '6,4',
          },
          {
            kind: 'continuous',
            name: 'optimum reverse',
            color: COLOR_REV,
            xs: gridA.xs,
            values: revOptVals,
            dash: '6,4',
          },
        ] as ChartSeries[])
      : []),
  ];

  /* --- Bloc B --- */
  const [mode, setMode] = useState<ShiftMode>('gauss');
  const [shift, setShift] = useState(1);

  const shiftCurves = useMemo(
    () =>
      SHIFTS.map((d) => {
        const { f, g, dx } = buildShiftPair(mode, d);
        return { d, ...allDivergences(f, g, dx) };
      }),
    [mode],
  );

  const current = useMemo(() => {
    const { xs, dx, f, g } = buildShiftPair(mode, shift);
    return { xs, f, g, div: allDivergences(f, g, dx) };
  }, [mode, shift]);

  const seriesB: ChartSeries[] = [
    { kind: 'continuous', name: 'P', color: COLOR_P, xs: current.xs, values: current.f },
    { kind: 'continuous', name: 'Q', color: COLOR_Q, xs: current.xs, values: current.g },
  ];

  const divSeries: ChartSeries[] = [
    {
      kind: 'continuous',
      name: 'D_KL(P||Q)',
      color: COLOR_P,
      xs: SHIFTS,
      values: shiftCurves.map((r) => Math.min(r.kl, DIV_CAP)),
    },
    { kind: 'continuous', name: 'Jensen-Shannon', color: COLOR_Q, xs: SHIFTS, values: shiftCurves.map((r) => r.js) },
    { kind: 'continuous', name: 'Variation totale', color: COLOR_REV, xs: SHIFTS, values: shiftCurves.map((r) => r.tv) },
    { kind: 'continuous', name: 'Wasserstein-1', color: COLOR_FWD, xs: SHIFTS, values: shiftCurves.map((r) => r.w1) },
  ];

  /* --- Bloc C : invariance par changement d'unites --- */
  const unitDemo = useMemo(() => {
    const { xs, dx } = buildGrid([-6, 8], 4000);
    const f = xs.map((x) => normalPdf(x, 0, 1));
    const g = xs.map((x) => normalPdf(x, 0.6, 1.4));
    const s = 100;
    return {
      metres: allDivergences(f, g, dx),
      centimetres: allDivergences(
        f.map((v) => v / s),
        g.map((v) => v / s),
        dx * s,
      ),
    };
  }, []);

  return (
    <div className={styles.step}>
      <h2>Étape 4 : pourquoi la divergence KL plutôt qu'une autre ?</h2>
      <p className={styles.description}>
        Sur le papier, la divergence KL est une mauvaise candidate : elle n'est pas symétrique, ne vérifie pas
        l'inégalité triangulaire, n'est pas bornée, et vaut <InlineMath math="+\infty" /> dès que la seconde loi
        s'annule là où la première ne s'annule pas. Il existe des concurrentes bien mieux élevées — variation
        totale, distance de Hellinger, divergence de Jensen-Shannon, distance de Wasserstein. Et pourtant c'est la
        KL que l'on retrouve dans presque tout l'apprentissage automatique moderne. Cette étape explique pourquoi,
        puis montre les situations où elle est effectivement le mauvais outil.
      </p>

      <div className={styles.infoBox}>
        <h4>Les quatre propriétés qui font gagner la KL</h4>
        <ol className={styles.reasonList}>
          <li>
            <strong>C'est la log-vraisemblance.</strong> Minimiser{' '}
            <InlineMath math="D_{KL}(\hat{P}_{\text{données}} \| Q_\theta)" /> revient exactement à maximiser la
            log-vraisemblance des données sous <InlineMath math="Q_\theta" />, puisque{' '}
            <InlineMath math="D_{KL}(\hat{P} \| Q_\theta) = H(\hat{P}, Q_\theta) - H(\hat{P})" /> et que{' '}
            <InlineMath math="H(\hat{P})" /> ne dépend pas de <InlineMath math="\theta" />. Toute la théorie
            asymptotique de l'estimation (consistance, efficacité, borne de Cramér-Rao) n'est que de la géométrie KL
            locale : <InlineMath math="D_{KL}(\theta \| \theta + \delta) \approx \tfrac12 \delta^\top I(\theta) \delta" />,
            où <InlineMath math="I(\theta)" /> est l'information de Fisher. Aucune autre divergence ne donne ce lien.
          </li>
          <li>
            <strong>Elle s'additionne.</strong> Pour des variables indépendantes,{' '}
            <InlineMath math="D_{KL}(P_1 \otimes P_2 \| Q_1 \otimes Q_2) = D_{KL}(P_1 \| Q_1) + D_{KL}(P_2 \| Q_2)" />
            , et la règle de chaînage la décompose conditionnellement. C'est ce qui permet d'écrire la perte d'un LLM
            comme une simple somme d'entropies croisées token par token. Wasserstein, Hellinger et la variation
            totale n'ont pas cette additivité exacte.
          </li>
          <li>
            <strong>Elle ne dépend pas de la paramétrisation.</strong> Changez d'unités, passez au logarithme,
            appliquez n'importe quelle transformation inversible : la KL est inchangée. Ce n'est le cas ni de la
            distance <InlineMath math="L^2" /> entre densités, ni de Wasserstein (bloc C ci-dessous).
          </li>
          <li>
            <strong>Elle se calcule sans constante de normalisation.</strong>{' '}
            <InlineMath math="D_{KL}(Q \| P)" /> ne fait intervenir que des espérances sous <InlineMath math="Q" />{' '}
            — que l'on sait échantillonner — et <InlineMath math="\log \tilde{p}" /> non normalisé. C'est toute
            l'inférence variationnelle : l'ELBO n'existe que grâce à cette forme.
          </li>
        </ol>
      </div>

      {/* ============================ BLOC A ============================ */}

      <h3 className={styles.detailTitle}>A. Forward ou reverse : deux façons opposées d'approcher une loi</h3>
      <p className={styles.description}>
        La KL étant asymétrique, il y a deux manières de l'utiliser pour ajuster un modèle <InlineMath math="Q" /> à
        une cible <InlineMath math="P" />, et elles ne donnent pas du tout le même résultat. Ci-dessous,{' '}
        <InlineMath math="P" /> est bimodale (deux sous-populations) et <InlineMath math="Q" /> est une simple
        gaussienne : un modèle trop pauvre pour la représenter. Déplacez <InlineMath math="Q" /> et observez
        laquelle des deux KL récompense quel comportement.
      </p>

      <div className={styles.formula}>
        <BlockMath math="\underbrace{D_{KL}(P \| Q)}_{\text{forward — mode-covering}} = \textstyle\sum p \log_2 \frac{p}{q} \qquad\qquad \underbrace{D_{KL}(Q \| P)}_{\text{reverse — mode-seeking}} = \textstyle\sum q \log_2 \frac{q}{p}" />
      </div>

      <div className={styles.splitView}>
        <div>
          <div className={styles.sliderGrid}>
            <Slider
              label="μ de Q"
              value={muQ}
              min={-6}
              max={6}
              step={0.05}
              onChange={setMuQ}
              color={COLOR_Q}
              format={(v) => v.toFixed(2)}
            />
            <Slider
              label="σ de Q"
              value={sigmaQ}
              min={0.3}
              max={4}
              step={0.05}
              onChange={setSigmaQ}
              color={COLOR_Q}
              format={(v) => v.toFixed(2)}
            />
          </div>

          <div className={styles.presetButtons}>
            <button
              onClick={() => {
                setMuQ(optima.forward.mu);
                setSigmaQ(optima.forward.sigma);
              }}
            >
              Q à l'optimum forward
            </button>
            <button
              onClick={() => {
                setMuQ(optima.reverse.mu);
                setSigmaQ(optima.reverse.sigma);
              }}
            >
              Q à l'optimum reverse
            </button>
          </div>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={showOptima} onChange={(e) => setShowOptima(e.target.checked)} />
            Afficher les deux optima en pointillés
          </label>

          <div className={styles.resultsGrid}>
            <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
              <span className={styles.resultLabel}>Forward D_KL(P&#8214;Q)</span>
              <span className={styles.resultValue}>{fmtDiv(klFwd)} bits</span>
            </div>
            <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
              <span className={styles.resultLabel}>Reverse D_KL(Q&#8214;P)</span>
              <span className={styles.resultValue}>{fmtDiv(klRev)} bits</span>
            </div>
            <div className={styles.resultChip}>
              <span className={styles.resultLabel}>Minimum forward</span>
              <span className={styles.resultValue}>{fmtDiv(klFwdOpt)}</span>
              <span className={styles.chipSub}>
                μ = {optima.forward.mu.toFixed(2)} · σ = {optima.forward.sigma.toFixed(2)}
              </span>
            </div>
            <div className={styles.resultChip}>
              <span className={styles.resultLabel}>Minimum reverse</span>
              <span className={styles.resultValue}>{fmtDiv(klRevOpt)}</span>
              <span className={styles.chipSub}>
                μ = {optima.reverse.mu.toFixed(2)} · σ = {optima.reverse.sigma.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.chartColumn}>
          <DistributionChart series={seriesA} yLabel="Densité" xLabel="x" width={480} height={320} />
        </div>
      </div>

      <p className={styles.interpretation}>
        <strong>Forward, <InlineMath math="D_{KL}(P \| Q)" /> : « zero-avoiding ».</strong> Le terme{' '}
        <InlineMath math="p \log(p/q)" /> est pondéré par <InlineMath math="p" /> : partout où la cible met de la
        masse, le modèle a interdiction d'en mettre trop peu, sous peine d'une pénalité qui diverge. La gaussienne
        optimale est donc large et centrée entre les deux modes — elle <em>couvre</em> tout, quitte à placer de la
        masse dans le creux central où <InlineMath math="P" /> est presque nulle. C'est exactement l'ajustement des
        moments : moyenne et variance de <InlineMath math="Q" /> égalent celles de <InlineMath math="P" />.
        <br />
        <strong>Reverse, <InlineMath math="D_{KL}(Q \| P)" /> : « zero-forcing ».</strong> La pondération se fait
        cette fois par <InlineMath math="q" /> : le modèle n'est jamais puni pour ignorer une région, seulement pour
        mettre de la masse là où la cible n'en a pas. L'optimum se colle donc sur le mode dominant et oublie purement
        et simplement le second. Sous-dispersé, mais localement juste.
      </p>

      <div className={styles.infoBox}>
        <h4>Où ce choix se joue en pratique</h4>
        <p>
          <strong>Apprentissage supervisé, LLM, modèles de diffusion : forward.</strong> On minimise l'entropie
          croisée <InlineMath math="H(P_{\text{données}}, Q_\theta)" />, donc la KL forward. C'est bien ce que l'on
          veut d'un modèle génératif : il doit assigner une probabilité non nulle à tout ce que les données
          contiennent, sinon un seul exemple réel fait exploser la perte. La contrepartie est directement lisible sur
          le graphe — le modèle étale sa masse sur des régions vides. C'est la même mécanique qui donne des images
          floues aux VAE entraînés au maximum de vraisemblance, et qui pousse un modèle sous-dimensionné à produire
          des sorties « moyennes » et plates plutôt que de choisir un mode.
        </p>
        <p>
          <strong>Inférence variationnelle, terme de régularisation des VAE, expectation propagation : reverse.</strong>{' '}
          On minimise <InlineMath math="D_{KL}(q_\phi \| p)" /> parce que c'est la <em>seule</em> forme calculable :
          la vraie loi a posteriori <InlineMath math="p(z \mid x)" /> n'est connue qu'à une constante de
          normalisation près, et seule la reverse KL s'écrit comme une espérance sous <InlineMath math="q_\phi" />,
          que l'on sait échantillonner. Le prix à payer est exactement le comportement mode-seeking ci-dessus : les
          lois a posteriori variationnelles sont systématiquement trop concentrées et sous-estiment l'incertitude. Ce
          n'est pas un défaut d'implémentation, c'est une propriété de l'objectif choisi.
        </p>
        <p>
          <strong>RLHF : reverse, et c'est délibéré.</strong> La pénalité{' '}
          <InlineMath math="\beta \, D_{KL}(\pi_\theta \| \pi_{\text{ref}})" /> ajoutée à la récompense est
          zero-forcing : elle interdit à la politique d'aller mettre de la masse là où le modèle de référence n'en a
          pas, sans jamais l'obliger à couvrir tout ce que la référence sait faire. C'est précisément le garde-fou
          recherché contre le <em>reward hacking</em>. À l'inverse, la <strong>distillation</strong> utilise la KL
          forward <InlineMath math="D_{KL}(\text{professeur} \| \text{élève})" /> : on veut que l'élève couvre toute
          la distribution de sortie du professeur, y compris ses probabilités faibles — le « dark knowledge » qui
          fait tout l'intérêt de la méthode.
        </p>
      </div>

      {/* ============================ BLOC B ============================ */}

      <h3 className={styles.detailTitle}>B. Quand les supports se séparent : le point faible de la KL</h3>
      <p className={styles.description}>
        Éloignez progressivement <InlineMath math="Q" /> de <InlineMath math="P" /> et regardez comment chaque
        divergence réagit. Le cas gaussien (supports qui se recouvrent partout) et le cas uniforme (supports qui se
        disjoignent) donnent des comportements radicalement différents.
      </p>

      <div className={styles.kindToggle}>
        <button className={mode === 'gauss' ? styles.kindActive : styles.kindBtn} onClick={() => setMode('gauss')}>
          Gaussiennes N(0,1) et N(d,1)
        </button>
        <button
          className={mode === 'uniform' ? styles.kindActive : styles.kindBtn}
          onClick={() => setMode('uniform')}
        >
          Uniformes U[0,1] et U[d, d+1]
        </button>
      </div>

      <div className={styles.sliderGrid}>
        <Slider
          label="Écart d entre les deux lois"
          value={shift}
          min={0}
          max={3}
          step={0.05}
          onChange={setShift}
          color={COLOR_Q}
          format={(v) => v.toFixed(2)}
        />
      </div>

      <div className={styles.splitView}>
        <div className={styles.chartColumn}>
          <h4 className={styles.chartTitle}>Les deux lois à l'écart choisi</h4>
          <DistributionChart
            series={seriesB}
            yLabel="Densité"
            xLabel="x"
            smooth={mode === 'gauss'}
            width={440}
            height={280}
          />
        </div>
        <div className={styles.chartColumn}>
          <h4 className={styles.chartTitle}>Chaque divergence en fonction de l'écart d</h4>
          <DistributionChart
            series={divSeries}
            yLabel="Valeur"
            xLabel="écart d"
            smooth={false}
            area={false}
            yMax={DIV_CAP}
            vLine={shift}
            width={440}
            height={280}
          />
          <p className={styles.note}>
            Courbes tronquées à {DIV_CAP} ; le trait vertical marque l'écart d actuellement choisi.
          </p>
        </div>
      </div>

      <div className={styles.resultsGrid}>
        <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
          <span className={styles.resultLabel}>D_KL(P&#8214;Q)</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.kl)}</span>
        </div>
        <div className={styles.resultChip}>
          <span className={styles.resultLabel}>Jensen-Shannon</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.js)}</span>
        </div>
        <div className={styles.resultChip}>
          <span className={styles.resultLabel}>Variation totale</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.tv)}</span>
        </div>
        <div className={styles.resultChip}>
          <span className={styles.resultLabel}>Hellinger</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.hellinger)}</span>
        </div>
        <div className={styles.resultChip}>
          <span className={styles.resultLabel}>Khi-deux</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.chi2)}</span>
        </div>
        <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
          <span className={styles.resultLabel}>Wasserstein-1</span>
          <span className={styles.resultValue}>{fmtDiv(current.div.w1)}</span>
        </div>
      </div>

      <p className={styles.interpretation}>
        <strong>Cas gaussien :</strong> les deux densités sont strictement positives partout, donc tout se passe
        bien. La KL vaut <InlineMath math="d^2 / (2\ln 2)" /> bits : elle croît sans limite et son gradient reste
        informatif aussi loin qu'on aille. C'est le régime dans lequel elle est excellente — et il couvre la grande
        majorité des modèles paramétriques usuels.
        <br />
        <strong>Cas uniforme :</strong> dès que <InlineMath math="d > 0" />, il existe une zone où{' '}
        <InlineMath math="P" /> met de la masse et <InlineMath math="Q" /> exactement zéro : la KL saute
        immédiatement à <InlineMath math="+\infty" /> et y reste, que les lois soient distantes de 0,05 ou de 3.
        Elle ne distingue plus rien et son gradient n'existe pas. Jensen-Shannon et la variation totale ne divergent
        pas, mais elles <em>saturent</em> à leur borne (1 bit et 1) dès que le recouvrement disparaît : gradient nul,
        donc même impasse en pratique. Seule Wasserstein-1 continue de croître linéairement en{' '}
        <InlineMath math="d" /> — elle sait <em>de combien</em> les lois sont éloignées, parce qu'elle utilise la
        géométrie de l'axe des <InlineMath math="x" /> et non seulement le rapport des densités point par point.
      </p>

      <div className={styles.infoBox}>
        <h4>L'exemple canonique : pourquoi les GAN ont abandonné la KL et la JS</h4>
        <p>
          Une image de 256×256 pixels vit dans <InlineMath math="\mathbb{R}^{196608}" />, mais l'ensemble des images
          réalistes y forme une variété de dimension bien plus faible — un ensemble de mesure nulle. Le générateur
          d'un GAN produit lui aussi une variété de faible dimension, image d'un bruit{' '}
          <InlineMath math="z \in \mathbb{R}^{100}" />. Deux variétés de faible dimension placées « au hasard » dans
          un espace de très grande dimension ne se recoupent presque jamais : on est exactement dans le cas uniforme
          ci-dessus, mais en permanence et dès la première itération. La KL vaut <InlineMath math="+\infty" />, la
          divergence de Jensen-Shannon — l'objectif du GAN original — vaut constamment son maximum de 1 bit, et le
          générateur ne reçoit donc aucun gradient exploitable : c'est la saturation du discriminateur observée dès
          2014. Le WGAN (Arjovsky et al., 2017) remplace la JS par Wasserstein-1, dont la courbe verte du graphe
          ci-dessus montre bien qu'elle reste informative même sans le moindre recouvrement. Le même argument vaut
          pour comparer deux nuages de points, deux jeux de plongements, ou deux échantillons empiriques finis : ce
          sont des mesures atomiques, donc de supports disjoints par construction.
        </p>
        <p>
          Corollaire souvent oublié : pour deux masses de Dirac séparées de 1 ou de 1000, la KL vaut{' '}
          <InlineMath math="+\infty" /> dans les deux cas et la variation totale vaut 1 dans les deux cas, alors que
          Wasserstein vaut respectivement 1 et 1000. Quand la question posée est « <em>à quelle distance</em> » et
          non « avec quelle probabilité peut-on les confondre », la KL n'y répond tout simplement pas.
        </p>
        <p>
          La contrepartie de Wasserstein est réelle : aucune interprétation en bits ni de lien avec la
          vraisemblance, pas d'invariance par changement d'unités (bloc C), et un calcul en grande dimension qui
          passe par une estimation duale coûteuse — le « critique » 1-lipschitzien du WGAN, avec tous ses problèmes
          de contrainte de Lipschitz. On ne l'utilise que lorsque l'échec de la KL est avéré.
        </p>
      </div>

      {/* ============================ BLOC C ============================ */}

      <h3 className={styles.detailTitle}>C. Invariance : la KL ignore les unités, les distances non</h3>
      <p className={styles.description}>
        Prenons <InlineMath math="P = \mathcal{N}(0, 1)" /> et{' '}
        <InlineMath math="Q = \mathcal{N}(0{,}6\ ;\ 1{,}4^2)" />, mesurées en mètres, puis exactement les mêmes lois
        exprimées en centimètres. Rien n'a changé au problème, seules les unités diffèrent. Voici ce que chaque
        quantité en dit.
      </p>

      <div className={styles.compareWrap}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>Quantité</th>
              <th>En mètres</th>
              <th>En centimètres</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>D_KL(P&#8214;Q)</td>
              <td>{fmtDiv(unitDemo.metres.kl)}</td>
              <td>{fmtDiv(unitDemo.centimetres.kl)}</td>
              <td className={styles.ok}>invariante</td>
            </tr>
            <tr>
              <td>Variation totale</td>
              <td>{fmtDiv(unitDemo.metres.tv)}</td>
              <td>{fmtDiv(unitDemo.centimetres.tv)}</td>
              <td className={styles.ok}>invariante</td>
            </tr>
            <tr>
              <td>Hellinger</td>
              <td>{fmtDiv(unitDemo.metres.hellinger)}</td>
              <td>{fmtDiv(unitDemo.centimetres.hellinger)}</td>
              <td className={styles.ok}>invariante</td>
            </tr>
            <tr>
              <td>Distance L2 entre densités</td>
              <td>{fmtDiv(unitDemo.metres.l2)}</td>
              <td>{fmtDiv(unitDemo.centimetres.l2)}</td>
              <td className={styles.ko}>divisée par 10</td>
            </tr>
            <tr>
              <td>Wasserstein-1</td>
              <td>{fmtDiv(unitDemo.metres.w1)}</td>
              <td>{fmtDiv(unitDemo.centimetres.w1, 1)}</td>
              <td className={styles.ko}>multipliée par 100</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className={styles.interpretation}>
        Les <em>f</em>-divergences (KL, khi-deux, Hellinger, variation totale, Jensen-Shannon) ne dépendent que du
        rapport <InlineMath math="p(x)/q(x)" />, qui est sans dimension : elles sont invariantes par toute
        transformation inversible des données. Concrètement, on peut normaliser, standardiser ou passer au log ses
        variables sans changer la valeur de l'objectif, et une valeur de KL reste comparable d'un jeu de données à
        l'autre. La distance <InlineMath math="L^2" /> entre densités n'a même pas de sens physique stable, ce qui
        explique qu'on ne la voie quasiment jamais servir de fonction de perte. Wasserstein occupe une position
        intermédiaire : elle est <em>homogène</em>, elle a la dimension d'une longueur — un défaut quand on cherche
        une quantité universelle, une qualité quand on veut justement mesurer un déplacement physique.
      </p>

      {/* ============================ BLOC D ============================ */}

      <h3 className={styles.detailTitle}>D. Récapitulatif : quelle divergence pour quel usage</h3>

      <div className={styles.compareWrap}>
        <table className={styles.compareTable}>
          <thead>
            <tr>
              <th>Divergence</th>
              <th>Symétrique</th>
              <th>Vraie métrique</th>
              <th>Bornée</th>
              <th>Supports disjoints</th>
              <th>Usages typiques</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kullback-Leibler</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>+&#8734; : inutilisable</td>
              <td>Entropie croisée, maximum de vraisemblance, ELBO et VAE, RLHF, distillation, dérive de données</td>
            </tr>
            <tr>
              <td>Jensen-Shannon</td>
              <td className={styles.ok}>oui</td>
              <td>sa racine, oui</td>
              <td className={styles.ok}>oui (1 bit)</td>
              <td className={styles.ko}>saturée à 1 bit</td>
              <td>GAN original, comparaison symétrique de deux corpus</td>
            </tr>
            <tr>
              <td>Variation totale</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui (1)</td>
              <td className={styles.ko}>saturée à 1</td>
              <td>Bornes théoriques, confidentialité différentielle, inégalité de Pinsker</td>
            </tr>
            <tr>
              <td>Hellinger</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui (1)</td>
              <td>reste finie (= 1)</td>
              <td>Statistique robuste, tests d'adéquation, estimation par distance minimale</td>
            </tr>
            <tr>
              <td>Khi-deux de Pearson</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ko}>+&#8734;</td>
              <td>Tests d'adéquation, variance des poids d'échantillonnage préférentiel</td>
            </tr>
            <tr>
              <td>Distance L2</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ko}>non</td>
              <td>reste finie</td>
              <td>Rare : dépend des unités, aucune interprétation probabiliste</td>
            </tr>
            <tr>
              <td>Wasserstein-1</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ok}>oui</td>
              <td className={styles.ko}>non</td>
              <td className={styles.ok}>croît linéairement</td>
              <td>WGAN, transport optimal, comparaison de nuages de points et d'échantillons empiriques</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.infoBox}>
        <h4>Les quatre cas où il faut abandonner la KL</h4>
        <ol className={styles.reasonList}>
          <li>
            <strong>Supports disjoints ou presque</strong> — GAN, comparaison d'échantillons empiriques finis,
            données concentrées sur une variété de faible dimension. La KL vaut <InlineMath math="+\infty" /> et n'a
            plus de gradient. Remèdes : Wasserstein, ou un lissage explicite (bruit additif, convolution par un
            noyau).
          </li>
          <li>
            <strong>Histogrammes avec des cases vides</strong> — comparer deux distributions empiriques classe par
            classe produit des <InlineMath math="q_i = 0" /> face à des <InlineMath math="p_i > 0" />, et la KL
            explose sur un pur artefact d'échantillonnage. C'est pourquoi le <em>Population Stability Index</em>,
            utilisé en production pour détecter la dérive des données, est une KL symétrisée calculée sur des classes
            construites pour ne jamais être vides, et pourquoi on applique systématiquement un lissage de Laplace.
          </li>
          <li>
            <strong>Besoin d'une vraie distance</strong> — clustering de distributions, recherche de plus proches
            voisins, plongement métrique, indexation : ces algorithmes supposent la symétrie et l'inégalité
            triangulaire, que la KL ne fournit pas. Remèdes : Hellinger ou la racine de Jensen-Shannon, qui sont
            elles de vraies métriques.
          </li>
          <li>
            <strong>Robustesse aux valeurs aberrantes</strong> — la KL n'étant pas bornée, une seule observation
            tombée dans une région où le modèle prédit une probabilité quasi nulle domine à elle seule toute la
            perte. C'est la raison d'être du <em>label smoothing</em>, du bornage des logits, et des divergences
            robustes de type bêta ou gamma en statistique robuste.
          </li>
        </ol>
      </div>

      <p className={styles.note}>
        En une phrase : la KL est le bon choix dès qu'on <em>modélise</em> — parce qu'elle est la log-vraisemblance,
        qu'elle s'additionne et qu'elle ignore les unités ; elle devient le mauvais choix dès qu'on <em>compare
        géométriquement</em> deux objets dont les supports ne coïncident pas.
      </p>
    </div>
  );
}
