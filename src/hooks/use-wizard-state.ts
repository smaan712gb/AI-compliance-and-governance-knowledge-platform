"use client";

import { useState, useCallback } from "react";

interface UseWizardStateOptions {
  totalSteps: number;
  initialStep?: number;
}

export function useWizardState({ totalSteps, initialStep = 0 }: UseWizardStateOptions) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const next = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const previous = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  return {
    currentStep,
    totalSteps,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
    progress: ((currentStep + 1) / totalSteps) * 100,
    next,
    previous,
    goTo,
    reset,
  };
}
