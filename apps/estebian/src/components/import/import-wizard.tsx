'use client';

import { useState, useMemo } from 'react';
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

type ColumnCategory = 'scale_statement' | 'demographic' | 'metadata_id' | 'metadata_time' | 'ignore';
type DemographicType = 'text' | 'select' | 'number' | 'date';

interface ColumnConfig {
    name: string;
    category: ColumnCategory;
    demographicType?: DemographicType;
    scaleId?: string;
    dimensionId?: string;
    isReversed?: boolean;
    // Group mappings for demographic select columns: rawValue -> cleanGroupLabel
    demoChoiceMappings: Record<string, string>;
    // Corrections for demographic number columns: rawValue -> correctedNumber
    demoNumericCorrections: Record<string, number>;
    // Defined clean options for demographic select columns
    demoCleanOptions: string[];
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

    // Step 2: Survey Details & Scales
    const [surveyTitle, setSurveyTitle] = useState('');
    const [surveyLanguage, setSurveyLanguage] = useState<'ar' | 'en'>('ar');
    const [scales, setScales] = useState<ScaleConfig[]>([]);
    const [newScaleName, setNewScaleName] = useState('');
    const [newDimInputs, setNewDimInputs] = useState<Record<string, string>>({});

    // Step 3: Column configuration and interactive grid
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
    const [expandedCardCol, setExpandedCardCol] = useState<string | null>(null);
    const [step3Tab, setStep3Tab] = useState<'all' | 'problems' | 'raw'>('all');
    const [collapsedScales, setCollapsedScales] = useState<Record<string, boolean>>({});

    // Step metadata
    const stepsMeta = [
        { s: 1, icon: 'upload_file', title: t('Upload File', 'تحميل الملف') },
        { s: 2, icon: 'edit_note', title: t('Define Survey & Scales', 'تعريف الاستبيان والمقاييس') },
        { s: 3, icon: 'table_chart', title: t('Clean & Map Grid', 'تنظيف وربط البيانات') },
    ];

    /* ── Step 1 File Upload ── */

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

            // Set default survey title from filename
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            setSurveyTitle(cleanTitle);

