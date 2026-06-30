'use client';

import { useSearchParams } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import { ImportWizard } from '@/components/import/import-wizard';
import { NavigationAction } from '@/components/navigation';

export default function ImportPage() {
    const { t, direction } = useLanguage();
    const searchParams = useSearchParams();
    const fromSurveys = searchParams.get('from') === 'surveys';

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 md:pt-36 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs / Back button */}
                    <div className="mb-8">
                        <NavigationAction
                            href={fromSurveys ? '/surveys' : '/reports'}
                            label={fromSurveys ? t('Back to Surveys', 'العودة للاستبيانات') : t('Back to Reports', 'العودة للتقارير')}
                            className="mb-3"
                        />
                        <h1 className="text-3xl font-bold text-white mb-2">
                            📥 {t('Import Data & Generate Analytics', 'استيراد البيانات وإجراء التحليلات')}
                        </h1>
                        <p className="text-slate-400">
                            {t(
                                'Import raw Excel/CSV sheets from Google Forms, Google Sheets, or manual entry and configure mapping for instant reports.',
                                'قم باستيراد أوراق البيانات من نماذج Google أو جداول البيانات أو الإدخال اليدوي، وحدد التصنيف المناسب لإجراء التحليلات فوراً.'
                            )}
                        </p>
                    </div>

                    {/* Import Wizard container */}
                    <ImportWizard />
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
