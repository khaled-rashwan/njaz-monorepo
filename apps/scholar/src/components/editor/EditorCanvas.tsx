'use client';

import { useRef, useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { extractKeywords } from '@/lib/keyword-extractor';
import { BlockRenderer } from './BlockRenderer';
import { BlockToolbar } from './BlockToolbar';
import { HoverInsertLine } from './HoverInsertLine';
import { sortByOrder } from '@/lib/fractional-index';
import { BlockType } from '@/types';

import { filterBlocksForDocument } from '@/lib/cross-reference';

export function EditorCanvas() {
    const { t, direction } = useLanguage();
    const {
        document,
        blocks,
        focusedBlockId,
        addBlock,
        updateBlockContent,
        deleteBlock,
        focusBlock,
        updateDocumentTitle,
    } = useEditorStore();

    const titleRef = useRef<HTMLTextAreaElement>(null);
    const abstractRef = useRef<HTMLTextAreaElement>(null);
    const keywordsRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [document?.title]);

    useEffect(() => {
        if (abstractRef.current) {
            abstractRef.current.style.height = 'auto';
            abstractRef.current.style.height = `${abstractRef.current.scrollHeight}px`;
        }
    }, [document?.abstract]);

    useEffect(() => {
        if (keywordsRef.current) {
            keywordsRef.current.style.height = 'auto';
            keywordsRef.current.style.height = `${keywordsRef.current.scrollHeight}px`;
        }
    }, [document?.metadata?.keywords]);

    const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);

    const handleGenerateKeywords = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const abstractText = document?.abstract;
        if (!abstractText) return;

        setIsGeneratingKeywords(true);
        // Simulate a minor visual processing delay (500ms) for high-end UI feel
        setTimeout(() => {
            try {
                const titleText = document?.title || '';
                const result = extractKeywords(titleText, abstractText);
                if (result) {
                    useEditorStore.getState().updateDocumentKeywords(result);
                }
            } catch (err) {
                console.error('Failed to extract keywords:', err);
            } finally {
                setIsGeneratingKeywords(false);
            }
        }, 500);
    };

    const filteredBlocks = filterBlocksForDocument(blocks, document);
    const sortedBlocks = sortByOrder(filteredBlocks).filter(b => b.type !== 'REFERENCE');

    if (!document) return null;

    const handleAddBlockAfter = (afterBlockId: string) => {
        // Default to TEXT block when using quick-add
        addBlock('TEXT', afterBlockId);
    };

    return (
        <div 
            className="flex-1 h-full overflow-y-auto" 
            dir={direction}
            onClick={() => focusBlock(null)}
        >
            {/* Document Header */}
            <div className="max-w-3xl mx-auto px-8 pt-12 pb-6" onClick={(e) => e.stopPropagation()}>
                {/* Document Title */}
                <textarea
                    ref={titleRef}
                    value={document.title}
                    onChange={(e) => updateDocumentTitle(e.target.value)}
                    placeholder={t('Untitled Document', 'مستند بدون عنوان')}
                    className="w-full bg-transparent text-2xl sm:text-3xl md:text-4xl font-extrabold text-white outline-none 
                               placeholder:text-slate-700 mb-2 leading-tight resize-none overflow-hidden"
                    dir={direction}
                    rows={1}
                />

                {/* Document Abstract */}
                <textarea
                    ref={abstractRef}
                    value={document.abstract || ''}
                    onChange={(e) => useEditorStore.getState().updateDocumentAbstract(e.target.value)}
                    placeholder={t('Add an abstract...', 'أضف ملخصاً...')}
                    className="w-full bg-transparent text-base text-slate-400 outline-none
                               placeholder:text-slate-700 italic resize-none overflow-hidden"
                    dir={direction}
                    rows={1}
                />

                {/* Document Keywords */}
                <div className="relative group/keywords mt-2 flex flex-col items-start">
                    <textarea
                        ref={keywordsRef}
                        value={document.metadata?.keywords || ''}
                        onChange={(e) => useEditorStore.getState().updateDocumentKeywords(e.target.value)}
                        placeholder={t('Keywords / Index Terms (comma separated)...', 'الكلمات المفتاحية / المصطلحات الدليلية (مفصولة بفاصلة)...')}
                        className="w-full bg-transparent text-sm text-slate-500 outline-none
                                   placeholder:text-slate-700 resize-none overflow-hidden font-sans pr-24"
                        dir={direction}
                        rows={1}
                    />
                    {document.abstract && (
                        <button
                            onClick={handleGenerateKeywords}
                            disabled={isGeneratingKeywords}
                            className="absolute right-0 top-0 text-[10px] text-purple-400/90 hover:text-purple-300 font-sans transition-all flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 rounded-md disabled:opacity-50 select-none shadow-sm"
                        >
                            {isGeneratingKeywords ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                    <span>{t('Generating...', 'جاري التوليد...')}</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>{t('Auto-Generate', 'توليد تلقائي')}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="mt-6 border-b border-slate-700/30" />
            </div>

            {/* Blocks */}
            <div className="max-w-3xl mx-auto px-8 pb-32">
                <div className="pl-10 pr-8 space-y-1">
                    <HoverInsertLine afterBlockId="__START__" />
                    {sortedBlocks.map((block) => (
                        <div key={block.id}>
                            <BlockRenderer
                                block={block}
                                isFocused={focusedBlockId === block.id}
                                onContentChange={(content) => updateBlockContent(block.id, content)}
                                onFocus={() => focusBlock(block.id)}
                                onDelete={() => deleteBlock(block.id)}
                                onAddAfter={() => handleAddBlockAfter(block.id)}
                            />
                            <HoverInsertLine afterBlockId={block.id} />
                        </div>
                    ))}
                </div>

                {/* Add Block Toolbar */}
                <div className="mt-4 pl-10 pr-8">
                    <BlockToolbar onAddBlock={(type: BlockType) => addBlock(type)} />
                </div>

                {/* Block count */}
                <div className="mt-8 text-center">
                    <span className="text-xs text-slate-700">
                        {sortedBlocks.length} {t('blocks', 'بلوك')}
                    </span>
                </div>
            </div>
        </div>
    );
}
