export type ContinuousFamily = 'normal' | 'uniform' | 'exponential' | 'beta';

export interface ContinuousFamilyParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ContinuousFamilyDef {
  id: ContinuousFamily;
  label: string;
  formula: string;
  params: ContinuousFamilyParamSpec[];
}
