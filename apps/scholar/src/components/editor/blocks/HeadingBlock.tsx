'use client';

import { BlockProps, HeadingContent } from '@/types';
import { useRef, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { buildCounterMap, resolveRef, calculateHeadingNumbers } from '@/lib/cross-reference';

const HEADING_STYLES: Record<number, string> = {
    1: 'text-3xl font-extrabold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-bold',
    4: 'text-lg font-semibold',
    5: 'text-base font-semibold',
    6: 'text-sm font-semibold uppercase tracking-wider',
};

const UNORDERED_BULLETS: Record<number, string> = {
    1: '•',
    2: '◦',
    3: '▪',
    4: '▫',
    5: '–',
    6: '–',
};

export function HeadingBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const content = (block.content || { text: '', level: 2 }) as HeadingContent;
    const lastTextRef = useRef(content.text || '');

    const { language, t } = useLanguage();
    const blocks = useEditorStore((state) => state.blocks);
    const focusBlock = useEditorStore((state) => state.focusBlock);
    const counterMap = buildCounterMap(blocks);

    const headingStyles = useEditorStore((state) => state.document?.metadata?.headingStyles) || {};
    const headingNumbers = calculateHeadingNumbers(blocks, headingStyles);
    const headingNumber = headingNumbers.get(block.id);

    const isReferencesHeading = content.level === 1 && (content.text || '').trim().toLowerCase() === 'references';
    const referencesHidden = useEditorStore((state) => !!state.document?.metadata?.referencesHidden);
    const literatureItems = useEditorStore((state) => state.literatureItems);
    const refBlocks = blocks.filter(b => b.type === 'REFERENCE');
    const sortedRefBlocks = [...refBlocks].sort((a, b) => a.orderIndex - b.orderIndex);

    // Keep DOM in sync with external changes, but avoid resetting while typing
    useEffect(() => {
        if (isFocused && editorRef.current && content.text !== lastTextRef.current) {
            editorRef.current.innerText = content.text || '';
            lastTextRef.current = content.text || '';
        }
    }, [content.text, isFocused]);

    // Focus and load content when focused
    useEffect(() => {
        if (isFocused && editorRef.current) {
            editorRef.current.innerText = content.text || '';
            lastTextRef.current = content.text || '';
            editorRef.current.focus();
        }
    }, [isFocused]);

    const handleInput = () => {
        if (editorRef.current) {
            const text = editorRef.current.innerText;
            lastTextRef.current = text;
            onContentChange({
                ...content,
                text,
            });
        }
    };

    const cycleLevel = () => {
        const newLevel = (content.level % 6) + 1;
        onContentChange({ ...content, level: newLevel });
    };

    const renderContent = (text: string) => {
        if (!text) return null;

        const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        const pattern = new RegExp(REF_PATTERN.source, 'g');

        while ((match = pattern.exec(text)) !== null) {
            const index = match.index;
            const blockId = match[1];

            if (index > lastIndex) {
                parts.push(text.substring(lastIndex, index));
            }

            const resolvedText = resolveRef(blockId, counterMap, language);
            parts.push(
                <span
                    key={blockId + '-' + index}
                    onClick={(e) => {
                        e.stopPropagation();
                        const element = document.getElementById(`block-${blockId}`);
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            focusBlock(blockId);
                        }
                    }}
                    className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-xs font-semibold
                               bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50
                               text-amber-400 hover:text-amber-300 cursor-pointer select-none transition-all"
                >
                    {resolvedText}
                </span>
            );

            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <div className="flex items-start gap-2 group">
            {/* Level indicator */}
            {isFocused && (
                <button
                    onClick={cycleLevel}
                    className="flex-shrink-0 mt-1 px-1.5 py-0.5 rounded text-xs font-mono
                               text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10
                               transition-colors border border-transparent hover:border-amber-500/20"
                    title={`Heading Level ${content.level} (click to cycle)`}
                >
                    H{content.level}
                </button>
            )}

            {/* Heading text & numbering */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                    {headingNumber && (
                        <span className={`text-amber-500 font-semibold select-none flex-shrink-0 ${HEADING_STYLES[content.level] || HEADING_STYLES[2]}`}>
                            {headingNumber}
                        </span>
                    )}
                    {isFocused ? (
                        <div
                            key="edit"
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleInput}
                            onFocus={onFocus}
                            dir="auto"
                            className={`
                                flex-1 outline-none text-white py-1 rounded transition-colors
                                ${HEADING_STYLES[content.level] || HEADING_STYLES[2]}
                                empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600
                                empty:before:font-normal
                            `}
                            data-placeholder={`Heading ${content.level}`}
                        />
                    ) : (
                        <div
                            key="preview"
                            onClick={onFocus}
                            dir="auto"
                            className={`
                                flex-1 outline-none text-white py-1 rounded transition-colors cursor-text
                                ${HEADING_STYLES[content.level] || HEADING_STYLES[2]}
                            `}
                        >
                            {content.text ? renderContent(content.text) : (
                                <span className="text-slate-600 italic select-none">
                                    Heading {content.level}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {isReferencesHeading && (
                    <div className="mt-4 pl-4 space-y-2 border-l-2 border-slate-800">
                        {referencesHidden ? (
                            <div className="text-xs text-slate-500 italic flex items-center gap-1.5 py-1">
                                <span>👁️‍🗨️</span>
                                <span>{t('(References list is hidden)', '(قائمة المراجع مخفية)')}</span>
                            </div>
                        ) : (
                            <>
                                {sortedRefBlocks.map((refBlock, idx) => {
                                    let refContent: any = refBlock.content;
                                    if (typeof refContent === 'string') {
                                        try { refContent = JSON.parse(refContent); } catch { refContent = {}; }
                                    }
                                    const litId = refContent?.literatureItemId;
                                    const linkedItem = literatureItems.find(item => item.id === litId);
                                    if (!linkedItem) return null;

                                    let authorsList: any[] = [];
                                    const rawAuthors = linkedItem.authors;
                                    if (typeof rawAuthors === 'string') {
                                        try { authorsList = JSON.parse(rawAuthors); } catch { authorsList = []; }
                                    } else if (Array.isArray(rawAuthors)) {
                                        authorsList = rawAuthors;
                                    }

                                    const formattedAuthors = (() => {
                                        const names = authorsList
                                            .map(a => {
                                                if (typeof a === 'string') return a.trim();
                                                if (a && typeof a === 'object') return (a.name || '').trim();
                                                return '';
                                            })
                                            .filter(name => name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'unknown author');
                                        if (names.length === 0) return 'Unknown Author';
                                        return names.join(', ');
                                    })();

                                    const title = linkedItem.title || 'Untitled';
                                    const year = linkedItem.year ? ` (${linkedItem.year})` : '';
                                    const journal = linkedItem.journal ? `, ${linkedItem.journal}` : '';

                                    return (
                                        <div key={refBlock.id} className="flex items-start gap-2.5 text-xs text-slate-400">
                                            <span className="font-mono font-bold text-slate-500 w-6 flex-shrink-0 text-right">
                                                [{idx + 1}]
                                            </span>
                                            <div className="flex-1">
                                                <span>{formattedAuthors}, </span>
                                                <span className="font-semibold text-slate-350">"{title}"</span>
                                                {journal && <span>{journal}</span>}
                                                {year && <span>{year}</span>}
                                                <span>.</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {sortedRefBlocks.length === 0 && (
                                    <div className="text-xs text-slate-600 italic py-1">
                                        {t('No references cited yet.', 'لا توجد مراجع مقتبسة بعد.')}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
