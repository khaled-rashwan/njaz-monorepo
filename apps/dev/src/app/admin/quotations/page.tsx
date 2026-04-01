'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';

const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    sent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    viewed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    expired: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

interface LineItem {
    description: string;
    qty: number;
    unitPrice: number;
    total: number;
}

interface QuoteForm {
    clientName: string;
    clientEmail: string;
    currency: string;
    validUntil: string;
    notes: string;
    terms: string;
    lineItems: LineItem[];
    leadId: string;
}

const EMPTY_ITEM: LineItem = { description: '', qty: 1, unitPrice: 0, total: 0 };

const EMPTY_FORM: QuoteForm = {
    clientName: '', clientEmail: '', currency: 'SAR', validUntil: '',
    notes: '', terms: 'Payment due within 30 days of acceptance.',
    lineItems: [{ ...EMPTY_ITEM }], leadId: '',
};

export default function QuotationsPage() {
    const { t } = useLanguage();
    const { hasAccess } = useAdminUser();
    const { data, loading, refetch } = useAdminData<{ quotations: any[] }>({ url: '/api/admin/quotations' });
    const { data: leadsData } = useAdminData<{ leads: any[] }>({ url: '/api/admin/leads' });

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<QuoteForm>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');

    const quotations = data?.quotations || [];
    const leads = leadsData?.leads || [];

    const filtered = useMemo(() =>
        filterStatus ? quotations.filter((q: any) => q.status === filterStatus) : quotations
    , [quotations, filterStatus]);

    // Summary
    const totalQuoted = quotations.reduce((s: number, q: any) => s + (q.total || 0), 0);
    const acceptedTotal = quotations.filter((q: any) => q.status === 'accepted')
        .reduce((s: number, q: any) => s + (q.total || 0), 0);

    const subtotal = form.lineItems.reduce((s, i) => s + i.total, 0);

    const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
        const items = [...form.lineItems];
        (items[idx] as any)[field] = value;
        if (field === 'qty' || field === 'unitPrice') {
            items[idx].total = items[idx].qty * items[idx].unitPrice;
        }
        setForm({ ...form, lineItems: items });
    };

    const addLineItem = () => setForm({ ...form, lineItems: [...form.lineItems, { ...EMPTY_ITEM }] });
    const removeLineItem = (idx: number) => {
        if (form.lineItems.length <= 1) return;
        setForm({ ...form, lineItems: form.lineItems.filter((_, i) => i !== idx) });
    };

    // Auto-fill from lead
    const handleLeadSelect = (leadId: string) => {
        const lead = leads.find((l: any) => l.id === leadId);
        if (lead) {
            setForm({
                ...form,
                leadId,
                clientName: lead.name,
                clientEmail: lead.email,
            });
        } else {
            setForm({ ...form, leadId: '' });
        }
    };

    const generateQuoteNumber = () => {
        const now = new Date();
        return `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    };

    const handleCreate = async () => {
        if (!form.clientName || !form.clientEmail || form.lineItems.length === 0) return;
        setSaving(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    quotationNumber: generateQuoteNumber(),
                    clientName: form.clientName,
                    clientEmail: form.clientEmail,
                    status: 'draft',
                    lineItems: JSON.stringify(form.lineItems),
                    subtotal,
                    tax: 0,
                    discount: 0,
                    total: subtotal,
                    currency: form.currency,
                    validUntil: form.validUntil || null,
                    notes: form.notes || null,
                    terms: form.terms || null,
                    leadId: form.leadId || null,
                }),
            });
            setShowModal(false);
            setForm({ ...EMPTY_FORM });
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
            const extra: any = { id, status };
            if (status === 'sent') extra.sentAt = new Date().toISOString();
            await fetch('/api/admin/quotations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(extra),
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
                        {t('Quotations', 'عروض الأسعار')}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {t('Create and track client quotations.', 'إنشاء وتتبع عروض الأسعار.')}
                    </p>
                </div>
                <button onClick={() => setShowModal(true)} className="futuristic-btn-primary text-sm !py-2">
                    + {t('New Quotation', 'عرض سعر جديد')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-cyan-400">{quotations.length}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Total Quotes', 'إجمالي العروض')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-amber-400" dir="ltr">{form.currency} {totalQuoted.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Total Quoted', 'إجمالي المعروض')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-emerald-400" dir="ltr">{form.currency} {acceptedTotal.toLocaleString()}</div>
                    <div className="text-slate-400 text-xs mt-1">{t('Accepted', 'مقبول')}</div>
                </div>
                <div className="futuristic-card p-4 rounded-xl">
                    <div className="text-2xl font-extrabold text-purple-400">
                        {quotations.length > 0 ? Math.round((quotations.filter((q: any) => q.status === 'accepted').length / quotations.length) * 100) : 0}%
                    </div>
                    <div className="text-slate-400 text-xs mt-1">{t('Win Rate', 'معدل الفوز')}</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 mb-4">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="futuristic-select text-xs !py-1.5 !px-2">
                    <option value="">{t('All Statuses', 'كل الحالات')}</option>
                    {Object.keys(STATUS_STYLES).map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                </select>
            </div>

            {/* Quotation List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="futuristic-card rounded-xl p-12 text-center">
                    <div className="text-4xl mb-4">💰</div>
                    <p className="text-slate-400">{t('No quotations yet.', 'لا توجد عروض أسعار بعد.')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((q: any) => {
                        const items = typeof q.lineItems === 'string' ? JSON.parse(q.lineItems) : (q.lineItems || []);
                        return (
                            <div key={q.id} className="futuristic-card rounded-xl p-5 hover:border-cyan-500/20 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-bold text-sm">{q.quotationNumber}</span>
                                            <select
                                                value={q.status}
                                                onChange={e => handleStatusChange(q.id, e.target.value)}
                                                className={`text-[10px] px-2 py-0.5 rounded border bg-transparent outline-none cursor-pointer ${STATUS_STYLES[q.status] || ''}`}
                                            >
                                                {Object.keys(STATUS_STYLES).map(s => (
                                                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="text-slate-400 text-xs">{q.clientName} · {q.clientEmail}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white font-bold" dir="ltr">
                                            {q.currency || 'SAR'} {(q.total || 0).toLocaleString()}
                                        </div>
                                        <div className="text-slate-500 text-[10px]">
                                            {items.length} {t('items', 'عناصر')}
                                        </div>
                                    </div>
                                </div>

                                {/* Line items preview */}
                                <div className="space-y-1">
                                    {items.slice(0, 3).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-500">
                                            <span className="truncate max-w-[200px]">{item.description}</span>
                                            <span dir="ltr">{item.qty} × {item.unitPrice} = {item.total}</span>
                                        </div>
                                    ))}
                                    {items.length > 3 && (
                                        <div className="text-[10px] text-slate-600">+{items.length - 3} more...</div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50 text-[10px] text-slate-600">
                                    <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                                    {q.validUntil && <span>{t('Valid until', 'صالح حتى')} {new Date(q.validUntil).toLocaleDateString()}</span>}
                                    {q.sentAt && <span>✉️ {t('Sent', 'أُرسل')} {new Date(q.sentAt).toLocaleDateString()}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Create Quotation Modal ──────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
                    <div className="futuristic-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">{t('New Quotation', 'عرض سعر جديد')}</h3>

                        <div className="space-y-4">
                            {/* Link to Lead */}
                            {leads.length > 0 && (
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Link to Lead (optional)', 'ربط بعميل محتمل (اختياري)')}</label>
                                    <select value={form.leadId} onChange={e => handleLeadSelect(e.target.value)}
                                        className="futuristic-select text-sm">
                                        <option value="">{t('Select lead...', 'اختر عميل...')}</option>
                                        {leads.map((l: any) => (
                                            <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Client Name', 'اسم العميل')} *</label>
                                    <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                                        className="futuristic-input text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Client Email', 'بريد العميل')} *</label>
                                    <input type="email" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })}
                                        className="futuristic-input text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Currency', 'العملة')}</label>
                                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                                        className="futuristic-select text-sm">
                                        <option value="SAR">SAR</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Valid Until', 'صالح حتى')}</label>
                                    <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })}
                                        className="futuristic-input text-sm" />
                                </div>
                            </div>

                            {/* Line Items */}
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">{t('Line Items', 'العناصر')}</label>
                                <div className="space-y-2">
                                    {form.lineItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                value={item.description}
                                                onChange={e => updateLineItem(idx, 'description', e.target.value)}
                                                className="futuristic-input text-xs flex-1"
                                                placeholder={t('Description', 'الوصف')}
                                            />
                                            <input
                                                type="number"
                                                value={item.qty}
                                                onChange={e => updateLineItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                                                className="futuristic-input text-xs w-16 text-center"
                                                placeholder="Qty"
                                            />
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="futuristic-input text-xs w-24 text-center"
                                                placeholder={t('Price', 'السعر')}
                                            />
                                            <span className="text-white text-xs font-bold w-20 text-right" dir="ltr">
                                                {item.total.toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => removeLineItem(idx)}
                                                className="text-slate-500 hover:text-red-400 text-sm"
                                                disabled={form.lineItems.length <= 1}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addLineItem} className="text-xs text-cyan-400 hover:text-cyan-300 mt-2">
                                    + {t('Add Item', 'إضافة عنصر')}
                                </button>

                                <div className="flex justify-end mt-3 pt-3 border-t border-slate-700/50">
                                    <div className="text-right">
                                        <span className="text-slate-400 text-xs mr-4">{t('Total', 'الإجمالي')}:</span>
                                        <span className="text-white font-bold text-lg" dir="ltr">
                                            {form.currency} {subtotal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Notes', 'ملاحظات')}</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                    className="futuristic-input text-sm min-h-[50px]" rows={2} />
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Terms & Conditions', 'الشروط والأحكام')}</label>
                                <textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })}
                                    className="futuristic-input text-sm min-h-[50px]" rows={2} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="futuristic-btn text-sm !py-2" disabled={saving}>
                                {t('Cancel', 'إلغاء')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.clientName || !form.clientEmail || saving}
                                className="futuristic-btn-primary text-sm !py-2 min-w-[120px] flex items-center justify-center"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Create Quotation', 'إنشاء عرض السعر')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
