import NumericMatrix from './NumericMatrix';

interface MatrixDisplayProps {
  matrix: number[][];
  label?: string;
  precision?: number;
  cellClassName?: (row: number, column: number) => string;
}

export default function MatrixDisplay({ matrix, label, precision = 3, cellClassName }: MatrixDisplayProps) {
  return <NumericMatrix rows={matrix} label={label} precision={precision} cellClassName={cellClassName} />;
}
