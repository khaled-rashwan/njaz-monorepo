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
    const [reports, setReports] = useState<Report[]>([]);
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

            // Pre-load all response counts
            const counts: Record<string, number> = {};
            await Promise.all(userSurveys.map(async (s) => {
                const res = await getResponses(s.id);
                counts[s.id] = res.length;
            }));

            setResponseCounts(counts);

            const userReports = await getReports("");
            setSurveys(userSurveys);
            setReports(userReports);
        } catch {
            // User not authenticated - that's okay
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    function getResponseCount(surveyId: string): number {
        return responseCounts[surveyId] || 0;
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
                    <div className="mb-8">
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
                                'Generate professional psychometric reports from your survey data',
                                'أنشئ تقارير نفسية قياسية احترافية من بيانات استبياناتك'
                            )}
                        </p>
                    </div>

                    {/* Report Types Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <FuturisticPanel glowColor="cyan" size="md">
                            <div className="text-center py-4">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {t('Demographic Report', 'تقرير ديموغرافي')}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {t('Analyze participant demographics with charts and distributions',
                                        'تحليل الخصائص الديموغرافية للمشاركين مع رسوم بيانية وتوزيعات')}
                                </p>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel glowColor="purple" size="md">
                            <div className="text-center py-4">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {t('Scale Analysis', 'تحليل المقاييس')}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {t('Statistical analysis of scale scores with reliability metrics',
                                        'تحليل إحصائي لدرجات المقاييس مع مقاييس الموثوقية')}
                                </p>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel glowColor="gold" size="md">
                            <div className="text-center py-4">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {t('Comprehensive Report', 'تقرير شامل')}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    {t('Full psychometric analysis with cross-dimensional comparisons',
                                        'تحليل نفسي قياسي كامل مع مقارنات عبر الأبعاد')}
                                </p>
                            </div>
                        </FuturisticPanel>
                    </div>

                    {/* Available Surveys for Reports */}
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Surveys with Data', 'الاستبيانات ذات البيانات')}
                        </h2>

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                            </div>
                        ) : !userId ? (
                            // Not authenticated
                            <div className="text-center py-12 px-6">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3">
                                    {t('Authentication Required', 'المصادقة مطلوبة')}
                                </h2>
                                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                    {t(
                                        'Please sign in to view and generate reports.',
                                        'يرجى تسجيل الدخول لعرض وإنشاء التقارير.'
                                    )}
                                </p>
                                <a
                                    href={getDashboardUrl(getCurrentUrl())}
                                    className="futuristic-btn-primary inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    {t('Sign In', 'تسجيل الدخول')}
                                </a>
                            </div>
                        ) : publishedSurveys.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    {t('No published surveys', 'لا توجد استبيانات منشورة')}
                                </h3>
                                <p className="text-slate-400 mb-4">
                                    {t('Publish a survey and collect responses to generate reports',
                                        'انشر استبياناً واجمع استجابات لإنشاء تقارير')}
                                </p>
                                <Link href="/surveys" className="futuristic-btn">
                                    {t('Go to Surveys', 'اذهب للاستبيانات')}
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {publishedSurveys.map(survey => {
                                    const responseCount = getResponseCount(survey.id);
                                    return (
                                        <div key={survey.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-white mb-1">
                                                        {survey.title}
                                                    </h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                                        <span>{responseCount} {t('responses', 'استجابات')}</span>
                                                        <span>{survey.scaleIds.length} {t('scales', 'مقاييس')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {responseCount === 0 ? (
                                                        <span className="text-sm text-slate-500">
                                                            {t('No responses yet', 'لا توجد استجابات بعد')}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <button className="futuristic-btn text-sm px-3 py-2">
                                                                {t('Demographic', 'ديموغرافي')}
                                                            </button>
                                                            <button className="futuristic-btn text-sm px-3 py-2">
                                                                {t('Scale Analysis', 'تحليل المقياس')}
                                                            </button>
                                                            <button className="futuristic-btn-primary text-sm px-3 py-2">
                                                                {t('Full Report', 'تقرير كامل')}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </FuturisticPanel>

                    {/* Pricing Note */}
                    <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="font-bold text-amber-400 mb-1">
                                    {t('Report Pricing', 'تسعير التقارير')}
                                </h4>
                                <p className="text-sm text-amber-200/80">
                                    {t('Creating and distributing surveys is completely free. Reports are charged per generation to cover analysis and processing costs.',
                                        'إنشاء وتوزيع الاستبيانات مجاني تماماً. يتم احتساب رسوم التقارير لكل إنشاء لتغطية تكاليف التحليل والمعالجة.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
