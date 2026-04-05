import type { PcaDataset } from './types';

export const DATASET_2D: PcaDataset = {
  name: 'Exemple 2D simple',
  description: 'Taille et poids de 10 individus - corrélation visible.',
  variableNames: ['Taille (cm)', 'Poids (kg)'],
  data: [
    [160, 55],
    [165, 60],
    [170, 65],
    [175, 72],
    [180, 78],
    [158, 52],
    [172, 68],
    [168, 62],
    [182, 82],
    [176, 74],
  ],
};

export const DATASET_3D: PcaDataset = {
  name: 'Exemple 3 variables',
  description: 'Notes de 12 étudiants en Maths, Physique et Français.',
  variableNames: ['Maths', 'Physique', 'Français'],
  data: [
    [14, 13, 10],
    [16, 15, 8],
    [12, 11, 12],
    [18, 17, 7],
    [10, 9, 14],
    [15, 14, 9],
    [8, 7, 16],
    [17, 16, 6],
    [11, 10, 13],
    [13, 12, 11],
    [19, 18, 5],
    [9, 8, 15],
  ],
};

export const DATASETS: PcaDataset[] = [DATASET_2D, DATASET_3D];
