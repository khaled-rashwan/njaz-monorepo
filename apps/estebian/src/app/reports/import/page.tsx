'use client';

import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import { ImportWizard } from '@/components/import/import-wizard';

export default function ImportPage() {
    const { t, direction } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs / Back button */}
                    <div className="mb-8">
                        <Link
                            href="/reports"
                            className="futuristic-btn inline-flex items-center gap-2 text-sm mb-3"
                        >
                            {direction === 'rtl' ? (
                                <>
                                    {t('Back to Reports', 'العودة للتقارير')}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    {t('Back to Reports', 'العودة للتقارير')}
                                </>
                            )}
                        </Link>
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
