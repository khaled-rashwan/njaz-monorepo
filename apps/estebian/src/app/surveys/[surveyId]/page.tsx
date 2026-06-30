'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Scale } from '@/lib/types';
import { getSurveyById, getScaleById, saveSurvey } from '@/lib/storage';
import { NavigationAction } from '@/components/navigation';

export default function SurveyDetailPage() {
    const { surveyId } = useParams() as { surveyId: string };
    const { t, direction } = useLanguage();
    const router = useRouter();
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [scales, setScales] = useState<Scale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        if (surveyId) {
            loadData();
        }
    }, [surveyId]);

    async function loadData() {
        try {
            const data = await getSurveyById(surveyId);
            if (data) {
                setSurvey(data);

                // Fetch all scales
                const scaleData = await Promise.all(
                    data.scaleIds.map(id => getScaleById(id))
                );
                setScales(scaleData.filter((s): s is Scale => s !== null));
            }
        } catch (error) {
            console.error('Error loading survey:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePublish() {
        if (!survey) return;

        setIsPublishing(true);
        try {
            const updatedSurvey = {
                ...survey,
                isPublished: true,
                updatedAt: new Date().toISOString()
            };

            await saveSurvey(updatedSurvey);
            setSurvey(updatedSurvey);
            alert(t('Survey published successfully!', 'تم نشر الاستبيان بنجاح!'));
        } catch (error) {
            console.error('Error publishing survey:', error);
            alert(t('Failed to publish survey', 'فشل نشر الاستبيان'));
        } finally {
            setIsPublishing(false);
        }
    }

    function copyLink() {
        if (!surveyId) return;
        const link = `${window.location.origin}/respond/${surveyId}`;
        navigator.clipboard.writeText(link);
        alert(t('Link copied to clipboard!', 'تم نسخ الرابط!'));
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading survey...', 'جاري تحميل الاستبيان...')}</p>
                </div>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <FuturisticPanel glowColor="gold" size="lg">
                        <div className="text-center py-12 px-6">
                            <h2 className="text-2xl font-bold text-white mb-3">{t('Survey Not Found', 'الاستبيان غير موجود')}</h2>
                            <p className="text-slate-400 mb-6">{t('The survey you are looking for does not exist or has been removed.', 'الاستبيان الذي تبحث عنه غير موجود أو تم حذفه.')}</p>
                            <NavigationAction href="/surveys" label={t('Back to Surveys', 'العودة للاستبيانات')} />
                        </div>
                    </FuturisticPanel>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    const isRtl = survey.language === 'ar';

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 md:pt-36 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <NavigationAction
                            href="/surveys"
                            label={t('Back to Surveys', 'العودة للاستبيانات')}
                            className="mb-4"
                        />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2" dir={isRtl ? 'rtl' : 'ltr'}>
                                    {survey.title}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${survey.language === 'ar' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {survey.language === 'ar' ? 'العربية' : 'English'}
                                    </span>
                                    {survey.isPublished ? (
                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            {t('Published', 'منشور')}
                                        </span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-400">
                                            {t('Draft', 'مسودة')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!survey.isPublished && (
                                <button
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                    className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/40 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isPublishing ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                            <span>{t('Publishing...', 'جاري النشر...')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-base">🚀</span>
                                            <span>{t('Publish Now', 'انشر الآن')}</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Status & Public Link */}
                        {survey.isPublished && (
                            <FuturisticPanel glowColor="green" size="md">
                                <h3 className="text-sm text-slate-500 mb-4 uppercase tracking-wider font-semibold">
                                    {t('Public Participation Link', 'رابط المشاركة العامة')}
                                </h3>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                    <code className="flex-1 text-cyan-400 break-all">
                                        {typeof window !== 'undefined' ? window.location.origin : ''}/respond/{surveyId}
                                    </code>
                                    <button
                                        onClick={copyLink}
                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                        title={t('Copy Link', 'نسخ الرابط')}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-4 italic">
                                    {t('Anyone with this link can participate in the survey anonymously.', 'يمكن لأي شخص لديه هذا الرابط المشاركة في الاستبيان بشكل مجهول.')}
                                </p>
                            </FuturisticPanel>
                        )}

                        {/* Survey Basics */}
                        {survey.introduction && (
                            <FuturisticPanel glowColor="cyan" size="md">
                                <h3 className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                                    {t('Introduction', 'المقدمة')}
                                </h3>
                                <p className="text-lg text-slate-300 leading-relaxed" dir={isRtl ? 'rtl' : 'ltr'}>
                                    {survey.introduction}
                                </p>
                            </FuturisticPanel>
                        )}

                        {/* Related Scales */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </span>
                                {t('Included Scales', 'المقاييس المضمنة')}
                            </h2>

                            <div className="grid grid-cols-1 gap-4">
                                {scales.map(scale => (
                                    <Link key={scale.id} href={`/scales/${scale.id}`}>
                                        <FuturisticPanel glowColor="purple" size="sm" className="hover:scale-101 transition-transform">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-lg font-bold text-white mb-1" dir={scale.language === 'ar' ? 'rtl' : 'ltr'}>
                                                        {scale.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {scale.dimensions.length} {t('Dimensions', 'أبعاد')} • {scale.statements.length} {t('Statements', 'عبارات')}
                                                    </p>
                                                </div>
                                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </FuturisticPanel>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Demographic Fields Summary */}
                        <FuturisticPanel glowColor="gold" size="md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                                {t('Demographic Questions', 'الأسئلة الديموغرافية')}
                            </h3>
                            <div className="space-y-3">
                                {survey.demographics.map((field, idx) => (
                                    <div key={field.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-amber-400/50 font-mono text-xs">0{idx + 1}</span>
                                            <span className="text-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>{field.label}</span>
                                        </div>
                                        <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-slate-700/30 px-2 py-0.5 rounded">
                                            {t(field.type, field.type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </FuturisticPanel>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
