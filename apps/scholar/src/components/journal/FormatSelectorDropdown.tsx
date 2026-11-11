'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';
import { JournalFormatId } from '@/types/journal';
import { AVAILABLE_JOURNAL_FORMATS } from '@/lib/journal-formats';

interface FormatSelectorDropdownProps {
    onOpenConfigModal: () => void;
    compact?: boolean;
}

export function FormatSelectorDropdown({ onOpenConfigModal, compact = false }: FormatSelectorDropdownProps) {
    const { t } = useLanguage();
    const { document: doc, setDocumentFormat } = useEditorStore();
    const [isOpen, setIsOpen] = useState(false);

    const currentFormatId = (doc?.metadata?.journalFormatting?.formatId as JournalFormatId) || 'engineering-review';
    const currentFormat = AVAILABLE_JOURNAL_FORMATS.find(f => f.id === currentFormatId) || AVAILABLE_JOURNAL_FORMATS[0];

    const handleSelectFormat = (formatId: JournalFormatId) => {
        setDocumentFormat(formatId);
        setIsOpen(false);
        // If switching to engineering-review and metadata is not yet configured, open modal
        if (formatId === 'engineering-review' && (!doc?.metadata?.journalFormatting?.authors || doc.metadata.journalFormatting.authors.length === 0)) {
            onOpenConfigModal();
        }
    };

    return (
        <div className="relative inline-block text-left">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-all shadow-sm"
                    title={t('Select Publication & Journal Format', 'اختيار تنسيق النشر والمجلة')}
                >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-sans truncate max-w-[140px] sm:max-w-[200px]">
                        {currentFormat.name}
                    </span>
                    <svg className="w-3.5 h-3.5 text-amber-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={onOpenConfigModal}
                    className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
                    title={t('Configure Journal Metadata (Authors, Affiliations, Keywords)', 'ضبط بيانات المجلة (المؤلفون، الانتماءات، الكلمات)')}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl shadow-2xl py-1 z-50 text-xs animate-fade-in font-sans">
                        <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Target Journal Format', 'تنسيق المجلة المستهدفة')}
                        </div>

                        <div className="py-1">
                            {AVAILABLE_JOURNAL_FORMATS.map(fmt => {
                                const isSelected = currentFormatId === fmt.id;
                                return (
                                    <button
                                        key={fmt.id}
                                        type="button"
                                        disabled={!fmt.isEnabled}
                                        onClick={() => handleSelectFormat(fmt.id)}
                                        className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 transition-colors ${
                                            fmt.isEnabled
                                                ? isSelected
                                                    ? 'bg-amber-500/15 text-amber-300 font-bold'
                                                    : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                                                : 'text-slate-500 bg-slate-950/20 cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span>{fmt.name}</span>
                                                {isSelected && <span className="text-amber-400">✓</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-400 block line-clamp-1">{fmt.publisher}</span>
                                        </div>

                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                            fmt.isEnabled
                                                ? 'bg-amber-500/20 text-amber-300'
                                                : 'bg-slate-800 text-slate-500'
                                        }`}>
                                            {fmt.badge}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-2 border-t border-slate-800 bg-slate-950/40">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onOpenConfigModal();
                                }}
                                className="w-full text-center py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-[11px] border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                {t('Edit Journal Information...', 'تعديل بيانات المجلة...')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
