'use client';

import { useLanguage } from '@/components/LanguageContext';
import { TIMELINE_OPTIONS } from '@/lib/intake';
import type { IntakeFormData, TimelineTier, WizardAction } from '@/lib/intake';

interface StepTimelineProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
}

const GLOW_MAP: Record<string, string> = {
    emerald: 'border-emerald-500/50 shadow-[0_0_25px_rgba(52,211,153,0.15)] bg-emerald-500/10',
    amber: 'border-amber-500/50 shadow-[0_0_25px_rgba(251,191,36,0.15)] bg-amber-500/10',
    pink: 'border-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.15)] bg-pink-500/10',
};

const BADGE_COLOR_MAP: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export default function StepTimeline({ formData, dispatch }: StepTimelineProps) {
    const { t, direction } = useLanguage();

    const select = (value: TimelineTier) => {
        dispatch({ type: 'UPDATE_DATA', payload: { timeline: value } });
    };

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('How fast do you need it?', 'كم تحتاج من الوقت؟')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'Faster delivery requires more resources and carries a premium.',
                        'التسليم الأسرع يتطلب موارد أكثر ويحمل علاوة إضافية.'
                    )}
                </p>
            </div>

            <div className="space-y-4">
                {TIMELINE_OPTIONS.map((opt) => {
                    const isSelected = formData.timeline === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => select(opt.value)}
                            className={`
                                w-full relative p-6 rounded-xl border-2 text-start transition-all duration-300 group
                                ${isSelected
                                    ? GLOW_MAP[opt.color]
                                    : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className="flex items-center gap-5">
                                {/* Icon */}
                                <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                                    {opt.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className={`text-lg font-bold transition-colors ${
                                            isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                        }`}>
                                            {opt.labelEn} <span className="text-slate-500 mx-1">/</span> <span className="font-arabic font-normal">{opt.labelAr}</span>
                                        </h3>
                                        <span className={`
                                            text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1
                                            ${isSelected ? BADGE_COLOR_MAP[opt.color] : 'bg-slate-800 text-slate-500 border-slate-700'}
                                        `}>
                                            {opt.badgeEn} <span className="mx-0.5 opacity-50">/</span> {opt.badgeAr}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-[11px]">
                                        {opt.descEn} <span className="text-slate-700 mx-1">/</span> <span className="font-arabic">{opt.descAr}</span>
                                    </p>
                                </div>

                                {/* Radio indicator */}
                                <div className={`
                                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                    ${isSelected ? 'border-cyan-400' : 'border-slate-600'}
                                `}>
                                    {isSelected && (
                                        <div className="w-3 h-3 rounded-full bg-cyan-400" />
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
