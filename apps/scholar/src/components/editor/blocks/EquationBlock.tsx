'use client';

import { BlockProps, EquationContent } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { buildCounterMap } from '@/lib/cross-reference';

export function EquationBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const content = (block.content || { latex: '', displayMode: true }) as EquationContent;
    const [isEditing, setIsEditing] = useState(!content.latex);
    const [renderedHtml, setRenderedHtml] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const blocks = useEditorStore((state) => state.blocks);
    const counterMap = buildCounterMap(blocks);
    const eqEntry = counterMap.get(block.id);
    const eqNumber = eqEntry ? eqEntry.counter : 1;

    // Render LaTeX using KaTeX
    useEffect(() => {
        if (content.latex) {
            try {
                // Dynamic import to avoid SSR issues
                import('katex').then((katex) => {
                    const html = katex.default.renderToString(content.latex, {
                        displayMode: content.displayMode,
                        throwOnError: false,
                        errorColor: '#ef4444',
                    });
                    setRenderedHtml(html);
                }).catch(() => {
                    setRenderedHtml(`<span style="color: #ef4444">Failed to load KaTeX</span>`);
                });
            } catch (error) {
                setRenderedHtml(`<span style="color: #ef4444">Invalid LaTeX</span>`);
            }
        } else {
            setRenderedHtml('');
        }
    }, [content.latex, content.displayMode]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleLatexChange = (latex: string) => {
        onContentChange({ ...content, latex });
    };

    return (
        <div className="w-full" onClick={onFocus}>
            {isEditing || isFocused ? (
                <div className="space-y-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                    {/* LaTeX Source */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-purple-400/70">LaTeX</span>
                            <button
                                onClick={() => onContentChange({ ...content, displayMode: !content.displayMode })}
                                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                    content.displayMode
                                        ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                                        : 'text-slate-500 border-slate-600/30'
                                }`}
                            >
                                {content.displayMode ? 'Display' : 'Inline'}
                            </button>
                        </div>
                        <span className="text-xs text-slate-500 font-mono select-none">
                            Equation ({eqNumber})
                        </span>
                    </div>
                    <textarea
                        ref={inputRef}
                        value={content.latex}
                        onChange={(e) => handleLatexChange(e.target.value)}
                        onBlur={() => content.latex && setIsEditing(false)}
                        placeholder="E = mc^2"
                        className="w-full futuristic-input font-mono text-sm text-purple-300 min-h-[50px] resize-y p-2"
                        rows={1}
                    />

                    {/* Live Preview */}
                    {content.latex && (
                        <div className="p-2 rounded bg-slate-800/30 border border-purple-500/10 relative flex flex-col min-h-[50px] justify-center">
                            <div className="absolute left-2 top-1 text-[9px] text-slate-500 select-none">Preview</div>
                            <div className="w-full flex items-center justify-between gap-4 pt-3">
                                <div className="w-10 flex-shrink-0" />
                                <div
                                    className="flex-1 overflow-visible py-1 text-center flex justify-center text-white"
                                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                                />
                                <span className="w-10 flex-shrink-0 text-right text-slate-400 font-mono select-none text-sm">
                                    ({eqNumber})
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    className="cursor-pointer py-1.5 px-3 rounded hover:bg-purple-500/5 transition-colors"
                    onClick={() => setIsEditing(true)}
                >
                    {renderedHtml ? (
                        <div className="w-full flex items-center justify-between gap-4">
                            <div className="w-10 flex-shrink-0" />
                            <div
                                className="flex-1 overflow-visible py-1 text-center flex justify-center text-white"
                                dangerouslySetInnerHTML={{ __html: renderedHtml }}
                            />
                            <span className="w-10 flex-shrink-0 text-right text-slate-400 font-mono select-none text-sm">
                                ({eqNumber})
                            </span>
                        </div>
                    ) : (
                        <div className="text-slate-500 italic text-sm text-center">
                            Click to add equation...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
