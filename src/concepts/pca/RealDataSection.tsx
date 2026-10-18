import ComponentDetails from './ComponentDetails';
import { useEffect, useId, useState } from 'react';
import { interpolateYlOrRd } from 'd3';
import MatrixDisplay from '../../components/Math/MatrixDisplay';
import VectorDisplay from '../../components/Math/VectorDisplay';
import { BlockMath } from '../../components/Math/KatexRenderer';
import Heatmap from '../../components/Charts/Heatmap';
import BarChart from '../../components/Charts/BarChart';
import styles from './RealDataSection.module.css';

interface RealReport {
  title: string;
  population: string;
  sampleSize: number;
  means: number[];
  standardDeviations: number[];
  variableNames: string[];
  method: string;
  axisInterpretations: string[];
  details: string[];
  sources: { label: string; url: string }[];
  correlationMatrix: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  varianceExplained: number[];
  cumulativeVariance: number[];
  density: { bounds: [number, number][]; counts: number[][] };
}

const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});

function ProjectionDensity({ report }: { report: RealReport }) {
  const gradientId = useId();
  const { bounds, counts } = report.density;
  const bins = counts.length;
  const max = Math.max(...counts.flat());
  const plot = { x: 68, y: 24, width: 430, height: 290 };
  const x = (value: number) => plot.x + (value - bounds[0][0]) / (bounds[0][1] - bounds[0][0]) * plot.width;
  const y = (value: number) => plot.y + plot.height - (value - bounds[1][0]) / (bounds[1][1] - bounds[1][0]) * plot.height;
  const ticks = (i: number) => Array.from({ length: 5 }, (_, j) => bounds[i][0] + j / 4 * (bounds[i][1] - bounds[i][0]));
  return (
    <figure className={styles.density}>
      <svg viewBox="0 0 620 380" role="img" aria-label={`Projection de ${report.sampleSize} individus sur CP1 et CP2, par densité pondérée`}>
        <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} fill="var(--color-bg-card)" stroke="var(--color-border)" />
        {counts.flatMap((column, i) => column.map((mass, j) => mass > 0 && (
          <rect key={`${i}-${j}`} x={plot.x + i / bins * plot.width}
            y={plot.y + (bins - j - 1) / bins * plot.height}
            width={plot.width / bins + .1} height={plot.height / bins + .1}
            fill={interpolateYlOrRd(.08 + .92 * Math.log1p(mass) / Math.log1p(max))}>
            <title>{`CP1 : ${number(bounds[0][0] + i / bins * (bounds[0][1] - bounds[0][0]), 3)} à ${number(bounds[0][0] + (i + 1) / bins * (bounds[0][1] - bounds[0][0]), 3)}\nCP2 : ${number(bounds[1][0] + j / bins * (bounds[1][1] - bounds[1][0]), 3)} à ${number(bounds[1][0] + (j + 1) / bins * (bounds[1][1] - bounds[1][0]), 3)}\n${number(mass / report.sampleSize * 100, 3)} % de la masse pondérée. Chaque cellule regroupe les observations de cet intervalle ; ce pourcentage n’est pas un effectif brut.`}</title>
          </rect>
        )))}
        <g stroke="var(--color-text-muted)" strokeDasharray="3 4" opacity=".55">
          <line x1={x(0)} x2={x(0)} y1={plot.y} y2={plot.y + plot.height} />
          <line x1={plot.x} x2={plot.x + plot.width} y1={y(0)} y2={y(0)} />
        </g>
        <g fill="var(--color-text)" fontSize="12">
          {ticks(0).map((t) => <text key={t} x={x(t)} y={plot.y + plot.height + 20} textAnchor="middle">{number(t)}</text>)}
          {ticks(1).map((t) => <text key={t} x={plot.x - 10} y={y(t) + 4} textAnchor="end">{number(t)}</text>)}
          <text x={plot.x + plot.width / 2} y="365" textAnchor="middle">CP1 · {number(report.varianceExplained[0] * 100)} %</text>
          <text transform="translate(18,170) rotate(-90)" textAnchor="middle">CP2 · {number(report.varianceExplained[1] * 100)} %</text>
          <text x="530" y="18">Densité</text>
          <text x="552" y="44">{number(max / report.sampleSize * 100, 2)} %</text>
          <text x="552" y="314">0 %</text>
        </g>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            {Array.from({ length: 11 }, (_, i) => <stop key={i} offset={`${i * 10}%`} stopColor={interpolateYlOrRd(.08 + .92 * i / 10)} />)}
          </linearGradient>
        </defs>
        <rect x="530" y="52" width="15" height="250" fill={`url(#${gradientId})`} />
      </svg>
      <figcaption>Tous les individus contribuent à la projection. Couleur : part pondérée par cellule, intensité logarithmique ; les cellules vides restent sans couleur.</figcaption>
    </figure>
  );
}

