'use client';

import React from 'react';

interface Step {
    number: number;
    title: string;
    titleAr: string;
    icon: React.ReactNode;
}

interface ProgressStepsProps {
    currentStep: number;
    onStepClick?: (step: number) => void;
    language: 'ar' | 'en';
}

const STEPS: Step[] = [
    {
        number: 1,
        title: 'Language',
        titleAr: 'اللغة',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
        ),
    },
    {
        number: 2,
        title: 'Survey Info',
        titleAr: 'معلومات الاستبيان',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        number: 3,
        title: 'Demographics',
        titleAr: 'البيانات الديموغرافية',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    {
        number: 4,
        title: 'Scales',
        titleAr: 'المقاييس',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
    },
    {
        number: 5,
        title: 'Review',
        titleAr: 'المراجعة',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

const STEP_COLORS = [
    { bg: 'from-purple-400 to-purple-600', glow: 'shadow-purple-500/50', border: 'border-purple-500' },
    { bg: 'from-cyan-400 to-cyan-600', glow: 'shadow-cyan-500/50', border: 'border-cyan-500' },
    { bg: 'from-amber-400 to-amber-600', glow: 'shadow-amber-500/50', border: 'border-amber-500' },
    { bg: 'from-emerald-400 to-emerald-600', glow: 'shadow-emerald-500/50', border: 'border-emerald-500' },
    { bg: 'from-pink-400 to-pink-600', glow: 'shadow-pink-500/50', border: 'border-pink-500' },
];

export default function ProgressSteps({ currentStep, onStepClick, language }: ProgressStepsProps) {
    const isRtl = language === 'ar';

    return (
        <div className="w-full mb-8">
            <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                {STEPS.map((step, index) => {
                    const isCompleted = step.number < currentStep;
                    const isCurrent = step.number === currentStep;
                    const isClickable = onStepClick && step.number <= currentStep;
                    const colors = STEP_COLORS[index];

                    return (
                        <React.Fragment key={step.number}>
                            {/* Step Circle */}
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => isClickable && onStepClick(step.number)}
                                    disabled={!isClickable}
                                    className={`
                                        relative w-12 h-12 rounded-full flex items-center justify-center
                                        transition-all duration-300 transform
                                        ${isCurrent
                                            ? `bg-gradient-to-br ${colors.bg} shadow-lg ${colors.glow} scale-110`
                                            : isCompleted
                                                ? `bg-gradient-to-br ${colors.bg} opacity-80`
                                                : 'bg-slate-700/50 border-2 border-slate-600'
                                        }
                                        ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                                    `}
                                >
                                    {isCompleted ? (
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <span className={`${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                                            {step.icon}
                                        </span>
                                    )}

                                    {/* Pulse animation for current step */}
                                    {isCurrent && (
                                        <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.bg} animate-ping opacity-30`} />
                                    )}
                                </button>

                                {/* Step Label */}
                                <span className={`
                                    mt-2 text-xs font-medium text-center max-w-[80px]
                                    ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'}
                                `}>
                                    {language === 'ar' ? step.titleAr : step.title}
                                </span>
                            </div>

                            {/* Connecting Line */}
                            {index < STEPS.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 rounded-full overflow-hidden ${isRtl ? 'rotate-180' : ''}`}>
                                    <div
                                        className={`h-full transition-all duration-500 ${step.number < currentStep
                                                ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 w-full'
                                                : 'bg-slate-700 w-full'
                                            }`}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
