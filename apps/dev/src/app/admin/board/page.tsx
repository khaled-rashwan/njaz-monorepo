'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';

// ── Constants ───────────────────────────────────────────
const COLUMNS = [
    { id: 'backlog', en: 'Backlog', ar: 'قائمة الانتظار', color: 'slate', icon: '📥' },
    { id: 'todo', en: 'To Do', ar: 'للتنفيذ', color: 'blue', icon: '📋' },
    { id: 'in_progress', en: 'In Progress', ar: 'قيد التنفيذ', color: 'amber', icon: '⚡' },
    { id: 'in_review', en: 'In Review', ar: 'قيد المراجعة', color: 'purple', icon: '🔍' },
    { id: 'done', en: 'Done', ar: 'مكتمل', color: 'emerald', icon: '✅' },
];

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
    setup: { label: '⚙️', color: 'slate' },
    design: { label: '🎨', color: 'purple' },
    development: { label: '💻', color: 'cyan' },
    testing: { label: '🧪', color: 'amber' },
    deployment: { label: '🚀', color: 'emerald' },
    documentation: { label: '📝', color: 'blue' },
    review: { label: '👁️', color: 'pink' },
};

const PRIORITY_DOTS: Record<string, string> = {
    urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500',
};

export default function BoardPage() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const filterInquiryId = searchParams.get('inquiry');
    const { hasAccess, user, isAdmin } = useAdminUser();

    const { data: inquiryData } = useAdminData<{ inquiries: any[] }>({ url: '/api/admin/inquiries' });
    const { data: taskData, loading, refetch } = useAdminData<{ tasks: any[] }>({
        url: `/api/admin/tasks${filterInquiryId ? `?inquiryId=${filterInquiryId}` : ''}`,
    });
    // Fetch users for assignment dropdown (only admins will get data or use it, but safe to call)
    const { data: usersData } = useAdminData<{ users: any[] }>({ url: '/api/admin/users' });

    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [filterInquiry, setFilterInquiry] = useState<string>(filterInquiryId || '');
    const [filterAssignee, setFilterAssignee] = useState<string>('');
    const [filterScope, setFilterScope] = useState<string>(''); // '' = all, 'internal' = no inquiry, 'client' = has inquiry
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', inquiryId: '', type: 'development', priority: 'medium' });

    const tasks = taskData?.tasks || [];
    const inquiries = inquiryData?.inquiries || [];
    const usersList = usersData?.users || [];

    // Client-side filtering
    const filteredTasks = useMemo(() => {
        let result = tasks;
        // Scope filter: internal vs client tasks
        if (filterScope === 'internal') {
            result = result.filter(t => !t.inquiryId);
        } else if (filterScope === 'client') {
            result = result.filter(t => !!t.inquiryId);
        }
        if (filterInquiry) {
            result = result.filter(t => t.inquiryId === filterInquiry);
        }
        if (filterAssignee === 'me' && user) {
            result = result.filter(t => t.assignedTo === user.userId);
        } else if (filterAssignee === 'unassigned') {
            result = result.filter(t => !t.assignedTo);
        }
        return result;
    }, [tasks, filterInquiry, filterAssignee, filterScope, user]);

    // Group by column
    const columns = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        for (const col of COLUMNS) {
            grouped[col.id] = filteredTasks
                .filter(t => t.status === col.id)
                .sort((a, b) => (a.phaseOrder || 0) - (b.phaseOrder || 0));
        }
        return grouped;
    }, [filteredTasks]);

    // Inquiry name lookup
    const inquiryNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const inq of inquiries) {
            map[inq.id] = inq.clientName || inq.id.slice(0, 8);
        }
        return map;
    }, [inquiries]);

    // ── Drag & Drop ─────────────────────────────────
    const handleDragStart = (taskId: string) => {
        setDraggedTaskId(taskId);
    };

    const handleDrop = useCallback(async (newStatus: string) => {
        if (!draggedTaskId) return;

        const task = tasks.find(t => t.id === draggedTaskId);
        if (!task || task.status === newStatus) {
            setDraggedTaskId(null);
            return;
        }

        // Optimistic: update locally
        task.status = newStatus;
        setDraggedTaskId(null);

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/tasks', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ id: draggedTaskId, status: newStatus }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed to update task:', err);
            await refetch(); // revert
        }
    }, [draggedTaskId, tasks, refetch]);

    const handleAssign = async (taskId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
        const assignedTo = e.target.value;
        const selectedUser = usersList.find((u: any) => u.id === assignedTo);
        const assignedToName = selectedUser ? (selectedUser.email || selectedUser.username) : null;

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/tasks', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ id: taskId, assignedTo: assignedTo || null, assignedToName }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed to assign task:', err);
        }
    };

    // ── Create Task ─────────────────────────────────
    const handleCreateTask = useCallback(async () => {
        if (!newTask.title) return;
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(newTask),
            });
            setShowCreateModal(false);
            setNewTask({ title: '', inquiryId: '', type: 'development', priority: 'medium' });
            await refetch();
        } catch (err) {
            console.error('Failed to create task:', err);
        }
    }, [newTask, refetch]);

    if (!hasAccess) {
        return <div className="text-center py-20 text-slate-400">🔒 {t('Access denied', 'الوصول مرفوض')}</div>;
    }

    return (
        <div>
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-extrabold text-white">
                    {t('Task Board', 'لوحة المهام')}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Filter by Scope */}
                    <select
                        value={filterScope}
                        onChange={e => { setFilterScope(e.target.value); if (e.target.value === 'internal') setFilterInquiry(''); }}
                        className="futuristic-select text-xs !py-1.5 !px-2 max-w-[140px]"
                    >
                        <option value="">{t('All Tasks', 'كل المهام')}</option>
                        <option value="client">{t('Client Tasks', 'مهام العملاء')}</option>
                        <option value="internal">{t('Internal Tasks', 'مهام داخلية')}</option>
                    </select>

                    {/* Filter by Inquiry */}
                    <select
                        value={filterInquiry}
                        onChange={e => setFilterInquiry(e.target.value)}
                        className="futuristic-select text-xs !py-1.5 !px-2 max-w-[180px]"
                        disabled={filterScope === 'internal'}
                    >
                        <option value="">{t('All Projects', 'كل المشاريع')}</option>
                        {inquiries.map(inq => (
                            <option key={inq.id} value={inq.id}>{inq.clientName}</option>
                        ))}
                    </select>

                    {/* Filter by Assignee */}
                    <select
                        value={filterAssignee}
                        onChange={e => setFilterAssignee(e.target.value)}
                        className="futuristic-select text-xs !py-1.5 !px-2 max-w-[140px]"
                    >
                        <option value="">{t('All Members', 'كل الأعضاء')}</option>
                        <option value="me">{t('Assigned to Me', 'معينة لي')}</option>
                        <option value="unassigned">{t('Unassigned', 'غير معينة')}</option>
                    </select>

                    {/* Add Task */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="futuristic-btn-primary text-xs !py-1.5 !px-3"
                    >
                        + {t('Task', 'مهمة')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                </div>
            ) : (
                /* Kanban Columns */
                <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
                    {COLUMNS.map(col => (
                        <div
                            key={col.id}
                            className="flex-shrink-0 w-64 lg:w-72"
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(col.id)}
                        >
                            {/* Column Header */}
                            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-${col.color}-500/10 border border-${col.color}-500/20`}>
                                <span>{col.icon}</span>
                                <span className={`text-${col.color}-400 text-sm font-bold`}>{t(col.en, col.ar)}</span>
                                <span className="ml-auto text-slate-500 text-xs">{columns[col.id]?.length || 0}</span>
                            </div>

                            {/* Cards */}
                            <div className="space-y-2 min-h-[200px]">
                                {(columns[col.id] || []).map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={() => handleDragStart(task.id)}
                                        className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:border-cyan-500/30 ${
                                            draggedTaskId === task.id
                                                ? 'opacity-50 scale-95'
                                                : 'futuristic-card'
                                        }`}
                                    >
                                        {/* Task Title */}
                                        <div className="flex items-start gap-2 mb-2">
                                            <span className="text-sm flex-shrink-0">{TYPE_BADGES[task.type]?.label || '📋'}</span>
                                            <span className="text-white text-sm font-medium leading-tight">{task.title}</span>
                                        </div>

                                        {/* Meta Row */}
                                        <div className="flex items-center gap-2 text-[10px]">
                                            {/* Priority dot */}
                                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[task.priority] || PRIORITY_DOTS.medium}`} />

                                            {/* Phase */}
                                            <span className="text-slate-500 truncate">{task.phase}</span>

                                            {/* Hours */}
                                            {task.estimatedHours && (
                                                <span className="text-slate-600 ml-auto">{task.estimatedHours}h</span>
                                            )}
                                        </div>

                                        {/* Project tag */}
                                        <div className="mt-2 text-[10px] truncate">
                                            {task.inquiryId ? (
                                                <span className="text-slate-600">{inquiryNames[task.inquiryId] || task.inquiryId?.slice(0, 8)}</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/25 text-violet-400 font-medium">
                                                    🏢 {t('Internal', 'داخلي')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Assignee */}
                                        <div className="mt-2 flex items-center justify-between pointer-events-auto">
                                            {task.assignedTo ? (() => {
                                                const user = usersList.find((u: any) => u.id === task.assignedTo);
                                                const displayName = user ? (user.email || user.username) : (task.assignedToName || task.assignedTo.slice(0, 8));
                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[8px] text-cyan-400">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                                                            {displayName}
                                                        </span>
                                                    </div>
                                                );
                                            })() : (
                                                <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                                            )}

                                            {isAdmin && (
                                                <select
                                                    value={task.assignedTo || ''}
                                                    onChange={e => handleAssign(task.id, e)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="bg-transparent text-[10px] text-cyan-400 border border-slate-700 rounded px-1 py-0.5 outline-none hover:border-cyan-500/50 appearance-none cursor-pointer max-w-[80px] truncate"
                                                >
                                                    <option value="" className="bg-slate-900">Unassigned</option>
                                                    {usersList.map((u: any) => (
                                                        <option key={u.id} value={u.id} className="bg-slate-900">
                                                            {u.email || u.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* GitHub badge */}
                                        {task.githubIssueUrl && (
                                            <a
                                                href={task.githubIssueUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-white"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                                </svg>
                                                #{task.githubIssueNumber}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Create Task Modal ──────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="futuristic-card rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">{t('Create Task', 'إنشاء مهمة')}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Project', 'المشروع')} <span className="text-slate-600">({t('optional', 'اختياري')})</span></label>
                                <select
                                    value={newTask.inquiryId}
                                    onChange={e => setNewTask({ ...newTask, inquiryId: e.target.value })}
                                    className="futuristic-select text-sm"
                                >
                                    <option value="">🏢 {t('Internal Task (no project)', 'مهمة داخلية (بدون مشروع)')}</option>
                                    {inquiries.map(inq => (
                                        <option key={inq.id} value={inq.id}>{inq.clientName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Title', 'العنوان')}</label>
                                <input
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    className="futuristic-input text-sm"
                                    placeholder={t('Task title...', 'عنوان المهمة...')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Type', 'النوع')}</label>
                                    <select
                                        value={newTask.type}
                                        onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                                        className="futuristic-select text-sm"
                                    >
                                        {Object.entries(TYPE_BADGES).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label} {k}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Priority', 'الأولوية')}</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="futuristic-select text-sm"
                                    >
                                        <option value="low">🟢 {t('Low', 'منخفض')}</option>
                                        <option value="medium">🟡 {t('Medium', 'متوسط')}</option>
                                        <option value="high">🟠 {t('High', 'عالي')}</option>
                                        <option value="urgent">🔴 {t('Urgent', 'عاجل')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="futuristic-btn text-sm !py-2"
                            >
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={handleCreateTask}
                                disabled={!newTask.title}
                                className="futuristic-btn-primary text-sm !py-2"
                            >
                                {t('Create', 'إنشاء')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
