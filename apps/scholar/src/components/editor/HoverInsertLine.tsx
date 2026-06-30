'use client';

import { useState, useRef, useEffect } from 'react';
import { BlockType } from '@/types';
import { useLanguage } from '@/components/LanguageContext';
import { useEditorStore } from '@/store/editor-store';

interface HoverInsertLineProps {
    afterBlockId: string; // can be '__START__' or a block ID
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

export function HoverInsertLine({ afterBlockId }: HoverInsertLineProps) {
    const { t } = useLanguage();
    const { addBlock } = useEditorStore();
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

    const handleAddBlock = async (type: BlockType) => {
        await addBlock(type, afterBlockId);
        setIsOpen(false);
    };

    return (
        <div 
            ref={menuRef}
            className="relative h-4 my-[-8px] flex items-center justify-center group/line z-10"
        >
            {/* The visual line */}
            <div className="absolute inset-x-0 h-0.5 bg-transparent group-hover/line:bg-amber-500/25 transition-colors pointer-events-none" />

            {/* The insert trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-5 h-5 rounded-full bg-slate-900 border border-slate-700/80 hover:border-amber-500 hover:bg-amber-500/20 
                           text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-all z-20
                           ${isOpen ? 'scale-110 border-amber-500' : 'scale-0 group-hover/line:scale-100'}`}
                title="Insert block here"
            >
                <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Block Type Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute left-1/2 -translate-x-1/2 bottom-6 mt-2 z-40 w-[360px] rounded-xl overflow-hidden animate-fade-in"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20, 28, 45, 0.98) 0%, rgba(10, 14, 26, 0.99) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.05)',
                    }}
                >
                    <div className="p-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1.5 mb-1">
                            {t('Insert Block', 'إدراج بلوك')}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {BLOCK_OPTIONS.map((option) => (
                                <button
                                    key={option.type}
                                    onClick={() => handleAddBlock(option.type)}
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
