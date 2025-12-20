'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey } from '@/lib/types';
import { getSurveys, getResponses, deleteSurvey } from '@/lib/storage';

export default function SurveysPage() {
    const { t, language, direction } = useLanguage();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);
            const userSurveys = getSurveys(user.username);
            setSurveys(userSurveys);
        } catch {
            window.location.href = 'https://dashboard.njaz.org';
        } finally {
            setIsLoading(false);
        }
    }

    function handleDelete(surveyId: string) {
        if (confirm(t('Are you sure you want to delete this survey?', 'هل أنت متأكد من حذف هذا الاستبيان؟'))) {
            deleteSurvey(surveyId);
            setSurveys(surveys.filter(s => s.id !== surveyId));
        }
    }

    function getResponseCount(surveyId: string): number {
        return getResponses(surveyId).length;
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
                            className="futuristic-btn-primary inline-flex items-center gap-2 justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {t('Create New Survey', 'إنشاء استبيان جديد')}
                        </Link>
                    </div>

                    {/* Surveys List */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">{t('Loading surveys...', 'جاري تحميل الاستبيانات...')}</p>
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
                                    <FuturisticPanel key={survey.id} glowColor={survey.isPublished ? 'green' : 'purple'} size="md">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-white" dir={survey.language === 'ar' ? 'rtl' : 'ltr'}>
                                                        {survey.title}
                                                    </h3>
                                                    {/* Language badge */}
                                                    <span className={`text-xs px-2 py-1 rounded ${survey.language === 'ar'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {survey.language === 'ar' ? 'عربي' : 'EN'}
                                                    </span>
                                                    {survey.isPublished ? (
                                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                                            {t('Published', 'منشور')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                                                            {t('Draft', 'مسودة')}
                                                        </span>
                                                    )}
                                                </div>
                                                {survey.introduction && (
                                                    <p className="text-sm text-slate-400 line-clamp-1 mb-3" dir={survey.language === 'ar' ? 'rtl' : 'ltr'}>
                                                        {survey.introduction}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-6 text-sm text-slate-500 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                        {survey.scaleIds.length} {t('scales', 'مقاييس')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        {responseCount} {t('responses', 'استجابات')}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {new Date(survey.createdAt).toLocaleDateString(survey.language === 'ar' ? 'ar-SA' : 'en-US')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {survey.isPublished && (
                                                    <button
                                                        onClick={() => copyLink(survey.id)}
                                                        className="futuristic-btn text-sm px-3 py-2 flex items-center gap-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                                        </svg>
                                                        {t('Copy Link', 'نسخ الرابط')}
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/surveys/${survey.id}`}
                                                    className="futuristic-btn text-sm px-3 py-2"
                                                >
                                                    {t('Edit', 'تعديل')}
                                                </Link>
                                                {survey.isPublished && responseCount > 0 && (
                                                    <Link
                                                        href={`/surveys/${survey.id}/results`}
                                                        className="futuristic-btn text-sm px-3 py-2"
                                                    >
                                                        {t('Results', 'النتائج')}
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(survey.id)}
                                                    className="text-red-400 hover:text-red-300 p-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </FuturisticPanel>
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
