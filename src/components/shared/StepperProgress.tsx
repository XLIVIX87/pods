interface StepperProgressProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepperProgress({
  currentStep,
  totalSteps,
}: StepperProgressProps) {
  return (
    <div className="flex flex-col items-center mb-8">
      <span className="font-label text-sm font-medium text-on-surface-variant mb-4 uppercase tracking-[0.1em]">
        Step {currentStep} of {totalSteps}
      </span>
      <div className="flex items-center justify-center w-full max-w-[120px] relative">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-highest -translate-y-1/2 z-0" />
        <div className="flex justify-between w-full relative z-10">
          {Array.from({ length: totalSteps }, (_, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            return (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all ${
                  isActive
                    ? "bg-primary ring-4 ring-tertiary-fixed"
                    : isCompleted
                      ? "bg-secondary-container"
                      : "bg-surface-container-highest"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
