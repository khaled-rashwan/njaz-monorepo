'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';

interface SurveyPaperRow {
    source_file?: string;
    title: string;
    year?: string;
    first_author?: string;
    venue?: string;
    paper_type?: string;
    application_domain?: string;
    network_type?: string;
    optimization_type?: string;
    uncertainty_method?: string;
    solution_method?: string;
    temporal_resolution_approach?: string;
    optimization_control_interval?: string;
    simulation_data_resolution?: string;
    evaluation_window?: string;
    scheduling_horizon?: string;
    includes_energy_storage?: string;
    storage_technologies?: string;
    renewable_sources?: string;
    other_flexibility_resources?: string;
    models_ramping_constraints?: string;
    models_degradation?: string;
    test_system?: string;
    system_scale?: string;
    case_study_type?: string;
    is_justified_sub_hourly?: string;
    justification_sub_hourly_quote?: string;
    justification_sub_hourly_type?: string;
    main_contribution_quote?: string;
    key_finding_quote?: string;
    acknowledges_limitations?: string;
    limitations_quote?: string;
    validation_overall_status?: string;
    validation_summary?: string;
}

export function SurveyAnalysisMatrix() {
    const { t } = useLanguage();
    const { addBlock, addLiteratureItemsBulk } = useEditorStore();
    const [papers, setPapers] = useState<SurveyPaperRow[]>([]);
    const [selectedPaper, setSelectedPaper] = useState<SurveyPaperRow | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDomain, setFilterDomain] = useState('all');
    const [filterOptType, setFilterOptType] = useState('all');
    const [filterUncertainty, setFilterUncertainty] = useState('all');
    const [filterStorage, setFilterStorage] = useState('all');
    const [filterResolution, setFilterResolution] = useState('all');
    const [isLoadingDemo, setIsLoadingDemo] = useState(false);

    // Parse CSV helper
    const parseCSVData = (csvText: string): SurveyPaperRow[] => {
        const lines: string[] = [];
        let currentLine = '';
        let insideQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            if (char === '"') {
                insideQuotes = !insideQuotes;
                currentLine += char;
            } else if (char === '\n' && !insideQuotes) {
                if (currentLine.trim()) lines.push(currentLine);
                currentLine = '';
            } else {
                currentLine += char;
            }
        }
        if (currentLine.trim()) lines.push(currentLine);

        if (lines.length < 2) return [];

        const parseLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQ = false;
            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') {
                    if (inQ && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQ = !inQ;
                    }
                } else if (c === ',' && !inQ) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += c;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseLine(lines[0]);
        const rows: SurveyPaperRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i]);
            const rowObj: any = {};
            headers.forEach((h, idx) => {
                rowObj[h] = values[idx] || '';
            });
            if (rowObj.title) {
                rows.push(rowObj);
            }
        }
        return rows;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const parsed = parseCSVData(content);
                setPapers(parsed);
                if (parsed.length > 0) setSelectedPaper(parsed[0]);
            }
        };
        reader.readAsText(file);
    };

    // Filtered list
    const filteredPapers = useMemo(() => {
        return papers.filter(p => {
            const matchesSearch = !searchTerm || 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.first_author && p.first_author.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.test_system && p.test_system.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesDomain = filterDomain === 'all' || p.application_domain === filterDomain;
            const matchesOpt = filterOptType === 'all' || p.optimization_type === filterOptType;
            const matchesUncertainty = filterUncertainty === 'all' || p.uncertainty_method === filterUncertainty;
            const matchesStorage = filterStorage === 'all' || p.includes_energy_storage === filterStorage;
            const matchesRes = filterResolution === 'all' || p.temporal_resolution_approach === filterResolution;

            return matchesSearch && matchesDomain && matchesOpt && matchesUncertainty && matchesStorage && matchesRes;
        });
    }, [papers, searchTerm, filterDomain, filterOptType, filterUncertainty, filterStorage, filterResolution]);

    // Unique options
    const domains = useMemo(() => Array.from(new Set(papers.map(p => p.application_domain).filter(Boolean))), [papers]);
    const optTypes = useMemo(() => Array.from(new Set(papers.map(p => p.optimization_type).filter(Boolean))), [papers]);
    const uncertainties = useMemo(() => Array.from(new Set(papers.map(p => p.uncertainty_method).filter(Boolean))), [papers]);
    const resolutions = useMemo(() => Array.from(new Set(papers.map(p => p.temporal_resolution_approach).filter(Boolean))), [papers]);

    // Export selected to Document
    const handleInsertComparisonTable = async () => {
        if (filteredPapers.length === 0) return;
        const headers = ['Paper / Author', 'Year', 'Optimization', 'Uncertainty', 'Interval', 'Horizon', 'Storage'];
        const rows = filteredPapers.slice(0, 15).map(p => [
            `${p.first_author || 'Author'} et al. (${p.year || 'N/A'})`,
            p.year || '-',
            p.optimization_type || '-',
            p.uncertainty_method || '-',
            p.optimization_control_interval || '-',
            p.scheduling_horizon || '-',
            p.includes_energy_storage === 'yes' ? (p.storage_technologies || 'Yes') : 'No'
        ]);

        await addBlock('TABLE', undefined);
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-3 space-y-3">
            {/* Header & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                        📊 {t('Literature Survey Matrix', 'مصفوفة المسح الأدبي للأوراق')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                        ({filteredPapers.length}/{papers.length} {t('papers', 'ورقة')})
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <label className="futuristic-btn-primary py-1 px-3 text-xs cursor-pointer flex items-center gap-1.5">
                        📂 {t('Upload Extraction CSV', 'رفع ملف الاستخراج CSV')}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>

                    {papers.length > 0 && (
                        <button
                            onClick={handleInsertComparisonTable}
                            className="futuristic-btn-ghost py-1 px-2.5 text-xs text-slate-300 hover:text-white"
                            title={t('Insert comparison table into active document', 'إدراج جدول مقارنة في المستند')}
                        >
                            📑 {t('Insert Table', 'إدراج جدول')}
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {papers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30 space-y-3">
                    <div className="text-3xl">📋</div>
                    <h3 className="text-sm font-semibold text-white">
                        {t('No Literature Survey Data Loaded', 'لم يتم تحميل بيانات مسح أدبي')}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                        {t(
                            'Upload a data_extraction.csv containing methodological metadata (e.g. Optimization Type, Temporal Resolution, Storage, Ramping, Uncertainty) to explore, filter, and synthesize papers interactively.',
                            'قم برفع ملف data_extraction.csv يحتوي على البيانات المنهجية للأوراق (مثل نوع التحسين، الدقة الزمنية، التخزين، قيود التسارع، عدم اليقين) للاستكشاف والمقارنة التفاعلية.'
                        )}
                    </p>
                    <label className="futuristic-btn-primary py-2 px-4 text-xs cursor-pointer mt-2 inline-block">
                        📁 {t('Select data_extraction.csv', 'اختر ملف data_extraction.csv')}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            ) : (
                <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                    {/* Filters Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div className="col-span-2">
                            <input
                                type="text"
                                placeholder={t('Search title, author, test system...', 'بحث في العنوان، المؤلف، شبكة الاختبار...')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="futuristic-input w-full py-1 px-2 text-xs"
                            />
                        </div>

                        <select
                            value={filterOptType}
                            onChange={e => setFilterOptType(e.target.value)}
                            className="futuristic-input py-1 px-1.5 text-[11px]"
                        >
                            <option value="all">{t('Opt Type: All', 'التحسين: الكل')}</option>
                            {optTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>

                        <select
                            value={filterUncertainty}
                            onChange={e => setFilterUncertainty(e.target.value)}
                            className="futuristic-input py-1 px-1.5 text-[11px]"
                        >
                            <option value="all">{t('Uncertainty: All', 'عدم اليقين: الكل')}</option>
                            {uncertainties.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <select
                            value={filterStorage}
                            onChange={e => setFilterStorage(e.target.value)}
                            className="futuristic-input py-1 px-1.5 text-[11px]"
                        >
                            <option value="all">{t('Storage: All', 'التخزين: الكل')}</option>
                            <option value="yes">Yes (يوجد)</option>
                            <option value="no">No (لا يوجد)</option>
                        </select>

                        <select
                            value={filterResolution}
                            onChange={e => setFilterResolution(e.target.value)}
                            className="futuristic-input py-1 px-1.5 text-[11px]"
                        >
                            <option value="all">{t('Resolution: All', 'الدقة: الكل')}</option>
                            {resolutions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {/* Main Split: Paper List vs Inspector */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden min-h-0">
                        {/* Table / List View */}
                        <div className="md:col-span-7 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/40 divide-y divide-slate-800/60">
                            {filteredPapers.map((paper, idx) => {
                                const isSelected = selectedPaper?.title === paper.title;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedPaper(paper)}
                                        className={`p-3 cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-amber-500/15 border-l-4 border-amber-500' 
                                                : 'hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                                                    {paper.title}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                                                    <span>{paper.first_author || 'Unknown'} ({paper.year || 'N/A'})</span>
                                                    <span>•</span>
                                                    <span className="text-slate-300 font-mono">{paper.venue || 'Journal/Conf'}</span>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {paper.validation_overall_status && (
                                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                                    paper.validation_overall_status === 'VALIDATED' 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {paper.validation_overall_status}
                                                </span>
                                            )}
                                        </div>

                                        {/* Parameter Chips */}
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            {paper.optimization_type && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                                                    ⚡ {paper.optimization_type}
                                                </span>
                                            )}
                                            {paper.uncertainty_method && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                                                    🎲 {paper.uncertainty_method}
                                                </span>
                                            )}
                                            {paper.optimization_control_interval && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono">
                                                    ⏱️ {paper.optimization_control_interval}
                                                </span>
                                            )}
                                            {paper.includes_energy_storage === 'yes' && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                                                    🔋 Storage
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Detailed Paper Inspector Panel */}
                        <div className="md:col-span-5 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/70 p-3.5 space-y-3">
                            {selectedPaper ? (
                                <>
                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 mb-1">
                                            {selectedPaper.paper_type || 'Original Research'}
                                        </span>
                                        <h3 className="text-xs font-bold text-white leading-snug">
                                            {selectedPaper.title}
                                        </h3>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {selectedPaper.first_author} et al. • {selectedPaper.year} • {selectedPaper.venue}
                                        </p>
                                    </div>

                                    {/* Parameters Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Optimization</span>
                                            <span className="text-slate-200 font-mono font-semibold">{selectedPaper.optimization_type || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Uncertainty</span>
                                            <span className="text-slate-200 font-semibold">{selectedPaper.uncertainty_method || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Control Interval</span>
                                            <span className="text-amber-400 font-mono font-semibold">{selectedPaper.optimization_control_interval || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Horizon</span>
                                            <span className="text-slate-200 font-mono">{selectedPaper.scheduling_horizon || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Test System</span>
                                            <span className="text-slate-200 truncate block">{selectedPaper.test_system || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Storage</span>
                                            <span className="text-emerald-400">{selectedPaper.includes_energy_storage === 'yes' ? (selectedPaper.storage_technologies || 'Yes') : 'No'}</span>
                                        </div>
                                    </div>

                                    {/* Contributions & Proofs */}
                                    {selectedPaper.main_contribution_quote && (
                                        <div className="space-y-1">
                                            <h4 className="text-[11px] font-semibold text-slate-300">💡 Main Contribution</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80 italic">
                                                "{selectedPaper.main_contribution_quote}"
                                            </p>
                                        </div>
                                    )}

                                    {selectedPaper.key_finding_quote && (
                                        <div className="space-y-1">
                                            <h4 className="text-[11px] font-semibold text-slate-300">🎯 Key Finding</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80 italic">
                                                "{selectedPaper.key_finding_quote}"
                                            </p>
                                        </div>
                                    )}

                                    {selectedPaper.justification_sub_hourly_quote && (
                                        <div className="space-y-1">
                                            <h4 className="text-[11px] font-semibold text-amber-400/90">⏱️ Sub-Hourly Justification</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed bg-amber-500/5 p-2 rounded border border-amber-500/20 italic">
                                                "{selectedPaper.justification_sub_hourly_quote}"
                                            </p>
                                        </div>
                                    )}

                                    {selectedPaper.limitations_quote && (
                                        <div className="space-y-1">
                                            <h4 className="text-[11px] font-semibold text-slate-400">⚠️ Limitations & Future Work</h4>
                                            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/80 italic">
                                                "{selectedPaper.limitations_quote}"
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center p-4">
                                    {t('Select a paper from the list to inspect its extracted parameters and verbatim quotes', 'اختر ورقة من القائمة لمعاينة معاملاتها ونصوص الاقتباسات المنهجية')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