            // Pre-classify columns
            const configs: ColumnConfig[] = data.headers.map((h) => {
                const guess = guessColumnClassification(h);
                let category: ColumnCategory = 'scale_statement';

                if (guess === 'metadata_id') category = 'metadata_id';
                else if (guess === 'metadata_time') category = 'metadata_time';

                return {
                    name: h,
                    category,
                    demoChoiceMappings: {},
                    demoNumericCorrections: {},
                    demoCleanOptions: []
                };
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

    /* ── Step 2 Scale Definition Functions ── */

    const addScale = () => {
        const name = newScaleName.trim();
        if (!name) return;
        const id = `scale_${Date.now()}`;
        const defaultDim: DimensionConfig = { id: `dim_${Date.now()}`, name: t('General', 'عام') };

        setScales((prev) => [...prev, { id, name, dimensions: [defaultDim], choiceMappings: {} }]);
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

    /* ── Step 3 Interactive Grid Helper Functions ── */

    const updateColumnConfig = (colName: string, patch: Partial<ColumnConfig>) => {
        setColumnConfigs((prev) =>
            prev.map((c) => {
                if (c.name !== colName) return c;
                const next = { ...c, ...patch };

                // Handle category resets
                if (patch.category) {
                    if (patch.category !== 'scale_statement') {
                        next.scaleId = undefined;
                        next.dimensionId = undefined;
                        next.isReversed = false;
                    }
                    if (patch.category !== 'demographic') {
                        next.demographicType = undefined;
                        next.demoChoiceMappings = {};
                        next.demoNumericCorrections = {};
                        next.demoCleanOptions = [];
                    } else if (!next.demographicType) {
                        next.demographicType = 'select';
                    }
                }

                // Handle type resets or initializations for demographics
                if (next.category === 'demographic' && (patch.category === 'demographic' || patch.demographicType)) {
                    const uniqueVals = Array.from(new Set(rows.map(r => String(r[colName] ?? '').trim()).filter(Boolean)));
                    next.demoChoiceMappings = {};
                    next.demoNumericCorrections = {};
                    next.demoCleanOptions = [];

                    if (next.demographicType === 'select') {
                        next.demoCleanOptions = [...uniqueVals];
                        uniqueVals.forEach(v => { next.demoChoiceMappings[v] = v; });
                    } else if (next.demographicType === 'number') {
                        uniqueVals.forEach(v => {
                            if (isNaN(Number(v))) {
                                next.demoNumericCorrections[v] = 0;
                            }
                        });
                    }
                }

                // Handle scale selections (auto-set first dimension)
                if (patch.scaleId) {
                    const targetScale = scales.find((s) => s.id === patch.scaleId);
                    if (targetScale && targetScale.dimensions.length > 0) {
                        next.dimensionId = targetScale.dimensions[0].id;
                    }
                }

                return next;
            })
        );
    };

    const [newDemoOptInputs, setNewDemoOptInputs] = useState<Record<string, string>>({});

    const addDemoCleanOption = (colName: string, optionValue: string) => {
        const opt = optionValue.trim();
        if (!opt) return;
        setColumnConfigs((prev) =>
            prev.map((c) => {
                if (c.name !== colName) return c;
                if (c.demoCleanOptions.includes(opt)) return c;
                return {
                    ...c,
                    demoCleanOptions: [...c.demoCleanOptions, opt]
                };
            })
        );
    };

    const removeDemoCleanOption = (colName: string, optionValue: string) => {
        setColumnConfigs((prev) =>
            prev.map((c) => {
                if (c.name !== colName) return c;
                const nextMappings = { ...c.demoChoiceMappings };
                Object.keys(nextMappings).forEach(k => {
                    if (nextMappings[k] === optionValue) {
                        nextMappings[k] = '';
                    }
                });
                return {
                    ...c,
                    demoCleanOptions: c.demoCleanOptions.filter(o => o !== optionValue),
                    demoChoiceMappings: nextMappings
                };
            })
        );
    };

    const updateDemoChoiceMapping = (colName: string, rawVal: string, cleanLabel: string) => {
        setColumnConfigs((prev) =>
            prev.map((c) => {
                if (c.name !== colName) return c;
                return {
                    ...c,
                    demoChoiceMappings: {
                        ...c.demoChoiceMappings,
                        [rawVal]: cleanLabel
                    }
                };
            })
        );
    };

    const updateDemoNumericCorrection = (colName: string, rawVal: string, numVal: number) => {
        setColumnConfigs((prev) =>
            prev.map((c) => {
                if (c.name !== colName) return c;
                return {
                    ...c,
                    demoNumericCorrections: {
                        ...c.demoNumericCorrections,
                        [rawVal]: numVal
                    }
                };
            })
        );
    };

    /* ── Validation Checks ── */

    const isCellInvalid = (colName: string, cellValue: any): boolean => {
        const config = columnConfigs.find((c) => c.name === colName);
        if (!config || cellValue === null || cellValue === undefined || cellValue === '') return false;
        const str = String(cellValue).trim();

        if (config.category === 'demographic') {
            if (config.demographicType === 'number') {
                return isNaN(Number(str)) && (config.demoNumericCorrections[str] === undefined || isNaN(Number(config.demoNumericCorrections[str])));
            }
            if (config.demographicType === 'select') {
                return !config.demoChoiceMappings[str];
            }
        }

        if (config.category === 'scale_statement' && config.scaleId) {
            const scale = scales.find((s) => s.id === config.scaleId);
            if (scale) {
                const mapping = scale.choiceMappings[str];
                return !mapping || !mapping.isIncluded;
            }
        }

        return false;
    };

    /* ── Compile Scale Choices list Dynamically ── */

    const getUniqueStatementChoices = (): string[] => {
        const statementCols = columnConfigs.filter((c) => c.category === 'scale_statement').map((c) => c.name);
        const uniqueSet = new Set<string>();
        rows.forEach((row) => {
            statementCols.forEach((colName) => {
                const val = row[colName];
                if (val !== null && val !== undefined) {
                    const str = String(val).trim();
                    if (str && isNaN(Number(str)) && str.length < 50) {
                        uniqueSet.add(str);
                    }
                }
            });
        });
        return Array.from(uniqueSet);
    };

    const initializeScaleChoices = () => {
        const uniques = getUniqueStatementChoices();
        setScales((prev) =>
            prev.map((scale) => {
                const mappings = { ...scale.choiceMappings };
                uniques.forEach((val) => {
                    if (!mappings[val]) {
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
                            oppositeScore: defaultOpp || 1
                        };
                    }
                });
                return { ...scale, choiceMappings: mappings };
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

    const getCategoryColor = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return 'text-cyan-400 bg-slate-900 border-cyan-500/40';
            case 'demographic': return 'text-purple-400 bg-slate-900 border-purple-500/40';
            case 'metadata_id': return 'text-amber-400 bg-slate-900 border-amber-500/40';
            case 'metadata_time': return 'text-emerald-400 bg-slate-900 border-emerald-500/40';
            case 'ignore': return 'text-slate-500 bg-slate-900 border-slate-800';
        }
    };

    const getCategoryLabel = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return t('Scale Statement', 'عبارة مقياس');
            case 'demographic': return t('Demographic', 'ديموغرافي');
            case 'metadata_id': return t('ID / Serial', 'معرّف');
            case 'metadata_time': return t('Timestamp', 'طابع زمني');
            case 'ignore': return t('Ignore', 'تجاهل');
        }
    };

    const getCategoryBorderColor = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return 'border-t-cyan-500';
            case 'demographic': return 'border-t-purple-500';
            case 'metadata_id': return 'border-t-amber-500';
            case 'metadata_time': return 'border-t-emerald-500';
            case 'ignore': return 'border-t-slate-600';
        }
    };

