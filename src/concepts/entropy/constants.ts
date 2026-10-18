import type { ContinuousFamilyDef } from './types';

export const CONTINUOUS_FAMILIES: ContinuousFamilyDef[] = [
  {
    id: 'normal',
    label: 'Normale N(μ, σ²)',
    formula: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\, e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}',
    params: [
      { key: 'mu', label: 'μ (moyenne)', min: -4, max: 4, step: 0.1, default: 0 },
      { key: 'sigma', label: 'σ (ecart-type)', min: 0.2, max: 3, step: 0.1, default: 1 },
    ],
  },
  {
    id: 'uniform',
    label: 'Uniforme continue U(a, b)',
    formula: 'f(x) = \\frac{1}{b-a} \\ \\text{ si } x \\in [a, b]',
    params: [
      { key: 'a', label: 'a (borne inf.)', min: -4, max: 3, step: 0.1, default: -2 },
      { key: 'b', label: 'b (borne sup.)', min: -3, max: 4, step: 0.1, default: 2 },
    ],
  },
  {
    id: 'exponential',
    label: 'Exponentielle Exp(λ)',
    formula: 'f(x) = \\lambda \\, e^{-\\lambda x} \\ \\text{ si } x \\ge 0',
    params: [{ key: 'lambda', label: 'λ (taux)', min: 0.2, max: 3, step: 0.05, default: 1 }],
  },
  {
    id: 'beta',
    label: 'Beta B(α, β) sur [0,1]',
    formula: 'f(x) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)}',
    params: [
      { key: 'alpha', label: 'α', min: 0.3, max: 6, step: 0.1, default: 2 },
      { key: 'beta', label: 'β', min: 0.3, max: 6, step: 0.1, default: 2 },
    ],
  },
];

export const DISCRETE_CATEGORY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const DISCRETE_CATEGORY_COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#a855f7'];
