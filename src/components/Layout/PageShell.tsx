import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './PageShell.module.css';

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; to?: string }[];
  children: ReactNode;
}

export default function PageShell({ title, subtitle, breadcrumbs, children }: PageShellProps) {
  return (
    <div className="container">
      {breadcrumbs && (
        <nav className={styles.breadcrumbs}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.separator}>/</span>}
              {crumb.to ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span className={styles.current}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