    const getCategoryBgGlow = (cat: ColumnCategory): string => {
        switch (cat) {
            case 'scale_statement': return 'bg-cyan-500/5';
            case 'demographic': return 'bg-purple-500/5';
            case 'metadata_id': return 'bg-amber-500/5';
            case 'metadata_time': return 'bg-emerald-500/5';
            case 'ignore': return 'bg-slate-500/5';
        }
    };

    /* ── Computed: Flagged Rows ── */

    const flaggedRows = useMemo(() => {
        const flagged: { rowIndex: number; colName: string; value: string; expected: string }[] = [];
        rows.forEach((row, rowIndex) => {
            headers.forEach((colName) => {
                const val = row[colName];
                if (val === null || val === undefined || val === '') return;
                if (isCellInvalid(colName, val)) {
                    const config = columnConfigs.find(c => c.name === colName);
                    let expected = '';
                    if (config?.category === 'demographic') {
                        if (config.demographicType === 'number') expected = t('Number', 'رقم');
                        else if (config.demographicType === 'select') expected = t('Mapped category', 'فئة مصنفة');
                    } else if (config?.category === 'scale_statement') {
                        expected = t('Valid scale choice', 'خيار مقياس صالح');
                    }
                    flagged.push({ rowIndex, colName, value: String(val).trim(), expected });
                }
            });
        });
        return flagged;
    }, [rows, headers, columnConfigs, scales]);

    const getColumnProblemCount = (colName: string): number => {
        return flaggedRows.filter(f => f.colName === colName).length;
    };

