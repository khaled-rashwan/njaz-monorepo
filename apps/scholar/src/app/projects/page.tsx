'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import { client } from '@/lib/amplify-client';
import { ScholarProject } from '@/types';
import { duplicateScholarProject } from '@/lib/duplicate-project';

// Curated research-themed gradient icons for projects
const RESEARCH_THEMES = [
    {
        bg: 'from-cyan-500/20 to-blue-650/30',
        border: 'border-cyan-400/40',
        glow: 'rgba(56,205,223,0.3)',
        textColor: 'text-cyan-350',
        icon: (
            <svg className="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        bg: 'from-violet-500/20 to-purple-650/30',
        border: 'border-purple-400/40',
        glow: 'rgba(167,139,250,0.3)',
        textColor: 'text-purple-350',
        icon: (
            <svg className="w-5 h-5 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.524A9.004 9.004 0 0112 18a9.004 9.004 0 01-6.23-2.176L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
        ),
    },
    {
        bg: 'from-amber-500/20 to-orange-650/30',
        border: 'border-amber-400/40',
        glow: 'rgba(245,158,11,0.3)',
        textColor: 'text-amber-350',
        icon: (
            <svg className="w-5 h-5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
        ),
    },
    {
        bg: 'from-emerald-500/20 to-teal-650/30',
        border: 'border-emerald-400/40',
        glow: 'rgba(16,185,129,0.3)',
        textColor: 'text-emerald-350',
        icon: (
            <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
    },
];

export default function WorkspaceDashboard() {
    const { t, language, direction } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Isolated Project Rename Modal
    const [renameProject, setRenameProject] = useState<any | null>(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Duplicating state tracking
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        project: any;
    } | null>(null);

    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    // Close context menu on outside click or escape
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setContextMenu(null);
            }
        }
        window.addEventListener('click', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);
            await fetchProjects();
        } catch {
            setUserId(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function fetchProjects() {
        try {
            const { data, errors } = await client.models.ScholarProject.list();
            if (!errors && data) {
                setProjects(
                    (data as any[]).sort(
                        (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() -
                                  new Date(a.updatedAt || a.createdAt || 0).getTime()
                    )
                );
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsCreating(true);
        try {
            const { data, errors } = await client.models.ScholarProject.create({
                title: newTitle.trim(),
                description: newDescription.trim() || undefined,
            });
            if (!errors && data) {
                setShowCreateModal(false);
                setNewTitle('');
                setNewDescription('');
                setIsLoading(true);
                router.push(`/projects/${(data as any).id}`);
            }
        } catch (error) {
            console.error('Failed to create project:', error);
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(projectId: string) {
        setContextMenu(null);
        if (!confirm(t('Are you sure you want to delete this project?', 'هل أنت متأكد من حذف هذا المشروع؟'))) return;
        try {
            await client.models.ScholarProject.delete({ id: projectId });
            setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    }

    async function handleDuplicate(project: any) {
        setContextMenu(null);
        setDuplicatingId(project.id);
        try {
            const copyTitle = language === 'ar' 
                ? `${project.title} (نسخة)` 
                : `${project.title} (Copy)`;
            await duplicateScholarProject(project.id, copyTitle);
            await fetchProjects();
        } catch (error: any) {
            console.error('Failed to duplicate project:', error);
            alert(t('Failed to duplicate project: ', 'فشل في نسخ المشروع: ') + (error?.message || 'Unknown error'));
        } finally {
            setDuplicatingId(null);
        }
    }

    function openRenameModal(project: any) {
        setContextMenu(null);
        setRenameProject(project);
        setRenameTitle(project.title || '');
    }

    async function handleRenameSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!renameProject || !renameTitle.trim()) return;
        setIsRenaming(true);
        try {
            await client.models.ScholarProject.update({
                id: renameProject.id,
                title: renameTitle.trim(),
            });
            setProjects(prev =>
                prev.map(p => (p.id === renameProject.id ? { ...p, title: renameTitle.trim() } : p))
            );
            setRenameProject(null);
        } catch (error) {
            console.error('Failed to rename project:', error);
        } finally {
            setIsRenaming(false);
        }
    }

    function handleContextMenu(e: React.MouseEvent, project: any) {
        e.preventDefault();
        e.stopPropagation();
        // Prevent menu from overflowing viewport
        const x = Math.min(e.clientX, window.innerWidth - 220);
        const y = Math.min(e.clientY, window.innerHeight - 200);
        setContextMenu({ x, y, project });
    }

    // --- LOADING STATE ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-500">{t('Loading Scholar...', 'جارٍ تحميل الباحث...')}</span>
                </div>
            </div>
        );
    }

    // --- UNAUTHENTICATED STATE ---
    if (!userId) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="scholar" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <div className="futuristic-card p-12 text-center max-w-md">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('Authentication Required', 'المصادقة مطلوبة')}</h2>
                        <p className="text-slate-400 text-sm mb-6">{t('Sign in to access your research workspace.', 'سجل دخولك للوصول إلى مساحة بحثك.')}</p>
                        <a href={getDashboardUrl(getCurrentUrl())} className="futuristic-btn-primary inline-block">
                            {t('Sign In', 'تسجيل الدخول')}
                        </a>
                    </div>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    // --- AUTHENTICATED STATE ---
    return (
        <div className="min-h-screen flex flex-col futuristic-bg selection:bg-cyan-500/30" dir={direction}>
            <SharedHeader currentApp="scholar" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto w-full">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                {t('Research Workspace', 'مساحة البحث')}
                            </h1>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {projects.length}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs sm:text-sm">
                            {t(
                                'Manage research projects, visual canvas pipelines, and publication drafts. Right-click any project for quick options.',
                                'إدارة مشاريع البحث، ومخططات الكانفاس، ومسودات النشر. انقر بالزر الأيمن على أي مشروع لخيارات سريعة.'
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Link
                            href="/survey"
                            className="futuristic-btn flex items-center gap-2 text-xs py-2 px-3 border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                        >
                            <span>🔬</span>
                            <span>{t('Survey Workbench', 'مصفوفة المسح الأدبي')}</span>
                        </Link>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="futuristic-btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-lg shadow-amber-500/15"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('New Project', 'مشروع جديد')}
                        </button>
                    </div>
                </div>

                {/* Compact Cyber-Pill Grid */}
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {projects.map((project, idx) => {
                            const theme = RESEARCH_THEMES[idx % RESEARCH_THEMES.length];
                            const isBeingDuplicated = duplicatingId === project.id;
                            const createdDate = project.updatedAt || project.createdAt 
                                ? new Date(project.updatedAt || project.createdAt).toLocaleDateString()
                                : '';

                            return (
                                <div
                                    key={project.id}
                                    onContextMenu={(e) => handleContextMenu(e, project)}
                                    onClick={() => {
                                        if (isBeingDuplicated) return;
                                        setIsLoading(true);
                                        router.push(`/projects/${project.id}`);
                                    }}
                                    className={`
                                        cyber-pill group p-3.5 cursor-pointer select-none
                                        flex items-center justify-between gap-3
                                        ${isBeingDuplicated ? 'opacity-60 pointer-events-none' : ''}
                                    `}
                                    title={project.title}
                                >
                                    {/* Left: Research Logo & Title */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Futuristic Small Research Badge */}
                                        <div
                                            className={`
                                                w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center
                                                bg-gradient-to-br ${theme.bg} border ${theme.border}
                                                transition-all duration-200 group-hover:scale-105
                                            `}
                                            style={{ boxShadow: `0 0 12px ${theme.glow}` }}
                                        >
                                            {theme.icon}
                                        </div>

                                        {/* Project Meta */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                                                    {project.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {createdDate}
                                                </span>
                                                {project.description && (
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                                        • {project.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions menu trigger */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isBeingDuplicated ? (
                                            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                        ) : (
                                            <button
                                                onClick={(e) => handleContextMenu(e, project)}
                                                className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors opacity-70 group-hover:opacity-100"
                                                title={t('Options', 'خيارات')}
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="cyber-pill p-12 text-center max-w-lg mx-auto">
                        <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-white mb-1.5">
                            {t('No projects yet', 'لا توجد مشاريع بعد')}
                        </h3>
                        <p className="text-slate-400 text-xs mb-5 max-w-sm mx-auto">
                            {t(
                                'Create your first research project to start managing literature, canvas pipelines, and manuscripts.',
                                'أنشئ مشروعك البحثي الأول لبدء إدارة الأدبيات والمخططات التفاعلية والمخطوطات.'
                            )}
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="futuristic-btn-primary inline-flex items-center gap-2 text-xs py-2 px-4"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('Create Your First Project', 'أنشئ مشروعك الأول')}
                        </button>
                    </div>
                )}

                {/* Right-Click / Floating Context Menu */}
                {contextMenu && (
                    <div
                        ref={contextMenuRef}
                        style={{
                            top: `${contextMenu.y}px`,
                            left: `${contextMenu.x}px`,
                        }}
                        className="fixed z-50 w-52 rounded-xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl shadow-2xl py-1.5 text-xs text-slate-200 animate-slide-in overflow-hidden"
                    >
                        <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate">
                            {contextMenu.project.title}
                        </div>

                        {/* Open / Edit */}
                        <button
                            onClick={() => {
                                const id = contextMenu.project.id;
                                setContextMenu(null);
                                setIsLoading(true);
                                router.push(`/projects/${id}`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors text-start"
                        >
                            <span>🔬</span>
                            <span>{t('Open Project', 'فتح المشروع')}</span>
                        </button>

                        {/* Duplicate */}
                        <button
                            onClick={() => handleDuplicate(contextMenu.project)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors text-start"
                        >
                            <span>📑</span>
                            <span>{t('Duplicate (Reserve Status)', 'تكرار المشروع (حفظ الحالة)')}</span>
                        </button>

                        {/* Rename (Isolated) */}
                        <button
                            onClick={() => openRenameModal(contextMenu.project)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors text-start"
                        >
                            <span>✏️</span>
                            <span>{t('Rename Project', 'إعادة تسمية المشروع')}</span>
                        </button>

                        <div className="my-1 border-t border-slate-800" />

                        {/* Delete */}
                        <button
                            onClick={() => handleDelete(contextMenu.project.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-start"
                        >
                            <span>🗑️</span>
                            <span>{t('Delete Project', 'حذف المشروع')}</span>
                        </button>
                    </div>
                )}

                {/* Isolated Rename Project Modal */}
                {renameProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
                            <div className="flex justify-between items-center p-4 border-b border-slate-800">
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>✏️</span>
                                    <span>{t('Rename Project', 'إعادة تسمية المشروع')}</span>
                                </h2>
                                <button
                                    onClick={() => setRenameProject(null)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleRenameSubmit} className="p-4 space-y-4">
                                <p className="text-[11px] text-slate-400">
                                    {t(
                                        'Renaming only affects this project title in your dashboard and will not overwrite the inner paper document title or contents.',
                                        'تغيير الاسم يغير عنوان المشروع في لوحة التحكم فقط ولن يؤثر على عنوان ورقة البحث الداخلية أو محتواها.'
                                    )}
                                </p>

                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        {t('Project Title *', 'عنوان المشروع *')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={renameTitle}
                                        onChange={(e) => setRenameTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-lg shadow-sm focus:ring-cyan-500 focus:border-cyan-500 bg-slate-800 text-white text-xs outline-none"
                                        autoFocus
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setRenameProject(null)}
                                        className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        {t('Cancel', 'إلغاء')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isRenaming || !renameTitle.trim()}
                                        className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {isRenaming ? t('Saving...', 'جارٍ الحفظ...') : t('Save Title', 'حفظ التسمية')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Create Project Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
                            <div className="flex justify-between items-center p-4 border-b border-slate-800">
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>➕</span>
                                    <span>{t('Create New Project', 'إنشاء مشروع جديد')}</span>
                                </h2>
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-4 space-y-3.5">
                                <div>
                                    <label htmlFor="title" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        {t('Project Title *', 'عنوان المشروع *')}
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder={t('e.g. LLM Impact on Power Grid', 'مثال: تأثير الذكاء الاصطناعي على استقرار الشبكة')}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-slate-800 text-white text-xs outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        {t('Description (Optional)', 'الوصف (اختياري)')}
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder={t('Brief overview of the project goals...', 'نظرة عامة موجزة عن أهداف المشروع...')}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-slate-800 text-white text-xs outline-none resize-none"
                                    />
                                </div>
                                <div className="pt-2 flex justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        {t('Cancel', 'إلغاء')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating || !newTitle.trim()}
                                        className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isCreating ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
                                                {t('Creating...', 'جاري الإنشاء...')}
                                            </>
                                        ) : (
                                            t('Create Project', 'إنشاء مشروع')
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
