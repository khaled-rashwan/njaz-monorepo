'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import { client } from '@/lib/amplify-client';
import { ScholarProject } from '@/types';

export default function WorkspaceDashboard() {
    const { t, language, direction } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadData();
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
        if (!confirm(t('Are you sure you want to delete this project?', 'هل أنت متأكد من حذف هذا المشروع؟'))) return;
        try {
            await client.models.ScholarProject.delete({ id: projectId });
            setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
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
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="scholar" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white mb-1">
                                {t('Research Workspace', 'مساحة البحث')}
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {t(`${projects.length} project${projects.length !== 1 ? 's' : ''}`, `${projects.length} مشروع`)}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="futuristic-btn-primary flex items-center gap-2 text-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('New Project', 'مشروع جديد')}
                        </button>
                    </div>

                    {/* Projects Grid */}
                    {projects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <div key={project.id} onClick={() => { setIsLoading(true); router.push(`/projects/${project.id}`); }} className="futuristic-card p-6 cursor-pointer hover:border-amber-500/50 transition-colors">
                                    <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="text-red-400 hover:text-red-300">
                                            {t('Delete', 'حذف')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="futuristic-card p-12 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
                                <svg className="w-10 h-10 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {t('No projects yet', 'لا توجد مشاريع بعد')}
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                                {t(
                                    'Create your first research project to start managing literature, documents, and datasets.',
                                    'أنشئ أول مشروع بحثي لبدء إدارة الأدبيات والمستندات والبيانات.'
                                )}
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="futuristic-btn-primary inline-flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('Create Your First Project', 'أنشئ مشروعك الأول')}
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Project Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in">
                            <div className="flex justify-between items-center p-5 border-b border-slate-800">
                                <h2 className="text-lg font-bold text-white">{t('Create New Project', 'إنشاء مشروع جديد')}</h2>
                                <button 
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-5 space-y-4">
                                <div>
                                    <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        {t('Project Title *', 'عنوان المشروع *')}
                                    </label>
                                    <input
                                        id="title"
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder={t('e.g. LLM Impact on Education', 'مثال: تأثير الذكاء الاصطناعي على التعليم')}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-slate-800 text-white text-sm outline-none"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        {t('Description (Optional)', 'الوصف (اختياري)')}
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder={t('Brief overview of the project goals...', 'نظرة عامة موجزة عن أهداف المشروع...')}
                                        className="w-full px-3 py-2 border border-slate-700 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 bg-slate-800 text-white text-sm outline-none"
                                    />
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        {t('Cancel', 'إلغاء')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating || !newTitle.trim()}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isCreating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
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