    const getColumnPreviewValues = (colName: string, limit = 8): { value: string; count: number; isInvalid: boolean }[] => {
        const freq: Record<string, number> = {};
        rows.forEach(row => {
            const val = row[colName];
            if (val !== null && val !== undefined && val !== '') {
                const str = String(val).trim();
                freq[str] = (freq[str] || 0) + 1;
            }
        });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([value, count]) => ({
                value,
                count,
                isInvalid: isCellInvalid(colName, value)
            }));
    };

    const deleteRow = (index: number) => {
        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const dropFlaggedRow = (rowIndex: number) => {
        if (confirm(t(`Drop row ${rowIndex + 1} and all its data?`, `حذف الصف ${rowIndex + 1} وجميع بياناته؟`))) {
            deleteRow(rowIndex);
        }
    };

    const dropAllFlaggedRows = () => {
        const uniqueRows = Array.from(new Set(flaggedRows.map(f => f.rowIndex)));
        if (uniqueRows.length === 0) return;
        if (confirm(t(`Drop ${uniqueRows.length} problematic rows?`, `حذف ${uniqueRows.length} صف يحتوي على مشاكل؟`))) {
            setRows(prev => prev.filter((_, i) => !uniqueRows.includes(i)));
        }
    };

    const handleImport = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            // 1. Save Scales
            const savedScaleIds: string[] = [];
            const scaleStatementMap: Record<string, { scaleId: string; statementId: string; columnName: string; isReversed: boolean }> = {};

            setSaveProgress(t('Creating psychometric scales...', 'جاري إنشاء المقاييس النفسية...'));

            for (const scale of scales) {
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
                        isReversed: false, // pre-reversed in saved data to bypass dynamic calculations
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
            const demoColumns = columnConfigs.filter((c) => c.category === 'demographic');

            const surveyDemographics = demoColumns.map((config) => {
                const cleanOptions = Array.from(new Set(Object.values(config.demoChoiceMappings))).filter(Boolean);
                return {
                    id: config.name,
                    label: config.name,
                    type: config.demographicType || 'text',
                    required: false,
                    options: config.demographicType === 'select' ? cleanOptions : undefined
                };
            });

            const surveyId = await saveSurvey({
                title: surveyTitle,
                language: surveyLanguage,
                introduction: t('Created via spreadsheet import dashboard.', 'تم إنشاؤه عبر لوحة تحكم استيراد جدول البيانات.'),
                isPublished: true,
                demographics: surveyDemographics,
                scaleIds: savedScaleIds
            });

            // 3. Save Survey responses
            setSaveProgress(t('Importing respondent entries...', 'جاري استيراد مشاركات المستجيبين...'));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const demoVals: Record<string, any> = {};

                demoColumns.forEach((config) => {
                    const rawVal = String(row[config.name] || '').trim();
                    if (config.demographicType === 'select') {
                        demoVals[config.name] = config.demoChoiceMappings[rawVal] || rawVal;
                    } else if (config.demographicType === 'number') {
                        if (!isNaN(Number(rawVal))) {
                            demoVals[config.name] = Number(rawVal);
                        } else {
                            demoVals[config.name] = config.demoNumericCorrections[rawVal] || 0;
                        }
                    } else {
                        demoVals[config.name] = rawVal;
                    }
                });

                const answers: Record<string, number> = {};
                columnConfigs.forEach((col) => {
                    if (col.category === 'scale_statement') {
                        const mappingInfo = scaleStatementMap[col.name];
                        if (mappingInfo) {
                            const scaleConfig = scales.find((s) => s.id === col.scaleId);
                            const rawValue = String(row[col.name] || '').trim();
                            const mapping = scaleConfig?.choiceMappings[rawValue];

                            if (mapping && mapping.isIncluded) {
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
        <div className="w-full font-sans text-slate-100" dir={direction}>
            {/* Step Indicator */}
            <div className="max-w-4xl mx-auto mb-10">
                <div className="flex items-center justify-between relative">
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
                                    'Upload your Excel (.xlsx, .xls) or CSV file. The first row should contain the column headers.',
                                    'قم بتحميل ملف Excel أو CSV. يجب أن يحتوي الصف الأول على عناوين الأعمدة.'
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
            {/*  STEP 2 — Define Survey Name & Scales                   */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 2 && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {t('Define Survey & Scales', 'تعريف الاستبيان والمقاييس')}
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">
                        {t(
                            'Name your survey, select the language, and define the psychometric scales with their dimensions.',
                            'اسم الاستبيان، لغته، وعرّف المقاييس النفسية مع أبعادها الفرعية.'
                        )}
                    </p>

                    {/* Survey Info Card */}
                    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {t('Survey Name / Title', 'اسم الاستبيان')}
                            </label>
                            <input
                                type="text"
                                value={surveyTitle}
                                onChange={(e) => setSurveyTitle(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {t('Survey Language', 'اللغة')}
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

                    {/* Add scale form */}
                    <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/20">
                        <div className="flex gap-3 items-center">
                            <span className="material-symbols-outlined text-cyan-400">add_circle</span>
                            <input
                                type="text"
                                value={newScaleName}
                                onChange={(e) => setNewScaleName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addScale()}
                                placeholder={t('Enter scale name (e.g. Anxiety Scale)', 'أدخل اسم المقياس (مثال: مقياس القلق)')}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                            />
                            <button onClick={addScale} className="futuristic-btn-primary px-6 py-2" disabled={!newScaleName.trim()}>
                                {t('Add Scale', 'إضافة مقياس')}
                            </button>
                        </div>
                    </div>

                    {/* Scales list */}
                    {scales.length === 0 ? (
                        <div className="text-center py-12 border border-slate-800 rounded-xl bg-slate-900/10">
                            <span className="material-symbols-outlined text-3xl text-slate-700 mb-2">psychology</span>
                            <p className="text-slate-500 text-sm">{t('No scales defined yet. Add your first scale above.', 'لا توجد مقاييس بعد. أضف أول مقياس أعلاه.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {scales.map((scale) => (
                                <div key={scale.id} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                                            <span className="material-symbols-outlined text-cyan-400">assessment</span>
                                            {scale.name}
                                        </h4>
                                        <button
                                            onClick={() => removeScale(scale.id)}
                                            className="text-red-400/60 hover:text-red-400 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
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
                                                    className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-xs text-slate-300"
                                                >
                                                    {dim.name}
                                                    {scale.dimensions.length > 1 && (
                                                        <button
                                                            onClick={() => removeDimension(scale.id, dim.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors ml-1"
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
                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                                            />
                                            <button onClick={() => addDimension(scale.id)} className="futuristic-btn px-4 py-1 text-xs">
                                                {t('Add Dimension', 'إضافة بُعد')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between items-center pt-4">
                        <button onClick={() => setStep(1)} className="futuristic-btn px-5 py-2 flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            {t('Back', 'رجوع')}
                        </button>
                        <button
                            onClick={() => {
                                initializeScaleChoices();
                                setStep(3);
                            }}
                            disabled={!surveyTitle.trim() || scales.length === 0}
                            className="futuristic-btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-40"
                        >
                            {t('Next: Clean & Map Grid', 'التالي: تنظيف وربط البيانات')}
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────── */}
            {/*  STEP 3 — Column Cards + Flagged Row Inspector           */}
            {/* ──────────────────────────────────────────────────────── */}
            {step === 3 && (
                <div className="max-w-full mx-auto px-4 md:px-8 space-y-6">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                {t('Clean & Map Data Grid', 'تنظيف وربط جدول البيانات')}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {t(
                                    'Configure each column, fix problems, and map scale scoring — all inline.',
                                    'اضبط كل عمود، أصلح المشاكل، واربط درجات المقاييس — كل شيء في مكان واحد.'
                                )}
                            </p>
                        </div>
                        <button onClick={() => setStep(2)} className="futuristic-btn px-5 py-2 flex items-center gap-2 text-sm self-start md:self-auto">
                            <span className="material-symbols-outlined text-sm">edit</span>
                            {t('Edit Scales', 'تعديل المقاييس')}
                        </button>
                    </div>

                    {/* ── Summary Stats Bar ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { icon: 'view_column', label: t('Columns', 'أعمدة'), value: headers.length, color: 'text-cyan-400' },
                            { icon: 'groups', label: t('Rows', 'صفوف'), value: rows.length, color: 'text-emerald-400' },
                            { icon: 'warning', label: t('Problems', 'مشاكل'), value: flaggedRows.length, color: flaggedRows.length > 0 ? 'text-red-400' : 'text-emerald-400' },
                            { icon: 'assessment', label: t('Scales', 'مقاييس'), value: scales.length, color: 'text-purple-400' },
                        ].map((stat) => (
                            <div key={stat.icon} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                                <span className={`material-symbols-outlined text-lg ${stat.color}`}>{stat.icon}</span>
                                <div>
                                    <div className="text-lg font-bold text-white">{stat.value}</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Tab Bar ── */}
                    <div className="flex gap-1 p-1 bg-slate-900/60 rounded-lg border border-slate-800 w-fit">
                        {([
                            { key: 'all' as const, icon: 'grid_view', label: t('All Columns', 'كل الأعمدة') },
                            { key: 'problems' as const, icon: 'report_problem', label: t('Problems', 'المشاكل'), badge: flaggedRows.length },
                            { key: 'raw' as const, icon: 'table_rows', label: t('Raw Data', 'البيانات الخام') },
                        ]).map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStep3Tab(tab.key)}
                                className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                                    step3Tab === tab.key
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ═══════════════════════════════════════════════════ */}
                    {/*  TAB: All Columns — Column Cards Strip             */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step3Tab === 'all' && (
                        <>
                            {/* Scrollable Column Cards */}
                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <div className="flex gap-4" style={{ minWidth: `${headers.length * 260}px` }}>
                                    {headers.map((colName) => {
                                        const config = columnConfigs.find((c) => c.name === colName);
                                        if (!config) return null;
                                        const isExpanded = expandedCardCol === colName;
                                        const problems = getColumnProblemCount(colName);
                                        const preview = getColumnPreviewValues(colName);

                                        return (
                                            <div
                                                key={colName}
                                                className={`flex-shrink-0 rounded-xl border border-slate-800 border-t-4 ${getCategoryBorderColor(config.category)} ${getCategoryBgGlow(config.category)} backdrop-blur-md transition-all duration-300 ${
                                                    isExpanded ? 'w-[400px]' : 'w-[240px]'
                                                }`}
                                            >
                                                {/* Card Header */}
                                                <div
                                                    className="p-3 cursor-pointer hover:bg-slate-800/30 transition-colors rounded-t-xl"
                                                    onClick={() => setExpandedCardCol(isExpanded ? null : colName)}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <h4 className="text-xs font-bold text-white truncate flex-1" title={colName}>
                                                            {colName}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5">
                                                            {problems > 0 && (
                                                                <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-[10px]">warning</span>
                                                                    {problems}
                                                                </span>
                                                            )}
                                                            {problems === 0 && config.category !== 'ignore' && (
                                                                <span className="text-emerald-500 text-[10px]">
                                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                                </span>
                                                            )}
                                                            <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                expand_more
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Category Select */}
                                                    <select
                                                        value={config.category}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            updateColumnConfig(colName, { category: e.target.value as ColumnCategory });
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`w-full rounded-lg border px-2 py-1.5 text-[11px] font-semibold bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${getCategoryColor(config.category)}`}
                                                    >
                                                        <option className="bg-slate-950 text-cyan-400" value="scale_statement">{t('Scale Statement', 'عبارة مقياس')}</option>
                                                        <option className="bg-slate-950 text-purple-400" value="demographic">{t('Demographic', 'ديموغرافي')}</option>
                                                        <option className="bg-slate-950 text-amber-400" value="metadata_id">{t('ID / Serial', 'معرّف')}</option>
                                                        <option className="bg-slate-950 text-emerald-400" value="metadata_time">{t('Timestamp', 'طابع زمني')}</option>
                                                        <option className="bg-slate-950 text-slate-500" value="ignore">{t('Ignore', 'تجاهل')}</option>
                                                    </select>
                                                </div>

                                                {/* Card Body - Configuration */}
                                                <div className="px-3 pb-3 space-y-2">
                                                    {/* Scale Config */}
                                                    {config.category === 'scale_statement' && (
                                                        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                                                            <select
                                                                value={config.scaleId || ''}
                                                                onChange={(e) => updateColumnConfig(colName, { scaleId: e.target.value })}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500"
                                                            >
                                                                <option value="">-- {t('Scale', 'المقياس')} --</option>
                                                                {scales.map((s) => (
                                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                            {config.scaleId && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <select
                                                                        value={config.dimensionId || ''}
                                                                        onChange={(e) => updateColumnConfig(colName, { dimensionId: e.target.value })}
                                                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-cyan-500"
                                                                    >
                                                                        {scales.find((s) => s.id === config.scaleId)?.dimensions.map((d) => (
                                                                            <option key={d.id} value={d.id}>{d.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <label className="flex items-center gap-1 text-[10px] text-amber-400 cursor-pointer whitespace-nowrap">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={!!config.isReversed}
                                                                            onChange={(e) => updateColumnConfig(colName, { isReversed: e.target.checked })}
                                                                            className="rounded border-slate-800 bg-slate-950 text-cyan-500"
                                                                        />
                                                                        {t('Rev', 'عكس')}
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Demographic Config */}
                                                    {config.category === 'demographic' && (
                                                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                                                            <select
                                                                value={config.demographicType}
                                                                onChange={(e) => updateColumnConfig(colName, { demographicType: e.target.value as DemographicType })}
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-purple-500"
                                                            >
                                                                <option value="select">{t('Choice List', 'قائمة خيارات')}</option>
                                                                <option value="text">{t('Open Text', 'نص مفتوح')}</option>
                                                                <option value="number">{t('Numeric', 'رقمي')}</option>
                                                                <option value="date">{t('Date', 'تاريخ')}</option>
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Data Preview */}
                                                    <div className="pt-1 border-t border-slate-800/80">
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                            {t('Sample Values', 'عينة من القيم')}
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {preview.slice(0, isExpanded ? 20 : 5).map((p) => (
                                                                <span
                                                                    key={p.value}
                                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                                                                        p.isInvalid
                                                                            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                                                            : 'bg-slate-800 text-slate-400'
                                                                    }`}
                                                                    title={`${p.value} (×${p.count})`}
                                                                >
                                                                    {p.isInvalid && <span className="material-symbols-outlined text-[10px]">warning</span>}
                                                                    <span className="truncate max-w-[80px]">{p.value}</span>
                                                                    <span className="text-slate-600">×{p.count}</span>
                                                                </span>
                                                            ))}
                                                            {preview.length > (isExpanded ? 20 : 5) && (
                                                                <span className="text-[10px] text-slate-600">+{preview.length - (isExpanded ? 20 : 5)}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ── Expanded Inline Config ── */}
                                                    {isExpanded && config.category === 'demographic' && config.demographicType === 'select' && (
                                                        <div className="space-y-3 pt-2 border-t border-purple-500/20 animate-in fade-in duration-200">
                                                            {/* Target Categories */}
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block">
                                                                    {t('Target Categories', 'الفئات المستهدفة')}
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {config.demoCleanOptions.map((opt) => (
                                                                        <span key={opt} className="inline-flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] text-purple-300">
                                                                            {opt}
                                                                            <button
                                                                                onClick={() => removeDemoCleanOption(config.name, opt)}
                                                                                className="text-purple-500/60 hover:text-red-400"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[10px]">close</span>
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={newDemoOptInputs[config.name] || ''}
                                                                        onChange={(e) => setNewDemoOptInputs(prev => ({ ...prev, [config.name]: e.target.value }))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                addDemoCleanOption(config.name, newDemoOptInputs[config.name] || '');
                                                                                setNewDemoOptInputs(prev => ({ ...prev, [config.name]: '' }));
                                                                            }
                                                                        }}
                                                                        placeholder={t('New category...', 'فئة جديدة...')}
                                                                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-purple-500"
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            addDemoCleanOption(config.name, newDemoOptInputs[config.name] || '');
                                                                            setNewDemoOptInputs(prev => ({ ...prev, [config.name]: '' }));
                                                                        }}
                                                                        className="futuristic-btn px-2 py-1 text-[10px]"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {/* Map Raw Values */}
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block">
                                                                    {t('Map Values → Categories', 'ربط القيم → الفئات')}
                                                                </span>
                                                                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                                                    {Object.entries(config.demoChoiceMappings).map(([rawVal, cleanVal]) => (
                                                                        <div key={rawVal} className="flex items-center gap-2 text-[10px]">
                                                                            <span className={`flex-1 truncate ${cleanVal ? 'text-slate-400' : 'text-red-400'}`} title={rawVal}>
                                                                                {rawVal || '—'}
                                                                            </span>
                                                                            <span className="text-slate-600">→</span>
                                                                            <select
                                                                                value={cleanVal}
                                                                                onChange={(e) => updateDemoChoiceMapping(config.name, rawVal, e.target.value)}
                                                                                className={`bg-slate-800 border rounded px-1.5 py-0.5 text-[10px] w-28 focus:outline-none ${cleanVal ? 'border-slate-700 text-white' : 'border-red-500/40 text-red-300'}`}
                                                                            >
                                                                                <option value="">-- --</option>
                                                                                {config.demoCleanOptions.map(opt => (
                                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Expanded: Number Corrections */}
                                                    {isExpanded && config.category === 'demographic' && config.demographicType === 'number' && Object.keys(config.demoNumericCorrections).length > 0 && (
                                                        <div className="space-y-2 pt-2 border-t border-amber-500/20 animate-in fade-in duration-200">
                                                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">
                                                                {t('Fix Non-Numeric Values', 'تصحيح القيم غير الرقمية')}
                                                            </span>
                                                            <div className="space-y-1">
                                                                {Object.entries(config.demoNumericCorrections).map(([rawVal, numVal]) => (
                                                                    <div key={rawVal} className="flex items-center gap-2 text-[10px]">
                                                                        <span className="text-red-400 flex-1 truncate" title={rawVal}>{rawVal}</span>
                                                                        <span className="text-slate-600">→</span>
                                                                        <input
                                                                            type="number"
                                                                            value={numVal}
                                                                            onChange={(e) => updateDemoNumericCorrection(config.name, rawVal, Number(e.target.value))}
                                                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[10px] text-white w-20 text-center focus:outline-none focus:border-amber-500"
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Scale Scoring Section ── */}
                            {scales.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-cyan-400">category</span>
                                        {t('Scale Scoring Mappings', 'ربط درجات المقاييس')}
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {scales.map((scale) => {
                                            const isCollapsed = collapsedScales[scale.id];
                                            const statementChoices = getUniqueStatementChoices();
                                            return (
                                                <div key={scale.id} className="rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden">
                                                    <button
                                                        onClick={() => setCollapsedScales(prev => ({ ...prev, [scale.id]: !prev[scale.id] }))}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                                                    >
                                                        <span className="text-xs font-bold text-white flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm text-cyan-400">assessment</span>
                                                            {scale.name}
                                                            <span className="text-[10px] text-slate-500 font-normal">
                                                                ({statementChoices.length} {t('choices', 'خيارات')})
                                                            </span>
                                                        </span>
                                                        <span className={`material-symbols-outlined text-sm text-slate-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                                                            expand_more
                                                        </span>
                                                    </button>
                                                    {!isCollapsed && (
                                                        <div className="px-4 pb-4">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-slate-950 text-[10px] font-bold text-slate-500 uppercase">
                                                                    <tr>
                                                                        <th className="px-2 py-1.5 text-center w-10">{t('Use', 'تضمين')}</th>
                                                                        <th className="px-2 py-1.5">{t('Raw Entry', 'القيمة')}</th>
                                                                        <th className="px-2 py-1.5 text-center w-14">{t('Score', 'درجة')}</th>
                                                                        <th className="px-2 py-1.5 text-center w-14">{t('Opp', 'عكس')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-800/60">
                                                                    {statementChoices.map((val) => {
                                                                        const mapping = scale.choiceMappings[val] || { isIncluded: false, score: 1, oppositeScore: 1 };
                                                                        return (
                                                                            <tr key={val} className="hover:bg-slate-800/20">
                                                                                <td className="px-2 py-1.5 text-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={mapping.isIncluded}
                                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'isIncluded', e.target.checked)}
                                                                                        className="rounded text-cyan-500 bg-slate-950 border-slate-800"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-2 py-1.5 font-medium text-slate-200 truncate max-w-[120px]" title={val}>
                                                                                    {val}
                                                                                </td>
                                                                                <td className="px-2 py-1.5 text-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!mapping.isIncluded}
                                                                                        value={mapping.score}
                                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'score', Number(e.target.value))}
                                                                                        className="w-12 bg-slate-800 border border-slate-700 rounded text-center text-white text-[10px] py-0.5 disabled:opacity-20 focus:outline-none focus:border-cyan-500"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-2 py-1.5 text-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={!mapping.isIncluded}
                                                                                        value={mapping.oppositeScore}
                                                                                        onChange={(e) => updateChoiceMapping(scale.id, val, 'oppositeScore', Number(e.target.value))}
                                                                                        className="w-12 bg-slate-800 border border-slate-700 rounded text-center text-white text-[10px] py-0.5 disabled:opacity-20 focus:outline-none focus:border-cyan-500"
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/*  TAB: Problems — Flagged Row Inspector             */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step3Tab === 'problems' && (
                        <div className="space-y-4">
                            {flaggedRows.length === 0 ? (
                                <div className="text-center py-16 rounded-xl bg-slate-900/30 border border-slate-800">
                                    <span className="material-symbols-outlined text-5xl text-emerald-500/60 mb-3 block">verified</span>
                                    <h3 className="text-lg font-bold text-white mb-1">{t('No Problems Found', 'لا توجد مشاكل')}</h3>
                                    <p className="text-slate-400 text-sm">{t('All data looks clean! You can proceed to import.', 'جميع البيانات تبدو نظيفة! يمكنك المتابعة للاستيراد.')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <span className="material-symbols-outlined text-red-400">report_problem</span>
                                            {t('Flagged Rows', 'صفوف بها مشاكل')}
                                            <span className="text-slate-500 font-normal text-xs">
                                                ({Array.from(new Set(flaggedRows.map(f => f.rowIndex))).length} {t('rows', 'صفوف')}, {flaggedRows.length} {t('issues', 'مشاكل')})
                                            </span>
                                        </h3>
                                        <button
                                            onClick={dropAllFlaggedRows}
                                            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                            {t('Drop All Flagged Rows', 'حذف كل الصفوف التي بها مشاكل')}
                                        </button>
                                    </div>

                                    <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-slate-950 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3 text-slate-400 font-bold uppercase tracking-wider w-20">{t('Row', 'صف')}</th>
                                                    <th className="px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">{t('Column', 'عمود')}</th>
                                                    <th className="px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">{t('Value', 'القيمة')}</th>
                                                    <th className="px-4 py-3 text-slate-400 font-bold uppercase tracking-wider">{t('Expected', 'المتوقع')}</th>
                                                    <th className="px-4 py-3 text-slate-400 font-bold uppercase tracking-wider text-center w-24">{t('Action', 'إجراء')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {(() => {
                                                    // Group by row for cleaner display
                                                    const groupedByRow = new Map<number, typeof flaggedRows>();
                                                    flaggedRows.forEach(f => {
                                                        if (!groupedByRow.has(f.rowIndex)) groupedByRow.set(f.rowIndex, []);
                                                        groupedByRow.get(f.rowIndex)!.push(f);
                                                    });
                                                    return Array.from(groupedByRow.entries()).map(([rowIndex, issues]) => (
                                                        issues.map((issue, i) => (
                                                            <tr key={`${rowIndex}-${issue.colName}`} className="hover:bg-slate-800/20">
                                                                {i === 0 && (
                                                                    <td rowSpan={issues.length} className="px-4 py-3 font-bold text-white border-r border-slate-800/40">
                                                                        #{rowIndex + 1}
                                                                    </td>
                                                                )}
                                                                <td className="px-4 py-3 text-purple-300 font-medium">{issue.colName}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className="bg-red-500/15 text-red-300 px-2 py-0.5 rounded text-[11px]">
                                                                        {issue.value}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-400">{issue.expected}</td>
                                                                {i === 0 && (
                                                                    <td rowSpan={issues.length} className="px-4 py-3 text-center border-l border-slate-800/40">
                                                                        <button
                                                                            onClick={() => dropFlaggedRow(rowIndex)}
                                                                            className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                                                                            title={t('Drop entire row', 'حذف الصف بالكامل')}
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════ */}
                    {/*  TAB: Raw Data — Full Spreadsheet View             */}
                    {/* ═══════════════════════════════════════════════════ */}
                    {step3Tab === 'raw' && (
                        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/30 backdrop-blur-md shadow-2xl">
                            <div className="overflow-x-auto max-w-full custom-scrollbar" style={{ maxHeight: '60vh' }}>
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-950 border-b border-slate-800">
                                            <th className="p-3 text-center border-r border-slate-800 text-slate-500 font-bold uppercase w-16 sticky left-0 bg-slate-950">#</th>
                                            {headers.map((colName) => {
                                                const config = columnConfigs.find(c => c.name === colName);
                                                return (
                                                    <th key={colName} className={`p-3 border-r border-slate-800 text-xs tracking-wide min-w-[140px] ${
                                                        config ? getCategoryColor(config.category).split(' ')[0] : 'text-slate-300'
                                                    } font-semibold`}>
                                                        <div className="flex items-center gap-1.5">
                                                            {colName}
                                                            {config && getColumnProblemCount(colName) > 0 && (
                                                                <span className="bg-red-500/20 text-red-400 text-[8px] px-1 py-0 rounded-full">{getColumnProblemCount(colName)}</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.slice(0, 100).map((row, index) => (
                                            <tr key={index} className="border-b border-slate-800/40 hover:bg-slate-800/10">
                                                <td className="p-2 border-r border-slate-800 text-center bg-slate-950/40 text-slate-500 sticky left-0">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="text-[10px]">{index + 1}</span>
                                                        {flaggedRows.some(f => f.rowIndex === index) && (
                                                            <button
                                                                onClick={() => dropFlaggedRow(index)}
                                                                className="text-red-400/50 hover:text-red-400 transition-colors"
                                                                title={t('Drop Row', 'حذف الصف')}
                                                            >
                                                                <span className="material-symbols-outlined text-xs">delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                {headers.map((colName) => {
                                                    const val = row[colName];
                                                    const isInvalid = isCellInvalid(colName, val);
                                                    return (
                                                        <td
                                                            key={colName}
                                                            className={`p-2 border-r border-slate-800/60 text-[11px] transition-colors ${
                                                                isInvalid
                                                                    ? 'bg-red-500/10 text-red-200'
                                                                    : 'text-slate-400'
                                                            }`}
                                                        >
                                                            {val !== null && val !== undefined ? String(val) : <span className="text-slate-700">—</span>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {rows.length > 100 && (
                                <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-center text-xs text-slate-500">
                                    {t(`Showing first 100 of ${rows.length} rows`, `عرض أول 100 من ${rows.length} صف`)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Navigation Bar ── */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                        <button onClick={() => setStep(2)} className="futuristic-btn px-5 py-2.5 flex items-center gap-2 text-sm">
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

