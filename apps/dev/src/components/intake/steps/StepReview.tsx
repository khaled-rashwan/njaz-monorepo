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
                        'Please review everything before submitting. You can edit any section.',
                        'يرجى مراجعة كل شيء قبل الإرسال. يمكنك تعديل أي قسم.'
                    )}
                </p>
            </div>

            <div className="space-y-5">
                {/* Estimate Banner */}
                <div className="rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20 p-6 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        {t('Your Estimated Investment', 'الاستثمار المقدر')}
                    </div>
                    <div className="text-3xl font-extrabold gradient-text mb-2" dir="ltr">
                        {formatCurrency(estimate.priceMin)} – {formatCurrency(estimate.priceMax)}
                    </div>
                    <div className="text-slate-400 text-sm">
                        {estimate.estimatedWeeks} {t('weeks estimated delivery', 'أسبوع للتسليم المتوقع')}
                    </div>
                </div>

                {/* Project Types */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title={t('Project Types', 'أنواع المشاريع')}
                        stepIndex={0}
                        onEdit={onGoToStep}
                    />
                    <div className="flex flex-wrap gap-2">
                        {selectedTypes.map(pt => (
                            <span
                                key={pt.value}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
                            >
                                {pt.icon} {t(pt.labelEn, pt.labelAr)}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Features */}
                {selectedFeatures.length > 0 && (
                    <div className="futuristic-card rounded-xl p-5">
                        <SectionHeader
                            title={t('Selected Features', 'المميزات المختارة')}
                            stepIndex={1}
                            onEdit={onGoToStep}
                        />
                        <div className="flex flex-wrap gap-2">
                            {selectedFeatures.map(f => (
                                <span
                                    key={f.key}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300"
                                >
                                    <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {t(f.labelEn, f.labelAr)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title={t('Timeline', 'الجدول الزمني')}
                        stepIndex={2}
                        onEdit={onGoToStep}
                    />
                    {selectedTimeline && (
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedTimeline.icon}</span>
                            <div>
                                <div className="text-white font-medium">{t(selectedTimeline.labelEn, selectedTimeline.labelAr)}</div>
                                <div className="text-slate-500 text-xs">{t(selectedTimeline.descEn, selectedTimeline.descAr)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Brand Assets */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title={t('Brand Assets', 'الأصول البصرية')}
                        stepIndex={3}
                        onEdit={onGoToStep}
                    />
                    {formData.hasBrandAssets ? (
                        <div>
                            <p className="text-slate-300 text-sm mb-2">
                                📁 {formData.uploadedFiles.length} {t('file(s) uploaded', 'ملف(ات) مرفوعة')}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {formData.uploadedFiles.map((f, i) => (
                                    <span key={i} className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                        {f.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm space-y-1">
                            {selectedStyle && (
                                <p className="text-slate-300">
                                    <span className="text-slate-500">{t('Style:', 'الأسلوب:')}</span> {t(selectedStyle.labelEn, selectedStyle.labelAr)}
                                </p>
                            )}
                            {formData.preferredColors && (
                                <p className="text-slate-300">
                                    <span className="text-slate-500">{t('Colors:', 'الألوان:')}</span> {formData.preferredColors}
                                </p>
                            )}
                            {formData.competitors && (
                                <p className="text-slate-300">
                                    <span className="text-slate-500">{t('Inspiration:', 'الإلهام:')}</span> {formData.competitors}
                                </p>
                            )}
                            {!selectedStyle && !formData.preferredColors && !formData.competitors && (
                                <p className="text-slate-500">✨ {t('Starting from scratch', 'البدء من الصفر')}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Client Info */}
                <div className="futuristic-card rounded-xl p-5">
                    <SectionHeader
                        title={t('Contact Information', 'معلومات التواصل')}
                        stepIndex={4}
                        onEdit={onGoToStep}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500">{t('Name:', 'الاسم:')}</span>{' '}
                            <span className="text-white">{formData.clientName || '—'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">{t('Email:', 'البريد:')}</span>{' '}
                            <span className="text-white" dir="ltr">{formData.clientEmail || '—'}</span>
                        </div>
                        {formData.clientPhone && (
                            <div>
                                <span className="text-slate-500">{t('Phone:', 'الهاتف:')}</span>{' '}
                                <span className="text-white" dir="ltr">{formData.clientPhone}</span>
                            </div>
                        )}
                        {formData.companyName && (
                            <div>
                                <span className="text-slate-500">{t('Company:', 'الشركة:')}</span>{' '}
                                <span className="text-white">{formData.companyName}</span>
                            </div>
                        )}
                    </div>
                    {formData.projectDescription && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <span className="text-slate-500 text-sm">{t('Description:', 'الوصف:')}</span>
                            <p className="text-slate-300 text-sm mt-1 leading-relaxed">{formData.projectDescription}</p>
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="pt-2">
                    {!isValid && (
                        <p className="text-amber-500/70 text-xs mb-3 flex items-center gap-1.5">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                            </svg>
                            {t(
                                'Please fill in all required fields (marked with *) to submit.',
                                'يرجى ملء جميع الحقول المطلوبة (المحددة بـ *) للإرسال.'
                            )}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!isValid || isSubmitting}
                        className={`
                            w-full py-4 rounded-xl text-lg font-bold transition-all duration-300
                            ${isValid && !isSubmitting
                                ? 'futuristic-btn-primary hover:scale-[1.01]'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-slate-400/30 border-t-white rounded-full animate-spin" />
                                {t('Submitting...', 'جارِ الإرسال...')}
                            </span>
                        ) : (
                            <>🚀 {t('Submit Project Request', 'إرسال طلب المشروع')}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
