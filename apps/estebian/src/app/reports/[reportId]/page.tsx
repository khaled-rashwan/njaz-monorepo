'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { Report, Survey } from '@/lib/types';
import { getReportById, getSurveyById } from '@/lib/storage';
import { getUrl } from 'aws-amplify/storage';

export default function ReportDetailPage() {
    const { reportId } = useParams();
    const router = useRouter();
    const { t, direction, language } = useLanguage();
    const [report, setReport] = useState<Report | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (reportId) {
            loadData();
        }
    }, [reportId]);

    async function loadData() {
        try {
            const reportData = await getReportById(reportId as string);
            if (!reportData) {
                router.push('/reports');
                return;
            }
            setReport(reportData);

            const surveyData = await getSurveyById(reportData.surveyId);
            setSurvey(surveyData);
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDownloadPdf() {
        if (!report?.pdfS3Key) {
            alert(t('PDF not ready yet or not generated for this report.', 'ملف PDF غير جاهز بعد أو لم يتم إنشاؤه لهذا التقرير.'));
            return;
        }
        
        try {
            const result = await getUrl({
                path: report.pdfS3Key,
            });
            window.open(result.url.toString(), '_blank');
        } catch (err) {
            console.error('Download error:', err);
            alert(t('Failed to open PDF. Please try again.', 'فشل فتح ملف PDF. يرجى المحاولة مرة أخرى.'));
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!report) return null;

    const reportTitles = {
        demographic: t('Demographic Report', 'تقرير ديموغرافي'),
        scale: t('Scale Analysis', 'تحليل المقاييس'),
        comprehensive: t('Comprehensive Report', 'تقرير شامل'),
    };

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <Link
                                href="/reports"
                                className="futuristic-btn inline-flex items-center gap-2 text-sm mb-3"
                            >
                                <svg className={`w-4 h-4 ${direction === 'rtl' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {t('Back to Reports', 'العودة للتقارير')}
                            </Link>
                            <h1 className="text-3xl font-bold text-white mb-1">
                                {reportTitles[report.type]}
                            </h1>
                            <p className="text-slate-400">
                                {survey?.title || t('Survey Data', 'بيانات الاستبيان')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleDownloadPdf}
                                className="futuristic-btn text-sm inline-flex items-center gap-2"
                                disabled={!report?.pdfS3Key || report.status !== 'completed'}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {t('Download PDF', 'تحميل PDF')}
                            </button>
                            <button className="futuristic-btn-primary text-sm inline-flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
                                </svg>
                                {t('Share', 'مشاركة')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <FuturisticPanel glowColor="cyan" title={t('Report Summary', 'ملخص التقرير')}>
                                <div className="space-y-4 p-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t('Status', 'الحالة')}</span>
                                        <span className={report.status === 'completed' ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                            {report.status === 'completed' ? t('Completed', 'مكتمل') : t('Processing', 'جاري المعالجة')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t('Generated', 'تاريخ الإنشاء')}</span>
                                        <span className="text-white">{new Date(report.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">{t('Sample Size', 'حجم العينة')}</span>
                                        <span className="text-white">{report.data?.sampleSize || 0}</span>
                                    </div>
                                    <hr className="border-slate-800" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-2">{t('Quick Stats', 'إحصائيات سريعة')}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 rounded bg-slate-800/50 text-center">
                                                <p className="text-xs text-slate-500 uppercase">{t('Alpha', 'ألفا')}</p>
                                                <p className="text-lg font-bold text-cyan-400">
                                                    {report.data?.scaleAnalysis?.[0]?.cronbachAlpha?.toFixed(2) || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="p-2 rounded bg-slate-800/50 text-center">
                                                <p className="text-xs text-slate-500 uppercase">{t('Mean', 'المتوسط')}</p>
                                                <p className="text-lg font-bold text-purple-400">
                                                    {report.data?.scaleAnalysis?.[0]?.mean?.toFixed(2) || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </FuturisticPanel>

                            {report.data?.scaleAnalysis?.[0] && (
                                <FuturisticPanel glowColor="gold" title={t('Reliability Info', 'معلومات الثبات')}>
                                    <div className="p-4">
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-400">{t("Cronbach's Alpha", "ألفا كرونباخ")}</span>
                                                <span className="text-cyan-400 font-bold">{Math.round((report.data.scaleAnalysis[0].cronbachAlpha || 0) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-cyan-400 transition-all duration-1000" 
                                                    style={{ width: `${(report.data.scaleAnalysis[0].cronbachAlpha || 0) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {report.data.scaleAnalysis[0].cronbachAlpha > 0.7 
                                                ? t('High reliability indicates consistent survey instruments.', 'يشير الثبات العالي إلى اتساق أدوات الاستبيان.')
                                                : t('Low reliability suggests items may not be consistent.', 'يشير الثبات المنخفض إلى أن البنود قد لا تكون متسقة.')
                                            }
                                        </p>
                                    </div>
                                </FuturisticPanel>
                            )}
                        </div>

                        {/* Main Analysis Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <FuturisticPanel glowColor="purple" title={t('Dimension Performance', 'أداء الأبعاد')}>
                                <div className="p-8">
                                    {report.data?.scaleAnalysis?.[0] ? (
                                        <>
                                            <div className="h-64 flex items-end gap-4 pb-4 border-b border-l border-slate-700 mx-auto max-w-lg overflow-x-auto">
                                                {report.data.scaleAnalysis[0].dimensions.map((dim, idx) => {
                                                    const percentage = (dim.mean / 5) * 100; // Assuming Likert 5
                                                    const colors = ['from-cyan-600 to-cyan-400', 'from-purple-600 to-purple-400', 'from-pink-600 to-pink-400', 'from-amber-600 to-amber-400'];
                                                    const color = colors[idx % colors.length];
                                                    
                                                    return (
                                                        <div key={dim.dimensionId} className="flex-1 min-w-[60px] flex flex-col items-center group">
                                                            <div 
                                                                className={`w-full bg-gradient-to-t ${color} rounded-t relative group transition-all duration-1000`}
                                                                style={{ height: `${percentage}%` }}
                                                            >
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {dim.mean.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex justify-between mt-4 max-w-lg mx-auto text-[10px] text-slate-500 uppercase tracking-tighter overflow-x-auto gap-2">
                                                {report.data.scaleAnalysis[0].dimensions.map(dim => (
                                                    <span key={dim.dimensionId} className="flex-1 text-center truncate px-1" title={dim.dimensionName}>
                                                        {dim.dimensionName}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-20 text-center text-slate-500">
                                            {t('Analytical data not available for this report type.', 'البيانات التحليلية غير متوفرة لهذا النوع من التقارير.')}
                                        </div>
                                    )}
                                </div>
                            </FuturisticPanel>

                            {report.data?.demographics && (
                                <FuturisticPanel glowColor="green" title={t('Demographic Distribution', 'التوزيع الديموغرافي')}>
                                    <div className="p-4 space-y-6">
                                        {report.data.demographics.fields.map((field: any) => (
                                            <div key={field.fieldId}>
                                                <h4 className="text-white font-bold text-sm mb-3">{field.fieldLabel}</h4>
                                                <div className="space-y-2">
                                                    {Object.entries(field.distribution).map(([label, count]: [string, any]) => {
                                                        const percentage = (count / (report.data?.sampleSize || 1)) * 100;
                                                        return (
                                                            <div key={label} className="group">
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-slate-300">{label}</span>
                                                                    <span className="text-slate-500">{count} ({Math.round(percentage)}%)</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-all duration-500" 
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </FuturisticPanel>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
