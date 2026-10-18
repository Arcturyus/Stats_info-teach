import type { PcaDataset } from './types';

export const DATASETS: PcaDataset[] = [
  {
    id: 'inca3',
    name: 'Taille et poids',
    variableNames: ['Taille (cm)', 'Poids (kg)'],
    source: {
      label: 'INCA3 · France',
      url: 'https://www.data.gouv.fr/datasets/donnees-de-consommations-et-habitudes-alimentaires-de-letude-inca-3',
    },
  },
  {
    id: 'pisa2022',
    name: 'Mathématiques, sciences et compréhension de l’écrit',
    variableNames: ['Mathématiques', 'Sciences', 'Compréhension de l’écrit'],
    source: {
      label: 'PISA 2022',
      url: 'https://www.oecd.org/en/data/datasets/pisa-2022-database.html',
    },
  },
];
