import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './ChartTooltip.module.css';

export default function ChartTooltip({ id, x, y, children, onEnter, onLeave }: { id: string; x: number; y: number; children: ReactNode; onEnter: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const left = x + 16 + rect.width <= window.innerWidth - 8 ? x + 16 : x - rect.width - 16;
    const top = y + 16 + rect.height <= window.innerHeight - 8 ? y + 16 : y - rect.height - 16;
    element.style.left = `${Math.max(8, Math.min(left, window.innerWidth - rect.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(top, window.innerHeight - rect.height - 8))}px`;
  }, [x, y, children]);
  return createPortal(<div ref={ref} id={id} role="tooltip" className={styles.tooltip} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</div>, document.body);
}
