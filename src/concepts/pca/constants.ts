import type { PcaDataset } from './types';

// Profils pédagogiques fictifs, aux tailles et corpulences plausibles.
// INCA3 fournit les repères marginaux; r ≈ 0,60 ici n'est pas une estimation nationale.
export const DATASET_2D: PcaDataset = {
  name: 'Taille et poids',
  description: 'Exemple pédagogique inspiré des données',
  variableNames: ['Taille (cm)', 'Poids (kg)'],
  source: {
    label: 'INCA3',
    url: 'https://www.anses.fr/fr/system/files/NUT2014SA0234Ra.pdf',
  },
  data: [
    [163, 59],
    [178, 77],
    [169, 71],
    [156, 65],
    [184, 87],
    [173, 64],
    [165, 81],
    [180, 75],
    [170, 90],
    [160, 55],
  ],
};

// Notes pédagogiques sur 20, pas des dossiers d'élèves PISA. Les domaines
// maths/sciences/lecture inspirent les relations maths/physique/français.
// Repères France : 0,88 / 0,84 / 0,72 (rapport technique PISA 2022, annexe 14.A.16).
// Les profils gardent une dispersion naturelle plutôt que des corrélations exactes.
export const DATASET_3D: PcaDataset = {
  name: 'Maths, physique et français',
  description: 'Exemple pédagogique inspiré des données',
  variableNames: ['Maths', 'Physique', 'Français'],
  source: {
    label: 'PISA 2022',
    url: 'https://www.oecd-ilibrary.org/content/dam/oecd/en/publications/reports/2024/03/pisa-2022-technical-report_599753f0/01820d6d-en.pdf',
  },
  data: [
    [8, 8.5, 9.5],
    [12.5, 12.5, 15],
    [15, 17.5, 15],
    [13, 11.5, 11.5],
    [10, 12, 11],
    [8, 9, 7],
    [11, 9.5, 13.5],
    [10.5, 11, 10],
    [12, 11.5, 13.5],
    [13.5, 17, 14],
  ],
};

export const DATASETS: PcaDataset[] = [DATASET_2D, DATASET_3D];
