import { BlockMath } from 'react-katex';

interface MatrixDisplayProps {
  matrix: number[][];
  label?: string;
  precision?: number;
}

function matrixToLatex(matrix: number[][], precision: number): string {
  const rows = matrix.map((row) =>
    row.map((val) => val.toFixed(precision)).join(' & ')
  );
  return `\\begin{pmatrix} ${rows.join(' \\\\ ')} \\end{pmatrix}`;
}

export default function MatrixDisplay({ matrix, label, precision = 3 }: MatrixDisplayProps) {
  const latex = label
    ? `${label} = ${matrixToLatex(matrix, precision)}`
    : matrixToLatex(matrix, precision);

  return <BlockMath math={latex} />;
}
