import PageShell from '../../components/Layout/PageShell';
import StepNavigator from '../../components/StepNavigator/StepNavigator';
import { usePca } from './usePca';
import { DATASETS } from './constants';
import StepRawData from './steps/StepRawData';
import StepCentered from './steps/StepCentered';
import StepNormalized from './steps/StepNormalized';
import StepCorrelation from './steps/StepCorrelation';
import StepEigen from './steps/StepEigen';
import StepProjection from './steps/StepProjection';
import styles from './PcaPage.module.css';
import acpGenesImg from '../../assets/ACP_genes_europes_2008.jpg';

const STEPS = [
  { label: 'Donnees brutes', shortLabel: 'Donnees' },
  { label: 'Centrage', shortLabel: 'Centrage' },
  { label: 'Normalisation', shortLabel: 'Norm.' },
  { label: 'Correlation', shortLabel: 'Corr.' },
  { label: 'Valeurs propres', shortLabel: 'Eigen' },
  { label: 'Projection', shortLabel: 'Proj.' },
];

export function Component() {
  const pca = usePca();

  const renderStep = () => {
    if (!pca.result) {
      return (
        <div className={styles.error}>
          Donnees insuffisantes. Il faut au moins 2 observations et 2 variables.
        </div>
      );
    }

    switch (pca.step) {
      case 0:
        return (
          <StepRawData
            rawData={pca.rawData}
            variableNames={pca.variableNames}
            result={pca.result}
            onDataChange={pca.setRawData}
          />
        );
      case 1:
        return <StepCentered variableNames={pca.variableNames} result={pca.result} />;
      case 2:
        return <StepNormalized variableNames={pca.variableNames} result={pca.result} />;
      case 3:
        return <StepCorrelation variableNames={pca.variableNames} result={pca.result} />;
      case 4:
        return <StepEigen variableNames={pca.variableNames} result={pca.result} />;
      case 5:
        return <StepProjection variableNames={pca.variableNames} result={pca.result} />;
      default:
        return null;
    }
  };

  return (
    <PageShell
      title="Analyse en Composantes Principales (ACP)"
      subtitle="Reduction de dimension par maximisation de la variance"
      breadcrumbs={[
        { label: 'Accueil', to: '/' },
        { label: 'ACP' },
      ]}
    >
      <div className={styles.historyNote}>
        L'ACP a été introduite par Harold Hotelling en 1933, dans son article <em>Analysis of a complex of statistical variables into principal components</em>. Il s'inspirait des travaux de Karl Pearson (1901) sur les droites d'ajustement en dimension quelconque. L'objectif était de résumer un grand nombre de variables corrélées en un petit nombre de composantes indépendantes, qui capturent l'essentiel de la variabilité des données.
      </div>

      <div className={styles.datasetSelector}>
        <label>Jeu de donnees :</label>
        <select
          value={pca.datasetIndex}
          onChange={(e) => pca.selectDataset(Number(e.target.value))}
        >
          {DATASETS.map((ds, i) => (
            <option key={i} value={i}>
              {ds.name}
            </option>
          ))}
        </select>
        <span className={styles.datasetDesc}>
          {DATASETS[pca.datasetIndex].description}
        </span>
      </div>

      <StepNavigator
        steps={STEPS}
        currentStep={pca.step}
        onStepChange={pca.setStep}
      />

      {renderStep()}

      <div className={styles.caseStudy}>
        <h2>Application : la génétique des populations européennes (2008)</h2>
        <p>
          En 2008, Novembre <em>et al.</em> ont publié dans <em>Nature</em> une illustration frappante de l'ACP appliquée à la génétique humaine. En analysant ~500 000 SNPs (variants génétiques) chez 1 387 Européens, les deux premières composantes principales reproduisent remarquablement la carte géographique de l'Europe — révélant que la structure génétique d'une population reflète sa position géographique.
        </p>
        <figure className={styles.caseStudyFigure}>
          <img src={acpGenesImg} alt="ACP des gènes européens, Novembre et al. 2008" />
          <figcaption>
            Projection des individus sur les deux premières composantes principales. Source :{' '}
            <a href="https://www.nature.com/articles/nature07331" target="_blank" rel="noopener noreferrer">
              Novembre et al., <em>Nature</em> 456, 98–101 (2008)
            </a>
          </figcaption>
        </figure>
      </div>
    </PageShell>
  );
}
