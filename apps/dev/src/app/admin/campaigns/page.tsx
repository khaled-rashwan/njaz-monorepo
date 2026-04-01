'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';

const CHANNEL_META: Record<string, { icon: string; label: string }> = {
    social_media: { icon: '📱', label: 'Social Media' },
    email: { icon: '📧', label: 'Email' },
    seo: { icon: '🔍', label: 'SEO' },
    paid_ads: { icon: '💰', label: 'Paid Ads' },
    referral: { icon: '🤝', label: 'Referral' },
    events: { icon: '🎤', label: 'Events' },
    content: { icon: '📝', label: 'Content' },
    other: { icon: '📦', label: 'Other' },
};

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface CampaignForm {
    name: string;
    description: string;
    channel: string;
    status: string;
    budget: string;
    startDate: string;
    endDate: string;
    targetAudience: string;
    goals: string;
}

const EMPTY_FORM: CampaignForm = {
    name: '', description: '', channel: 'social_media', status: 'draft',
    budget: '', startDate: '', endDate: '', targetAudience: '', goals: '',
};

export default function CampaignsPage() {
    const { t } = useLanguage();
    const { hasAccess } = useAdminUser();
    const { data, loading, refetch } = useAdminData<{ campaigns: any[] }>({ url: '/api/admin/campaigns' });
    const { data: leadsData } = useAdminData<{ leads: any[] }>({ url: '/api/admin/leads' });

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const campaigns = data?.campaigns || [];
    const allLeads = leadsData?.leads || [];

    // Stats per campaign
    const campaignStats = useMemo(() => {
        const stats: Record<string, { leads: number; won: number; value: number }> = {};
        for (const lead of allLeads) {
            if (!lead.campaignId) continue;
            if (!stats[lead.campaignId]) stats[lead.campaignId] = { leads: 0, won: 0, value: 0 };
            stats[lead.campaignId].leads++;
            if (lead.status === 'won') stats[lead.campaignId].won++;
            stats[lead.campaignId].value += lead.estimatedValue || 0;
        }
        return stats;
    }, [allLeads]);

    const filtered = useMemo(() =>
        filterStatus ? campaigns.filter((c: any) => c.status === filterStatus) : campaigns
    , [campaigns, filterStatus]);

    // Summary stats
    const totalBudget = campaigns.reduce((s: number, c: any) => s + (c.budget || 0), 0);
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'active').length;
    const totalLeads = allLeads.length;

    const handleCreate = async () => {
        if (!form.name) return;
        setSaving(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    budget: form.budget ? parseFloat(form.budget) : null,
                    startDate: form.startDate || null,
                    endDate: form.endDate || null,
                }),
            });
            setShowModal(false);
            setForm(EMPTY_FORM);
            await refetch();
        } catch (err) {
            console.error('Failed to create campaign:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, status: newStatus }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed to update campaign:', err);
        }
    };

    if (!hasAccess) {
        return <div className="text-center py-20 text-slate-400">🔒 {t('Access denied', 'الوصول مرفوض')}</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-white mb-1">
                        {t('Campaigns', 'الحملات')}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {t('Manage marketing campaigns and track lead generation.', 'إدارة الحملات التسويقية وتتبع توليد العملاء المحتملين.')}
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="futuristic-btn-primary text-sm !py-2">
                    + {t('New Campaign', 'حملة جديدة')}
                </button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-cyan-400">{campaigns.length}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Total Campaigns', 'إجمالي الحملات')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-emerald-400">{activeCampaigns}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Active', 'نشطة')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-purple-400">{totalLeads}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Total Leads', 'إجمالي العملاء المحتملين')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-amber-400" dir="ltr">
                        ${totalBudget.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-xs mt-1">{t('Total Budget', 'إجمالي الميزانية')}</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 mb-4">
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="futuristic-select text-xs !py-1.5 !px-2"
                >
                    <option value="">{t('All Statuses', 'كل الحالات')}</option>
                    {Object.entries(STATUS_STYLES).map(([k]) => (
                        <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
                    ))}
                </select>
            </div>

            {/* Campaign List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="futuristic-card rounded-xl p-12 text-center">
                    <div className="text-4xl mb-4">📢</div>
                    <p className="text-slate-400">{t('No campaigns yet. Create your first campaign!', 'لا توجد حملات بعد. أنشئ أول حملة!')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((c: any) => {
                        const stats = campaignStats[c.id] || { leads: 0, won: 0, value: 0 };
                        const ch = CHANNEL_META[c.channel] || CHANNEL_META.other;
                        const budgetPct = c.budget && c.spentAmount ? Math.min(100, (c.spentAmount / c.budget) * 100) : 0;

                        return (
                            <div key={c.id} className="futuristic-card rounded-xl p-5 hover:border-cyan-500/30 transition-all group">
                                {/* Top Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{ch.icon}</span>
                                        <div>
                                            <h3 className="text-white font-bold text-sm group-hover:text-cyan-400 transition-colors">
                                                {c.name}
                                            </h3>
                                            <span className="text-slate-500 text-[10px]">{ch.label}</span>
                                        </div>
                                    </div>
                                    <select
                                        value={c.status}
                                        onChange={e => handleStatusChange(c.id, e.target.value)}
                                        className={`text-[10px] px-2 py-0.5 rounded border bg-transparent outline-none cursor-pointer ${STATUS_STYLES[c.status] || STATUS_STYLES.draft}`}
                                    >
                                        {Object.keys(STATUS_STYLES).map(s => (
                                            <option key={s} value={s} className="bg-slate-900">{s}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                {c.description && (
                                    <p className="text-slate-500 text-xs mb-3 line-clamp-2">{c.description}</p>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="text-center p-2 rounded bg-slate-800/30">
                                        <div className="text-white font-bold text-sm">{stats.leads}</div>
                                        <div className="text-slate-500 text-[10px]">{t('Leads', 'عملاء')}</div>
                                    </div>
                                    <div className="text-center p-2 rounded bg-slate-800/30">
                                        <div className="text-emerald-400 font-bold text-sm">{stats.won}</div>
                                        <div className="text-slate-500 text-[10px]">{t('Won', 'فاز')}</div>
                                    </div>
                                    <div className="text-center p-2 rounded bg-slate-800/30">
                                        <div className="text-amber-400 font-bold text-sm" dir="ltr">${stats.value.toLocaleString()}</div>
                                        <div className="text-slate-500 text-[10px]">{t('Value', 'قيمة')}</div>
                                    </div>
                                </div>

                                {/* Budget Progress */}
                                {c.budget && (
                                    <div className="mb-3">
                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                            <span>{t('Budget', 'ميزانية')}</span>
                                            <span dir="ltr">${(c.spentAmount || 0).toLocaleString()} / ${c.budget.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                style={{ width: `${budgetPct}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Dates */}
                                <div className="flex items-center justify-between text-[10px] text-slate-600">
                                    <span>
                                        {c.startDate && new Date(c.startDate).toLocaleDateString()}
                                        {c.endDate && ` → ${new Date(c.endDate).toLocaleDateString()}`}
                                    </span>
                                    <Link
                                        href={`/admin/leads?campaignId=${c.id}`}
                                        className="text-cyan-400 hover:text-cyan-300"
                                    >
                                        {t('View Leads →', 'عرض العملاء ←')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Create Campaign Modal ──────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="futuristic-card rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">{t('New Campaign', 'حملة جديدة')}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Campaign Name', 'اسم الحملة')} *</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="futuristic-input text-sm"
                                    placeholder={t('e.g. Q2 Social Blitz', 'مثال: حملة وسائل التواصل')}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Description', 'الوصف')}</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="futuristic-input text-sm min-h-[80px]"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Channel', 'القناة')}</label>
                                    <select
                                        value={form.channel}
                                        onChange={e => setForm({ ...form, channel: e.target.value })}
                                        className="futuristic-select text-sm"
                                    >
                                        {Object.entries(CHANNEL_META).map(([k, v]) => (
                                            <option key={k} value={k}>{v.icon} {v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Budget ($)', 'الميزانية ($)')}</label>
                                    <input
                                        type="number"
                                        value={form.budget}
                                        onChange={e => setForm({ ...form, budget: e.target.value })}
                                        className="futuristic-input text-sm"
                                        placeholder="5000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Start Date', 'تاريخ البدء')}</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="futuristic-input text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('End Date', 'تاريخ الانتهاء')}</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="futuristic-input text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Target Audience', 'الجمهور المستهدف')}</label>
                                <input
                                    value={form.targetAudience}
                                    onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                                    className="futuristic-input text-sm"
                                    placeholder={t('e.g. SMBs in Saudi Arabia', 'مثال: الشركات الصغيرة في السعودية')}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Goals', 'الأهداف')}</label>
                                <textarea
                                    value={form.goals}
                                    onChange={e => setForm({ ...form, goals: e.target.value })}
                                    className="futuristic-input text-sm min-h-[60px]"
                                    rows={2}
                                    placeholder={t('Campaign objectives...', 'أهداف الحملة...')}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="futuristic-btn text-sm !py-2" disabled={saving}>
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.name || saving}
                                className="futuristic-btn-primary text-sm !py-2 min-w-[100px] flex items-center justify-center"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    t('Create Campaign', 'إنشاء الحملة')
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
