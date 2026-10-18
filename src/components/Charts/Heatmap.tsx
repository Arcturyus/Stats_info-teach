import { useChartTooltip } from './useChartTooltip';
import * as d3 from 'd3';
import styles from './Heatmap.module.css';

interface HeatmapProps {
  matrix: number[][];
  labels: string[];
  width?: number;
  precision?: number;
}

// A correlation keeps the same colour across datasets and after editing a value.
const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]).clamp(true);
const ticks = [-1, -0.5, 0, 0.5, 1];
const gradient = `linear-gradient(to right, ${Array.from({ length: 21 }, (_, i) => colorScale(-1 + i / 10)).join(', ')})`;

function textColor(background: string): string {
  const { r, g, b } = d3.rgb(background);
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance < 0.179 ? '#fff' : '#000';
}

export default function Heatmap({ matrix, labels, width = 480, precision = 3 }: HeatmapProps) {
  const { id, show, hide, tooltip } = useChartTooltip(matrix);
  if (matrix.length === 0) return null;

  return (
    <figure className={styles.container} style={{ maxWidth: width }}>
      {tooltip}
      <table className={styles.matrix} aria-label="Heatmap des corrélations" lang="fr">
        <colgroup>
          <col style={{ width: '30%' }} />
          <col span={matrix.length} />
        </colgroup>
        <thead>
          <tr>
            <td />
            {labels.map((label, index) => (
              <th key={index} scope="col" className={styles.columnLabel}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th scope="row" className={styles.rowLabel}>{labels[i]}</th>
              {row.map((value, j) => {
                const background = colorScale(value);
                return (
                  <td key={j} className={styles.cell}>
                    <div
                      className={styles.value}
                      style={{ background, color: textColor(background) }}
                      tabIndex={0}
                      aria-label={`${labels[i]} / ${labels[j]} : ${value.toFixed(6)}`}
                      aria-describedby={id}
                      onMouseMove={(event) => show(event.clientX, event.clientY, <><strong>{labels[i]} × {labels[j]}</strong><p>R[{i + 1}, {j + 1}] = {value.toFixed(6)}</p><p>{i === j ? 'Corrélation d’une variable avec elle-même : 1.' : value > 0 ? 'Liaison linéaire positive : les valeurs tendent à augmenter ensemble.' : value < 0 ? 'Liaison linéaire négative : quand l’une augmente, l’autre tend à diminuer.' : 'Aucune liaison linéaire dans cet échantillon.'}</p><p>Échelle de couleur fixe : −1 à +1. Une corrélation ne prouve pas une causalité.</p></>)}
                      onMouseLeave={hide}
                      onFocus={(event) => { const box = event.currentTarget.getBoundingClientRect(); show(box.x, box.y, <><strong>{labels[i]} × {labels[j]}</strong><p>R[{i + 1}, {j + 1}] = {value.toFixed(6)}</p><p>Corrélation linéaire ; échelle fixe de −1 à +1.</p></>); }}
                      onBlur={hide}
                    >
                      {value.toFixed(precision)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className={styles.legend} aria-label="Échelle fixe des corrélations de −1 à 1">
        <span className={styles.legendTitle}>Corrélation</span>
        <div className={styles.gradient} style={{ background: gradient }} />
        <div className={styles.ticks}>
          {ticks.map((value) => <span key={value}>{value.toLocaleString('fr-FR')}</span>)}
        </div>
      </figcaption>
    </figure>
  );
}
