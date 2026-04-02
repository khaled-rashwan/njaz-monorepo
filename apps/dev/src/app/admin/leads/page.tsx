'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';

const STATUS_STYLES: Record<string, string> = {
    new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    contacted: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    qualified: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    proposal: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    negotiation: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    won: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    lost: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
    new: { en: 'New', ar: 'جديد' },
    contacted: { en: 'Contacted', ar: 'تم التواصل' },
    qualified: { en: 'Qualified', ar: 'مؤهل' },
    proposal: { en: 'Proposal', ar: 'عرض' },
    negotiation: { en: 'Negotiation', ar: 'تفاوض' },
    won: { en: 'Won', ar: 'فاز' },
    lost: { en: 'Lost', ar: 'خسر' },
};

const SOURCE_ICONS: Record<string, string> = {
    campaign: '📢', referral: '🤝', website: '🌐', social: '📱',
    cold_outreach: '📞', event: '🎤', other: '📦',
};

interface LeadForm {
    name: string; email: string; phone: string; company: string;
    source: string; interest: string; notes: string; estimatedValue: string;
    campaignId: string;
}

const EMPTY_FORM: LeadForm = {
    name: '', email: '', phone: '', company: '', source: 'website',
    interest: '', notes: '', estimatedValue: '', campaignId: '',
};

