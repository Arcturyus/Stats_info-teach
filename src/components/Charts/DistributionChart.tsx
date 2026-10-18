import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styles from './DistributionChart.module.css';

export interface DiscreteSeries {
  kind: 'discrete';
  name: string;
  color: string;
  labels: string[];
  values: number[];
}

export interface ContinuousSeries {
  kind: 'continuous';
  name: string;
  color: string;
  xs: number[];
  values: number[];
  /** Motif de pointilles SVG, ex. "6,4". */
  dash?: string;
}

export type ChartSeries = DiscreteSeries | ContinuousSeries;

interface DistributionChartProps {
  series: ChartSeries[];
  width?: number;
  height?: number;
  title?: string;
  yLabel?: string;
  xLabel?: string;
  /** Lisse les courbes continues (defaut: true). A desactiver pour des lignes brisees. */
  smooth?: boolean;
  /** Remplit l aire sous les courbes continues (defaut: true). */
  area?: boolean;
  /** Force le haut de l axe des ordonnees (les valeurs au-dela sont tronquees). */
  yMax?: number;
  /** Trace un repere vertical a cette abscisse (mode continu). */
  vLine?: number;
}

export default function DistributionChart({
  series,
  width = 460,
  height = 300,
  title,
  yLabel,
  xLabel,
  smooth = true,
  area = true,
  yMax,
  vLine,
}: DistributionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: title ? 34 : 14, right: 20, bottom: 40, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || series.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-heading)')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(title);
    }

    if (series[0].kind === 'discrete') {
      const discreteSeries = series as DiscreteSeries[];
      const labels = discreteSeries[0].labels;
      const maxVal = d3.max(discreteSeries.flatMap((s) => s.values)) ?? 1;

      const x0 = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.25);
      const x1 = d3
        .scaleBand()
        .domain(discreteSeries.map((s) => s.name))
        .range([0, x0.bandwidth()])
        .padding(0.08);
      const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([innerH, 0]);

      g.append('g')
        .selectAll('line')
        .data(y.ticks(5))
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => y(d))
        .attr('y2', (d) => y(d))
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-opacity', 0.6);

      labels.forEach((label, labelIdx) => {
        const group = g.append('g').attr('transform', `translate(${x0(label)},0)`);
        discreteSeries.forEach((s) => {
          const v = s.values[labelIdx] ?? 0;
          group
            .append('rect')
            .attr('x', x1(s.name)!)
            .attr('y', y(v))
            .attr('width', x1.bandwidth())
            .attr('height', innerH - y(v))
            .attr('fill', s.color)
            .attr('fill-opacity', 0.85)
            .attr('rx', 2);
        });
      });

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x0));
      g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.2f')));
    } else {
      const continuousSeriesList = series as ContinuousSeries[];
      const allXs = continuousSeriesList.flatMap((s) => s.xs);
      const maxVal = d3.max(continuousSeriesList.flatMap((s) => s.values)) ?? 1;

      const x = d3.scaleLinear().domain(d3.extent(allXs) as [number, number]).range([0, innerW]);
      const yTop = yMax ?? maxVal * 1.15;
      const y = d3.scaleLinear().domain([0, yTop]).range([innerH, 0]);
      const curve = smooth ? d3.curveBasis : d3.curveLinear;
      const clampY = (v: number) => y(Math.min(v, yTop));

      g.append('g')
        .selectAll('line')
        .data(y.ticks(5))
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => y(d))
        .attr('y2', (d) => y(d))
        .attr('stroke', 'var(--color-border)')
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-opacity', 0.6);

      continuousSeriesList.forEach((s) => {
        const points: [number, number][] = s.xs.map((xv, i) => [xv, s.values[i]]);

        if (area && !s.dash) {
          const areaGen = d3
            .area<[number, number]>()
            .x((d) => x(d[0]))
            .y0(innerH)
            .y1((d) => clampY(d[1]))
            .curve(curve);
          g.append('path').datum(points).attr('d', areaGen).attr('fill', s.color).attr('fill-opacity', 0.18);
        }

        const line = d3
          .line<[number, number]>()
          .x((d) => x(d[0]))
          .y((d) => clampY(d[1]))
          .curve(curve);

        const path = g
          .append('path')
          .datum(points)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', 2.5);
        if (s.dash) path.attr('stroke-dasharray', s.dash);
      });

      if (vLine !== undefined) {
        g.append('line')
          .attr('x1', x(vLine))
          .attr('x2', x(vLine))
          .attr('y1', 0)
          .attr('y2', innerH)
          .attr('stroke', 'var(--color-text-muted)')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3');
      }

      g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
      g.append('g').call(d3.axisLeft(y).ticks(5));
    }

    if (xLabel) {
      svg
        .append('text')
        .attr('x', margin.left + innerW / 2)
        .attr('y', height - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '12px')
        .text(xLabel);
    }

    if (yLabel) {
      svg
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(margin.top + innerH / 2))
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '12px')
        .text(yLabel);
    }
  }, [series, width, height, title, yLabel, xLabel, smooth, area, yMax, vLine, innerW, innerH, margin.left, margin.top]);

  return (
    <div className={styles.container}>
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
      {series.length > 1 && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.name} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
