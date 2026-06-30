'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from 'aws-amplify/auth';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { NavigationAction } from '@/components/navigation';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, Report } from '@/lib/types';
import { getSurveyById, getResponses, getReports } from '@/lib/storage';


export default function SurveyReportsPage() {
    const params = useParams();
    const surveyId = params.surveyId as string;
    const router = useRouter();
    const { t, language, direction } = useLanguage();
    
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [responseCount, setResponseCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [selectedType, setSelectedType] = useState<'demographic' | 'scale' | 'comprehensive'>('demographic');
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [surveyId]);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);

            const [surveyData, responsesData, reportsData] = await Promise.all([
                getSurveyById(surveyId),
                getResponses(surveyId),
                getReports(surveyId)
            ]);

            if (surveyData) {
                setSurvey(surveyData);
                setResponseCount(responsesData.length);
                setReports(reportsData);
            }
        } catch (error) {
            console.error("Error loading survey reports:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleGenerateClick = (type: 'demographic' | 'scale' | 'comprehensive', existingId?: string) => {
        router.push(`/surveys/${surveyId}/reports/new?type=${type}${existingId ? `&existingReportId=${existingId}` : ''}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg">
                <SharedHeader currentApp="estebian" />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white mb-4">{t('Survey not found', 'الاستبيان غير موجود')}</h1>
                        <NavigationAction href="/surveys" label={t('Back to Surveys', 'العودة للاستبيانات')} />
                    </div>
                </main>
            </div>
        );
    }

    const renderReportCard = (type: 'demographic' | 'scale' | 'comprehensive') => {
        const typeReports = reports.filter(r => r.type === type).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const report = typeReports[0];
        const labels = {
            demographic: { title: t('Demographic Analysis', 'التحليل الديموغرافي'), icon: 'groups' },
            scale: { title: t('Scale Performance', 'أداء المقاييس'), icon: 'analytics' },
            comprehensive: { title: t('Comprehensive Report', 'التقرير الشامل'), icon: 'description' }
        };
        const { title, icon } = labels[type];

        return (
            <FuturisticPanel glowColor={report ? 'green' : 'cyan'} size="md">
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-lg ${report ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            <span className="material-symbols-outlined text-2xl">{icon}</span>
                        </div>
                        <h3 className="font-bold text-white">{title}</h3>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-6 flex-1">
                        {type === 'demographic' && t('Understand who participated in your survey with detailed breakdowns.', 'افهم من شارك في استبيانك مع توزيعات مفصلة.')}
                        {type === 'scale' && t('Analyze the psychometric properties and results of each scale.', 'حلل الخصائص النفسية والنتائج لكل مقياس.')}
                        {type === 'comprehensive' && t('All-in-one report combining demographics and full scale analysis.', 'تقرير متكامل يجمع الديموغرافية مع تحليل المقاييس الكامل.')}
                    </p>

                    {report ? (
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">{t('Status', 'الحالة')}</span>
                                    <span className="text-emerald-400 font-bold uppercase">{report.status}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => router.push(`/reports/${report.id}?from=survey`)}
                                        className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors"
                                    >
                                        {t('View Latest Report', 'عرض أحدث تقرير')}
                                    </button>
                                    <button
                                        onClick={() => handleGenerateClick(type)}
                                        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-cyan-400 hover:border-slate-500 transition-colors"
                                        title={t('Generate New Report (Updates with new responses)', 'إنشاء تقرير جديد (يتم تحديثه بالاستجابات الجديدة)')}
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </button>
                                </div>
                            </div>
                            
                            {typeReports.length > 1 && (
                                <div className="pt-3 border-t border-slate-800">
                                    <h4 className="text-xs text-slate-500 mb-2 font-bold uppercase">{t('Version History', 'سجل الإصدارات')}</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 futuristic-scrollbar">
                                        {typeReports.slice(1).map((oldReport) => (
                                            <div key={oldReport.id} className="flex items-center justify-between p-2 rounded bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700" onClick={() => router.push(`/reports/${oldReport.id}?from=survey`)}>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(oldReport.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-emerald-500/70">{oldReport.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={() => handleGenerateClick(type)}
                            disabled={responseCount === 0}
                            className={`w-full py-2 rounded-lg font-bold transition-colors ${
                                responseCount > 0 
                                ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20' 
                                : 'bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            {responseCount > 0 ? t('Generate Now', 'إنشاء الآن') : t('Needs Responses', 'يحتاج استجابات')}
                        </button>
                    )}
                </div>
            </FuturisticPanel>
        );
    };

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 md:pt-36 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header with Breadcrumbs */}
                    <div className="mb-8">
                        <NavigationAction
                            href="/surveys"
                            label={t('Back to Surveys', 'العودة للاستبيانات')}
                            className="mb-4"
                        />
                        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <Link href="/surveys" className="hover:text-cyan-400 transition-colors">{t('My Surveys', 'استبياناتي')}</Link>
                            <span className="material-symbols-outlined text-xs">chevron_right</span>
                            <span className="text-slate-300 truncate">{survey.title}</span>
                        </nav>
                        
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{t('Reports & Analytics', 'التقارير والتحليلات')}</h1>
                                <p className="text-slate-400">{t('Professional insights for', 'تحليلات احترافية لـ')} <span className="text-cyan-400 font-bold">{survey.title}</span></p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">{t('Responses', 'الاستجابات')}</p>
                                    <p className="text-xl font-black text-white">{responseCount}</p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500 uppercase">{t('Scales', 'المقاييس')}</p>
                                    <p className="text-xl font-black text-white">{survey.scaleIds.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {renderReportCard('demographic')}
                        {renderReportCard('scale')}
                        {renderReportCard('comprehensive')}
                    </div>

                    {/* Quick Stats / Preview */}
                    <div className="mt-8">
                        <FuturisticPanel glowColor="purple" size="lg">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">{t('Results Summary', 'ملخص النتائج')}</h2>
                                <Link 
                                    href={`/surveys/${surveyId}/results`}
                                    className="text-sm text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                                >
                                    {t('View Dashboard', 'عرض لوحة التحكم')}
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                </Link>
                            </div>
                            <p className="text-slate-400 text-sm italic">
                                {t('Quick dashboard view is always available. Use the cards above to generate official PDF and psychometric reports.', 'عرض لوحة التحكم السريع متاح دائماً. استخدم البطاقات أعلاه لإنشاء التقارير الرسمية والتقارير النفسية.')}
                            </p>
                        </FuturisticPanel>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />


        </div>
    );
}
