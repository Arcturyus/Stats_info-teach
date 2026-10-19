import type { ReactNode } from 'react';
import { BlockMath } from '../../components/Math/KatexRenderer';
import styles from './CausalPage.module.css';

export function Useful({ children }: { children: ReactNode }) {
  return <div className={styles.useful}><strong>Pourquoi c’est utile</strong><p>{children}</p></div>;
}

export function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return <div className={styles.tableScroll}><table className={styles.lessonTable}><caption>{caption}</caption><thead><tr>{headers.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export function MathFigure({ math, caption }: { math: string; caption: string }) {
  return <figure className={styles.mathFigure}><div><BlockMath math={math} /></div><figcaption>{caption}</figcaption></figure>;
}