export default function LeadsPage() {
    const { t } = useLanguage();
    const { hasAccess, isAdmin } = useAdminUser();
    const searchParams = useSearchParams();
    const filterCampaignId = searchParams.get('campaignId') || '';

    const { data, loading, refetch } = useAdminData<{ leads: any[] }>({
        url: `/api/admin/leads${filterCampaignId ? `?campaignId=${filterCampaignId}` : ''}`,
    });
    const { data: campaignData } = useAdminData<{ campaigns: any[] }>({ url: '/api/admin/campaigns' });
    const { data: usersData } = useAdminData<{ users: any[] }>({ url: '/api/admin/users' });
    const { data: quoteData } = useAdminData<{ quotations: any[] }>({ url: '/api/admin/quotations' });

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<LeadForm>({ ...EMPTY_FORM, campaignId: filterCampaignId });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const leads = data?.leads || [];
    const campaigns = campaignData?.campaigns || [];
    const usersList = usersData?.users || [];
    const quotations = quoteData?.quotations || [];

    // Campaign name lookup
    const campaignNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const c of campaigns) map[c.id] = c.name;
        return map;
    }, [campaigns]);

    // Quotations per lead lookup
    const quotesByLead = useMemo(() => {
        const map: Record<string, any[]> = {};
        for (const q of quotations) {
            if (q.leadId) {
                if (!map[q.leadId]) map[q.leadId] = [];
                map[q.leadId].push(q);
            }
        }
        return map;
    }, [quotations]);

    const filtered = useMemo(() =>
        filterStatus ? leads.filter((l: any) => l.status === filterStatus) : leads
    , [leads, filterStatus]);

    const funnel = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
        return counts;
    }, [leads]);

    const totalValue = leads.reduce((s: number, l: any) => s + (l.estimatedValue || 0), 0);

    // Filter campaign name display
    const filterCampaignName = filterCampaignId ? campaignNames[filterCampaignId] : null;

    const handleCreate = async () => {
        if (!form.name || !form.email) return;
        setSaving(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    status: 'new',
                    estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
                    campaignId: form.campaignId || null,
                }),
            });
            setShowModal(false);
            setForm({ ...EMPTY_FORM, campaignId: filterCampaignId });
            await refetch();
        } catch (err) {
            console.error('Failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, status }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    const handleAssign = async (id: string, assignedTo: string) => {
        const user = usersList.find((u: any) => u.id === assignedTo);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    id,
                    assignedTo: assignedTo || null,
                    assignedToName: user ? (user.email || user.username) : null,
                }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    const handleConvertToInquiry = async (lead: any) => {
        if (!confirm(t(
            `Convert "${lead.name}" to a project? This will create a new project inquiry.`,
            `تحويل "${lead.name}" إلى مشروع؟ سيتم إنشاء استفسار مشروع جديد.`
        ))) return;

        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            const inquiryResp = await fetch('/api/admin/inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    clientName: lead.name,
                    clientEmail: lead.email,
                    clientPhone: lead.phone || '',
                    companyName: lead.company || '',
                    projectDescription: lead.interest || 'Converted from lead',
                    projectTypes: ['website'],
                    status: 'new',
                }),
            });
            const inquiry = await inquiryResp.json();

            if (inquiry?.id) {
                await fetch('/api/admin/leads', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id: lead.id, status: 'won', convertedInquiryId: inquiry.id }),
                });
                await refetch();
            }
        } catch (err) {
            console.error('Failed to convert:', err);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t(`Delete lead "${name}"?`, `حذف العميل "${name}"؟`))) return;
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch(`/api/admin/leads?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            await refetch();
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    if (!hasAccess) {
        return <div className="text-center py-20 text-slate-400">🔒 {t('Access denied', 'الوصول مرفوض')}</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-white mb-1">
                        {t('Leads', 'العملاء المحتملين')}
                        {filterCampaignName && (
                            <span className="text-sm font-normal text-purple-400 ml-2">
                                — {filterCampaignName}
                                <Link href="/admin/leads" className="text-slate-500 ml-2 hover:text-white">✕</Link>
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {t('Track and manage potential clients through the sales funnel.', 'تتبع وإدارة العملاء المحتملين خلال قمع المبيعات.')}
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="futuristic-btn-primary text-sm !py-2">
                    + {t('New Lead', 'عميل محتمل جديد')}
                </button>
            </div>

            {/* Funnel Overview */}
            <div className="futuristic-card rounded-xl p-4 mb-6">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {Object.entries(STATUS_LABELS).map(([status, labels]) => {
                        const count = funnel[status] || 0;
                        const style = STATUS_STYLES[status] || '';
                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                                className={`flex-1 min-w-[80px] text-center py-2 px-3 rounded-lg border transition-all ${
                                    filterStatus === status ? style + ' ring-1 ring-white/20' : 'border-transparent text-slate-500 hover:text-white'
                                }`}
                            >
                                <div className="text-lg font-bold">{count}</div>
                                <div className="text-[10px]">{t(labels.en, labels.ar)}</div>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50 text-xs text-slate-500">
                    <span>{leads.length} {t('total leads', 'إجمالي العملاء المحتملين')}</span>
                    <span dir="ltr">${totalValue.toLocaleString()} {t('pipeline value', 'قيمة القمع')}</span>
                </div>
            </div>

            {/* Leads Table */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="futuristic-card rounded-xl p-12 text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <p className="text-slate-400">{t('No leads yet. Add your first lead!', 'لا يوجد عملاء محتملين بعد.')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((lead: any) => {
                        const leadQuotes = quotesByLead[lead.id] || [];
                        const campaignName = lead.campaignId ? campaignNames[lead.campaignId] : null;

                        return (
                            <div key={lead.id} className="futuristic-card rounded-xl p-5 hover:border-cyan-500/20 transition-all">
                                {/* Top row: Lead info + Status */}
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {lead.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-white font-bold text-sm">{lead.name}</span>
                                            {lead.company && (
                                                <span className="text-slate-500 text-xs">· {lead.company}</span>
                                            )}
                                        </div>
                                        <div className="text-slate-500 text-xs">{lead.email}</div>
                                        {lead.phone && <div className="text-slate-600 text-[10px]">{lead.phone}</div>}
                                    </div>

                                    {/* Status + Value */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {lead.estimatedValue && (
                                            <span className="text-amber-400 font-bold text-sm" dir="ltr">
                                                ${lead.estimatedValue.toLocaleString()}
                                            </span>
                                        )}
                                        <select
                                            value={lead.status}
                                            onChange={e => handleStatusChange(lead.id, e.target.value)}
                                            className={`text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer ${STATUS_STYLES[lead.status] || ''}`}
                                        >
                                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                                <option key={k} value={k} className="bg-slate-900">{t(v.en, v.ar)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Middle: Interest/Notes */}
                                {lead.interest && (
                                    <p className="text-slate-500 text-xs mt-2 line-clamp-2">{lead.interest}</p>
                                )}

                                {/* Tags Row: Campaign, Source, Assigned, Quotes */}
                                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-800/30">
                                    {/* Source */}
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/50 text-slate-400">
                                        {SOURCE_ICONS[lead.source] || '📦'} {lead.source?.replace('_', ' ')}
                                    </span>

                                    {/* Campaign tag */}
                                    {campaignName && (
                                        <Link href={`/admin/campaigns`}
                                            className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors">
                                            📢 {campaignName}
                                        </Link>
                                    )}

                                    {/* Existing Quotes */}
                                    {leadQuotes.length > 0 && (
                                        <Link href="/admin/quotations"
                                            className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors">
                                            💰 {leadQuotes.length} {t('quote(s)', 'عرض')}
                                        </Link>
                                    )}

                                    {/* Assigned To */}
                                    {isAdmin ? (
                                        <select
                                            value={lead.assignedTo || ''}
                                            onChange={e => handleAssign(lead.id, e.target.value)}
                                            className="bg-transparent text-[10px] text-cyan-400 border border-slate-700 rounded px-2 py-0.5 outline-none cursor-pointer max-w-[140px]"
                                        >
                                            <option value="" className="bg-slate-900">{t('Unassigned', 'غير معين')}</option>
                                            {usersList.map((u: any) => (
                                                <option key={u.id} value={u.id} className="bg-slate-900">{u.email || u.username}</option>
                                            ))}
                                        </select>
                                    ) : lead.assignedToName ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                                            👤 {lead.assignedToName}
                                        </span>
                                    ) : null}

                                    {/* Spacer */}
                                    <div className="flex-1" />

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5">
                                        {/* Create Quote shortcut */}
                                        {!lead.convertedInquiryId && lead.status !== 'lost' && leadQuotes.length === 0 && (
                                            <Link
                                                href={`/admin/quotations?leadId=${lead.id}&name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}`}
                                                className="text-[10px] px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                            >
                                                💰 {t('Quote', 'عرض سعر')}
                                            </Link>
                                        )}

                                        {/* Convert to Project */}
                                        {lead.status !== 'won' && lead.status !== 'lost' && !lead.convertedInquiryId && (
                                            <button
                                                onClick={() => handleConvertToInquiry(lead)}
                                                className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                🚀 {t('Convert', 'تحويل')}
                                            </button>
                                        )}

                                        {/* Converted — link to project */}
                                        {lead.convertedInquiryId && (
                                            <Link
                                                href={`/admin/inquiries?selected=${lead.convertedInquiryId}`}
                                                className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                            >
                                                ✅ {t('View Project', 'عرض المشروع')}
                                            </Link>
                                        )}

                                        {/* Delete */}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(lead.id, lead.name)}
                                                className="text-[10px] px-1.5 py-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title={t('Delete', 'حذف')}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="text-[10px] text-slate-600 mt-2">
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                    {lead.lastContactDate && (
                                        <span className="ml-2">{t('Last contact:', 'آخر تواصل:')} {new Date(lead.lastContactDate).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Create Lead Modal ──────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="futuristic-card rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">{t('New Lead', 'عميل محتمل جديد')}</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Name', 'الاسم')} *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="futuristic-input text-sm" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Email', 'البريد')} *</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="futuristic-input text-sm" placeholder="john@company.com" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Phone', 'الهاتف')}</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="futuristic-input text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Company', 'الشركة')}</label>
                                    <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                                        className="futuristic-input text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Source', 'المصدر')}</label>
                                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                                        className="futuristic-select text-sm">
                                        {Object.entries(SOURCE_ICONS).map(([k, icon]) => (
                                            <option key={k} value={k}>{icon} {k.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Est. Value ($)', 'القيمة التقديرية ($)')}</label>
                                    <input type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value })}
                                        className="futuristic-input text-sm" placeholder="10000" />
                                </div>
                            </div>

                            {campaigns.length > 0 && (
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Campaign', 'الحملة')}</label>
                                    <select value={form.campaignId} onChange={e => setForm({ ...form, campaignId: e.target.value })}
                                        className="futuristic-select text-sm">
                                        <option value="">{t('None (Manual Lead)', 'لا يوجد (عميل يدوي)')}</option>
                                        {campaigns.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Interest / Notes', 'الاهتمام / ملاحظات')}</label>
                                <textarea value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })}
                                    className="futuristic-input text-sm min-h-[60px]" rows={2} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="futuristic-btn text-sm !py-2" disabled={saving}>
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.name || !form.email || saving}
                                className="futuristic-btn-primary text-sm !py-2 min-w-[80px] flex items-center justify-center"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Add Lead', 'إضافة عميل')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
