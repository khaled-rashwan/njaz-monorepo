'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { getUrl, remove } from 'aws-amplify/storage';
import type { Schema } from '@njaz/shared-backend';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { getSurveys, getScales, getResponses, getReports } from '@/lib/storage';
import { Scale, Survey, SurveyResponse, Report } from '@/lib/types';

const client = generateClient<Schema>();

export default function AdminPage() {
    const { t, language, direction } = useLanguage();
    const router = useRouter();
    
    // Auth & Loading
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'surveys' | 'scales' | 'responses' | 'reports'>('surveys');
    
    // Data States
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [scales, setScales] = useState<Scale[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    
    // Stat Counters
    const [stats, setStats] = useState({
        surveys: 0,
        scales: 0,
        responses: 0,
        reports: 0
    });

    // Operations states
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (selectedSurveyId) {
            loadResponsesForSurvey(selectedSurveyId);
        } else {
            setResponses([]);
        }
    }, [selectedSurveyId]);

    async function checkAuth() {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            await loadAllData();
        } catch (err) {
            console.error("Unauthenticated access to Admin:", err);
            router.push('/');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadAllData() {
        try {
            const fetchedSurveys = await getSurveys();
            const fetchedScales = await getScales();
            const fetchedReports = await getReports('');
            
            setSurveys(fetchedSurveys);
            setScales(fetchedScales);
            setReports(fetchedReports);

            if (fetchedSurveys.length > 0) {
                setSelectedSurveyId(fetchedSurveys[0].id);
            }

            // Calculate total response count
            let totalResponses = 0;
            const surveyResponsesMap = await Promise.all(
                fetchedSurveys.map(async (s) => {
                    const resList = await getResponses(s.id);
                    return resList.length;
                })
            );
            totalResponses = surveyResponsesMap.reduce((acc, count) => acc + count, 0);

            setStats({
                surveys: fetchedSurveys.length,
                scales: fetchedScales.length,
                responses: totalResponses,
                reports: fetchedReports.length
            });
        } catch (err) {
            console.error("Error loading admin data:", err);
            showStatus(t('Failed to load system data', 'فشل تحميل بيانات النظام'), 'error');
        }
    }

    async function loadResponsesForSurvey(surveyId: string) {
        try {
            const resList = await getResponses(surveyId);
            setResponses(resList);
        } catch (err) {
            console.error("Error loading responses:", err);
        }
    }

    function showStatus(text: string, type: 'success' | 'error') {
        setStatusMessage({ text, type });
        setTimeout(() => {
            setStatusMessage(null);
        }, 5000);
    }

    // CRUDL Actions

    async function handleDeleteSurvey(surveyId: string) {
        if (!confirm(t(
            'Are you sure you want to delete this survey? This will perform a CASCADING delete: ALL responses, reports, and generated Word files in S3 will be permanently deleted!',
            'هل أنت متأكد من حذف هذا الاستبيان؟ سيؤدي ذلك لحذف تعاقبي كامل: سيتم حذف جميع الاستجابات والتقارير وملفات Word في S3 نهائياً!'
        ))) {
            return;
        }

        setIsActionLoading(`survey-${surveyId}`);
        try {
            // 1. Fetch and delete all associated responses
            const associatedResponses = await getResponses(surveyId);
            let deletedResponsesCount = 0;
            if (associatedResponses.length > 0) {
                await Promise.all(
                    associatedResponses.map(async (r) => {
                        await client.models.EstebianResponse.delete({ id: r.id });
                        deletedResponsesCount++;
                    })
                );
            }

            // 2. Fetch and delete all associated reports (including their S3 files)
            const associatedReports = await getReports(surveyId);
            let deletedReportsCount = 0;
            if (associatedReports.length > 0) {
                await Promise.all(
                    associatedReports.map(async (rp) => {
                        if (rp.pdfS3Key) {
                            try {
                                await remove({ path: rp.pdfS3Key });
                            } catch (s3Err) {
                                console.warn(`Cascade S3 deletion failed for report ${rp.id}:`, s3Err);
                            }
                        }
                        await client.models.EstebianReport.delete({ id: rp.id });
                        deletedReportsCount++;
                    })
                );
            }

            // 3. Delete the survey itself
            await client.models.EstebianSurvey.delete({ id: surveyId });
            
            showStatus(
                t(
                    `Survey deleted successfully along with ${deletedResponsesCount} responses and ${deletedReportsCount} reports (S3 files cleaned).`,
                    `تم حذف الاستبيان بنجاح مع ${deletedResponsesCount} استجابة و ${deletedReportsCount} تقرير (تم تنظيف ملفات S3).`
                ),
                'success'
            );
            await loadAllData();
        } catch (err: any) {
            console.error("Cascading delete survey error:", err);
            showStatus(err.message || t('Failed to delete survey', 'فشل حذف الاستبيان'), 'error');
        } finally {
            setIsActionLoading(null);
        }
    }

    async function handleDeleteScale(scaleId: string) {
        if (!confirm(t('Are you sure you want to delete this scale?', 'هل أنت متأكد من حذف هذا المقياس؟'))) {
            return;
        }

        setIsActionLoading(`scale-${scaleId}`);
        try {
            await client.models.EstebianScale.delete({ id: scaleId });
            showStatus(t('Scale deleted successfully', 'تم حذف المقياس بنجاح'), 'success');
            await loadAllData();
        } catch (err: any) {
            console.error("Delete scale error:", err);
            showStatus(err.message || t('Failed to delete scale', 'فشل حذف المقياس'), 'error');
        } finally {
            setIsActionLoading(null);
        }
    }

    async function handleDeleteResponse(responseId: string) {
        if (!confirm(t('Are you sure you want to delete this response?', 'هل أنت متأكد من حذف هذه الاستجابة؟'))) {
            return;
        }

        setIsActionLoading(`response-${responseId}`);
        try {
            await client.models.EstebianResponse.delete({ id: responseId });
            showStatus(t('Response deleted successfully', 'تم حذف الاستجابة بنجاح'), 'success');
            if (selectedSurveyId) {
                await loadResponsesForSurvey(selectedSurveyId);
            }
            await loadAllData();
        } catch (err: any) {
            console.error("Delete response error:", err);
            showStatus(err.message || t('Failed to delete response', 'فشل حذف الاستجابة'), 'error');
        } finally {
            setIsActionLoading(null);
        }
    }

    async function handlePurgeResponses(surveyId: string) {
        if (!confirm(t('CRITICAL ACTION: Are you sure you want to delete ALL responses for this survey? This action is irreversible.', 'إجراء حرج: هل أنت متأكد من حذف جميع استجابات هذا الاستبيان؟ لا يمكن التراجع عن هذا الإجراء.'))) {
            return;
        }

        setIsActionLoading(`purge-responses-${surveyId}`);
        try {
            const list = await getResponses(surveyId);
            let count = 0;
            await Promise.all(
                list.map(async (r) => {
                    await client.models.EstebianResponse.delete({ id: r.id });
                    count++;
                })
            );
            showStatus(t(`Successfully purged ${count} responses`, `تم تفريغ ${count} استجابة بنجاح`), 'success');
            await loadResponsesForSurvey(surveyId);
            await loadAllData();
        } catch (err: any) {
            console.error("Purge responses error:", err);
            showStatus(err.message || t('Failed to purge responses', 'فشل تفريغ الاستجابات'), 'error');
        } finally {
            setIsActionLoading(null);
        }
    }

    async function handleDeleteReport(reportId: string, s3Key?: string) {
        if (!confirm(t('Are you sure you want to delete this report and its associated S3 file?', 'هل أنت متأكد من حذف هذا التقرير وملفه المرتبط في S3؟'))) {
            return;
        }

        setIsActionLoading(`report-${reportId}`);
        try {
            // Delete file from S3 if key exists
            if (s3Key) {
                try {
                    await remove({ path: s3Key });
                    console.log(`Deleted S3 object at path: ${s3Key}`);
                } catch (s3Err) {
                    console.warn("Failed to delete S3 file, proceeding to delete DB record:", s3Err);
                }
            }

            // Delete report record from DynamoDB
            await client.models.EstebianReport.delete({ id: reportId });
            showStatus(t('Report record and S3 file deleted successfully', 'تم حذف التقرير وملفه بنجاح'), 'success');
            await loadAllData();
        } catch (err: any) {
            console.error("Delete report error:", err);
            showStatus(err.message || t('Failed to delete report', 'فشل حذف التقرير'), 'error');
        } finally {
            setIsActionLoading(null);
        }
    }

    async function handleDownloadReportFile(s3Key: string) {
        try {
            const result = await getUrl({
                path: s3Key,
                options: {
                    validateObjectExistence: false,
                    expiresIn: 3600
                }
            });
            window.open(result.url.toString(), '_blank');
        } catch (err) {
            console.error("Error signing S3 download URL:", err);
            showStatus(t('Failed to sign download link', 'فشل إنشاء رابط التحميل'), 'error');
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading Admin Console...', 'جاري تحميل لوحة التحكم...')}</p>
                </div>
            </div>
        );
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {t('Admin Control Center', 'مركز تحكم الإدارة')}
                            </h1>
                            <p className="text-slate-400">
                                {t('Manage DB records, purge test data, and cleanup report files.', 'أدر سجلات قواعد البيانات، وأفرغ بيانات الفحص، ونظف ملفات التقارير.')}
                            </p>
                        </div>
                        <Link href="/" className="futuristic-btn-secondary px-6 py-2">
                            {t('Back to Dashboard', 'العودة للوحة الرئيسة')}
                        </Link>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <FuturisticPanel glowColor="cyan" size="sm">
                            <div className="text-center">
                                <p className="text-sm text-slate-400">{t('Surveys', 'الاستبيانات')}</p>
                                <p className="text-3xl font-extrabold text-white mt-1">{stats.surveys}</p>
                            </div>
                        </FuturisticPanel>
                        <FuturisticPanel glowColor="purple" size="sm">
                            <div className="text-center">
                                <p className="text-sm text-slate-400">{t('Scales', 'المقاييس')}</p>
                                <p className="text-3xl font-extrabold text-white mt-1">{stats.scales}</p>
                            </div>
                        </FuturisticPanel>
                        <FuturisticPanel glowColor="green" size="sm">
                            <div className="text-center">
                                <p className="text-sm text-slate-400">{t('Responses', 'الاستجابات')}</p>
                                <p className="text-3xl font-extrabold text-white mt-1">{stats.responses}</p>
                            </div>
                        </FuturisticPanel>
                        <FuturisticPanel glowColor="gold" size="sm">
                            <div className="text-center">
                                <p className="text-sm text-slate-400">{t('Reports & Files', 'التقارير والملفات')}</p>
                                <p className="text-3xl font-extrabold text-white mt-1">{stats.reports}</p>
                            </div>
                        </FuturisticPanel>
                    </div>

                    {/* Action Toast Notifications */}
                    {statusMessage && (
                        <div className={`p-4 rounded-xl border mb-6 animate-fade-in flex items-center gap-3 ${
                            statusMessage.type === 'success' 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${statusMessage.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <span className="text-sm font-medium">{statusMessage.text}</span>
                        </div>
                    )}

                    {/* Main Workspace Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Tab Selector Sidebar */}
                        <div className="lg:col-span-1 space-y-3">
                            <button
                                onClick={() => setActiveTab('surveys')}
                                className={`w-full text-start px-5 py-4 rounded-xl border font-bold transition-all ${
                                    activeTab === 'surveys'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                            >
                                📝 {t('Surveys Table', 'جدول الاستبيانات')}
                            </button>
                            <button
                                onClick={() => setActiveTab('scales')}
                                className={`w-full text-start px-5 py-4 rounded-xl border font-bold transition-all ${
                                    activeTab === 'scales'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                            >
                                📏 {t('Scales Table', 'جدول المقاييس')}
                            </button>
                            <button
                                onClick={() => setActiveTab('responses')}
                                className={`w-full text-start px-5 py-4 rounded-xl border font-bold transition-all ${
                                    activeTab === 'responses'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                            >
                                👥 {t('Participations (Responses)', 'المشاركات (الاستجابات)')}
                            </button>
                            <button
                                onClick={() => setActiveTab('reports')}
                                className={`w-full text-start px-5 py-4 rounded-xl border font-bold transition-all ${
                                    activeTab === 'reports'
                                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                                }`}
                            >
                                📂 {t('Reports & S3 Files', 'التقارير وملفات S3')}
                            </button>
                        </div>

                        {/* Content Panel */}
                        <div className="lg:col-span-3">
                            <FuturisticPanel glowColor="cyan" size="lg">
                                <div className="p-6">
                                    {/* --- 1. SURVEYS TAB --- */}
                                    {activeTab === 'surveys' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700/50 pb-3 flex items-center gap-2">
                                                <span>📝</span> {t('Manage Surveys', 'إدارة الاستبيانات')}
                                            </h2>
                                            
                                            {surveys.length === 0 ? (
                                                <p className="text-slate-500 text-center py-8">{t('No surveys available.', 'لا توجد استبيانات متوفرة.')}</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-slate-300">
                                                        <thead>
                                                            <tr className="border-b border-slate-700/80 text-slate-400 text-start">
                                                                <th className="py-3 px-4 text-start">{t('Title', 'العنوان')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Language', 'اللغة')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Scale Count', 'عدد المقاييس')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Status', 'الحالة')}</th>
                                                                <th className="py-3 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {surveys.map((s) => (
                                                                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                                    <td className="py-4 px-4 font-semibold text-white">{s.title}</td>
                                                                    <td className="py-4 px-4 uppercase">{s.language || 'ar'}</td>
                                                                    <td className="py-4 px-4">{s.scaleIds?.length || 0}</td>
                                                                    <td className="py-4 px-4">
                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                                            s.isPublished 
                                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                        }`}>
                                                                            {s.isPublished ? t('Published', 'منشور') : t('Draft', 'مسودة')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-center">
                                                                        <button
                                                                            onClick={() => handleDeleteSurvey(s.id)}
                                                                            disabled={isActionLoading === `survey-${s.id}`}
                                                                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                                                                        >
                                                                            {isActionLoading === `survey-${s.id}` ? t('Deleting...', 'جاري الحذف...') : t('Delete', 'حذف')}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* --- 2. SCALES TAB --- */}
                                    {activeTab === 'scales' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700/50 pb-3 flex items-center gap-2">
                                                <span>📏</span> {t('Manage Scales', 'إدارة المقاييس')}
                                            </h2>
                                            
                                            {scales.length === 0 ? (
                                                <p className="text-slate-500 text-center py-8">{t('No scales available.', 'لا توجد مقاييس متوفرة.')}</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-slate-300">
                                                        <thead>
                                                            <tr className="border-b border-slate-700/80 text-slate-400 text-start">
                                                                <th className="py-3 px-4 text-start">{t('Title', 'العنوان')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Language', 'اللغة')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Dimensions', 'الأبعاد')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Statements', 'العبارات')}</th>
                                                                <th className="py-3 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {scales.map((sc) => (
                                                                <tr key={sc.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                                    <td className="py-4 px-4 font-semibold text-white">{sc.title}</td>
                                                                    <td className="py-4 px-4 uppercase">{sc.language || 'ar'}</td>
                                                                    <td className="py-4 px-4">{sc.dimensions?.length || 0}</td>
                                                                    <td className="py-4 px-4">{sc.statements?.length || 0}</td>
                                                                    <td className="py-4 px-4 text-center">
                                                                        <button
                                                                            onClick={() => handleDeleteScale(sc.id)}
                                                                            disabled={isActionLoading === `scale-${sc.id}`}
                                                                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                                                                        >
                                                                            {isActionLoading === `scale-${sc.id}` ? t('Deleting...', 'جاري الحذف...') : t('Delete', 'حذف')}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* --- 3. RESPONSES TAB --- */}
                                    {activeTab === 'responses' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700/50 pb-3 flex items-center gap-2">
                                                <span>👥</span> {t('Manage Survey Responses', 'إدارة استجابات الاستبيانات')}
                                            </h2>

                                            {/* Survey Filter Select */}
                                            <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between bg-slate-800/20 p-4 rounded-xl border border-slate-700/40">
                                                <div className="w-full md:w-1/2">
                                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                                                        {t('Select Survey to Manage', 'اختر الاستبيان للإدارة')}
                                                    </label>
                                                    <select
                                                        value={selectedSurveyId}
                                                        onChange={(e) => setSelectedSurveyId(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
                                                    >
                                                        {surveys.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                {responses.length > 0 && (
                                                    <button
                                                        onClick={() => handlePurgeResponses(selectedSurveyId)}
                                                        disabled={isActionLoading === `purge-responses-${selectedSurveyId}`}
                                                        className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                    >
                                                        {isActionLoading === `purge-responses-${selectedSurveyId}` ? t('Purging...', 'جاري التفريغ...') : t('Purge All Responses', 'تفريغ جميع الاستجابات')}
                                                    </button>
                                                )}
                                            </div>

                                            {responses.length === 0 ? (
                                                <p className="text-slate-500 text-center py-8">{t('No responses found for this survey.', 'لا توجد استجابات متوفرة لهذا الاستبيان.')}</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-slate-300">
                                                        <thead>
                                                            <tr className="border-b border-slate-700/80 text-slate-400 text-start">
                                                                <th className="py-3 px-4 text-start">{t('Response ID', 'معرف الاستجابة')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Date Submitted', 'تاريخ التقديم')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Demographics', 'البيانات الديموغرافية')}</th>
                                                                <th className="py-3 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {responses.map((r) => (
                                                                <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                                    <td className="py-4 px-4 font-mono text-xs text-slate-400">{r.id.substring(0, 8)}...</td>
                                                                    <td className="py-4 px-4 text-slate-400">{new Date(r.submittedAt || (r as any).createdAt || '').toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                                                                    <td className="py-4 px-4 max-w-[240px] truncate text-xs text-slate-400">
                                                                        {JSON.stringify(r.demographics || {})}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-center">
                                                                        <button
                                                                            onClick={() => handleDeleteResponse(r.id)}
                                                                            disabled={isActionLoading === `response-${r.id}`}
                                                                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                                                                        >
                                                                            {isActionLoading === `response-${r.id}` ? t('Deleting...', 'جاري الحذف...') : t('Delete', 'حذف')}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* --- 4. REPORTS TAB --- */}
                                    {activeTab === 'reports' && (
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700/50 pb-3 flex items-center gap-2">
                                                <span>📂</span> {t('Manage Reports & S3 Files', 'إدارة التقارير وملفات S3')}
                                            </h2>
                                            
                                            {reports.length === 0 ? (
                                                <p className="text-slate-500 text-center py-8">{t('No reports generated yet.', 'لم يتم إنشاء تقارير بعد.')}</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-slate-300">
                                                        <thead>
                                                            <tr className="border-b border-slate-700/80 text-slate-400 text-start">
                                                                <th className="py-3 px-4 text-start">{t('Report ID', 'معرف التقرير')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Type', 'النوع')}</th>
                                                                <th className="py-3 px-4 text-start">{t('Status', 'الحالة')}</th>
                                                                <th className="py-3 px-4 text-start">{t('S3 Key (File Path)', 'مسار ملف S3')}</th>
                                                                <th className="py-3 px-4 text-center">{t('Actions', 'الإجراءات')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reports.map((rp) => (
                                                                <tr key={rp.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                                    <td className="py-4 px-4 font-mono text-xs text-slate-400">{rp.id.substring(0, 8)}...</td>
                                                                    <td className="py-4 px-4 capitalize">{rp.type}</td>
                                                                    <td className="py-4 px-4">
                                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                                            rp.status === 'completed' 
                                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                                : rp.status?.includes('failed')
                                                                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                        }`}>
                                                                            {rp.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4 max-w-[200px] truncate font-mono text-xs text-slate-400" title={rp.pdfS3Key || ''}>
                                                                        {rp.pdfS3Key || t('No File (Failed/Pending)', 'لا يوجد ملف (فشل/معلق)')}
                                                                    </td>
                                                                    <td className="py-4 px-4">
                                                                        <div className="flex gap-2 justify-center">
                                                                            {rp.pdfS3Key && (
                                                                                <button
                                                                                    onClick={() => handleDownloadReportFile(rp.pdfS3Key!)}
                                                                                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 text-xs font-bold transition-all"
                                                                                >
                                                                                    ⬇️ {t('Get', 'تحميل')}
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleDeleteReport(rp.id, rp.pdfS3Key)}
                                                                                disabled={isActionLoading === `report-${rp.id}`}
                                                                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-bold transition-all disabled:opacity-50"
                                                                            >
                                                                                {isActionLoading === `report-${rp.id}` ? t('Deleting...', 'جاري...') : t('Delete', 'حذف')}
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </FuturisticPanel>
                        </div>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
