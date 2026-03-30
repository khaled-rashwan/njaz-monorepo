'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';

// ── Status styles ───────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    reviewing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    proposal_sent: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    in_progress: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    completed: 'bg-green-500/15 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
    new: { en: 'New', ar: 'جديد' },
    reviewing: { en: 'Reviewing', ar: 'مراجعة' },
    proposal_sent: { en: 'Proposal Sent', ar: 'تم إرسال العرض' },
    approved: { en: 'Approved', ar: 'مقبول' },
    in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
    completed: { en: 'Completed', ar: 'مكتمل' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

const PRIORITY_ICONS: Record<string, string> = {
    urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢',
};

const TYPE_ICONS: Record<string, string> = {
    website: '🌐', mobile_app: '📱', ecommerce: '🛒',
    branding: '🎨', campaign: '📢', cloud: '☁️', seo: '🔍',
};

export default function AdminDashboardPage() {
    const { t } = useLanguage();
    const { user, loading: userLoading, hasAccess } = useAdminUser();
    const { data, loading: dataLoading } = useAdminData<{
        inquiries: any[];
    }>({ url: '/api/admin/inquiries' });

    const inquiries = data?.inquiries || [];

    // ── Compute Stats ────────────────────────────────
    const stats = useMemo(() => {
        const total = inquiries.length;
        const byStatus: Record<string, number> = {};
        let totalRevMin = 0;
        let totalRevMax = 0;
        let totalTasks = 0;
        let doneTasks = 0;

        for (const inq of inquiries) {
            byStatus[inq.status] = (byStatus[inq.status] || 0) + 1;
            totalRevMin += inq.estimatedPriceMin || 0;
            totalRevMax += inq.estimatedPriceMax || 0;
            totalTasks += inq.taskProgress?.total || 0;
            doneTasks += inq.taskProgress?.done || 0;
        }

        return { total, byStatus, totalRevMin, totalRevMax, totalTasks, doneTasks };
    }, [inquiries]);

    // ── Recent (last 5) ──────────────────────────────
    const recent = useMemo(() => {
        return [...inquiries]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [inquiries]);

    // ── Auth Gate ────────────────────────────────────
    if (!userLoading && !hasAccess) {
        return (
            <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🔒</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">
                    {t('Access Denied', 'الوصول مرفوض')}
                </h1>
                <p className="text-slate-400 mb-6">
                    {t(
                        'You need admin or developer permissions to access this page.',
                        'تحتاج صلاحيات مدير أو مطور للوصول لهذه الصفحة.'
                    )}
                </p>
                <Link href="/" className="futuristic-btn">
                    {t('Go Home', 'الرئيسية')}
                </Link>
            </div>
        );
    }

    const loading = userLoading || dataLoading;

    return (
        <div>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                    {t('Admin Dashboard', 'لوحة التحكم')}
                </h1>
                <p className="text-slate-400">
                    {t('Overview of all project inquiries and team activity.', 'نظرة عامة على جميع استفسارات المشاريع ونشاط الفريق.')}
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            icon="📋" label={t('Total Inquiries', 'إجمالي الاستفسارات')}
                            value={stats.total} color="cyan"
                        />
                        <StatCard
                            icon="🆕" label={t('New / Pending', 'جديد / معلق')}
                            value={(stats.byStatus['new'] || 0) + (stats.byStatus['reviewing'] || 0)} color="blue"
                        />
                        <StatCard
                            icon="⚡" label={t('Active Projects', 'مشاريع نشطة')}
                            value={(stats.byStatus['approved'] || 0) + (stats.byStatus['in_progress'] || 0)} color="amber"
                        />
                        <StatCard
                            icon="✅" label={t('Completed', 'مكتملة')}
                            value={stats.byStatus['completed'] || 0} color="emerald"
                        />
                    </div>

                    {/* Pipeline + Task Progress */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Pipeline Funnel */}
                        <div className="futuristic-card rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                {t('Pipeline', 'خط الأنابيب')}
                            </h3>
                            <div className="space-y-2">
                                {['new', 'reviewing', 'proposal_sent', 'approved', 'in_progress', 'completed'].map(status => {
                                    const count = stats.byStatus[status] || 0;
                                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                    return (
                                        <div key={status} className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded text-xs border whitespace-nowrap ${STATUS_COLORS[status]}`}>
                                                {t(STATUS_LABELS[status]?.en || status, STATUS_LABELS[status]?.ar || status)}
                                            </span>
                                            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-slate-400 text-sm w-8 text-end">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Task Progress */}
                        <div className="futuristic-card rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {t('Task Progress', 'تقدم المهام')}
                            </h3>
                            <div className="text-center py-4">
                                <div className="relative w-32 h-32 mx-auto mb-4">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                                        <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="12" />
                                        <circle
                                            cx="64" cy="64" r="56" fill="none"
                                            stroke="url(#progressGrad)" strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(stats.totalTasks > 0 ? (stats.doneTasks / stats.totalTasks) : 0) * 352} 352`}
                                        />
                                        <defs>
                                            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#38cddf" />
                                                <stop offset="100%" stopColor="#10b981" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div>
                                            <div className="text-2xl font-extrabold text-white">
                                                {stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0}%
                                            </div>
                                            <div className="text-xs text-slate-400">{t('complete', 'مكتمل')}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center gap-6 text-sm">
                                    <span className="text-slate-400">{stats.doneTasks} {t('done', 'مكتمل')}</span>
                                    <span className="text-slate-500">/ {stats.totalTasks} {t('total', 'إجمالي')}</span>
                                </div>
                            </div>

                            {/* Revenue Pipeline */}
                            {stats.totalRevMax > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-700/50">
                                    <div className="text-slate-400 text-xs mb-1">{t('Revenue Pipeline', 'خط الإيرادات')}</div>
                                    <div className="text-white font-bold" dir="ltr">
                                        ${stats.totalRevMin.toLocaleString()} – ${stats.totalRevMax.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Inquiries */}
                    <div className="futuristic-card rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                {t('Recent Inquiries', 'أحدث الاستفسارات')}
                            </h3>
                            <Link href="/admin/inquiries" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                                {t('View all →', 'عرض الكل ←')}
                            </Link>
                        </div>
                        {recent.length === 0 ? (
                            <p className="text-slate-500 text-sm py-4 text-center">
                                {t('No inquiries yet.', 'لا توجد استفسارات بعد.')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recent.map(inq => (
                                    <Link
                                        key={inq.id}
                                        href={`/admin/inquiries?selected=${inq.id}`}
                                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800/50 transition-colors group"
                                    >
                                        <div className="flex gap-1">
                                            {inq.projectTypes?.map((pt: string) => (
                                                <span key={pt} className="text-lg">{TYPE_ICONS[pt] || '📦'}</span>
                                            ))}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
                                                {inq.clientName}
                                                {inq.companyName && <span className="text-slate-500 text-sm"> · {inq.companyName}</span>}
                                            </div>
                                            <div className="text-slate-500 text-xs truncate">{inq.projectDescription?.slice(0, 80)}</div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[inq.status]}`}>
                                            {t(STATUS_LABELS[inq.status]?.en || inq.status, STATUS_LABELS[inq.status]?.ar || inq.status)}
                                        </span>
                                        {inq.priority && (
                                            <span title={inq.priority}>{PRIORITY_ICONS[inq.priority] || '🟡'}</span>
                                        )}
                                        <span className="text-slate-600 text-xs whitespace-nowrap">
                                            {new Date(inq.createdAt).toLocaleDateString()}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Stat Card Component ─────────────────────────────────
function StatCard({ icon, label, value, color }: {
    icon: string; label: string; value: number; color: string;
}) {
    return (
        <div className={`futuristic-card p-5 rounded-xl border border-${color}-500/20`}>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{icon}</span>
                <span className={`text-3xl font-extrabold text-${color}-400`}>{value}</span>
            </div>
            <span className="text-slate-400 text-sm">{label}</span>
        </div>
    );
}
