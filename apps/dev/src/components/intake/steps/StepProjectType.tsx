'use client';

import { useLanguage } from '@/components/LanguageContext';
import { PROJECT_TYPES } from '@/lib/intake';
import type { IntakeFormData, ProjectType, WizardAction } from '@/lib/intake';

interface StepProjectTypeProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
}

const GLOW_MAP: Record<string, string> = {
    cyan: 'border-cyan-500/50 shadow-[0_0_20px_rgba(56,205,223,0.15)] bg-cyan-500/10',
    emerald: 'border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)] bg-emerald-500/10',
    amber: 'border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.15)] bg-amber-500/10',
    purple: 'border-purple-500/50 shadow-[0_0_20px_rgba(167,139,250,0.15)] bg-purple-500/10',
    pink: 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.15)] bg-pink-500/10',
    sky: 'border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] bg-sky-500/10',
    indigo: 'border-indigo-500/50 shadow-[0_0_20px_rgba(129,140,248,0.15)] bg-indigo-500/10',
};

const ICON_BG_MAP: Record<string, string> = {
    cyan: 'from-cyan-500/30 to-cyan-600/10',
    emerald: 'from-emerald-500/30 to-emerald-600/10',
    amber: 'from-amber-500/30 to-amber-600/10',
    purple: 'from-purple-500/30 to-purple-600/10',
    pink: 'from-pink-500/30 to-pink-600/10',
    sky: 'from-sky-500/30 to-sky-600/10',
    indigo: 'from-indigo-500/30 to-indigo-600/10',
};

export default function StepProjectType({ formData, dispatch }: StepProjectTypeProps) {
    const { t, direction } = useLanguage();
    const selected = formData.projectTypes;

    const toggle = (pt: ProjectType) => {
        dispatch({ type: 'TOGGLE_PROJECT_TYPE', projectType: pt });
    };

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('What are you looking to build?', 'ماذا تريد أن تبني؟')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'Select one or more project types. You can combine services for a comprehensive solution.',
                        'اختر نوعًا واحدًا أو أكثر من المشاريع. يمكنك الجمع بين الخدمات لحل شامل.'
                    )}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PROJECT_TYPES.map((pt) => {
                    const isSelected = selected.includes(pt.value);
                    return (
                        <button
                            key={pt.value}
                            type="button"
                            onClick={() => toggle(pt.value)}
                            className={`
                                relative p-5 rounded-xl border-2 text-start transition-all duration-300 group
                                ${isSelected
                                    ? GLOW_MAP[pt.color]
                                    : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                                }
                            `}
                        >
                            {/* Selection indicator */}
                            <div className={`
                                absolute top-3 ${direction === 'rtl' ? 'left-3' : 'right-3'}
                                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                ${isSelected
                                    ? 'border-cyan-400 bg-cyan-500/20'
                                    : 'border-slate-600'
                                }
                            `}>
                                {isSelected && (
                                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>

                            <div className="flex items-start gap-4">
                                <div className={`
                                    w-12 h-12 rounded-xl bg-gradient-to-br ${ICON_BG_MAP[pt.color]}
                                    flex items-center justify-center text-2xl flex-shrink-0
                                    group-hover:scale-110 transition-transform
                                `}>
                                    {pt.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className={`font-bold mb-1 transition-colors ${
                                        isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                    }`}>
                                        {t(pt.labelEn, pt.labelAr)}
                                    </h3>
                                    <p className="text-slate-500 text-xs leading-relaxed">
                                        {t(pt.descEn, pt.descAr)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selected.length === 0 && (
                <p className="text-amber-500/70 text-xs mt-4 flex items-center gap-1.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                    {t('Please select at least one project type to continue.', 'يرجى اختيار نوع مشروع واحد على الأقل للمتابعة.')}
                </p>
            )}
        </div>
    );
}
