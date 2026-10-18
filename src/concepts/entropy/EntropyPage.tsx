import { useState } from 'react';
import PageShell from '../../components/Layout/PageShell';
import StepNavigator from '../../components/StepNavigator/StepNavigator';
import StepSingleDistribution from './steps/StepSingleDistribution';
import StepTwoDistributions from './steps/StepTwoDistributions';
import StepGallery from './steps/StepGallery';
import StepWhyKL from './steps/StepWhyKL';

const STEPS = [
  { label: 'Une distribution et son entropie', shortLabel: 'Entropie' },
  { label: 'Entropie croisee et divergence KL', shortLabel: 'Croisee & KL' },
  { label: "Galerie d'exemples", shortLabel: 'Exemples' },
  { label: "Pourquoi la KL plutot qu'une autre divergence ?", shortLabel: 'Pourquoi KL' },
];

export function Component() {
  const [step, setStep] = useState(0);

  return (
    <PageShell
      title="Entropie, entropie croisee et divergence de Kullback-Leibler"
      subtitle="Mesurer l'incertitude d'une distribution, puis l'ecart entre deux distributions"
      breadcrumbs={[{ label: 'Accueil', to: '/' }, { label: 'Entropie' }]}
    >
      <StepNavigator steps={STEPS} currentStep={step} onStepChange={setStep} />
      {step === 0 && <StepSingleDistribution />}
      {step === 1 && <StepTwoDistributions />}
      {step === 2 && <StepGallery />}
      {step === 3 && <StepWhyKL />}
    </PageShell>
  );
}
