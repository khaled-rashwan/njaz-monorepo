'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { searchAllSources } from '@/lib/literature-api';
import { LiteratureSearchResult } from '@/types';
import { PaperCard } from './PaperCard';
import { parseBibTeX, parseRIS, parseDOIs, parseTextCitations, cleanRawCitation } from '@/lib/citation-parsers';

export function LiteratureSurvey({ projectId }: { projectId: string }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'search' | 'bulk'>('search');
    
    // Search tab states
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<LiteratureSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [sources, setSources] = useState<('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books')[]>(['openalex', 'semantic_scholar', 'crossref', 'isbn_books']);
    
    // Bulk tab states
    const [bulkText, setBulkText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const [pushed, setPushed] = useState(false);

    const { addLiteratureItem, literatureItems, createResearchBlock, updateResearchBlockContent, researchBlocks, saveCanvasLayout } = useEditorStore();

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const data = await searchAllSources(query, sources, 15);
            setResults(data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCollect = (paper: LiteratureSearchResult) => {
        if (!projectId) return;
        setPushed(false); // Reset pushed state when new items are collected
        addLiteratureItem({
            projectId: projectId,
            source: paper.source,
            externalId: paper.externalId,
            title: paper.title,
            authors: paper.authors,
            year: paper.year,
            journal: paper.journal,
            abstract: paper.abstract,
            citationCount: paper.citationCount,
            doi: paper.doi,
            url: paper.url,
            fullMetadata: paper.rawData,
            tags: [],
            notes: '',
        });
    };

    const isCollected = (paper: LiteratureSearchResult) => {
        return literatureItems.some(i =>
            (i.doi && paper.doi && i.doi === paper.doi) ||
            (i.externalId === paper.externalId && i.source === paper.source)
        );
    };

    const toggleSource = (source: 'openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books') => {
        setSources(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const handleBulkImport = async () => {
        const text = bulkText.trim();
        if (!text) return;
        setIsImporting(true);
        setImportStatus(t('Parsing references...', 'جاري تحليل المراجع...'));

        try {
            let parsedItems: any[] = [];
            if (text.includes('@') && text.includes('{')) {
                parsedItems = parseBibTeX(text);
            } else if (text.includes('TY  -') || text.includes('ER  -')) {
                parsedItems = parseRIS(text);
            } else {
                const textQueries = parseTextCitations(text);
                const dois = parseDOIs(text);
                const isPureDoiList = dois.length > 0 && (textQueries.length <= 1 || text.length / dois.length < 100);

                if (isPureDoiList) {
                    const resolvedDOIs: any[] = [];
                    for (let i = 0; i < dois.length; i += 3) {
                        setImportStatus(t(`Fetching DOI metadata (${i}/${dois.length})...`, `جاري جلب بيانات المعرف الرقمي (${i}/${dois.length})...`));
                        const chunk = dois.slice(i, i + 3);
                        const results = await Promise.all(
                            chunk.map(async (doi) => {
                                try {
                                    const res = await searchAllSources(doi);
                                    return res[0] || null;
                                } catch {
                                    return null;
                                }
                            })
                        );
                        resolvedDOIs.push(...(results.filter((r): r is any => r !== null)));
                    }
                    parsedItems = resolvedDOIs;
                } else {
                    if (textQueries.length > 0) {
                        const resolvedCitations = [];
                        for (let i = 0; i < textQueries.length; i += 2) {
                            setImportStatus(t(`Resolving reference string (${i}/${textQueries.length})...`, `جاري جلب بيانات المرجع (${i}/${textQueries.length})...`));
                            const chunk = textQueries.slice(i, i + 2);
                            const results = await Promise.all(
                                chunk.map(async (q) => {
                                    try {
                                        const searchQueryString = q.parsedDoi || q.parsedTitle || cleanRawCitation(q.rawText);
                                        const res = await searchAllSources(searchQueryString);
                                        if (res && res.length > 0) {
                                            return res[0];
                                        }
                                        return null;
                                    } catch {
                                        return null;
                                    }
                                })
                            );
                            resolvedCitations.push(...(results.filter((r): r is any => r !== null)));
                        }
                        parsedItems = resolvedCitations;
                    }
                }
            }

            // Now save each parsed item to the project's library via addLiteratureItem
            if (parsedItems.length > 0) {
                let addedCount = 0;
                for (const item of parsedItems) {
                    const exists = literatureItems.some(i => 
                        (i.doi && item.doi && i.doi === item.doi) || 
                        (i.title.toLowerCase() === item.title.toLowerCase())
                    );
                    if (!exists) {
                        await addLiteratureItem({
                            projectId,
                            source: item.source || 'openalex',
                            externalId: item.externalId || item.doi || Math.random().toString(),
                            title: item.title,
                            authors: item.authors || [],
                            year: item.year,
                            journal: item.journal,
                            abstract: item.abstract,
                            doi: item.doi,
                            url: item.url,
                            tags: [],
                            notes: '',
                        });
                        addedCount++;
                    }
                }
                setImportStatus(t(`Successfully imported ${addedCount} new papers into your library!`, `تم استيراد ${addedCount} أوراق بحثية جديدة إلى مكتبتك بنجاح!`));
                setBulkText('');
                setPushed(false);
            } else {
                setImportStatus(t('No matching papers could be resolved from the pasted text.', 'لم يتم العثور على أوراق مطابقة من النص الملصق.'));
            }
        } catch (error) {
            console.error(error);
            setImportStatus(t('An error occurred during import.', 'حدث خطأ أثناء الاستيراد.'));
        } finally {
            setIsImporting(false);
        }
    };

    const handlePushToCanvas = async () => {
        if (literatureItems.length === 0) return;
        try {
            const existingBlock = researchBlocks.find(b => b.type === 'reference-collection');
            if (existingBlock) {
                const newTitle = `References (${literatureItems.length} papers)`;
                const updatedBlocks = researchBlocks.map(b => 
                    b.id === existingBlock.id 
                        ? { 
                            ...b, 
                            title: newTitle, 
                            content: {
                                itemCount: literatureItems.length,
                                titles: literatureItems.slice(0, 5).map(i => i.title),
                            }
                          } 
                        : b
                );
                
                useEditorStore.setState({
                    researchBlocks: updatedBlocks,
                    canvasLayout: { ...useEditorStore.getState().canvasLayout, researchBlocks: updatedBlocks }
                });
                
                await saveCanvasLayout(projectId);
            } else {
                const blockId = await createResearchBlock(
                    projectId,
                    'reference-collection',
                    `References (${literatureItems.length} papers)`
                );
                updateResearchBlockContent(blockId, {
                    itemCount: literatureItems.length,
                    titles: literatureItems.slice(0, 5).map(i => i.title),
                });
            }
            setPushed(true);
        } catch (err) {
            console.error('Failed to push references to canvas:', err);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                    {t('Literature Survey', 'مسح الأدبيات')}
                </h3>
                
                {/* Tab Switcher */}
                <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px]">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            activeTab === 'search' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-350'
                        }`}
                    >
                        {t('Search', 'بحث')}
                    </button>
                    <button
                        onClick={() => setActiveTab('bulk')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                            activeTab === 'bulk' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-350'
                        }`}
                    >
                        {t('Bulk Import', 'استيراد جماعي')}
                    </button>
                </div>
            </div>

            {/* Collected Count + Push to Canvas */}
            {literatureItems.length > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                    <span className="text-xs text-indigo-300 font-medium flex items-center gap-1">
                        <span>📚</span>
                        <span>{literatureItems.length} {t('references collected', 'مراجع مجمعة')}</span>
                    </span>
                    <button
                        onClick={handlePushToCanvas}
                        disabled={pushed}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-colors ${
                            pushed
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                        }`}
                    >
                        {pushed ? '✓ On Canvas' : 'Push to Canvas'}
                    </button>
                </div>
            )}

            {/* Tab: Search */}
            {activeTab === 'search' && (
                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="flex gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={t('Search papers...', 'ابحث عن أوراق...')}
                            className="futuristic-input text-sm flex-1"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !query.trim()}
                            className="futuristic-btn-primary text-sm px-3 py-2 disabled:opacity-50"
                        >
                            {isSearching ? '...' : '🔍'}
                        </button>
                    </div>

                    {/* Source Filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {([
                            { key: 'openalex' as const, label: 'OpenAlex' },
                            { key: 'semantic_scholar' as const, label: 'Semantic Scholar' },
                            { key: 'crossref' as const, label: 'CrossRef' },
                            { key: 'isbn_books' as const, label: t('ISBN / Books', 'معرف الكتب') },
                        ]).map(s => (
                            <button
                                key={s.key}
                                onClick={() => toggleSource(s.key)}
                                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                                    sources.includes(s.key)
                                        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                                        : 'text-slate-600 border-slate-700/30 hover:border-slate-600/50'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-xs text-slate-500">
                                {results.length} {t('results found', 'نتيجة')}
                            </span>
                            {results.map((paper, idx) => (
                                <PaperCard
                                    key={`${paper.source}-${paper.externalId}-${idx}`}
                                    paper={paper}
                                    onCollect={handleCollect}
                                    isCollected={isCollected(paper)}
                                    compact
                                />
                            ))}
                        </div>
                    )}

                    {isSearching && (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Bulk Import */}
            {activeTab === 'bulk' && (
                <div className="space-y-3">
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={t(
                            "Paste list of DOIs, BibTeX, RIS format, or raw text reference bibliography list here...",
                            "قم بلصق قائمة المعرفات الرقمية (DOIs)، أو صيغة BibTeX، أو RIS، أو النص العادي للمراجع هنا..."
                        )}
                        rows={10}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg p-3 text-xs text-slate-200 outline-none resize-none font-mono"
                    />

                    {importStatus && (
                        <p className="text-[11px] text-amber-400 font-medium bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
                            {importStatus}
                        </p>
                    )}

                    <button
                        onClick={handleBulkImport}
                        disabled={isImporting || !bulkText.trim()}
                        className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                        {isImporting && <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-amber-950 rounded-full animate-spin" />}
                        <span>{isImporting ? t('Importing...', 'جاري الاستيراد...') : t('Bulk Import References', 'استيراد جماعي للمراجع')}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
