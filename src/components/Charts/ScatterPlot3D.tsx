import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useChartTooltip } from './useChartTooltip';
import styles from './ScatterPlot3D.module.css';
import { projectOntoPrincipalPlane } from '../../concepts/pca/projectionGeometry';

export interface Arrow3D {
  dx: number;
  dy: number;
  dz: number;
  label?: string;
  color?: string;
  tooltip?: ReactNode;
}

const EMPTY_ARROWS: Arrow3D[] = [];
const VARIABLE_AXIS_COLORS = ['#193e83', '#68245b', '#13513e'];

export interface ProjectionPlane3D {
  basis: [number[], number[]];
  extent: number;
}

interface ScatterPlot3DProps {
  points: number[][];
  pointTooltip?: (index: number) => ReactNode;
  pointLabels?: string[];
  showPointLabels?: boolean;
  highlightedIndex?: number | null;
  onPointHover?: (index: number | null) => void;
  symmetricExtent?: number;
  axisColors?: string[];
  projectionPlane?: ProjectionPlane3D;
  xLabel?: string;
  yLabel?: string;
  zLabel?: string;
  arrows?: Arrow3D[];
  colors?: string[];
  originCenter?: boolean;
  width?: number;
  height?: number;
}

export default function ScatterPlot3D({
  points,
  pointTooltip,
  pointLabels,
  showPointLabels = false,
  highlightedIndex,
  onPointHover,
  symmetricExtent,
  axisColors = VARIABLE_AXIS_COLORS,
  projectionPlane,
  xLabel = 'X',
  yLabel = 'Y',
  zLabel = 'Z',
  arrows = EMPTY_ARROWS,
  colors,
  originCenter = false,
  width = 500,
  height = 450,
}: ScatterPlot3DProps) {
  const { id, show, hide, tooltip } = useChartTooltip(points);
  const hits = useRef<{ sx: number; sy: number; index: number; arrow?: boolean }[]>([]);
  const keyboardIndex = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotX, setRotX] = useState(-0.45);
  const [rotY, setRotY] = useState(0.65);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const theme = getComputedStyle(canvas);

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 + 20;
    const scale = Math.min(width, height) * 0.28;

    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const zs = points.map((p) => p[2]);

    let xMin: number, xMax: number, yMin: number, yMax: number, zMin: number, zMax: number;
    let xRange: number, yRange: number, zRange: number;

    if (originCenter) {
      // Include arrow tips in extent for symmetric centering
      const allAbsX = [...xs.map(Math.abs), ...arrows.map((a) => Math.abs(a.dx))];
      const allAbsY = [...ys.map(Math.abs), ...arrows.map((a) => Math.abs(a.dy))];
      const allAbsZ = [...zs.map(Math.abs), ...arrows.map((a) => Math.abs(a.dz))];
      const maxAbs = symmetricExtent ?? Math.max(
        Math.max(...allAbsX, 0),
        Math.max(...allAbsY, 0),
        Math.max(...allAbsZ, 0),
        0.1
      ) * 1.15;
      xMin = yMin = zMin = -maxAbs;
      xRange = yRange = zRange = 2 * maxAbs;
    } else {
      xMin = Math.min(...xs); xMax = Math.max(...xs);
      yMin = Math.min(...ys); yMax = Math.max(...ys);
      zMin = Math.min(...zs); zMax = Math.max(...zs);
      const pad = 0.15;
      xRange = (xMax - xMin || 1) * (1 + pad * 2); xMin -= (xMax - xMin || 1) * pad;
      yRange = (yMax - yMin || 1) * (1 + pad * 2); yMin -= (yMax - yMin || 1) * pad;
      zRange = (zMax - zMin || 1) * (1 + pad * 2); zMin -= (zMax - zMin || 1) * pad;
    }

    const norm = (v: number, min: number, range: number) => (v - min) / range * 2 - 1;

    const project = (x: number, y: number, z: number): [number, number, number] => {
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      return [cx + x1 * scale, cy - y2 * scale, z2];
    };

    const projectData = (x: number, y: number, z: number): [number, number, number] =>
      project(norm(x, xMin, xRange), norm(y, yMin, yRange), norm(z, zMin, zRange));

    // This plane is expressed in the original standardized coordinates, not in screen coordinates.
    if (projectionPlane) {
      const { basis, extent } = projectionPlane;
      const inPlane = (a: number, b: number) => {
        const value = basis[0].map((coefficient, j) => a * coefficient + b * basis[1][j]);
        return projectData(value[0], value[1], value[2]);
      };
      const corners = [[-extent, -extent], [extent, -extent], [extent, extent], [-extent, extent]].map(([a, b]) => inPlane(a, b));
      ctx.beginPath();
      corners.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.closePath(); ctx.fillStyle = 'rgba(99,102,241,.13)'; ctx.fill();
      ctx.strokeStyle = 'rgba(99,102,241,.55)'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.strokeStyle = 'rgba(99,102,241,.22)'; ctx.lineWidth = .8;
      for (let i = -2; i <= 2; i++) {
        const t = i / 3 * extent;
        for (const ends of [[[t, -extent], [t, extent]], [[-extent, t], [extent, t]]]) {
          const a = inPlane(ends[0][0], ends[0][1]), b = inPlane(ends[1][0], ends[1][1]);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      ctx.fillStyle = theme.getPropertyValue('--color-text-heading'); ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Plan CP1–CP2', corners[3][0] + 5, corners[3][1] - 8);
    }

    // Grid on floor plane (y = yMin mapped to -1)
    const gridLines = 4;
    ctx.strokeStyle = 'rgba(150,150,150,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const t = (i / gridLines) * 2 - 1;
      const [ax, ay] = project(t, -1, -1);
      const [bx, by] = project(t, -1, 1);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const [cx2, cy2] = project(-1, -1, t);
      const [dx, dy] = project(1, -1, t);
      ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(dx, dy); ctx.stroke();
    }

    // Coordinate axes (in normalized display space)
    const axisLen = 1.3;
    const drawCoordAxis = (ddx: number, ddy: number, ddz: number, color: string, label: string) => {
      const [ox, oy] = project(0, 0, 0);
      if (originCenter) {
        const [nx, ny] = project(-ddx, -ddy, -ddz);
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(ox, oy);
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        const range = ddx ? xRange : ddy ? yRange : zRange;
        for (const t of [-1, .5, 1]) {
          const [tx, ty] = project(ddx * t, ddy * t, ddz * t);
          ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          ctx.font = '10px sans-serif'; ctx.fillText((t * range / 2).toFixed(1), tx + 4, ty + 12);
        }
      }
      const [ex, ey] = project(ddx * axisLen, ddy * axisLen, ddz * axisLen);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      const angle = Math.atan2(ey - oy, ex - ox);
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 10 * Math.cos(angle - 0.4), ey - 10 * Math.sin(angle - 0.4));
      ctx.lineTo(ex - 10 * Math.cos(angle + 0.4), ey - 10 * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = color; ctx.font = 'bold 13px sans-serif';
      ctx.fillText(label, ex + 6, ey + 4);
    };

    drawCoordAxis(1, 0, 0, axisColors[0], xLabel);
    drawCoordAxis(0, 1, 0, axisColors[1], yLabel);
    drawCoordAxis(0, 0, 1, axisColors[2], zLabel);

    // Origin dot
    const [ox, oy] = project(0, 0, 0);
    ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,150,150,0.6)'; ctx.fill();

    hits.current = [];
    // Eigenvector arrows (in data space)
    arrows.forEach((arrow, index) => {
      const [startX, startY] = projectData(0, 0, 0);
      const [endX, endY] = projectData(arrow.dx, arrow.dy, arrow.dz);
      hits.current.push({ sx: endX, sy: endY, index, arrow: true });
      const color = arrow.color ?? '#f59e0b';

      ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 11 * Math.cos(angle - 0.4), endY - 11 * Math.sin(angle - 0.4));
      ctx.lineTo(endX - 11 * Math.cos(angle + 0.4), endY - 11 * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();

      if (arrow.label) {
        ctx.fillStyle = color; ctx.font = 'bold 12px sans-serif';
        ctx.fillText(arrow.label, endX + 6, endY - 4);
      }
    });

    // Points — sorted back to front (painter's algorithm)
    const projected = points.map((p, i) => {
      const [sx, sy, depth] = projectData(p[0], p[1], p[2]);
      return { sx, sy, depth, i };
    });
    projected.sort((a, b) => a.depth - b.depth);

    projected.forEach(({ sx, sy, i }) => {
      hits.current.push({ sx, sy, index: i });
      const color = colors ? colors[i % colors.length] : '#6366f1';
      const selected = i === highlightedIndex;
      ctx.beginPath(); ctx.arc(sx, sy, selected ? 8 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = highlightedIndex == null || selected ? .82 : .3; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = selected ? theme.getPropertyValue('--color-text-heading') : 'white'; ctx.lineWidth = selected ? 2.5 : 1.5; ctx.stroke();
      if (pointLabels && (showPointLabels || selected)) {
        ctx.font = `${selected ? 'bold ' : ''}11px sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = theme.getPropertyValue('--color-bg-card');
        ctx.strokeText(pointLabels[i], sx + 9, sy - 8);
        ctx.fillStyle = theme.getPropertyValue('--color-text-heading'); ctx.fillText(pointLabels[i], sx + 9, sy - 8);
      }
    });

    if (projectionPlane && highlightedIndex != null && points[highlightedIndex]) {
      const point = points[highlightedIndex];
      const { foot, firstComponent, distance } = projectOntoPrincipalPlane(point, projectionPlane.basis);
      const source = projectData(point[0], point[1], point[2]);
      const target = projectData(foot[0], foot[1], foot[2]);
      const first = projectData(firstComponent[0], firstComponent[1], firstComponent[2]);
      const origin = projectData(0, 0, 0);
      // Resolve the foot within the CP1–CP2 plane, then show the orthogonal residual.
      ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
      ctx.strokeStyle = '#b63227'; ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(first[0], first[1]); ctx.stroke();
      ctx.strokeStyle = '#805e00'; ctx.beginPath(); ctx.moveTo(first[0], first[1]); ctx.lineTo(target[0], target[1]); ctx.stroke();
      ctx.strokeStyle = theme.getPropertyValue('--color-text-heading');
      ctx.beginPath(); ctx.moveTo(source[0], source[1]); ctx.lineTo(target[0], target[1]); ctx.stroke(); ctx.setLineDash([]);
      if (distance > 1e-8) {
        const size = Math.min(distance / 4, projectionPlane.extent * .05);
        const alongPlane = projectionPlane.basis[0].map(value => value * size);
        const normal = point.map((value, j) => (value - foot[j]) / distance * size);
        const corner = [
          foot.map((value, j) => value + alongPlane[j]),
          foot.map((value, j) => value + alongPlane[j] + normal[j]),
          foot.map((value, j) => value + normal[j]),
        ].map(value => projectData(value[0], value[1], value[2]));
        ctx.beginPath(); corner.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
        ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(target[0], target[1], 7, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1'; ctx.fill(); ctx.strokeStyle = theme.getPropertyValue('--color-bg-card'); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = theme.getPropertyValue('--color-text-heading'); ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${pointLabels?.[highlightedIndex] ?? highlightedIndex + 1}′`, target[0] + 10, target[1] + 15);
      hits.current.push({ sx: target[0], sy: target[1], index: highlightedIndex });
    }

    ctx.fillStyle = 'rgba(150,150,150,0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Cliquer-glisser pour tourner', 8, height - 8);
  }, [points, arrows, rotX, rotY, xLabel, yLabel, zLabel, colors, originCenter, width, height, pointLabels, showPointLabels, highlightedIndex, symmetricExtent, axisColors, projectionPlane]);

  useEffect(() => { draw(); }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotX, ry: rotY };
    setIsDragging(true);
    hide();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) {
      const box = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - box.left) * width / box.width;
      const y = (e.clientY - box.top) * height / box.height;
      // Reverse painter order: coincident points select the visible foreground one.
      const hit = [...hits.current].reverse().find(p => Math.hypot(p.sx - x, p.sy - y) <= 12);
      if (!hit) { hide(); onPointHover?.(null); return; }
      onPointHover?.(hit.arrow ? null : hit.index);
      const content = hit.arrow ? (arrows[hit.index].tooltip ?? arrows[hit.index].label) : (pointTooltip?.(hit.index) ?? <><strong>Individu n° {hit.index + 1}</strong><p>{[xLabel, yLabel, zLabel].map((label, j) => `${label} : ${points[hit.index][j].toFixed(3)}`).join(' · ')}</p></>);
      show(e.clientX, e.clientY, content);
      return;
    }
    setRotY(dragRef.current.ry + (e.clientX - dragRef.current.x) * 0.012);
    setRotX(dragRef.current.rx + (e.clientY - dragRef.current.y) * 0.012);
  };

  const handleMouseUp = () => { dragRef.current = null; setIsDragging(false); };

  return (
    <div className={styles.container}>
      {tooltip}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`Nuage 3D : ${xLabel}, ${yLabel}, ${zLabel}.${projectionPlane ? ' Plan CP1–CP2 et projection orthogonale de l’individu survolé.' : ''} Flèches gauche et droite : parcourir les individus ; Échap : fermer les détails.`}
        aria-describedby={id}
        onBlur={() => { hide(); onPointHover?.(null); }}
        onFocus={(event) => { const box = event.currentTarget.getBoundingClientRect(); keyboardIndex.current = 0; onPointHover?.(0); show(box.x + box.width / 2, box.y + box.height / 2, pointTooltip?.(0) ?? `Individu n° 1 : ${points[0]?.join(' ; ')}`); }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          event.preventDefault();
          keyboardIndex.current = (keyboardIndex.current + (event.key === 'ArrowRight' ? 1 : -1) + points.length) % points.length;
          const index = keyboardIndex.current;
          onPointHover?.(index);
          const hit = hits.current.find(h => !h.arrow && h.index === index);
          const box = event.currentTarget.getBoundingClientRect();
          show(box.x + (hit?.sx ?? width / 2) * box.width / width, box.y + (hit?.sy ?? height / 2) * box.height / height, pointTooltip?.(index) ?? `Individu n° ${index + 1} : ${points[index].join(' ; ')}`);
        }}
        width={width}
        height={height}
        className={styles.canvas}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); hide(); onPointHover?.(null); }}
      />
    </div>
  );
}
