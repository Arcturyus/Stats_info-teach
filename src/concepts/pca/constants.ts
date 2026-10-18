import type { PcaDataset } from './types';

export const DATASET_2D: PcaDataset = {
  name: 'INCA3 · Taille et poids (10 profils simulés)',
  description: 'Profils d’adultes simulés, calibrés sur les statistiques françaises de 2014–2015.',
  variableNames: ['Taille (cm)', 'Poids (kg)'],
  methodNote:
    'Ces 10 lignes sont simulées, pas des personnes de l’enquête. Moyennes et écarts-types calibrés sur les adultes français de 18–79 ans mesurés par INCA3 : taille 168,8 ± 9,5 cm; poids 73,6 ± 16,9 kg. Le jeu illustre r ≈ 0,47; ce n’est pas une estimation directe de la corrélation française, non publiée dans ces tableaux. Comme repère, les corrélations individuelles par sexe et âge mesurées par le CDC sont de 0,39 à 0,46 chez les hommes et de 0,25 à 0,29 chez les femmes.',
  sources: [
    {
      label: 'ANSES, étude INCA3, tableaux 19 et 20',
      url: 'https://www.anses.fr/fr/system/files/NUT2014SA0234Ra.pdf',
    },
    {
      label: 'CDC/NCHS, corrélations taille–poids par sexe et âge',
      url: 'https://www.cdc.gov/nchs/data/series/sr_11/sr11_230acc.pdf',
    },
  ],
  data: [
    [166.1, 84.9],
    [155.2, 72.7],
    [177.0, 68.4],
    [160.6, 78.8],
    [182.4, 74.5],
    [171.5, 62.3],
    [157.9, 47.0],
    [179.7, 100.2],
    [163.4, 53.1],
    [174.2, 94.1],
  ],
};

export const DATASET_3D: PcaDataset = {
  name: 'PISA 2022 · 3 compétences (10 profils simulés)',
  description: 'Scores sur l’échelle PISA, centrés sur les moyennes françaises de 2022.',
  variableNames: ['Mathématiques', 'Compréhension de l’écrit', 'Sciences'],
  methodNote:
    'Les 10 lignes sont simulées, pas des dossiers d’élèves. Elles reprennent les moyennes françaises (474, 474, 487) et écarts-types (91, 106, 103) publiés par l’OCDE pour PISA 2022. Les corrélations françaises publiées sont : maths–écrit 0,84, maths–sciences 0,88, écrit–sciences 0,72. PISA évalue la compréhension de l’écrit et la culture scientifique, pas les notes de français ou de physique.',
  sources: [
    {
      label: 'Scores et écarts-types France, PISA 2022',
      url: 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2023/12/pisa-2022-results-volume-i_76772a36/53f23881-en.pdf',
    },
    {
      label: 'Corrélations françaises par domaine, annexe 14.A.16',
      url: 'https://www.oecd-ilibrary.org/content/dam/oecd/en/publications/reports/2024/03/pisa-2022-technical-report_599753f0/01820d6d-en.pdf',
    },
  ],
  data: [
    [500.0, 447.0, 578.9],
    [343.9, 387.0, 374.2],
    [552.1, 504.0, 564.2],
    [395.9, 444.0, 459.9],
    [604.1, 561.0, 627.7],
    [448.0, 501.0, 445.3],
    [369.9, 304.5, 283.7],
    [578.1, 643.5, 550.9],
    [421.9, 361.5, 475.3],
    [526.1, 586.5, 509.8],
  ],
};

export const DATASETS: PcaDataset[] = [DATASET_2D, DATASET_3D];
