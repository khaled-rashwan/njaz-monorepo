'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<LeadForm>({ ...EMPTY_FORM, campaignId: filterCampaignId });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedLead, setSelectedLead] = useState<any>(null);

    const leads = data?.leads || [];
    const campaigns = campaignData?.campaigns || [];
    const usersList = usersData?.users || [];

    const filtered = useMemo(() =>
        filterStatus ? leads.filter((l: any) => l.status === filterStatus) : leads
    , [leads, filterStatus]);

    // Funnel stats
    const funnel = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const l of leads) counts[l.status] = (counts[l.status] || 0) + 1;
        return counts;
    }, [leads]);

    const totalValue = leads.reduce((s: number, l: any) => s + (l.estimatedValue || 0), 0);

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
                body: JSON.stringify({ id, assignedTo: assignedTo || null, assignedToName: user?.username || null }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed:', err);
        }
    };

    const handleConvertToInquiry = async (lead: any) => {
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            // Create a DevInquiry from this lead
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
                // Update the lead with the inquiry reference
                await fetch('/api/admin/leads', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id: lead.id, status: 'won', convertedInquiryId: inquiry.id }),
                });
                await refetch();
                alert(t('Lead converted to project inquiry!', 'تم تحويل العميل المحتمل إلى استفسار مشروع!'));
            }
        } catch (err) {
            console.error('Failed to convert:', err);
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
                    {Object.entries(STATUS_STYLES).map(([status, style]) => {
                        const count = funnel[status] || 0;
                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
                                className={`flex-1 min-w-[80px] text-center py-2 px-3 rounded-lg border transition-all ${
                                    filterStatus === status ? style + ' ring-1 ring-white/20' : 'border-transparent text-slate-500 hover:text-white'
                                }`}
                            >
                                <div className="text-lg font-bold">{count}</div>
                                <div className="text-[10px] capitalize">{status.replace('_', ' ')}</div>
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
                <div className="futuristic-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-cyan-500/20 bg-cyan-500/5 text-sm">
                                    <th className="p-4 text-slate-400 font-medium">{t('Lead', 'العميل')}</th>
                                    <th className="p-4 text-slate-400 font-medium">{t('Source', 'المصدر')}</th>
                                    <th className="p-4 text-slate-400 font-medium">{t('Status', 'الحالة')}</th>
                                    <th className="p-4 text-slate-400 font-medium">{t('Value', 'القيمة')}</th>
                                    <th className="p-4 text-slate-400 font-medium">{t('Assigned', 'معين')}</th>
                                    <th className="p-4 text-slate-400 font-medium text-right">{t('Actions', 'إجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((lead: any) => (
                                    <tr key={lead.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="text-white font-medium text-sm">{lead.name}</div>
                                            <div className="text-slate-500 text-xs">{lead.email}</div>
                                            {lead.company && <div className="text-slate-600 text-[10px]">{lead.company}</div>}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <span>{SOURCE_ICONS[lead.source] || '📦'} {lead.source?.replace('_', ' ')}</span>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={lead.status}
                                                onChange={e => handleStatusChange(lead.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded border bg-transparent outline-none cursor-pointer ${STATUS_STYLES[lead.status] || ''}`}
                                            >
                                                {Object.keys(STATUS_STYLES).map(s => (
                                                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm" dir="ltr">
                                            {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="p-4">
                                            {isAdmin ? (
                                                <select
                                                    value={lead.assignedTo || ''}
                                                    onChange={e => handleAssign(lead.id, e.target.value)}
                                                    className="bg-transparent text-xs text-cyan-400 border border-slate-700 rounded px-1 py-0.5 outline-none cursor-pointer max-w-[100px]"
                                                >
                                                    <option value="" className="bg-slate-900">Unassigned</option>
                                                    {usersList.map((u: any) => (
                                                        <option key={u.id} value={u.id} className="bg-slate-900">{u.email || u.username}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-slate-500 text-xs">{lead.assignedToName || '—'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {lead.status !== 'won' && lead.status !== 'lost' && !lead.convertedInquiryId && (
                                                    <button
                                                        onClick={() => handleConvertToInquiry(lead)}
                                                        className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                        title={t('Convert to Project', 'تحويل لمشروع')}
                                                    >
                                                        🚀 {t('Convert', 'تحويل')}
                                                    </button>
                                                )}
                                                {lead.convertedInquiryId && (
                                                    <span className="text-[10px] text-emerald-400">✅ {t('Converted', 'تم التحويل')}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
