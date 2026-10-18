import { useRef, useEffect, type ReactNode } from 'react';
import * as d3 from 'd3';
import { useChartTooltip } from './useChartTooltip';
import styles from './BarChart.module.css';

interface BarChartProps {
  values: number[];
  barTooltip?: (index: number) => ReactNode;
  labels: string[];
  title?: string;
  yLabel?: string;
  width?: number;
  height?: number;
  color?: string;
  showLine?: { data: number[]; label: string };
}

export default function BarChart({
  values,
  barTooltip,
  labels,
  title,
  yLabel,
  width = 400,
  height = 300,
  color = 'var(--color-primary)',
  showLine,
}: BarChartProps) {
  const { id, show, hide, tooltip } = useChartTooltip(values);
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { top: title ? 35 : 15, right: 30, bottom: 40, left: 55 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  useEffect(() => {
    if (!svgRef.current || values.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([0, innerW])
      .padding(0.3);

    const yMax = Math.max(...values, ...(showLine ? showLine.data : [])) * 1.1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Title
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

    const content = (i: number) => barTooltip?.(i) ?? <><strong>{labels[i]}</strong><p>Variance expliquée : {(values[i] * 100).toFixed(3)} %</p>{showLine && <p>{showLine.label} : {(showLine.data[i] * 100).toFixed(3)} %</p>}</>;
    // Bars
    g.selectAll<SVGRectElement, number>('rect')
      .data(values)
      .join('rect')
      .attr('x', (_, i) => xScale(labels[i])!)
      .attr('y', (d) => yScale(d))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerH - yScale(d))
      .attr('fill', color)
      .attr('rx', 3)
      .attr('fill-opacity', 0.8)
      .attr('tabindex', 0)
      .attr('aria-label', (_, i) => `${labels[i]} : ${(values[i] * 100).toFixed(3)} %`)
      .attr('aria-describedby', id)
      .on('mousemove', function (event: MouseEvent) { const i = Array.from(this.parentNode!.querySelectorAll('rect')).indexOf(this); show(event.clientX, event.clientY, content(i)); })
      .on('mouseleave', hide)
      .on('focus', function () { const i = Array.from(this.parentNode!.querySelectorAll('rect')).indexOf(this); const box = this.getBoundingClientRect(); show(box.x, box.y, content(i)); })
      .on('blur', hide);

    // Value labels on bars
    g.selectAll('.barLabel')
      .data(values)
      .join('text')
      .attr('x', (_, i) => xScale(labels[i])! + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '11px')
      .text((d) => `${(d * 100).toFixed(1)}%`);

    // Cumulative line
    if (showLine) {
      const lineGen = d3
        .line<number>()
        .x((_, i) => xScale(labels[i])! + xScale.bandwidth() / 2)
        .y((d) => yScale(d));

      g.append('path')
        .datum(showLine.data)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', 'var(--color-accent)')
        .attr('stroke-width', 2);

      g.selectAll<SVGCircleElement, number>('.lineDot')
        .data(showLine.data)
        .join('circle')
        .attr('cx', (_, i) => xScale(labels[i])! + xScale.bandwidth() / 2)
        .attr('cy', (d) => yScale(d))
        .attr('r', 4)
        .attr('fill', 'var(--color-accent)')
        .attr('tabindex', 0)
        .attr('aria-label', (_, i) => `${showLine.label} jusqu’à ${labels[i]} : ${(showLine.data[i] * 100).toFixed(3)} %`)
        .attr('aria-describedby', id)
        .on('mousemove', function (event: MouseEvent) { const i = Array.from(this.parentNode!.querySelectorAll('circle')).indexOf(this); show(event.clientX, event.clientY, content(i)); })
        .on('mouseleave', hide)
        .on('focus', function () { const i = Array.from(this.parentNode!.querySelectorAll('circle')).indexOf(this); const box = this.getBoundingClientRect(); show(box.x, box.y, content(i)); })
        .on('blur', hide);
    }

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale));

    g.append('g').call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%')));

    if (yLabel) {
      svg
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(margin.top + innerH / 2))
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '12px')
        .text(yLabel);
    }
  }, [values, labels, title, yLabel, width, height, color, showLine, innerW, innerH, margin.left, margin.top, barTooltip, id, show, hide]);

  return (
    <div className={styles.container}>
      {tooltip}
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
}
