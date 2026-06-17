'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Report } from '@/lib/types';
import { getSurveys, getResponses, getReports } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

export default function ReportsPage() {
    const { t, language, direction } = useLanguage();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
    const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);

            const userSurveys = await getSurveys();

            // Pre-load all response counts and report counts
            const rCounts: Record<string, number> = {};
            const repCounts: Record<string, number> = {};
            await Promise.all(userSurveys.map(async (s) => {
                const [res, reps] = await Promise.all([
                    getResponses(s.id),
                    getReports(s.id)
                ]);
                rCounts[s.id] = res.length;
                repCounts[s.id] = reps.length;
            }));

            setResponseCounts(rCounts);
            setReportCounts(repCounts);
            setSurveys(userSurveys);
        } catch (error) {
            console.error("Error loading reports data:", error);
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    const publishedSurveys = surveys.filter(s => s.isPublished);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <Link
                                href="/"
                                className="futuristic-btn inline-flex items-center gap-2 text-sm mb-3"
                            >
                                {direction === 'rtl' ? (
                                    <>
                                        {t('Back to Home', 'العودة للرئيسية')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {t('Back to Home', 'العودة للرئيسية')}
                                    </>
                                )}
                            </Link>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {t('Reports & Analytics', 'التقارير والتحليلات')}
                            </h1>
                            <p className="text-slate-400">
                                {t(
                                    'Select a survey to access its reports, version history, and generate new analyses.',
                                    'اختر استبياناً للوصول إلى تقاريره وسجل الإصدارات وإنشاء تحليلات جديدة.'
                                )}
                            </p>
                        </div>
                        <Link
                            href="/reports/import"
                            className="futuristic-btn-primary self-start md:self-auto px-6 py-3 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-300"
                        >
                            <span className="material-symbols-outlined text-lg">upload_file</span>
                            {t('Import Excel / CSV', 'استيراد ملف Excel / CSV')}
                        </Link>
                    </div>

                    {/* Survey Hub */}
                    {isLoading ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">{t('Loading surveys...', 'جاري تحميل الاستبيانات...')}</p>
                        </div>
                    ) : !userId ? (
                        <FuturisticPanel glowColor="cyan" size="lg">
                            <div className="text-center py-12 px-6">
                                <h2 className="text-2xl font-bold text-white mb-3">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                                <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary px-8 py-3">{t('Sign In', 'تسجيل الدخول')}</a>
                            </div>
                        </FuturisticPanel>
                    ) : publishedSurveys.length === 0 ? (
                        <FuturisticPanel glowColor="cyan" size="lg">
                            <div className="text-center py-12">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-slate-400 mb-2">{t('No published surveys yet.', 'لا توجد استبيانات منشورة بعد.')}</p>
                                <p className="text-slate-500 text-sm">{t('Publish a survey and collect responses to generate reports.', 'انشر استبياناً واجمع استجابات لإنشاء التقارير.')}</p>
                            </div>
                        </FuturisticPanel>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {publishedSurveys.map(survey => {
                                const responseCount = responseCounts[survey.id] || 0;
                                const reportCount = reportCounts[survey.id] || 0;

                                return (
                                    <Link key={survey.id} href={`/surveys/${survey.id}/reports`} className="group block">
                                        <FuturisticPanel glowColor={reportCount > 0 ? 'green' : 'cyan'}>
                                            <div className="flex flex-col h-full">
                                                <h3 className="font-bold text-white text-lg mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                                                    {survey.title}
                                                </h3>

                                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span>{responseCount} {t('responses', 'استجابات')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <span>{survey.scaleIds.length} {t('scales', 'مقاييس')}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                                                    {reportCount > 0 ? (
                                                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                            {reportCount} {t('reports generated', 'تقارير مُنشأة')}
                                                        </span>
                                                    ) : responseCount > 0 ? (
                                                        <span className="text-xs text-cyan-400 font-bold">
                                                            {t('Ready to analyze', 'جاهز للتحليل')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-600">
                                                            {t('Awaiting responses', 'في انتظار الاستجابات')}
                                                        </span>
                                                    )}
                                                    <svg className={`w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors ${direction === 'rtl' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </FuturisticPanel>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* Pricing Note */}
                    <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/80">
                        <p className="text-sm">{t('Creating and distributing surveys is free. Reports are paid services.', 'إنشاء وتوزيع الاستبيانات مجاني. التقارير خدمات مدفوعة.')}</p>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
