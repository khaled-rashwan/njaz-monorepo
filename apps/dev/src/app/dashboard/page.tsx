'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import Link from 'next/link';
import { getCurrentUser } from 'aws-amplify/auth';

interface DevInquiry {
    id: string;
    clientName: string;
    clientEmail: string;
    companyName?: string;
    projectTypes: string[];
    status: string;
    timeline?: string;
    estimatedPriceMin?: number;
    estimatedPriceMax?: number;
    estimatedWeeks?: number;
    projectDescription?: string;
    workflow?: string;
    createdAt: string;
}

type FilterTab = 'all' | 'new' | 'reviewing' | 'approved' | 'in_progress' | 'completed';

// ── Constants ───────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
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
    reviewing: { en: 'Reviewing', ar: 'قيد المراجعة' },
    proposal_sent: { en: 'Proposal Sent', ar: 'تم إرسال العرض' },
    approved: { en: 'Approved', ar: 'مقبول' },
    in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
    completed: { en: 'Completed', ar: 'مكتمل' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
};

const TYPE_ICONS: Record<string, string> = {
    website: '🌐', mobile_app: '📱', ecommerce: '🛒',
    branding: '🎨', campaign: '📢', cloud: '☁️', seo: '🔍',
};

const FILTER_TABS: { value: FilterTab; labelEn: string; labelAr: string }[] = [
    { value: 'all', labelEn: 'All', labelAr: 'الكل' },
    { value: 'new', labelEn: 'New', labelAr: 'جديد' },
    { value: 'reviewing', labelEn: 'Reviewing', labelAr: 'مراجعة' },
    { value: 'approved', labelEn: 'Approved', labelAr: 'مقبول' },
    { value: 'in_progress', labelEn: 'In Progress', labelAr: 'تنفيذ' },
    { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
];

// ── Component ───────────────────────────────────────────
export default function DashboardPage() {
    const { t, direction } = useLanguage();
    const [inquiries, setInquiries] = useState<DevInquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [selectedInquiry, setSelectedInquiry] = useState<DevInquiry | null>(null);

    // Auth check
    useEffect(() => {
        async function checkAuth() {
            try {
                await getCurrentUser();
                setIsAuthed(true);
            } catch {
                setIsAuthed(false);
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    // Fetch inquiries once authenticated
    useEffect(() => {
        if (!isAuthed) return;
        async function fetchInquiries() {
            try {
                const config = await import('../../../amplify_outputs.json');
                const cfg = config.default || config;
                
                // Get the user's Cognito session to authorize the read operation
                const { fetchAuthSession } = await import('aws-amplify/auth');
                const session = await fetchAuthSession();
                const token = session.tokens?.accessToken?.toString();

                const resp = await fetch(cfg.data?.url || '', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': token } : { 'x-api-key': cfg.data?.api_key || '' }),
                    },
                    body: JSON.stringify({
                        query: `query { listDevInquiries { items { id clientName clientEmail companyName projectTypes status timeline estimatedPriceMin estimatedPriceMax estimatedWeeks projectDescription workflow createdAt } } }`,
                    }),
                });
                const result = await resp.json();
                if (result.data?.listDevInquiries?.items) {
                    setInquiries(result.data.listDevInquiries.items);
                }
            } catch (err) {
                console.error('Failed to fetch inquiries:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchInquiries();
    }, [isAuthed]);

    // Filtered list
    const filtered = useMemo(() => {
        if (activeFilter === 'all') return inquiries;
        return inquiries.filter(i => i.status === activeFilter);
    }, [inquiries, activeFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: inquiries.length,
        new: inquiries.filter(i => i.status === 'new').length,
        inProgress: inquiries.filter(i => ['reviewing', 'approved', 'in_progress'].includes(i.status)).length,
        completed: inquiries.filter(i => i.status === 'completed').length,
    }), [inquiries]);

    // ── Not Authenticated ───────────────────────────
    if (!loading && !isAuthed) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md mx-auto px-4">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3">
                            {t('Authentication Required', 'مطلوب تسجيل الدخول')}
                        </h1>
                        <p className="text-slate-400 mb-6">
                            {t('Please sign in to access the project dashboard.', 'يرجى تسجيل الدخول للوصول إلى لوحة المشاريع.')}
                        </p>
                        <Link href="/" className="futuristic-btn-primary">
                            {t('Go Home', 'الرئيسية')}
                        </Link>
                    </div>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white mb-2">
                                {t('Project Dashboard', 'لوحة المشاريع')}
                            </h1>
                            <p className="text-slate-400">
                                {t('Track and manage all project inquiries.', 'تتبع وإدارة جميع استفسارات المشاريع.')}
                            </p>
                        </div>
                        <Link href="/contact" className="futuristic-btn-primary whitespace-nowrap text-center">
                            + {t('New Inquiry', 'استفسار جديد')}
                        </Link>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: t('Total Inquiries', 'إجمالي الاستفسارات'), value: stats.total, color: 'cyan', icon: '📊' },
                            { label: t('New', 'جديد'), value: stats.new, color: 'blue', icon: '🆕' },
                            { label: t('In Progress', 'قيد التنفيذ'), value: stats.inProgress, color: 'amber', icon: '⚡' },
                            { label: t('Completed', 'مكتمل'), value: stats.completed, color: 'emerald', icon: '✅' },
                        ].map((stat, i) => (
                            <div key={i} className={`futuristic-card p-5 rounded-xl border border-${stat.color}-500/20`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{stat.icon}</span>
                                    <span className={`text-3xl font-extrabold text-${stat.color}-400`}>{stat.value}</span>
                                </div>
                                <span className="text-slate-400 text-sm">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setActiveFilter(tab.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                    activeFilter === tab.value
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                                }`}
                            >
                                {t(tab.labelEn, tab.labelAr)}
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">{t('Loading inquiries...', 'جاري تحميل الاستفسارات...')}</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-20">
                            <div className="text-5xl mb-4 opacity-40">📋</div>
                            <h3 className="text-xl font-bold text-white mb-2">
                                {t('No inquiries yet', 'لا توجد استفسارات بعد')}
                            </h3>
                            <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                {t(
                                    'When clients submit project inquiries through the intake form, they will appear here.',
                                    'عندما يرسل العملاء استفسارات المشاريع عبر نموذج الاستقبال، ستظهر هنا.'
                                )}
                            </p>
                            <Link href="/contact" className="futuristic-btn">
                                {t('Try the Intake Form', 'جرب نموذج الاستقبال')}
                            </Link>
                        </div>
                    )}

                    {/* Inquiry List */}
                    {!loading && filtered.length > 0 && (
                        <div className="space-y-3">
                            {filtered.map(inquiry => (
                                <button
                                    key={inquiry.id}
                                    onClick={() => setSelectedInquiry(selectedInquiry?.id === inquiry.id ? null : inquiry)}
                                    className="w-full text-start futuristic-card rounded-xl p-5 hover:border-cyan-500/30 transition-all group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                        {/* Client Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-bold truncate">{inquiry.clientName}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[inquiry.status] || STATUS_STYLES.new}`}>
                                                    {t(
                                                        STATUS_LABELS[inquiry.status]?.en || inquiry.status,
                                                        STATUS_LABELS[inquiry.status]?.ar || inquiry.status
                                                    )}
                                                </span>
                                            </div>
                                            <div className="text-slate-500 text-sm truncate">{inquiry.clientEmail}</div>
                                        </div>

                                        {/* Project Types */}
                                        <div className="flex gap-1 flex-wrap">
                                            {inquiry.projectTypes?.map(pt => (
                                                <span key={pt} className="text-lg" title={pt}>
                                                    {TYPE_ICONS[pt] || '📦'}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Estimate */}
                                        {inquiry.estimatedPriceMin && inquiry.estimatedPriceMax && (
                                            <div className="text-end">
                                                <div className="text-white font-bold text-sm" dir="ltr">
                                                    ${inquiry.estimatedPriceMin.toLocaleString()} – ${inquiry.estimatedPriceMax.toLocaleString()}
                                                </div>
                                                <div className="text-slate-500 text-xs">
                                                    {inquiry.estimatedWeeks} {t('weeks', 'أسبوع')}
                                                </div>
                                            </div>
                                        )}

                                        {/* Date */}
                                        <div className="text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(inquiry.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {selectedInquiry?.id === inquiry.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                                            {/* Top Detail Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-start">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white mb-2">{t('Project Description', 'وصف المشروع')}</h4>
                                                    <p className="text-slate-300 text-sm leading-relaxed mb-3">
                                                        {inquiry.projectDescription || t('No description provided.', 'لم يتم تقديم وصف.')}
                                                    </p>
                                                    {inquiry.companyName && (
                                                        <p className="text-slate-400 text-sm">
                                                            <span className="font-semibold text-slate-300">{t('Company:', 'الشركة:')}</span> {inquiry.companyName}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-white mb-2">{t('Client Preferences', 'تفضيلات العميل')}</h4>
                                                    <p className="text-slate-300 text-sm mb-1">
                                                        <span className="text-slate-500">{t('Timeline:', 'الجدول الزمني:')}</span> {t(
                                                            inquiry.timeline ? inquiry.timeline.charAt(0).toUpperCase() + inquiry.timeline.slice(1) : 'Standard',
                                                            inquiry.timeline === 'rush' ? 'مستعجل' : inquiry.timeline === 'accelerated' ? 'سريع' : 'عادي'
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Workflow View */}
                                            {inquiry.workflow && (
                                                <div className="text-start">
                                                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                                        {t('Generated Workflow Plan', 'خطة سير العمل المولدة')}
                                                    </h4>
                                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 overflow-hidden">
                                                        {(() => {
                                                            try {
                                                                const wf = JSON.parse(inquiry.workflow);
                                                                if (!wf?.phases?.length) return <p className="text-sm text-slate-500">{t('No workflow generated.', 'لم يتم توليد خطة عمل.')}</p>;
                                                                
                                                                return (
                                                                    <div className="space-y-4">
                                                                        {/* Summary bar */}
                                                                        <div className="flex gap-4 text-xs text-slate-400 bg-slate-800/80 p-2 rounded-lg mb-4">
                                                                            <span>{wf.phases.length} {t('Phases', 'مراحل')}</span>
                                                                            <span>•</span>
                                                                            <span>{wf.totalEstimatedHours} {t('Hours', 'ساعة')}</span>
                                                                        </div>
                                                                        
                                                                        {/* Phases timeline */}
                                                                        <div className="relative border-l-2 border-slate-700 ml-3 pl-4 space-y-5" dir="ltr">
                                                                            {wf.phases.map((phase: any, i: number) => (
                                                                                <div key={i} className="relative">
                                                                                    {/* Timeline dot */}
                                                                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-4 ring-slate-800"></div>
                                                                                    
                                                                                    <h5 className="text-white font-medium text-sm mb-1">{phase.name}</h5>
                                                                                    <div className="flex gap-3 text-xs text-slate-500 mb-2">
                                                                                        <span>⏱️ {phase.duration}</span>
                                                                                        {phase.tasks && <span>📋 {phase.tasks.length} tasks</span>}
                                                                                    </div>
                                                                                    
                                                                                    {/* Tasks list */}
                                                                                    {phase.tasks && phase.tasks.length > 0 && (
                                                                                        <ul className="space-y-1 mt-2">
                                                                                            {phase.tasks.map((task: any, j: number) => (
                                                                                                <li key={j} className="text-sm text-slate-400 flex items-start gap-2">
                                                                                                    <span className="opacity-50 mt-0.5">•</span>
                                                                                                    <span>{task.title}</span>
                                                                                                    <span className="text-xs opacity-50 ml-auto">{task.estimatedHours}h</span>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } catch (e) {
                                                                return <p className="text-sm text-slate-500">{t('Failed to parse workflow.', 'فشل تحليل خطة العمل.')}</p>;
                                                            }
                                                        })()}
                                                    </div>
                                                    
                                                    {/* Next Action */}
                                                    <div className="mt-6 flex justify-end">
                                                        <button 
                                                            className="futuristic-btn-primary py-2 px-6"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                alert('GitHub repo & board automation will be available in Phase 3!');
                                                            }}
                                                        >
                                                            {t('Initialize Project (Auto-Scaffold)', 'تهيئة المشروع (إنشاء تلقائي)')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
