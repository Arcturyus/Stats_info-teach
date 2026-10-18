import { useRef, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useChartTooltip } from './useChartTooltip';
import styles from './ScatterPlot3D.module.css';

export interface Arrow3D {
  dx: number;
  dy: number;
  dz: number;
  label?: string;
  color?: string;
  tooltip?: ReactNode;
}

const EMPTY_ARROWS: Arrow3D[] = [];

interface ScatterPlot3DProps {
  points: number[][];
  pointTooltip?: (index: number) => ReactNode;
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
      const maxAbs = Math.max(
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

    drawCoordAxis(1, 0, 0, '#ef4444', xLabel);
    drawCoordAxis(0, 1, 0, '#10b981', yLabel);
    drawCoordAxis(0, 0, 1, '#3b82f6', zLabel);

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
      ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.82; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    ctx.fillStyle = 'rgba(150,150,150,0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Cliquer-glisser pour tourner', 8, height - 8);
  }, [points, arrows, rotX, rotY, xLabel, yLabel, zLabel, colors, originCenter, width, height]);

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
      if (!hit) { hide(); return; }
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
        aria-label={`Nuage 3D : ${xLabel}, ${yLabel}, ${zLabel}. Flèches gauche et droite : parcourir les individus ; Échap : fermer les détails.`}
        aria-describedby={id}
        onBlur={hide}
        onFocus={(event) => { const box = event.currentTarget.getBoundingClientRect(); keyboardIndex.current = 0; show(box.x + box.width / 2, box.y + box.height / 2, pointTooltip?.(0) ?? `Individu n° 1 : ${points[0]?.join(' ; ')}`); }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
          event.preventDefault();
          keyboardIndex.current = (keyboardIndex.current + (event.key === 'ArrowRight' ? 1 : -1) + points.length) % points.length;
          const index = keyboardIndex.current;
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
        onMouseLeave={() => { handleMouseUp(); hide(); }}
      />
    </div>
  );
}
