import { Fragment } from 'react';
import type { PcaResult } from './types';
import { axisClass, quantityClass as q } from './quantityColors';
import ColorLegend from './ColorLegend';

const f = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 3, minimumFractionDigits: 3 });

export default function PointDetails({ index, names, raw, result, stage = 'raw' }: {
  index: number; names: string[]; raw?: number[]; result?: PcaResult;
  stage?: 'raw' | 'centered' | 'normalized' | 'projection';
}) {
  const original = raw ?? result!.centeredData[index].map((value, j) => value + result!.means[j]);
  const transformed = stage === 'centered' ? result?.centeredData[index] : result?.normalizedData[index];
  return <>
    <strong>Individu n° {index + 1} · ligne {index + 1} du tableau</strong>
    <table><thead><tr><th>Variable</th><th>Initiale X</th>{stage !== 'raw' && <th>{stage === 'centered' ? 'Centrée X̃' : 'Réduite Z'}</th>}</tr></thead>
      <tbody>{names.map((name, j) => <tr key={j}>
        <td className={q(j)}>{name}</td><td><span className={q(j, 'x')}>{f(original[j])}</span></td>
        {stage !== 'raw' && <td><span className={q(j, stage === 'centered' ? 'centered' : 'z')}>{stage !== 'centered' && result!.stdDevs[j] === 0 ? 'Non définie' : f(transformed![j])}</span></td>}
      </tr>)}</tbody></table>
    {result && stage === 'centered' && <><strong>Centrage : X̃ = X − moyenne</strong>{names.map((name, j) => <p key={j}>
      <span className={q(j)}>{name}</span> : <span className={q(j, 'x')}>{f(original[j])}</span> − (<span className={q(j, 'mean')}>{f(result.means[j])}</span>) ≈ <span className={q(j, 'centered')}>{f(result.centeredData[index][j])}</span>
    </p>)}</>}
    {result && stage !== 'raw' && stage !== 'centered' && <><strong>Réduction : Z = (X − moyenne) / σ</strong>{names.map((name, j) => <p key={j}>
      <span className={q(j)}>{name}</span> : {result.stdDevs[j] === 0 ? 'σ = 0, variable constante ; réduction non définie (le calcul utilise 0 par convention).' : <>
        (<span className={q(j, 'x')}>{f(original[j])}</span> − (<span className={q(j, 'mean')}>{f(result.means[j])}</span>)) / <span className={q(j, 'std')}>{f(result.stdDevs[j])}</span> ≈ <span className={q(j)}>{f(result.normalizedData[index][j])}</span>
      </>}
    </p>)}</>}
    {result && stage === 'projection' && <>
      <strong>Projection : CPₖ = Σⱼ Zⱼ × vₖⱼ</strong>
      {result.projectedData[index].map((score, k) => <p key={k}>
        <b className={axisClass(k)}>CP{k + 1} ≈ {f(score)}</b><br />
        {result.normalizedData[index].map((value, j) => <Fragment key={j}>{j > 0 && ' + '}(<span className={q(j)} title={`Z${j + 1} : ${names[j]}`}>{f(value)}</span>) × (<span className={q(j, 'coefficient')} title={`Coefficient de ${names[j]} sur CP${k + 1}`}>{f(result.eigenvectors[k][j])}</span>)</Fragment>)} ≈ <b className={axisClass(k)}>{f(score)}</b>
      </p>)}
      <p>Produits dans l’ordre des variables ci-dessus. Valeurs affichées arrondies ; calcul avec la précision complète.</p>
    </>}
    <ColorLegend names={names} compact={stage !== 'projection'} />
  </>;
}
