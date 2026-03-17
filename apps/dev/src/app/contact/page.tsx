'use client';

import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import Link from 'next/link';
import IntakeWizard from '@/components/intake/IntakeWizard';

export default function ContactPage() {
    const { t, direction } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <Link href="/" className="futuristic-btn inline-flex items-center gap-2 text-sm !py-2 !px-3">
                            {direction === 'rtl' ? (
                                <>{t('Back', 'رجوع')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> {t('Back', 'رجوع')}</>
                            )}
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-4">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-cyan-400 text-xs font-medium">
                                {t('AI-Powered Project Planning', 'تخطيط مشاريع بالذكاء الاصطناعي')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                            {t('Start Your Project', 'ابدأ مشروعك')}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t(
                                'Tell us about your vision and get an instant estimate. Our AI will prepare a personalized proposal for you.',
                                'أخبرنا عن رؤيتك واحصل على تقدير فوري. سيقوم الذكاء الاصطناعي بإعداد عرض مخصص لك.'
                            )}
                        </p>
                    </div>

                    {/* Wizard */}
                    <IntakeWizard />
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
