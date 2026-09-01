'use client';

import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { BlockRenderer } from './BlockRenderer';
import { BlockToolbar } from './BlockToolbar';
import { HoverInsertLine } from './HoverInsertLine';
import { sortByOrder } from '@/lib/fractional-index';
import { BlockType, ScholarBlock } from '@/types';

export function SectionEditor({ sectionBlockId }: { sectionBlockId: string }) {
    const { t, direction } = useLanguage();
    const {
        blocks,
        focusedBlockId,
        addBlock,
        updateBlockContent,
        deleteBlock,
        focusBlock,
        document,
        toggleReferencesVisibility,
    } = useEditorStore();

    const sortedBlocks = sortByOrder(blocks);
    
    // Find heading block index
    const headingIdx = sortedBlocks.findIndex(b => b.id === sectionBlockId);
    if (headingIdx === -1) {
        return (
            <div className="p-8 text-center text-slate-500 text-sm">
                {t('Section not found.', 'القسم غير موجود.')}
            </div>
        );
    }

    const headingBlock = sortedBlocks[headingIdx];
    
    // Extract blocks belonging to this section (excluding standalone REFERENCE blocks)
    const sectionBlocks: ScholarBlock[] = [];
    for (let i = headingIdx + 1; i < sortedBlocks.length; i++) {
        const b = sortedBlocks[i];
        if (b.type === 'HEADING' && b.content?.level === 1) {
            break; // next section starts
        }
        if (b.type !== 'REFERENCE') {
            sectionBlocks.push(b);
        }
    }

    const allBlocksInView = [headingBlock, ...sectionBlocks];
    const lastBlockInSection = allBlocksInView[allBlocksInView.length - 1];

    const handleAddBlockAfter = (afterBlockId: string) => {
        addBlock('TEXT', afterBlockId);
    };

    const isReferencesSec = headingBlock.content?.text?.trim().toLowerCase() === 'references';
    const referencesHidden = !!document?.metadata?.referencesHidden;

    return (
        <div 
            className="flex-1 h-full overflow-y-auto px-4 pb-32" 
            dir={direction}
            onClick={() => focusBlock(null)}
        >
            <div className="max-w-2xl mx-auto py-6 space-y-1" onClick={(e) => e.stopPropagation()}>
                {isReferencesSec && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-200">
                                {t('References Visibility', 'ظهور المراجع')}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {referencesHidden 
                                    ? t('Currently hidden from the document preview. Citations remain active.', 'مخفية حالياً من معاينة المستند. تظل الاقتباسات نشطة.')
                                    : t('Visible in the document preview.', 'مرئية في معاينة المستند.')}
                            </span>
                        </div>
                        <button
                            onClick={toggleReferencesVisibility}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer
                                ${referencesHidden 
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                        >
                            <span>{referencesHidden ? '👁️' : '👁️‍🗨️'}</span>
                            <span>{referencesHidden ? t('Show', 'إظهار') : t('Hide', 'إخفاء')}</span>
                        </button>
                    </div>
                )}
                {allBlocksInView.map((block, index) => {
                    const isHeading = block.id === sectionBlockId;
                    return (
                        <div key={block.id}>
                            <BlockRenderer
                                block={block}
                                isFocused={focusedBlockId === block.id}
                                onContentChange={(content) => updateBlockContent(block.id, content)}
                                onFocus={() => focusBlock(block.id)}
                                // Prevent deleting the section heading node itself from within the block editor
                                onDelete={isHeading ? () => alert(t('Section headings cannot be deleted from the editor.', 'لا يمكن حذف عناوين الأقسام من المحرر.')) : () => deleteBlock(block.id)}
                                onAddAfter={() => handleAddBlockAfter(block.id)}
                            />
                            {/* Insert lines inside section */}
                            <HoverInsertLine afterBlockId={block.id} />
                        </div>
                    );
                })}

                {/* Scoped Toolbar: Appends to the end of the current section */}
                <div className="mt-6 pt-4 border-t border-slate-800/40">
                    <BlockToolbar 
                        onAddBlock={(type: BlockType) => addBlock(type, lastBlockInSection.id)} 
                    />
                </div>
            </div>
        </div>
    );
}
