'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/LanguageContext';
import { useAdminUser, useAdminData } from '@/lib/admin/hooks';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';

// ── Constants ───────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    reviewing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    proposal_sent: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    in_progress: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    completed: 'bg-green-500/15 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_OPTIONS = [
    { value: 'new', en: 'New', ar: 'جديد' },
    { value: 'reviewing', en: 'Reviewing', ar: 'مراجعة' },
    { value: 'proposal_sent', en: 'Proposal Sent', ar: 'تم إرسال العرض' },
    { value: 'approved', en: 'Approved', ar: 'مقبول' },
    { value: 'in_progress', en: 'In Progress', ar: 'قيد التنفيذ' },
    { value: 'completed', en: 'Completed', ar: 'مكتمل' },
    { value: 'cancelled', en: 'Cancelled', ar: 'ملغي' },
];

const PRIORITY_OPTIONS = [
    { value: 'low', en: 'Low', ar: 'منخفض', icon: '🟢' },
    { value: 'medium', en: 'Medium', ar: 'متوسط', icon: '🟡' },
    { value: 'high', en: 'High', ar: 'عالي', icon: '🟠' },
    { value: 'urgent', en: 'Urgent', ar: 'عاجل', icon: '🔴' },
];

const MGMT_OPTIONS = [
    { value: 'internal', en: 'Internal Only', ar: 'داخلي فقط', desc: 'Tasks managed in this dashboard' },
    { value: 'github', en: 'GitHub', ar: 'جيت هب', desc: 'All tasks synced to GitHub Issues' },
    { value: 'hybrid', en: 'Hybrid', ar: 'مختلط', desc: 'Some tasks in GitHub, others internal' },
];

const TYPE_ICONS: Record<string, string> = {
    website: '🌐', mobile_app: '📱', ecommerce: '🛒',
    branding: '🎨', campaign: '📢', cloud: '☁️', seo: '🔍',
};

type FilterTab = 'all' | 'new' | 'reviewing' | 'approved' | 'in_progress' | 'completed';

