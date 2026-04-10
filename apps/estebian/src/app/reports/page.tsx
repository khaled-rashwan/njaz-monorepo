'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Report } from '@/lib/types';
import { getSurveys, getResponses, getReports } from '@/lib/storage';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import ReportGenerationModal from '@/components/ReportGenerationModal';

export default function ReportsPage() {
    const { t, language, direction } = useLanguage();
    const router = useRouter();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [selectedType, setSelectedType] = useState<'demographic' | 'scale' | 'comprehensive'>('demographic');

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

            // Fetch all reports for the user
            const userReports = await getReports("");
            setSurveys(userSurveys);
            setReports(userReports);
        } catch (error) {
            console.error("Error loading reports data:", error);
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    function getResponseCount(surveyId: string): number {
        return responseCounts[surveyId] || 0;
    }

    function getExistingReport(surveyId: string, type: string) {
        return reports.find(r => r.surveyId === surveyId && r.type === type);
    }

    const handleActionClick = (survey: Survey, type: 'demographic' | 'scale' | 'comprehensive') => {
        const existing = getExistingReport(survey.id, type);
        if (existing) {
            router.push(`/reports/${existing.id}`);
        } else {
            setSelectedSurvey(survey);
            setSelectedType(type);
            setShowModal(true);
        }
    };

    const handleGenerationSuccess = (reportId: string) => {
        setShowModal(false);
        // Refresh data to show the new report in the list
        loadData();
        // Optional: transition to the report page
        router.push(`/reports/${reportId}`);
    };

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
                            <div className="text-center py-12 px-6">
                                <h2 className="text-2xl font-bold text-white mb-3">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                                <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary px-8 py-3">{t('Sign In', 'تسجيل الدخول')}</a>
                            </div>
                        ) : publishedSurveys.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400 mb-4">{t('No published surveys yet.', 'لا توجد استبيانات منشورة بعد.')}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                 {publishedSurveys.map(survey => {
                                    const responseCount = getResponseCount(survey.id);
                                    
                                    const demoReport = getExistingReport(survey.id, 'demographic');
                                    const scaleReport = getExistingReport(survey.id, 'scale');
                                    const compReport = getExistingReport(survey.id, 'comprehensive');

                                    const renderBadge = (report?: Report) => {
                                        if (!report) return null;
                                        const config: any = {
                                            completed: { color: 'text-emerald-400', label: t('Ready', 'جاهز'), pulse: false },
                                            computing: { color: 'text-amber-400', label: t('Computing', 'جاري...'), pulse: true },
                                            generating_pdf: { color: 'text-amber-400', label: t('Processing', 'جاري...'), pulse: true },
                                            payment_verified: { color: 'text-amber-400', label: t('Processing', 'جاري...'), pulse: true },
                                            payment_failed: { color: 'text-red-400', label: t('Failed', 'فشل'), pulse: false },
                                            computation_failed: { color: 'text-red-400', label: t('Error', 'خطأ'), pulse: false },
                                        };
                                        const c = config[report.status] || { color: 'text-slate-500', label: report.status, pulse: false };
                                        return (
                                            <span className={`text-[10px] font-bold block leading-none ${c.color} ${c.pulse ? 'animate-pulse' : ''}`}>
                                                {c.label}
                                            </span>
                                        );
                                    };

                                    return (
                                        <div key={survey.id} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-white mb-1">{survey.title}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                                        <span>{responseCount} {t('responses', 'استجابات')}</span>
                                                        <span>{survey.scaleIds.length} {t('scales', 'مقاييس')}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {responseCount === 0 ? (
                                                        <span className="text-sm text-slate-500">{t('No responses yet', 'لا توجد استجابات بعد')}</span>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={() => handleActionClick(survey, 'demographic')}
                                                                className={`text-sm px-3 py-2 rounded-lg transition-colors border text-left min-w-[120px] ${
                                                                    demoReport 
                                                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20" 
                                                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                                                }`}
                                                            >
                                                                <span className="block mb-1">{demoReport ? t('View Demo', 'عرض الديموغرافية') : t('Generate Demo', 'إنشاء الديموغرافية')}</span>
                                                                {renderBadge(demoReport)}
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => handleActionClick(survey, 'scale')}
                                                                className={`text-sm px-3 py-2 rounded-lg transition-colors border text-left min-w-[120px] ${
                                                                    scaleReport 
                                                                    ? "bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20" 
                                                                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                                                }`}
                                                            >
                                                                <span className="block mb-1">{scaleReport ? t('View Analysis', 'عرض التحليل') : t('Generate Analysis', 'إنشاء التحليل')}</span>
                                                                {renderBadge(scaleReport)}
                                                            </button>

                                                            <button 
                                                                onClick={() => handleActionClick(survey, 'comprehensive')}
                                                                className={`text-sm px-3 py-2 rounded-lg transition-colors border text-left min-w-[140px] ${
                                                                    compReport 
                                                                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 font-bold" 
                                                                    : "futuristic-btn-primary"
                                                                }`}
                                                            >
                                                                <span className="block mb-1">{compReport ? t('View Full', 'عرض الشامل') : t('Full Report', 'تقرير شامل')}</span>
                                                                {renderBadge(compReport)}
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
                    <div className="mt-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200/80">
                        <p className="text-sm">{t('Creating and distributing surveys is free. Reports are paid services.', 'إنشاء وتوزيع الاستبيانات مجاني. التقارير خدمات مدفوعة.')}</p>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />

            {selectedSurvey && (
                <ReportGenerationModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    survey={selectedSurvey}
                    reportType={selectedType}
                    onSuccess={handleGenerationSuccess}
                />
            )}
        </div>
    );
}
