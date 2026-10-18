import { useRef, useEffect, useId, type ReactNode } from 'react';
import * as d3 from 'd3';
import { useChartTooltip } from './useChartTooltip';
import styles from './ScatterPlot2D.module.css';

export interface Arrow {
  dx: number;
  dy: number;
  label?: string;
  color?: string;
  tooltip?: ReactNode;
  bidirectional?: boolean;
}

const EMPTY_ARROWS: Arrow[] = [];

interface ScatterPlot2DProps {
  points: number[][];
  pointTooltip?: (index: number) => ReactNode;
  xLabel?: string;
  yLabel?: string;
  arrows?: Arrow[];
  width?: number;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  originCenter?: boolean;
  /** Same extent and units per pixel for paired views. */
  symmetricExtent?: number;
  pointLabels?: string[];
  showPointLabels?: boolean;
  highlightedIndex?: number | null;
  onPointHover?: (index: number | null) => void;
}

export default function ScatterPlot2D({
  points,
  pointTooltip,
  xLabel = 'X₁',
  yLabel = 'X₂',
  arrows = EMPTY_ARROWS,
  width = 500,
  height = 400,
  colors,
  showGrid = true,
  originCenter = false,
  symmetricExtent,
  pointLabels,
  showPointLabels = false,
  highlightedIndex,
  onPointHover,
}: ScatterPlot2DProps) {
  const markerId = useId().replace(/:/g, "");
  const { id, show, hide, tooltip } = useChartTooltip(points);
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: 20, right: 30, bottom: 45, left: 55 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);

    let xExtent = d3.extent(xs) as [number, number];
    let yExtent = d3.extent(ys) as [number, number];

    // Add padding
    const xPad = (xExtent[1] - xExtent[0]) * 0.15 || 1;
    const yPad = (yExtent[1] - yExtent[0]) * 0.15 || 1;

    if (originCenter) {
      const xMax = Math.max(Math.abs(xExtent[0]), Math.abs(xExtent[1])) + xPad;
      const yMax = Math.max(Math.abs(yExtent[0]), Math.abs(yExtent[1])) + yPad;
      xExtent = [-xMax, xMax];
      yExtent = [-yMax, yMax];
    } else {
      xExtent = [xExtent[0] - xPad, xExtent[1] + xPad];
      yExtent = [yExtent[0] - yPad, yExtent[1] + yPad];
    }

    if (symmetricExtent !== undefined) {
      const unit = symmetricExtent / Math.min(innerW, innerH);
      xExtent = [-unit * innerW, unit * innerW];
      yExtent = [-unit * innerH, unit * innerH];
    }

    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerW]);
    const yScale = d3.scaleLinear().domain(yExtent).range([innerH, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid
    if (showGrid) {
      g.append('g')
        .attr('class', styles.grid)
        .selectAll('line.hgrid')
        .data(yScale.ticks(6))
        .join('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d));

      g.append('g')
        .attr('class', styles.grid)
        .selectAll('line.vgrid')
        .data(xScale.ticks(6))
        .join('line')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerH);
    }

    // Origin lines when centered
    if (originCenter) {
      g.append('line')
        .attr('x1', xScale(0))
        .attr('x2', xScale(0))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', 'var(--color-border-strong)')
        .attr('stroke-dasharray', '4,4');

      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))
        .attr('stroke', 'var(--color-border-strong)')
        .attr('stroke-dasharray', '4,4');
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6));

    g.append('g').call(d3.axisLeft(yScale).ticks(6));

    // Axis labels
    svg
      .append('text')
      .attr('x', margin.left + innerW / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '13px')
      .text(xLabel);

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerH / 2))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text-muted)')
      .attr('font-size', '13px')
      .text(yLabel);

    // Arrows (eigenvectors)
    const defs = svg.append('defs');
    arrows.forEach((arrow, i) => {
      const arrowColor = arrow.color || '#ef4444';
      defs
        .append('marker')
        .attr('id', `${markerId}-arrowhead-${i}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', arrowColor);

      g.append('line')
        .attr('x1', xScale(arrow.bidirectional ? -arrow.dx : 0))
        .attr('y1', yScale(arrow.bidirectional ? -arrow.dy : 0))
        .attr('x2', xScale(arrow.dx))
        .attr('y2', yScale(arrow.dy))
        .attr('stroke', arrowColor)
        .attr('stroke-width', 2.5)
        .attr('marker-end', `url(#${markerId}-arrowhead-${i})`)
        .attr('marker-start', arrow.bidirectional ? `url(#${markerId}-arrowhead-${i})` : null)
        .attr('tabindex', 0)
        .attr('aria-label', arrow.label ?? 'Axe principal')
        .attr('aria-describedby', id)
        .on('mousemove', (event: MouseEvent) => show(event.clientX, event.clientY, arrow.tooltip ?? arrow.label))
        .on('mouseleave', hide)
        .on('focus', function () { const box = this.getBoundingClientRect(); show(box.x + box.width / 2, box.y + box.height / 2, arrow.tooltip ?? arrow.label); })
        .on('blur', hide);

      if (arrow.label) {
        g.append('text')
          .attr('x', xScale(arrow.dx) + 5)
          .attr('y', yScale(arrow.dy) - 5)
          .attr('fill', arrowColor)
          .attr('font-size', '12px')
          .attr('font-weight', '600')
          .text(arrow.label);
      }
    });

    // Points
    g.selectAll<SVGCircleElement, number[]>('circle')
      .data(points)
      .join('circle')
      .attr('cx', (d) => xScale(d[0]))
      .attr('cy', (d) => yScale(d[1]))
      .attr('r', 5)
      .attr('fill', (_, i) => (colors ? colors[i % colors.length] : 'var(--color-primary)'))
      .attr('fill-opacity', 0.8)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5)
      .attr('data-point-index', (_, i) => i)
      .attr('tabindex', 0)
      .attr('aria-label', (d, i) => `Individu n° ${i + 1}, ${xLabel} : ${d[0]}, ${yLabel} : ${d[1]}`)
      .attr('aria-describedby', id)
      .on('mouseenter', (_, d) => onPointHover?.(points.indexOf(d)))
      .on('mousemove', (event: MouseEvent, d) => { const i = points.indexOf(d); show(event.clientX, event.clientY, pointTooltip?.(i) ?? <><strong>Individu n° {i + 1}</strong><p>{xLabel} : {d[0].toFixed(3)}<br />{yLabel} : {d[1].toFixed(3)}</p></>); })
      .on('mouseleave', () => { hide(); onPointHover?.(null); })
      .on('focus', function (_, d) { const box = this.getBoundingClientRect(); const i = points.indexOf(d); onPointHover?.(i); show(box.x, box.y, pointTooltip?.(i) ?? `Individu n° ${i + 1} : ${d.map(v => v.toFixed(3)).join(' ; ')}`); })
      .on('blur', () => { hide(); onPointHover?.(null); });

    if (pointLabels) {
      g.append('g').selectAll('text').data(points).join('text')
        .attr('data-point-label', (_, i) => i)
        .attr('x', d => xScale(d[0]) + 8)
        .attr('y', d => yScale(d[1]) - 8)
        .attr('fill', 'var(--color-text-heading)')
        .attr('font-size', '11px')
        .attr('stroke', 'var(--color-bg-card)')
        .attr('stroke-width', 3)
        .attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .text((_, i) => pointLabels[i]);
    }
  }, [points, arrows, width, height, xLabel, yLabel, colors, showGrid, originCenter, innerW, innerH, margin.left, margin.top, pointTooltip, id, show, hide, markerId, symmetricExtent, pointLabels, onPointHover]);

  // Update the linked highlight without recreating points or losing hover/focus.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll<SVGCircleElement, number[]>('circle[data-point-index]')
      .attr('r', (_, i) => i === highlightedIndex ? 8 : 5)
      .attr('fill-opacity', (_, i) => highlightedIndex == null || i === highlightedIndex ? .8 : .3)
      .attr('stroke', (_, i) => i === highlightedIndex ? 'var(--color-text-heading)' : 'white')
      .attr('stroke-width', (_, i) => i === highlightedIndex ? 2.5 : 1.5);
    svg.selectAll<SVGTextElement, number[]>('text[data-point-label]')
      .attr('visibility', (_, i) => showPointLabels || i === highlightedIndex ? 'visible' : 'hidden')
      .attr('font-weight', (_, i) => i === highlightedIndex ? 800 : 500);
  }, [highlightedIndex, showPointLabels, points, arrows, pointLabels, symmetricExtent, width, height, xLabel, yLabel, colors, showGrid, originCenter, pointTooltip, onPointHover]);

  return (
    <div className={styles.container}>
      {tooltip}
      <svg ref={svgRef} width={width} height={height} className={styles.svg} />
    </div>
  );
}
