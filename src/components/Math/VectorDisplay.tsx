import NumericMatrix from './NumericMatrix';

interface VectorDisplayProps {
  vector: number[];
  label?: string;
  precision?: number;
  horizontal?: boolean;
  entryClasses?: string[];
}

export default function VectorDisplay({ vector, label, precision = 3, horizontal = false, entryClasses }: VectorDisplayProps) {
  const rows = horizontal ? [vector] : vector.map((value) => [value]);

  return (
    <NumericMatrix
      rows={rows}
      cellClassName={entryClasses ? (row, column) => entryClasses[horizontal ? column : row] : undefined}
      label={label}
      precision={precision}
      orientation={horizontal ? 'horizontal' : 'vertical'}
    />
  );
}
