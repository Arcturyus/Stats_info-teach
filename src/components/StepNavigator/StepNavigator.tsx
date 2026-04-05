import styles from './StepNavigator.module.css';

interface Step {
  label: string;
  shortLabel?: string;
}

interface StepNavigatorProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export default function StepNavigator({ steps, currentStep, onStepChange }: StepNavigatorProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.steps}>
        {steps.map((step, i) => (
          <button
            key={i}
            className={`${styles.step} ${i === currentStep ? styles.active : ''} ${i < currentStep ? styles.done : ''}`}
            onClick={() => onStepChange(i)}
          >
            <span className={styles.number}>{i + 1}</span>
            <span className={styles.label}>{step.shortLabel || step.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <button
          className={styles.navBtn}
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
        >
          &#8592; Precedent
        </button>
        <span className={styles.counter}>
          {currentStep + 1} / {steps.length}
        </span>
        <button
          className={styles.navBtn}
          onClick={() => onStepChange(currentStep + 1)}
          disabled={currentStep === steps.length - 1}
        >
          Suivant &#8594;
        </button>
      </div>
    </div>
  );
}
