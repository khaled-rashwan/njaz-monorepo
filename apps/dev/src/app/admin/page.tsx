'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';

export default function AdminDashboardPage() {
    const { t } = useLanguage();
    const { user, loading: userLoading, hasAccess } = useAdminUser();
    const { data: inquiryData, loading: inqLoading } = useAdminData<{ inquiries: any[] }>({ url: '/api/admin/inquiries' });
    const { data: campaignData, loading: campLoading } = useAdminData<{ campaigns: any[] }>({ url: '/api/admin/campaigns' });
    const { data: leadData, loading: leadLoading } = useAdminData<{ leads: any[] }>({ url: '/api/admin/leads' });
    const { data: quoteData, loading: quoteLoading } = useAdminData<{ quotations: any[] }>({ url: '/api/admin/quotations' });

    const inquiries = inquiryData?.inquiries || [];
    const campaigns = campaignData?.campaigns || [];
    const leads = leadData?.leads || [];
    const quotations = quoteData?.quotations || [];

    // ── Compute Stats ────────────────────────────────
    const stats = useMemo(() => {
        const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
        const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
        const spentBudget = campaigns.reduce((s, c) => s + (c.spentAmount || 0), 0);

        const newLeads = leads.filter(l => l.status === 'new').length;
        const qualifiedLeads = leads.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status)).length;
        const wonLeads = leads.filter(l => l.status === 'won').length;
        const pipelineValue = leads.reduce((s, l) => s + (l.estimatedValue || 0), 0);

        const draftQuotes = quotations.filter(q => q.status === 'draft').length;
        const sentQuotes = quotations.filter(q => q.status === 'sent' || q.status === 'viewed').length;
        const acceptedQuotes = quotations.filter(q => q.status === 'accepted').length;
        const totalQuoted = quotations.reduce((s, q) => s + (q.total || 0), 0);
        const acceptedValue = quotations.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0);
        const winRate = quotations.length > 0 ? Math.round((acceptedQuotes / quotations.length) * 100) : 0;

        const activeProjects = inquiries.filter(i => i.status === 'approved' || i.status === 'in_progress').length;
        const completedProjects = inquiries.filter(i => i.status === 'completed').length;
        let totalTasks = 0, doneTasks = 0;
        for (const inq of inquiries) {
            totalTasks += inq.taskProgress?.total || 0;
            doneTasks += inq.taskProgress?.done || 0;
        }

        return {
            activeCampaigns, totalBudget, spentBudget,
            totalLeads: leads.length, newLeads, qualifiedLeads, wonLeads, pipelineValue,
            totalQuotes: quotations.length, draftQuotes, sentQuotes, acceptedQuotes, totalQuoted, acceptedValue, winRate,
            totalProjects: inquiries.length, activeProjects, completedProjects, totalTasks, doneTasks,
        };
    }, [campaigns, leads, quotations, inquiries]);

    // Recent activity across all entities
    const recentActivity = useMemo(() => {
        const items: { type: string; icon: string; title: string; subtitle: string; time: string; href: string; status?: string }[] = [];

        for (const c of campaigns.slice(0, 3)) {
            items.push({
                type: 'campaign', icon: '📢', title: c.name,
                subtitle: `${c.channel?.replace('_', ' ')} campaign`,
                time: c.createdAt, href: '/admin/campaigns', status: c.status,
            });
        }
        for (const l of leads.slice(0, 5)) {
            items.push({
                type: 'lead', icon: '🎯', title: l.name,
                subtitle: l.company || l.email,
                time: l.createdAt, href: '/admin/leads', status: l.status,
            });
        }
        for (const q of quotations.slice(0, 3)) {
            items.push({
                type: 'quote', icon: '💰', title: q.quotationNumber,
                subtitle: `${q.clientName} — ${q.currency || 'SAR'} ${(q.total || 0).toLocaleString()}`,
                time: q.createdAt, href: '/admin/quotations', status: q.status,
            });
        }
        for (const i of inquiries.slice(0, 3)) {
            items.push({
                type: 'project', icon: '📋', title: i.clientName,
                subtitle: i.projectDescription?.slice(0, 60) || '',
                time: i.createdAt, href: `/admin/inquiries?selected=${i.id}`, status: i.status,
            });
        }

        return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    }, [campaigns, leads, quotations, inquiries]);

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
                    {t('You need admin or developer permissions.', 'تحتاج صلاحيات مدير أو مطور.')}
                </p>
                <Link href="/" className="futuristic-btn">{t('Go Home', 'الرئيسية')}</Link>
            </div>
        );
    }

    const loading = userLoading || inqLoading || campLoading || leadLoading || quoteLoading;

    return (
        <div>
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                    {t('Command Center', 'مركز التحكم')}
                </h1>
                <p className="text-slate-400">
                    {t('Full pipeline overview — from campaigns to delivery.', 'نظرة شاملة على خط الأنابيب — من الحملات إلى التسليم.')}
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                </div>
            ) : (
                <>
                    {/* ── Pipeline Stages ──────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {/* Campaigns */}
                        <Link href="/admin/campaigns" className="futuristic-card p-5 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center text-lg">📢</div>
                                <div>
                                    <div className="text-2xl font-extrabold text-purple-400">{stats.activeCampaigns}</div>
                                    <div className="text-slate-500 text-[10px]">{t('Active Campaigns', 'حملات نشطة')}</div>
                                </div>
                            </div>
                            <div className="text-slate-600 text-xs" dir="ltr">
                                ${stats.totalBudget.toLocaleString()} {t('budget', 'ميزانية')}
                            </div>
                        </Link>

                        {/* Leads */}
                        <Link href="/admin/leads" className="futuristic-card p-5 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-lg">🎯</div>
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-400">{stats.totalLeads}</div>
                                    <div className="text-slate-500 text-[10px]">{t('Total Leads', 'إجمالي العملاء')}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 text-[10px]">
                                <span className="text-blue-400">{stats.newLeads} {t('new', 'جديد')}</span>
                                <span className="text-amber-400">{stats.qualifiedLeads} {t('qualified', 'مؤهل')}</span>
                                <span className="text-emerald-400">{stats.wonLeads} {t('won', 'فاز')}</span>
                            </div>
                        </Link>

                        {/* Quotations */}
                        <Link href="/admin/quotations" className="futuristic-card p-5 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-all group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center text-lg">💰</div>
                                <div>
                                    <div className="text-2xl font-extrabold text-amber-400">{stats.totalQuotes}</div>
                                    <div className="text-slate-500 text-[10px]">{t('Quotations', 'عروض أسعار')}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 text-[10px]">
                                <span className="text-amber-400">{stats.winRate}% {t('win rate', 'معدل الفوز')}</span>
                                <span className="text-slate-500" dir="ltr">${stats.acceptedValue.toLocaleString()}</span>
                            </div>
                        </Link>

                        {/* Projects */}
                        <Link href="/admin/inquiries" className="futuristic-card p-5 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center text-lg">📋</div>
                                <div>
                                    <div className="text-2xl font-extrabold text-cyan-400">{stats.activeProjects}</div>
                                    <div className="text-slate-500 text-[10px]">{t('Active Projects', 'مشاريع نشطة')}</div>
                                </div>
                            </div>
                            <div className="flex gap-3 text-[10px]">
                                <span className="text-emerald-400">{stats.completedProjects} {t('completed', 'مكتمل')}</span>
                                <span className="text-slate-500">{stats.totalProjects} {t('total', 'إجمالي')}</span>
                            </div>
                        </Link>
                    </div>

                    {/* ── Pipeline Flow Visual ──────────────────── */}
                    <div className="futuristic-card rounded-xl p-6 mb-8">
                        <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            {t('Pipeline Flow', 'تدفق خط الأنابيب')}
                        </h3>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            <PipelineStage
                                icon="📢" label={t('Campaigns', 'حملات')}
                                count={stats.activeCampaigns} color="purple" href="/admin/campaigns"
                            />
                            <PipelineArrow />
                            <PipelineStage
                                icon="🎯" label={t('Leads', 'عملاء')}
                                count={stats.totalLeads} color="blue" href="/admin/leads"
                            />
                            <PipelineArrow />
                            <PipelineStage
                                icon="💰" label={t('Quotes', 'عروض')}
                                count={stats.totalQuotes} color="amber" href="/admin/quotations"
                            />
                            <PipelineArrow />
                            <PipelineStage
                                icon="📋" label={t('Projects', 'مشاريع')}
                                count={stats.activeProjects} color="cyan" href="/admin/inquiries"
                            />
                            <PipelineArrow />
                            <PipelineStage
                                icon="📌" label={t('Tasks', 'مهام')}
                                count={stats.totalTasks} color="emerald" href="/admin/board"
                            />
                            <PipelineArrow />
                            <PipelineStage
                                icon="✅" label={t('Done', 'مكتمل')}
                                count={stats.doneTasks} color="green" href="/admin/board"
                            />
                        </div>
                    </div>

                    {/* ── Bottom Grid: Task Progress + Recent Activity ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Task Progress */}
                        <div className="futuristic-card rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                {t('Delivery Progress', 'تقدم التسليم')}
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
                            <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
                                <Link href="/admin/board" className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors">
                                    {t('Open Task Board →', 'فتح لوحة المهام ←')}
                                </Link>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="futuristic-card rounded-xl p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                {t('Recent Activity', 'النشاط الأخير')}
                            </h3>
                            {recentActivity.length === 0 ? (
                                <p className="text-slate-500 text-sm py-4 text-center">
                                    {t('No activity yet.', 'لا يوجد نشاط بعد.')}
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {recentActivity.map((item, i) => (
                                        <Link
                                            key={`${item.type}-${i}`}
                                            href={item.href}
                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <span className="text-base flex-shrink-0">{item.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                                                    {item.title}
                                                </div>
                                                <div className="text-slate-500 text-[10px] truncate">{item.subtitle}</div>
                                            </div>
                                            {item.status && (
                                                <span className="text-[10px] text-slate-500 capitalize whitespace-nowrap">
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            )}
                                            <span className="text-slate-600 text-[10px] whitespace-nowrap">
                                                {new Date(item.time).toLocaleDateString()}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Quick Actions ──────────────────── */}
                    <div className="futuristic-card rounded-xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {t('Quick Actions', 'إجراءات سريعة')}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <QuickAction href="/admin/campaigns" icon="📢" label={t('New Campaign', 'حملة جديدة')} />
                            <QuickAction href="/admin/leads" icon="🎯" label={t('Add Lead', 'إضافة عميل')} />
                            <QuickAction href="/admin/quotations" icon="💰" label={t('Create Quote', 'إنشاء عرض')} />
                            <QuickAction href="/admin/board" icon="📌" label={t('Task Board', 'لوحة المهام')} />
                            <QuickAction href="/admin/team" icon="👥" label={t('Team Load', 'حمل الفريق')} />
                            <QuickAction href="/admin/users" icon="🛡️" label={t('Manage Users', 'إدارة المستخدمين')} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Pipeline Stage Component ─────────────────────
function PipelineStage({ icon, label, count, color, href }: {
    icon: string; label: string; count: number; color: string; href: string;
}) {
    return (
        <Link
            href={href}
            className={`flex-1 min-w-[90px] text-center p-3 rounded-xl border border-${color}-500/20 bg-${color}-500/5 hover:border-${color}-500/40 transition-all`}
        >
            <div className="text-lg mb-1">{icon}</div>
            <div className={`text-xl font-extrabold text-${color}-400`}>{count}</div>
            <div className="text-slate-500 text-[10px]">{label}</div>
        </Link>
    );
}

function PipelineArrow() {
    return (
        <div className="text-slate-600 text-sm flex-shrink-0">→</div>
    );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
        >
            <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-slate-400 text-xs text-center group-hover:text-white transition-colors">{label}</span>
        </Link>
    );
}
