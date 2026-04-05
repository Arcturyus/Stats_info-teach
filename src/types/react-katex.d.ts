declare module 'react-katex' {
  import type { FC, ReactNode } from 'react';

  interface MathProps {
    math?: string;
    children?: ReactNode;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
  }

  export const InlineMath: FC<MathProps>;
  export const BlockMath: FC<MathProps>;
}
