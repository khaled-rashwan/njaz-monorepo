'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import {
    PROJECT_TYPES, FEATURES, TIMELINE_OPTIONS,
    STYLE_OPTIONS, calculateEstimate, formatCurrency,
} from '@/lib/intake';
import type { IntakeFormData, WizardAction } from '@/lib/intake';

interface StepReviewProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
    onGoToStep: (step: number) => void;
    isSubmitting: boolean;
    onSubmit: () => void;
}

function SectionHeader({
    title,
    stepIndex,
    onEdit,
}: {
    title: string;
    stepIndex: number;
    onEdit: (step: number) => void;
}) {
    const { t } = useLanguage();
    return (
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">{title}</h3>
            <button
                type="button"
                onClick={() => onEdit(stepIndex)}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors flex items-center gap-1"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {t('Edit', 'تعديل')}
            </button>
        </div>
    );
}

export default function StepReview({ formData, dispatch, onGoToStep, isSubmitting, onSubmit }: StepReviewProps) {
    const { t, language, direction } = useLanguage();
    const estimate = useMemo(() => calculateEstimate(formData), [formData]);

    const selectedTypes = PROJECT_TYPES.filter(pt => formData.projectTypes.includes(pt.value));
    const selectedFeatures = FEATURES.filter(f => formData.features[f.key]);
    const selectedTimeline = TIMELINE_OPTIONS.find(o => o.value === formData.timeline);
    const selectedStyle = STYLE_OPTIONS.find(s => s.valueEn === formData.stylePreference);

    const isValid = formData.projectTypes.length > 0
        && formData.clientName.trim().length > 0
        && formData.clientEmail.trim().length > 0
        && formData.projectDescription.trim().length > 0;

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('Review Your Project', 'مراجعة مشروعك')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'Please review everything before submitting.',
                        'يرجى مراجعة كل شيء قبل الإرسال.'
                    )}
                </p>
            </div>

            <div className="space-y-5">
                {/* Estimate Banner */}
                <div className="rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 p-6 text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                        Estimated Investment <span className="mx-1">/</span> الاستثمار المقدر
                    </div>
                    <div className="text-3xl font-extrabold gradient-text mb-2" dir="ltr">
                        {formatCurrency(estimate.priceMin)} – {formatCurrency(estimate.priceMax)}
                    </div>
                    <div className="text-slate-400 text-xs">
                        {estimate.estimatedWeeks} {t('weeks estimated delivery', 'أسبوع للتسليم المتوقع')}
                    </div>
                </div>

                {/* Project Types */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title="Project & Identity / المشروع والهوية"
                        stepIndex={0}
                        onEdit={onGoToStep}
                    />
                    <div className="mb-4 pt-2 flex flex-wrap gap-2">
                        {selectedTypes.map(pt => (
                            <span
                                key={pt.value}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                            >
                                {pt.icon} {pt.labelEn} <span className="text-slate-600">/</span> {pt.labelAr}
                            </span>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-800/50 pt-4">
                        <div>
                            <span className="text-slate-500">Name / الاسم:</span> <span className="text-white">{formData.clientName}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Email / البريد:</span> <span className="text-white" dir="ltr">{formData.clientEmail}</span>
                        </div>
                    </div>
                </div>

                {/* Features & Timeline (Step 1) */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title="Needs & Timeline / الاحتياجات والجدول"
                        stepIndex={1}
                        onEdit={onGoToStep}
                    />
                    <div className="space-y-4 pt-2">
                        {selectedTimeline && (
                            <div className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                                <span className="text-2xl">{selectedTimeline.icon}</span>
                                <div>
                                    <div className="text-white text-xs font-medium">
                                        {selectedTimeline.labelEn} <span className="mx-1">/</span> {selectedTimeline.labelAr}
                                    </div>
                                    <div className="text-slate-500 text-[10px]">
                                        {selectedTimeline.descEn} <span className="mx-1">/</span> {selectedTimeline.descAr}
                                    </div>
                                </div>
                            </div>
                        )}
                        {selectedFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedFeatures.map(f => (
                                    <span
                                        key={f.key}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300"
                                    >
                                        {f.labelEn} <span className="mx-0.5 opacity-50">/</span> {f.labelAr}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Vision & Assets (Step 2) */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title="Vision & Assets / الرؤية والأصول"
                        stepIndex={2}
                        onEdit={onGoToStep}
                    />
                    <div className="space-y-3 pt-2">
                        {formData.projectDescription && (
                            <div>
                                <span className="text-slate-500 text-[10px] uppercase">Description / وصف المشروع:</span>
                                <p className="text-slate-300 text-xs mt-1 leading-relaxed line-clamp-3">{formData.projectDescription}</p>
                            </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-[10px]">
                            {formData.hasBrandAssets ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Files Attached <span className="mx-0.5">/</span> مرفق ملفات ({formData.uploadedFiles.length})
                                </span>
                            ) : selectedStyle ? (
                                <span className="text-slate-400">
                                    Style: <span className="text-slate-200">{selectedStyle.labelEn} / {selectedStyle.labelAr}</span>
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!isValid || isSubmitting}
                        className={`
                            w-full py-4 rounded-xl text-lg font-bold transition-all duration-300 relative overflow-hidden group
                            ${isValid && !isSubmitting
                                ? 'futuristic-btn-primary hover:scale-[1.01]'
                                : 'bg-slate-700/30 text-slate-600 cursor-not-allowed border border-slate-700'
                            }
                        `}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-slate-400/30 border-t-white rounded-full animate-spin" />
                                {t('Analyzing & Sending...', 'جاري التحليل والإرسال...')}
                            </span>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <span className="flex items-center gap-2">
                                    <span>Analyze & Submit</span>
                                    <span className="text-slate-900/50">/</span>
                                    <span className="font-arabic font-normal">تحليل وإرسال</span>
                                </span>
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        )}
                    </button>
                    {!isValid && (
                        <p className="text-amber-500/70 text-[10px] mt-3 text-center">
                            Please complete all required fields <span className="mx-1">/</span> يرجى إكمال جميع الحقول
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
