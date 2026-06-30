'use client';

import { BlockProps, AIPromptContent } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';

import { useState } from 'react';

export function AIPromptBlock({ block, isFocused, onContentChange, onFocus }: BlockProps) {
    const { t } = useLanguage();
    const content = (block.content || { prompt: '', contextBlockIds: [], generatedText: '' }) as AIPromptContent;
    const blocks = useEditorStore((s) => s.blocks);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!content.prompt.trim()) return;
        setIsGenerating(true);
        setErrorMsg(null);

        try {
            // Build context text from selected blocks
            const contextText = (content.contextBlockIds || [])
                .map(id => blocks.find(b => b.id === id)?.content?.text || '')
                .join('\n\n');

            const res = await fetch('/api/llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ prompt: content.prompt, contextText })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to generate text');
            }

            onContentChange({
                ...content,
                generatedText: data.result,
            });
        } catch (err: any) {
            console.error('Generation error:', err);
            setErrorMsg(err.message || 'An unknown error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full" onClick={onFocus}>
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.03] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border-b border-purple-500/10">
                    <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                        {t('AI Co-Author', 'مساعد الذكاء الاصطناعي')}
                    </span>
                    <div className="ml-auto">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            {t('Protected by API Proxy', 'محمي بواسطة بروكسي')}
                        </span>
                    </div>
                </div>

                {/* Prompt Input */}
                <div className="p-4 space-y-3">
                    <textarea
                        value={content.prompt}
                        onChange={(e) => onContentChange({ ...content, prompt: e.target.value })}
                        placeholder={t(
                            'Describe what you want the AI to write... e.g., "Write a methods section describing our experimental setup with 200 participants."',
                            'صف ما تريد أن يكتبه الذكاء الاصطناعي... مثال: "اكتب قسم المنهجية الذي يصف تصميمنا التجريبي مع 200 مشارك."'
                        )}
                        className="w-full bg-purple-500/5 border border-purple-500/15 rounded-lg p-3 text-sm text-slate-200
                                   outline-none focus:border-purple-500/30 transition-colors resize-y min-h-[80px]
                                   placeholder:text-slate-600"
                        rows={3}
                    />

                    {/* Context Blocks */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500">{t('Context:', 'السياق:')}</span>
                        {(content.contextBlockIds || []).map(id => {
                            const b = blocks.find(bl => bl.id === id);
                            return (
                                <span key={id} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 flex items-center gap-1">
                                    {b?.type || 'Block'}
                                    <button
                                        onClick={() => {
                                            onContentChange({
                                                ...content,
                                                contextBlockIds: content.contextBlockIds?.filter(cid => cid !== id),
                                            });
                                        }}
                                        className="text-slate-500 hover:text-red-400"
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        <button
                            className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors"
                            title={t('Add context block', 'أضف سياقاً')}
                        >
                            + {t('Add context', 'أضف سياق')}
                        </button>
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                            {errorMsg}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !content.prompt.trim()}
                        className={`w-full py-2.5 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            isGenerating || !content.prompt.trim()
                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400/60 cursor-not-allowed'
                                : 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                        }`}
                        title={t('Generate Text via API Proxy', 'توليد النص عبر بروكسي')}
                    >
                        {isGenerating ? (
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-purple-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        {isGenerating ? t('Generating...', 'جاري التوليد...') : t('Generate', 'توليد')}
                    </button>
                </div>

                {/* Generated Text Preview */}
                {content.generatedText && (
                    <div className="px-4 pb-4">
                        <div className="text-xs text-purple-400/60 mb-1 flex justify-between">
                            <span>{t('Generated:', 'المولّد:')}</span>
                            <button 
                                onClick={() => onContentChange({ ...content, generatedText: '' })}
                                className="hover:text-red-400"
                            >
                                {t('Clear', 'مسح')}
                            </button>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/30 border border-purple-500/10 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {content.generatedText}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