export default function RealDataSection({ datasetIndex, step }: { datasetIndex: number; step: number }) {
  const id = datasetIndex === 0 ? 'inca3' : 'pisa2022';
  const [reports, setReports] = useState<Record<string, RealReport>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/pca/${id}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Missing survey summary');
        return response.json() as Promise<RealReport>;
      })
      .then((report) => setReports((previous) => ({ ...previous, [id]: report })))
      .catch(() => { /* A real-data section is optional when no source is available. */ });
    return () => controller.abort();
  }, [id]);
  const report = reports[id];
  if (!report || step < 1) return null;
  const labels = report.eigenvalues.map((_, i) => `CP${i + 1}`);
  const roundedEigenvalues = report.eigenvalues.map((value) => Number(value.toFixed(3)).toFixed(3));

  return (
    <section className={styles.section} aria-label="ACP sur les données réelles">
      <h2>Données réelles · {report.title}</h2>
      <p className={styles.population}>{report.population}</p>
      <p><strong className={styles.count}>N = {number(report.sampleSize, 0)} personnes</strong></p>
      <p>{step < 3 ? 'Statistiques pondérées calculées sur toutes les personnes retenues dans l’enquête.' : report.method}</p>

      {(step === 1 || step === 2) && (
        <>
          <h3>{step === 1 ? 'Vecteur des moyennes' : 'Vecteur des écarts-types'}</h3>
          <div className={styles.chart}>
            <VectorDisplay vector={step === 1 ? report.means : report.standardDeviations}
              label={step === 1 ? '\\bar{X}' : '\\sigma'} horizontal precision={3} />
          </div>
          <p className={styles.muted}>Ordre : {report.variableNames.join(' · ')}.</p>
          {step === 2 && <p className={styles.muted}>Écarts-types des variables d’origine, avant réduction.</p>}
          {id === 'pisa2022' && <p className={styles.muted}>Scores en points PISA. Chaque statistique est calculée séparément pour chacun des dix jeux de valeurs plausibles, puis moyennée.</p>}
        </>
      )}

      {step === 3 && (
        <div className={styles.grid}>
          <div><h3>Matrice R</h3><MatrixDisplay matrix={report.correlationMatrix} label="R" precision={3} />
            <p className={styles.muted}>Ordre : {report.variableNames.join(' · ')}.</p></div>
          <div><h3>Heatmap des corrélations</h3><Heatmap matrix={report.correlationMatrix} labels={report.variableNames} /></div>
        </div>
      )}

      {step === 4 && (
        <>
          <h3>Variance expliquée et axes principaux</h3>
          <p>CP1 représente <strong>{number(report.varianceExplained[0] * 100)} %</strong> de la variance.
            {' '}Le plan CP1–CP2 en conserve <strong>{number(report.cumulativeVariance[1] * 100)} %</strong>.</p>
          <div className={styles.chart}>
            <BlockMath math={`\\frac{${roundedEigenvalues[0]}}{${roundedEigenvalues.join(' + ')}}\\times 100\\approx ${(report.varianceExplained[0] * 100).toFixed(1)}\\%`} />
          </div>
          <div className={styles.chart}><BarChart values={report.varianceExplained} barTooltip={(i) => <ComponentDetails index={i} names={report.variableNames} vector={report.eigenvectors[i]} eigenvalue={report.eigenvalues[i]} variance={report.varianceExplained[i]} cumulative={report.cumulativeVariance[i]} />} labels={labels} yLabel="Variance expliquée" showLine={{ data: report.cumulativeVariance, label: 'Cumul' }} /></div>
          <div className={styles.tableWrap}>
            <table className={styles.axes}>
              <caption>Coefficients des axes sur les variables centrées réduites Z</caption>
              <thead><tr><th scope="col">Axe</th>{report.variableNames.map((name) => <th key={name} scope="col">{name}</th>)}<th scope="col">Valeur propre λ</th><th scope="col">Variance</th></tr></thead>
              <tbody>{report.eigenvectors.map((vector, i) => <tr key={i}><th scope="row">CP{i + 1}</th>{vector.map((value, j) => <td key={j} title={`Coefficient de ${report.variableNames[j]} dans CP${i + 1} : ${number(value, 6)}. Multiplier ce coefficient par la variable centrée réduite Z${j + 1}.`}>{number(value, 3)}</td>)}<td>{number(report.eigenvalues[i], 3)}</td><td>{number(report.varianceExplained[i] * 100)} %</td></tr>)}</tbody>
            </table>
          </div>
          <div className={styles.formulas}>{report.eigenvectors.map((vector, i) => (
            <p key={i}><strong>CP{i + 1}</strong> = {vector.map((value, j) => `${j === 0 ? (value < 0 ? '−' : '') : (value < 0 ? ' − ' : ' + ')}${number(Math.abs(value), 3)} × Z(${report.variableNames[j]})`).join('')}</p>
          ))}</div>
          <p className={styles.muted}>Chaque Z est la variable centrée et réduite avec les pondérations de l’enquête. Le signe global d’un axe peut être inversé sans changer l’ACP.</p>
          <ul className={styles.interpretation}>{report.axisInterpretations.map((text) => <li key={text}>{text}</li>)}</ul>
        </>
      )}

      {step === 5 && (
        <><h3>Projection de l’ensemble des individus</h3>
          <p>Le plan CP1–CP2 conserve <strong>{number(report.cumulativeVariance[1] * 100)} %</strong> de la variance.</p>
          <ProjectionDensity report={report} />
        </>
      )}

      <details className={styles.methods}>
        <summary>Sources et méthode de calcul</summary>
        {report.details.map((detail, i) => <p key={i}>{detail}</p>)}
        <ul>{report.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul>
      </details>
    </section>
  );
}
