'use client';

import { useLanguage } from '@/components/LanguageContext';
import { WIZARD_STEPS } from '@/lib/intake';
import type { IntakeFormData } from '@/lib/intake';

interface ProgressBarProps {
    currentStep: number;
    formData: IntakeFormData;
}

export default function ProgressBar({ currentStep, formData }: ProgressBarProps) {
    const { t, direction } = useLanguage();
    const visibleSteps = WIZARD_STEPS.filter(s => s.isVisible(formData));
    const totalSteps = visibleSteps.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
        <div className="mb-8">
            {/* Step indicators */}
            <div className="flex items-center justify-between mb-3">
                {visibleSteps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                            <div
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center text-lg
                                    transition-all duration-500 relative
                                    ${isActive
                                        ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_20px_rgba(56,205,223,0.3)]'
                                        : isCompleted
                                            ? 'bg-cyan-500/30 border-2 border-cyan-500'
                                            : 'bg-slate-800/50 border border-slate-700'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span className={isActive ? '' : 'grayscale opacity-50'}>{step.icon}</span>
                                )}
                                {isActive && (
                                    <span className="absolute inset-0 rounded-full animate-ping bg-cyan-500/10" />
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-medium text-center hidden sm:flex flex-col gap-0 leading-tight max-w-[100px] ${
                                    isActive ? 'text-cyan-400' : isCompleted ? 'text-slate-400' : 'text-slate-600'
                                }`}
                            >
                                <span>{step.titleEn}</span>
                                <span className="font-arabic opacity-60">{step.titleAr}</span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress bar track */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700 ease-out relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
                </div>
            </div>

            {/* Step counter */}
            <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span>Step {currentStep + 1} of {totalSteps}</span>
                    <span className="opacity-30">|</span>
                    <span className="font-arabic opacity-70">الخطوة {currentStep + 1} من {totalSteps}</span>
                </span>
                <span className="text-[10px] text-cyan-500/60 font-mono">
                    {Math.round(progress)}%
                </span>
            </div>
        </div>
    );
}
