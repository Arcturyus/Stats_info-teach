import type { CSSProperties } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  color?: string;
}

export default function Slider({ label, value, min, max, step = 0.01, onChange, format, color }: SliderProps) {
  const style = color ? ({ '--slider-color': color } as CSSProperties) : undefined;

  return (
    <label className={styles.wrapper}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value} style={color ? { color } : undefined}>
          {format ? format(value) : value.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
        style={style}
      />
    </label>
  );
}
