'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { searchAllSources } from '@/lib/literature-api';
import { LiteratureSearchResult, ScholarBlock } from '@/types';
import { PaperCard } from './PaperCard';
import { parseBibTeX, parseRIS, parseDOIs, parseTextCitations, cleanRawCitation } from '@/lib/citation-parsers';
import { client } from '@/lib/amplify-client';
import { v4 as uuidv4 } from 'uuid';

export function LiteratureSurvey({ projectId, blockId }: { projectId: string; blockId?: string }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'search' | 'bulk'>('search');
    
    const { addLiteratureItem, literatureItems, createResearchBlock, updateResearchBlockContent, researchBlocks, saveCanvasLayout } = useEditorStore();
    const rb = blockId ? researchBlocks.find(b => b.id === blockId) : null;
    const isRefCollection = rb?.type === 'reference-collection';

    // Search tab states initialized optionally from block content
    const [query, setQuery] = useState(rb?.content?.query || '');
    const [results, setResults] = useState<LiteratureSearchResult[]>(rb?.content?.results || []);
    const [isSearching, setIsSearching] = useState(false);
    const [sources, setSources] = useState<('openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books' | 'ieee_xplore' | 'figshare')[]>(
        rb?.content?.sources || ['openalex', 'semantic_scholar', 'crossref', 'ieee_xplore', 'figshare']
    );
    const [startYear, setStartYear] = useState(rb?.content?.startYear || '');
    const [endYear, setEndYear] = useState(rb?.content?.endYear || '');
    const [isOa, setIsOa] = useState(rb?.content?.isOa || false);
    const [publisher, setPublisher] = useState(rb?.content?.publisher || '');
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // AI Search Assistant states
    const [researchObjective, setResearchObjective] = useState(rb?.content?.researchObjective || '');
    const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
    const [suggestedQueries, setSuggestedQueries] = useState<{ query: string; description: string }[]>(rb?.content?.suggestedQueries || []);

    // Bulk tab states
    const [bulkText, setBulkText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const [pushed, setPushed] = useState(false);

    const handleSearch = async (searchQuery?: string) => {
        const queryToUse = searchQuery || query;
        if (!queryToUse.trim()) return;
        setIsSearching(true);
        try {
            const startNum = startYear ? parseInt(startYear, 10) : undefined;
            const endNum = endYear ? parseInt(endYear, 10) : undefined;
            const data = await searchAllSources(queryToUse, sources, 15, startNum, endNum, isOa, publisher);
            setResults(data);
            
            if (blockId && rb) {
                updateResearchBlockContent(blockId, {
                    ...rb.content,
                    query: queryToUse,
                    results: data,
                    startYear,
                    endYear,
                    isOa,
                    publisher,
                    sources,
                });
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestQueries = async () => {
        if (!researchObjective.trim()) return;
        setIsGeneratingQueries(true);
        setSuggestedQueries([]);
        
        try {
            const prompt = `You are an academic search assistant. The user wants to perform a literature survey.
Their research objective/need is: "${researchObjective}"

Generate 4 optimized, distinct academic search queries (using Boolean operators like AND, OR, quotes if needed) that they can use to search APIs like OpenAlex, Semantic Scholar, and CrossRef.
Also provide a short 1-sentence description/rationale for each query showing what it targets.

Respond ONLY with a JSON array in this exact format:
[
  {
    "query": "query string",
    "description": "short description"
  }
]
No markdown wrapping (like \`\`\`json), no other text. Just the raw JSON array.`;

            const response = await fetch('/api/llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate suggestions');
            }

            const data = await response.json();
            let resultText = data.result || '';
            
            // Clean markdown code blocks if the model ignored the instructions
            if (resultText.startsWith('```')) {
                const matches = resultText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (matches && matches[1]) {
                    resultText = matches[1];
                }
            }
            
            const parsed = JSON.parse(resultText.trim());
            if (Array.isArray(parsed)) {
                setSuggestedQueries(parsed);
                if (blockId && rb) {
                    updateResearchBlockContent(blockId, {
                        ...rb.content,
                        researchObjective,
                        suggestedQueries: parsed,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to suggest queries:', error);
        } finally {
            setIsGeneratingQueries(false);
        }
    };

    const handleApplySuggestion = (suggestedQuery: string) => {
        setQuery(suggestedQuery);
        handleSearch(suggestedQuery);
    };

    const handleCollect = (paper: LiteratureSearchResult) => {
        if (!projectId) return;
        setPushed(false); // Reset pushed state when new items are collected
        
        // Add to global library
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

        // Add to specific search block local collection
        if (blockId && rb) {
            if (isRefCollection) {
                const currentPapers = rb.content?.papers || [];
                const alreadyInLocal = currentPapers.some((i: any) =>
                    (i.doi && paper.doi && i.doi === paper.doi) ||
                    (i.externalId === paper.externalId && i.source === paper.source)
                );
                if (!alreadyInLocal) {
                    const newPapers = [...currentPapers, paper];
                    updateResearchBlockContent(blockId, {
                        ...rb.content,
                        papers: newPapers,
                        itemCount: newPapers.length,
                    });

                    // Sync to document: Add REFERENCE block
                    const activeDoc = useEditorStore.getState().document;
                    if (activeDoc) {
                        const rawFirstAuthor = paper.authors && paper.authors.length > 0 ? paper.authors[0] : null;
                        const firstAuthorStr = typeof rawFirstAuthor === 'string' 
                            ? rawFirstAuthor 
                            : (rawFirstAuthor && typeof rawFirstAuthor === 'object' ? rawFirstAuthor.name : '') || 'Unknown';
                        const firstAuthorName = firstAuthorStr.split(' ').pop() || 'Unknown';
                        const citationKey = `${firstAuthorName}, ${paper.year || 'n.d.'}`;
                        
                        const formatAuthorsList = (authors: any[]) => {
                            if (!authors || !Array.isArray(authors)) return 'Unknown Author';
                            const names = authors
                                .map(a => {
                                    if (typeof a === 'string') return a.trim();
                                    if (a && typeof a === 'object') return (a.name || '').trim();
                                    return '';
                                })
                                .filter(name => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'unknown author');
                            if (names.length === 0) return 'Unknown Author';
                            return names.join(', ');
                        };

                        const formattedCitation = `${formatAuthorsList(paper.authors)}, "${paper.title}", ${paper.year || 'n.d.'}.`;
                        const orderIndex = Date.now();
                        const refBlock: ScholarBlock = {
                            id: uuidv4(),
                            documentId: activeDoc.id,
                            type: 'REFERENCE',
                            content: {
                                literatureItemId: (paper as any).id || paper.externalId || paper.doi || '',
                                citationKey,
                                formattedCitation,
                            },
                            metadata: {},
                            parentId: null,
                            orderIndex,
                        };
                        useEditorStore.setState(state => ({
                            blocks: [...state.blocks, refBlock]
                        }));
                        client.models.ScholarBlock.create({
                            id: refBlock.id,
                            documentId: refBlock.documentId,
                            type: refBlock.type,
                            content: JSON.stringify(refBlock.content),
                            metadata: JSON.stringify(refBlock.metadata),
                            orderIndex: refBlock.orderIndex,
                        });
                    }
                }
            } else {
                const currentCollected = rb.content?.collectedPapers || [];
                const alreadyInLocal = currentCollected.some((i: any) =>
                    (i.doi && paper.doi && i.doi === paper.doi) ||
                    (i.externalId === paper.externalId && i.source === paper.source)
                );
                if (!alreadyInLocal) {
                    const newCollected = [...currentCollected, paper];
                    updateResearchBlockContent(blockId, {
                        ...rb.content,
                        collectedPapers: newCollected,
                        itemCount: newCollected.length,
                    });
                }
            }
        }
    };

    const isCollected = (paper: LiteratureSearchResult) => {
        if (blockId) {
            const localCollected = isRefCollection ? (rb?.content?.papers || []) : (rb?.content?.collectedPapers || []);
            return localCollected.some((i: any) =>
                (i.doi && paper.doi && i.doi === paper.doi) ||
                (i.externalId === paper.externalId && i.source === paper.source)
            );
        }
        return literatureItems.some(i =>
            (i.doi && paper.doi && i.doi === paper.doi) ||
            (i.externalId === paper.externalId && i.source === paper.source)
        );
    };

    const toggleSource = (source: 'openalex' | 'semantic_scholar' | 'crossref' | 'isbn_books' | 'ieee_xplore' | 'figshare') => {
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
        const papersToPush = blockId ? (rb?.content?.collectedPapers || []) : literatureItems;
        if (papersToPush.length === 0) return;
        
        try {
            // Create a new reference-collection block every time
            const newBlockTitle = blockId && rb
                ? `References (from: ${rb.title || 'Search'})`
                : `References (${papersToPush.length} papers)`;

            const newBlockId = await createResearchBlock(
                projectId,
                'reference-collection',
                newBlockTitle
            );

            updateResearchBlockContent(newBlockId, {
                sourceBlockId: blockId || undefined,
                papers: papersToPush,
                itemCount: papersToPush.length,
            });
            
            // If local to Search Node, save connection link
            if (blockId && rb) {
                updateResearchBlockContent(blockId, {
                    ...rb.content,
                    createdReferenceBlockId: newBlockId,
                });
            }

            // Sync all pushed papers to active document: Add REFERENCE blocks if missing
            const activeDoc = useEditorStore.getState().document;
            if (activeDoc) {
                const currentBlocks = useEditorStore.getState().blocks;
                const newRefBlocks: any[] = [];

                const formatAuthorsList = (authors: any[]) => {
                    if (!authors || !Array.isArray(authors)) return 'Unknown Author';
                    const names = authors
                        .map(a => {
                            if (typeof a === 'string') return a.trim();
                            if (a && typeof a === 'object') return (a.name || '').trim();
                            return '';
                        })
                        .filter(name => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'unknown author');
                    if (names.length === 0) return 'Unknown Author';
                    return names.join(', ');
                };

                for (const paper of papersToPush) {
                    const paperIdVal = paper.id || paper.externalId || paper.doi;
                    const exists = currentBlocks.some(b => b.type === 'REFERENCE' && (b.content?.literatureItemId === paperIdVal || b.content?.literatureItemId === paper.id));
                    if (!exists) {
                        const firstAuthorName = paper.authors && paper.authors.length > 0 
                            ? ((paper.authors[0].name || paper.authors[0]).split(' ').pop() || 'Unknown') 
                            : 'Unknown';
                        const citationKey = `${firstAuthorName}, ${paper.year || 'n.d.'}`;
                        const formattedCitation = `${formatAuthorsList(paper.authors)}, "${paper.title}", ${paper.year || 'n.d.'}.`;
                        const orderIndex = Date.now();
                        
                        const refBlock = {
                            id: uuidv4(),
                            documentId: activeDoc.id,
                            type: 'REFERENCE',
                            content: {
                                literatureItemId: paper.id || paperIdVal,
                                citationKey,
                                formattedCitation,
                            },
                            metadata: {},
                            parentId: null,
                            orderIndex,
                        };
                        newRefBlocks.push(refBlock);
                    }
                }

                if (newRefBlocks.length > 0) {
                    useEditorStore.setState(state => ({
                        blocks: [...state.blocks, ...newRefBlocks]
                    }));
                    await Promise.all(newRefBlocks.map(block => client.models.ScholarBlock.create({
                        id: block.id,
                        documentId: block.documentId,
                        type: block.type,
                        content: JSON.stringify(block.content),
                        metadata: JSON.stringify(block.metadata),
                        orderIndex: block.orderIndex,
                    })));
                }
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
            {((blockId ? (isRefCollection ? rb?.content?.papers?.length : rb?.content?.collectedPapers?.length) : literatureItems.length) || 0) > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                    <span className="text-xs text-indigo-300 font-medium flex items-center gap-1">
                        <span>📚</span>
                        <span>{blockId ? (isRefCollection ? rb?.content?.papers?.length : rb?.content?.collectedPapers?.length) : literatureItems.length} {t('references collected', 'مراجع مجمعة')}</span>
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
                    {/* AI Search Assistant */}
                    <div className="futuristic-card p-3 bg-slate-805/40 border border-slate-700/30 rounded-xl space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                            <span>✨</span>
                            <span>{t('AI Search Assistant', 'مساعد البحث الذكي')}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {t('Describe your research objective, and the AI will suggest optimized queries for you.', 'صف هدف بحثك، وسيقترح الذكاء الاصطناعي استعلامات بحث محسنة لك.')}
                        </p>
                        <textarea
                            value={researchObjective}
                            onChange={(e) => setResearchObjective(e.target.value)}
                            placeholder={t(
                                "e.g., How does temporal resolution affect power system security assessments with wind/solar?",
                                "مثال: كيف تؤثر الدقة الزمنية على تقييمات أمن نظام الطاقة مع الرياح/الطاقة الشمسية؟"
                            )}
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg p-2 text-xs text-slate-200 outline-none resize-none font-sans"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSuggestQueries}
                                disabled={isGeneratingQueries || !researchObjective.trim()}
                                className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isGeneratingQueries && <div className="w-3 h-3 border-2 border-slate-950 border-t-amber-950 rounded-full animate-spin" />}
                                <span>{isGeneratingQueries ? t('Analyzing...', 'جاري التحليل...') : t('Suggest Search Queries', 'اقتراح استعلامات البحث')}</span>
                            </button>
                            {researchObjective.trim() && (
                                <button
                                    onClick={() => setResearchObjective('')}
                                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
                                >
                                    {t('Clear', 'مسح')}
                                </button>
                            )}
                        </div>

                        {/* Suggested Queries List */}
                        {suggestedQueries.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                                    {t('Suggested Queries', 'الاستعلامات المقترحة')}
                                </span>
                                <div className="space-y-1.5">
                                    {suggestedQueries.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleApplySuggestion(item.query)}
                                            className="w-full text-left p-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 rounded-lg transition-all text-xs group space-y-1"
                                        >
                                            <div className="font-mono text-amber-300 font-semibold group-hover:text-amber-200 break-words leading-tight">
                                                {item.query}
                                            </div>
                                            {item.description && (
                                                <div className="text-[10px] text-slate-450 leading-normal">
                                                    {item.description}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-[9px] text-slate-600 uppercase tracking-wider font-semibold">{t('Or search manually', 'أو ابحث يدوياً')}</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

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
                            onClick={() => handleSearch()}
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
                            { key: 'ieee_xplore' as const, label: 'IEEE Xplore' },
                            { key: 'isbn_books' as const, label: t('ISBN / Books', 'معرف الكتب') },
                            { key: 'figshare' as const, label: 'Figshare' },
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

                    {/* Collapsible Advanced Options */}
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-[10px] text-slate-450 hover:text-slate-200 transition-colors flex items-center gap-1 font-semibold focus:outline-none"
                        >
                            <span>{showAdvanced ? '▼' : '▶'}</span>
                            <span>{t('Advanced Search Filters', 'مرشحات البحث المتقدمة')}</span>
                            {(startYear || endYear) && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[8px]">
                                    Active
                                </span>
                            )}
                        </button>

                        {showAdvanced && (
                            <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 uppercase font-semibold">{t('Start Year', 'سنة البدء')}</label>
                                        <input
                                            type="number"
                                            value={startYear}
                                            onChange={(e) => setStartYear(e.target.value)}
                                            placeholder="2015"
                                            className="futuristic-input w-full text-xs py-1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 uppercase font-semibold">{t('End Year', 'سنة الانتهاء')}</label>
                                        <input
                                            type="number"
                                            value={endYear}
                                            onChange={(e) => setEndYear(e.target.value)}
                                            placeholder="2026"
                                            className="futuristic-input w-full text-xs py-1"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1.5 border-t border-slate-800/40">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isOaCheckbox"
                                            checked={isOa}
                                            onChange={(e) => setIsOa(e.target.checked)}
                                            className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-amber-500/50 w-3 h-3 cursor-pointer"
                                        />
                                        <label htmlFor="isOaCheckbox" className="text-[10px] text-slate-300 cursor-pointer font-medium select-none">
                                            {t('Open Access Only', 'الوصول المفتوح فقط')}
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-550 uppercase font-semibold">{t('Publisher Filter', 'مرشح الناشر')}</label>
                                        <input
                                            type="text"
                                            value={publisher}
                                            onChange={(e) => setPublisher(e.target.value)}
                                            placeholder="e.g. IEEE, Nature"
                                            className="futuristic-input w-full text-xs py-1"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setStartYear('2015');
                                            setEndYear('2026');
                                        }}
                                        className="text-[9px] px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors font-medium"
                                    >
                                        Preset: 2015 - 2026
                                    </button>
                                    {(startYear || endYear || isOa || publisher) && (
                                        <button
                                            onClick={() => {
                                                setStartYear('');
                                                setEndYear('');
                                                setIsOa(false);
                                                setPublisher('');
                                            }}
                                            className="text-[9px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                                        >
                                            {t('Reset', 'إعادة ضبط')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
