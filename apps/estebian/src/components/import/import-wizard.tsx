'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { FuturisticPanel } from '@njaz/ui-components';
import { parseExcelOrCsv, guessColumnClassification, reverseScore } from '@/lib/excel-utils';
import { mean, stddev, cronbachAlpha, hasStraightLining, hasPatternedResponses } from '@/lib/stats';

/* ─────────── Types ─────────── */

interface DimensionConfig {
    id: string;
    name: string;
}

interface ScaleConfig {
    id: string;
    name: string;
    minScore: number;
    maxScore: number;
    dimensions: DimensionConfig[];
}

type ColumnCategory = 'scale_statement' | 'demographic_cat' | 'demographic_cont' | 'metadata_id' | 'metadata_time' | 'ignore';

interface ColumnConfig {
    name: string;
    category: ColumnCategory;
    scaleId?: string;
    dimensionId?: string;
    isReversed?: boolean;
}

/* ─────────── Component ─────────── */

export function ImportWizard() {
    const { t, direction } = useLanguage();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');

    // Step 1: Raw sheet data
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);

    // Step 2: Scales & dimensions (defined BEFORE mapping)
    const [scales, setScales] = useState<ScaleConfig[]>([]);
    const [newScaleName, setNewScaleName] = useState('');
    const [newDimInputs, setNewDimInputs] = useState<Record<string, string>>({});

    // Step 3: Column mapping
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

    // Step 4: Results
    const [statsResult, setStatsResult] = useState<any>(null);

    /* ── Step helpers ── */

    const stepsMeta = [
        { s: 1, icon: 'upload_file', title: t('Upload File', 'تحميل الملف') },
        { s: 2, icon: 'category', title: t('Define Scales', 'تعريف المقاييس') },
        { s: 3, icon: 'table_chart', title: t('Map Columns', 'ربط الأعمدة') },
        { s: 4, icon: 'analytics', title: t('Results', 'النتائج') },
    ];

    /* ──────────────────────────────────────────────────────── */
    /*  STEP 1 — File Upload                                   */
    /* ──────────────────────────────────────────────────────── */

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const data = await parseExcelOrCsv(file);
            setHeaders(data.headers);
            setRows(data.rows);
            setFileName(file.name);

            // Pre-classify columns
            const configs: ColumnConfig[] = data.headers.map((h) => {
                const guess = guessColumnClassification(h);
                let cat: ColumnCategory = 'scale_statement';
                if (guess === 'metadata_id') cat = 'metadata_id';
                else if (guess === 'metadata_time') cat = 'metadata_time';
                else if (guess === 'demographic') cat = 'demographic_cat';
                return { name: h, category: cat };
            });
            setColumnConfigs(configs);
            setStep(2);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(t('Failed to parse file. Please upload a valid CSV or Excel file.', 'فشل تحليل الملف. يرجى تحميل ملف Excel أو CSV صالح.'));
        } finally {
            setIsLoading(false);
        }
    };

    /* ──────────────────────────────────────────────────────── */
    /*  STEP 2 — Define Scales & Dimensions                    */
    /* ──────────────────────────────────────────────────────── */

    const addScale = () => {
        const name = newScaleName.trim();
        if (!name) return;
        const id = `s_${Date.now()}`;
        const defaultDim: DimensionConfig = { id: `d_${Date.now()}`, name: t('General', 'عام') };
        setScales((prev) => [...prev, { id, name, minScore: 1, maxScore: 5, dimensions: [defaultDim] }]);
        setNewScaleName('');
    };

    const removeScale = (scaleId: string) => {
        setScales((prev) => prev.filter((s) => s.id !== scaleId));
        // Clear any column configs pointing to this scale
        setColumnConfigs((prev) =>
            prev.map((c) =>
                c.scaleId === scaleId ? { ...c, scaleId: undefined, dimensionId: undefined, isReversed: false } : c
            )
        );
    };

    const addDimension = (scaleId: string) => {
        const name = newDimInputs[scaleId]?.trim();
        if (!name) return;
        const dimId = `d_${Date.now()}`;
        setScales((prev) =>
            prev.map((s) => {
                if (s.id !== scaleId) return s;
                if (s.dimensions.some((d) => d.name === name)) return s;
                return { ...s, dimensions: [...s.dimensions, { id: dimId, name }] };
            })
        );
        setNewDimInputs((prev) => ({ ...prev, [scaleId]: '' }));
    };

    const removeDimension = (scaleId: string, dimId: string) => {
        setScales((prev) =>
            prev.map((s) => {
                if (s.id !== scaleId) return s;
                if (s.dimensions.length <= 1) return s; // keep at least one
                return { ...s, dimensions: s.dimensions.filter((d) => d.id !== dimId) };
            })
        );
    };

    const updateScaleField = (scaleId: string, field: 'minScore' | 'maxScore', value: number) => {
        setScales((prev) => prev.map((s) => (s.id === scaleId ? { ...s, [field]: value } : s)));
    };

    /* ──────────────────────────────────────────────────────── */
    /*  STEP 3 — Column Mapping helpers                        */
    /* ──────────────────────────────────────────────────────── */

    const updateColumn = (index: number, patch: Partial<ColumnConfig>) => {
        setColumnConfigs((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            // When category changes away from scale_statement, clear scale fields
            if (patch.category && patch.category !== 'scale_statement') {
                next[index].scaleId = undefined;
                next[index].dimensionId = undefined;
                next[index].isReversed = false;
            }
            // When scale changes, auto-set first dimension
            if (patch.scaleId) {
                const scale = scales.find((s) => s.id === patch.scaleId);
                if (scale && scale.dimensions.length > 0) {
                    next[index].dimensionId = scale.dimensions[0].id;
                }
            }
            return next;
        });
    };

    const getCategoryLabel = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return t('Scale Statement', 'عبارة مقياس');
            case 'demographic_cat': return t('Demographic (Category)', 'ديموغرافي (فئات)');
            case 'demographic_cont': return t('Demographic (Numeric)', 'ديموغرافي (رقمي)');
            case 'metadata_id': return t('ID / Serial', 'معرّف / تسلسل');
            case 'metadata_time': return t('Date / Timestamp', 'تاريخ / طابع زمني');
            case 'ignore': return t('Ignore', 'تجاهل');
        }
    };

    const getCategoryColor = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
            case 'demographic_cat': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
            case 'demographic_cont': return 'text-violet-400 bg-violet-500/10 border-violet-500/30';
            case 'metadata_id': return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
            case 'metadata_time': return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
            case 'ignore': return 'text-slate-600 bg-slate-800/50 border-slate-700/30';
        }
    };

    /* ──────────────────────────────────────────────────────── */
    /*  STEP 4 — Run calculations                              */
    /* ──────────────────────────────────────────────────────── */

    const calculateReports = () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            // Build scale reports
            const scaleReports = scales
                .filter((scale) => columnConfigs.some((c) => c.category === 'scale_statement' && c.scaleId === scale.id))
                .map((scale) => {
                    const scaleCols = columnConfigs.filter(
                        (c) => c.category === 'scale_statement' && c.scaleId === scale.id
                    );

                    const statements = scaleCols.map((col) => ({
                        id: col.name,
                        text: col.name,
                        dimensionId: col.dimensionId || scale.dimensions[0]?.id,
                        dimensionName:
                            scale.dimensions.find((d) => d.id === col.dimensionId)?.name ||
                            scale.dimensions[0]?.name ||
                            '—',
                        isReversed: !!col.isReversed,
                    }));

                    const matrix: number[][] = [];
                    let straightLinersCount = 0;
                    let patternCount = 0;

                    rows.forEach((row) => {
                        const rowScores: number[] = [];
                        let hasAny = false;
                        statements.forEach((stmt) => {
                            let score = Number(row[stmt.id]);
                            if (isNaN(score)) score = 0;
                            if (score > 0) hasAny = true;
                            if (stmt.isReversed && score > 0) {
                                score = reverseScore(score, scale.minScore, scale.maxScore);
                            }
                            rowScores.push(score);
                        });
                        if (hasAny) {
                            matrix.push(rowScores);
                            if (hasStraightLining(rowScores)) straightLinersCount++;
                            if (hasPatternedResponses(rowScores)) patternCount++;
                        }
                    });

                    const totalScores = matrix.map((r) => r.reduce((a, b) => a + b, 0));
                    const alpha = cronbachAlpha(matrix);

                    const statementStats = statements.map((stmt, idx) => {
                        const col = matrix.map((r) => r[idx]);
                        return { ...stmt, mean: mean(col), std: stddev(col) };
                    });

                    const dimensionStats = scale.dimensions.map((dim) => {
                        const dimIdxs = statements
                            .map((s, i) => (s.dimensionId === dim.id ? i : -1))
                            .filter((i) => i !== -1);
                        const dimMatrix = matrix.map((r) => dimIdxs.map((i) => r[i]));
                        const dimTotals = dimMatrix.map((r) => r.reduce((a, b) => a + b, 0));
                        return {
                            id: dim.id,
                            name: dim.name,
                            itemCount: dimIdxs.length,
                            mean: mean(dimTotals),
                            std: stddev(dimTotals),
                            alpha: dimMatrix[0]?.length >= 2 ? cronbachAlpha(dimMatrix) : null,
                        };
                    });

                    return {
                        scaleId: scale.id,
                        name: scale.name,
                        sampleSize: matrix.length,
                        mean: mean(totalScores),
                        std: stddev(totalScores),
                        alpha,
                        statements: statementStats,
                        dimensions: dimensionStats,
                        straightLinersCount,
                        patternCount,
                    };
                });

            // Demographic summary
            const demoCols = columnConfigs.filter(
                (c) => c.category === 'demographic_cat' || c.category === 'demographic_cont'
            );
            const demographicReports = demoCols.map((col) => {
                const distribution: Record<string, number> = {};
                const values: number[] = [];
                rows.forEach((row) => {
                    const val = row[col.name];
                    if (val !== undefined && val !== null && val !== '') {
                        const s = String(val).trim();
                        distribution[s] = (distribution[s] || 0) + 1;
                        if (col.category === 'demographic_cont') {
                            const n = Number(val);
                            if (!isNaN(n)) values.push(n);
                        }
                    }
                });
                let continuousStats = null;
                if (col.category === 'demographic_cont' && values.length > 0) {
                    continuousStats = {
                        mean: mean(values),
                        std: stddev(values),
                        min: Math.min(...values),
                        max: Math.max(...values),
                    };
                }
                return { name: col.name, type: col.category, distribution, continuousStats };
            });

            setStatsResult({ totalRows: rows.length, scales: scaleReports, demographics: demographicReports });
            setStep(4);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(
                t(
                    'An error occurred during calculations. Check your scoring values.',
                    'حدث خطأ أثناء إجراء العمليات الحسابية. يرجى مراجعة قيم الدرجات.'
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    /* ──────────────────────────────────────────────────────── */
    /*  RENDER                                                  */
    /* ──────────────────────────────────────────────────────── */

    return (
        <div className="w-full">
            {/* ── Stepper ── */}
            <div className="flex justify-between items-center mb-10 max-w-3xl mx-auto">
                {stepsMeta.map((item, idx) => (
                    <div key={item.s} className="flex items-center gap-0 flex-1">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                                    step === item.s
                                        ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-110'
                                        : step > item.s
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'bg-slate-800/80 text-slate-500'
                                }`}
                            >
                                {step > item.s ? (
                                    <span className="material-symbols-outlined text-lg">check</span>
                                ) : (
                                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                )}
                            </div>
                            <span
                                className={`text-xs font-semibold text-center transition-colors ${
                                    step === item.s ? 'text-cyan-400' : step > item.s ? 'text-emerald-400' : 'text-slate-600'
                                }`}
                            >
                                {item.title}
                            </span>
                        </div>
                        {idx < stepsMeta.length - 1 && (
                            <div className="flex-1 mx-2 mt-[-20px]">
                                <div
                                    className={`h-0.5 rounded transition-colors duration-500 ${
                                        step > item.s ? 'bg-emerald-500' : 'bg-slate-800'
                                    }`}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Error */}
            {errorMessage && (
                <div className="mb-6 max-w-4xl mx-auto p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400">error</span>
                    {errorMessage}
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/*  STEP 1 — Upload File                          */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 1 && (
                <div className="max-w-xl mx-auto">
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <div className="text-center py-16 px-6">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-cyan-400 animate-bounce">
                                    upload_file
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {t('Upload Your Research Data', 'تحميل بيانات البحث')}
                            </h2>
                            <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                                {t(
                                    'Upload your Excel (.xlsx, .xls) or CSV file. The first row should contain the column headers (question texts, demographic labels, etc.).',
                                    'قم بتحميل ملف Excel أو CSV. يجب أن يحتوي الصف الأول على عناوين الأعمدة (نصوص العبارات، تسميات المتغيرات الديموغرافية، إلخ).'
                                )}
                            </p>
                            <label className="futuristic-btn-primary px-8 py-4 inline-flex items-center gap-2 cursor-pointer transition-transform duration-200 hover:scale-105 text-base font-semibold">
                                <span className="material-symbols-outlined">attach_file</span>
                                {t('Select File', 'اختر الملف')}
                                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={isLoading} />
                            </label>
                            {isLoading && (
                                <div className="mt-6 flex justify-center items-center gap-2 text-slate-400 text-sm">
                                    <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                    {t('Reading spreadsheet...', 'جاري قراءة ورقة البيانات...')}
                                </div>
                            )}
                        </div>
                    </FuturisticPanel>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/*  STEP 2 — Define Scales & Dimensions            */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 2 && (
                <div className="max-w-4xl mx-auto">
                    {/* File info badge */}
                    <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="material-symbols-outlined text-emerald-400">description</span>
                        <div>
                            <span className="text-white text-sm font-semibold">{fileName}</span>
                            <span className="text-slate-500 text-xs mx-2">•</span>
                            <span className="text-slate-400 text-xs">
                                {headers.length} {t('columns', 'أعمدة')} • {rows.length} {t('rows', 'صفوف')}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {t('Define Your Research Scales', 'عرّف مقاييس البحث')}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {t(
                                    'Create each scale used in your research, add its dimensions/subscales, and set the scoring range. You\'ll map columns to these in the next step.',
                                    'أنشئ كل مقياس مستخدم في بحثك، أضف أبعاده/مقاييسه الفرعية، وحدد نطاق الدرجات. ستقوم بربط الأعمدة بها في الخطوة التالية.'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Add scale form */}
                    <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
                        <div className="flex gap-3 items-center">
                            <span className="material-symbols-outlined text-cyan-400">add_circle</span>
                            <input
                                type="text"
                                value={newScaleName}
                                onChange={(e) => setNewScaleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addScale()}
                                placeholder={t('Enter scale name (e.g., Job Satisfaction Scale)', 'أدخل اسم المقياس (مثال: مقياس الرضا الوظيفي)')}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                            />
                            <button onClick={addScale} className="futuristic-btn-primary px-6 py-2.5 flex items-center gap-2" disabled={!newScaleName.trim()}>
                                <span className="material-symbols-outlined text-sm">add</span>
                                {t('Add Scale', 'إضافة مقياس')}
                            </button>
                        </div>
                    </div>

                    {/* Scales list */}
                    {scales.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-xl">
                            <span className="material-symbols-outlined text-4xl text-slate-700 mb-3">psychology</span>
                            <p className="text-slate-500 text-sm">{t('No scales defined yet. Add your first scale above.', 'لا توجد مقاييس بعد. أضف أول مقياس أعلاه.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {scales.map((scale) => (
                                <div key={scale.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                                    {/* Scale header */}
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-cyan-400 text-xl">assessment</span>
                                            {scale.name}
                                        </h4>
                                        <div className="flex items-center gap-4">
                                            <div className="flex gap-3 items-center text-xs">
                                                <label className="text-slate-400 flex items-center gap-1.5">
                                                    {t('Min:', 'أدنى:')}
                                                    <input
                                                        type="number"
                                                        value={scale.minScore}
                                                        onChange={(e) => updateScaleField(scale.id, 'minScore', Number(e.target.value))}
                                                        className="w-14 bg-slate-800 border border-slate-700 rounded py-1 px-2 text-center text-white text-xs focus:outline-none focus:border-cyan-500"
                                                    />
                                                </label>
                                                <label className="text-slate-400 flex items-center gap-1.5">
                                                    {t('Max:', 'أقصى:')}
                                                    <input
                                                        type="number"
                                                        value={scale.maxScore}
                                                        onChange={(e) => updateScaleField(scale.id, 'maxScore', Number(e.target.value))}
                                                        className="w-14 bg-slate-800 border border-slate-700 rounded py-1 px-2 text-center text-white text-xs focus:outline-none focus:border-cyan-500"
                                                    />
                                                </label>
                                            </div>
                                            <button
                                                onClick={() => removeScale(scale.id)}
                                                className="text-red-400/60 hover:text-red-400 transition-colors"
                                                title={t('Remove Scale', 'حذف المقياس')}
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Dimensions */}
                                    <div className="bg-slate-950/40 rounded-lg p-4">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">account_tree</span>
                                            {t('Dimensions / Subscales', 'الأبعاد / المقاييس الفرعية')}
                                        </h5>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {scale.dimensions.map((dim) => (
                                                <span
                                                    key={dim.id}
                                                    className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full text-xs text-slate-300 group"
                                                >
                                                    {dim.name}
                                                    {scale.dimensions.length > 1 && (
                                                        <button
                                                            onClick={() => removeDimension(scale.id, dim.id)}
                                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">close</span>
                                                        </button>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newDimInputs[scale.id] || ''}
                                                onChange={(e) => setNewDimInputs((prev) => ({ ...prev, [scale.id]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && addDimension(scale.id)}
                                                placeholder={t('New dimension name...', 'اسم البُعد الجديد...')}
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
                                            />
                                            <button onClick={() => addDimension(scale.id)} className="futuristic-btn px-4 py-1.5 text-xs">
                                                {t('Add Dimension', 'إضافة بُعد')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
                        <button onClick={() => setStep(1)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back', 'رجوع')}
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            disabled={scales.length === 0}
                            className="futuristic-btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('Next: Map Columns', 'التالي: ربط الأعمدة')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/*  STEP 3 — Map Columns (Table View)             */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 3 && (
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {t('Map Spreadsheet Columns', 'ربط أعمدة البيانات')}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {t(
                                    'Classify each column and assign scale statements to their scales, dimensions, and mark reversed items.',
                                    'صنّف كل عمود واربط عبارات المقياس بمقاييسها وأبعادها وحدّد العبارات العكسية.'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Summary chips */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        {scales.map((s) => {
                            const count = columnConfigs.filter((c) => c.category === 'scale_statement' && c.scaleId === s.id).length;
                            return (
                                <span key={s.id} className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                                    <span className="material-symbols-outlined text-sm">assessment</span>
                                    {s.name}: {count} {t('items', 'عبارات')}
                                </span>
                            );
                        })}
                    </div>

                    {/* The Table */}
                    <div className="rounded-xl border border-slate-800 overflow-hidden backdrop-blur-md bg-slate-900/40">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800">
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-12">#</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start min-w-[200px]">
                                            {t('Column Header', 'عنوان العمود')}
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-start min-w-[120px]">
                                            {t('Sample Data', 'عينة بيانات')}
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center min-w-[170px]">
                                            {t('Category', 'التصنيف')}
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center min-w-[150px]">
                                            {t('Scale', 'المقياس')}
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center min-w-[150px]">
                                            {t('Dimension', 'البُعد')}
                                        </th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-20">
                                            {t('Reversed', 'عكسية')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {columnConfigs.map((col, idx) => {
                                        const isScale = col.category === 'scale_statement';
                                        const isIgnored = col.category === 'ignore';
                                        const selectedScale = scales.find((s) => s.id === col.scaleId);

                                        return (
                                            <tr
                                                key={col.name}
                                                className={`transition-colors duration-200 ${
                                                    isIgnored ? 'opacity-40' : 'hover:bg-slate-800/30'
                                                }`}
                                            >
                                                {/* Row # */}
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-mono">{idx + 1}</td>

                                                {/* Column header */}
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-white text-sm truncate max-w-[300px]" title={col.name}>
                                                        {col.name}
                                                    </div>
                                                </td>

                                                {/* Sample data */}
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-500 font-mono truncate block max-w-[150px]" title={rows.slice(0, 3).map((r) => r[col.name]).join(', ')}>
                                                        {rows.slice(0, 2).map((r) => r[col.name] ?? '—').join(', ')}
                                                    </span>
                                                </td>

                                                {/* Category selector */}
                                                <td className="px-4 py-3 text-center">
                                                    <select
                                                        value={col.category}
                                                        onChange={(e) => updateColumn(idx, { category: e.target.value as ColumnCategory })}
                                                        className={`w-full rounded-lg py-1.5 px-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer ${getCategoryColor(col.category)} bg-opacity-50`}
                                                    >
                                                        <option value="scale_statement">{getCategoryLabel('scale_statement')}</option>
                                                        <option value="demographic_cat">{getCategoryLabel('demographic_cat')}</option>
                                                        <option value="demographic_cont">{getCategoryLabel('demographic_cont')}</option>
                                                        <option value="metadata_id">{getCategoryLabel('metadata_id')}</option>
                                                        <option value="metadata_time">{getCategoryLabel('metadata_time')}</option>
                                                        <option value="ignore">{getCategoryLabel('ignore')}</option>
                                                    </select>
                                                </td>

                                                {/* Scale selector */}
                                                <td className="px-4 py-3 text-center">
                                                    {isScale ? (
                                                        <select
                                                            value={col.scaleId || ''}
                                                            onChange={(e) => updateColumn(idx, { scaleId: e.target.value })}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                                        >
                                                            <option value="">-- {t('Select', 'اختر')} --</option>
                                                            {scales.map((s) => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-slate-700 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Dimension selector */}
                                                <td className="px-4 py-3 text-center">
                                                    {isScale && selectedScale ? (
                                                        <select
                                                            value={col.dimensionId || ''}
                                                            onChange={(e) => updateColumn(idx, { dimensionId: e.target.value })}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                                        >
                                                            {selectedScale.dimensions.map((d) => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-slate-700 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Reversed toggle */}
                                                <td className="px-4 py-3 text-center">
                                                    {isScale ? (
                                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!col.isReversed}
                                                                onChange={(e) => updateColumn(idx, { isReversed: e.target.checked })}
                                                                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                                                            />
                                                        </label>
                                                    ) : (
                                                        <span className="text-slate-700 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
                        <button onClick={() => setStep(2)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back: Edit Scales', 'رجوع: تعديل المقاييس')}
                        </button>
                        <button
                            onClick={calculateReports}
                            disabled={isLoading || !columnConfigs.some((c) => c.category === 'scale_statement' && c.scaleId)}
                            className="futuristic-btn-primary px-8 py-3 flex items-center gap-2 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined">analytics</span>
                            )}
                            {t('Generate Report', 'إصدار التقرير')}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/*  STEP 4 — Results                               */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 4 && statsResult && (
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white">
                                {t('Statistical Analysis Results', 'نتائج التحليل الإحصائي')}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {t('Reliability validation and data diagnostics.', 'نتائج المصداقية وتشخيص البيانات.')}
                            </p>
                        </div>
                        <button onClick={() => setStep(3)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">settings_backup_restore</span>
                            {t('Modify Configuration', 'تعديل الإعدادات')}
                        </button>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">{t('Total Respondents', 'إجمالي المستجيبين')}</span>
                            <div className="text-4xl font-extrabold text-cyan-400 mt-2">{statsResult.totalRows}</div>
                        </div>
                        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">{t('Mapped Scales', 'المقاييس المربوطة')}</span>
                            <div className="text-4xl font-extrabold text-emerald-400 mt-2">{statsResult.scales.length}</div>
                        </div>
                        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                            <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">{t('Demographic Variables', 'المتغيرات الديموغرافية')}</span>
                            <div className="text-4xl font-extrabold text-purple-400 mt-2">{statsResult.demographics.length}</div>
                        </div>
                    </div>

                    {/* Scale reports */}
                    <div className="space-y-8 mb-8">
                        {statsResult.scales.map((scale: any) => (
                            <div key={scale.scaleId} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                                <div className="border-b border-slate-800 pb-4 mb-6">
                                    <h3 className="font-extrabold text-white text-xl mb-1">{scale.name}</h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                        <div>{t('Sample: ', 'العينة: ')}<span className="text-white font-semibold">{scale.sampleSize}</span></div>
                                        <div>
                                            {t('Cronbach\'s α: ', 'ثبات ألفا كرونباخ: ')}
                                            <span className={`font-bold ${scale.alpha >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {scale.alpha.toFixed(3)}
                                            </span>
                                        </div>
                                        <div>{t('Mean: ', 'المتوسط: ')}<span className="text-white font-semibold">{scale.mean.toFixed(2)}</span></div>
                                        <div>{t('SD: ', 'الانحراف: ')}<span className="text-white font-semibold">{scale.std.toFixed(2)}</span></div>
                                    </div>
                                </div>

                                {/* Anomaly alert */}
                                {(scale.straightLinersCount > 0 || scale.patternCount > 0) && (
                                    <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                                        <h5 className="font-bold flex items-center gap-1.5 mb-1.5">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            {t('Data Cleaning Alerts', 'تنبيهات تنظيف البيانات')}
                                        </h5>
                                        {scale.straightLinersCount > 0 && (
                                            <p>• {scale.straightLinersCount} {t('straight-lining respondents', 'مشاركون بأنماط متطابقة')}</p>
                                        )}
                                        {scale.patternCount > 0 && (
                                            <p>• {scale.patternCount} {t('patterned response respondents', 'مشاركون بأنماط متتابعة')}</p>
                                        )}
                                    </div>
                                )}

                                {/* Dimensions grid */}
                                {scale.dimensions.filter((d: any) => d.itemCount > 0).length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm text-cyan-400">account_tree</span>
                                            {t('Dimensions Analysis', 'تحليل الأبعاد')}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {scale.dimensions.filter((d: any) => d.itemCount > 0).map((dim: any) => (
                                                <div key={dim.id} className="p-4 rounded-lg bg-slate-950/40 border border-slate-800">
                                                    <div className="font-bold text-white text-sm mb-2">{dim.name}</div>
                                                    <div className="space-y-1 text-xs text-slate-400">
                                                        <div className="flex justify-between"><span>{t('Items:', 'العبارات:')}</span><span className="text-white font-mono">{dim.itemCount}</span></div>
                                                        <div className="flex justify-between"><span>{t('Mean:', 'المتوسط:')}</span><span className="text-white font-mono">{dim.mean.toFixed(2)}</span></div>
                                                        <div className="flex justify-between"><span>{t('SD:', 'الانحراف:')}</span><span className="text-white font-mono">{dim.std.toFixed(2)}</span></div>
                                                        {dim.alpha !== null && (
                                                            <div className="flex justify-between">
                                                                <span>α:</span>
                                                                <span className={`font-bold font-mono ${dim.alpha >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>{dim.alpha.toFixed(3)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Items table */}
                                <div>
                                    <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-cyan-400">format_list_numbered</span>
                                        {t('Item-Level Statistics', 'إحصاءات مستوى العبارة')}
                                    </h4>
                                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-950/60 text-xs font-bold text-slate-400 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-start">#</th>
                                                    <th className="px-4 py-2.5 text-start">{t('Statement', 'العبارة')}</th>
                                                    <th className="px-4 py-2.5 text-center">{t('Dimension', 'البُعد')}</th>
                                                    <th className="px-4 py-2.5 text-center">{t('Key', 'المفتاح')}</th>
                                                    <th className="px-4 py-2.5 text-center">{t('Mean', 'المتوسط')}</th>
                                                    <th className="px-4 py-2.5 text-center">{t('SD', 'الانحراف')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {scale.statements.map((stmt: any, i: number) => (
                                                    <tr key={stmt.id} className="hover:bg-slate-800/20">
                                                        <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{i + 1}</td>
                                                        <td className="px-4 py-2.5 text-white font-semibold truncate max-w-xs">{stmt.text}</td>
                                                        <td className="px-4 py-2.5 text-center text-xs text-slate-400">{stmt.dimensionName}</td>
                                                        <td className="px-4 py-2.5 text-center text-xs">
                                                            {stmt.isReversed ? (
                                                                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-bold">
                                                                    {t('R', 'ع')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-600">+</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center font-mono text-white">{stmt.mean.toFixed(2)}</td>
                                                        <td className="px-4 py-2.5 text-center font-mono text-slate-400">{stmt.std.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Demographic Summary */}
                    {statsResult.demographics.length > 0 && (
                        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                            <h3 className="font-extrabold text-white text-xl mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">groups</span>
                                {t('Demographics Summary', 'ملخص الخصائص الديموغرافية')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {statsResult.demographics.map((demo: any) => (
                                    <div key={demo.name} className="p-4 rounded-lg bg-slate-950/40 border border-slate-800">
                                        <div className="font-bold text-white text-sm mb-3 border-b border-slate-800/80 pb-2">{demo.name}</div>
                                        {demo.continuousStats ? (
                                            <div className="space-y-1.5 text-xs text-slate-400">
                                                <div className="flex justify-between"><span>{t('Mean:', 'المتوسط:')}</span><span className="text-white font-mono">{demo.continuousStats.mean.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>{t('SD:', 'الانحراف:')}</span><span className="text-slate-300 font-mono">{demo.continuousStats.std.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>{t('Min/Max:', 'الأدنى/الأقصى:')}</span><span className="text-slate-300 font-mono">{demo.continuousStats.min} / {demo.continuousStats.max}</span></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {Object.entries(demo.distribution).map(([label, count]: any) => {
                                                    const pct = ((count / statsResult.totalRows) * 100).toFixed(1);
                                                    return (
                                                        <div key={label} className="text-xs">
                                                            <div className="flex justify-between text-slate-300 mb-1">
                                                                <span className="font-semibold">{label}</span>
                                                                <span className="text-slate-400">{count} ({pct}%)</span>
                                                            </div>
                                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
