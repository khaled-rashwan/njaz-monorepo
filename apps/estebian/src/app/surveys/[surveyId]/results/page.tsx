'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { NavigationAction } from '@/components/navigation';
import { Survey, Scale, SurveyResponse } from '@/lib/types';
import { getSurveyById, getScaleById, getResponses } from '@/lib/storage';

export default function ResultsPage() {
    const params = useParams();
    const surveyId = params.surveyId as string;
    const { t, language, direction } = useLanguage();

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [scales, setScales] = useState<Scale[]>([]);
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [surveyId]);

    async function loadData() {
        try {
            const [surveyData, responsesData] = await Promise.all([
                getSurveyById(surveyId),
                getResponses(surveyId)
            ]);

            if (surveyData) {
                setSurvey(surveyData);

                // Use snapshots if available, otherwise fetch scales
                if (surveyData.scaleSnapshots) {
                    setScales(surveyData.scaleSnapshots);
                } else {
                    const surveyScales = await Promise.all(
                        surveyData.scaleIds.map(id => getScaleById(id))
                    );
                    setScales(surveyScales.filter((s): s is Scale => s !== null));
                }
            }
            setResponses(responsesData);
        } catch (error) {
            console.error('Error loading results:', error);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading results...', 'جاري تحميل النتائج...')}</p>
                </div>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg" dir={direction}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">{t('Survey not found', 'الاستبيان غير موجود')}</h1>
                    <NavigationAction href="/surveys" label={t('Back to Surveys', 'العودة للاستبيانات')} />
                </div>
            </div>
        );
    }

    // Helper: Calculate statistics
    const stats = calculateStats(survey, scales, responses);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 md:pt-36 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <NavigationAction href="/surveys" label={t('Back to Surveys', 'العودة للاستبيانات')} className="mb-2" />
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {survey.title} - {t('Results', 'النتائج')}
                        </h1>
                        <p className="text-slate-400">
                            {responses.length} {t('responses collected', 'استجابة تم جمعها')}
                        </p>
                    </div>

                    {responses.length === 0 ? (
                        <FuturisticPanel glowColor="purple" size="lg">
                            <div className="text-center py-12">
                                <p className="text-slate-400 mb-6">{t('No responses yet. Share your survey to collect data!', 'لا توجد استجابات بعد. شارك الاستبيان لجمع البيانات!')}</p>
                                <button
                                    onClick={() => {
                                        const link = `${window.location.origin}/respond/${surveyId}`;
                                        navigator.clipboard.writeText(link);
                                        alert(t('Link copied!', 'تم نسخ الرابط!'));
                                    }}
                                    className="futuristic-btn-primary"
                                >
                                    {t('Copy Participation Link', 'نسخ رابط المشاركة')}
                                </button>
                            </div>
                        </FuturisticPanel>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Summary Cards */}
                            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard
                                    title={t('Response Rate', 'معدل الاستجابة')}
                                    value={responses.length.toString()}
                                    subtext={t('Total Submissions', 'إجمالي المشاركات')}
                                    color="cyan"
                                />
                                <StatCard
                                    title={t('Average Completion', 'متوسط الإكمال')}
                                    value="100%"
                                    subtext={t('All participants finished', 'جميع المشاركين أكملوا')}
                                    color="emerald"
                                />
                                <StatCard
                                    title={t('Last Response', 'آخر استجابة')}
                                    value={responses.length > 0 ? new Date(responses[responses.length - 1].submittedAt).toLocaleDateString() : '-'}
                                    subtext={t('Recent Activity', 'نشاط حديث')}
                                    color="purple"
                                />
                            </div>

                            {/* Scale Performance */}
                            <div className="lg:col-span-2 space-y-8">
                                <h2 className="text-xl font-bold text-white px-2">{t('Scale Analysis', 'تحليل المقاييس')}</h2>
                                {scales.map(scale => (
                                    <FuturisticPanel key={scale.id} glowColor="cyan" size="md">
                                        <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">{scale.title}</h3>
                                        <div className="space-y-6">
                                            {scale.dimensions.map(dim => {
                                                const score = stats.dimensionScores[dim.id] || 0;
                                                const maxScore = scale.options.length;
                                                const percentage = (score / maxScore) * 100;

                                                return (
                                                    <div key={dim.id}>
                                                        <div className="flex justify-between mb-2">
                                                            <span className="text-slate-300">{dim.name}</span>
                                                            <span className="text-cyan-400 font-bold">{score.toFixed(2)} / {maxScore}</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </FuturisticPanel>
                                ))}
                            </div>

                            {/* Demographic Insights */}
                            <div className="space-y-8">
                                <h2 className="text-xl font-bold text-white px-2">{t('Demographics', 'الديموغرافية')}</h2>
                                {survey.demographics.map(field => (
                                    <FuturisticPanel key={field.id} glowColor="purple" size="md">
                                        <h3 className="text-md font-bold text-slate-300 mb-4">{field.label}</h3>
                                        {field.type === 'select' ? (
                                            <div className="space-y-3">
                                                {Object.entries(stats.demographics[field.id] || {}).map(([val, count]) => {
                                                    const pct = (count as number / responses.length) * 100;
                                                    return (
                                                        <div key={val}>
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-slate-400">{val}</span>
                                                                <span className="text-purple-400">{count as number} ({pct.toFixed(0)}%)</span>
                                                            </div>
                                                            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">
                                                {t('Open responses available in full report', 'الردود النصية متاحة في التقرير الكامل')}
                                            </p>
                                        )}
                                    </FuturisticPanel>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}

function StatCard({ title, value, subtext, color }: { title: string, value: string, subtext: string, color: 'cyan' | 'purple' | 'emerald' }) {
    const colorClasses = {
        cyan: 'from-cyan-500/20 text-cyan-400 border-cyan-500/30',
        purple: 'from-purple-500/20 text-purple-400 border-purple-500/30',
        emerald: 'from-emerald-500/20 text-emerald-400 border-emerald-500/30'
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 backdrop-blur-sm`}>
            <p className="text-sm font-medium opacity-70 mb-1">{title}</p>
            <p className="text-4xl font-black mb-2 tracking-tight">{value}</p>
            <p className="text-xs opacity-50">{subtext}</p>
        </div>
    );
}

// Stats Calculation Logic
function calculateStats(survey: Survey, scales: Scale[], responses: SurveyResponse[]) {
    const dimensionScores: Record<string, number> = {};
    const demographics: Record<string, Record<string, number>> = {};

    if (responses.length === 0) return { dimensionScores, demographics };

    // Initialize dimensions
    scales.forEach(scale => {
        (scale.dimensions || []).forEach(dim => {
            dimensionScores[dim.id] = 0;
        });
    });

    // Process responses
    responses.forEach(resp => {
        // Demographics
        Object.entries(resp.demographics || {}).forEach(([fieldId, val]) => {
            if (!demographics[fieldId]) demographics[fieldId] = {};
            const strVal = String(val);
            demographics[fieldId][strVal] = (demographics[fieldId][strVal] || 0) + 1;
        });

        // Scales
        scales.forEach(scale => {
            (scale.dimensions || []).forEach(dim => {
                let dimSum = 0;
                let statementCount = 0;

                // Flattened statements: Filter by dimensionId
                const dimStatements = (scale.statements || []).filter(st => st.dimensionId === dim.id);

                dimStatements.forEach(st => {
                    const val = resp.answers[st.id];
                    if (val !== undefined) {
                        dimSum += val;
                        statementCount++;
                    }
                });

                if (statementCount > 0) {
                    dimensionScores[dim.id] += (dimSum / statementCount);
                }
            });
        });
    });

    // Average scores
    Object.keys(dimensionScores).forEach(id => {
        dimensionScores[id] /= responses.length;
    });

    return { dimensionScores, demographics };
}
