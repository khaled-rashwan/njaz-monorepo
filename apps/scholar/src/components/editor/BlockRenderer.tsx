'use client';

import { useState } from 'react';
import { ScholarBlock, BlockProps, BlockType } from '@/types';
import { TextBlock } from './blocks/TextBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { useLanguage } from '@/components/LanguageContext';
import { EquationBlock } from './blocks/EquationBlock';
import { TableBlock } from './blocks/TableBlock';
import { FigureBlock } from './blocks/FigureBlock';
import { ReferenceBlock } from './blocks/ReferenceBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { AIPromptBlock } from './blocks/AIPromptBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { useEditorStore } from '@/store/editor-store';

const BLOCK_COMPONENTS: Record<string, React.ComponentType<BlockProps>> = {
    TEXT: TextBlock,
    HEADING: HeadingBlock,
    EQUATION: EquationBlock,
    TABLE: TableBlock,
    FIGURE: FigureBlock,
    REFERENCE: ReferenceBlock,
    CODE: CodeBlock,
    AI_PROMPT: AIPromptBlock,
    DIVIDER: DividerBlock,
};

const BLOCK_ICONS: Record<string, string> = {
    TEXT: 'T',
    HEADING: 'H',
    EQUATION: '∑',
    TABLE: '⊞',
    FIGURE: '🖼',
    REFERENCE: '📚',
    CODE: '</>',
    AI_PROMPT: '⚡',
    DIVIDER: '—',
};

const BLOCK_COLORS: Record<string, string> = {
    TEXT: 'text-slate-400',
    HEADING: 'text-amber-400',
    EQUATION: 'text-purple-400',
    TABLE: 'text-cyan-400',
    FIGURE: 'text-emerald-400',
    REFERENCE: 'text-emerald-400',
    CODE: 'text-blue-400',
    AI_PROMPT: 'text-purple-400',
    DIVIDER: 'text-slate-500',
};

interface BlockRendererProps {
    block: ScholarBlock;
    isFocused: boolean;
    onContentChange: (content: any) => void;
    onFocus: () => void;
    onDelete: () => void;
    onAddAfter: () => void;
}

export function BlockRenderer({
    block,
    isFocused,
    onContentChange,
    onFocus,
    onDelete,
    onAddAfter,
}: BlockRendererProps) {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const [showInsertMenu, setShowInsertMenu] = useState(false);
    const { addBlock, moveBlockUp, moveBlockDown } = useEditorStore();
    const Component = BLOCK_COMPONENTS[block.type];

    const isCrossReferenceable = ['FIGURE', 'TABLE', 'EQUATION', 'CODE', 'HEADING', 'REFERENCE'].includes(block.type);

    const insertTypes: { type: BlockType; label: string; icon: string }[] = [
        { type: 'TEXT', label: 'Text', icon: 'T' },
        { type: 'HEADING', label: 'Heading', icon: 'H' },
        { type: 'FIGURE', label: 'Figure', icon: '🖼' },
        { type: 'TABLE', label: 'Table', icon: '⊞' },
        { type: 'EQUATION', label: 'Equation', icon: '∑' },
        { type: 'REFERENCE', label: 'Reference', icon: '📚' },
        { type: 'CODE', label: 'Code', icon: '</>' },
        { type: 'DIVIDER', label: 'Divider', icon: '—' },
    ];

    const handleCopyRef = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const refText = `[[ref:${block.id}]]`;
        try {
            await navigator.clipboard.writeText(refText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    if (!Component) {
        return (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                Unknown block type: {block.type}
            </div>
        );
    }

    return (
        <div
            id={`block-${block.id}`}
            className={`editor-block group relative ${isFocused ? 'focused' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onFocus();
            }}
        >
            {/* Drag Handle + Type Badge (left gutter) */}
            <div className="drag-handle absolute -left-10 top-1 flex flex-col items-center gap-1">
                {/* Drag icon */}
                <button
                    className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-600 hover:text-amber-400 transition-colors"
                    title="Drag to reorder"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9" cy="5" r="1.5" />
                        <circle cx="15" cy="5" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="19" r="1.5" />
                        <circle cx="15" cy="19" r="1.5" />
                    </svg>
                </button>

                {/* Type badge */}
                <span className={`block-type-badge ${BLOCK_COLORS[block.type] || 'text-slate-500'}`}>
                    {BLOCK_ICONS[block.type] || '?'}
                </span>
            </div>

            {/* Block Content */}
            <div className="py-2 px-2">
                <Component
                    block={block}
                    isFocused={isFocused}
                    onContentChange={onContentChange}
                    onFocus={onFocus}
                    onDelete={onDelete}
                />
            </div>

            {/* Canvas Source Traceability Badge */}
            {(block.metadata as any)?.canvasSource && (() => {
                const source = (block.metadata as any).canvasSource;
                const sourceIcon: Record<string, string> = {
                    'notes': '💡',
                    'reference-collection': '📚',
                    'literature-survey': '📝',
                    'dataset': '📊',
                    'analysis-result': '🧮',
                };
                const sourceColor: Record<string, string> = {
                    'notes': 'bg-purple-500/10 border-purple-500/30 text-purple-300',
                    'reference-collection': 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
                    'literature-survey': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                    'dataset': 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                    'analysis-result': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
                };
                return (
                    <div
                        className={`absolute top-1 right-1 px-2 py-0.5 rounded-md border text-[10px] font-medium flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-default ${sourceColor[source.blockType] || 'bg-slate-500/10 border-slate-500/30 text-slate-300'}`}
                        title={`From canvas: ${source.title}\nPushed: ${new Date(source.pushedAt).toLocaleDateString()}`}
                    >
                        <span>{sourceIcon[source.blockType] || '🔗'}</span>
                        <span className="truncate max-w-[100px]">{source.title}</span>
                    </div>
                );
            })()}

            {/* Actions (right side) */}
            {isFocused && (
                <div className="absolute -right-8 top-1 flex flex-col gap-1 animate-slide-in">
                    {isCrossReferenceable && (
                        <button
                            onClick={handleCopyRef}
                            className={`p-1 rounded transition-colors ${
                                copied 
                                    ? 'text-emerald-400 bg-emerald-500/10' 
                                    : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                            title={copied ? "Copied!" : "Copy cross-reference"}
                        >
                            {copied ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                                </svg>
                            )}
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInsertMenu(!showInsertMenu);
                        }}
                        className={`p-1 rounded transition-colors ${
                            showInsertMenu
                                ? 'text-amber-400 bg-amber-500/10'
                                : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10'
                        }`}
                        title="Insert block below"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            await moveBlockUp(block.id);
                        }}
                        className="p-1 rounded text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Move block up"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            await moveBlockDown(block.id);
                        }}
                        className="p-1 rounded text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Move block down"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete block"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>

                    {showInsertMenu && (
                        <div className="absolute right-8 top-8 z-30 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2 w-[240px] text-xs">
                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1.5 py-1 mb-1">
                                {t('Insert Block', 'إدراج بلوك')}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {insertTypes.map(it => (
                                    <button
                                        key={it.type}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setShowInsertMenu(false);
                                            await addBlock(it.type, block.id);
                                        }}
                                        className="px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-left"
                                    >
                                        <span className="w-4 text-center font-mono text-xs text-amber-500 flex-shrink-0">{it.icon}</span>
                                        <span className="truncate">{it.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
