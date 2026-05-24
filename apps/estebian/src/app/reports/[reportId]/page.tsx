'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { Report, Survey, CorrelationEntry, InterScaleCorrelation } from '@/lib/types';
import { getReportById, getSurveyById } from '@/lib/storage';
import { getUrl } from 'aws-amplify/storage';
import ReportGenerationModal from '@/components/ReportGenerationModal';

export default function ReportDetailPage() {
    const { reportId } = useParams();
    const router = useRouter();
    const { t, direction, language } = useLanguage();
    const [report, setReport] = useState<Report | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

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

    async function handleDownloadWord() {
        if (!report) {
            console.error('No report data');
            return;
        }

        if (!report.pdfS3Key) {
            alert(t('Document is not ready or not available for this report. Please regenerate the report.', 'المستند غير جاهز أو غير متوفر لهذا التقرير. يرجى إعادة إنشاء التقرير.'));
            return;
        }
        
        try {
            // Get pre-signed URL from Amplify Storage
            const result = await getUrl({
                path: report.pdfS3Key,
                options: {
                    validateObjectExistence: false, // Set to false to avoid permission issues if listing is not allowed
                    expiresIn: 3600 // 1 hour
                }
            });

            // Open the URL in a new tab (triggers download for docx)
            window.open(result.url.toString(), '_blank');
            
        } catch (err) {
            console.error('Download error:', err);
            alert(t('Failed to download Word document. Please try again.', 'فشل تحميل مستند Word. يرجى المحاولة مرة أخرى.'));
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

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8" dir={direction}>
                <div id="report-content" className="max-w-5xl mx-auto pb-8">
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
                        <div id="report-buttons" className="flex gap-2">
                            <button 
                                onClick={() => setShowModal(true)}
                                className="futuristic-btn text-sm inline-flex items-center gap-2 hover:text-cyan-400"
                            >
                                <span className="material-symbols-outlined text-base">refresh</span>
                                {t('Regenerate Data', 'تحديث البيانات')}
                            </button>
                            <button 
                                onClick={handleDownloadWord}
                                className="futuristic-btn text-sm inline-flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {t('Download Word', 'تحميل Word')}
                            </button>
                            <button className="futuristic-btn text-sm inline-flex items-center gap-2 hover:text-cyan-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
                                </svg>
                                {t('Share', 'مشاركة')}
                            </button>
                        </div>
                    </div>

                    {/* Per-Scale Analysis */}
                    {report.data?.scaleAnalysis?.map((scale, scaleIdx) => {
                        const ds = scale.descriptiveStats;
                        const rel = scale.reliability;
                        const alphaLabel = (a: number) => {
                            if (a >= 0.9) return { text: t('Excellent', 'ممتاز'), color: 'text-emerald-400' };
                            if (a >= 0.8) return { text: t('Good', 'جيد'), color: 'text-emerald-400' };
                            if (a >= 0.7) return { text: t('Acceptable', 'مقبول'), color: 'text-cyan-400' };
                            if (a >= 0.6) return { text: t('Questionable', 'مشكوك فيه'), color: 'text-amber-400' };
                            return { text: t('Poor', 'ضعيف'), color: 'text-red-400' };
                        };

                        return (
                            <div key={scale.scaleId} className="space-y-6 mb-12">
                                {/* Scale Header */}
                                <div className="border-b border-slate-800 pb-3">
                                    <h2 className="text-xl font-bold text-white">{scale.scaleName}</h2>
                                    <p className="text-sm text-slate-500">
                                        {scale.statementCount} {t('statements', 'عبارة')} · {scale.sampleSize} {t('respondents', 'مشارك')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* ── LEFT COLUMN: Summary & Reliability ── */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* Descriptive Stats Card */}
                                        {ds && (
                                            <FuturisticPanel glowColor="cyan" title={t('Descriptive Statistics', 'الإحصاءات الوصفية')}>
                                                <div className="space-y-2 text-sm">
                                                    {[
                                                        [t('Mean', 'المتوسط'), ds.mean],
                                                        [t('Std. Dev', 'الانحراف المعياري'), ds.std],
                                                        [t('Variance', 'التباين'), ds.variance],
                                                        [t('Median', 'الوسيط'), ds.median],
                                                        [t('Min', 'الحد الأدنى'), ds.min],
                                                        [t('Max', 'الحد الأقصى'), ds.max],
                                                        [t('Skewness', 'الالتواء'), (ds as any).skewness],
                                                        [t('Kurtosis', 'التفرطح'), (ds as any).kurtosis],
                                                    ].filter(([_, v]) => v !== undefined).map(([label, value]) => (
                                                        <div key={String(label)} className="flex justify-between py-1 border-b border-slate-800/50 last:border-0">
                                                            <span className="text-slate-400">{label}</span>
                                                            <span className="text-white font-mono font-bold">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </FuturisticPanel>
                                        )}

                                        {/* Reliability Card */}
                                        {rel && (
                                            <FuturisticPanel glowColor="gold" title={t('Reliability Analysis', 'تحليل الثبات')}>
                                                <div className="space-y-4">
                                                    {/* Cronbach's Alpha */}
                                                    <div>
                                                        <div className="flex justify-between items-center text-sm mb-1">
                                                            <span className="text-slate-400">{t("Cronbach's Alpha", "ألفا كرونباخ")}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-white font-mono font-bold">{(rel.cronbachAlpha ?? 0).toFixed(4)}</span>
                                                                <span className={`text-xs font-bold ${alphaLabel(rel.cronbachAlpha).color}`}>
                                                                    {alphaLabel(rel.cronbachAlpha).text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-1000"
                                                                style={{ width: `${Math.min(rel.cronbachAlpha * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Standardized Alpha */}
                                                    <div className="flex justify-between text-sm py-1 border-b border-slate-800/50">
                                                        <span className="text-slate-400">{t('Standardized Alpha', 'ألفا المعيارية')}</span>
                                                        <span className="text-white font-mono font-bold">{(rel.standardizedAlpha ?? 0).toFixed(4)}</span>
                                                    </div>

                                                    {/* Split-Half */}
                                                    <div>
                                                        <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">
                                                            {t('Split-Half Reliability', 'ثبات التجزئة النصفية')}
                                                        </h5>
                                                        {[
                                                            [t('Half Correlation', 'ارتباط النصفين'), rel.splitHalf.rawCorrelation],
                                                            [t('Spearman-Brown', 'سبيرمان-براون'), rel.splitHalf.spearmanBrown],
                                                            [t('Guttman', 'جتمان'), rel.splitHalf.guttman],
                                                        ].map(([label, value]) => (
                                                            <div key={String(label)} className="flex justify-between text-sm py-1 border-b border-slate-800/50 last:border-0">
                                                                <span className="text-slate-400">{label}</span>
                                                                <span className="text-white font-mono font-bold">{Number(value).toFixed(4)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </FuturisticPanel>
                                        )}
                                    </div>

                                    {/* ── RIGHT COLUMN: Dimensions & Items ── */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Dimension Performance Table */}
                                        {scale.dimensions.length > 0 && (
                                            <FuturisticPanel glowColor="purple" title={t('Dimension Analysis', 'تحليل الأبعاد')}>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-700">
                                                                <th className="text-start text-slate-400 font-medium py-2 px-2">{t('Dimension', 'البعد')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Items', 'العبارات')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Mean', 'المتوسط')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Std', 'الانحراف')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Skew.', 'الالتواء')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Kurt.', 'التفرطح')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Alpha (α)', 'ألفا (α)')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {scale.dimensions.map((dim, idx) => {
                                                                const hasAlpha = dim.cronbachAlpha != null && typeof dim.cronbachAlpha === 'number';
                                                                const dimAlphaInfo = hasAlpha ? alphaLabel(dim.cronbachAlpha!) : null;
                                                                return (
                                                                    <tr key={dim.dimensionId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                                        <td className="py-2 px-2 text-white font-medium">{dim.dimensionName}</td>
                                                                        <td className="py-2 px-2 text-center text-slate-300">{dim.statementCount}</td>
                                                                        <td className="py-2 px-2 text-center text-cyan-400 font-mono font-bold">{dim.mean}</td>
                                                                        <td className="py-2 px-2 text-center text-slate-300 font-mono">{dim.std}</td>
                                                                        <td className="py-2 px-2 text-center text-slate-300 font-mono">{dim.skewness ?? '—'}</td>
                                                                        <td className="py-2 px-2 text-center text-slate-300 font-mono">{dim.kurtosis ?? '—'}</td>
                                                                        <td className="py-2 px-2 text-center font-mono">
                                                                            {hasAlpha ? (
                                                                                <span className={dimAlphaInfo!.color + ' font-bold'}>
                                                                                    {dim.cronbachAlpha!.toFixed(4)}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-600">—</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </FuturisticPanel>
                                        )}

                                        {/* Item Statistics Table */}
                                        {scale.itemStatistics && scale.itemStatistics.length > 0 && (
                                            <FuturisticPanel glowColor="cyan" title={t('Item Statistics', 'إحصائيات العبارات')}>
                                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                                    <table className="w-full text-xs">
                                                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                                                            <tr className="border-b border-slate-700">
                                                                <th className="text-start text-slate-400 font-medium py-2 px-2 w-8">#</th>
                                                                <th className="text-start text-slate-400 font-medium py-2 px-2 min-w-[200px]">{t('Statement', 'العبارة')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Mean (M)', 'المتوسط الحسابي (م)')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Std Dev (SD)', 'الانحراف المعياري (ع)')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Item-Total Correlation (r)', 'ارتباط البند بالكل (ر)')}</th>
                                                                <th className="text-center text-slate-400 font-medium py-2 px-2">{t("Cronbach's Alpha if Deleted (α)", 'معامل ألفا عند حذف العبارة (α)')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {scale.itemStatistics.map((item, idx) => {
                                                                const corrColor = item.itemTotalCorrelation >= 0.4
                                                                    ? 'text-emerald-400' : item.itemTotalCorrelation >= 0.2
                                                                    ? 'text-cyan-400' : 'text-red-400';
                                                                const deletedAlphaWarning = rel && item.alphaIfDeleted > rel.cronbachAlpha;
                                                                return (
                                                                    <tr key={item.statementId} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                                                                        <td className="py-1.5 px-2 text-slate-600">{idx + 1}</td>
                                                                        <td className="py-1.5 px-2 text-slate-300">
                                                                            <span>{item.statementText}</span>
                                                                            {item.isReversed && (
                                                                                <span className="text-amber-400 font-bold ms-1" title={t('Reverse-scored item', 'عبارة عكسية التوجيه')}>
                                                                                    *
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-1.5 px-2 text-center text-white font-mono">{item.mean}</td>
                                                                        <td className="py-1.5 px-2 text-center text-slate-300 font-mono">{item.std}</td>
                                                                        <td className={`py-1.5 px-2 text-center font-mono font-bold ${corrColor}`}>
                                                                            {(item.itemTotalCorrelation ?? 0).toFixed(4)}
                                                                        </td>
                                                                        <td className={`py-1.5 px-2 text-center font-mono ${deletedAlphaWarning ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                                                                            {(item.alphaIfDeleted ?? 0).toFixed(4)}
                                                                            {deletedAlphaWarning && (
                                                                                <span className="text-[9px] ms-1">⚠</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-[10px] text-slate-500">
                                                    <span>{t('* Indicates reverse-scored items', '* تشير إلى عبارات عكسية التوجيه (يتم عكس درجتها في الحساب).')}</span>
                                                    <span>{t('⚠ = Alpha increases if deleted', '⚠ = ألفا يرتفع عند حذف العبارة')}</span>
                                                    <span className="text-emerald-400">r ≥ 0.4 {t('Strong', 'قوي')}</span>
                                                    <span className="text-cyan-400">r ≥ 0.2 {t('Moderate', 'متوسط')}</span>
                                                    <span className="text-red-400">r &lt; 0.2 {t('Weak', 'ضعيف')}</span>
                                                </div>
                                            </FuturisticPanel>
                                        )}
                                        {/* Pearson Correlation Matrix */}
                                        {scale.correlationMatrix && scale.correlationMatrix.length > 0 && scale.correlationMatrix.length <= 20 && (
                                            <FuturisticPanel glowColor="purple" title={t('Pearson Correlation Matrix', 'مصفوفة ارتباط بيرسون')}>
                                                <div className="overflow-x-auto">
                                                    <table className="text-[10px] font-mono">
                                                        <thead>
                                                            <tr>
                                                                <th className="px-1 py-1 text-slate-500"></th>
                                                                {scale.correlationMatrix.map((_: any, i: number) => (
                                                                    <th key={i} className="px-1 py-1 text-slate-400 font-bold">S{i + 1}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {scale.correlationMatrix.map((row: CorrelationEntry[], i: number) => (
                                                                <tr key={i}>
                                                                    <td className="px-1 py-0.5 text-slate-400 font-bold">S{i + 1}</td>
                                                                    {row.map((cell: CorrelationEntry, j: number) => {
                                                                        const absR = Math.abs(cell.r);
                                                                        const bgOpacity = i === j ? 0 : Math.round(absR * 40);
                                                                        const color = cell.r >= 0 ? `rgba(52,211,153,${bgOpacity / 100})` : `rgba(248,113,113,${bgOpacity / 100})`;
                                                                        const stars = cell.p < 0.001 ? '***' : cell.p < 0.01 ? '**' : cell.p < 0.05 ? '*' : '';
                                                                        return (
                                                                            <td key={j} className="px-1 py-0.5 text-center" style={{ backgroundColor: color }}>
                                                                                <span className={i === j ? 'text-slate-600' : 'text-white'}>
                                                                                    {i === j ? '1' : cell.r.toFixed(2)}
                                                                                </span>
                                                                                {stars && <span className="text-amber-400 text-[8px]">{stars}</span>}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-500 flex gap-3">
                                                    <span>* p&lt;0.05</span>
                                                    <span>** p&lt;0.01</span>
                                                    <span>*** p&lt;0.001</span>
                                                    <span className="text-emerald-400/50">█ {t('Positive', 'موجب')}</span>
                                                    <span className="text-red-400/50">█ {t('Negative', 'سالب')}</span>
                                                </div>
                                            </FuturisticPanel>
                                        )}
                                    </div>
                                </div>

                                {/* ── FULL WIDTH BOTTOM SECTION: FACTOR ANALYSIS (EFA / CFA) ── */}
                                {(() => {
                                    const fa = report.data?.factorAnalysis?.find((f: any) => f.scaleId === scale.scaleId);
                                    if (!fa) return null;
                                    const eigenvalues = fa.efa.eigenvalues || [];
                                    const varianceExplained = fa.efa.varianceExplained || [];
                                    const cumulativeVariance = fa.efa.cumulativeVariance || [];
                                    return (
                                        <div className="space-y-6 border-t border-slate-800/60 pt-6 mt-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                                                    {t('Validity & Factor Analysis', 'تحليل الصدق والتحليل العاملي')}
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                {/* EFA Section */}
                                                <FuturisticPanel glowColor="cyan" title={`${t('Exploratory Factor Analysis (EFA)', 'التحليل العاملي الاستكشافي (EFA)')}`}>
                                                    <div className="p-4 space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-xs text-slate-400">
                                                                {t('Extraction Method:', 'طريقة الاستخلاص:')} <span className="text-white font-medium">{fa.efa.factorMethod === 'eigenvalue' ? t('Eigenvalues ≥ 1', 'القيم الذاتية ≥ 1') : `${fa.efa.componentsCount} ${t('Fixed Factors', 'عوامل محددة')}`}</span>
                                                            </div>
                                                            {fa.efa.rotated && (
                                                                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-medium border border-purple-500/20">
                                                                    {t('Rotation:', 'التدوير:')} {fa.efa.rotationMethod}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Scree Plot (Eigenvalue Chart) */}
                                                        {eigenvalues.length > 0 && (
                                                            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                                                                <h5 className="text-xs text-slate-400 font-medium mb-3">
                                                                    {t('Scree Plot: Eigenvalues by Component', 'منحنى الحصى: القيم الذاتية حسب المكون')}
                                                                </h5>
                                                                <div className="flex items-end gap-1.5 h-28 mb-2">
                                                                    {eigenvalues.map((ev: number, evIdx: number) => {
                                                                        const maxEv = Math.max(...eigenvalues);
                                                                        const height = maxEv > 0 ? (ev / maxEv) * 100 : 0;
                                                                        const isRetained = evIdx < fa.efa.componentsCount;
                                                                        return (
                                                                            <div key={evIdx} className="flex flex-col items-center flex-1 min-w-0" title={`Component ${evIdx + 1}: ${ev.toFixed(4)}`}>
                                                                                <span className="text-[8px] text-slate-500 mb-0.5">{ev.toFixed(2)}</span>
                                                                                <div 
                                                                                    className={`w-full rounded-t transition-all ${isRetained ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' : 'bg-slate-600'}`}
                                                                                    style={{ height: `${Math.max(height, 4)}%` }}
                                                                                />
                                                                                <span className="text-[8px] text-slate-500 mt-0.5">{evIdx + 1}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {/* Eigenvalue Reference Line */}
                                                                <div className="relative h-px bg-red-500/40 mb-1" style={{ bottom: `${(1 / Math.max(...eigenvalues)) * 112}px` }}>
                                                                    <span className="absolute end-0 -top-3 text-[8px] text-red-400">λ = 1.0</span>
                                                                </div>
                                                                
                                                                {/* Variance Explained Table */}
                                                                {varianceExplained.length > 0 && (
                                                                    <div className="mt-3 overflow-x-auto">
                                                                        <table className="w-full text-[10px]">
                                                                            <thead>
                                                                                <tr className="border-b border-slate-700">
                                                                                    <th className="text-start py-1 px-1 text-slate-400">{t('Component', 'المكون')}</th>
                                                                                    <th className="text-center py-1 px-1 text-slate-400">{t('Eigenvalue', 'القيمة الذاتية')}</th>
                                                                                    <th className="text-center py-1 px-1 text-slate-400">{t('Variance %', 'التباين %')}</th>
                                                                                    <th className="text-center py-1 px-1 text-slate-400">{t('Cumulative %', 'التراكمي %')}</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {eigenvalues.slice(0, Math.max(fa.efa.componentsCount + 2, 5)).map((ev: number, evIdx: number) => (
                                                                                    <tr key={evIdx} className={`border-b border-slate-800/30 ${evIdx < fa.efa.componentsCount ? 'bg-cyan-500/5' : ''}`}>
                                                                                        <td className="py-1 px-1 text-slate-300">{evIdx + 1}</td>
                                                                                        <td className="py-1 px-1 text-center font-mono text-white">{ev.toFixed(4)}</td>
                                                                                        <td className="py-1 px-1 text-center font-mono text-cyan-400">{(varianceExplained[evIdx] ?? 0).toFixed(2)}%</td>
                                                                                        <td className="py-1 px-1 text-center font-mono text-emerald-400">{(cumulativeVariance[evIdx] ?? 0).toFixed(2)}%</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Component Matrix */}
                                                        <div>
                                                            <h5 className="text-xs text-slate-400 font-medium mb-2">
                                                                {fa.efa.rotated 
                                                                    ? t('Rotated Component Matrix', 'مصفوفة المكونات بعد التدوير')
                                                                    : t('Component Matrix', 'مصفوفة المكونات')}
                                                            </h5>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-[10px]">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-700">
                                                                            <th className="text-start py-2 px-1 text-slate-400">#</th>
                                                                            <th className="text-start py-2 px-1 text-slate-400">{t('Item', 'العبارة')}</th>
                                                                            <th className="text-start py-2 px-1 text-slate-400">{t('Theoretical Dimension', 'البعد النظري')}</th>
                                                                            {Array.from({ length: fa.efa.componentsCount || fa.efa.loadings[0]?.length || 3 }, (_, i) => (
                                                                                <th key={i} className="text-center py-2 px-1 text-slate-400">F{i + 1}</th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {fa.efa.loadings.map((loadings: number[], lIdx: number) => (
                                                                            <tr key={lIdx} className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
                                                                                <td className="py-1 px-1 text-slate-500">{lIdx + 1}</td>
                                                                                <td className="py-1 px-1 text-slate-300 min-w-[200px]">{fa.efa.itemLabels[lIdx]}</td>
                                                                                <td className="py-1 px-1 text-slate-400 italic font-medium">{(fa.efa.itemDimensions && fa.efa.itemDimensions[lIdx]) || '—'}</td>
                                                                                {loadings.map((l, fIdx) => (
                                                                                    <td key={fIdx} className={`py-1 px-1 text-center font-mono ${Math.abs(l) >= 0.4 ? 'text-emerald-400 font-bold' : Math.abs(l) >= 0.3 ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                                                        {l.toFixed(3)}
                                                                                    </td>
                                                                                ))}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* Theoretical-Empirical Mapping */}
                                                        {fa.efa.factorMapping && fa.efa.factorMapping.length > 0 && (
                                                            <div className="pt-4 border-t border-slate-800/40">
                                                                <h5 className="text-xs text-slate-400 font-medium mb-2">
                                                                    {t('Theoretical-Empirical Factor Alignment Summary', 'مواءمة الأبعاد النظرية مع العوامل المستخلصة رياضياً')}
                                                                </h5>
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-[10px]">
                                                                        <thead>
                                                                            <tr className="border-b border-slate-700">
                                                                                <th className="text-start py-2 px-1 text-slate-400">{t('Theoretical Dimension', 'البعد النظري')}</th>
                                                                                <th className="text-center py-2 px-1 text-slate-400">{t('Best Empirical Factor Match', 'العامل الإمبيريقي المطابق')}</th>
                                                                                <th className="text-center py-2 px-1 text-slate-400">{t('Average Absolute Loading', 'متوسط تشبع العبارات')}</th>
                                                                                <th className="text-center py-2 px-1 text-slate-400">{t('Congruence Strength', 'قوة التطابق')}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {fa.efa.factorMapping.map((m: any, mIdx: number) => (
                                                                                <tr key={mIdx} className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
                                                                                    <td className="py-1.5 px-1 text-slate-300 font-medium">{m.dimensionName}</td>
                                                                                    <td className="py-1.5 px-1 text-center text-white font-mono">{t(`Factor ${m.factorIndex} (${m.factorName})`, `العامل ${m.factorIndex} (${m.factorName})`)}</td>
                                                                                    <td className="py-1.5 px-1 text-center text-slate-300 font-mono font-bold">{m.averageLoading.toFixed(3)}</td>
                                                                                    <td className="py-1.5 px-1 text-center">
                                                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                                                            m.strength === 'Strong' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                                            m.strength === 'Moderate' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                                                                            'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                                        }`}>
                                                                                            {t(m.strength, m.strengthAr)}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FuturisticPanel>

                                                {/* CFA Section */}
                                                <FuturisticPanel glowColor="purple" title={`${t('Confirmatory Factor Analysis (CFA)', 'التحليل العاملي التوكيدي (CFA)')}`}>
                                                    <div className="p-4 space-y-6">
                                                        <div className="flex justify-between items-center">
                                                            <div className="text-xs text-slate-400">
                                                                {t('Overall Model Congruence:', 'متوسط التطابق العام:')} <span className="text-white font-bold">{fa.cfa.congruenceScore}</span>
                                                            </div>
                                                        </div>

                                                        {/* CFA Path Diagram */}
                                                        {fa.cfa.dimensions && fa.cfa.dimensions.length > 0 ? (
                                                            <div className="space-y-4">
                                                                <h5 className="text-xs text-slate-400 font-medium">
                                                                    {t('Path Diagram: Dimensions & Item Loadings', 'مخطط المسار: الأبعاد وتشبعات العبارات')}
                                                                </h5>
                                                                <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-1">
                                                                    {fa.cfa.dimensions.map((dim: any, dIdx: number) => (
                                                                        <div key={dIdx} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-sm text-white font-semibold">{dim.dimensionName}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[10px] text-slate-400">{dim.items.length} {t('items', 'عبارات')}</span>
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dim.avgLoading >= 0.6 ? 'bg-emerald-500/10 text-emerald-400' : dim.avgLoading >= 0.4 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                                        {t('Avg:', 'متوسط:')} {dim.avgLoading}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                {dim.items.map((item: any, iIdx: number) => (
                                                                                    <div key={iIdx} className="flex items-center gap-2">
                                                                                        <span className="text-[10px] text-slate-400 w-6 shrink-0 text-center">{iIdx + 1}</span>
                                                                                        <span className="text-[10px] text-slate-300 flex-1 truncate">{item.text}</span>
                                                                                        <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden shrink-0">
                                                                                            <div 
                                                                                                className={`h-full rounded-full transition-all ${item.loading >= 0.6 ? 'bg-emerald-500' : item.loading >= 0.4 ? 'bg-cyan-500' : 'bg-amber-500'}`}
                                                                                                style={{ width: `${Math.min(Math.abs(item.loading) * 100, 100)}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className={`text-[10px] font-mono w-10 text-end ${item.loading >= 0.5 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                                                                            {item.loading.toFixed(3)}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-[10px]">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-700">
                                                                            <th className="text-start py-2 px-1 text-slate-400">{t('Target Dimension', 'البعد المستهدف')}</th>
                                                                            <th className="text-center py-2 px-1 text-slate-400">{t('Loading', 'التشبع')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {fa.cfa.loadings.map((l: any, lIdx: number) => (
                                                                            <tr key={lIdx} className="border-b border-slate-800/30">
                                                                                <td className="py-1 px-1 text-slate-300">
                                                                                    {l.dimensionName}
                                                                                    <div className="text-[8px] text-slate-500">{l.statementText.substring(0, 40)}...</div>
                                                                                </td>
                                                                                <td className={`py-1 px-1 text-center font-mono ${l.loading >= 0.5 ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                                                                                    {l.loading.toFixed(3)}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FuturisticPanel>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}

                    {/* Group Differences Analysis */}
                    {report.data?.groupDifferences && report.data.groupDifferences.length > 0 && (
                        <div className="space-y-8 mb-12">
                            <div className="border-b border-slate-800 pb-3">
                                <h2 className="text-xl font-bold text-white">{t('Group Differences Analysis', 'اختبار الفروق الجوهرية')}</h2>
                                <p className="text-sm text-slate-500">
                                    {t('Statistical comparison of scale scores across demographic groups (T-test & ANOVA).', 'مقارنة إحصائية لدرجات المقاييس عبر المجموعات الديموغرافيّة (اختبار T واختبار ANOVA).')}
                                </p>
                            </div>

                            {report.data.groupDifferences.map((diff: any, idx: number) => {
                                const groupNames = Object.keys(diff.results[0].groupMeans);
                                return (
                                    <FuturisticPanel 
                                        key={idx} 
                                        glowColor="gold" 
                                        title={`${t('By', 'حسب')} ${diff.fieldLabel} (${diff.testType === 'ttest' ? t('T-test', 'اختبار T') : t('ANOVA', 'اختبار ANOVA')})`}
                                    >
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-700">
                                                        <th className="text-start text-slate-400 font-medium py-2 px-2">{t('Scale', 'المقياس')}</th>
                                                        {groupNames.map(name => (
                                                            <th key={name} className="text-center text-slate-400 font-medium py-2 px-2">{name} ({t('M', 'م')})</th>
                                                        ))}
                                                        <th className="text-center text-slate-400 font-medium py-2 px-2">
                                                            {diff.testType === 'ttest' ? t('t-value', 'قيمة t') : t('F-value', 'قيمة F')}
                                                        </th>
                                                        <th className="text-center text-slate-400 font-medium py-2 px-2">{t('p-value', 'مستوى الدلالة')}</th>
                                                        <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Result', 'النتيجة')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {diff.results.map((res: any, rIdx: number) => {
                                                        const sig = res.pValue < 0.001 ? '***' : res.pValue < 0.01 ? '**' : res.pValue < 0.05 ? '*' : '';
                                                        return (
                                                            <tr key={rIdx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                                <td className="py-2 px-2 text-white font-medium">{res.scaleName}</td>
                                                                {groupNames.map(name => (
                                                                    <td key={name} className="py-2 px-2 text-center text-slate-300 font-mono">
                                                                        {res.groupMeans[name] ?? '—'}
                                                                        <div className="text-[10px] text-slate-500">n={res.groupCounts[name]}</div>
                                                                    </td>
                                                                ))}
                                                                <td className="py-2 px-2 text-center font-mono text-cyan-400">{res.statistic}</td>
                                                                <td className="py-2 px-2 text-center font-mono">
                                                                    <span className={res.significant ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                                                                        {res.pValue.toFixed(4)}{sig}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 px-2 text-center">
                                                                    {res.significant ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                                                            {t('Sig.', 'دالة')} 
                                                                            {res.direction && ` (${res.direction})`}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-500 text-xs">{t('Not Sig.', 'غير دالة')}</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </FuturisticPanel>
                                );
                            })}
                        </div>
                    )}

                    {/* Inter-Scale Correlations */}
                    {report.data?.interScaleCorrelations && report.data.interScaleCorrelations.length > 0 && (
                        <FuturisticPanel glowColor="purple" title={t('Pearson Correlation Analysis', 'تحليل ارتباط بيرسون بين المقاييس')}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-start text-slate-400 font-medium py-2 px-2">{t('Scale A', 'المقياس الأول')}</th>
                                            <th className="text-start text-slate-400 font-medium py-2 px-2">{t('Scale B', 'المقياس الثاني')}</th>
                                            <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Correlation (r)', 'معامل الارتباط (r)')}</th>
                                            <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Sig. (p)', 'مستوى الدلالة (p)')}</th>
                                            <th className="text-center text-slate-400 font-medium py-2 px-2">{t('Interpretation', 'تفسير العلاقة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(report.data.interScaleCorrelations as InterScaleCorrelation[]).map((c, idx) => {
                                            const absR = Math.abs(c.r);
                                            const color = absR >= 0.6 ? 'text-emerald-400' : absR >= 0.4 ? 'text-cyan-400' : absR >= 0.2 ? 'text-amber-400' : 'text-red-400';
                                            const sig = c.p < 0.001 ? '***' : c.p < 0.01 ? '**' : c.p < 0.05 ? '*' : '';
                                            return (
                                                <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-2 px-2 text-white">{c.scaleAName}</td>
                                                    <td className="py-2 px-2 text-white">{c.scaleBName}</td>
                                                    <td className="py-2 px-2 text-center font-mono font-bold text-cyan-400">
                                                        {c.r.toFixed(4)}{sig && <span className="text-amber-400 text-xs ms-0.5">{sig}</span>}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-mono text-slate-400">{c.p.toFixed(6)}</td>
                                                    <td className={`py-2 px-2 text-center font-bold ${color}`}>
                                                        {c.interpretation}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800 text-[9px] text-slate-500 flex gap-3">
                                <span>* p&lt;0.05</span>
                                <span>** p&lt;0.01</span>
                                <span>*** p&lt;0.001</span>
                            </div>
                        </FuturisticPanel>
                    )}




                    {/* Mediation Analysis */}
                    {report.data?.mediationAnalysis && report.data.mediationAnalysis.length > 0 && (
                        <FuturisticPanel glowColor="pink" title={t('Mediation Analysis (Sobel)', 'تحليل الوساطة (سوبل)')}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-start py-2 px-2 text-slate-400">{t('Path (X -> M -> Y)', 'المسار')}</th>
                                            <th className="text-center py-2 px-2 text-slate-400">Sobel Z</th>
                                            <th className="text-center py-2 px-2 text-slate-400">p-value</th>
                                            <th className="text-center py-2 px-2 text-slate-400">{t('Result', 'النتيجة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.data.mediationAnalysis.map((m: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-800/50">
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-slate-300 font-bold">{m.independentScaleName}</span>
                                                        <span className="text-slate-600">→</span>
                                                        <span className="text-cyan-400 font-bold">{m.mediatorScaleName}</span>
                                                        <span className="text-slate-600">→</span>
                                                        <span className="text-emerald-400 font-bold">{m.dependentScaleName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-center font-mono text-white">{m.z}</td>
                                                <td className="py-3 px-2 text-center font-mono text-slate-400">{m.p.toFixed(4)}</td>
                                                <td className="py-3 px-2 text-center">
                                                    {m.significant ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                                            {t('Significant Mediation', 'وساطة دالة')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-[10px]">{t('Not Significant', 'غير دالة')}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Detailed Sobel Calculation Walkthrough */}
                            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-6">
                                <h4 className="text-white text-xs font-bold tracking-wider uppercase mb-3">
                                    {t('Step-by-Step Calculation & Formula Explanation', 'خطوات التعويض وتفسير معادلة سوبل')}
                                </h4>
                                {report.data.mediationAnalysis.map((m: any, idx: number) => {
                                    const aVal = m.a ?? 0;
                                    const saVal = m.sa ?? 0;
                                    const bVal = m.b ?? 0;
                                    const sbVal = m.sb ?? 0;
                                    const zVal = m.z ?? 0;
                                    const pVal = m.p ?? 0;

                                    return (
                                        <div key={idx} className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 space-y-3">
                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                                                <span className="font-bold text-slate-400">{t('Tested Path:', 'المسار المختبر:')}</span>
                                                <span className="text-slate-300 font-semibold">{m.independentScaleName}</span>
                                                <span className="text-slate-500">→</span>
                                                <span className="text-cyan-400 font-semibold">{m.mediatorScaleName}</span>
                                                <span className="text-slate-500">→</span>
                                                <span className="text-emerald-400 font-semibold">{m.dependentScaleName}</span>
                                            </div>

                                            {/* Formula Display */}
                                            <div className="p-3 rounded bg-slate-950/60 font-mono text-xs text-center border border-slate-800/40 space-y-1">
                                                <div className="text-slate-400">Z = (a × b) / √[ (b² × sa²) + (a² × sb²) ]</div>
                                                <div className="text-[10px] text-slate-500">
                                                    {t('a = IV → Med | sa = SE(a) | b = Med → DV | sb = SE(b)', 'a = مستقل ← وسيط | sa = الخطأ المعياري لـ a | b = وسيط ← تابع | sb = الخطأ المعياري لـ b')}
                                                </div>
                                            </div>

                                            {/* Calculations Steps */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                <div className="space-y-1.5">
                                                    <div className="text-slate-400 font-medium">{t('Regression Coefficients:', 'المعاملات المحسوبة:')}</div>
                                                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                                                        <li><span className="font-bold font-mono">a</span> = {aVal} <span className="text-slate-500">({t('Slope of X → M', 'ميل مستقل ← وسيط')})</span></li>
                                                        <li><span className="font-bold font-mono">sa</span> = {saVal} <span className="text-slate-500">({t('SE of path a', 'الخطأ المعياري لـ a')})</span></li>
                                                        <li><span className="font-bold font-mono">b</span> = {bVal} <span className="text-slate-500">({t('Slope of M → Y controlling X', 'ميل وسيط ← تابع')})</span></li>
                                                        <li><span className="font-bold font-mono">sb</span> = {sbVal} <span className="text-slate-500">({t('SE of path b', 'الخطأ المعياري لـ b')})</span></li>
                                                    </ul>
                                                </div>

                                                <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                                                    <div className="text-slate-400 font-medium font-sans">{t('Step-by-Step Substitution:', 'خطوات التعويض الحسابي:')}</div>
                                                    <div className="space-y-1 pl-2 border-l border-slate-800/80">
                                                        <div>1. Numerator (a × b) = {aVal} × {bVal} = <span className="text-cyan-400">{(aVal * bVal).toFixed(4)}</span></div>
                                                        <div>2. Denominator √[({bVal}² × {saVal}²) + ({aVal}² × {sbVal}²)] = √[{((bVal * bVal) * (saVal * saVal)).toFixed(6)} + {((aVal * aVal) * (sbVal * sbVal)).toFixed(6)}] = <span className="text-emerald-400">{(Math.sqrt(bVal * bVal * saVal * saVal + aVal * aVal * sbVal * sbVal)).toFixed(4)}</span></div>
                                                        <div>3. Z = {(aVal * bVal).toFixed(4)} / {(Math.sqrt(bVal * bVal * saVal * saVal + aVal * aVal * sbVal * sbVal)).toFixed(4)} = <span className="text-white font-bold">{zVal}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/40">
                                                {t(
                                                    `Interpretation: The Sobel Z score of ${zVal} yields a p-value of ${pVal.toFixed(4)}. Therefore, the mediation effect is ${m.significant ? 'statistically significant (mediation confirmed).' : 'not statistically significant.'}`,
                                                    `التفسير: قيمة سوبل Z البالغة ${zVal} تقابل قيمة احتمالية (p-value) تساوي ${pVal.toFixed(4)}. وبناءً على ذلك، يكون تأثير الوساطة ${m.significant ? 'دالاً إحصائياً (يوجد تأثير وساطة مؤكد).' : 'غير دال إحصائياً.'}`
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </FuturisticPanel>
                    )}

                    {/* Demographics Section (unchanged) */}
                    {report.data?.demographics && (
                        <FuturisticPanel glowColor="green" title={t('Demographic Distribution', 'التوزيع الديموغرافي')}>
                            <div className="p-4 space-y-6">
                                {report.data.demographics.fields.map((field: any) => (
                                    <div key={field.fieldId}>
                                        <h4 className="text-white font-bold text-sm mb-3">{field.fieldLabel}</h4>

                                        {/* Numeric stats card for number fields */}
                                        {field.numericStats && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
                                                {[
                                                    [t('Min', 'الأدنى'), field.numericStats.min],
                                                    [t('Max', 'الأقصى'), field.numericStats.max],
                                                    [t('Mean', 'المتوسط'), field.numericStats.mean],
                                                    [t('Std', 'الانحراف'), field.numericStats.std],
                                                    [t('Median', 'الوسيط'), field.numericStats.median],
                                                    [t('Skew.', 'الالتواء'), field.numericStats.skewness],
                                                    [t('Kurt.', 'التفرطح'), field.numericStats.kurtosis],
                                                ].filter(([_, v]) => v !== undefined && v !== null).map(([label, value]) => (
                                                    <div key={String(label)} className="bg-slate-800 border border-slate-700/50 rounded-lg p-3 text-center shadow-sm">
                                                        <p className="text-[11px] text-slate-300 uppercase tracking-wider mb-1 font-medium">{label}</p>
                                                        <p className="text-base font-bold text-emerald-400 font-mono">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}



                                        {/* Distribution bars (Binned for numeric questions, standard for categorical) */}
                                        <div className="space-y-2">
                                            {field.binnedDistribution && field.binnedDistribution.length > 0 ? (
                                                field.binnedDistribution.map((bin: any) => (
                                                    <div key={bin.rangeLabel} className="group">
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="text-slate-200 font-medium">{bin.rangeLabel}</span>
                                                            <span className="text-cyan-400 font-mono font-bold">{bin.count} ({bin.percentage}%)</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-all duration-500"
                                                                style={{ width: `${bin.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                Object.entries(field.distribution || {}).map(([label, count]: [string, any]) => {
                                                    const percentage = (count / (report.data?.sampleSize || 1)) * 100;
                                                    return (
                                                        <div key={label} className="group">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-slate-200 font-medium">{label}</span>
                                                                <span className="text-cyan-400 font-mono font-bold">{count} ({Math.round(percentage)}%)</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500/40 group-hover:bg-emerald-500/60 transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FuturisticPanel>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />

            {survey && report && (
                <ReportGenerationModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    survey={survey}
                    reportType={report.type as 'demographic' | 'scale' | 'comprehensive'}
                    existingReportId={undefined}
                    onSuccess={(newId) => {
                        setShowModal(false);
                        if (newId !== report.id) {
                            router.push(`/reports/${newId}`);
                        } else {
                            setIsLoading(true);
                            loadData();
                        }
                    }}
                />
            )}
        </div>
    );
}
