'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { FuturisticPanel } from '@njaz/ui-components';
import { parseExcelOrCsv, guessColumnClassification } from '@/lib/excel-utils';
import { saveScale, saveSurvey, saveResponse } from '@/lib/storage';

/* ─────────── Types ─────────── */

interface DimensionConfig {
    id: string;
    name: string;
}

interface ChoiceScoreMapping {
    isIncluded: boolean;
    score: number;
    oppositeScore: number;
}

interface ScaleConfig {
    id: string;
    name: string;
    dimensions: DimensionConfig[];
    choiceMappings: Record<string, ChoiceScoreMapping>;
}

interface DemographicConfig {
    id: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'date';
    required: boolean;
    options: string[];
}

type ColumnCategory = 'scale_statement' | 'demographic' | 'metadata_id' | 'metadata_time' | 'ignore';

interface ColumnConfig {
    name: string;
    category: ColumnCategory;
    scaleId?: string;
    dimensionId?: string;
    demographicFieldId?: string;
    isReversed?: boolean;
}

/* ─────────── Component ─────────── */

export function ImportWizard() {
    const { t, direction } = useLanguage();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [saveProgress, setSaveProgress] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');

    // Step 1: Raw sheet data
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [uniqueSheetValues, setUniqueSheetValues] = useState<string[]>([]);

    // Step 2: Survey Details & Demographics
    const [surveyTitle, setSurveyTitle] = useState('');
    const [surveyLanguage, setSurveyLanguage] = useState<'ar' | 'en'>('ar');
    const [demographics, setDemographics] = useState<DemographicConfig[]>([]);
    const [newDemoLabel, setNewDemoLabel] = useState('');
    const [newDemoType, setNewDemoType] = useState<'text' | 'select' | 'number' | 'date'>('text');

    // Step 3: Scales & Choice Mapping
    const [scales, setScales] = useState<ScaleConfig[]>([]);
    const [newScaleName, setNewScaleName] = useState('');
    const [newDimInputs, setNewDimInputs] = useState<Record<string, string>>({});

    // Step 4: Column mapping
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);

    /* ── Step Helpers & Parsers ── */

    const stepsMeta = [
        { s: 1, icon: 'upload_file', title: t('Upload File', 'تحميل الملف') },
        { s: 2, icon: 'info', title: t('Survey & Demographics', 'الاستبيان والديموغرافيا') },
        { s: 3, icon: 'category', title: t('Scales & Scores', 'المقاييس والدرجات') },
        { s: 4, icon: 'table_chart', title: t('Map Columns', 'ربط الأعمدة') },
        { s: 5, icon: 'cloud_upload', title: t('Save & Import', 'حفظ واستيراد') },
    ];

    const scanUniqueValues = (parsedRows: Record<string, any>[]): string[] => {
        const uniqueSet = new Set<string>();
        parsedRows.forEach((row) => {
            Object.values(row).forEach((val) => {
                if (val !== null && val !== undefined) {
                    const str = String(val).trim();
                    // Ignore empty, purely numeric, or common date formats to get scale choices
                    if (str && isNaN(Number(str)) && str.length < 50) {
                        uniqueSet.add(str);
                    }
                }
            });
        });
        return Array.from(uniqueSet);
    };

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

            // Auto-extract unique sheet values
            const uniques = scanUniqueValues(data.rows);
            setUniqueSheetValues(uniques);

            // Set default survey title from filename
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            setSurveyTitle(cleanTitle);

            // Pre-classify columns
            const configs: ColumnConfig[] = data.headers.map((h) => {
                const guess = guessColumnClassification(h);
                let cat: ColumnCategory = 'scale_statement';
                if (guess === 'metadata_id') cat = 'metadata_id';
                else if (guess === 'metadata_time') cat = 'metadata_time';
                else if (guess === 'demographic') cat = 'demographic';
                return { name: h, category: cat };
            });
            setColumnConfigs(configs);

            // Add guessed demographics automatically
            const guessedDemos: DemographicConfig[] = [];
            configs.forEach((c) => {
                if (c.category === 'demographic') {
                    const id = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    guessedDemos.push({
                        id,
                        label: c.name,
                        type: c.name.toLowerCase().includes('age') || c.name.includes('عمر') ? 'number' : 'select',
                        required: false,
                        options: []
                    });
                }
            });
            setDemographics(guessedDemos);

            setStep(2);
        } catch (err: any) {
            console.error(err);
            setErrorMessage(t('Failed to parse file. Please upload a valid CSV or Excel file.', 'فشل تحليل الملف. يرجى تحميل ملف Excel أو CSV صالح.'));
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Step 2 Functions ── */

    const addDemographic = () => {
        const label = newDemoLabel.trim();
        if (!label) return;
        const id = `demo_${Date.now()}`;
        setDemographics((prev) => [
            ...prev,
            { id, label, type: newDemoType, required: false, options: [] }
        ]);
        setNewDemoLabel('');
    };

    const removeDemographic = (id: string) => {
        setDemographics((prev) => prev.filter((d) => d.id !== id));
        // Clear mapping from columns
        setColumnConfigs((prev) =>
            prev.map((c) => (c.demographicFieldId === id ? { ...c, demographicFieldId: undefined } : c))
        );
    };

    /* ── Step 3 Functions ── */

    const addScale = () => {
        const name = newScaleName.trim();
        if (!name) return;
        const id = `scale_${Date.now()}`;
        const defaultDim: DimensionConfig = { id: `dim_${Date.now()}`, name: t('General', 'عام') };

        // Guess Likert score mappings for scanned unique sheet values
        const mappings: Record<string, ChoiceScoreMapping> = {};
        uniqueSheetValues.forEach((val) => {
            let defaultScore = 0;
            let defaultOpp = 0;
            const lower = val.toLowerCase();
            if (lower.includes('strongly agree') || (lower.includes('بشدة') && lower.includes('موافق'))) {
                defaultScore = 5; defaultOpp = 1;
            } else if (lower.includes('agree') || lower.includes('موافق')) {
                defaultScore = 4; defaultOpp = 2;
            } else if (lower.includes('neutral') || lower.includes('محايد')) {
                defaultScore = 3; defaultOpp = 3;
            } else if (lower.includes('strongly disagree') || (lower.includes('بشدة') && lower.includes('معارض'))) {
                defaultScore = 1; defaultOpp = 5;
            } else if (lower.includes('disagree') || lower.includes('معارض') || lower.includes('غير موافق')) {
                defaultScore = 2; defaultOpp = 4;
            } else if (lower === 'yes' || lower === 'نعم') {
                defaultScore = 2; defaultOpp = 1;
            } else if (lower === 'no' || lower === 'لا') {
                defaultScore = 1; defaultOpp = 2;
            }

            mappings[val] = {
                isIncluded: defaultScore > 0,
                score: defaultScore || 1,
                oppositeScore: defaultOpp || 1,
            };
        });

        setScales((prev) => [...prev, { id, name, dimensions: [defaultDim], choiceMappings: mappings }]);
        setNewScaleName('');
    };

    const removeScale = (scaleId: string) => {
        setScales((prev) => prev.filter((s) => s.id !== scaleId));
        setColumnConfigs((prev) =>
            prev.map((c) =>
                c.scaleId === scaleId ? { ...c, scaleId: undefined, dimensionId: undefined, isReversed: false } : c
            )
        );
    };

    const addDimension = (scaleId: string) => {
        const name = newDimInputs[scaleId]?.trim();
        if (!name) return;
        const dimId = `dim_${Date.now()}`;
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
                if (s.dimensions.length <= 1) return s;
                return { ...s, dimensions: s.dimensions.filter((d) => d.id !== dimId) };
            })
        );
    };

    const updateChoiceMapping = (
        scaleId: string,
        value: string,
        field: keyof ChoiceScoreMapping,
        val: any
    ) => {
        setScales((prev) =>
            prev.map((s) => {
                if (s.id !== scaleId) return s;
                return {
                    ...s,
                    choiceMappings: {
                        ...s.choiceMappings,
                        [value]: {
                            ...s.choiceMappings[value],
                            [field]: val,
                        },
                    },
                };
            })
        );
    };

    /* ── Step 4 Functions ── */

    const updateColumn = (index: number, patch: Partial<ColumnConfig>) => {
        setColumnConfigs((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };

            if (patch.category) {
                if (patch.category !== 'scale_statement') {
                    next[index].scaleId = undefined;
                    next[index].dimensionId = undefined;
                    next[index].isReversed = false;
                }
                if (patch.category !== 'demographic') {
                    next[index].demographicFieldId = undefined;
                }
            }

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
            case 'demographic': return t('Demographic Field', 'متغير ديموغرافي');
            case 'metadata_id': return t('ID / Serial', 'معرّف / تسلسل');
            case 'metadata_time': return t('Date / Timestamp', 'تاريخ / طابع زمني');
            case 'ignore': return t('Ignore', 'تجاهل');
        }
    };

    const getCategoryColor = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return 'text-cyan-400 bg-slate-900 border-cyan-500/40';
            case 'demographic': return 'text-purple-400 bg-slate-900 border-purple-500/40';
            case 'metadata_id': return 'text-amber-400 bg-slate-900 border-amber-500/40';
            case 'metadata_time': return 'text-emerald-400 bg-slate-900 border-emerald-500/40';
            case 'ignore': return 'text-slate-500 bg-slate-900 border-slate-800';
        }
    };

    /* ── Step 5: Save & Import ── */

    const handleImport = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            // 1. Save scales to backend database
            const savedScaleIds: string[] = [];
            const scaleStatementMap: Record<string, { scaleId: string; statementId: string; columnName: string; isReversed: boolean }> = {};

            setSaveProgress(t('Creating psychometric scales...', 'جاري إنشاء المقاييس النفسية...'));

            for (const scale of scales) {
                // Statements belonging to this scale from column configuration
                const scaleCols = columnConfigs.filter(
                    (c) => c.category === 'scale_statement' && c.scaleId === scale.id
                );

                const statements = scaleCols.map((col, index) => {
                    const stmtId = `stmt_${scale.id}_${index}`;
                    scaleStatementMap[col.name] = {
                        scaleId: scale.id,
                        statementId: stmtId,
                        columnName: col.name,
                        isReversed: !!col.isReversed
                    };
                    return {
                        id: stmtId,
                        text: col.name,
                        isReversed: false, // pre-reversed in saved response data to avoid double scoring
                        dimensionId: col.dimensionId || scale.dimensions[0]?.id
                    };
                });

                const scaleOptions = Object.entries(scale.choiceMappings)
                    .filter(([_, mapping]) => mapping.isIncluded)
                    .map(([label, mapping], optIdx) => ({
                        id: `opt_${scale.id}_${optIdx}`,
                        label,
                        value: mapping.score
                    }));

                const payload = {
                    title: scale.name,
                    description: t('Imported scale', 'مقياس مستورد'),
                    dimensions: scale.dimensions,
                    statements,
                    options: scaleOptions,
                    isPublic: false,
                    language: surveyLanguage
                };

                const savedId = await saveScale(payload);
                savedScaleIds.push(savedId);
            }

            // 2. Save Survey
            setSaveProgress(t('Initializing survey record...', 'جاري تهيئة سجل الاستبيان...'));
            const surveyId = await saveSurvey({
                title: surveyTitle,
                language: surveyLanguage,
                introduction: t('This survey was created via spreadsheet import.', 'تم إنشاء هذا الاستبيان عن طريق استيراد جدول بيانات.'),
                isPublished: true,
                demographics: demographics.map((d) => ({
                    id: d.id,
                    label: d.label,
                    type: d.type,
                    required: d.required,
                    options: d.options
                })),
                scaleIds: savedScaleIds
            });

            // 3. Save Respondent Responses
            setSaveProgress(t('Importing respondent entries...', 'جاري استيراد مشاركات المستجيبين...'));
            
            // Loop and save responses sequentially
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                
                // Construct demographics values
                const demoVals: Record<string, any> = {};
                columnConfigs.forEach((col) => {
                    if (col.category === 'demographic' && col.demographicFieldId) {
                        demoVals[col.demographicFieldId] = row[col.name];
                    }
                });

                // Construct statement answers values
                const answers: Record<string, number> = {};
                columnConfigs.forEach((col) => {
                    if (col.category === 'scale_statement') {
                        const mappingInfo = scaleStatementMap[col.name];
                        if (mappingInfo) {
                            const scaleConfig = scales.find((s) => s.id === col.scaleId);
                            const rawValue = String(row[col.name] || '').trim();
                            const mapping = scaleConfig?.choiceMappings[rawValue];

                            if (mapping && mapping.isIncluded) {
                                // Save opposite score directly if column is marked reversed
                                answers[mappingInfo.statementId] = mappingInfo.isReversed
                                    ? mapping.oppositeScore
                                    : mapping.score;
                            } else {
                                answers[mappingInfo.statementId] = 0;
                            }
                        }
                    }
                });

                await saveResponse({
                    id: `resp_${surveyId}_${i}_${Date.now()}`,
                    surveyId,
                    submittedAt: new Date().toISOString(),
                    demographics: demoVals,
                    answers
                });
            }

            setSaveProgress(t('Redirecting to dashboard...', 'جاري التوجيه إلى لوحة التحكم...'));
            window.location.href = '/surveys';
        } catch (err: any) {
            console.error(err);
            setErrorMessage(t('Failed to save survey. Please check configuration.', 'فشل حفظ الاستبيان. يرجى التحقق من الإعدادات.'));
            setSaveProgress(null);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full" dir={direction}>
            {/* Step Indicator */}
            <div className="max-w-4xl mx-auto mb-10">
                <div className="flex items-center justify-between relative">
                    {/* Line behind steps */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-10" />

                    {stepsMeta.map((sMeta) => {
                        const isActive = step === sMeta.s;
                        const isCompleted = step > sMeta.s;
                        return (
                            <div key={sMeta.s} className="flex flex-col items-center gap-2">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                        isActive
                                            ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                            : isCompleted
                                            ? 'bg-slate-900 border-emerald-500 text-emerald-400'
                                            : 'bg-slate-950 border-slate-800 text-slate-500'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">{sMeta.icon}</span>
                                </div>
                                <span
                                    className={`text-[10px] md:text-xs font-semibold ${
                                        isActive ? 'text-cyan-400' : 'text-slate-500'
                                    }`}
                                >
                                    {sMeta.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {errorMessage}
                </div>
            )}

            {/* Save progress indicator */}
            {saveProgress && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{t('Saving Data...', 'جاري حفظ البيانات...')}</h3>
                    <p className="text-slate-400 text-sm">{saveProgress}</p>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/*  STEP 1 — File Upload                                   */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 1 && (
                <div className="max-w-2xl mx-auto py-8">
                    <FuturisticPanel glowColor="cyan" size="lg">
                        <div className="text-center py-12 px-6">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <span className="material-symbols-outlined text-4xl text-cyan-400">upload_file</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
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

            {/* ──────────────────────────────────────────────────────── */}
            {/*  STEP 2 — Survey Details & Demographics                 */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 2 && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {t('Configure Survey & Demographics', 'إعداد الاستبيان والديموغرافيا')}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {t(
                            'Define the survey name, language, and the demographic properties you want to collect and filter your report metrics by.',
                            'حدّد اسم الاستبيان، لغته، والخصائص الديموغرافية التي تريد تصفية وإصدار تقارير البحث بناءً عليها.'
                        )}
                    </p>

                    <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-6 mb-8">
                        {/* Title & Language */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {t('Survey Name', 'اسم الاستبيان')}
                                </label>
                                <input
                                    type="text"
                                    value={surveyTitle}
                                    onChange={(e) => setSurveyTitle(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    {t('Language', 'لغة الاستبيان')}
                                </label>
                                <select
                                    value={surveyLanguage}
                                    onChange={(e) => setSurveyLanguage(e.target.value as 'ar' | 'en')}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="ar">{t('Arabic', 'العربية')}</option>
                                    <option value="en">{t('English', 'الإنجليزية')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Demographics Config */}
                        <div className="bg-slate-950/40 rounded-lg p-5">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800/80 pb-2">
                                <span className="material-symbols-outlined text-purple-400">groups</span>
                                {t('Demographic Fields', 'الخصائص الديموغرافية')}
                            </h3>

                            {/* Current List */}
                            {demographics.length === 0 ? (
                                <p className="text-slate-500 text-xs py-4 text-center">
                                    {t('No demographic variables defined yet. Add fields below.', 'لا توجد متغيرات ديموغرافية بعد. أضف بعض الحقول أدناه.')}
                                </p>
                            ) : (
                                <div className="space-y-2 mb-4">
                                    {demographics.map((d) => (
                                        <div key={d.id} className="flex justify-between items-center bg-slate-800/40 border border-slate-800/80 px-4 py-2.5 rounded-lg">
                                            <div>
                                                <span className="text-white font-semibold text-sm mr-2">{d.label}</span>
                                                <span className="bg-slate-800 text-slate-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-slate-700">
                                                    {d.type}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeDemographic(d.id)}
                                                className="text-red-400/60 hover:text-red-400 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Demographic form */}
                            <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-800/50">
                                <input
                                    type="text"
                                    value={newDemoLabel}
                                    onChange={(e) => setNewDemoLabel(e.target.value)}
                                    placeholder={t('Add Demographic (e.g. Gender, Age, Education)', 'إضافة متغير ديموغرافي (مثال: الجنس، العمر، المستوى التعليمي)')}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                />
                                <select
                                    value={newDemoType}
                                    onChange={(e) => setNewDemoType(e.target.value as any)}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                >
                                    <option value="select">{t('Choice List (Dropdown)', 'قائمة خيارات')}</option>
                                    <option value="text">{t('Open Text', 'نص مفتوح')}</option>
                                    <option value="number">{t('Numeric', 'رقمي')}</option>
                                    <option value="date">{t('Date', 'تاريخ')}</option>
                                </select>
                                <button
                                    onClick={addDemographic}
                                    disabled={!newDemoLabel.trim()}
                                    className="futuristic-btn px-6 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-xs">add</span>
                                    {t('Add Variable', 'إضافة متغير')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={() => setStep(1)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back', 'رجوع')}
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            disabled={!surveyTitle.trim()}
                            className="futuristic-btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-40"
                        >
                            {t('Next: Define Scales', 'التالي: تعريف المقاييس')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/*  STEP 3 — Define Scales & Choice Scoring                 */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 3 && (
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {t('Define Research Scales & Choice Scores', 'عرّف المقاييس ودرجات الخيارات')}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {t(
                            'Create scales, add subscale dimensions, and explicitly map raw choice values found in the spreadsheet to normal and reversed scores.',
                            'أنشئ المقاييس وأبعادها، وقم بربط الخيارات النصية المستخرجة من جدول البيانات بدرجاتها العادية والعكسية لكل مقياس.'
                        )}
                    </p>

                    {/* Add scale form */}
                    <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
                        <div className="flex gap-3 items-center">
                            <span className="material-symbols-outlined text-cyan-400">add_circle</span>
                            <input
                                type="text"
                                value={newScaleName}
                                onChange={(e) => setNewScaleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addScale()}
                                placeholder={t('Enter scale name (e.g. Self-Efficacy Scale)', 'أدخل اسم المقياس (مثال: مقياس الكفاءة الذاتية)')}
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
                        <div className="space-y-6">
                            {scales.map((scale) => (
                                <div key={scale.id} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-5">
                                    {/* Scale header */}
                                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                                        <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-cyan-400 text-xl">assessment</span>
                                            {scale.name}
                                        </h4>
                                        <button
                                            onClick={() => removeScale(scale.id)}
                                            className="text-red-400/60 hover:text-red-400 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>

                                    {/* Dimensions */}
                                    <div className="bg-slate-950/40 rounded-lg p-4 space-y-3">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">account_tree</span>
                                            {t('Dimensions / Subscales', 'الأبعاد / المقاييس الفرعية')}
                                        </h5>
                                        <div className="flex flex-wrap gap-2">
                                            {scale.dimensions.map((dim) => (
                                                <span
                                                    key={dim.id}
                                                    className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300"
                                                >
                                                    {dim.name}
                                                    {scale.dimensions.length > 1 && (
                                                        <button
                                                            onClick={() => removeDimension(scale.id, dim.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-xs">close</span>
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
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                                            />
                                            <button onClick={() => addDimension(scale.id)} className="futuristic-btn px-4 py-1.5 text-xs">
                                                {t('Add Dimension', 'إضافة بُعد')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Choice Score Mappings */}
                                    <div className="bg-slate-950/40 rounded-lg p-4 space-y-3">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                                            {t('Map Sheet Options to Scores', 'ربط درجات خيارات جدول البيانات')}
                                        </h5>
                                        
                                        <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
                                            <table className="w-full text-left text-xs text-slate-300">
                                                <thead className="bg-slate-950/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-2 text-center w-16">{t('Include', 'تضمين')}</th>
                                                        <th className="px-4 py-2">{t('Raw Value (from Spreadsheet)', 'القيمة الخام (من الجدول)')}</th>
                                                        <th className="px-4 py-2 text-center w-24">{t('Normal Score', 'الدرجة العادية')}</th>
                                                        <th className="px-4 py-2 text-center w-24">{t('Opposite Score', 'الدرجة العكسية')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                                                    {uniqueSheetValues.map((val) => {
                                                        const mapping = scale.choiceMappings[val] || { isIncluded: false, score: 0, oppositeScore: 0 };
                                                        return (
                                                            <tr key={val} className="hover:bg-slate-800/30">
                                                                <td className="px-4 py-2 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={mapping.isIncluded}
                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'isIncluded', e.target.checked)}
                                                                        className="w-3.5 h-3.5 rounded text-cyan-500 bg-slate-800 border-slate-700"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 font-medium text-white truncate max-w-[200px]" title={val}>
                                                                    {val}
                                                                </td>
                                                                <td className="px-4 py-2 text-center">
                                                                    <input
                                                                        type="number"
                                                                        disabled={!mapping.isIncluded}
                                                                        value={mapping.score}
                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'score', Number(e.target.value))}
                                                                        className="w-16 bg-slate-800 border border-slate-700 rounded text-center text-white text-xs py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-center">
                                                                    <input
                                                                        type="number"
                                                                        disabled={!mapping.isIncluded}
                                                                        value={mapping.oppositeScore}
                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'oppositeScore', Number(e.target.value))}
                                                                        className="w-16 bg-slate-800 border border-slate-700 rounded text-center text-white text-xs py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={() => setStep(2)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back', 'رجوع')}
                        </button>
                        <button
                            onClick={() => setStep(4)}
                            disabled={scales.length === 0}
                            className="futuristic-btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-40"
                        >
                            {t('Next: Map Columns', 'التالي: ربط الأعمدة')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/*  STEP 4 — Map Columns (Table View)                       */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 4 && (
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {t('Map Spreadsheet Columns', 'ربط أعمدة البيانات')}
                    </h2>
                    <p className="text-slate-400 text-sm mb-6">
                        {t(
                            'Assign each column to a scale item (with optional reversed scoring) or to demographic parameters from Step 2.',
                            'صنّف كل عمود واربط عبارات المقياس بمقاييسها وأبعادها (والمتغيرات العكسية) أو بمتغيرات ديموغرافية معينة.'
                        )}
                    </p>

                    {/* The Table */}
                    <div className="rounded-xl border border-slate-800 overflow-hidden backdrop-blur-md bg-slate-900/40">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-center w-12">#</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-start min-w-[200px]">{t('Column Header', 'عنوان العمود')}</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-start min-w-[120px]">{t('Sample Data', 'عينة بيانات')}</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-center min-w-[170px]">{t('Category', 'التصنيف')}</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-center min-w-[150px]">{t('Scale / Demographic', 'المقياس / الديموغرافيا')}</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-center min-w-[150px]">{t('Dimension', 'البُعد')}</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-center w-20">{t('Reversed', 'عكسية')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {columnConfigs.map((col, idx) => {
                                        const isScale = col.category === 'scale_statement';
                                        const isDemo = col.category === 'demographic';
                                        const isIgnored = col.category === 'ignore';
                                        const selectedScale = scales.find((s) => s.id === col.scaleId);

                                        return (
                                            <tr key={col.name} className={`transition-colors duration-200 ${isIgnored ? 'opacity-40' : 'hover:bg-slate-800/30'}`}>
                                                <td className="px-4 py-3 text-center text-xs text-slate-600 font-mono">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-white text-sm truncate max-w-[280px]" title={col.name}>{col.name}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-500 font-mono truncate block max-w-[150px]">
                                                        {rows.slice(0, 2).map((r) => r[col.name] ?? '—').join(', ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <select
                                                        value={col.category}
                                                        onChange={(e) => updateColumn(idx, { category: e.target.value as ColumnCategory })}
                                                        className={`w-full rounded-lg py-1.5 px-2 text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer ${getCategoryColor(col.category)}`}
                                                    >
                                                        <option className="bg-slate-900 text-slate-100" value="scale_statement">{getCategoryLabel('scale_statement')}</option>
                                                        <option className="bg-slate-900 text-slate-100" value="demographic">{getCategoryLabel('demographic')}</option>
                                                        <option className="bg-slate-900 text-slate-100" value="metadata_id">{getCategoryLabel('metadata_id')}</option>
                                                        <option className="bg-slate-900 text-slate-100" value="metadata_time">{getCategoryLabel('metadata_time')}</option>
                                                        <option className="bg-slate-900 text-slate-400" value="ignore">{getCategoryLabel('ignore')}</option>
                                                    </select>
                                                </td>

                                                {/* Scale / Demographic selector */}
                                                <td className="px-4 py-3 text-center">
                                                    {isScale ? (
                                                        <select
                                                            value={col.scaleId || ''}
                                                            onChange={(e) => updateColumn(idx, { scaleId: e.target.value })}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                                        >
                                                            <option value="">-- {t('Select Scale', 'اختر مقياساً')} --</option>
                                                            {scales.map((s) => (
                                                                <option key={s.id} value={s.id}>{s.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : isDemo ? (
                                                        <select
                                                            value={col.demographicFieldId || ''}
                                                            onChange={(e) => updateColumn(idx, { demographicFieldId: e.target.value })}
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none"
                                                        >
                                                            <option value="">-- {t('Select Field', 'اختر حشداً')} --</option>
                                                            {demographics.map((d) => (
                                                                <option key={d.id} value={d.id}>{d.label}</option>
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
                                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-white focus:outline-none"
                                                        >
                                                            {selectedScale.dimensions.map((d) => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-slate-700 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Reversed check */}
                                                <td className="px-4 py-3 text-center">
                                                    {isScale ? (
                                                        <label className="inline-flex items-center justify-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!col.isReversed}
                                                                onChange={(e) => updateColumn(idx, { isReversed: e.target.checked })}
                                                                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
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
                    <div className="flex justify-between items-center mt-8">
                        <button onClick={() => setStep(3)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back', 'رجوع')}
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isLoading || !columnConfigs.some((c) => c.category === 'scale_statement' && c.scaleId)}
                            className="futuristic-btn-primary px-8 py-3 flex items-center gap-2 text-base font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40"
                        >
                            <span className="material-symbols-outlined">cloud_upload</span>
                            {t('Import & Save Survey', 'استيراد وحفظ الاستبيان')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
