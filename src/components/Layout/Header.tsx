import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>&#931;</span>
          <span className={styles.logoText}>TeachStat</span>
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Accueil</Link>
        </nav>
      </div>
    </header>
  );
}
