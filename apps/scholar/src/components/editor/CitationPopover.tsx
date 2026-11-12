'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { searchAllSources } from '@/lib/literature-api';
import { buildCounterMap, resolveRef } from '@/lib/cross-reference';
import { sortByOrder } from '@/lib/fractional-index';
import { BlockType, LiteratureSearchResult } from '@/types';
import { parseBibTeX, parseRIS, parseDOIs, parseTextCitations, cleanRawCitation } from '@/lib/citation-parsers';

interface CitationPopoverProps {
    onSelect: (blockId: string | string[]) => void;
    onClose: () => void;
}

export function CitationPopover({ onSelect, onClose }: CitationPopoverProps) {
    const { t } = useLanguage();
    const { blocks, document: doc, addLiteratureItem, addBlock, updateBlockContent, literatureItems } = useEditorStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'manual' | 'bulk'>('internal');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // External search states
    const [externalResults, setExternalResults] = useState<LiteratureSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Manual reference form states
    const [manualTitle, setManualTitle] = useState('');
    const [manualAuthors, setManualAuthors] = useState('');
    const [manualYear, setManualYear] = useState('');
    const [manualPublisher, setManualPublisher] = useState('');
    const [manualUrl, setManualUrl] = useState('');
    const [manualError, setManualError] = useState<string | null>(null);

    // Bulk reference form states
    const [bulkText, setBulkText] = useState('');
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [isBulkImporting, setIsBulkImporting] = useState(false);

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBulkError(null);
        setIsBulkImporting(true);

        const text = bulkText.trim();
        if (!text) {
            setBulkError(t('Please enter citation text or DOIs', 'الرجاء إدخال نص الاقتباس أو المعرفات'));
            setIsBulkImporting(false);
            return;
        }

        if (!doc) {
            setIsBulkImporting(false);
            return;
        }

        try {
            let parsedItems: any[] = [];

            // Detect format
            if (text.includes('@') && text.includes('{')) {
                // BibTeX format
                parsedItems = parseBibTeX(text);
            } else if (text.includes('TY  -') || text.includes('ER  -')) {
                // RIS format
                parsedItems = parseRIS(text);
            } else {
                const textQueries = parseTextCitations(text);
                const dois = parseDOIs(text);
                
                // Pure DOI list check: has DOIs, and either one block total or high DOI density relative to text length
                const isPureDoiList = dois.length > 0 && (textQueries.length <= 1 || text.length / dois.length < 100);

                if (isPureDoiList) {
                    // Bulk fetch DOI metadata in chunks of 5 to avoid overloading/rate-limiting
                    const resolvedDOIs: LiteratureSearchResult[] = [];
                    for (let i = 0; i < dois.length; i += 5) {
                        const chunk = dois.slice(i, i + 5);
                        const results = await Promise.all(
                            chunk.map(async (doi) => {
                                try {
                                    const res = await searchAllSources(doi);
                                    return res[0] || null; // Match exact search result
                                } catch {
                                    return null;
                                }
                            })
                        );
                        resolvedDOIs.push(...(results.filter((r): r is LiteratureSearchResult => r !== null)));
                    }

                    parsedItems = resolvedDOIs.map(res => ({
                        title: res.title,
                        authors: res.authors,
                        year: res.year,
                        journal: res.journal,
                        doi: res.doi,
                        url: res.url,
                        abstract: res.abstract,
                        externalId: res.doi,
                    }));
                } else {
                    // Plain text citation strings!
                    if (textQueries.length > 0) {
                        const resolvedCitations = [];
                        for (let i = 0; i < textQueries.length; i += 3) {
                            const chunk = textQueries.slice(i, i + 3);
                            const results = await Promise.all(
                                chunk.map(async (q) => {
                                    try {
                                        // Prioritize DOI search, fallback to title search
                                        const searchQueryString = q.parsedDoi || q.parsedTitle || cleanRawCitation(q.rawText);
                                        const res = await searchAllSources(searchQueryString);
                                        if (res && res.length > 0) {
                                            const match = res[0];
                                            return {
                                                title: match.title,
                                                authors: match.authors,
                                                year: match.year || q.parsedYear,
                                                journal: match.journal,
                                                doi: match.doi || q.parsedDoi,
                                                url: match.url,
                                                abstract: match.abstract,
                                                externalId: match.doi || match.externalId,
                                            };
                                        }
                                    } catch (err) {
                                        console.warn(`Search failed for citation: ${q.rawText}`, err);
                                    }
                                    
                                    // Fallback: Create custom manual entry from parsed parts
                                    return {
                                        title: q.parsedTitle || q.rawText,
                                        authors: q.parsedAuthors?.map(name => ({ name })) || [],
                                        year: q.parsedYear,
                                        doi: q.parsedDoi,
                                        externalId: `manual-bulk-${Math.random().toString(36).substring(2, 9)}`,
                                    };
                                })
                            );
                            resolvedCitations.push(...results);
                        }
                        parsedItems = resolvedCitations;
                    }
                }
            }

            if (parsedItems.length === 0) {
                setBulkError(t('No valid citations or DOIs found. Check your input format.', 'لم يتم العثور على اقتباسات أو معرفات DOI صالحة. تحقق من التنسيق.'));
                setIsBulkImporting(false);
                return;
            }

            // Map parsed items into standard literature items fields
            const itemsToInsert = parsedItems.map(item => ({
                projectId: doc.projectId,
                source: 'manual' as const, // bulk-imported is labeled manual/custom
                externalId: item.externalId || item.doi || item.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50),
                title: item.title,
                authors: item.authors || [],
                year: item.year,
                journal: item.journal,
                abstract: item.abstract,
                doi: item.doi,
                url: item.url,
                fullMetadata: { importedAt: new Date().toISOString() },
            }));

            // Bulk save to state & DynamoDB
            const { addLiteratureItemsBulk } = useEditorStore.getState();
            const refBlockIds = await addLiteratureItemsBulk(itemsToInsert);

            if (refBlockIds.length > 0) {
                // Merge multiple references into a single comma-separated citation tag: [[ref:id1,id2,...]]
                const combinedBlockId = refBlockIds.join(',');
                onSelect(combinedBlockId);
            } else {
                setBulkError(t('Failed to import references.', 'فشل استيراد المراجع.'));
            }
        } catch (err: any) {
            setBulkError(err.message || t('An error occurred during import.', 'حدث خطأ أثناء الاستيراد.'));
        } finally {
            setIsBulkImporting(false);
        }
    };

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Filter local cross-referenceable blocks
    const counterMap = buildCounterMap(blocks);
    const sorted = sortByOrder(blocks);
    const crossRefBlocks = sorted.filter(b => 
        ['FIGURE', 'TABLE', 'EQUATION', 'CODE', 'HEADING', 'REFERENCE'].includes(b.type)
    );

    const filteredLocalBlocks = crossRefBlocks.filter(block => {
        const refName = resolveRef(block.id, counterMap).toLowerCase();
        let contentText = '';
        if (block.content) {
            if (typeof block.content === 'string') {
                contentText = block.content;
            } else if (block.content.text) {
                contentText = block.content.text;
            } else if (block.content.title) {
                contentText = block.content.title;
            } else if (block.content.caption) {
                contentText = block.content.caption;
            }
        }
        
        // Match linked literature items for REFERENCE blocks
        let litTitle = '';
        if (block.type === 'REFERENCE' && block.content?.literatureItemId) {
            const lit = literatureItems.find(li => li.id === block.content.literatureItemId);
            if (lit) litTitle = lit.title;
        }
        const query = searchQuery.toLowerCase();
        return refName.includes(query) || contentText.toLowerCase().includes(query) || litTitle.toLowerCase().includes(query);
    });

    // Find literature items that are NOT yet associated with any REFERENCE block in the document
    const referencedLiteratureItemIds = new Set(
        blocks
            .filter(b => b.type === 'REFERENCE' && b.content?.literatureItemId)
            .map(b => b.content.literatureItemId)
    );

    const uncitedLiteratureItems = literatureItems.filter(li => !referencedLiteratureItemIds.has(li.id));

    // Filter library items based on the search query
    const filteredUncitedLiteratureItems = uncitedLiteratureItems.filter(li => {
        const query = searchQuery.toLowerCase();
        const authorsStr = Array.isArray(li.authors) 
            ? li.authors.map((a: any) => a.name || a).join(', ')
            : typeof li.authors === 'string' 
            ? li.authors 
            : '';
        return (
            (li.title || '').toLowerCase().includes(query) ||
            (li.journal || '').toLowerCase().includes(query) ||
            (li.doi || '').toLowerCase().includes(query) ||
            authorsStr.toLowerCase().includes(query)
        );
    });

    const handleSelectLibraryItem = async (item: any) => {
        if (!doc) return;
        setIsSearching(true);
        try {
            // Determine author last name for citationKey
            let firstAuthorLastName = 'Unknown';
            let authorsList = [];
            if (item.authors) {
                authorsList = typeof item.authors === 'string' ? JSON.parse(item.authors) : item.authors;
            }
            if (authorsList && authorsList[0]) {
                firstAuthorLastName = (authorsList[0].name || authorsList[0]).split(' ').pop() || 'Unknown';
            }
            const citationKey = `${firstAuthorLastName}, ${item.year || 'n.d.'}`;

            // 1. Create a new REFERENCE block at the end of the document
            const refBlockId = await addBlock('REFERENCE');

            // 2. Update the newly created REFERENCE block with reference detail content
            updateBlockContent(refBlockId, {
                literatureItemId: item.id,
                citationKey,
                formattedCitation: `${authorsList.map((a: any) => a.name || a).join(', ')}. "${item.title}" (${item.year || 'n.d.'}).`
            });

            // 3. Fire selection callback
            onSelect(refBlockId);
        } catch (err) {
            console.error('Failed to create reference block from library item:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleExternalSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError(null);
        try {
            const results = await searchAllSources(searchQuery);
            setExternalResults(results);
            if (results.length === 0) {
                setSearchError(t('No papers found. Try another query.', 'لم يتم العثور على أوراق. جرب بحثاً آخر.'));
            }
        } catch (err) {
            setSearchError(t('Search failed. Please try again.', 'فشل البحث. يرجى المحاولة مرة أخرى.'));
        } finally {
            setIsSearching(false);
        }
    };

    // Selecting an external paper search result
    const handleSelectExternal = async (result: LiteratureSearchResult) => {
        if (!doc) return;
        setIsSearching(true);
        try {
            // 1. Add paper to literature items library
            const litId = await addLiteratureItem({
                projectId: doc.projectId,
                source: result.source,
                externalId: result.externalId,
                title: result.title,
                authors: result.authors,
                year: result.year,
                journal: result.journal,
                abstract: result.abstract,
                citationCount: result.citationCount,
                doi: result.doi,
                url: result.url,
                fullMetadata: result.rawData
            });

            // Determine author last name for citationKey
            let firstAuthorLastName = 'Unknown';
            if (result.authors && result.authors[0]) {
                firstAuthorLastName = result.authors[0].name.split(' ').pop() || 'Unknown';
            }
            const citationKey = `${firstAuthorLastName}, ${result.year || 'n.d.'}`;

            // 2. Create a new REFERENCE block at the end of the document
            const refBlockId = await addBlock('REFERENCE');

            // 3. Update the newly created REFERENCE block with reference detail content
            updateBlockContent(refBlockId, {
                literatureItemId: litId,
                citationKey,
                formattedCitation: `${result.authors.map(a => a.name).join(', ')}. "${result.title}" (${result.year || 'n.d.'}).`
            });

            // 4. Fire selection callback
            onSelect(refBlockId);
        } catch (err) {
            console.error('Failed to provision dynamic reference block:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualError(null);

        if (!manualTitle.trim()) {
            setManualError(t('Title is required', 'العنوان مطلوب'));
            return;
        }
        if (!manualAuthors.trim()) {
            setManualError(t('Authors/Organization is required', 'المؤلفون/الجهة مطلوبة'));
            return;
        }

        setIsSearching(true);
        try {
            const authorsList = manualAuthors
                .split(',')
                .map(a => ({ name: a.trim() }))
                .filter(a => a.name);

            const yearInt = parseInt(manualYear) || undefined;

            let firstAuthorLastName = 'Unknown';
            if (authorsList[0]) {
                const names = authorsList[0].name.split(/\s+/);
                firstAuthorLastName = names[names.length - 1] || 'Unknown';
            }
            const citationKey = `${firstAuthorLastName}, ${manualYear || 'n.d.'}`;

            const authorNames = authorsList.map(a => a.name).join(', ');
            const publisherPart = manualPublisher ? `, ${manualPublisher}` : '';
            const yearPart = manualYear ? `, ${manualYear}` : '';
            const formattedCitation = `${authorNames}, "${manualTitle}"${publisherPart}${yearPart}.`;

            if (!doc) return;

            const litId = await addLiteratureItem({
                projectId: doc.projectId,
                source: 'manual',
                externalId: 'manual-' + Date.now(),
                title: manualTitle,
                authors: authorsList,
                year: yearInt,
                journal: manualPublisher || undefined,
                url: manualUrl || undefined,
                fullMetadata: { publisher: manualPublisher }
            });

            const refBlockId = await addBlock('REFERENCE');
            updateBlockContent(refBlockId, {
                literatureItemId: litId,
                citationKey,
                formattedCitation
            });

            onSelect(refBlockId);
        } catch (err: any) {
            setManualError(err.message || t('Failed to save manual reference', 'فشل حفظ المرجع اليدوي'));
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Search and Tabs */}
                <div className="p-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-200">{t('Insert Citation / Cross-Reference', 'إدراج اقتباس / إحالة مرجعية')}</h3>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Tab Selection */}
                    <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'internal'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            {t('Document References', 'مراجع المستند')}
                        </button>
                        <button
                            onClick={() => setActiveTab('external')}
                            className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'external'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            {t('Search Web Database', 'البحث في قاعدة بيانات الويب')}
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'manual'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            {t('Manual', 'يدوي')}
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeTab === 'bulk'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'text-slate-450 hover:text-slate-200'
                            }`}
                        >
                            {t('Bulk Import', 'استيراد دفعة')}
                        </button>
                    </div>

                    {/* Search Form */}
                    {activeTab !== 'manual' && activeTab !== 'bulk' && (
                        <form onSubmit={activeTab === 'external' ? handleExternalSearch : e => e.preventDefault()} className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={
                                    activeTab === 'internal'
                                        ? t('Filter figures, tables, bibliography...', 'تصفية الأشكال، الجداول، المراجع...')
                                        : t('Type paper title, author, DOI and press Enter...', 'اكتب عنوان الورقة، المؤلف، المعرف واضغط إدخال...')
                                }
                                className="w-full bg-slate-950 border border-slate-800/80 rounded-lg pl-4 pr-10 py-2.5 text-sm text-slate-200 placeholder:text-slate-650 outline-none focus:border-amber-500/30"
                            />
                            <button type="submit" className="absolute right-3 top-3 text-slate-500 hover:text-amber-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </form>
                    )}
                </div>

                {/* Content List Area */}
                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[50vh] p-2 space-y-1">
                    {activeTab === 'internal' ? (
                        (filteredLocalBlocks.length > 0 || filteredUncitedLiteratureItems.length > 0) ? (
                            <div className="space-y-1">
                                {filteredLocalBlocks.map(block => {
                                    const refDisplay = resolveRef(block.id, counterMap);
                                    let displayTitle = '';
                                    if (block.type === 'REFERENCE' && block.content?.literatureItemId) {
                                        const lit = literatureItems.find(li => li.id === block.content.literatureItemId);
                                        if (lit) displayTitle = lit.title;
                                    } else if (block.content) {
                                        displayTitle = block.content.title || block.content.caption || block.content.text || '';
                                    }

                                    const isSelected = selectedIds.includes(block.id);

                                    return (
                                        <div
                                            key={block.id}
                                            onClick={() => {
                                                if (selectedIds.length > 0) {
                                                    setSelectedIds(prev => 
                                                        prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]
                                                    );
                                                } else {
                                                    onSelect(block.id);
                                                }
                                            }}
                                            className={`w-full p-2.5 text-left rounded-lg border transition-all flex items-start gap-3 cursor-pointer select-none ${
                                                isSelected 
                                                    ? 'border-amber-500/50 bg-amber-500/10 text-white' 
                                                    : 'border-transparent hover:border-slate-800 hover:bg-slate-800/20 text-slate-350 hover:text-white'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedIds(prev => 
                                                        prev.includes(block.id) ? prev.filter(id => id !== block.id) : [...prev, block.id]
                                                    );
                                                }}
                                                className="mt-1 h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                                            />
                                            <span className="font-mono text-xs font-semibold text-emerald-400 flex-shrink-0 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                                {refDisplay}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate text-slate-200">{displayTitle || `${block.type} Block`}</p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{block.id.substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredUncitedLiteratureItems.map(item => {
                                    let authorText = '';
                                    if (item.authors) {
                                        const authorsList = typeof item.authors === 'string' ? JSON.parse(item.authors) : item.authors;
                                        authorText = authorsList.slice(0, 2).map((a: any) => a.name || a).join(', ');
                                        if (authorsList.length > 2) authorText += ' et al.';
                                    }

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelectLibraryItem(item)}
                                            className="w-full p-2.5 text-left rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-800/20 text-slate-350 hover:text-white transition-all flex items-start gap-3"
                                        >
                                            <span className="font-mono text-[9px] font-semibold text-amber-400 flex-shrink-0 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase tracking-wider">
                                                📚 Library
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate text-slate-200">{item.title}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{authorText} ({item.year || 'n.d.'})</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center p-6 text-slate-650 text-xs">
                                {t('No matching references found in document or library.', 'لم يتم العثور على مراجع مطابقة في المستند أو المكتبة.')}
                            </div>
                        )
                    ) : activeTab === 'manual' ? (
                        <form onSubmit={handleManualSubmit} className="p-4 space-y-4 text-slate-200">
                            {manualError && (
                                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    {manualError}
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[11px] text-slate-500 font-medium block">
                                    {t('Document/Report Title', 'عنوان المستند/التقرير')} *
                                </label>
                                <input
                                    type="text"
                                    value={manualTitle}
                                    onChange={(e) => setManualTitle(e.target.value)}
                                    placeholder={t('e.g. Long-Term Reliability Assessment', 'مثال: تقييم الموثوقية طويلة الأمد')}
                                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] text-slate-500 font-medium block">
                                    {t('Authors/Organizations (comma separated)', 'المؤلفون/الجهات (مفصولة بفاصلة)')} *
                                </label>
                                <input
                                    type="text"
                                    value={manualAuthors}
                                    onChange={(e) => setManualAuthors(e.target.value)}
                                    placeholder={t('e.g. North American Electric Reliability Corporation', 'مثال: مؤسسة موثوقية الكهرباء بأمريكا الشمالية')}
                                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1 space-y-1">
                                    <label className="text-[11px] text-slate-500 font-medium block">
                                        {t('Year', 'السنة')} *
                                    </label>
                                    <input
                                        type="number"
                                        value={manualYear}
                                        onChange={(e) => setManualYear(e.target.value)}
                                        placeholder="2026"
                                        className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30"
                                        required
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[11px] text-slate-500 font-medium block">
                                        {t('Publisher/Journal/Location', 'الناشر/المجلة/الموقع')}
                                    </label>
                                    <input
                                        type="text"
                                        value={manualPublisher}
                                        onChange={(e) => setManualPublisher(e.target.value)}
                                        placeholder={t('e.g. NERC, Atlanta, GA', 'مثال: NERC، أتلانتا')}
                                        className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] text-slate-500 font-medium block">
                                    {t('URL (Optional)', 'الرابط (اختياري)')}
                                </label>
                                <input
                                    type="url"
                                    value={manualUrl}
                                    onChange={(e) => setManualUrl(e.target.value)}
                                    placeholder="https://example.com/report.pdf"
                                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30"
                                />
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('external')}
                                    className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 transition-colors"
                                >
                                    {t('Cancel', 'إلغاء')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="px-4 py-1.5 rounded text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors"
                                >
                                    {isSearching ? t('Adding...', 'جارٍ الإضافة...') : t('Add Reference', 'إضافة مرجع')}
                                </button>
                            </div>
                        </form>
                    ) : activeTab === 'bulk' ? (
                        <form onSubmit={handleBulkSubmit} className="p-4 space-y-4 text-slate-200">
                            {bulkError && (
                                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                    {bulkError}
                                </div>
                            )}
                            
                            <div className="space-y-1">
                                <label className="text-[11px] text-slate-500 font-medium block">
                                    {t('Bulk Citation Text (BibTeX, RIS, or DOIs)', 'نص الاقتباسات (BibTeX أو RIS أو قائمة معرفات DOI)')}
                                </label>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={t(
                                        'Paste multiple BibTeX entries, RIS entries, or a list of DOIs (one per line)...',
                                        'ألحق عدة مدخلات BibTeX أو RIS أو قائمة من معرفات DOI (معرف لكل سطر)...'
                                    )}
                                    rows={8}
                                    className="w-full bg-slate-950 border border-slate-800/80 rounded px-3 py-2 text-xs text-white outline-none focus:border-amber-500/30 resize-none font-mono"
                                    required
                                />
                            </div>

                            <div className="text-[10px] text-slate-500">
                                <p>• {t('BibTeX format is automatically parsed via @article, @book, etc.', 'يتم تحديد تنسيق BibTeX وتفسيره تلقائياً.')}</p>
                                <p>• {t('RIS format uses standard tag markers ending in ER -.', 'تنسيق RIS يستعمل واصفات قياسية تنتهي بـ ER -.')}</p>
                                <p>• {t('Pasting DOIs will auto-query details from web databases.', 'إلحاق قائمة DOIs سيقوم بالبحث وجلب البيانات من الويب.')}</p>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('internal')}
                                    className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 transition-colors"
                                >
                                    {t('Cancel', 'إلغاء')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isBulkImporting}
                                    className="px-4 py-1.5 rounded text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isBulkImporting && <div className="w-3 h-3 border-2 border-slate-900 border-t-amber-950 rounded-full animate-spin" />}
                                    {isBulkImporting ? t('Importing...', 'جارٍ الاستيراد...') : t('Import Citations', 'استيراد المراجع')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Web search results
                        isSearching ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500 text-xs">
                                <div className="w-6 h-6 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                                <span>{t('Searching literature database...', 'بحث في قاعدة بيانات الأدبيات...')}</span>
                            </div>
                        ) : searchError ? (
                            <div className="p-6 text-center text-xs text-red-400 flex flex-col gap-3">
                                <span>{searchError}</span>
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors mx-auto mt-1"
                                >
                                    {t('Add Custom Reference Manually', 'إضافة مرجع مخصص يدوياً')}
                                </button>
                            </div>
                        ) : externalResults.length > 0 ? (
                            <div className="space-y-1">
                                {externalResults.map((result, idx) => (
                                    <button
                                        key={result.externalId + '-' + idx}
                                        onClick={() => handleSelectExternal(result)}
                                        className="w-full p-3 text-left rounded-lg border border-transparent hover:border-slate-800 hover:bg-slate-800/20 text-slate-350 hover:text-white transition-all flex flex-col gap-1"
                                    >
                                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2">{result.title}</h4>
                                        <p className="text-[10.5px] text-slate-400">
                                            {result.authors.map(a => a.name).join(', ') || 'Unknown Author'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 text-[9.5px] text-slate-550">
                                            <span className="font-semibold text-amber-500/70">{result.source.toUpperCase()}</span>
                                            <span>•</span>
                                            <span>{result.year || 'n.d.'}</span>
                                            {result.journal && (
                                                <>
                                                    <span>•</span>
                                                    <span className="truncate max-w-[150px]">{result.journal}</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                ))}
                                <div className="pt-4 pb-2 text-center">
                                    <button
                                        onClick={() => setActiveTab('manual')}
                                        className="text-[11px] text-amber-500/70 hover:text-amber-400 underline font-medium"
                                    >
                                        {t("Can't find the paper? Add a custom reference manually", "لم تجد الورقة؟ أضف مرجعاً يدوياً مخصصاً")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-6 text-slate-650 text-xs text-center gap-2">
                                <p>{t('Search OpenAlex, Semantic Scholar & CrossRef databases.', 'ابحث في قواعد بيانات OpenAlex و Semantic Scholar و CrossRef.')}</p>
                                <p className="text-[10px] text-slate-700 mb-2">{t('Type query and press Enter to search.', 'اكتب استعلام البحث واضغط Enter للبحث.')}</p>
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors mt-2"
                                >
                                    {t('Add Custom Reference Manually', 'إضافة مرجع مخصص يدوياً')}
                                </button>
                            </div>
                        )
                    )}
                </div>

                {/* Bulk selection action bar */}
                {selectedIds.length > 0 && (
                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-400 font-medium">
                                {selectedIds.length} {t('selected', 'محدد')}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="text-[11px] text-slate-500 hover:text-slate-300 underline"
                            >
                                {t('Clear', 'إلغاء التحديد')}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => onSelect(selectedIds)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('Insert Combined Reference', 'إدراج مرجع مجمع')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
