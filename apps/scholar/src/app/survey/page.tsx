'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';

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

export default function SurveyAnalysisPage() {
    const { t, direction } = useLanguage();
    const [papers, setPapers] = useState<SurveyPaperRow[]>([]);
    const [selectedPaper, setSelectedPaper] = useState<SurveyPaperRow | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'matrix' | 'visualizer' | 'stats'>('matrix');

    // Matrix Filters
    const [filterDomain, setFilterDomain] = useState('all');
    const [filterOptType, setFilterOptType] = useState('all');
    const [filterUncertainty, setFilterUncertainty] = useState('all');
    const [filterStorage, setFilterStorage] = useState('all');
    const [filterResolution, setFilterResolution] = useState('all');
    const [filterScale, setFilterScale] = useState('all');

    // Visualizer canvas ref
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodeLimit, setNodeLimit] = useState(50);
    const [graphMode, setGraphMode] = useState<'network' | 'timeline' | 'clustering'>('network');

    // Parse CSV
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
                (p.test_system && p.test_system.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.solution_method && p.solution_method.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesDomain = filterDomain === 'all' || p.application_domain === filterDomain;
            const matchesOpt = filterOptType === 'all' || p.optimization_type === filterOptType;
            const matchesUncertainty = filterUncertainty === 'all' || p.uncertainty_method === filterUncertainty;
            const matchesStorage = filterStorage === 'all' || p.includes_energy_storage === filterStorage;
            const matchesRes = filterResolution === 'all' || p.temporal_resolution_approach === filterResolution;
            const matchesScale = filterScale === 'all' || p.system_scale === filterScale;

            return matchesSearch && matchesDomain && matchesOpt && matchesUncertainty && matchesStorage && matchesRes && matchesScale;
        });
    }, [papers, searchTerm, filterDomain, filterOptType, filterUncertainty, filterStorage, filterResolution, filterScale]);

    // Unique options
    const optTypes = useMemo(() => Array.from(new Set(papers.map(p => p.optimization_type).filter(Boolean))), [papers]);
    const uncertainties = useMemo(() => Array.from(new Set(papers.map(p => p.uncertainty_method).filter(Boolean))), [papers]);
    const resolutions = useMemo(() => Array.from(new Set(papers.map(p => p.temporal_resolution_approach).filter(Boolean))), [papers]);
    const scales = useMemo(() => Array.from(new Set(papers.map(p => p.system_scale).filter(Boolean))), [papers]);

    // Stats calculations
    const stats = useMemo(() => {
        if (papers.length === 0) return null;
        const optCount: Record<string, number> = {};
        const uncertCount: Record<string, number> = {};
        const yearCount: Record<string, number> = {};
        let storageCount = 0;
        let rampingCount = 0;

        papers.forEach(p => {
            if (p.optimization_type) optCount[p.optimization_type] = (optCount[p.optimization_type] || 0) + 1;
            if (p.uncertainty_method) uncertCount[p.uncertainty_method] = (uncertCount[p.uncertainty_method] || 0) + 1;
            if (p.year) yearCount[p.year] = (yearCount[p.year] || 0) + 1;
            if (p.includes_energy_storage === 'yes') storageCount++;
            if (p.models_ramping_constraints === 'yes') rampingCount++;
        });

        return {
            optCount,
            uncertCount,
            yearCount,
            storageCount,
            rampingCount,
            total: papers.length
        };
    }, [papers]);

    // Visualizer Animation
    useEffect(() => {
        if (activeTab !== 'visualizer' || !canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        updateSize();

        const activeList = filteredPapers.slice(0, nodeLimit);
        const nodes = activeList.map((p, idx) => {
            const angle = (idx / Math.max(1, activeList.length)) * Math.PI * 2;
            const dist = 160 + (idx % 4) * 50;
            return {
                paper: p,
                x: container.clientWidth / 2 + Math.cos(angle) * dist,
                y: container.clientHeight / 2 + Math.sin(angle) * dist,
                vx: 0,
                vy: 0,
                radius: p.includes_energy_storage === 'yes' ? 14 : 10,
                color: p.optimization_type === 'MILP' ? '#f59e0b' : p.optimization_type === 'NLP' ? '#38bdf8' : '#a855f7'
            };
        });

        let animationId: number;
        const render = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            ctx.clearRect(0, 0, width, height);

            // Simulation step
            nodes.forEach((n1, i) => {
                nodes.forEach((n2, j) => {
                    if (i === j) return;
                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (dist < 80) {
                        const force = (80 - dist) / 80 * 0.4;
                        n1.vx -= (dx / dist) * force;
                        n1.vy -= (dy / dist) * force;
                    }
                });

                const cdx = width / 2 - n1.x;
                const cdy = height / 2 - n1.y;
                n1.vx += cdx * 0.0015;
                n1.vy += cdy * 0.0015;

                n1.x += n1.vx;
                n1.y += n1.vy;
                n1.vx *= 0.88;
                n1.vy *= 0.88;

                // Draw node
                ctx.beginPath();
                ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
                ctx.fillStyle = n1.color;
                ctx.shadowColor = n1.color;
                ctx.shadowBlur = selectedPaper?.title === n1.paper.title ? 14 : 4;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Label
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                const label = `${n1.paper.first_author || 'Paper'} (${n1.paper.year || 'N/A'})`;
                ctx.fillText(label, n1.x, n1.y + n1.radius + 12);
            });

            animationId = requestAnimationFrame(render);
        };
        render();

        const handleCanvasClick = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const clicked = nodes.find(n => {
                const dx = n.x - mouseX;
                const dy = n.y - mouseY;
                return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
            });
            if (clicked) {
                setSelectedPaper(clicked.paper);
            }
        };

        canvas.addEventListener('click', handleCanvasClick);
        window.addEventListener('resize', updateSize);

        return () => {
            cancelAnimationFrame(animationId);
            canvas.removeEventListener('click', handleCanvasClick);
            window.removeEventListener('resize', updateSize);
        };
    }, [activeTab, filteredPapers, nodeLimit, selectedPaper]);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg text-slate-100" dir={direction}>
            <SharedHeader currentApp="scholar" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-20 pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col space-y-4">
                {/* Top Banner & Mode Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                🔬 {t('Full-Scale Literature Survey', 'المسح الأدبي الشامل')}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                ({filteredPapers.length}/{papers.length} {t('papers loaded', 'ورقة محملة')})
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            {t('Literature Survey & Synthesis Workbench', 'بيئة تحليل ومسح الأدبيات العلمية')}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => setActiveTab('matrix')}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'matrix' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                📋 {t('Comparative Matrix', 'مصفوفة المقارنة')}
                            </button>
                            <button
                                onClick={() => setActiveTab('visualizer')}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'visualizer' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🕸️ {t('Interactive Landscape', 'الرسم التفاعلي')}
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                                    activeTab === 'stats' ? 'bg-amber-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                📊 {t('Statistical Analytics', 'التحليلات الإحصائية')}
                            </button>
                        </div>

                        <label className="futuristic-btn-primary py-2 px-4 text-xs cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/10">
                            📂 {t('Upload Extraction CSV', 'رفع ملف الاستخراج CSV')}
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Empty State */}
                {papers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 my-8 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl">
                            📋
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {t('No Literature Extraction Data Loaded', 'لم يتم تحميل ملف البيانات بعد')}
                        </h2>
                        <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                            {t(
                                'Upload your data_extraction.csv or master_results.csv to unlock full cross-paper comparison, verbatim quote inspection, and multi-dimensional methodological clustering.',
                                'قم برفع ملف data_extraction.csv أو master_results.csv للبدء في تحليل ومقارنة الأوراق، معاينة الاقتباسات المنهجية، والمخططات التفاعلية.'
                            )}
                        </p>
                        <label className="futuristic-btn-primary py-3 px-6 text-sm cursor-pointer shadow-xl shadow-amber-500/20">
                            📁 {t('Choose CSV File to Analyze', 'اختر ملف CSV للبدء')}
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col space-y-4 min-h-0">
                        {/* Global Filters */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 bg-slate-900/70 p-3 rounded-2xl border border-slate-800 shadow-lg text-xs">
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder={t('Search title, author, test system, method...', 'بحث شامل في العنوان، المؤلف، الشبكة، الخوارزمية...')}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="futuristic-input w-full py-1.5 px-3 text-xs"
                                />
                            </div>

                            <select
                                value={filterOptType}
                                onChange={e => setFilterOptType(e.target.value)}
                                className="futuristic-input py-1.5 px-2 text-xs"
                            >
                                <option value="all">{t('Opt: All', 'التحسين: الكل')}</option>
                                {optTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>

                            <select
                                value={filterUncertainty}
                                onChange={e => setFilterUncertainty(e.target.value)}
                                className="futuristic-input py-1.5 px-2 text-xs"
                            >
                                <option value="all">{t('Uncertainty: All', 'عدم اليقين: الكل')}</option>
                                {uncertainties.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>

                            <select
                                value={filterResolution}
                                onChange={e => setFilterResolution(e.target.value)}
                                className="futuristic-input py-1.5 px-2 text-xs"
                            >
                                <option value="all">{t('Resolution: All', 'الدقة: الكل')}</option>
                                {resolutions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <select
                                value={filterScale}
                                onChange={e => setFilterScale(e.target.value)}
                                className="futuristic-input py-1.5 px-2 text-xs"
                            >
                                <option value="all">{t('Scale: All', 'حجم الشبكة: الكل')}</option>
                                {scales.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <select
                                value={filterStorage}
                                onChange={e => setFilterStorage(e.target.value)}
                                className="futuristic-input py-1.5 px-2 text-xs"
                            >
                                <option value="all">{t('Storage: All', 'التخزين: الكل')}</option>
                                <option value="yes">Yes (يوجد)</option>
                                <option value="no">No (لا يوجد)</option>
                            </select>
                        </div>

                        {/* TAB 1: Comparative Matrix */}
                        {activeTab === 'matrix' && (
                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[600px]">
                                {/* Paper List Table */}
                                <div className="lg:col-span-7 flex flex-col border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden">
                                    <div className="overflow-x-auto flex-1">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold sticky top-0 z-10 backdrop-blur-md">
                                                    <th className="p-3">Paper / Author</th>
                                                    <th className="p-3">Optimization</th>
                                                    <th className="p-3">Uncertainty</th>
                                                    <th className="p-3">Interval</th>
                                                    <th className="p-3">Storage</th>
                                                    <th className="p-3">Scale</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/60">
                                                {filteredPapers.map((paper, idx) => {
                                                    const isSelected = selectedPaper?.title === paper.title;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => setSelectedPaper(paper)}
                                                            className={`cursor-pointer transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-amber-500/15 text-white font-medium' 
                                                                    : 'hover:bg-slate-800/40 text-slate-300'
                                                            }`}
                                                        >
                                                            <td className="p-3 max-w-[260px]">
                                                                <p className="font-semibold text-white truncate">{paper.title}</p>
                                                                <p className="text-[11px] text-slate-500">{paper.first_author || 'N/A'} ({paper.year || 'N/A'})</p>
                                                            </td>
                                                            <td className="p-3 font-mono text-sky-400">{paper.optimization_type || '-'}</td>
                                                            <td className="p-3 text-purple-300">{paper.uncertainty_method || '-'}</td>
                                                            <td className="p-3 font-mono text-amber-400">{paper.optimization_control_interval || '-'}</td>
                                                            <td className="p-3">
                                                                {paper.includes_energy_storage === 'yes' ? (
                                                                    <span className="text-emerald-400 font-semibold">✓ {paper.storage_technologies?.split(',')[0] || 'Yes'}</span>
                                                                ) : (
                                                                    <span className="text-slate-500">No</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-slate-400 truncate max-w-[120px]">{paper.system_scale || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Deep-Dive Inspector Panel */}
                                <div className="lg:col-span-5 flex flex-col border border-slate-800 rounded-2xl bg-slate-900/80 p-5 space-y-4 overflow-y-auto max-h-[750px]">
                                    {selectedPaper ? (
                                        <>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                                        {selectedPaper.paper_type || 'Research Paper'}
                                                    </span>
                                                    {selectedPaper.validation_overall_status && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                                            {selectedPaper.validation_overall_status}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-base font-bold text-white leading-snug">
                                                    {selectedPaper.title}
                                                </h3>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {selectedPaper.first_author} et al. • {selectedPaper.year} • <span className="text-amber-400/90">{selectedPaper.venue}</span>
                                                </p>
                                            </div>

                                            {/* Parameters Grid */}
                                            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Optimization Type</span>
                                                    <span className="text-sky-300 font-mono font-bold">{selectedPaper.optimization_type || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Uncertainty</span>
                                                    <span className="text-purple-300 font-bold">{selectedPaper.uncertainty_method || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Control Interval</span>
                                                    <span className="text-amber-400 font-mono font-bold">{selectedPaper.optimization_control_interval || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Scheduling Horizon</span>
                                                    <span className="text-slate-200 font-mono">{selectedPaper.scheduling_horizon || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Test Grid</span>
                                                    <span className="text-slate-200">{selectedPaper.test_system || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Storage & Ramping</span>
                                                    <span className="text-emerald-400">{selectedPaper.includes_energy_storage === 'yes' ? 'Storage ✓' : 'No Storage'} • {selectedPaper.models_ramping_constraints === 'yes' ? 'Ramping ✓' : 'No Ramping'}</span>
                                                </div>
                                            </div>

                                            {/* Proofs & Quotes */}
                                            {selectedPaper.main_contribution_quote && (
                                                <div className="space-y-1.5">
                                                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                                        💡 Main Contribution
                                                    </h4>
                                                    <blockquote className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800 italic">
                                                        "{selectedPaper.main_contribution_quote}"
                                                    </blockquote>
                                                </div>
                                            )}

                                            {selectedPaper.key_finding_quote && (
                                                <div className="space-y-1.5">
                                                    <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                                        🎯 Key Finding
                                                    </h4>
                                                    <blockquote className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800 italic">
                                                        "{selectedPaper.key_finding_quote}"
                                                    </blockquote>
                                                </div>
                                            )}

                                            {selectedPaper.justification_sub_hourly_quote && (
                                                <div className="space-y-1.5">
                                                    <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                                        ⏱️ Sub-Hourly Justification Proof
                                                    </h4>
                                                    <blockquote className="text-xs text-amber-300/80 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 italic">
                                                        "{selectedPaper.justification_sub_hourly_quote}"
                                                    </blockquote>
                                                </div>
                                            )}

                                            {selectedPaper.limitations_quote && (
                                                <div className="space-y-1.5">
                                                    <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                                        ⚠️ Acknowledged Limitations & Future Work
                                                    </h4>
                                                    <blockquote className="text-xs text-slate-500 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800 italic">
                                                        "{selectedPaper.limitations_quote}"
                                                    </blockquote>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center">
                                            {t('Select a paper on the left to inspect its detailed parameters and quotes', 'اختر ورقة من الجدول على اليسار لعرض التفاصيل والاقتباسات')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Visualizer Landscape */}
                        {activeTab === 'visualizer' && (
                            <div className="flex-1 flex flex-col border border-slate-800 rounded-2xl bg-slate-900/40 p-4 space-y-3 min-h-[600px]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> MILP</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> NLP</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Other / SOCP</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span>{t('Density', 'عدد العقد')}:</span>
                                        <select
                                            value={nodeLimit}
                                            onChange={e => setNodeLimit(parseInt(e.target.value))}
                                            className="futuristic-input py-1 px-2 text-xs"
                                        >
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                <div ref={containerRef} className="relative flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden min-h-[500px]">
                                    <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Statistical Analytics */}
                        {activeTab === 'stats' && stats && (
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="futuristic-card p-6 space-y-3">
                                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                                        ⚡ Optimization Formulations
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries(stats.optCount).map(([type, count]) => (
                                            <div key={type} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300 font-mono">{type}</span>
                                                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">{count} ({Math.round(count / stats.total * 100)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="futuristic-card p-6 space-y-3">
                                    <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider">
                                        🎲 Uncertainty Paradigms
                                    </h3>
                                    <div className="space-y-2">
                                        {Object.entries(stats.uncertCount).map(([type, count]) => (
                                            <div key={type} className="flex justify-between items-center text-xs">
                                                <span className="text-slate-300">{type}</span>
                                                <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold">{count} ({Math.round(count / stats.total * 100)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="futuristic-card p-6 space-y-3">
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                                        🔋 Flexibility & Storage Models
                                    </h3>
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Models Energy Storage (BESS)</span>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{stats.storageCount} / {stats.total}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-300">Models Dynamic Ramping Constraints</span>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{stats.rampingCount} / {stats.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
