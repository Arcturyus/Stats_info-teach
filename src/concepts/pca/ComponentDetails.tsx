export default function ComponentDetails({ index, names, vector, eigenvalue, variance, cumulative, arrow = false }: {
  index: number; names: string[]; vector: number[]; eigenvalue: number; variance: number; cumulative: number; arrow?: boolean;
}) {
  const f = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 4 });
  return <><strong>CP{index + 1} · axe principal {index + 1}</strong>
    <p>Valeur propre λ = {f(eigenvalue)}<br />Variance expliquée : {f(variance * 100)} %<br />Cumul jusqu’à cet axe : {f(cumulative * 100)} %</p>
    <strong>Coefficients sur les variables réduites Z</strong>
    {names.map((name, j) => <p key={j}>{name} : {f(vector[j])}</p>)}
    <p>CP{index + 1} = {vector.map((v, j) => `(${f(v)}) × Z${j + 1}`).join(' + ')}</p>
    <p>Le signe global d’un axe est arbitraire. {arrow && 'Les flèches sont allongées de 1,5 × √λ pour leur visibilité.'}</p>
  </>;
}
