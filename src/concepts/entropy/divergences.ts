// Famille de divergences / distances entre distributions, toutes evaluees sur une
// meme grille. Les fonctions acceptent soit des vecteurs de probabilites discrets
// (laisser dx = 1), soit des densites echantillonnees sur une grille reguliere
// (passer le pas dx). Les resultats logarithmiques sont exprimes en bits.

// Seuil de zero "vrai" : on veut distinguer une densite reellement nulle (un support
// borne, comme une loi uniforme) d'une queue de distribution tres fine mais positive
// (une gaussienne loin de sa moyenne). Un seuil trop grand rendrait la KL infinie a tort.
const ZERO = 1e-300;

/** Renormalise une densite echantillonnee pour que son integrale vaille exactement 1. */
export function normalizeDensity(vals: number[], dx: number): number[] {
  const mass = vals.reduce((s, v) => s + v, 0) * dx;
  return mass > 0 ? vals.map((v) => v / mass) : vals;
}

/** Divergence de Kullback-Leibler D_KL(f || g), en bits. Infinie si g s'annule la ou f > 0. */
export function klBits(f: number[], g: number[], dx = 1): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) {
    if (f[i] <= ZERO) continue;
    if (g[i] <= ZERO) return Infinity;
    s += f[i] * Math.log2(f[i] / g[i]) * dx;
  }
  return s;
}

/** Divergence de Jensen-Shannon, en bits. Toujours finie, bornee par 1 bit. */
export function jsBits(f: number[], g: number[], dx = 1): number {
  const m = f.map((v, i) => (v + g[i]) / 2);
  return 0.5 * klBits(f, m, dx) + 0.5 * klBits(g, m, dx);
}

/** Distance en variation totale : (1/2) integrale |f - g|. Dans [0, 1]. */
export function totalVariation(f: number[], g: number[], dx = 1): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) s += Math.abs(f[i] - g[i]) * dx;
  return s / 2;
}

/** Distance de Hellinger : sqrt((1/2) integrale (sqrt(f) - sqrt(g))^2). Dans [0, 1]. */
export function hellinger(f: number[], g: number[], dx = 1): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) {
    const d = Math.sqrt(Math.max(f[i], 0)) - Math.sqrt(Math.max(g[i], 0));
    s += d * d * dx;
  }
  return Math.sqrt(s / 2);
}

/** Divergence du khi-deux de Pearson : integrale (f - g)^2 / g. Infinie si g s'annule la ou f > 0. */
export function chiSquare(f: number[], g: number[], dx = 1): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) {
    if (g[i] <= ZERO) {
      if (f[i] > ZERO) return Infinity;
      continue;
    }
    s += ((f[i] - g[i]) ** 2 / g[i]) * dx;
  }
  return s;
}

/** Distance L2 entre les deux densites : sqrt(integrale (f - g)^2). Depend des unites de x. */
export function l2Distance(f: number[], g: number[], dx = 1): number {
  let s = 0;
  for (let i = 0; i < f.length; i++) s += (f[i] - g[i]) ** 2 * dx;
  return Math.sqrt(s);
}

/**
 * Distance de Wasserstein-1 (« earth mover's distance ») sur un support ordonne :
 * integrale |F(x) - G(x)| ou F et G sont les fonctions de repartition.
 * Contrairement aux f-divergences, elle utilise la geometrie de l'axe des x.
 */
export function wasserstein1(f: number[], g: number[], dx = 1): number {
  let cf = 0;
  let cg = 0;
  let s = 0;
  for (let i = 0; i < f.length; i++) {
    cf += f[i] * dx;
    cg += g[i] * dx;
    s += Math.abs(cf - cg) * dx;
  }
  return s;
}

export interface DivergenceSet {
  kl: number;
  klRev: number;
  js: number;
  tv: number;
  hellinger: number;
  chi2: number;
  l2: number;
  w1: number;
}

/** Calcule d'un coup toutes les divergences entre f et g sur la meme grille. */
export function allDivergences(f: number[], g: number[], dx = 1): DivergenceSet {
  return {
    kl: klBits(f, g, dx),
    klRev: klBits(g, f, dx),
    js: jsBits(f, g, dx),
    tv: totalVariation(f, g, dx),
    hellinger: hellinger(f, g, dx),
    chi2: chiSquare(f, g, dx),
    l2: l2Distance(f, g, dx),
    w1: wasserstein1(f, g, dx),
  };
}

/** Formatage court, avec un symbole dedie pour les valeurs infinies. */
export function fmtDiv(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '\u221E';
  if (v > 1e6) return v.toExponential(1);
  return v.toFixed(digits);
}
