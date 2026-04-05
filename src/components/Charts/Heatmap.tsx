import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import styles from './Heatmap.module.css';

interface HeatmapProps {
  matrix: number[][];
  labels: string[];
  width?: number;
  height?: number;
  precision?: number;
}

export default function Heatmap({
  matrix,
  labels,
  width = 400,
  height = 400,
  precision = 3,
}: HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 40, right: 20, bottom: 20, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || matrix.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const n = matrix.length;
    const cellW = innerW / n;
    const cellH = innerH / n;

    const allVals = matrix.flat();
    const colorScale = d3
      .scaleSequential(d3.interpolateRdBu)
      .domain([d3.max(allVals) || 1, d3.min(allVals) || -1]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        g.append('rect')
          .attr('x', j * cellW)
          .attr('y', i * cellH)
          .attr('width', cellW - 1)
          .attr('height', cellH - 1)
          .attr('fill', colorScale(matrix[i][j]))
          .attr('rx', 3);

        g.append('text')
          .attr('x', j * cellW + cellW / 2)
          .attr('y', i * cellH + cellH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', Math.abs(matrix[i][j]) > 0.5 ? 'white' : 'var(--color-text)')
          .attr('font-size', '12px')
          .attr('font-weight', '500')
          .text(matrix[i][j].toFixed(precision));
      }
    }

    // Top labels
    g.selectAll('.topLabel')
      .data(labels)
      .join('text')
      .attr('x', (_, i) => i * cellW + cellW / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text((d) => d);

    // Left labels
    g.selectAll('.leftLabel')
      .data(labels)
      .join('text')
      .attr('x', -10)
      .attr('y', (_, i) => i * cellH + cellH / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text((d) => d);
  }, [matrix, labels, width, height, precision, innerW, innerH, margin.left, margin.top]);

  return (
    <div className={styles.container}>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
