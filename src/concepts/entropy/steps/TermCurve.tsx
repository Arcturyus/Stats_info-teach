import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styles from './TermCurve.module.css';

export interface TermCurveMarker {
  x: number;
  label: string;
  color: string;
}

interface TermCurveProps {
  markers: TermCurveMarker[];
  width?: number;
  height?: number;
  /** Valeur (ex. l'entropie courante) affichee en titre, collee a la courbe et mise a jour en direct. */
  title?: string;
}

function termValue(p: number): number {
  return p > 0 && p < 1 ? -p * Math.log2(p) : 0;
}

export default function TermCurve({ markers, width = 460, height = 260, title }: TermCurveProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: title ? 36 : 14, right: 20, bottom: 40, left: 55 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const n = 300;
    const curvePoints: [number, number][] = Array.from({ length: n + 1 }, (_, i) => {
      const p = i / n;
      return [p, termValue(p)];
    });
    const maxY = d3.max(curvePoints, (d) => d[1]) ?? 0.53;

    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, maxY * 1.2]).range([innerH, 0]);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-primary)')
        .attr('font-size', '16px')
        .attr('font-weight', '700')
        .attr('font-family', 'var(--font-mono)')
        .text(title);
    }

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

    const line = d3
      .line<[number, number]>()
      .x((d) => x(d[0]))
      .y((d) => y(d[1]));

    const area = d3
      .area<[number, number]>()
      .x((d) => x(d[0]))
      .y0(innerH)
      .y1((d) => y(d[1]));

    g.append('path').datum(curvePoints).attr('d', area).attr('fill', 'var(--color-text-muted)').attr('fill-opacity', 0.1);
    g.append('path')
      .datum(curvePoints)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-text-muted)')
      .attr('stroke-width', 2);

    markers.forEach((m) => {
      const mx = Math.min(Math.max(m.x, 0), 1);
      const my = termValue(mx);

      g.append('line')
        .attr('x1', x(mx))
        .attr('x2', x(mx))
        .attr('y1', y(0))
        .attr('y2', y(my))
        .attr('stroke', m.color)
        .attr('stroke-dasharray', '3,3')
        .attr('stroke-opacity', 0.7);

      g.append('circle')
        .attr('cx', x(mx))
        .attr('cy', y(my))
        .attr('r', 5)
        .attr('fill', m.color)
        .attr('stroke', 'var(--color-bg-card)')
        .attr('stroke-width', 1.5);

      g.append('text')
        .attr('x', x(mx))
        .attr('y', y(my) - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', m.color)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(m.label);
    });

    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
    g.append('g').call(d3.axisLeft(y).ticks(5));

    svg
      .append('text')
      .attr('x', margin.left + innerW / 2)
      .attr('y', height - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '12px')
      .text('p');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerH / 2))
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '12px')
      .text('-p . log2(p)  (bits)');
  }, [markers, width, height, title, innerW, innerH, margin.left, margin.top]);

  return (
    <div className={styles.container}>
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
    </div>
  );
}
