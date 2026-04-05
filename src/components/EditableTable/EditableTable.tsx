import { useCallback } from 'react';
import styles from './EditableTable.module.css';

interface EditableTableProps {
  headers: string[];
  data: number[][];
  onChange: (data: number[][]) => void;
  readOnly?: boolean;
  precision?: number;
}

export default function EditableTable({
  headers,
  data,
  onChange,
  readOnly = false,
  precision,
}: EditableTableProps) {
  const handleCellChange = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return;
      const newData = data.map((row, ri) =>
        ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? parsed : cell)) : [...row]
      );
      onChange(newData);
    },
    [data, onChange]
  );

  const addRow = useCallback(() => {
    const newRow = new Array(headers.length).fill(0);
    onChange([...data, newRow]);
  }, [data, headers.length, onChange]);

  const removeRow = useCallback(
    (rowIdx: number) => {
      if (data.length <= 2) return;
      onChange(data.filter((_, i) => i !== rowIdx));
    },
    [data, onChange]
  );

  const formatValue = (val: number) => {
    if (precision !== undefined) return val.toFixed(precision);
    return String(Math.round(val * 10000) / 10000);
  };

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.indexCol}>#</th>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
            {!readOnly && <th className={styles.actionCol}></th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}>
              <td className={styles.indexCol}>{ri + 1}</td>
              {row.map((cell, ci) => (
                <td key={ci}>
                  {readOnly ? (
                    <span className={styles.readOnlyCell}>{formatValue(cell)}</span>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      className={styles.input}
                      value={cell}
                      onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                    />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td className={styles.actionCol}>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeRow(ri)}
                    disabled={data.length <= 2}
                    title="Supprimer la ligne"
                  >
                    &times;
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button className={styles.addBtn} onClick={addRow}>
          + Ajouter une observation
        </button>
      )}
    </div>
  );
}
