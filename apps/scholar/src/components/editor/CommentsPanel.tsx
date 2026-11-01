'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { useLanguage } from '@/components/LanguageContext';
import { DocumentComment, CommentStatus, ScholarBlock } from '@/types';
import { sortByOrder } from '@/lib/fractional-index';
import { buildCounterMap, toRoman, calculateHeadingNumbers } from '@/lib/cross-reference';

export function CommentsPanel() {
    const { t, direction } = useLanguage();
    const {
        document: doc,
        blocks,
        addComment,
        updateComment,
        deleteComment,
        clearResolvedComments,
        verifyCommentWithAI,
        checkResolutionWithAI,
        focusBlock,
    } = useEditorStore();

    const comments: DocumentComment[] = Array.isArray(doc?.metadata?.comments) ? doc.metadata.comments : [];

    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const [newCommentText, setNewCommentText] = useState('');
    const [selectedBlockId, setSelectedBlockId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [editingSelectedBlockId, setEditingSelectedBlockId] = useState<string>('');
    const [loadingAiId, setLoadingAiId] = useState<string | null>(null);
    const [aiActionType, setAiActionType] = useState<'verify' | 'resolve' | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<DocumentComment | null>(null);
    const [showClearResolvedConfirm, setShowClearResolvedConfirm] = useState(false);

    // Filter comments
    const filteredComments = comments.filter(c => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'open') return c.status === 'open' || c.status === 'in_progress';
        if (statusFilter === 'resolved') return c.status === 'resolved';
        return true;
    });

    const openCount = comments.filter(c => c.status === 'open' || c.status === 'in_progress').length;
    const resolvedCount = comments.filter(c => c.status === 'resolved').length;

    // Build ordered, human-friendly names for blocks
    const sortedBlocks = sortByOrder(blocks);

    // Compute Section Roman + Letter numbers (Sec I, Sec I A, Sec I B, Sec II)
    let currentSecIndex = 0;
    let currentSubSecIndex = 0;
    const sectionLabels = new Map<string, string>();

    for (const b of sortedBlocks) {
        if (b.type === 'HEADING') {
            const level = b.content?.level || 1;
            if (level === 1) {
                currentSecIndex++;
                currentSubSecIndex = 0;
                sectionLabels.set(b.id, `Sec ${toRoman(currentSecIndex)}`);
            } else {
                currentSubSecIndex++;
                const letter = String.fromCharCode(64 + currentSubSecIndex); // A, B, C...
                const parentSec = toRoman(currentSecIndex || 1);
                sectionLabels.set(b.id, `Sec ${parentSec} ${letter}`);
            }
        }
    }

    // Separate blocks into clean categories
    const sectionHeadings: ScholarBlock[] = [];
    const textBlocks: ScholarBlock[] = [];
    const equations: ScholarBlock[] = [];
    const figures: ScholarBlock[] = [];
    const tables: ScholarBlock[] = [];
    const codeBlocks: ScholarBlock[] = [];
    const references: ScholarBlock[] = [];

    let eqCount = 0;
    let figCount = 0;
    let tblCount = 0;
    let codeCount = 0;
    let refCount = 0;

    const blockLabels = new Map<string, string>();

    for (const b of sortedBlocks) {
        if (b.type === 'HEADING') {
            sectionHeadings.push(b);
            const prefix = sectionLabels.get(b.id) || 'Sec';
            const title = (b.content?.text || '').trim();
            blockLabels.set(b.id, title ? `${prefix} - ${title}` : prefix);
        } else if (b.type === 'EQUATION') {
            eqCount++;
            equations.push(b);
            const label = b.content?.label ? ` (${b.content.label})` : '';
            blockLabels.set(b.id, `eq ${eqCount}${label}`);
        } else if (b.type === 'FIGURE') {
            figCount++;
            figures.push(b);
            const cap = (b.content?.caption || '').trim();
            blockLabels.set(b.id, `Figure ${figCount}${cap ? `: ${cap.substring(0, 30)}` : ''}`);
        } else if (b.type === 'TABLE') {
            tblCount++;
            tables.push(b);
            const cap = (b.content?.caption || '').trim();
            blockLabels.set(b.id, `Table ${toRoman(tblCount)}${cap ? `: ${cap.substring(0, 30)}` : ''}`);
        } else if (b.type === 'CODE') {
            codeCount++;
            codeBlocks.push(b);
            blockLabels.set(b.id, `Code ${codeCount} (${b.content?.language || 'code'})`);
        } else if (b.type === 'REFERENCE') {
            refCount++;
            references.push(b);
            const key = b.content?.citationKey || b.content?.formattedCitation || '';
            blockLabels.set(b.id, `Ref [${refCount}] ${key ? `(${key.substring(0, 20)})` : ''}`.trim());
        } else {
            // TEXT paragraph: associate with nearest preceding heading
            textBlocks.push(b);
            const bIdx = sortedBlocks.findIndex(item => item.id === b.id);
            let parentPrefix = 'Sec';
            for (let i = bIdx - 1; i >= 0; i--) {
                if (sortedBlocks[i].type === 'HEADING') {
                    parentPrefix = sectionLabels.get(sortedBlocks[i].id) || 'Sec';
                    break;
                }
            }
            const snippet = (b.content?.text || '').trim();
            const shortSnippet = snippet.length > 28 ? `"${snippet.substring(0, 28)}..."` : snippet ? `"${snippet}"` : 'Paragraph';
            blockLabels.set(b.id, `[${parentPrefix}] ${shortSnippet}`);
        }
    }

    const getBlockDisplayLabel = (b: ScholarBlock): string => {
        return blockLabels.get(b.id) || b.type;
    };

    const handleCreateComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        setIsSubmitting(true);
        try {
            await addComment(newCommentText.trim(), selectedBlockId || undefined);
            setNewCommentText('');
            setSelectedBlockId('');
        } catch (err) {
            console.error('Failed to create comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScrollToBlock = (blockId?: string) => {
        if (!blockId) return;
        focusBlock(blockId);
        const el = window.document.getElementById(`block-${blockId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-500', 'transition-all');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-amber-500');
            }, 2500);
        }
    };

    const handleRunAiVerify = async (commentId: string) => {
        setLoadingAiId(commentId);
        setAiActionType('verify');
        try {
            await verifyCommentWithAI(commentId);
        } catch (err: any) {
            alert(err.message || 'AI Verification failed');
        } finally {
            setLoadingAiId(null);
            setAiActionType(null);
        }
    };

    const handleRunAiResolveCheck = async (commentId: string) => {
        setLoadingAiId(commentId);
        setAiActionType('resolve');
        try {
            await checkResolutionWithAI(commentId);
        } catch (err: any) {
            alert(err.message || 'AI Resolution check failed');
        } finally {
            setLoadingAiId(null);
            setAiActionType(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/90 text-slate-200 w-full" dir={direction}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-semibold text-sm">💬 {t('Document Comments & Issues', 'التعليقات والملاحظات')}</span>
                    {openCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {openCount} {t('open', 'مفتوحة')}
                        </span>
                    )}
                </div>
                {resolvedCount > 0 && (
                    <button
                        onClick={() => setShowClearResolvedConfirm(true)}
                        className="text-[11px] text-slate-400 hover:text-red-400 transition-colors underline"
                        title={t('Clear all resolved issues', 'تصفية جميع الملاحظات المنجزة')}
                    >
                        {t('Clear Resolved', 'تصفية المنجز')}
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 bg-slate-800/40 border-b border-slate-700/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                    {(['all', 'open', 'resolved'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                                statusFilter === tab
                                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {tab === 'all' && `${t('All', 'الكل')} (${comments.length})`}
                            {tab === 'open' && `${t('Open', 'مفتوح')} (${openCount})`}
                            {tab === 'resolved' && `${t('Resolved', 'تم الحل')} (${resolvedCount})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {/* New Comment Box */}
                <form onSubmit={handleCreateComment} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-300 block">
                        {t('+ Add Feedback or Issue', '+ إضافة تعليق أو ملاحظة')}
                    </span>
                    <textarea
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder={t('Type a comment, review feedback, or issue...', 'اكتب تعليقاً أو ملاحظة للمراجعة...')}
                        className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 min-h-[64px] resize-none"
                    />
                    <div className="space-y-2 pt-1">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                {t('Target Element (Optional):', 'العنصر المستهدف (اختياري):')}
                            </label>
                            <select
                                value={selectedBlockId}
                                onChange={(e) => setSelectedBlockId(e.target.value)}
                                className="w-full bg-slate-900/90 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/60 truncate"
                            >
                                <option value="">{t('Entire Document (General)', 'كامل المستند (عام)')}</option>

                                {sectionHeadings.length > 0 && (
                                    <optgroup label={t('Sections & Headings', 'الأقسام والعناوين')}>
                                        {sectionHeadings.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {equations.length > 0 && (
                                    <optgroup label={t('Equations', 'المعادلات')}>
                                        {equations.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {figures.length > 0 && (
                                    <optgroup label={t('Figures', 'الأشكال التوضيحية')}>
                                        {figures.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {tables.length > 0 && (
                                    <optgroup label={t('Tables', 'الجداول')}>
                                        {tables.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {codeBlocks.length > 0 && (
                                    <optgroup label={t('Code Listings', 'الأكواد البرمجية')}>
                                        {codeBlocks.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {textBlocks.length > 0 && (
                                    <optgroup label={t('Paragraphs & Content', 'الفقرات والمحتوى')}>
                                        {textBlocks.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}

                                {references.length > 0 && (
                                    <optgroup label={t('References', 'المراجع')}>
                                        {references.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {getBlockDisplayLabel(b)}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500">
                                {newCommentText.trim().length > 0 
                                    ? `${newCommentText.trim().length} chars` 
                                    : t('Shift+Enter for newline', 'Shift+Enter للسطر الجديد')}
                            </span>
                            <button
                                type="submit"
                                disabled={!newCommentText.trim() || isSubmitting}
                                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-40 disabled:hover:bg-amber-500 flex items-center gap-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                        <span>{t('Posting...', 'جار النشر...')}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>💬</span>
                                        <span>{t('Submit Comment', 'نشر التعليق')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* List cards */}
                {filteredComments.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        <p className="text-xl mb-1">📝</p>
                        <p>{t('No comments in this view.', 'لا توجد تعليقات في هذا القسم.')}</p>
                    </div>
                ) : (
                    filteredComments.map(comment => {
                        const isEditing = editingCommentId === comment.id;
                        const isAiLoading = loadingAiId === comment.id;

                        return (
                            <div
                                key={comment.id}
                                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
                                    comment.status === 'resolved'
                                        ? 'bg-emerald-950/15 border-emerald-500/20 opacity-80'
                                        : 'bg-slate-800/40 border-slate-700/50 hover:border-amber-500/30'
                                }`}
                            >
                                {/* Header: Target & Status */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {comment.blockId ? (
                                            <button
                                                onClick={() => handleScrollToBlock(comment.blockId)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-medium transition-colors"
                                                title={t('Jump to block', 'الانتقال إلى البلوك')}
                                            >
                                                <span>🔗</span>
                                                <span className="truncate max-w-[140px]">{comment.blockSnippet || t('Block', 'البلوك')}</span>
                                            </button>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-slate-700/40 text-slate-400 text-[10px]">
                                                📄 {t('General', 'عام')}
                                            </span>
                                        )}

                                        {/* Status Tag */}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            comment.status === 'resolved'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : comment.status === 'in_progress'
                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                            {comment.status === 'resolved' && `✓ ${t('Resolved', 'تم الحل')}`}
                                            {comment.status === 'in_progress' && `⏳ ${t('In Progress', 'قيد العمل')}`}
                                            {comment.status === 'open' && `● ${t('Open', 'مفتوح')}`}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingCommentId(comment.id);
                                                setEditingText(comment.text);
                                                setEditingSelectedBlockId(comment.blockId || '');
                                            }}
                                            className="p-1 text-slate-500 hover:text-slate-300 transition-colors rounded"
                                            title={t('Edit comment', 'تعديل التعليق')}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setCommentToDelete(comment)}
                                            className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded"
                                            title={t('Clear/Delete comment', 'حذف/تصفية الملاحظة')}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Body Text or Edit Form */}
                                {isEditing ? (
                                    <div className="space-y-2 pt-1 bg-slate-900/90 p-2.5 rounded-lg border border-slate-700">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                                {t('Target Element:', 'العنصر المستهدف:')}
                                            </label>
                                            <select
                                                value={editingSelectedBlockId}
                                                onChange={(e) => setEditingSelectedBlockId(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                                            >
                                                <option value="">{t('Entire Document (General)', 'كامل المستند (عام)')}</option>

                                                {sectionHeadings.length > 0 && (
                                                    <optgroup label={t('Sections & Headings', 'الأقسام والعناوين')}>
                                                        {sectionHeadings.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {equations.length > 0 && (
                                                    <optgroup label={t('Equations', 'المعادلات')}>
                                                        {equations.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {figures.length > 0 && (
                                                    <optgroup label={t('Figures', 'الأشكال التوضيحية')}>
                                                        {figures.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {tables.length > 0 && (
                                                    <optgroup label={t('Tables', 'الجداول')}>
                                                        {tables.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {codeBlocks.length > 0 && (
                                                    <optgroup label={t('Code Listings', 'الأكواد البرمجية')}>
                                                        {codeBlocks.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {textBlocks.length > 0 && (
                                                    <optgroup label={t('Paragraphs & Content', 'الفقرات والمحتوى')}>
                                                        {textBlocks.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {references.length > 0 && (
                                                    <optgroup label={t('References', 'المراجع')}>
                                                        {references.map(b => (
                                                            <option key={b.id} value={b.id}>
                                                                {getBlockDisplayLabel(b)}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                                                {t('Comment / Issue Text:', 'نص الملاحظة / التعليق:')}
                                            </label>
                                            <textarea
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-1.5 pt-1">
                                            <button
                                                onClick={() => {
                                                    setEditingCommentId(null);
                                                    setEditingSelectedBlockId('');
                                                }}
                                                className="px-2.5 py-1 rounded text-[11px] text-slate-400 hover:text-white"
                                            >
                                                {t('Cancel', 'إلغاء')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const targetBlock = blocks.find(b => b.id === editingSelectedBlockId);
                                                    const newSnippet = targetBlock ? getBlockDisplayLabel(targetBlock) : undefined;
                                                    updateComment(comment.id, {
                                                        text: editingText.trim(),
                                                        blockId: editingSelectedBlockId || undefined,
                                                        blockSnippet: newSnippet,
                                                    });
                                                    setEditingCommentId(null);
                                                    setEditingSelectedBlockId('');
                                                }}
                                                disabled={!editingText.trim()}
                                                className="futuristic-btn py-1 px-3 text-[11px] disabled:opacity-40"
                                            >
                                                {t('Save Changes', 'حفظ التعديلات')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className={`text-xs leading-relaxed ${comment.status === 'resolved' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                        {comment.text}
                                    </p>
                                )}

                                {/* AI Assessment Box (if already verified) */}
                                {comment.aiAssessment && (
                                    <div className={`p-2.5 rounded-lg text-[11px] space-y-1.5 border ${
                                        comment.aiAssessment.verdict === 'already_resolved'
                                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                            : comment.aiAssessment.isValid
                                            ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                                            : 'bg-slate-800/60 border-slate-700 text-slate-300'
                                    }`}>
                                        <div className="flex items-center justify-between font-semibold">
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-purple-400">
                                                ✨ {t('AI Assessment', 'تقييم الذكاء الاصطناعي')}
                                            </span>
                                            <span className="text-[10px] opacity-75">
                                                {comment.aiAssessment.verdict === 'already_resolved' && t('✓ Resolved in text', '✓ تم تداركها في النص')}
                                                {comment.aiAssessment.verdict === 'valid' && t('⚠️ Valid Issue', '⚠️ ملاحظة وجيهة')}
                                                {comment.aiAssessment.verdict === 'invalid' && t('ℹ️ Unfounded', 'ℹ️ غير دقيقة')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] leading-normal opacity-90">{comment.aiAssessment.analysis}</p>
                                        {comment.aiAssessment.suggestedFix && (
                                            <div className="pt-1 text-[11px] border-t border-purple-500/20 text-purple-300">
                                                <span className="font-semibold">{t('Recommended Action: ', 'الإجراء المقترح: ')}</span>
                                                <span>{comment.aiAssessment.suggestedFix}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* AI Tools & Status Controls */}
                                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-700/30 text-[11px]">
                                    {/* AI Actions */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleRunAiVerify(comment.id)}
                                            disabled={isAiLoading}
                                            className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                            title={t('Verify correctness of this comment with AI', 'التحقق من صحة الملاحظة عبر الذكاء الاصطناعي')}
                                        >
                                            {isAiLoading && aiActionType === 'verify' ? (
                                                <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>✨</span>
                                            )}
                                            <span>{t('Verify with AI', 'فحص بالذكاء الاصطناعي')}</span>
                                        </button>

                                        <button
                                            onClick={() => handleRunAiResolveCheck(comment.id)}
                                            disabled={isAiLoading}
                                            className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                            title={t('Check if issue is satisfied in the paper', 'التحقق مما إذا تم تدارك الملاحظة وإكمالها')}
                                        >
                                            {isAiLoading && aiActionType === 'resolve' ? (
                                                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>✓</span>
                                            )}
                                            <span>{t('Check Resolution', 'فحص الإكمال')}</span>
                                        </button>
                                    </div>

                                    {/* Manual Status Buttons */}
                                    <div className="flex items-center gap-1">
                                        {comment.status !== 'resolved' ? (
                                            <button
                                                onClick={() => updateComment(comment.id, { status: 'resolved' })}
                                                className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors"
                                            >
                                                {t('Mark Done', 'تم الإنجاز')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateComment(comment.id, { status: 'open' })}
                                                className="px-2 py-1 rounded bg-slate-700/40 hover:bg-slate-700/70 text-slate-300 transition-colors"
                                            >
                                                {t('Reopen', 'إعادة فتح')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Confirmation Modal for Single Comment Deletion */}
            {commentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="futuristic-card p-5 max-w-sm w-full space-y-4 text-center border-red-500/30">
                        <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto text-lg">
                            ⚠️
                        </div>
                        <h4 className="text-sm font-bold text-white">
                            {t('Confirm Clearing Issue?', 'تأكيد تصفية وحذف الملاحظة؟')}
                        </h4>
                        <p className="text-xs text-slate-400">
                            {t(
                                'Are you sure you want to permanently clear this comment? This action cannot be undone.',
                                'هل أنت متأكد من رغبتك في حذف هذه الملاحظة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'
                            )}
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setCommentToDelete(null)}
                                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800"
                            >
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={() => {
                                    deleteComment(commentToDelete.id);
                                    setCommentToDelete(null);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs text-white bg-red-600 hover:bg-red-500 font-semibold"
                            >
                                {t('Clear Issue', 'تأكيد الحذف')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Clear All Resolved */}
            {showClearResolvedConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="futuristic-card p-5 max-w-sm w-full space-y-4 text-center border-red-500/30">
                        <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto text-lg">
                            🧹
                        </div>
                        <h4 className="text-sm font-bold text-white">
                            {t('Clear All Resolved Issues?', 'تصفية وحذف جميع الملاحظات المنجزة؟')}
                        </h4>
                        <p className="text-xs text-slate-400">
                            {t(
                                `This will remove all ${resolvedCount} resolved comments from your document metadata.`,
                                `سيتم حذف جميع التعليقات المنجزة (${resolvedCount}) من المستند نهائياً.`
                            )}
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setShowClearResolvedConfirm(false)}
                                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800"
                            >
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={() => {
                                    clearResolvedComments();
                                    setShowClearResolvedConfirm(false);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs text-white bg-red-600 hover:bg-red-500 font-semibold"
                            >
                                {t('Clear All Resolved', 'تأكيد تصفية المنجز')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
