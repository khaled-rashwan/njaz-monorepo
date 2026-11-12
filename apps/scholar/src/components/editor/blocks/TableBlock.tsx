'use client';

import { useState } from 'react';
import { BlockProps, TableContent } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { buildCounterMap, toRoman, resolveRef } from '@/lib/cross-reference';
import { CitationPopover } from '../CitationPopover';
import { useEffect } from 'react';

function InlineMath({ latex }: { latex: string }) {
    const [html, setHtml] = useState(latex);

    useEffect(() => {
        let isMounted = true;
        import('katex').then((katex) => {
            if (isMounted) {
                const rendered = katex.default.renderToString(latex, {
                    displayMode: false,
                    throwOnError: false,
                });
                setHtml(rendered);
            }
        }).catch(() => {});
        return () => {
            isMounted = false;
        };
    }, [latex]);

    return (
        <span 
            className="inline-block px-1 align-middle"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export function TableBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const { t, language } = useLanguage();
    const content = (block.content || {
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [['', '', '']],
        caption: '',
    }) as TableContent;

    const blocks = useEditorStore((state) => state.blocks);
    const counterMap = buildCounterMap(blocks);
    const tableEntry = counterMap.get(block.id);
    const tableNumber = tableEntry ? toRoman(tableEntry.counter) : 'I';

    const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
    const [citationTarget, setCitationTarget] = useState<{ rowIdx: number; colIdx: number } | null>(null);
    const [showCitationPopover, setShowCitationPopover] = useState(false);

    const updateHeader = (colIndex: number, value: string) => {
        const newHeaders = [...content.headers];
        newHeaders[colIndex] = value;
        onContentChange({ ...content, headers: newHeaders });
    };

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = content.rows.map(r => [...r]);
        newRows[rowIndex][colIndex] = value;
        onContentChange({ ...content, rows: newRows });
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        updateCell(rowIndex, colIndex, value);
        if (value.endsWith('[[')) {
            setCitationTarget({ rowIdx: rowIndex, colIdx: colIndex });
            setShowCitationPopover(true);
        }
    };

    const handleSelectCitation = (blockId: string | string[]) => {
        setShowCitationPopover(false);
        if (!citationTarget) return;
        const { rowIdx, colIdx } = citationTarget;
        const currentVal = content.rows[rowIdx][colIdx];
        const idString = Array.isArray(blockId) ? blockId.join(',') : blockId;
        const triggerPattern = /\[\[(?!ref:)/g;
        let lastIdx = -1;
        let match;
        while ((match = triggerPattern.exec(currentVal)) !== null) {
            lastIdx = match.index;
        }
        if (lastIdx !== -1) {
            const newVal = currentVal.substring(0, lastIdx) + `[[ref:${idString}]]` + currentVal.substring(lastIdx + 2);
            updateCell(rowIdx, colIdx, newVal);
        }
        setCitationTarget(null);
    };

    const addRow = () => {
        const newRow = new Array(content.headers.length).fill('');
        onContentChange({ ...content, rows: [...content.rows, newRow] });
    };

    const addColumn = () => {
        const newHeaders = [...content.headers, `Column ${content.headers.length + 1}`];
        const newRows = content.rows.map(r => [...r, '']);
        onContentChange({ ...content, headers: newHeaders, rows: newRows });
    };

    const removeRow = (rowIndex: number) => {
        if (content.rows.length <= 1) return;
        const newRows = content.rows.filter((_, i) => i !== rowIndex);
        onContentChange({ ...content, rows: newRows });
    };

    const removeColumn = (colIndex: number) => {
        if (content.headers.length <= 1) return;
        const newHeaders = content.headers.filter((_, i) => i !== colIndex);
        const newRows = content.rows.map(r => r.filter((_, i) => i !== colIndex));
        onContentChange({ ...content, headers: newHeaders, rows: newRows });
    };

    const renderCellContent = (text: string) => {
        if (!text) return <span className="text-slate-600">—</span>;

        const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
        const MATH_PATTERN = /\$([^\$]+)\$/g;

        const refParts = [];
        let lastIndex = 0;
        let match;
        const pattern = new RegExp(REF_PATTERN.source, 'g');

        while ((match = pattern.exec(text)) !== null) {
            const index = match.index;
            const blockId = match[1];

            if (index > lastIndex) {
                refParts.push({ type: 'text', content: text.substring(lastIndex, index) });
            }

            refParts.push({ type: 'ref', content: blockId });
            lastIndex = pattern.lastIndex;
        }

        if (lastIndex < text.length) {
            refParts.push({ type: 'text', content: text.substring(lastIndex) });
        }
        if (refParts.length === 0) {
            refParts.push({ type: 'text', content: text });
        }

        const finalParts: React.ReactNode[] = [];
        
        refParts.forEach((part, partIdx) => {
            if (part.type === 'ref') {
                const resolvedText = resolveRef(part.content, counterMap, language);
                finalParts.push(
                    <span
                        key={`ref-${part.content}-${partIdx}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            const element = document.getElementById(`block-${part.content}`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                useEditorStore.getState().focusBlock(part.content);
                            }
                        }}
                        className="inline-flex items-center mx-1 px-1 py-0.5 rounded text-[10px] font-semibold
                                   bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50
                                   text-amber-400 hover:text-amber-300 cursor-pointer select-none transition-all"
                    >
                        {resolvedText}
                    </span>
                );
            } else {
                const segment = part.content;
                let segmentIndex = 0;
                let mathMatch;
                const mPattern = new RegExp(MATH_PATTERN.source, 'g');

                while ((mathMatch = mPattern.exec(segment)) !== null) {
                    const idx = mathMatch.index;
                    const latex = mathMatch[1];

                    if (idx > segmentIndex) {
                        finalParts.push(segment.substring(segmentIndex, idx));
                    }

                    finalParts.push(
                        <InlineMath key={`math-${latex}-${partIdx}-${idx}`} latex={latex} />
                    );
                    segmentIndex = mPattern.lastIndex;
                }

                if (segmentIndex < segment.length) {
                    finalParts.push(segment.substring(segmentIndex));
                }
            }
        });

        return finalParts;
    };

    return (
        <div className="w-full flex flex-col gap-2" onClick={onFocus}>
            {/* Table Caption (Above Table) */}
            <div className="text-center mb-1">
                {isFocused ? (
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-amber-500/70 font-mono select-none">
                            {t(`Table ${tableNumber}`, `جدول ${tableNumber}`)}
                        </span>
                        <input
                            value={content.caption || ''}
                            onChange={(e) => onContentChange({ ...content, caption: e.target.value })}
                            placeholder={t('Table caption...', 'عنوان الجدول...')}
                            className="w-full bg-transparent text-sm text-slate-400 italic outline-none
                                       text-center focus:text-slate-300 transition-colors"
                        />
                    </div>
                ) : (
                    <p className="text-sm font-medium text-slate-300 text-center">
                        <span className="text-amber-400 font-semibold">{t(`Table ${tableNumber}`, `جدول ${tableNumber}`)}</span>
                        {content.caption ? `: ${content.caption}` : ''}
                    </p>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-800/50">
                            {content.headers.map((header, colIdx) => (
                                <th key={colIdx} className="relative group">
                                    <input
                                        value={header}
                                        onChange={(e) => updateHeader(colIdx, e.target.value)}
                                        className="w-full bg-transparent px-3 py-2.5 text-amber-400 font-semibold text-xs
                                                   uppercase tracking-wider outline-none border-b border-amber-500/20
                                                   focus:border-amber-500/50 transition-colors"
                                    />
                                    {isFocused && content.headers.length > 1 && (
                                        <button
                                            onClick={() => removeColumn(colIdx)}
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white
                                                       text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100
                                                       transition-opacity hover:bg-red-500"
                                        >
                                            ×
                                        </button>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {content.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="group border-b border-slate-700/30 hover:bg-slate-800/20">
                                {row.map((cell, colIdx) => (
                                    <td key={colIdx} className="p-0 min-w-[100px]">
                                        {activeCell?.rowIdx === rowIdx && activeCell?.colIdx === colIdx ? (
                                            <input
                                                value={cell}
                                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                                onBlur={() => setTimeout(() => setActiveCell(null), 150)}
                                                autoFocus
                                                className="w-full bg-transparent px-3 py-2 text-slate-300 outline-none
                                                           focus:bg-amber-500/5 transition-colors text-sm"
                                                placeholder="—"
                                            />
                                        ) : (
                                            <div
                                                onClick={() => setActiveCell({ rowIdx, colIdx })}
                                                className="w-full min-h-[36px] px-3 py-2 text-slate-300 hover:bg-slate-800/10 cursor-text text-sm flex items-center"
                                            >
                                                {renderCellContent(cell)}
                                            </div>
                                        )}
                                    </td>
                                ))}
                                {isFocused && content.rows.length > 1 && (
                                    <td className="w-6 p-0">
                                        <button
                                            onClick={() => removeRow(rowIdx)}
                                            className="w-full h-full flex items-center justify-center text-red-400/50
                                                       hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                        >
                                            ×
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Actions */}
            {isFocused && (
                <div className="flex items-center gap-2 mt-1">
                    <button onClick={addRow} className="futuristic-btn-ghost text-xs flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('Add Row', 'إضافة صف')}
                    </button>
                    <button onClick={addColumn} className="futuristic-btn-ghost text-xs flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('Add Column', 'إضافة عمود')}
                    </button>
                </div>
            )}

            {showCitationPopover && (
                <CitationPopover
                    onSelect={handleSelectCitation}
                    onClose={() => {
                        setShowCitationPopover(false);
                        setCitationTarget(null);
                    }}
                />
            )}
        </div>
    );
}
