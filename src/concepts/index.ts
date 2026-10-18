import type { ConceptMeta } from '../types/concept';

export const CONCEPT_LIST: ConceptMeta[] = [
  {
    slug: 'pca',
    title: 'Analyse en Composantes Principales (ACP)',
    description:
      'Reduction de dimension par diagonalisation de la matrice de correlation. Visualisez chaque etape : centrage, normalisation, valeurs propres et projection.',
    category: 'statistics',
    difficulty: 'L3',
    icon: '\u{1F4CA}',
  },
  {
    slug: 'entropy',
    title: 'Entropie, entropie croisee et divergence KL',
    description:
      'Mesurez l\'incertitude d\'une distribution (discrete ou continue) personnalisable, puis comparez deux distributions via l\'entropie croisee et la divergence de Kullback-Leibler.',
    category: 'probability',
    difficulty: 'M1',
    icon: '\u{1F3B2}',
  },
  {
    slug: 'causalite',
    title: 'Inférence causale : DAG, interventions et contrefactuels',
    description:
      'Passez de la corrélation à la question « que se passerait-il si… ? » avec des graphes causaux, des modèles structurels, des heatmaps et des exercices corrigés.',
    category: 'inference',
    difficulty: 'L3',
    icon: '\u{1F578}\uFE0F',
  },
];
