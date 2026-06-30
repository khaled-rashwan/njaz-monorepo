'use client';

import { BlockProps, ReferenceContent } from '@/types';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { sortByOrder } from '@/lib/fractional-index';

export function ReferenceBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const { t } = useLanguage();
    const content = (block.content || { literatureItemId: '', citationKey: '' }) as ReferenceContent;
    const literatureItems = useEditorStore((s) => s.literatureItems);
    const blocks = useEditorStore((s) => s.blocks);

    const sorted = sortByOrder(blocks);
    const refBlocks = sorted.filter(b => b.type === 'REFERENCE');
    const refIndex = refBlocks.findIndex(b => b.id === block.id) + 1;

    const linkedItem = literatureItems.find(i => i.id === content.literatureItemId);

    const handleSelect = (itemId: string) => {
        const item = literatureItems.find(i => i.id === itemId);
        let firstAuthorLastName = 'Unknown';
        if (item) {
            let itemAuthors = item.authors;
            if (typeof itemAuthors === 'string') {
                try {
                    itemAuthors = JSON.parse(itemAuthors);
                } catch (e) {
                    itemAuthors = [];
                }
            }
            if (Array.isArray(itemAuthors) && itemAuthors[0]) {
                const fullName = (itemAuthors[0] as any)?.name || '';
                firstAuthorLastName = fullName.split(' ').pop() || 'Unknown';
            }
        }

        onContentChange({
            ...content,
            literatureItemId: itemId,
            citationKey: item ? `${firstAuthorLastName}, ${item.year || 'n.d.'}` : '',
        });
    };

    let authorsList: any[] = [];
    if (linkedItem) {
        const rawAuthors = linkedItem.authors;
        if (typeof rawAuthors === 'string') {
            try {
                authorsList = JSON.parse(rawAuthors);
            } catch (e) {
                authorsList = [];
            }
        } else if (Array.isArray(rawAuthors)) {
            authorsList = rawAuthors;
        }
    }

    return (
        <div className="w-full" onClick={onFocus}>
            {linkedItem ? (
                <div className="w-full text-slate-350 text-sm py-1.5 px-3 rounded hover:bg-slate-800/10 transition-colors flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 select-none flex-shrink-0">[{refIndex}]</span>
                    <div className="flex-1 min-w-0 text-slate-300">
                        <span>{authorsList.map(a => a.name).join(', ') || 'Unknown Author'}, </span>
                        <span className="italic">"{linkedItem.title}"</span>
                        {linkedItem.journal && <span>, {linkedItem.journal}</span>}
                        <span> ({linkedItem.year || 'n.d.'}).</span>
                    </div>
                    {isFocused && (
                        <button
                            onClick={() => onContentChange({ ...content, literatureItemId: '', citationKey: '' })}
                            className="flex-shrink-0 p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors ml-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {literatureItems.length > 0 ? (
                        <select
                            value={content.literatureItemId}
                            onChange={(e) => handleSelect(e.target.value)}
                            className="futuristic-input text-sm"
                        >
                            <option value="">{t('Select a reference from your library...', 'اختر مرجعاً من مكتبتك...')}</option>
                            {literatureItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.title} ({item.year || 'n.d.'})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="p-4 rounded-lg border border-dashed border-slate-700/50 text-center">
                            <p className="text-sm text-slate-500">
                                {t('No literature items yet. Add papers from the Literature panel first.', 'لا توجد عناصر أدبية بعد. أضف أوراقاً من لوحة الأدبيات أولاً.')}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
