import NumericMatrix from './NumericMatrix';

interface VectorDisplayProps {
  vector: number[];
  label?: string;
  precision?: number;
  horizontal?: boolean;
}

export default function VectorDisplay({ vector, label, precision = 3, horizontal = false }: VectorDisplayProps) {
  const rows = horizontal ? [vector] : vector.map((value) => [value]);

  return (
    <NumericMatrix
      rows={rows}
      label={label}
      precision={precision}
      orientation={horizontal ? 'horizontal' : 'vertical'}
    />
  );
}
