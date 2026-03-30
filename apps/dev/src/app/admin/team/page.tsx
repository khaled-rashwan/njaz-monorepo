'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';

export default function TeamPage() {
    const { t } = useLanguage();
    const { hasAccess } = useAdminUser();
    const { data: taskData, loading } = useAdminData<{ tasks: any[] }>({ url: '/api/admin/tasks' });
    const { data: inquiryData } = useAdminData<{ inquiries: any[] }>({ url: '/api/admin/inquiries' });

    const tasks = taskData?.tasks || [];
    const inquiries = inquiryData?.inquiries || [];

    // ── Group tasks by assignee ──────────────────────
    const teamData = useMemo(() => {
        const byPerson: Record<string, {
            name: string;
            id: string;
            tasks: any[];
            done: number;
            inProgress: number;
            totalHours: number;
            loggedHours: number;
        }> = {};

        // "Unassigned" bucket
        byPerson['unassigned'] = {
            name: t('Unassigned', 'غير معينة'),
            id: 'unassigned',
            tasks: [],
            done: 0, inProgress: 0, totalHours: 0, loggedHours: 0,
        };

        for (const task of tasks) {
            const key = task.assignedTo || 'unassigned';
            if (!byPerson[key]) {
                byPerson[key] = {
                    name: task.assignedToName || key.slice(0, 8),
                    id: key,
                    tasks: [],
                    done: 0, inProgress: 0, totalHours: 0, loggedHours: 0,
                };
            }
            byPerson[key].tasks.push(task);
            if (task.status === 'done') byPerson[key].done++;
            if (task.status === 'in_progress' || task.status === 'in_review') byPerson[key].inProgress++;
            byPerson[key].totalHours += task.estimatedHours || 0;
            byPerson[key].loggedHours += task.actualHours || 0;
        }

        return Object.values(byPerson).sort((a, b) => b.inProgress - a.inProgress);
    }, [tasks, t]);

    // Inquiry name lookup
    const inquiryNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const inq of inquiries) {
            map[inq.id] = inq.clientName;
        }
        return map;
    }, [inquiries]);

    if (!hasAccess) {
        return <div className="text-center py-20 text-slate-400">🔒 {t('Access denied', 'الوصول مرفوض')}</div>;
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-white mb-2">
                    {t('Team Workload', 'عبء عمل الفريق')}
                </h1>
                <p className="text-slate-400 text-sm">
                    {t('See who is working on what and their capacity.', 'اطلع على ما يعمل عليه كل عضو وقدرته.')}
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                </div>
            ) : teamData.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    {t('No tasks found.', 'لا توجد مهام.')}
                </div>
            ) : (
                <div className="space-y-6">
                    {teamData.map(person => {
                        const capacity = person.totalHours > 0
                            ? Math.min(100, Math.round((person.inProgress * 8) / person.totalHours * 100))
                            : 0;
                        const capacityColor = capacity > 80 ? 'red' : capacity > 50 ? 'amber' : 'emerald';

                        return (
                            <div key={person.id} className="futuristic-card rounded-xl p-5">
                                {/* Person Header */}
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                        person.id === 'unassigned'
                                            ? 'bg-slate-700 text-slate-400'
                                            : 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white'
                                    }`}>
                                        {person.id === 'unassigned' ? '?' : person.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold">{person.name}</div>
                                        <div className="text-slate-500 text-xs">
                                            {person.tasks.length} {t('tasks', 'مهام')} · {person.inProgress} {t('active', 'نشطة')} · {person.done} {t('done', 'مكتملة')}
                                        </div>
                                    </div>
                                    {/* Capacity indicator */}
                                    {person.id !== 'unassigned' && (
                                        <div className="text-end">
                                            <div className={`text-${capacityColor}-400 text-sm font-bold`}>
                                                {capacity}%
                                            </div>
                                            <div className="text-slate-600 text-[10px]">{t('load', 'حمل')}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Active Tasks */}
                                {person.tasks.filter(t => t.status !== 'done' && t.status !== 'backlog').length > 0 && (
                                    <div className="space-y-1.5">
                                        {person.tasks
                                            .filter(t => t.status !== 'done' && t.status !== 'backlog')
                                            .map(task => (
                                                <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/30">
                                                    <StatusDot status={task.status} />
                                                    <span className="text-white text-sm flex-1 truncate">{task.title}</span>
                                                    <span className="text-slate-600 text-xs truncate max-w-[100px]">
                                                        {inquiryNames[task.inquiryId] || '—'}
                                                    </span>
                                                    {task.estimatedHours && (
                                                        <span className="text-slate-500 text-xs">{task.estimatedHours}h</span>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Hours Bar */}
                                {person.totalHours > 0 && (
                                    <div className="mt-3 flex items-center gap-3 text-xs">
                                        <span className="text-slate-500">{t('Hours:', 'ساعات:')}</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-cyan-500/50 transition-all"
                                                style={{ width: `${person.totalHours > 0 ? (person.loggedHours / person.totalHours) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-slate-400">
                                            {person.loggedHours}/{person.totalHours}h
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        todo: 'bg-blue-400',
        in_progress: 'bg-amber-400 animate-pulse',
        in_review: 'bg-purple-400',
        done: 'bg-emerald-400',
        backlog: 'bg-slate-500',
    };
    return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-slate-500'}`} />;
}
