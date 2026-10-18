import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import katexScriptUrl from 'katex/dist/katex.min.js?url';

interface MathOptions {
  displayMode: boolean;
  errorColor?: string;
  throwOnError?: boolean;
}

interface KatexApi {
  renderToString: (formula: string, options: MathOptions) => string;
}

declare global {
  interface Window {
    katex?: KatexApi;
  }
}

interface MathProps {
  math?: string;
  children?: ReactNode;
  errorColor?: string;
  renderError?: (error: Error) => ReactNode;
}

let katexPromise: Promise<KatexApi> | null = null;

function loadKatex(): Promise<KatexApi> {
  if (window.katex) return Promise.resolve(window.katex);

  if (!katexPromise) {
    katexPromise = new Promise<KatexApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = katexScriptUrl;
      script.onload = () => {
        if (window.katex) resolve(window.katex);
        else reject(new Error('KaTeX failed to initialize.'));
      };
      script.onerror = () => reject(new Error('KaTeX failed to load.'));
      document.head.appendChild(script);
    }).catch((error: unknown): never => {
      katexPromise = null;
      throw error;
    });
  }

  return katexPromise;
}

function createMathComponent(displayMode: boolean) {
  return function MathComponent({ math, children, errorColor, renderError }: MathProps) {
    const formula = math ?? (typeof children === 'string' ? children : '');
    const [result, setResult] = useState<{ html: string; error?: Error }>({ html: '' });

    useEffect(() => {
      let active = true;

      loadKatex()
        .then((katex) => {
          try {
            const html = katex.renderToString(formula, {
              displayMode,
              errorColor,
              throwOnError: !!renderError,
            });

            if (active) setResult({ html });
          } catch (error) {
            if (active) setResult({ html: '', error: error as Error });
          }
        })
        .catch((error: unknown) => {
          if (active) setResult({ html: '', error: error as Error });
        });

      return () => {
        active = false;
      };
    }, [formula, errorColor, renderError]);

    if (result.error) {
      if (renderError) return <>{renderError(result.error)}</>;

      return (
        <span className="katex-error" style={{ color: errorColor ?? '#cc0000' }}>
          {result.error.message}
        </span>
      );
    }

    const Component = displayMode ? 'div' : 'span';
    return <Component data-testid="react-katex" dangerouslySetInnerHTML={{ __html: result.html }} />;
  };
}

export const BlockMath = createMathComponent(true);
export const InlineMath = createMathComponent(false);
