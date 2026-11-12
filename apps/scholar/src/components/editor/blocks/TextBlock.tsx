'use client';

import { BlockProps, BlockType, TextContent } from '@/types';
import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { buildCounterMap, resolveRef } from '@/lib/cross-reference';
import { CitationPopover } from '../CitationPopover';
import { sortByOrder } from '@/lib/fractional-index';

function calculateListNumber(blockId: string, blocks: any[]): number {
    const sorted = sortByOrder(blocks);
    const index = sorted.findIndex(b => b.id === blockId);
    if (index === -1) return 1;

    let counter = 1;
    for (let i = index - 1; i >= 0; i--) {
        const b = sorted[i];
        if (b.type === 'TEXT' && b.content?.listType === 'ordered') {
            counter++;
        } else {
            break;
        }
    }
    return counter;
}

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

// Convert tag string [[ref:uuid]] into interactive HTML spans
function textToHtml(
    text: string,
    counterMap: Map<string, { type: BlockType; counter: number }>,
    language: 'en' | 'ar' = 'en'
): string {
    if (!text) return '';
    const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
    return text.replace(REF_PATTERN, (_, blockId) => {
        const resolvedText = resolveRef(blockId, counterMap, language);
        return `<span contenteditable="false" data-ref-id="${blockId}" class="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 cursor-pointer select-none transition-all">${resolvedText}</span>`;
    });
}

// Parse editing HTML content back to tags [[ref:uuid]]
function htmlToText(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let result = '';
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.nodeValue;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const refId = el.getAttribute('data-ref-id');
            if (refId) {
                result += `[[ref:${refId}]]`;
            } else if (el.tagName === 'BR') {
                result += '\n';
            } else {
                for (let i = 0; i < el.childNodes.length; i++) {
                    walk(el.childNodes[i]);
                }
            }
        }
    };
    
    for (let i = 0; i < tempDiv.childNodes.length; i++) {
        walk(tempDiv.childNodes[i]);
    }
    return result;
}

