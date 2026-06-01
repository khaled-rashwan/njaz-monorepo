'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Survey, SurveyResponse, Scale, ReportStatus } from '@/lib/types';
import { getSurveyById, getResponses, requestReport, getReportById } from '@/lib/storage';
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
    
    // Sorting configurations for statements inside scales
    const [statementSortConfigs, setStatementSortConfigs] = useState<Record<string, {
        sortBy: 'schema' | 'correlation' | 'alphaIfDeleted';
        sortOrder: 'asc' | 'desc';
    }>>({});

    // Step 3: Advanced Analysis Settings states
    // Record<scaleId, { factorMethod: 'fixed' | 'eigenvalue', factorCount: number, eigenvalueThreshold: number }>
    const [scaleEfaConfigs, setScaleEfaConfigs] = useState<Record<string, {
        factorMethod: 'fixed' | 'eigenvalue';
        factorCount: number;
        eigenvalueThreshold: number;
    }>>({});
    
    const [globalRotation, setGlobalRotation] = useState<'varimax' | 'none'>('varimax');

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

                    // Initialize scale configurations (exclusions, EFA defaults, sorting)
                    if (surveyData.scaleSnapshots && surveyData.scaleSnapshots.length > 0) {
                        setExpandedScaleId(surveyData.scaleSnapshots[0].id);
                        
                        const initialExclusions: Record<string, string[]> = {};
                        const initialEfa: Record<string, any> = {};
                        const initialSort: Record<string, any> = {};
                        
                        surveyData.scaleSnapshots.forEach(s => {
                            initialExclusions[s.id] = [];
                            initialSort[s.id] = { sortBy: 'schema', sortOrder: 'desc' };
                            initialEfa[s.id] = {
                                factorMethod: 'fixed',
                                factorCount: s.dimensions?.length || 1, // Default factor count to match dimension count
                                eigenvalueThreshold: 1.0
                            };
                        });
                        
                        setExcludedStatementIdsMap(initialExclusions);
                        setScaleEfaConfigs(initialEfa);
                        setStatementSortConfigs(initialSort);
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

    // Mediation variables are initialized in loadData. No duplicate prevention useEffect is needed
    // because handleAssignScale and handleUnassignScale handle deduplication explicitly and cleanly.

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
                    efaConfig: {
                        ...scaleEfaConfigs,
                        rotation: globalRotation
                    },
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
                const report = await getReportById(rid);
                if (!report) {
                    console.warn('Report not found yet, retrying...');
                    return;
                }

                const status = report.status as ReportStatus;
                setGenerationStatus(status);

                // Terminal states — stop polling
                if (status === 'completed') {
                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                    setTimeout(() => {
                        router.push(`/reports/${rid}`);
                    }, 1000);
                } else if (status === 'computation_failed' || status === 'generation_failed') {
                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                    setErrorMessage((report.data as any)?.errorMessage || 'Report generation failed on the server.');
                }
            } catch (err) {
                console.warn('Polling error:', err);
            }
        }, 3000);
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

    const [activeDragScaleId, setActiveDragScaleId] = useState<string | null>(null);
    const [isDragOverIV, setIsDragOverIV] = useState(false);
    const [isDragOverM, setIsDragOverM] = useState(false);
    const [isDragOverDV, setIsDragOverDV] = useState(false);
    const [isDragOverPool, setIsDragOverPool] = useState(false);

    const handleAssignScale = (scaleId: string, slot: 'independentScaleId' | 'mediatorScaleId' | 'dependentScaleId') => {
        setMediationConfig(prev => {
            const updated = { ...prev };
            
            // Clear duplicates across slots to prevent overlap and avoid selection gridlock
            if (updated.independentScaleId === scaleId) updated.independentScaleId = '';
            if (updated.mediatorScaleId === scaleId) updated.mediatorScaleId = '';
            if (updated.dependentScaleId === scaleId) updated.dependentScaleId = '';
            
            updated[slot] = scaleId;
            return updated;
        });
    };

    const handleUnassignScale = (slot: 'independentScaleId' | 'mediatorScaleId' | 'dependentScaleId') => {
        setMediationConfig(prev => ({
            ...prev,
            [slot]: ''
        }));
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
                                                        <div className="p-4 pt-0 border-t border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar text-xs">
                                                            {/* SORT CONTROL BAR */}
                                                            <div className="flex items-center gap-2 mb-3 py-2 border-b border-white/5 justify-end text-xs">
                                                                <span className="text-slate-500">{t('Sort by:', 'ترتيب حسب:')}</span>
                                                                <select
                                                                    value={statementSortConfigs[scale.id]?.sortBy || 'schema'}
                                                                    onChange={(e) => setStatementSortConfigs(prev => ({
                                                                        ...prev,
                                                                        [scale.id]: {
                                                                            sortBy: e.target.value as any,
                                                                            sortOrder: prev[scale.id]?.sortOrder || 'desc'
                                                                        }
                                                                    }))}
                                                                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-purple-500"
                                                                >
                                                                    <option value="schema">{t('Original Order', 'الترتيب الأصلي (الزمن)')}</option>
                                                                    <option value="correlation">{t('Item-Total Correlation', 'الارتباط الكلي للفقرة')}</option>
                                                                    <option value="alphaIfDeleted">{t('Alpha if Deleted', 'ألفا في حال حذف الفقرة')}</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setStatementSortConfigs(prev => ({
                                                                        ...prev,
                                                                        [scale.id]: {
                                                                            sortBy: prev[scale.id]?.sortBy || 'schema',
                                                                            sortOrder: prev[scale.id]?.sortOrder === 'asc' ? 'desc' : 'asc'
                                                                        }
                                                                    }))}
                                                                    className="p-1 hover:bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white transition-colors"
                                                                    title={t('Toggle Sort Direction', 'تغيير اتجاه الترتيب')}
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px] flex items-center justify-center">
                                                                        {statementSortConfigs[scale.id]?.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                                    </span>
                                                                </button>
                                                            </div>

                                                            <div className="divide-y divide-white/5">
                                                                {[...scale.statements].sort((a, b) => {
                                                                    const sortConfig = statementSortConfigs[scale.id] || { sortBy: 'schema', sortOrder: 'desc' };
                                                                    if (sortConfig.sortBy === 'schema') return 0;
                                                                    
                                                                    const aStat = stat?.items?.find(item => item.id === a.id);
                                                                    const bStat = stat?.items?.find(item => item.id === b.id);
                                                                    
                                                                    let valA = 0;
                                                                    let valB = 0;
                                                                    
                                                                    if (sortConfig.sortBy === 'correlation') {
                                                                        valA = aStat?.correlation ?? 0;
                                                                        valB = bStat?.correlation ?? 0;
                                                                    } else if (sortConfig.sortBy === 'alphaIfDeleted') {
                                                                        valA = aStat?.alphaIfDeleted ?? 0;
                                                                        valB = bStat?.alphaIfDeleted ?? 0;
                                                                    }
                                                                    
                                                                    return sortConfig.sortOrder === 'asc' ? valA - valB : valB - valA;
                                                                }).map((stmt, idx) => {
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
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{t('Factor Extraction per Scale (PCA/EFA)', 'استخلاص العوامل لكل مقياس (التحليل العاملي)')}</h3>
                                            
                                            {/* Global Rotation Option */}
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-400 text-[10px]">{t('Rotation:', 'التدوير:')}</span>
                                                <div className="flex bg-slate-950/40 border border-slate-800 rounded p-0.5">
                                                    {(['varimax', 'none'] as const).map(rot => (
                                                        <button
                                                            key={rot}
                                                            type="button"
                                                            onClick={() => setGlobalRotation(rot)}
                                                            className={`px-2 py-0.5 font-bold rounded transition-colors text-[9px] ${
                                                                globalRotation === rot
                                                                    ? 'bg-cyan-500 text-white shadow-sm'
                                                                    : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        >
                                                            {rot === 'varimax' ? 'Varimax' : t('None', 'بدون')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {survey.scaleSnapshots?.map(scale => {
                                                const config = scaleEfaConfigs[scale.id] || { factorMethod: 'fixed', factorCount: scale.dimensions?.length || 1, eigenvalueThreshold: 1.0 };
                                                return (
                                                    <div key={scale.id} className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/20 space-y-3">
                                                        <div className="flex justify-between items-center text-xs border-b border-white/5 pb-1.5">
                                                            <span className="font-bold text-white">{scale.title}</span>
                                                            <span className="text-[10px] text-slate-500 font-mono">({scale.dimensions?.length || 0} {t('dimensions', 'أبعاد')})</span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 mb-1">{t('Extraction Method', 'طريقة الاستخلاص')}</label>
                                                                <div className="flex gap-2 text-xs">
                                                                    {(['fixed', 'eigenvalue'] as const).map(method => (
                                                                        <button
                                                                            key={method}
                                                                            type="button"
                                                                            onClick={() => setScaleEfaConfigs(prev => ({
                                                                                ...prev,
                                                                                [scale.id]: {
                                                                                    ...config,
                                                                                    factorMethod: method
                                                                                }
                                                                            }))}
                                                                            className={`flex-1 py-1 px-2 font-bold rounded transition-colors border text-[10px] ${
                                                                                config.factorMethod === method
                                                                                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                                                                    : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
                                                                            }`}
                                                                        >
                                                                            {method === 'fixed' ? t('Fixed Count', 'عدد عوامل ثابت') : t('Eigenvalue ≥ 1.0', 'القيمة الذاتية')}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                {config.factorMethod === 'fixed' ? (
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-400 mb-1">{t('Number of Factors', 'عدد العوامل')}</label>
                                                                        <input 
                                                                            type="number"
                                                                            min="1"
                                                                            max="8"
                                                                            value={config.factorCount}
                                                                            onChange={e => {
                                                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setScaleEfaConfigs(prev => ({
                                                                                    ...prev,
                                                                                    [scale.id]: {
                                                                                        ...config,
                                                                                        factorCount: val
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="w-full px-3 py-1 bg-slate-900 border border-slate-800 rounded text-white text-xs outline-none font-mono focus:border-cyan-500/40"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-400 mb-1">{t('Eigenvalue Threshold', 'حد القيمة الذاتية')}</label>
                                                                        <input 
                                                                            type="number"
                                                                            min="0.1"
                                                                            max="4.0"
                                                                            step="0.1"
                                                                            value={config.eigenvalueThreshold}
                                                                            onChange={e => {
                                                                                const val = Math.max(0.1, parseFloat(e.target.value) || 1.0);
                                                                                setScaleEfaConfigs(prev => ({
                                                                                    ...prev,
                                                                                    [scale.id]: {
                                                                                        ...config,
                                                                                        eigenvalueThreshold: val
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className="w-full px-3 py-1 bg-slate-900 border border-slate-800 rounded text-white text-xs outline-none font-mono focus:border-cyan-500/40"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* SOBEL MEDIATION MAPPING */}
                                    {survey.scaleSnapshots && survey.scaleSnapshots.length >= 3 && (
                                        <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-xs font-black text-pink-400 uppercase tracking-widest">{t('Sobel Mediation Structural Mapping (SEM Board)', 'رسم مسارات الوساطة التفاعلي (SEM Board)')}</h3>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{t('Define X → M → Y path. Drag scales or click quick buttons. 100% stable layout.', 'حدد مسار المتغير مستقل ← وسيط ← تابع. اسحب أو اضغط للتعيين. تصميم مرن وجميل.')}</p>
                                                </div>
                                            </div>

                                            {/* VISUAL DRAG & DROP BOARD ROW - COMPACT FIXED HEIGHT SLOTS */}
                                            <div className="flex flex-col md:flex-row items-center gap-2 py-2 px-2 bg-slate-950/40 rounded-lg border border-slate-850">
                                                
                                                {/* SLOT 1: IV (X) */}
                                                <div 
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnter={() => setIsDragOverIV(true)}
                                                    onDragLeave={() => setIsDragOverIV(false)}
                                                    onDrop={(e) => {
                                                        setIsDragOverIV(false);
                                                        const id = e.dataTransfer.getData("scaleId");
                                                        if (id) handleAssignScale(id, 'independentScaleId');
                                                    }}
                                                    className={`h-12 flex-1 w-full flex items-center justify-between px-3 rounded border transition-all select-none relative ${
                                                        isDragOverIV
                                                            ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                                                            : mediationConfig.independentScaleId
                                                                ? 'border-cyan-500/30 bg-cyan-950/10'
                                                                : activeDragScaleId
                                                                    ? 'border-cyan-500/30 bg-cyan-950/5 animate-pulse'
                                                                    : 'border-slate-800 bg-slate-900/10 hover:border-slate-750'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <span className="text-[9px] uppercase font-black text-cyan-400 bg-cyan-500/10 px-1 rounded flex-shrink-0 tracking-wider">X</span>
                                                        {mediationConfig.independentScaleId ? (
                                                            <span className="text-[11px] font-bold text-slate-200 truncate pr-1">
                                                                {survey.scaleSnapshots.find(s => s.id === mediationConfig.independentScaleId)?.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 font-bold">{t('Empty Slot', 'فارغ')}</span>
                                                        )}
                                                    </div>
                                                    {mediationConfig.independentScaleId && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUnassignScale('independentScaleId')}
                                                            className="text-slate-500 hover:text-red-400 transition-colors ml-1.5 flex-shrink-0 flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">close</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* PATH ARROW 1 */}
                                                <div className="flex items-center justify-center text-slate-700 select-none px-1 flex-shrink-0">
                                                    <span className="material-symbols-outlined text-xs rotate-95 md:rotate-0">arrow_forward_ios</span>
                                                </div>

                                                {/* SLOT 2: MEDIATOR (M) */}
                                                <div 
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnter={() => setIsDragOverM(true)}
                                                    onDragLeave={() => setIsDragOverM(false)}
                                                    onDrop={(e) => {
                                                        setIsDragOverM(false);
                                                        const id = e.dataTransfer.getData("scaleId");
                                                        if (id) handleAssignScale(id, 'mediatorScaleId');
                                                    }}
                                                    className={`h-12 flex-1 w-full flex items-center justify-between px-3 rounded border transition-all select-none relative ${
                                                        isDragOverM
                                                            ? 'border-purple-400 bg-purple-950/30 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                                                            : mediationConfig.mediatorScaleId
                                                                ? 'border-purple-500/30 bg-purple-950/10'
                                                                : activeDragScaleId
                                                                    ? 'border-purple-500/30 bg-purple-950/5 animate-pulse'
                                                                    : 'border-slate-800 bg-slate-900/10 hover:border-slate-750'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <span className="text-[9px] uppercase font-black text-purple-400 bg-purple-500/10 px-1 rounded flex-shrink-0 tracking-wider">M</span>
                                                        {mediationConfig.mediatorScaleId ? (
                                                            <span className="text-[11px] font-bold text-slate-200 truncate pr-1">
                                                                {survey.scaleSnapshots.find(s => s.id === mediationConfig.mediatorScaleId)?.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 font-bold">{t('Empty Slot', 'فارغ')}</span>
                                                        )}
                                                    </div>
                                                    {mediationConfig.mediatorScaleId && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUnassignScale('mediatorScaleId')}
                                                            className="text-slate-500 hover:text-red-400 transition-colors ml-1.5 flex-shrink-0 flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">close</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* PATH ARROW 2 */}
                                                <div className="flex items-center justify-center text-slate-700 select-none px-1 flex-shrink-0">
                                                    <span className="material-symbols-outlined text-xs rotate-95 md:rotate-0">arrow_forward_ios</span>
                                                </div>

                                                {/* SLOT 3: DV (Y) */}
                                                <div 
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDragEnter={() => setIsDragOverDV(true)}
                                                    onDragLeave={() => setIsDragOverDV(false)}
                                                    onDrop={(e) => {
                                                        setIsDragOverDV(false);
                                                        const id = e.dataTransfer.getData("scaleId");
                                                        if (id) handleAssignScale(id, 'dependentScaleId');
                                                    }}
                                                    className={`h-12 flex-1 w-full flex items-center justify-between px-3 rounded border transition-all select-none relative ${
                                                        isDragOverDV
                                                            ? 'border-pink-400 bg-pink-950/30 shadow-[0_0_10px_rgba(236,72,153,0.25)]'
                                                            : mediationConfig.dependentScaleId
                                                                ? 'border-pink-500/30 bg-pink-950/10'
                                                                : activeDragScaleId
                                                                    ? 'border-pink-500/30 bg-pink-950/5 animate-pulse'
                                                                    : 'border-slate-800 bg-slate-900/10 hover:border-slate-750'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                        <span className="text-[9px] uppercase font-black text-pink-400 bg-pink-500/10 px-1 rounded flex-shrink-0 tracking-wider">Y</span>
                                                        {mediationConfig.dependentScaleId ? (
                                                            <span className="text-[11px] font-bold text-slate-200 truncate pr-1">
                                                                {survey.scaleSnapshots.find(s => s.id === mediationConfig.dependentScaleId)?.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 font-bold">{t('Empty Slot', 'فارغ')}</span>
                                                        )}
                                                    </div>
                                                    {mediationConfig.dependentScaleId && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleUnassignScale('dependentScaleId')}
                                                            className="text-slate-500 hover:text-red-400 transition-colors ml-1.5 flex-shrink-0 flex items-center justify-center"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* INTERACTIVE AVAILABLE POOL OF CARDS */}
                                            <div 
                                                onDragOver={(e) => e.preventDefault()}
                                                onDragEnter={() => setIsDragOverPool(true)}
                                                onDragLeave={() => setIsDragOverPool(false)}
                                                onDrop={(e) => {
                                                    setIsDragOverPool(false);
                                                    const sourceSlot = e.dataTransfer.getData("sourceSlot");
                                                    if (sourceSlot === 'independentScaleId') handleUnassignScale('independentScaleId');
                                                    if (sourceSlot === 'mediatorScaleId') handleUnassignScale('mediatorScaleId');
                                                    if (sourceSlot === 'dependentScaleId') handleUnassignScale('dependentScaleId');
                                                }}
                                                className={`p-2 rounded border transition-all ${
                                                    isDragOverPool 
                                                        ? 'border-dashed border-slate-500 bg-slate-900/30' 
                                                        : 'border-slate-850 bg-slate-900/10'
                                                }`}
                                            >
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {survey.scaleSnapshots.map(scale => {
                                                        const isIV = mediationConfig.independentScaleId === scale.id;
                                                        const isM = mediationConfig.mediatorScaleId === scale.id;
                                                        const isDV = mediationConfig.dependentScaleId === scale.id;
                                                        
                                                        // Active/Assigned styles
                                                        let cardStyles = 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800 text-slate-300';
                                                        if (isIV) {
                                                            cardStyles = 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.15)]';
                                                        } else if (isM) {
                                                            cardStyles = 'border-purple-500/40 bg-purple-950/20 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
                                                        } else if (isDV) {
                                                            cardStyles = 'border-pink-500/40 bg-pink-950/20 text-pink-200 shadow-[0_0_8px_rgba(236,72,153,0.15)]';
                                                        }

                                                        return (
                                                            <div 
                                                                key={scale.id}
                                                                draggable={true}
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData("scaleId", scale.id);
                                                                    let source = "";
                                                                    if (isIV) source = "independentScaleId";
                                                                    if (isM) source = "mediatorScaleId";
                                                                    if (isDV) source = "dependentScaleId";
                                                                    e.dataTransfer.setData("sourceSlot", source);
                                                                    setActiveDragScaleId(scale.id);
                                                                }}
                                                                onDragEnd={() => setActiveDragScaleId(null)}
                                                                className={`cursor-grab active:cursor-grabbing border rounded px-2 py-1 flex items-center justify-between gap-2.5 transition-all text-[11px] font-medium select-none ${cardStyles}`}
                                                            >
                                                                <span className="truncate max-w-[100px]">{scale.title}</span>
                                                                
                                                                <div className="flex gap-0.5 items-center select-none flex-shrink-0">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => isIV ? handleUnassignScale('independentScaleId') : handleAssignScale(scale.id, 'independentScaleId')}
                                                                        className={`w-4 h-4 flex items-center justify-center rounded font-mono font-black text-[8px] transition-all ${
                                                                            isIV 
                                                                                ? 'bg-cyan-500 text-slate-950 font-bold' 
                                                                                : 'bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                                                                        }`}
                                                                        title={isIV ? t('Unassign X', 'إلغاء التعيين') : t('Set as IV (X)', 'تحديد كمستقل')}
                                                                    >
                                                                        X
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => isM ? handleUnassignScale('mediatorScaleId') : handleAssignScale(scale.id, 'mediatorScaleId')}
                                                                        className={`w-4 h-4 flex items-center justify-center rounded font-mono font-black text-[8px] transition-all ${
                                                                            isM 
                                                                                ? 'bg-purple-500 text-slate-950 font-bold' 
                                                                                : 'bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                                                                        }`}
                                                                        title={isM ? t('Unassign M', 'إلغاء التعيين') : t('Set as Mediator (M)', 'تحديد كوسيط')}
                                                                    >
                                                                        M
                                                                    </button>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => isDV ? handleUnassignScale('dependentScaleId') : handleAssignScale(scale.id, 'dependentScaleId')}
                                                                        className={`w-4 h-4 flex items-center justify-center rounded font-mono font-black text-[8px] transition-all ${
                                                                            isDV 
                                                                                ? 'bg-pink-500 text-slate-950 font-bold' 
                                                                                : 'bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-300'
                                                                        }`}
                                                                        title={isDV ? t('Unassign Y', 'إلغاء التعيين') : t('Set as DV (Y)', 'تحديد كتابع')}
                                                                    >
                                                                        Y
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
