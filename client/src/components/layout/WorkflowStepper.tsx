import React from 'react';
import { Gamepad2, BarChart3, BrainCircuit, Target, RefreshCw, CheckCircle2 } from 'lucide-react';

export type WorkflowStep = 'select' | 'report' | 'board' | 'puzzles';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  gameTitle: string;
  blundersCount: number;
  movesCount: number;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  isScanning?: boolean;
  scanProgress?: number;
  onOpenLaunchpad: () => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onSelectStep,
  gameTitle,
  blundersCount,
  movesCount,
  isScanning,
  scanProgress,
  onOpenLaunchpad,
}) => {
  const steps: { id: WorkflowStep; label: string; sublabel: string; icon: React.ReactNode; stepNum: number }[] = [
    {
      id: 'select',
      label: '1. Select Match',
      sublabel: movesCount > 0 ? `${movesCount} moves` : 'Choose game',
      icon: <Gamepad2 className="w-3.5 h-3.5" />,
      stepNum: 1,
    },
    {
      id: 'report',
      label: '2. Match Report',
      sublabel: isScanning ? `Scanning ${scanProgress}%` : 'Accuracy & Story',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      stepNum: 2,
    },
    {
      id: 'board',
      label: '3. GM Coach & Board',
      sublabel: 'Move-by-move AI',
      icon: <BrainCircuit className="w-3.5 h-3.5" />,
      stepNum: 3,
    },
    {
      id: 'puzzles',
      label: '4. Retrain Blunders',
      sublabel: `${blundersCount} workout puzzles`,
      icon: <Target className="w-3.5 h-3.5" />,
      stepNum: 4,
    },
  ];

  const getStepIndex = (step: WorkflowStep): number => {
    switch (step) {
      case 'select':
        return 0;
      case 'report':
        return 1;
      case 'board':
        return 2;
      case 'puzzles':
        return 3;
    }
  };

  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="w-full bg-white dark:bg-[#070c18] border-b border-slate-200 dark:border-slate-800/80 px-4 py-2 transition-colors duration-200 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full md:w-auto scrollbar-none py-0.5">
          {steps.map((s, idx) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentIdx > idx;

            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div
                    className={`hidden sm:block h-[1px] w-4 sm:w-6 transition-colors ${
                      isCompleted ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-800'
                    }`}
                  />
                )}

                <button
                  onClick={() => {
                    if (s.id === 'select') {
                      onOpenLaunchpad();
                    } else {
                      onSelectStep(s.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : isCompleted
                      ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/50 hover:border-sky-400'
                      : 'bg-slate-100 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : isCompleted
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.stepNum}
                  </span>

                  <div className="text-left flex flex-col">
                    <span className="leading-tight font-bold">{s.label}</span>
                    <span className={`text-[10px] leading-none ${isActive ? 'text-sky-100' : 'text-slate-600 dark:text-slate-300'}`}>
                      {s.sublabel}
                    </span>
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Match Quick Badge & Switch Match */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end">
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-xs">
            <span className="text-slate-500 dark:text-slate-400">Match:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{gameTitle}</span>
          </div>

          <button
            onClick={onOpenLaunchpad}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-sky-500" />
            <span>Switch Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