export function TextBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const content = (block.content || { text: '', format: 'markdown' }) as TextContent;
    const lastTextRef = useRef(content.text || '');

    const { t, language, direction } = useLanguage();
    const blocks = useEditorStore((state) => state.blocks);
    const focusBlock = useEditorStore((state) => state.focusBlock);
    const literatureItems = useEditorStore((state) => state.literatureItems);
    const counterMap = buildCounterMap(blocks);

    const listType = (content as any).listType || 'none';
    const listNumber = listType === 'ordered' ? calculateListNumber(block.id, blocks) : null;

    const [showCitationPopover, setShowCitationPopover] = useState(false);
    const [tooltipData, setTooltipData] = useState<{
        x: number;
        y: number;
        blockId: string;
    } | null>(null);

    const renderPrefix = () => {
        if (listType === 'ordered') {
            return (
                <span className={`text-amber-500 font-semibold font-mono select-none w-6 flex-shrink-0 mt-1 ${
                    direction === 'rtl' ? 'text-left pl-1.5' : 'text-right pr-1.5'
                }`}>
                    {listNumber}.
                </span>
            );
        }
        if (listType === 'unordered') {
            return (
                <span className={`text-amber-500 font-semibold select-none w-6 text-center flex-shrink-0 mt-1 ${
                    direction === 'rtl' ? 'pl-1.5' : 'pr-1.5'
                }`}>
                    •
                </span>
            );
        }
        return null;
    };

    // Keep DOM in sync with external changes, but avoid resetting while typing
    useEffect(() => {
        if (isFocused && editorRef.current) {
            const currentHtmlText = htmlToText(editorRef.current.innerHTML);
            if (content.text !== currentHtmlText) {
                editorRef.current.innerHTML = textToHtml(content.text || '', counterMap, language);
                lastTextRef.current = content.text || '';
            }
        }
    }, [content.text, isFocused, counterMap, language]);

    // Focus and load content when focused
    useEffect(() => {
        if (isFocused && editorRef.current) {
            editorRef.current.innerHTML = textToHtml(content.text || '', counterMap, language);
            lastTextRef.current = content.text || '';
            editorRef.current.focus();
        }
    }, [isFocused]);

    // Handle outside clicks to close active tooltips
    useEffect(() => {
        if (!tooltipData) return;
        const handleOutsideClick = () => {
            setTooltipData(null);
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [tooltipData]);

    const handleInput = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            const text = htmlToText(html);
            lastTextRef.current = text;
            onContentChange({
                ...content,
                text,
            });

            // Check if cursor is directly after "[[" trigger
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
                if (textBeforeCursor.endsWith('[[')) {
                    setShowCitationPopover(true);
                }
            }
        }
    };

    const handleSelectCitation = (blockId: string | string[]) => {
        setShowCitationPopover(false);
        const currentText = content.text || '';
        
        const idString = Array.isArray(blockId) ? blockId.join(',') : blockId;

        // Find the index of the trigger "[["
        const triggerPattern = /\[\[(?!ref:)/g;
        let lastIdx = -1;
        let match;
        while ((match = triggerPattern.exec(currentText)) !== null) {
            lastIdx = match.index;
        }
        if (lastIdx !== -1) {
            const newText = currentText.substring(0, lastIdx) + `[[ref:${idString}]]` + currentText.substring(lastIdx + 2);
            
            // 1. Update text state
            onContentChange({
                ...content,
                text: newText,
            });

            // 2. Refocus and position cursor after the inserted tag
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.innerHTML = textToHtml(newText, counterMap, language);
                    editorRef.current.focus();
                    
                    const span = editorRef.current.querySelector(`[data-ref-id="${idString}"]`);
                    if (span) {
                        const range = document.createRange();
                        const sel = window.getSelection();
                        range.setStartAfter(span);
                        range.collapse(true);
                        if (sel) {
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                }
            }, 100);
        }
    };

    const handleRemoveReference = (e: React.MouseEvent, refIdToRemove: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        setTooltipData(null);

        const currentText = content.text || '';
        const REF_PATTERN = /\[\[ref:([a-f0-9-,\s]+)\]\]/g;
        
        const newText = currentText.replace(REF_PATTERN, (match, idsStr) => {
            const ids = idsStr.split(',').map((id: string) => id.trim()).filter(Boolean);
            const filteredIds = ids.filter((id: string) => id !== refIdToRemove);
            if (filteredIds.length === 0) {
                return '';
            }
            return `[[ref:${filteredIds.join(',')}]]`;
        });

        onContentChange({
            ...content,
            text: newText,
        });

        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerHTML = textToHtml(newText, counterMap, language);
            }
        }, 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Handle Backspace and Delete for contenteditable="false" chips
        if (e.key === 'Backspace' && editorRef.current) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Case 1: Cursor is at offset 0 of a text node, check if the previous sibling is a citation chip
                if (range.collapsed && range.startOffset === 0) {
                    const node = range.startContainer;
                    const prevSibling = node.previousSibling;
                    if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE && (prevSibling as HTMLElement).hasAttribute('data-ref-id')) {
                        e.preventDefault();
                        prevSibling.remove();
                        handleInput();
                        return;
                    }
                }
                
                // Case 2: Cursor is in the parent element container (e.g. the div itself), and the child just before the cursor is a citation chip
                if (range.collapsed && range.startContainer === editorRef.current) {
                    const offset = range.startOffset;
                    if (offset > 0) {
                        const prevNode = editorRef.current.childNodes[offset - 1];
                        if (prevNode && prevNode.nodeType === Node.ELEMENT_NODE && (prevNode as HTMLElement).hasAttribute('data-ref-id')) {
                            e.preventDefault();
                            prevNode.remove();
                            handleInput();
                            return;
                        }
                    }
                }
            }
        }

        if (e.key === 'Delete' && editorRef.current) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                
                // Case 1: Cursor is at the end of a text node, check if next sibling is a citation chip
                if (range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === (range.startContainer.textContent?.length || 0)) {
                    const node = range.startContainer;
                    const nextSibling = node.nextSibling;
                    if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE && (nextSibling as HTMLElement).hasAttribute('data-ref-id')) {
                        e.preventDefault();
                        nextSibling.remove();
                        handleInput();
                        return;
                    }
                }
                
                // Case 2: Cursor is in the parent element container, and the child just after the cursor is a citation chip
                if (range.collapsed && range.startContainer === editorRef.current) {
                    const offset = range.startOffset;
                    if (offset < editorRef.current.childNodes.length) {
                        const nextNode = editorRef.current.childNodes[offset];
                        if (nextNode && nextNode.nodeType === Node.ELEMENT_NODE && (nextNode as HTMLElement).hasAttribute('data-ref-id')) {
                            e.preventDefault();
                            nextNode.remove();
                            handleInput();
                            return;
                        }
                    }
                }
            }
        }

        // Bold: Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold');
        }
        // Italic: Ctrl+I
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic');
        }
    };

    const handleChipClick = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        e.preventDefault();
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltipData({
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY,
            blockId,
        });
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const chip = target.closest('[data-ref-id]');
        if (chip) {
            const refId = chip.getAttribute('data-ref-id');
            if (refId) {
                handleChipClick(e, refId);
            }
        }
    };

    const renderContent = (text: string) => {
        if (!text) return null;

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
                        onClick={(e) => handleChipClick(e, part.content)}
                        className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-xs font-semibold
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

    const renderTooltip = () => {
        if (!tooltipData) return null;
        
        const ids = tooltipData.blockId.split(',').map(id => id.trim()).filter(Boolean);
        const resolvedItems = ids.map(id => {
            const refBlock = blocks.find(b => b.id === id);
            if (!refBlock || refBlock.type !== 'REFERENCE') return null;
            const litId = refBlock.content?.literatureItemId;
            const litItem = literatureItems.find(li => li.id === litId);
            return {
                blockId: id,
                counter: counterMap.get(id)?.counter || '?',
                item: litItem,
            };
        }).filter(Boolean);

        return (
            <div 
                className="fixed z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-4 w-80 max-h-64 overflow-y-auto text-xs flex flex-col gap-3 animate-fade-in"
                style={{
                    left: `${Math.min(tooltipData.x, window.innerWidth - 340)}px`,
                    top: `${tooltipData.y + 6}px`,
                    background: 'linear-gradient(180deg, rgba(20, 28, 45, 0.98) 0%, rgba(10, 14, 26, 0.99) 100%)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.05)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-750 pb-1.5">
                    <span className="font-semibold text-amber-500 uppercase tracking-wider">
                        {t('Citation Info', 'معلومات المرجع')}
                    </span>
                    <button 
                        onClick={() => setTooltipData(null)}
                        className="text-slate-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="space-y-3">
                    {resolvedItems.map((entry, idx) => {
                        if (!entry) return null;
                        const { counter, item } = entry;
                        if (!item) {
                            return (
                                <div key={idx} className="text-slate-400 italic">
                                    {t(`Reference [${counter}] (Metadata not found)`, `المرجع [${counter}] (لم يتم العثور على البيانات الوصفية)`)}
                                </div>
                            );
                        }
                        
                        const authorsStr = item.authors && item.authors.length > 0
                            ? item.authors.map(a => a.name).join(', ')
                            : t('Unknown Authors', 'مؤلفون غير معروفين');
                            
                        return (
                            <div key={idx} className="space-y-1 pb-2 border-b border-slate-800/50 last:border-b-0 last:pb-0 text-left">
                                <div className="font-medium text-white flex gap-1.5 items-start justify-between">
                                    <div className="flex gap-1.5 items-baseline">
                                        <span className="text-amber-500 font-bold">[{counter}]</span>
                                        <span>{item.title}</span>
                                    </div>
                                    {isFocused && (
                                        <button
                                            onClick={(e) => handleRemoveReference(e, entry.blockId)}
                                            className="text-red-400 hover:text-red-300 ml-2 p-0.5 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                                            title={t('Remove citation from text', 'إزالة الاقتباس من النص')}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div className="text-slate-400 text-[10px] italic">
                                    {authorsStr} {item.year ? `(${item.year})` : ''}
                                </div>
                                {item.journal && (
                                    <div className="text-slate-500 text-[10px]">
                                        {item.journal}
                                    </div>
                                )}
                                {item.url && (
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-amber-400/85 hover:text-amber-300 transition-colors inline-block text-[10px] underline"
                                    >
                                        {item.url}
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex items-start w-full group">
            {renderPrefix()}
            <div className="flex-1 min-w-0">
                {isFocused ? (
                    <div
                        key="edit"
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        onFocus={onFocus}
                        onKeyDown={handleKeyDown}
                        onClick={handleContainerClick}
                        dir="auto"
                        className={`
                            w-full min-h-[2rem] outline-none text-slate-200 leading-relaxed
                            text-[15px] py-1 px-1 rounded transition-colors
                            empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600
                            focus:bg-amber-500/[0.02]
                        `}
                        data-placeholder="Start writing or press '/' for commands..."
                    />
                ) : (
                    <div
                        key="preview"
                        onClick={onFocus}
                        dir="auto"
                        className="w-full min-h-[2rem] text-slate-200 leading-relaxed text-[15px] py-1 px-1 cursor-text"
                    >
                        {content.text ? renderContent(content.text) : (
                            <span className="text-slate-600 italic select-none">
                                Start writing or press '/' for commands...
                            </span>
                        )}
                    </div>
                )}
            </div>

            {showCitationPopover && (
                <CitationPopover
                    onSelect={handleSelectCitation}
                    onClose={() => setShowCitationPopover(false)}
                />
            )}

            {renderTooltip()}
        </div>
    );
}
