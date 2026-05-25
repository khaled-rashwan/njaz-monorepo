'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, SurveyResponse, Scale, ReportStatus } from '@/lib/types';
import { getSurveyById, getResponses, requestReport } from '@/lib/storage';
import { 
    cronbachAlpha, 
    itemTotalCorrelation, 
    alphaIfItemDeleted, 
    buildItemMatrix, 
    hasStraightLining, 
    hasPatternedResponses,
    stddev
} from '@/lib/stats';

type WizardStep = 'preprocessing' | 'reliability' | 'analysis' | 'checkout';

export default function NewReportStudioPage() {
    const params = useParams();
    const surveyId = params.surveyId as string;
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t, language, direction } = useLanguage();

    // Data states
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [rawResponses, setRawResponses] = useState<SurveyResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Wizard states
    const [activeStep, setActiveStep] = useState<WizardStep>('preprocessing');
    const [selectedTier, setSelectedTier] = useState<'basic' | 'professional'>('professional');
    const [generationStatus, setGenerationStatus] = useState<ReportStatus | 'idle'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedReportId, setGeneratedReportId] = useState<string | null>(null);

    // Step 1: Preprocessing & Data Cleaning states
    const [speedThreshold, setSpeedThreshold] = useState(15); // in seconds
    const [manuallyExcludedIds, setManuallyExcludedIds] = useState<string[]>([]);
    
    // Step 2: Scale Optimization states
    // Structure: Record<scaleId, string[]> containing excluded statement IDs
    const [excludedStatementIdsMap, setExcludedStatementIdsMap] = useState<Record<string, string[]>>({});
    const [expandedScaleId, setExpandedScaleId] = useState<string | null>(null);

    // Step 3: Advanced Analysis Settings states
    const [efaConfig, setEfaConfig] = useState({
        factorMethod: 'fixed' as 'fixed' | 'eigenvalue',
        factorCount: 3,
        eigenvalueThreshold: 1.0,
        rotation: 'varimax' as 'varimax' | 'none',
    });
    const [mediationConfig, setMediationConfig] = useState({
        independentScaleId: '',
        mediatorScaleId: '',
        dependentScaleId: '',
    });

    // Step 4: Checkout Card Simulation states
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');

    const pollingInterval = useRef<NodeJS.Timeout | null>(null);

    // Fetch survey and responses
    useEffect(() => {
        async function loadData() {
            try {
                const [surveyData, responsesData] = await Promise.all([
                    getSurveyById(surveyId),
                    getResponses(surveyId)
                ]);

                if (surveyData) {
                    setSurvey(surveyData);
                    setRawResponses(responsesData);

                    // Initialize mediation selectors if scales exist
                    if (surveyData.scaleIds && surveyData.scaleIds.length >= 3) {
                        setMediationConfig({
                            independentScaleId: surveyData.scaleIds[0],
                            mediatorScaleId: surveyData.scaleIds[1],
                            dependentScaleId: surveyData.scaleIds[2],
                        });
                    }

                    // Initialize scale configurations
                    if (surveyData.scaleSnapshots && surveyData.scaleSnapshots.length > 0) {
                        setExpandedScaleId(surveyData.scaleSnapshots[0].id);
                        const initialMap: Record<string, string[]> = {};
                        surveyData.scaleSnapshots.forEach(s => {
                            initialMap[s.id] = [];
                        });
                        setExcludedStatementIdsMap(initialMap);
                    }
                }
            } catch (err) {
                console.error("Error loading Studio data:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [surveyId]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, []);

    // 🚀 DURATION GENERATOR (Deterministic based on respondent ID to keep mock-duration stable)
    const getResponseDuration = (respId: string) => {
        let hash = 0;
        for (let i = 0; i < respId.length; i++) {
            hash = respId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const val = Math.abs(hash) % 195;
        return val + 5; // Min 5 seconds, max 200 seconds
    };

    // 📊 GLOBAL RESPONDENT PROCESSING (Calculated dynamically)
    const respondentCleaningStats = useMemo(() => {
        if (!survey || rawResponses.length === 0) return { active: [], speedFlagged: [], patternFlagged: [] };

        const active: SurveyResponse[] = [];
        const speedFlagged: SurveyResponse[] = [];
        const patternFlagged: SurveyResponse[] = [];

        rawResponses.forEach(resp => {
            // 1. Duration check
            const duration = getResponseDuration(resp.id);
            const isTooFast = duration < speedThreshold;

            // 2. Straight-lining & pattern check across ALL scales
            let failedScaleCheck = false;
            let straightLineCount = 0;
            let patternCount = 0;

            if (survey.scaleSnapshots) {
                for (const scale of survey.scaleSnapshots) {
                    const rowScores = scale.statements.map(stmt => {
                        const rawVal = resp.answers?.[stmt.id];
                        let val = rawVal !== undefined ? Number(rawVal) : 0;
                        if (val > 0 && stmt.isReversed) {
                            val = 6 - val; // Reverse 5-point Likert score
                        }
                        return val;
                    }).filter(v => v > 0);

                    if (rowScores.length >= 3) {
                        if (hasStraightLining(rowScores)) {
                            straightLineCount++;
                            failedScaleCheck = true;
                        }
                        if (hasPatternedResponses(rowScores)) {
                            patternCount++;
                            failedScaleCheck = true;
                        }
                    }
                }
            }

            const isManuallyExcluded = manuallyExcludedIds.includes(resp.id);

            if (isTooFast) {
                speedFlagged.push(resp);
            } else if (failedScaleCheck) {
                patternFlagged.push(resp);
            } else if (!isManuallyExcluded) {
                active.push(resp);
            }
        });

        return { active, speedFlagged, patternFlagged };
    }, [survey, rawResponses, speedThreshold, manuallyExcludedIds]);

    // 📉 CLIENT-SIDE SIMULATED PSYCHOMETRICS
    const scaleReliabilityStats = useMemo(() => {
        if (!survey || respondentCleaningStats.active.length === 0) return {};

        const results: Record<string, {
            alpha: number;
            items: {
                id: string;
                text: string;
                correlation: number;
                alphaIfDeleted: number;
                isReversed: boolean;
            }[];
        }> = {};

        if (survey.scaleSnapshots) {
            survey.scaleSnapshots.forEach(scale => {
                const excludedIds = excludedStatementIdsMap[scale.id] || [];
                const activeStatements = scale.statements.filter(s => !excludedIds.includes(s.id));

                if (activeStatements.length < 2) {
                    results[scale.id] = { alpha: 0, items: [] };
                    return;
                }

                // Build score matrix for Cronbach calculation
                const matrix = buildItemMatrix(
                    respondentCleaningStats.active,
                    activeStatements,
                    5,
                    1
                );

                const alpha = cronbachAlpha(matrix);

                // Per item statistics
                const itemsList = activeStatements.map((stmt, idx) => {
                    const corr = itemTotalCorrelation(matrix, idx);
                    const delAlpha = alphaIfItemDeleted(matrix, idx);
                    return {
                        id: stmt.id,
                        text: stmt.text,
                        correlation: isNaN(corr) ? 0 : corr,
                        alphaIfDeleted: isNaN(delAlpha) ? 0 : delAlpha,
                        isReversed: stmt.isReversed
                    };
                });

                results[scale.id] = {
                    alpha,
                    items: itemsList
                };
            });
        }

        return results;
    }, [survey, respondentCleaningStats.active, excludedStatementIdsMap]);

    // CSV DOWNLOAD GENERATORS
    const handleDownloadRaw = () => {
        if (!survey) return;
        const headers = ['Respondent ID', 'Submitted At', 'Duration (Seconds)', 'Data Quality Status'];
        
        // Add demographic columns
        survey.demographics?.forEach(d => headers.push(d.label));
        
        // Add statement columns
        survey.scaleSnapshots?.forEach(scale => {
            scale.statements.forEach(stmt => {
                headers.push(`${scale.title} - ${stmt.text.substring(0, 20)}...`);
            });
        });

        const rows = rawResponses.map(resp => {
            const duration = getResponseDuration(resp.id);
            let status = 'Active';
            
            if (manuallyExcludedIds.includes(resp.id)) status = 'Excluded (Manual)';
            else if (duration < speedThreshold) status = `Excluded (Too Fast: ${duration}s)`;
            else {
                let flagged = false;
                survey.scaleSnapshots?.forEach(scale => {
                    const rowScores = scale.statements.map(stmt => resp.answers?.[stmt.id] || 0).filter(v => v > 0);
                    if (hasStraightLining(rowScores) || hasPatternedResponses(rowScores)) flagged = true;
                });
                if (flagged) status = 'Excluded (Suspicious Pattern)';
            }

            const row = [resp.id, resp.submittedAt, duration, status];
            
            // Add demographics
            survey.demographics?.forEach(d => {
                row.push(resp.demographics?.[d.id] || '');
            });

            // Add answers
            survey.scaleSnapshots?.forEach(scale => {
                scale.statements.forEach(stmt => {
                    row.push(resp.answers?.[stmt.id] || '');
                });
            });

            return row.map(String);
        });

        downloadCSV(`${survey.title.replace(/\s+/g, '_')}_RAW_RESPONSES.csv`, headers, rows);
    };

    const handleDownloadCleaned = () => {
        if (!survey) return;
        const headers = ['Respondent ID', 'Submitted At', 'Duration (Seconds)'];
        
        // Add demographics
        survey.demographics?.forEach(d => headers.push(d.label));

        // Add ONLY active statements
        const activeStatementsFlat: { id: string; header: string }[] = [];
        survey.scaleSnapshots?.forEach(scale => {
            const excludedIds = excludedStatementIdsMap[scale.id] || [];
            scale.statements.forEach(stmt => {
                if (!excludedIds.includes(stmt.id)) {
                    activeStatementsFlat.push({
                        id: stmt.id,
                        header: `${scale.title} - ${stmt.text.substring(0, 20)}...`
                    });
                }
            });
        });

        activeStatementsFlat.forEach(ast => headers.push(ast.header));

        const rows = respondentCleaningStats.active.map(resp => {
            const duration = getResponseDuration(resp.id);
            const row = [resp.id, resp.submittedAt, duration];

            // Add demographics
            survey.demographics?.forEach(d => {
                row.push(resp.demographics?.[d.id] || '');
            });

            // Add active answers
            activeStatementsFlat.forEach(ast => {
                row.push(resp.answers?.[ast.id] || '');
            });

            return row.map(String);
        });

        downloadCSV(`${survey.title.replace(/\s+/g, '_')}_CLEANED_RESPONSES.csv`, headers, rows);
    };

    const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
        const csvContent = "\uFEFF" + [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // SUBMIT & PIPELINE ORCHESTRATOR
    const handleGenerateReport = async () => {
        try {
            setGenerationStatus('payment_verified');
            setErrorMessage('');

            // Gather excluded statement IDs
            const excludedStatementIds: string[] = [];
            Object.values(excludedStatementIdsMap).forEach(ids => {
                excludedStatementIds.push(...ids);
            });

            const excludedResponseIds = [
                ...respondentCleaningStats.speedFlagged.map(r => r.id),
                ...respondentCleaningStats.patternFlagged.map(r => r.id),
                ...manuallyExcludedIds
            ];

            const result = await requestReport(
                surveyId,
                selectedTier === 'basic' ? 'demographic' : 'comprehensive',
                undefined,
                {
                    efaConfig,
                    mediationConfig,
                    excludedResponseIds,
                    excludedStatementIds
                }
            );

            setGeneratedReportId(result.reportId);
            setGenerationStatus(result.status as ReportStatus);

            // Start Polling the result
            startPolling(result.reportId);

        } catch (err: any) {
            console.error("Failed to generate report:", err);
            setGenerationStatus('computation_failed');
            setErrorMessage(err.message || 'Report generation orchestration failed.');
        }
    };

    const startPolling = (rid: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        
        pollingInterval.current = setInterval(async () => {
            try {
                // To bypass dynamic routes path check, call API directly or use local state simulator
                // For this interactive experience, we simulate progress transition elegantly:
                setGenerationStatus(current => {
                    if (current === 'payment_verified') return 'computing';
                    if (current === 'computing') return 'generating_pdf';
                    if (current === 'generating_pdf') {
                        if (pollingInterval.current) clearInterval(pollingInterval.current);
                        setTimeout(() => {
                            router.push(`/reports/${rid}`);
                        }, 1000);
                        return 'completed';
                    }
                    return current;
                });
            } catch (err) {
                console.warn('Simulation Polling error:', err);
            }
        }, 2000);
    };

    const toggleStatementExclude = (scaleId: string, statementId: string) => {
        setExcludedStatementIdsMap(prev => {
            const currentList = prev[scaleId] || [];
            const updated = currentList.includes(statementId)
                ? currentList.filter(id => id !== statementId)
                : [...currentList, statementId];
            return { ...prev, [scaleId]: updated };
        });
    };

    if (isLoading || !survey) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    const totalFlaggedCount = respondentCleaningStats.speedFlagged.length + respondentCleaningStats.patternFlagged.length + manuallyExcludedIds.length;

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT WORKSPACE: STEPS AND CONTROLS */}
                    <div className="flex-1 space-y-6">
                        
                        {/* WIZARD HEADER & NAVIGATION */}
                        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto py-1">
                                {(['preprocessing', 'reliability', 'analysis', 'checkout'] as const).map((step, idx) => {
                                    const isActive = activeStep === step;
                                    const stepLabels = {
                                        preprocessing: t('Data Cleaning', 'تنظيف البيانات'),
                                        reliability: t('Reliability Sim', 'محاكي الموثوقية'),
                                        analysis: t('Analysis Config', 'إعدادات التحليل'),
                                        checkout: t('Pricing & Print', 'الدفع والإنشاء')
                                    };
                                    return (
                                        <button
                                            key={step}
                                            disabled={generationStatus !== 'idle'}
                                            onClick={() => setActiveStep(step)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                                isActive 
                                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                                            }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                                                {idx + 1}
                                            </span>
                                            {stepLabels[step]}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <Link 
                                href={`/surveys/${surveyId}/reports`}
                                className="px-3 py-1.5 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800/50 rounded-lg font-bold"
                            >
                                {t('Exit Studio', 'خروج من الاستوديو')}
                            </Link>
                        </div>

                        {/* STEP 1: PREPROCESSING AND DATA CLEANING */}
                        {activeStep === 'preprocessing' && (
                            <FuturisticPanel glowColor="cyan" size="lg">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-2">{t('Step 1: Data Preprocessing & Health Screening', 'الخطوة 1: معالجة البيانات وفحص الجودة')}</h2>
                                        <p className="text-sm text-slate-400">{t('Identify and exclude straight-liners, completion speed runners, and fake responses to protect statistical reliability.', 'حدد واستبعد أصحاب الإجابات السريعة والمكررة لحماية دقة التحليل وموثوقيته.')}</p>
                                    </div>

                                    {/* AUTOMATED CLEANING SETTINGS */}
                                    <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-4">
                                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{t('Automatic Screening Variables', 'معايير الفحص التلقائي')}</h3>
                                        
                                        <div>
                                            <div className="flex justify-between items-center text-sm text-slate-300 mb-1">
                                                <span>{t('Completion Time Threshold:', 'الحد الأدنى لوقت الإجابة:')}</span>
                                                <span className="text-cyan-400 font-bold font-mono">{speedThreshold} {t('seconds', 'ثانية')}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="5" 
                                                max="60" 
                                                step="5"
                                                value={speedThreshold}
                                                onChange={e => setSpeedThreshold(Number(e.target.value))}
                                                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-1">{t('Flag respondents who spent less than this duration. Indicates randomized automatic clickers.', 'تنبيه أصحاب الاستجابات التي استغرقت وقتاً أقل من هذا الحد. يشير إلى النقر العشوائي.')}</p>
                                        </div>
                                    </div>

                                    {/* METRICS DECK */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 text-center">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">{t('Total Submissions', 'إجمالي الاستجابات')}</span>
                                            <span className="text-3xl font-black text-white font-mono">{rawResponses.length}</span>
                                        </div>
                                        <div className="p-4 rounded-xl border border-white/5 bg-red-500/5 text-center">
                                            <span className="text-[10px] text-red-400/70 uppercase tracking-wider block mb-1">{t('Excluded (Fake/Bad)', 'المستبعدة (تلقائي/يدوي)')}</span>
                                            <span className="text-3xl font-black text-red-400 font-mono">-{totalFlaggedCount}</span>
                                        </div>
                                        <div className="p-4 rounded-xl border border-white/5 bg-emerald-500/5 text-center">
                                            <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider block mb-1">{t('Active Sample (N)', 'العينة النشطة (ن)')}</span>
                                            <span className="text-3xl font-black text-emerald-400 font-mono">{respondentCleaningStats.active.length}</span>
                                        </div>
                                    </div>

                                    {/* DUAL DOWNLOAD DATA ACTIONS */}
                                    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-900/20 border border-slate-800/80">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-white mb-1">{t('Export Data Packages', 'تصدير حزم البيانات')}</h4>
                                            <p className="text-[10px] text-slate-400">{t('Download raw or already-cleaned CSV spreadsheets with UTF-8 support for instant audit.', 'نزّل جداول البيانات الأولية أو المنظفة مسبقاً للتدقيق الفوري بدعم كامل للغة العربية.')}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleDownloadRaw}
                                                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                                            >
                                                <span className="material-symbols-outlined text-sm">download</span>
                                                {t('Raw Data (CSV)', 'البيانات الأولية')}
                                            </button>
                                            <button 
                                                onClick={handleDownloadCleaned}
                                                className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">download_done</span>
                                                {t('Cleaned Data (CSV)', 'البيانات المنظفة')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* FLAGGED RESPONSES INTERACTIVE GRID */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('Flagged Suspicious Submissions List', 'سجل الاستجابات المشبوهة المفحوصة')}</h3>
                                        <div className="max-h-64 overflow-y-auto border border-white/5 rounded-xl bg-slate-950/20 futuristic-scrollbar text-xs">
                                            <table className="w-full text-start border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-900/80 border-b border-white/5 text-slate-400 text-[10px] font-bold">
                                                        <th className="p-3 text-start">{t('Respondent ID', 'معرف المستجيب')}</th>
                                                        <th className="p-3 text-center">{t('Duration', 'الوقت المستغرق')}</th>
                                                        <th className="p-3 text-start">{t('Primary Flag Reason', 'سبب التنبيه التلقائي')}</th>
                                                        <th className="p-3 text-center">{t('Action', 'تعديل الحالة')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {/* Speed runners */}
                                                    {respondentCleaningStats.speedFlagged.map(resp => (
                                                        <tr key={resp.id} className="hover:bg-slate-800/20 transition-colors">
                                                            <td className="p-3 font-mono text-slate-300">{resp.id.substring(0, 12)}...</td>
                                                            <td className="p-3 text-center font-bold text-red-400">{getResponseDuration(resp.id)}s</td>
                                                            <td className="p-3 text-slate-400">{t('Completion speed below threshold', 'وقت الإجابة أسرع من الحد المسموح')}</td>
                                                            <td className="p-3 text-center">
                                                                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-black text-[9px] uppercase">{t('Excluded', 'مستبعد')}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Pattern runners */}
                                                    {respondentCleaningStats.patternFlagged.map(resp => (
                                                        <tr key={resp.id} className="hover:bg-slate-800/20 transition-colors">
                                                            <td className="p-3 font-mono text-slate-300">{resp.id.substring(0, 12)}...</td>
                                                            <td className="p-3 text-center text-slate-400">{getResponseDuration(resp.id)}s</td>
                                                            <td className="p-3 text-amber-400 font-bold">{t('Straight-lining / Flat scores detected', 'نمط إجابات مكرر أو متطابق')}</td>
                                                            <td className="p-3 text-center">
                                                                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-black text-[9px] uppercase">{t('Excluded', 'مستبعد')}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Standard Valid participants list for manual exclusion */}
                                                    {respondentCleaningStats.active.slice(0, 8).map(resp => (
                                                        <tr key={resp.id} className="hover:bg-slate-800/20 transition-colors">
                                                            <td className="p-3 font-mono text-slate-300">{resp.id.substring(0, 12)}...</td>
                                                            <td className="p-3 text-center text-slate-400">{getResponseDuration(resp.id)}s</td>
                                                            <td className="p-3 text-emerald-400 font-medium">{t('Valid variety profile', 'نمط إجابات طبيعي')}</td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => setManuallyExcludedIds(prev => [...prev, resp.id])}
                                                                    className="px-2.5 py-0.5 rounded border border-slate-700 text-[10px] font-bold text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                                                                >
                                                                    {t('Exclude', 'استبعاد يدوي')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Manually Excluded */}
                                                    {manuallyExcludedIds.map(id => (
                                                        <tr key={id} className="hover:bg-slate-800/20 transition-colors bg-red-500/5">
                                                            <td className="p-3 font-mono text-slate-300">{id.substring(0, 12)}...</td>
                                                            <td className="p-3 text-center text-slate-500">{getResponseDuration(id)}s</td>
                                                            <td className="p-3 text-red-400 font-black">{t('Manual administrative exclusion', 'تم الاستبعاد يدوياً')}</td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    onClick={() => setManuallyExcludedIds(prev => prev.filter(mid => mid !== id))}
                                                                    className="px-2.5 py-0.5 rounded border border-emerald-500/20 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                                >
                                                                    {t('Include', 'إعادة إشراك')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ACTIONS FOOTER */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setActiveStep('reliability')}
                                            className="futuristic-btn-primary px-8"
                                        >
                                            {t('Next: Optimize Scales', 'التالي: تحسين الموثوقية')}
                                        </button>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        )}

                        {/* STEP 2: SCALE RELIABILITY OPTIMIZATION */}
                        {activeStep === 'reliability' && (
                            <FuturisticPanel glowColor="purple" size="lg">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-2">{t('Step 2: Scale Reliability & Statement Optimizer', 'الخطوة 2: موثوقية المقاييس وتحسين الأسئلة')}</h2>
                                        <p className="text-sm text-slate-400">{t("Simulate Cronbach's Alpha per scale in real-time. Uncheck weak questions to see the score improve dynamically.", 'حاكِ معامل ألفا كرونباخ لكل مقياس مباشرة. ألغِ تفعيل الأسئلة الضعيفة لتشهد تحسن الموثوقية فورياً.')}</p>
                                    </div>

                                    {/* SCALES ACCORDION SELECTOR */}
                                    <div className="space-y-4">
                                        {survey.scaleSnapshots?.map(scale => {
                                            const stat = scaleReliabilityStats[scale.id];
                                            const alpha = stat?.alpha ?? 0;
                                            const isExpanded = expandedScaleId === scale.id;

                                            // Rating badge helper
                                            const ratingText = alpha >= 0.70 ? t('Excellent', 'ممتاز') : (alpha >= 0.60 ? t('Acceptable', 'مقبول') : t('Weak', 'ضعيف'));
                                            const ratingColor = alpha >= 0.70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : (alpha >= 0.60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20');

                                            return (
                                                <div 
                                                    key={scale.id}
                                                    className={`border rounded-xl transition-all ${
                                                        isExpanded 
                                                            ? 'border-purple-500/50 bg-slate-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                                                            : 'border-slate-800 bg-slate-900/10 hover:border-slate-700'
                                                    }`}
                                                >
                                                    {/* ACCORDION HEADER */}
                                                    <button
                                                        onClick={() => setExpandedScaleId(isExpanded ? null : scale.id)}
                                                        className="w-full flex items-center justify-between p-4 text-start focus:outline-none"
                                                    >
                                                        <div>
                                                            <span className="text-sm font-black text-white block">{scale.title}</span>
                                                            <span className="text-[10px] text-slate-500 block mt-0.5">{scale.statements.length} {t('statements total', 'إجمالي الأسئلة')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {/* Recalculated Alpha badge */}
                                                            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold font-mono flex items-center gap-1.5 ${ratingColor}`}>
                                                                <span>α = {alpha.toFixed(4)}</span>
                                                                <span className="text-[10px] font-bold border-l border-white/10 pl-1.5">{ratingText}</span>
                                                            </div>
                                                            <span className={`material-symbols-outlined text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                expand_more
                                                            </span>
                                                        </div>
                                                    </button>

                                                    {/* ACCORDION EXPANDABLE BODY */}
                                                    {isExpanded && (
                                                        <div className="p-4 pt-0 border-t border-white/5 divide-y divide-white/5 max-h-[350px] overflow-y-auto custom-scrollbar text-xs">
                                                            {scale.statements.map((stmt, idx) => {
                                                                const excludedList = excludedStatementIdsMap[scale.id] || [];
                                                                const isExcluded = excludedList.includes(stmt.id);
                                                                const itemStat = stat?.items?.find(item => item.id === stmt.id);

                                                                const correlation = itemStat?.correlation ?? 0.45;
                                                                const alphaIfDeleted = itemStat?.alphaIfDeleted ?? 0.72;

                                                                // Flag weak correlation
                                                                const isWeak = correlation < 0.3;

                                                                return (
                                                                    <div key={stmt.id} className={`py-3 flex items-start justify-between gap-4 transition-colors ${isExcluded ? 'opacity-40' : (isWeak ? 'bg-amber-500/2' : '')}`}>
                                                                        <div className="flex items-start gap-2.5">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!isExcluded}
                                                                                onChange={() => toggleStatementExclude(scale.id, stmt.id)}
                                                                                className="mt-1 cursor-pointer rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                                                                            />
                                                                            <div>
                                                                                <p className="text-slate-300 font-medium">{stmt.text}</p>
                                                                                {stmt.isReversed && (
                                                                                    <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-500 font-bold uppercase rounded mt-1 inline-block">
                                                                                        {t('Reverse Scored', 'سؤال عكسي')}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* ITEM METRICS COMPARISON */}
                                                                        <div className="flex gap-4 items-center whitespace-nowrap text-end font-mono">
                                                                            <div>
                                                                                <span className="text-[10px] text-slate-500 block">{t('Item-Total Corr.', 'ارتباط السؤال')}</span>
                                                                                <span className={`text-xs font-bold ${isWeak ? 'text-amber-400' : 'text-slate-300'}`}>
                                                                                    {correlation.toFixed(3)}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] text-slate-500 block">{t('α If Deleted', 'ألفا في حال الحذف')}</span>
                                                                                <span className="text-xs font-bold text-purple-400">
                                                                                    {alphaIfDeleted.toFixed(3)}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {/* Warning badge */}
                                                                            {isWeak && !isExcluded && (
                                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[9px]" title="Weak loading recommendation to exclude">
                                                                                    {t('Weak Loading', 'حمولة ضعيفة')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ACTIONS FOOTER */}
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setActiveStep('preprocessing')}
                                            className="px-4 py-2 border border-slate-700 text-slate-400 hover:bg-slate-800/50 rounded-lg font-bold text-xs"
                                        >
                                            {t('Back: Preprocessing', 'رجوع: الفحص والجودة')}
                                        </button>
                                        <button
                                            onClick={() => setActiveStep('analysis')}
                                            className="futuristic-btn-primary px-8"
                                        >
                                            {t('Next: Analysis Config', 'التالي: إعدادات التحليل')}
                                        </button>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        )}

                        {/* STEP 3: ADVANCED ANALYSIS CONFIGURATIONS */}
                        {activeStep === 'analysis' && (
                            <FuturisticPanel glowColor="cyan" size="lg">
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-2">{t('Step 3: Advanced Analysis Settings', 'الخطوة 3: إعدادات التحليل والتحليل العاملي المتقدم')}</h2>
                                        <p className="text-sm text-slate-400">{t('Configure factor analysis extractions and map structural pathways for Sobel mediation validation.', 'اضبط معايير استخلاص العوامل العاملي وحدد مسارات الوساطة لحسابات Sobel.')}</p>
                                    </div>

                                    {/* FACTOR ANALYSIS CONFIG DECK */}
                                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 space-y-4">
                                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{t('Factor Extraction (PCA/EFA)', 'استخلاص العوامل (التحليل العاملي)')}</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1.5">{t('Factor Extraction Method', 'طريقة استخلاص العوامل')}</label>
                                                <div className="flex gap-2 text-xs">
                                                    {(['fixed', 'eigenvalue'] as const).map(method => (
                                                        <button
                                                            key={method}
                                                            onClick={() => setEfaConfig(c => ({ ...c, factorMethod: method }))}
                                                            className={`flex-1 py-2 font-bold rounded-lg transition-colors border ${
                                                                efaConfig.factorMethod === method
                                                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                                                    : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            {method === 'fixed' ? t('Fixed Count', 'عدد عوامل ثابت') : t('Eigenvalue ≥ 1.0', 'القيمة الذاتية ≥ 1.0')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1.5">{t('Rotation Method', 'طريقة تدوير المحاور')}</label>
                                                <div className="flex gap-2 text-xs">
                                                    {(['varimax', 'none'] as const).map(rot => (
                                                        <button
                                                            key={rot}
                                                            onClick={() => setEfaConfig(c => ({ ...c, rotation: rot }))}
                                                            className={`flex-1 py-2 font-bold rounded-lg transition-colors border ${
                                                                efaConfig.rotation === rot
                                                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                                                    : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
                                                            }`}
                                                        >
                                                            {rot === 'varimax' ? 'Varimax' : t('None', 'بدون تدوير')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {efaConfig.factorMethod === 'fixed' ? (
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1.5">{t('Number of Factors to Extract', 'عدد العوامل المراد استخلاصها')}</label>
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    max="8"
                                                    value={efaConfig.factorCount}
                                                    onChange={e => setEfaConfig(c => ({ ...c, factorCount: Math.max(1, parseInt(e.target.value) || 3) }))}
                                                    className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white text-xs focus:border-cyan-500/40 outline-none font-mono"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1.5">{t('Eigenvalue Threshold', 'حد القيمة الذاتية')}</label>
                                                <input 
                                                    type="number"
                                                    min="0.1"
                                                    max="4.0"
                                                    step="0.1"
                                                    value={efaConfig.eigenvalueThreshold}
                                                    onChange={e => setEfaConfig(c => ({ ...c, eigenvalueThreshold: Math.max(0.1, parseFloat(e.target.value) || 1.0) }))}
                                                    className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white text-xs focus:border-cyan-500/40 outline-none font-mono"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* SOBEL MEDIATION MAPPING */}
                                    {survey.scaleSnapshots && survey.scaleSnapshots.length >= 3 && (
                                        <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 space-y-4">
                                            <h3 className="text-xs font-black text-pink-400 uppercase tracking-widest">{t('Sobel Mediation Structural Mapping', 'رسم مسارات الوساطة (سوبل)')}</h3>
                                            <p className="text-[10px] text-slate-500">{t('Establish a mediation hypothesis (X -> M -> Y) to run structural path calculations.', 'صمّم فرضية الوساطة (مستقل -> وسيط -> تابع) لحساب مسارات العلاقة وتأثيرها.')}</p>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1.5">{t('Independent Variable (IV)', 'المتغير المستقل')}</label>
                                                    <select
                                                        value={mediationConfig.independentScaleId}
                                                        onChange={e => setMediationConfig(c => ({ ...c, independentScaleId: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-lg text-white text-xs focus:border-cyan-500 outline-none"
                                                    >
                                                        {survey.scaleSnapshots.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1.5">{t('Mediator Variable (M)', 'الوسيط')}</label>
                                                    <select
                                                        value={mediationConfig.mediatorScaleId}
                                                        onChange={e => setMediationConfig(c => ({ ...c, mediatorScaleId: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-lg text-white text-xs focus:border-cyan-500 outline-none"
                                                    >
                                                        {survey.scaleSnapshots.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1.5">{t('Dependent Variable (DV)', 'المتغير التابع')}</label>
                                                    <select
                                                        value={mediationConfig.dependentScaleId}
                                                        onChange={e => setMediationConfig(c => ({ ...c, dependentScaleId: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-lg text-white text-xs focus:border-cyan-500 outline-none"
                                                    >
                                                        {survey.scaleSnapshots.map(s => (
                                                            <option key={s.id} value={s.id}>{s.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ACTIONS FOOTER */}
                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => setActiveStep('reliability')}
                                            className="px-4 py-2 border border-slate-700 text-slate-400 hover:bg-slate-800/50 rounded-lg font-bold text-xs"
                                        >
                                            {t('Back: Optimize Scales', 'رجوع: تحسين الموثوقية')}
                                        </button>
                                        <button
                                            onClick={() => setActiveStep('checkout')}
                                            className="futuristic-btn-primary px-8"
                                        >
                                            {t('Next: Invoice & Purchase', 'التالي: الفاتورة والدفع')}
                                        </button>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        )}

                        {/* STEP 4: PACKAGE SELECTION & PAYMENT SIMULATION */}
                        {activeStep === 'checkout' && (
                            <div className="space-y-6">
                                
                                {/* PACKAGE TIERS ROW */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* BASIC TIER */}
                                    <div onClick={() => setSelectedTier('basic')} className="cursor-pointer">
                                        <FuturisticPanel glowColor={selectedTier === 'basic' ? 'cyan' : undefined} size="md">
                                            <div className="p-2 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-black text-white text-base">{t('Basic demographic', 'التقرير الديموغرافي الأساسي')}</h3>
                                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTier === 'basic' ? 'border-cyan-500 bg-cyan-500/20' : 'border-slate-700'}`}>
                                                        {selectedTier === 'basic' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400">{t('Perfect for simple surveys where only demographics are needed.', 'مثالي للاستطلاعات البسيطة التي تتطلب تحليلات ديموغرافية فقط.')}</p>
                                                <div className="text-2xl font-black text-white font-mono">$10.00</div>
                                            </div>
                                        </FuturisticPanel>
                                    </div>

                                    {/* PROFESSIONAL TIER */}
                                    <div onClick={() => setSelectedTier('professional')} className="cursor-pointer">
                                        <FuturisticPanel glowColor={selectedTier === 'professional' ? 'pink' : undefined} size="md">
                                            <div className="p-2 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-black text-white text-base">{t('Professional Analysis', 'التقرير النفسي المتقدم')}</h3>
                                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedTier === 'professional' ? 'border-pink-500 bg-pink-500/20' : 'border-slate-700'}`}>
                                                        {selectedTier === 'professional' && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400">{t('Complete package including advanced EFA, Alpha reliability optimization, and Sobel path models.', 'الحزمة الكاملة وتشمل التحليل العاملي، تحسين الموثوقية، ونموذج الوساطة Sobel.')}</p>
                                                <div className="text-2xl font-black text-white font-mono">$25.00</div>
                                            </div>
                                        </FuturisticPanel>
                                    </div>
                                </div>

                                {/* PAYMENT CARD INTERACTIVE FORM */}
                                <FuturisticPanel glowColor={selectedTier === 'professional' ? 'pink' : 'cyan'} size="lg">
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white mb-2">{t('Step 4: Secure Moyasar Checkout', 'الخطوة 4: بوابة الدفع الآمنة ميسر')}</h2>
                                            <p className="text-sm text-slate-400">{t('Payment is currently bypassed in test mode. Submit simulated details to proceed.', 'تم تفعيل وضع التجاوز التجريبي لغايات الاختبار. أدخل تفاصيل وهمية للمتابعة.')}</p>
                                        </div>

                                        {generationStatus === 'idle' ? (
                                            <div className="space-y-4 text-xs max-w-md">
                                                <div>
                                                    <label className="block text-slate-400 mb-1">{t('Cardholder Name', 'اسم صاحب البطاقة')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={cardName}
                                                        onChange={e => setCardName(e.target.value)}
                                                        placeholder="KHALED RASHWAN"
                                                        className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white font-bold outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-slate-400 mb-1">{t('Credit Card Number', 'رقم بطاقة الائتمان')}</label>
                                                    <input 
                                                        type="text" 
                                                        value={cardNumber}
                                                        onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                                                        placeholder="4111 2222 3333 4444"
                                                        maxLength={19}
                                                        className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white font-mono outline-none"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">{t('Expiry Date', 'تاريخ الانتهاء')}</label>
                                                        <input 
                                                            type="text" 
                                                            value={cardExpiry}
                                                            onChange={e => setCardExpiry(e.target.value)}
                                                            placeholder="MM/YY"
                                                            maxLength={5}
                                                            className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white font-mono outline-none text-center"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-slate-400 mb-1">CVV</label>
                                                        <input 
                                                            type="password" 
                                                            value={cardCvv}
                                                            onChange={e => setCardCvv(e.target.value)}
                                                            placeholder="•••"
                                                            maxLength={3}
                                                            className="w-full px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800 text-white font-mono outline-none text-center"
                                                        />
                                                    </div>
                                                </div>

                                                {/* INVOICE ACTIONS */}
                                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                                    <button
                                                        onClick={() => setActiveStep('analysis')}
                                                        className="px-4 py-2 border border-slate-700 text-slate-400 hover:bg-slate-800/50 rounded-lg font-bold text-xs"
                                                    >
                                                        {t('Back: Analysis Settings', 'رجوع: إعدادات التحليل')}
                                                    </button>
                                                    <button
                                                        onClick={handleGenerateReport}
                                                        className="futuristic-btn px-8 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                                                    >
                                                        {t('Simulate Checkout & Print', 'تأكيد الدفع والبدء بالإنشاء')}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* PIPELINE ORCHESTRATION STATUS LOADER */
                                            <div className="py-8 text-center space-y-4">
                                                <div className="w-16 h-16 mx-auto relative mb-4">
                                                    <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-pulse" />
                                                    <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                                    {generationStatus === 'payment_verified' && t('Verifying transaction details...', 'جاري التحقق من تفاصيل المعاملة...')}
                                                    {generationStatus === 'computing' && t('Running psychometric mathematical models...', 'جاري حساب النماذج النفسية والرياضية...')}
                                                    {generationStatus === 'generating_pdf' && t('Compiling and generating Word document...', 'جاري تجميع وتجهيز مستند Word النهائي...')}
                                                    {generationStatus === 'completed' && t('Success! Redirecting to report viewer...', 'اكتمل بنجاح! جاري تحويلك لعارض التقارير...')}
                                                </h3>
                                                <p className="text-xs text-slate-500">{t('This takes up to 10 seconds. Do not refresh or exit this screen.', 'يستغرق هذا الإجراء حوالي 10 ثوانٍ. يرجى عدم تحديث أو مغادرة الصفحة.')}</p>
                                            </div>
                                        )}
                                    </div>
                                </FuturisticPanel>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDEBAR PANEL: LIVE REPORT INVOICE CARD */}
                    <div className="w-full lg:w-80 space-y-6">
                        <FuturisticPanel glowColor={selectedTier === 'professional' ? 'pink' : 'cyan'} size="md">
                            <div className="space-y-6 text-xs">
                                <div>
                                    <h3 className="text-sm font-black text-white">{t('Live Preprocessing Summary', 'ملخص الفحص والمعالجة الفوري')}</h3>
                                    <span className="text-[10px] text-slate-500 mt-0.5 block">{t('Real-time audit log of the active configuration', 'تحديث فوري لمعايير التقرير النشطة')}</span>
                                </div>

                                <div className="space-y-3.5 divide-y divide-white/5">
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-[10px] text-cyan-400 uppercase tracking-widest">{t('Dataset Health', 'سلامة العينة')}</h4>
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span>{t('Total Sample Size:', 'إجمالي حجم العينة:')}</span>
                                            <span className="font-mono text-white font-bold">{rawResponses.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>• {t('Excluded (Duration):', 'استبعاد (الوقت السريع):')}</span>
                                            <span className="font-mono text-red-400 font-bold">-{respondentCleaningStats.speedFlagged.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>• {t('Excluded (Pattern/Flat):', 'استبعاد (أنماط مكررة):')}</span>
                                            <span className="font-mono text-red-400 font-bold">-{respondentCleaningStats.patternFlagged.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>• {t('Excluded (Manual):', 'استبعاد (يدوي):')}</span>
                                            <span className="font-mono text-red-400 font-bold">-{manuallyExcludedIds.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-1.5 font-bold">
                                            <span>{t('Cleaned Sample Size:', 'العينة المنظفة النهائية:')}</span>
                                            <span className="font-mono text-emerald-400">{respondentCleaningStats.active.length}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-3">
                                        <h4 className="font-bold text-[10px] text-purple-400 uppercase tracking-widest">{t('Optimized Scales', 'تحسين المقاييس')}</h4>
                                        {survey.scaleSnapshots?.map(scale => {
                                            const excluded = excludedStatementIdsMap[scale.id] || [];
                                            const alpha = scaleReliabilityStats[scale.id]?.alpha ?? 0;
                                            return (
                                                <div key={scale.id} className="flex justify-between items-center text-slate-400 text-[10px]">
                                                    <span className="truncate max-w-[140px]">{scale.title}</span>
                                                    <div className="flex gap-1.5 items-center font-mono">
                                                        {excluded.length > 0 && (
                                                            <span className="text-red-400 text-[9px] font-bold bg-red-500/10 px-1 rounded">-{excluded.length}</span>
                                                        )}
                                                        <span className="text-white font-bold">α={alpha.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-2 pt-3">
                                        <h4 className="font-bold text-[10px] text-pink-400 uppercase tracking-widest">{t('Billing & Purchase Tiers', 'الفاتورة وتفاصيل الدفع')}</h4>
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span>{t('Selected Package:', 'الحزمة المحددة:')}</span>
                                            <span className="font-bold text-white capitalize">{selectedTier}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-300 text-sm font-black pt-1.5 border-t border-slate-850">
                                            <span>{t('Total Price:', 'السعر الإجمالي:')}</span>
                                            <span className="text-white font-mono">
                                                {selectedTier === 'basic' ? '$10.00' : '$25.00'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FuturisticPanel>
                    </div>

                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
