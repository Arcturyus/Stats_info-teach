import { BlockMath } from 'react-katex';

interface VectorDisplayProps {
  vector: number[];
  label?: string;
  precision?: number;
  horizontal?: boolean;
}

export default function VectorDisplay({ vector, label, precision = 3, horizontal = false }: VectorDisplayProps) {
  const formatted = vector.map((v) => v.toFixed(precision));
  const inner = horizontal
    ? formatted.join(' & ')
    : formatted.join(' \\\\ ');
  const env = horizontal ? '\\begin{pmatrix}' : '\\begin{pmatrix}';
  const latex = label
    ? `${label} = ${env} ${inner} \\end{pmatrix}`
    : `${env} ${inner} \\end{pmatrix}`;

  return <BlockMath math={latex} />;
}
