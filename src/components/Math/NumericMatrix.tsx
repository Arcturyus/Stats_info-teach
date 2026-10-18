import { InlineMath } from './KatexRenderer';

interface NumericMatrixProps {
  rows: number[][];
  label?: string;
  precision?: number;
  cellClassName?: (row: number, column: number) => string;
  orientation?: 'horizontal' | 'vertical';
}

export default function NumericMatrix({
  rows,
  label,
  precision = 3,
  cellClassName,
  orientation = 'horizontal',
}: NumericMatrixProps) {
  const values = orientation === 'vertical' ? rows.map((row) => row.slice(0, 1)) : rows;

  return (
    <div className="math-data-display">
      {label && (
        <span className="math-data-display__label">
          <InlineMath math={label} />
          <span aria-hidden="true"> = </span>
        </span>
      )}
      <span className="math-data-display__bracket" aria-hidden="true">(</span>
      <table className="math-data-display__table">
        <tbody>
          {values.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, columnIndex) => (
                <td key={columnIndex} className={cellClassName?.(rowIndex, columnIndex)}>{value.toFixed(precision)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="math-data-display__bracket" aria-hidden="true">)</span>
    </div>
  );
}
