import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import ChartTooltip from './ChartTooltip';

/** Viewport positioning keeps details outside clipped SVG/canvas containers. */
export function useChartTooltip(context: unknown) {
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<{ x: number; y: number; content: ReactNode; context: unknown } | null>(null);
  const keep = useCallback(() => { if (timer.current) clearTimeout(timer.current); }, []);
  const dismiss = useCallback(() => { keep(); setActive(null); }, [keep]);
  const hide = useCallback(() => { keep(); timer.current = setTimeout(() => setActive(null), 180); }, [keep]);
  const show = useCallback((x: number, y: number, content: ReactNode) => { keep(); setActive({ x, y, content, context }); }, [context, keep]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const scroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[role="tooltip"]')) return;
      dismiss();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', dismiss);
    return () => {
      keep();
      window.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [dismiss, keep]);
  return { id, show, hide, tooltip: active && active.context === context ? <ChartTooltip id={id} x={active.x} y={active.y} onEnter={keep} onLeave={hide}>{active.content}</ChartTooltip> : null };
}
