export interface ConceptMeta {
  slug: string;
  title: string;
  description: string;
  category: 'probability' | 'statistics' | 'linear-algebra' | 'inference' | 'machine-learning';
  difficulty: 'L1' | 'L2' | 'L3' | 'M1' | 'M2';
  icon: string;
}
