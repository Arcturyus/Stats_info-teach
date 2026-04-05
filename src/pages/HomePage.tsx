import { Link } from 'react-router-dom';
import { CONCEPT_LIST } from '../concepts';
import styles from './HomePage.module.css';

const CATEGORY_LABELS: Record<string, string> = {
  probability: 'Probabilites',
  statistics: 'Statistiques',
  'linear-algebra': 'Algebre lineaire',
  inference: 'Inference',
  'machine-learning': 'Machine Learning',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  L1: '#10b981',
  L2: '#06b6d4',
  L3: '#3b82f6',
  M1: '#8b5cf6',
  M2: '#ef4444',
};

export function Component() {
  return (
    <div className="container">
      <div className={styles.hero}>
        <h1>TeachStat</h1>
        <p className={styles.heroSub}>
          Cours interactifs de statistiques, probabilites et mathematiques avancees.
          Explorez chaque concept etape par etape avec des visualisations dynamiques.
        </p>
      </div>

      <div className={styles.grid}>
        {CONCEPT_LIST.map((concept) => (
          <Link key={concept.slug} to={`/${concept.slug}`} className={styles.card}>
            <div className={styles.cardIcon}>{concept.icon}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardMeta}>
                <span className={styles.category}>
                  {CATEGORY_LABELS[concept.category] || concept.category}
                </span>
                <span
                  className={styles.difficulty}
                  style={{ background: DIFFICULTY_COLORS[concept.difficulty] }}
                >
                  {concept.difficulty}
                </span>
              </div>
              <h2 className={styles.cardTitle}>{concept.title}</h2>
              <p className={styles.cardDesc}>{concept.description}</p>
            </div>
            <div className={styles.cardArrow}>&#8594;</div>
          </Link>
        ))}
      </div>

      {CONCEPT_LIST.length === 0 && (
        <p className={styles.empty}>Aucun concept disponible pour le moment.</p>
      )}
    </div>
  );
}
