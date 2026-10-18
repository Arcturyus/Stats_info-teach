import { quantityClass } from './quantityColors';

export default function ColorLegend({ names, compact = false }: { names: string[]; compact?: boolean }) {
  return <>
    <div className="pca-color-legend" aria-label="Couleur de chaque variable">{names.map((name, j) => <span key={j} className={quantityClass(j)}>{name}</span>)}</div>
    <p className="pca-color-key">Même couleur = même variable. X : ton doux · X̃ : intermédiaire · <b>Z : ton accentué et gras</b>{!compact && ' · coefficient de l’axe : souligné en pointillés'}. Les noms et symboles restent indiqués.</p>
  </>;
}
