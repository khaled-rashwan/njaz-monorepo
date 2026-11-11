'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader } from '@njaz/ui-components';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import { useEditorStore } from '@/store/editor-store';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { InspectorPanel } from '@/components/editor/InspectorPanel';
import { LiteratureLibrary } from '@/components/literature/LiteratureLibrary';
import { CommentsPanel } from '@/components/editor/CommentsPanel';

import { calculateHeadingNumbers, filterBlocksForDocument } from '@/lib/cross-reference';
import { duplicateScholarProject } from '@/lib/duplicate-project';
import { JournalMetadataModal } from '@/components/journal/JournalMetadataModal';
import { FormatSelectorDropdown } from '@/components/journal/FormatSelectorDropdown';

export default function DocumentEditorPage() {
    const params = useParams();
    const router = useRouter();
    const docId = params.documentId as string;
    const projectId = params.projectId as string;
    const { t, direction } = useLanguage();
    const [userId, setUserId] = useState<string | null>(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

    const {
        document,
        isLoading,
        error,
        loadDocument,
        activePanel,
        setActivePanel,
        isDirty,
        isSaving,
        saveDocument,
    } = useEditorStore();

    // Warn before closing/leaving if dirty
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Auth check
    useEffect(() => {
        async function checkAuth() {
            try {
                const user = await getCurrentUser();
                setUserId(user.username);
            } catch {
                setUserId(null);
            } finally {
                setAuthChecking(false);
            }
        }
        checkAuth();
    }, []);

    // Load document after auth
    useEffect(() => {
        if (userId && docId) {
            loadDocument(docId);
        }
    }, [userId, docId, loadDocument]);

    // Auto-save on Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                useEditorStore.getState().saveDocument();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [isDuplicatingProject, setIsDuplicatingProject] = useState(false);

    const handleDuplicateProject = async () => {
        if (useEditorStore.getState().isDirty) {
            await useEditorStore.getState().saveDocument();
        }
        setIsDuplicatingProject(true);
        try {
            const currentDocTitle = useEditorStore.getState().document?.title || 'Research Paper';
            const copyTitle = `${currentDocTitle} (Copy)`;
            const newProjId = await duplicateScholarProject(projectId, copyTitle);
            alert(t('Project duplicated successfully! Redirecting...', 'تم نسخ المشروع بنجاح! جارٍ التحويل...'));
            router.push(`/projects/${newProjId}`);
        } catch (err: any) {
            console.error('Failed to duplicate project from document editor:', err);
            alert(t('Failed to duplicate project: ', 'فشل في نسخ المشروع: ') + (err?.message || 'Error'));
        } finally {
            setIsDuplicatingProject(false);
        }
    };

    const handlePrintPreview = async () => {
        if (useEditorStore.getState().isDirty) {
            await useEditorStore.getState().saveDocument();
        }
        window.open(`/projects/${projectId}/documents/${docId}/preview`, '_blank');
    };

    // Loading / Auth states
    if (authChecking || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-500">
                        {authChecking ? t('Authenticating...', 'جارٍ المصادقة...') : t('Loading document...', 'جارٍ تحميل المستند...')}
                    </span>
                </div>
            </div>
        );
    }

    if (!userId) {
        window.location.href = getDashboardUrl(getCurrentUrl());
        return null;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="futuristic-card p-8 text-center max-w-md">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">{t('Error', 'خطأ')}</h2>
                    <p className="text-sm text-slate-400 mb-4">{error}</p>
                    <button onClick={() => router.push(`/projects/${projectId}`)} className="futuristic-btn text-sm">
                        {t('Back to Canvas', 'العودة إلى لوحة المشروع')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col futuristic-bg overflow-hidden" dir={direction}>
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-md z-20">
                {/* Left: Back + Title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (isDirty || isSaving) {
                                setIsNavigating(true);
                                try {
                                    await saveDocument();
                                } catch (err) {
                                    console.error('Failed to save document before navigating:', err);
                                }
                            }
                            router.push(`/projects/${projectId}`);
                        }}
                        disabled={isNavigating}
                        className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center min-w-[32px] min-h-[32px]"
                        title={t('Back to Canvas', 'العودة إلى لوحة المشروع')}
                    >
                        {isNavigating || isSaving ? (
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-amber-500 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'rtl' ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                            </svg>
                        )}
                    </button>
                    <span className="text-sm text-slate-300 font-medium truncate max-w-[150px] sm:max-w-[250px] md:max-w-[400px]">
                        {document?.title || t('Untitled', 'بدون عنوان')}
                    </span>
                </div>

                {/* Right: Save indicator + Panels + Language */}
                <div className="flex items-center gap-4">
                    {/* Save Indicator & Button */}
                    <div className="flex items-center gap-2 border-r border-slate-700/40 pr-3">
                        {isDirty && (
                            <span className="text-xs text-amber-400/60 hidden sm:flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {t('Unsaved changes', 'تغييرات غير محفوظة')}
                            </span>
                        )}
                        {isSaving && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <div className="w-3 h-3 border-2 border-slate-600 border-t-amber-400 rounded-full animate-spin" />
                                {t('Saving...', 'جارٍ الحفظ...')}
                            </span>
                        )}
                        <button
                            onClick={() => saveDocument()}
                            disabled={!isDirty || isSaving}
                            className="futuristic-btn-ghost py-1 px-2.5 text-xs disabled:opacity-30 flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('Save', 'حفظ')}
                        </button>
                    </div>

                    {/* Target Journal Format Selector */}
                    <FormatSelectorDropdown onOpenConfigModal={() => setIsJournalModalOpen(true)} />

                    {/* Print Preview Button */}
                    <button
                        onClick={handlePrintPreview}
                        className="futuristic-btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1.5 text-slate-300 hover:text-white"
                        title={t('Print Preview', 'معاينة الطباعة')}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {t('Print', 'طباعة')}
                    </button>

                    {/* Duplicate Project Button */}
                    <button
                        onClick={handleDuplicateProject}
                        disabled={isDuplicatingProject}
                        className="futuristic-btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1.5 text-slate-300 hover:text-cyan-300 border-slate-700/40 hover:border-cyan-500/40 transition-colors"
                        title={t('Duplicate project to preserve status before making edits', 'تكرار المشروع لحفظ حالته قبل التعديل')}
                    >
                        {isDuplicatingProject ? (
                            <>
                                <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                <span>{t('Duplicating...', 'جارٍ النسخ...')}</span>
                            </>
                        ) : (
                            <>
                                <span>📑</span>
                                <span>{t('Duplicate', 'نسخ')}</span>
                            </>
                        )}
                    </button>

                    {/* Panel Toggles */}
                    <div className="flex items-center rounded-lg border border-slate-700/40 bg-slate-800/50 p-0.5">
                        {([
                            { key: 'outline' as const, icon: '≡', label: 'Outline' },
                            { key: 'comments' as const, icon: '💬', label: 'Comments & Issues' },
                            { key: 'literature' as const, icon: '📚', label: 'Literature' },
                            { key: 'codeRunner' as const, icon: '▶', label: 'Code' },
                        ]).map(panel => {
                            const openIssuesCount = panel.key === 'comments'
                                ? (Array.isArray(document?.metadata?.comments)
                                    ? document.metadata.comments.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length
                                    : 0)
                                : 0;

                            return (
                                <button
                                    key={panel.key}
                                    onClick={() => setActivePanel(activePanel === panel.key ? null : panel.key)}
                                    className={`relative px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                                        activePanel === panel.key
                                            ? 'bg-amber-500/15 text-amber-400'
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                    title={panel.label}
                                >
                                    <span>{panel.icon}</span>
                                    {openIssuesCount > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                                            {openIssuesCount > 9 ? '9+' : openIssuesCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <LanguageSwitcher />
                </div>
            </div>

            {/* Main Editor Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                {activePanel && (
                    <div className={`sidebar-panel flex-shrink-0 overflow-y-auto transition-all duration-200 border-r border-slate-700/30 ${
                        activePanel === 'literature' 
                            ? 'w-80 md:w-96 lg:w-[460px]' 
                            : activePanel === 'comments'
                            ? 'w-80 md:w-96 lg:w-[420px]'
                            : 'w-64 md:w-72'
                    }`}>
                        {activePanel === 'outline' && <DocumentOutline />}
                        {activePanel === 'comments' && <CommentsPanel />}
                        {activePanel === 'literature' && <LiteratureLibrary />}
                        {activePanel === 'codeRunner' && <CodeRunnerPanel />}
                    </div>
                )}

                {/* Editor Canvas */}
                <EditorCanvas />

                {/* Right Inspector */}
                <InspectorPanel />
            </div>

            {/* Journal Format & Metadata Modal */}
            <JournalMetadataModal
                isOpen={isJournalModalOpen}
                onClose={() => setIsJournalModalOpen(false)}
            />
        </div>
    );
}

// ============================================
const UNORDERED_BULLETS: Record<number, string> = {
    1: '•',
    2: '◦',
    3: '▪',
    4: '▫',
    5: '–',
    6: '–',
};

// DOCUMENT OUTLINE (left sidebar)
// ============================================
function DocumentOutline() {
    const { t, direction } = useLanguage();
    const { blocks, focusBlock, document: doc, setHeadingLevelStyle } = useEditorStore();
    
    const filteredBlocks = filterBlocksForDocument(blocks, doc);
    const headings = filteredBlocks
        .filter(b => b.type === 'HEADING')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    const headingStyles = doc?.metadata?.headingStyles || {};
    const headingNumbers = calculateHeadingNumbers(blocks, headingStyles);

    const cycleStyle = () => {
        const values = Object.values(headingStyles);
        let nextStyle: 'none' | 'numeric' | 'bullet' = 'none';
        if (values.every(v => v === 'none' || !v)) {
            nextStyle = 'numeric';
        } else if (values.some(v => v !== 'none' && v !== 'bullet')) {
            nextStyle = 'bullet';
        } else {
            nextStyle = 'none';
        }

        for (let l = 1; l <= 6; l++) {
            setHeadingLevelStyle(l, nextStyle);
        }
    };

    // Determine current overall state for the button
    const values = Object.values(headingStyles);
    const isAllNone = values.every(v => v === 'none' || !v);
    const isAnyBullet = values.some(v => v === 'bullet');

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500/70">
                    {t('Document Outline', 'هيكل المستند')}
                </h3>
                <button
                    onClick={cycleStyle}
                    className={`p-1 rounded text-xs transition-colors hover:bg-slate-700/50 flex items-center gap-1 ${
                        !isAllNone ? 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={t('Cycle All Heading Styles', 'تبديل جميع أنماط العناوين')}
                >
                    {isAllNone && <span className="font-mono text-[10px]">Aa</span>}
                    {!isAllNone && !isAnyBullet && <span className="font-mono text-[10px]">1.2</span>}
                    {!isAllNone && isAnyBullet && <span className="font-mono text-[10px]">•a</span>}
                </button>
            </div>
            {headings.length > 0 ? (
                <nav className="space-y-1">
                    {headings.map(h => {
                        const level = (h.content as any)?.level || 2;
                        const text = (h.content as any)?.text || t('Untitled', 'بدون عنوان');
                        const prefix = headingNumbers.get(h.id);
                        const paddingStyle = direction === 'rtl'
                            ? { paddingRight: `${(level - 1) * 12 + 8}px` }
                            : { paddingLeft: `${(level - 1) * 12 + 8}px` };
                        return (
                            <button
                                key={h.id}
                                onClick={() => focusBlock(h.id)}
                                className={`w-full ${direction === 'rtl' ? 'text-right' : 'text-left'} py-1.5 px-2 rounded-md text-sm text-slate-400
                                           hover:text-white hover:bg-slate-700/30 transition-colors truncate flex items-baseline gap-2`}
                                style={paddingStyle}
                            >
                                {prefix && (
                                    <span className="text-amber-500 font-semibold flex-shrink-0 text-xs select-none">
                                        {prefix}
                                    </span>
                                )}
                                <span>{text}</span>
                            </button>
                        );
                    })}
                </nav>
            ) : (
                <p className="text-xs text-slate-600">{t('Add headings to see the outline.', 'أضف عناوين لرؤية الهيكل.')}</p>
            )}
        </div>
    );
}

// ============================================
// CODE RUNNER PANEL (left sidebar)
// ============================================
function CodeRunnerPanel() {
    const { t } = useLanguage();
    const { blocks, focusBlock } = useEditorStore();
    const codeBlocks = blocks
        .filter(b => b.type === 'CODE')
        .sort((a, b) => a.orderIndex - b.orderIndex);

    return (
        <div className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500/70 mb-3">
                {t('Code Blocks', 'بلوكات الكود')}
            </h3>
            {codeBlocks.length > 0 ? (
                <div className="space-y-2">
                    {codeBlocks.map((cb, idx) => (
                        <button
                            key={cb.id}
                            onClick={() => focusBlock(cb.id)}
                            className="w-full text-left p-2 rounded-lg bg-slate-800/30 border border-slate-700/30
                                       hover:border-blue-500/20 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-blue-400">
                                    {(cb.content as any)?.language || 'python'} #{idx + 1}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">
                                {(cb.content as any)?.code?.substring(0, 50) || '(empty)'}
                            </p>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-600">{t('No code blocks yet.', 'لا توجد بلوكات كود بعد.')}</p>
            )}
        </div>
    );
}
