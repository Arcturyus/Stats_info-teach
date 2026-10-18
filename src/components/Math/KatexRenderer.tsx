import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import katexScriptUrl from 'katex/dist/katex.min.js?url';

interface MathOptions {
  displayMode: boolean;
  errorColor?: string;
  throwOnError?: boolean;
  trust?: (context: { command: string; class?: string }) => boolean;
  strict?: (code: string) => 'ignore' | 'warn';
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
  colorClasses?: boolean;
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
  return function MathComponent({ math, children, errorColor, renderError, colorClasses = false }: MathProps) {
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
              // Only the authored PCA colour classes are allowed, no HTML/style/URL commands.
              trust: colorClasses ? (context) => context.command === '\\htmlClass' && !!context.class && context.class.split(/\s+/).every((name) => /^pca-(quantity|variable-[0-2]|axis-[0-2]|x|centered|z|mean|std|coefficient)$/.test(name)) : undefined,
              strict: colorClasses ? (code) => code === 'htmlExtension' ? 'ignore' : 'warn' : undefined,
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
    }, [formula, errorColor, renderError, colorClasses]);

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
