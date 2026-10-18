import { useMemo } from 'react';
import DistributionChart, { type ChartSeries } from '../../../components/Charts/DistributionChart';
import {
  entropyDiscrete,
  crossEntropyDiscrete,
  buildGrid,
  differentialEntropyContinuous,
  crossEntropyContinuous,
  normalPdf,
  uniformPdf,
} from '../entropyMath';
import styles from './Steps.module.css';

const COLOR_P = 'var(--color-primary)';
const COLOR_Q = 'var(--color-accent)';

interface GalleryCard {
  title: string;
  description: string;
  interpretation: string;
  series: ChartSeries[];
  Hp: number;
  Hq: number;
  crossPQ: number;
  klPQ: number;
  klQP: number;
}

function buildDiscreteCard(
  title: string,
  description: string,
  interpretation: string,
  labels: string[],
  p: number[],
  q: number[],
): GalleryCard {
  const Hp = entropyDiscrete(p);
  const Hq = entropyDiscrete(q);
  const crossPQ = crossEntropyDiscrete(p, q);
  const crossQP = crossEntropyDiscrete(q, p);
  return {
    title,
    description,
    interpretation,
    series: [
      { kind: 'discrete', name: 'P', color: COLOR_P, labels, values: p },
      { kind: 'discrete', name: 'Q', color: COLOR_Q, labels, values: q },
    ],
    Hp,
    Hq,
    crossPQ,
    klPQ: crossPQ - Hp,
    klQP: crossQP - Hq,
  };
}

function buildContinuousCard(
  title: string,
  description: string,
  interpretation: string,
  domain: [number, number],
  fFn: (x: number) => number,
  gFn: (x: number) => number,
): GalleryCard {
  const { xs, dx } = buildGrid(domain, 800);
  const fVals = xs.map(fFn);
  const gVals = xs.map(gFn);
  const Hp = differentialEntropyContinuous(fVals, dx);
  const Hq = differentialEntropyContinuous(gVals, dx);
  const crossPQ = crossEntropyContinuous(fVals, gVals, dx);
  const crossQP = crossEntropyContinuous(gVals, fVals, dx);
  return {
    title,
    description,
    interpretation,
    series: [
      { kind: 'continuous', name: 'f (P)', color: COLOR_P, xs, values: fVals },
      { kind: 'continuous', name: 'g (Q)', color: COLOR_Q, xs, values: gVals },
    ],
    Hp,
    Hq,
    crossPQ,
    klPQ: crossPQ - Hp,
    klQP: crossQP - Hq,
  };
}

export default function StepGallery() {
  const cards = useMemo<GalleryCard[]>(
    () => [
      buildDiscreteCard(
        'Piece equilibree vs piece truquee',
        "P = piece equilibree (50/50), Q = piece truquee (90/10). Meme support, deux distributions tres differentes : la divergence KL est nettement asymetrique.",
        "H(Q) < H(P) : la piece truquee est plus previsible, donc moins 'surprenante' en moyenne (moins d'un bit par tirage). Coder les tirages de la piece equilibree (P) avec le code optimal de la piece truquee (Q) coute H(P,Q) bits — plus cher que H(P) : ce surcout, D_KL(P||Q), est le prix a payer pour avoir suppose une piece truquee alors qu'elle est en realite equilibree. Dans l'autre sens, le surcout D_KL(Q||P) est different : la divergence KL n'est pas symetrique.",
        ['Pile', 'Face'],
        [0.5, 0.5],
        [0.9, 0.1],
      ),
      buildDiscreteCard(
        'Deux lois uniformes identiques',
        'P = Q = loi uniforme sur 4 categories. Quand les deux distributions sont identiques, la divergence KL est exactement nulle dans les deux sens.',
        "Puisque P = Q, le code optimal de Q est aussi le code optimal de P : coder l'un avec le code de l'autre ne coute rien de plus. D_KL = 0 bit dans les deux sens — c'est le seul cas ou l'egalite de Gibbs devient une egalite stricte.",
        ['A', 'B', 'C', 'D'],
        [0.25, 0.25, 0.25, 0.25],
        [0.25, 0.25, 0.25, 0.25],
      ),
      buildContinuousCard(
        'Deux gaussiennes decalees (meme variance)',
        'P = N(0, 1), Q = N(2, 1). Meme forme, moyennes differentes : la divergence KL croit avec le carre de l’ecart entre les moyennes.',
        "Meme entropie individuelle (meme dispersion), mais decrire l'une avec le code optimal de l'autre coute un surcout en bits qui grandit avec l'ecart entre leurs moyennes. Ici, comme la variance est identique des deux cotes, ce surcout est exactement le meme dans les deux sens (D_KL(P||Q) = D_KL(Q||P)) — un cas particulier ou la KL redevient symetrique.",
        [-6, 8],
        (x) => normalPdf(x, 0, 1),
        (x) => normalPdf(x, 2, 1),
      ),
      buildContinuousCard(
        'Gaussienne etroite vs uniforme large',
        "P = N(0, 0.2) tres concentree (entropie differentielle negative), Q = uniforme sur [-4, 4] tres etalee. Illustre qu'une entropie differentielle peut etre negative, contrairement a l'entropie discrete.",
        "H(P) < 0 : P est si concentree qu'elle porte tres peu d'incertitude a l'echelle choisie (rappel : contrairement au cas discret, ce n'est pas une anomalie). Coder P avec le code large de Q coute un peu plus cher (petit D_KL), mais l'inverse est catastrophique : Q place beaucoup de masse la ou P est quasiment nulle, donc coder Q avec le code etroit de P coute un nombre de bits enorme (D_KL(Q||P) tres grand) — exemple extreme de l'asymetrie de la divergence KL.",
        [-5, 5],
        (x) => normalPdf(x, 0, 0.2),
        (x) => uniformPdf(x, -4, 4),
      ),
    ],
    [],
  );

  return (
    <div className={styles.step}>
      <h2>Etape 3 : galerie d'exemples</h2>
      <p className={styles.description}>
        Quelques cas classiques pour ancrer l'intuition, en variables discretes et continues : symetrie parfaite,
        asymetrie de la divergence KL, et entropie differentielle negative.
      </p>

      <div className={styles.galleryGrid}>
        {cards.map((card) => (
          <div key={card.title} className={styles.galleryCard}>
            <h3>{card.title}</h3>
            <p className={styles.description}>{card.description}</p>
            <DistributionChart series={card.series} width={380} height={240} />
            <div className={styles.resultsGrid}>
              <div className={styles.resultChip}>
                <span className={styles.resultLabel}>H(P)</span>
                <span className={styles.resultValue}>{card.Hp.toFixed(3)}</span>
              </div>
              <div className={styles.resultChip}>
                <span className={styles.resultLabel}>H(Q)</span>
                <span className={styles.resultValue}>{card.Hq.toFixed(3)}</span>
              </div>
              <div className={styles.resultChip}>
                <span className={styles.resultLabel}>H(P,Q)</span>
                <span className={styles.resultValue}>{card.crossPQ.toFixed(3)}</span>
              </div>
              <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
                <span className={styles.resultLabel}>D_KL(P&#8214;Q)</span>
                <span className={styles.resultValue}>{card.klPQ.toFixed(3)}</span>
              </div>
              <div className={`${styles.resultChip} ${styles.resultHighlight}`}>
                <span className={styles.resultLabel}>D_KL(Q&#8214;P)</span>
                <span className={styles.resultValue}>{card.klQP.toFixed(3)}</span>
              </div>
            </div>
            <p className={styles.interpretation}>{card.interpretation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
