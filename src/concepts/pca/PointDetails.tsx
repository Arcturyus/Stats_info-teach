import type { PcaResult } from './types';

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
      <tbody>{names.map((name, j) => <tr key={j}><td>{name}</td><td>{f(original[j])}</td>{stage !== 'raw' && <td>{stage !== 'centered' && result!.stdDevs[j] === 0 ? 'Non définie' : f(transformed![j])}</td>}</tr>)}</tbody></table>
    {result && stage === 'centered' && <><strong>Centrage : X̃ = X − moyenne</strong>{names.map((name, j) => <p key={j}>{name} : {f(original[j])} − ({f(result.means[j])}) ≈ {f(result.centeredData[index][j])}</p>)}</>}
    {result && stage !== 'raw' && stage !== 'centered' && <><strong>Réduction : Z = (X − moyenne) / σ</strong>{names.map((name, j) => <p key={j}>{result.stdDevs[j] === 0 ? `${name} : σ = 0, variable constante ; réduction non définie (le calcul utilise 0 par convention).` : `${name} : (${f(original[j])} − (${f(result.means[j])})) / ${f(result.stdDevs[j])} ≈ ${f(result.normalizedData[index][j])}`}</p>)}</>}
    {result && stage === 'projection' && <>
      <strong>Projection : CPₖ = Σⱼ Zⱼ × vₖⱼ</strong>
      {result.projectedData[index].map((score, k) => <p key={k}><strong>CP{k + 1} ≈ {f(score)}</strong><br />{result.normalizedData[index].map((value, j) => `(${f(value)}) × (${f(result.eigenvectors[k][j])})`).join(' + ')} ≈ {f(score)}</p>)}
      <p>Produits dans l’ordre des variables ci-dessus. Valeurs affichées arrondies ; calcul avec la précision complète.</p>
    </>}
  </>;
}
