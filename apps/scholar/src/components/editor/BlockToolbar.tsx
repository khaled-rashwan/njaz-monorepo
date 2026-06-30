'use client';

import { useState, useRef, useEffect } from 'react';
import { BlockType } from '@/types';
import { useLanguage } from '@/components/LanguageContext';

interface BlockToolbarProps {
    onAddBlock: (type: BlockType) => void;
}

const BLOCK_OPTIONS: { type: BlockType; icon: string; label: string; labelAr: string; color: string; description: string }[] = [
    { type: 'TEXT', icon: 'T', label: 'Text', labelAr: 'نص', color: 'text-slate-400 hover:bg-slate-500/10', description: 'Plain text paragraph' },
    { type: 'HEADING', icon: 'H', label: 'Heading', labelAr: 'عنوان', color: 'text-amber-400 hover:bg-amber-500/10', description: 'Section heading' },
    { type: 'EQUATION', icon: '∑', label: 'Equation', labelAr: 'معادلة', color: 'text-purple-400 hover:bg-purple-500/10', description: 'LaTeX equation' },
    { type: 'TABLE', icon: '⊞', label: 'Table', labelAr: 'جدول', color: 'text-cyan-400 hover:bg-cyan-500/10', description: 'Data table' },
    { type: 'FIGURE', icon: '🖼', label: 'Figure', labelAr: 'شكل', color: 'text-emerald-400 hover:bg-emerald-500/10', description: 'Image / chart' },
    { type: 'CODE', icon: '</>', label: 'Code', labelAr: 'كود', color: 'text-blue-400 hover:bg-blue-500/10', description: 'Executable code block' },
    { type: 'REFERENCE', icon: '📚', label: 'Reference', labelAr: 'مرجع', color: 'text-emerald-400 hover:bg-emerald-500/10', description: 'Citation from library' },
    { type: 'AI_PROMPT', icon: '⚡', label: 'AI Prompt', labelAr: 'ذكاء اصطناعي', color: 'text-purple-400 hover:bg-purple-500/10', description: 'AI co-authoring' },
    { type: 'DIVIDER', icon: '—', label: 'Divider', labelAr: 'فاصل', color: 'text-slate-500 hover:bg-slate-500/10', description: 'Visual separator' },
];

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                           border border-dashed border-slate-700/50 hover:border-amber-500/30
                           text-slate-600 hover:text-amber-400 transition-all group"
            >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">
                    {t('Add Block', 'إضافة بلوك')}
                </span>
            </button>

            {isOpen && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 mt-2 z-40 w-[360px] rounded-xl overflow-hidden animate-fade-in"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20, 28, 45, 0.98) 0%, rgba(10, 14, 26, 0.99) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.05)',
                    }}
                >
                    <div className="p-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5 mb-1">
                            {t('Block Types', 'أنواع البلوكات')}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {BLOCK_OPTIONS.map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => {
                                        onAddBlock(option.type);
                                        setIsOpen(false);
                                    }}
                                    className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors text-left ${option.color}`}
                                >
                                    <span className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-xs font-mono flex-shrink-0">
                                        {option.icon}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium text-slate-200 truncate">{t(option.label, option.labelAr)}</div>
                                        <div className="text-[10px] text-slate-550 truncate">{option.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