export default function InquiriesPage() {
    const { t, direction } = useLanguage();
    const searchParams = useSearchParams();
    const { hasAccess, isAdmin } = useAdminUser();
    const { data, loading, refetch } = useAdminData<{ inquiries: any[] }>({ url: '/api/admin/inquiries' });

    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('selected'));
    const [saving, setSaving] = useState(false);
    const [syncingGithub, setSyncingGithub] = useState(false);

    const inquiries = data?.inquiries || [];

    const filtered = useMemo(() => {
        if (activeFilter === 'all') return inquiries;
        return inquiries.filter(i => i.status === activeFilter);
    }, [inquiries, activeFilter]);

    const selectedInquiry = useMemo(() => {
        return inquiries.find(i => i.id === selectedId) || null;
    }, [inquiries, selectedId]);

    // ── Update Inquiry ──────────────────────────────
    const updateInquiry = useCallback(async (updates: Record<string, any>) => {
        if (!selectedId) return;
        setSaving(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            await fetch('/api/admin/inquiries', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ id: selectedId, ...updates }),
            });
            await refetch();
        } catch (err) {
            console.error('Failed to update:', err);
        } finally {
            setSaving(false);
        }
    }, [selectedId, refetch]);

    // ── Sync to GitHub ──────────────────────────────
    const syncToGithub = useCallback(async () => {
        if (!selectedId || !selectedInquiry?.githubRepo) return;
        setSyncingGithub(true);
        try {
            const session = await fetchAuthSession();
            const token = session.tokens?.accessToken?.toString();
            const res = await fetch('/api/admin/github-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    inquiryId: selectedId,
                    githubRepo: selectedInquiry.githubRepo,
                }),
            });
            const data = await res.json();
            if (data.error) alert(`Error: ${data.message || data.error}`);
            else alert(data.message || 'Synced successfully!');
            await refetch();
        } catch (err) {
            console.error('Failed to sync to github:', err);
            alert('Failed to sync to GitHub.');
        } finally {
            setSyncingGithub(false);
        }
    }, [selectedId, selectedInquiry, refetch]);

    if (!hasAccess) {
        return (
            <div className="text-center py-20">
                <span className="text-3xl">🔒</span>
                <p className="text-slate-400 mt-4">{t('Access denied', 'الوصول مرفوض')}</p>
            </div>
        );
    }

    return (
        <div className="flex gap-6 min-h-[600px]">
            {/* ── Left Panel: Inquiry List ─────────────── */}
            <div className={`flex-1 ${selectedInquiry ? 'hidden lg:block lg:max-w-md' : ''}`}>
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {(['all', 'new', 'reviewing', 'approved', 'in_progress', 'completed'] as FilterTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                activeFilter === tab
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : 'text-slate-400 hover:text-white border border-transparent'
                            }`}
                        >
                            {t(
                                STATUS_OPTIONS.find(s => s.value === tab)?.en || 'All',
                                STATUS_OPTIONS.find(s => s.value === tab)?.ar || 'الكل'
                            )}
                            {tab !== 'all' && (
                                <span className="ml-1 text-slate-600">
                                    ({inquiries.filter(i => i.status === tab).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="text-center py-10">
                        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        {t('No inquiries found.', 'لا توجد استفسارات.')}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(inq => (
                            <button
                                key={inq.id}
                                onClick={() => setSelectedId(inq.id === selectedId ? null : inq.id)}
                                className={`w-full text-start p-4 rounded-xl transition-all ${
                                    inq.id === selectedId
                                        ? 'futuristic-card border-cyan-500/40 shadow-[0_0_20px_rgba(56,205,223,0.1)]'
                                        : 'futuristic-card hover:border-cyan-500/30'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-0.5">
                                        {inq.projectTypes?.slice(0, 3).map((pt: string) => (
                                            <span key={pt} className="text-sm">{TYPE_ICONS[pt] || '📦'}</span>
                                        ))}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium text-sm truncate">{inq.clientName}</div>
                                        <div className="text-slate-500 text-xs truncate">{inq.clientEmail}</div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[inq.status]}`}>
                                        {t(
                                            STATUS_OPTIONS.find(s => s.value === inq.status)?.en || inq.status,
                                            STATUS_OPTIONS.find(s => s.value === inq.status)?.ar || inq.status
                                        )}
                                    </span>
                                </div>
                                {/* Progress Bar */}
                                {inq.taskProgress?.total > 0 && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-cyan-500/60 transition-all"
                                                style={{ width: `${(inq.taskProgress.done / inq.taskProgress.total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {inq.taskProgress.done}/{inq.taskProgress.total}
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Right Panel: Detail ─────────────────── */}
            {selectedInquiry && (
                <div className="flex-1 futuristic-card rounded-xl p-6 overflow-y-auto max-h-[80vh]">
                    {/* Close button (mobile) */}
                    <button
                        onClick={() => setSelectedId(null)}
                        className="lg:hidden mb-4 text-slate-400 hover:text-white text-sm"
                    >
                        ← {t('Back to list', 'رجوع للقائمة')}
                    </button>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedInquiry.clientName}</h2>
                            <p className="text-slate-400 text-sm">{selectedInquiry.clientEmail}</p>
                            {selectedInquiry.companyName && (
                                <p className="text-slate-500 text-xs mt-1">{selectedInquiry.companyName}</p>
                            )}
                        </div>
                        <div className="text-end text-xs text-slate-500">
                            {new Date(selectedInquiry.createdAt).toLocaleString()}
                        </div>
                    </div>

                    {/* Admin Controls */}
                    {isAdmin && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                            {/* Status */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Status', 'الحالة')}</label>
                                <select
                                    value={selectedInquiry.status}
                                    onChange={e => updateInquiry({ status: e.target.value })}
                                    className="futuristic-select text-sm !py-1.5"
                                    disabled={saving}
                                >
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s.value} value={s.value}>{t(s.en, s.ar)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Priority', 'الأولوية')}</label>
                                <select
                                    value={selectedInquiry.priority || 'medium'}
                                    onChange={e => updateInquiry({ priority: e.target.value })}
                                    className="futuristic-select text-sm !py-1.5"
                                    disabled={saving}
                                >
                                    {PRIORITY_OPTIONS.map(p => (
                                        <option key={p.value} value={p.value}>{p.icon} {t(p.en, p.ar)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Management Type */}
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">{t('Tracking', 'التتبع')}</label>
                                <select
                                    value={selectedInquiry.managementType || 'internal'}
                                    onChange={e => updateInquiry({ managementType: e.target.value })}
                                    className="futuristic-select text-sm !py-1.5"
                                    disabled={saving}
                                >
                                    {MGMT_OPTIONS.map(m => (
                                        <option key={m.value} value={m.value}>{t(m.en, m.ar)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* GitHub Integration */}
                    {isAdmin && (selectedInquiry.managementType === 'github' || selectedInquiry.managementType === 'hybrid') && (
                        <div className="mb-6 p-4 rounded-lg bg-[#0d1117] border border-slate-700/50">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                                {t('GitHub Integration', 'تكامل جيت هب')}
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full">
                                    <label className="text-xs text-slate-400 mb-1 block">{t('Repository (owner/repo)', 'المستودع (المالك/المستودع)')}</label>
                                    <input
                                        type="text"
                                        placeholder="njaz-org/client-repo"
                                        defaultValue={selectedInquiry.githubRepo || ''}
                                        onBlur={e => {
                                            if (e.target.value !== (selectedInquiry.githubRepo || '')) {
                                                updateInquiry({ githubRepo: e.target.value });
                                            }
                                        }}
                                        className="futuristic-input text-sm !py-1.5"
                                    />
                                </div>
                                <button
                                    onClick={syncToGithub}
                                    disabled={syncingGithub || !selectedInquiry.githubRepo}
                                    className="futuristic-btn-primary text-sm whitespace-nowrap disabled:opacity-50 !py-1.5"
                                >
                                    {syncingGithub ? t('Syncing...', 'جاري المزامنة...') : t('Sync Tasks to GitHub', 'مزامنة المهام إلى جيت هب')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Project Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <DetailSection title={t('Project Types', 'أنواع المشروع')}>
                            <div className="flex flex-wrap gap-2">
                                {selectedInquiry.projectTypes?.map((pt: string) => (
                                    <span key={pt} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/50 text-sm text-slate-300">
                                        {TYPE_ICONS[pt] || '📦'} {pt.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </DetailSection>

                        <DetailSection title={t('Estimate', 'التقدير')}>
                            {selectedInquiry.estimatedPriceMin && selectedInquiry.estimatedPriceMax ? (
                                <div>
                                    <div className="text-white font-bold" dir="ltr">
                                        ${selectedInquiry.estimatedPriceMin.toLocaleString()} – ${selectedInquiry.estimatedPriceMax.toLocaleString()}
                                    </div>
                                    <div className="text-slate-500 text-xs">
                                        {selectedInquiry.estimatedWeeks} {t('weeks', 'أسبوع')} · {t('Timeline:', 'الجدول:')} {selectedInquiry.timeline || 'standard'}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-slate-500 text-sm">—</span>
                            )}
                        </DetailSection>
                    </div>

                    <DetailSection title={t('Description', 'الوصف')}>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedInquiry.projectDescription}
                        </p>
                    </DetailSection>

                    {/* Task Progress */}
                    {selectedInquiry.taskProgress?.total > 0 && (
                        <div className="mt-6">
                            <DetailSection title={t('Tasks', 'المهام')}>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                                            style={{ width: `${(selectedInquiry.taskProgress.done / selectedInquiry.taskProgress.total) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-white text-sm font-bold">
                                        {selectedInquiry.taskProgress.done}/{selectedInquiry.taskProgress.total}
                                    </span>
                                </div>
                                <Link
                                    href={`/admin/board?inquiry=${selectedInquiry.id}`}
                                    className="text-cyan-400 text-sm hover:text-cyan-300 mt-2 inline-block"
                                >
                                    {t('View on Board →', 'عرض في اللوحة ←')}
                                </Link>
                            </DetailSection>
                        </div>
                    )}

                    {/* Admin Notes */}
                    {isAdmin && (
                        <div className="mt-6">
                            <DetailSection title={t('Internal Notes', 'ملاحظات داخلية')}>
                                <textarea
                                    defaultValue={selectedInquiry.adminNotes || ''}
                                    onBlur={e => {
                                        if (e.target.value !== (selectedInquiry.adminNotes || '')) {
                                            updateInquiry({ adminNotes: e.target.value });
                                        }
                                    }}
                                    className="futuristic-textarea text-sm !min-h-[80px]"
                                    placeholder={t('Add internal notes...', 'أضف ملاحظات داخلية...')}
                                />
                            </DetailSection>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
            {children}
        </div>
    );
}
