import NumericMatrix from './NumericMatrix';

interface MatrixDisplayProps {
  matrix: number[][];
  label?: string;
  precision?: number;
}

export default function MatrixDisplay({ matrix, label, precision = 3 }: MatrixDisplayProps) {
  return <NumericMatrix rows={matrix} label={label} precision={precision} />;
}
