import { Fragment } from 'react';
import { axisClass, quantityClass as q } from './quantityColors';
export default function ComponentDetails({ index, names, vector, eigenvalue, variance, cumulative, arrow = false }: {
  index: number; names: string[]; vector: number[]; eigenvalue: number; variance: number; cumulative: number; arrow?: boolean;
}) {
  const f = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
  return <><strong className={axisClass(index)}>CP{index + 1} · axe principal {index + 1}</strong>
    <p>Valeur propre λ = <span className={axisClass(index)}>{f(eigenvalue)}</span><br />Variance expliquée : <span className={axisClass(index)}>{f(variance * 100)} %</span><br />Cumul jusqu’à cet axe : {f(cumulative * 100)} %</p>
    <strong>Coefficients sur les variables réduites Z</strong>
    {names.map((name, j) => <p key={j}><span className={q(j)}>{name}</span> : <span className={q(j, 'coefficient')}>{f(vector[j])}</span></p>)}
    <p><b className={axisClass(index)}>CP{index + 1}</b> = {vector.map((v, j) => <Fragment key={j}>{j > 0 && ' + '}(<span className={q(j, 'coefficient')}>{f(v)}</span>) × <span className={q(j)}>Z{j + 1}</span></Fragment>)}</p>
    <p>Le signe global d’un axe est arbitraire. {arrow && 'Les flèches sont allongées de 1,5 × √λ pour leur visibilité.'}</p>
  </>;
}
