'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { SurveyCard } from '@/components/SurveyCard';
import { Survey } from '@/lib/types';
import { getSurveys, getResponses, deleteSurvey } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';

export default function SurveysPage() {
    const { t, language, direction } = useLanguage();
    const [surveys, setSurveys] = useState<Survey[]>([]);
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
            setSurveys(userSurveys);
        } catch {
            // User not authenticated - that's okay
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(surveyId: string) {
        if (confirm(t('Are you sure you want to delete this survey?', 'هل أنت متأكد من حذف هذا الاستبيان؟'))) {
            await deleteSurvey(surveyId);
            setSurveys(surveys.filter(s => s.id !== surveyId));
        }
    }

    function getResponseCount(surveyId: string): number {
        return responseCounts[surveyId] || 0;
    }

    function copyLink(surveyId: string) {
        const link = `${window.location.origin}/respond/${surveyId}`;
        navigator.clipboard.writeText(link);
        alert(t('Link copied to clipboard!', 'تم نسخ الرابط!'));
    }

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
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
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
                                {t('My Surveys', 'استبياناتي')}
                            </h1>
                            <p className="text-slate-400">
                                {t(
                                    'Create and manage your survey instruments',
                                    'أنشئ وأدر أدوات الاستبيان الخاصة بك'
                                )}
                            </p>
                        </div>
                        <Link
                            href="/surveys/new"
                            className="group relative px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-3 justify-center
                                       bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500
                                       text-white shadow-lg shadow-cyan-500/30
                                       hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105
                                       transition-all duration-300 overflow-hidden"
                        >
                            {/* Animated Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                           translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="relative z-10">{t('Create New Survey', 'إنشاء استبيان جديد')}</span>
                        </Link>
                    </div>


                    {/* Surveys List */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">{t('Loading surveys...', 'جاري تحميل الاستبيانات...')}</p>
                        </div>
                    ) : !userId ? (
                        // Not authenticated
                        <div className="flex items-center justify-center min-h-[50vh]">
                            <FuturisticPanel glowColor="purple" size="lg">
                                <div className="text-center py-12 px-6">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                                        <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        {t('Authentication Required', 'المصادقة مطلوبة')}
                                    </h2>
                                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                        {t(
                                            'Please sign in to view and manage your surveys.',
                                            'يرجى تسجيل الدخول لعرض وإدارة استبياناتك.'
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
                            </FuturisticPanel>
                        </div>
                    ) : surveys.length === 0 ? (
                        <FuturisticPanel glowColor="purple" size="lg">
                            <div className="text-center py-12">
                                <svg className="w-20 h-20 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {t('No surveys yet', 'لا توجد استبيانات بعد')}
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    {t('Create your first survey to start collecting responses!',
                                        'أنشئ استبيانك الأول لبدء جمع الاستجابات!')}
                                </p>
                                <Link
                                    href="/surveys/new"
                                    className="futuristic-btn-primary inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    {t('Create First Survey', 'إنشاء أول استبيان')}
                                </Link>
                            </div>
                        </FuturisticPanel>
                    ) : (
                        <div className="space-y-4">
                            {surveys.map(survey => {
                                const responseCount = getResponseCount(survey.id);
                                return (
                                    <SurveyCard
                                        key={survey.id}
                                        id={survey.id}
                                        title={survey.title}
                                        titleAr={survey.language === 'ar' ? survey.title : undefined}
                                        responses={responseCount}
                                        isPublished={survey.isPublished}
                                        lastUpdate={new Date(survey.createdAt).toLocaleDateString(survey.language === 'ar' ? 'ar-SA' : 'en-US')}
                                        language={survey.language as 'ar' | 'en'}
                                        onEdit={(id) => window.location.href = `/surveys/${id}`}
                                        onResults={(id) => window.location.href = `/surveys/${id}/results`}
                                        onReports={(id) => window.location.href = `/surveys/${id}/reports`}
                                        onCopyLink={copyLink}
                                        onDelete={handleDelete}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
