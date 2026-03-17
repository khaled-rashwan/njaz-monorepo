'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { FEATURES } from '@/lib/intake';
import type { IntakeFormData, FeatureKey, WizardAction } from '@/lib/intake';

interface StepFeaturesProps {
    formData: IntakeFormData;
    dispatch: React.Dispatch<WizardAction>;
}

export default function StepFeatures({ formData, dispatch }: StepFeaturesProps) {
    const { t, direction } = useLanguage();

    // Filter features relevant to selected project types
    const relevantFeatures = useMemo(() => {
        return FEATURES.filter(f =>
            f.relevantTo.some(pt => formData.projectTypes.includes(pt))
        );
    }, [formData.projectTypes]);

    // Group features by first relevant project type for visual grouping
    const groupedFeatures = useMemo(() => {
        const groups: Record<string, typeof relevantFeatures> = {};
        for (const feature of relevantFeatures) {
            const primaryType = feature.relevantTo.find(pt => formData.projectTypes.includes(pt)) || 'other';
            if (!groups[primaryType]) groups[primaryType] = [];
            groups[primaryType].push(feature);
        }
        return groups;
    }, [relevantFeatures, formData.projectTypes]);

    const toggle = (key: FeatureKey) => {
        dispatch({ type: 'TOGGLE_FEATURE', feature: key });
    };

    const selectedCount = Object.values(formData.features).filter(Boolean).length;

    const GROUP_LABELS: Record<string, { en: string; ar: string }> = {
        website: { en: 'Website Features', ar: 'مميزات الموقع' },
        mobile_app: { en: 'Mobile App Features', ar: 'مميزات التطبيق' },
        ecommerce: { en: 'E-Commerce Features', ar: 'مميزات المتجر' },
        branding: { en: 'Branding Features', ar: 'مميزات الهوية' },
        campaign: { en: 'Campaign Features', ar: 'مميزات الحملة' },
        cloud: { en: 'Cloud & DevOps', ar: 'السحابة و DevOps' },
        seo: { en: 'SEO & Analytics', ar: 'SEO والتحليلات' },
    };

    return (
        <div className="wizard-step-enter">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('What features do you need?', 'ما المميزات التي تحتاجها؟')}
                </h2>
                <p className="text-slate-400 text-sm">
                    {t(
                        'Toggle the features you want. Each adds to your estimate.',
                        'فعّل المميزات التي تريدها. كل ميزة تُضاف إلى التقدير.'
                    )}
                </p>
                {selectedCount > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                        <span className="text-cyan-400 text-xs font-medium">
                            {selectedCount} {t('selected', 'محددة')}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {Object.entries(groupedFeatures).map(([groupKey, features]) => (
                    <div key={groupKey}>
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-8 h-[1px] bg-slate-700" />
                            {t(
                                GROUP_LABELS[groupKey]?.en || groupKey,
                                GROUP_LABELS[groupKey]?.ar || groupKey
                            )}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {features.map((feature) => {
                                const isEnabled = !!formData.features[feature.key];
                                return (
                                    <button
                                        key={feature.key}
                                        type="button"
                                        onClick={() => toggle(feature.key)}
                                        className={`
                                            flex items-center gap-3 p-3.5 rounded-lg border transition-all duration-200 text-start
                                            ${isEnabled
                                                ? 'border-cyan-500/40 bg-cyan-500/10'
                                                : 'border-slate-700/50 bg-slate-800/20 hover:border-slate-600 hover:bg-slate-800/40'
                                            }
                                        `}
                                    >
                                        {/* Toggle Switch */}
                                        <div className={`
                                            w-10 h-5 rounded-full relative flex-shrink-0 transition-colors duration-200
                                            ${isEnabled ? 'bg-cyan-500' : 'bg-slate-700'}
                                        `}>
                                            <div className={`
                                                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200
                                                ${isEnabled
                                                    ? (direction === 'rtl' ? 'left-0.5' : 'left-[22px]')
                                                    : (direction === 'rtl' ? 'left-[22px]' : 'left-0.5')
                                                }
                                            `} />
                                        </div>

                                        <span className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-slate-400'}`}>
                                            {t(feature.labelEn, feature.labelAr)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {relevantFeatures.length === 0 && (
                <div className="text-center py-10">
                    <div className="text-3xl mb-3 opacity-40">⚙️</div>
                    <p className="text-slate-500 text-sm">
                        {t(
                            'Go back and select project types to see available features.',
                            'ارجع واختر أنواع المشاريع لرؤية المميزات المتاحة.'
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}
