'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { calculateEstimate, formatCurrency } from '@/lib/intake';
import type { IntakeFormData } from '@/lib/intake';

interface EstimateCardProps {
    formData: IntakeFormData;
}

export default function EstimateCard({ formData }: EstimateCardProps) {
    const { t, direction } = useLanguage();

    const estimate = useMemo(() => calculateEstimate(formData), [formData]);

    if (estimate.priceMin === 0) {
        return (
            <div className="futuristic-card rounded-xl p-5 border-dashed !border-slate-700">
                <div className="text-center">
                    <div className="text-2xl mb-2 opacity-40">📊</div>
                    <p className="text-slate-500 text-sm">
                        {t(
                            'Select project types to see your estimate',
                            'اختر نوع المشروع لرؤية التقدير'
                        )}
                    </p>
                </div>
            </div>
        );
    }

    const complexityColor = estimate.complexityScore <= 3
        ? 'text-emerald-400'
        : estimate.complexityScore <= 6
            ? 'text-amber-400'
            : 'text-pink-400';

    const complexityLabel = estimate.complexityScore <= 3
        ? t('Simple', 'بسيط')
        : estimate.complexityScore <= 6
            ? t('Moderate', 'متوسط')
            : t('Complex', 'معقد');

    return (
        <div className="futuristic-card rounded-xl overflow-hidden">
            {/* Header with glow */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-5 py-3 border-b border-cyan-500/20">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-cyan-400">⚡</span>
                    {t('Live Estimate', 'التقدير المباشر')}
                </h3>
            </div>

            <div className="p-5 space-y-4">
                {/* Price Range */}
                <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                        {t('Estimated Budget', 'الميزانية التقديرية')}
                    </div>
                    <div className="text-2xl font-extrabold gradient-text" dir="ltr">
                        {formatCurrency(estimate.priceMin)} – {formatCurrency(estimate.priceMax)}
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{t('Timeline', 'المدة')}</span>
                    <span className="text-white font-semibold">
                        {estimate.estimatedWeeks} {t('weeks', 'أسابيع')}
                    </span>
                </div>

                {/* Complexity */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{t('Complexity', 'التعقيد')}</span>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1.5 h-3 rounded-sm transition-all ${
                                        i < estimate.complexityScore
                                            ? estimate.complexityScore <= 3
                                                ? 'bg-emerald-400'
                                                : estimate.complexityScore <= 6
                                                    ? 'bg-amber-400'
                                                    : 'bg-pink-400'
                                            : 'bg-slate-700'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className={`text-xs font-medium ${complexityColor}`}>{complexityLabel}</span>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="pt-3 border-t border-slate-700/50 space-y-2">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                        {t('Breakdown', 'التفاصيل')}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{t('Base Cost', 'التكلفة الأساسية')}</span>
                        <span className="text-slate-300 font-mono" dir="ltr">
                            {formatCurrency(estimate.breakdown.basePrice.min)} – {formatCurrency(estimate.breakdown.basePrice.max)}
                        </span>
                    </div>

                    {estimate.breakdown.featuresCost.min > 0 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{t('+ Features', '+ المميزات')}</span>
                            <span className="text-cyan-400 font-mono" dir="ltr">
                                +{formatCurrency(estimate.breakdown.featuresCost.min)} – {formatCurrency(estimate.breakdown.featuresCost.max)}
                            </span>
                        </div>
                    )}

                    {estimate.breakdown.timelineMultiplier.factor > 1 && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">{t('× Timeline', '× الجدول الزمني')}</span>
                            <span className="text-amber-400 font-mono">
                                ×{estimate.breakdown.timelineMultiplier.factor}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
