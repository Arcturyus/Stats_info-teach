import styles from './Steps.module.css';

interface TermsTableProps {
  headers: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
}

export default function TermsTable({ headers, rows, totalsRow }: TermsTableProps) {
  return (
    <div className={styles.termsWrap}>
      <table className={styles.termsTable}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {totalsRow && (
          <tfoot>
            <tr>
              {totalsRow.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
