import { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { getAppUrl } from '@njaz/shared-auth';

interface Inquiry {
    id: string;
    clientName: string;
    projectTypes: string[];
    status: string;
    estimatedWeeks?: number;
    projectDescription?: string;
    createdAt: string;
}

const STATUS_STEPS = ['new', 'reviewing', 'approved', 'in_progress', 'completed'];

const STATUS_LABELS: Record<string, string> = {
    new: '📋 Submitted',
    reviewing: '🔍 Reviewing',
    proposal_sent: '📩 Proposal',
    approved: '✅ Approved',
    in_progress: '⚡ In Progress',
    completed: '🎉 Completed',
    cancelled: '❌ Cancelled',
};

const TYPE_ICONS: Record<string, string> = {
    website: '🌐', mobile_app: '📱', ecommerce: '🛒',
    branding: '🎨', campaign: '📢', cloud: '☁️', seo: '🔍',
};

/**
 * "My Projects" panel for the app-selector dashboard.
 * Shows inquiries submitted by the current user.
 * Queries AppSync directly using the user's Cognito token.
 */
export function MyProjectsPanel() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [userSub, setUserSub] = useState<string | null>(null);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

    const devUrl = getAppUrl('dev') || '/';

    useEffect(() => {
        async function fetchMyInquiries() {
            try {
                const currentUser = await getCurrentUser();
                setUserSub(currentUser.userId);

                const session = await fetchAuthSession();
                const token = session.tokens?.accessToken?.toString();
                if (!token) return;

                // Load AppSync config
                const config = await import('../../amplify_outputs.json');
                const cfg = config.default || config;
                const appsyncUrl = cfg.data?.url;
                if (!appsyncUrl) return;

                const resp = await fetch(appsyncUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token,
                    },
                    body: JSON.stringify({
                        query: `query {
                            listDevInquiries(limit: 20) {
                                items {
                                    id clientName projectTypes status
                                    estimatedWeeks projectDescription
                                    submittedBy createdAt
                                }
                            }
                        }`,
                    }),
                });

                const result = await resp.json();
                const items = result.data?.listDevInquiries?.items || [];

                // Filter to only the current user's submissions
                const mine = items.filter((i: any) =>
                    i.submittedBy === currentUser.userId ||
                    i.submittedBy === currentUser.username
                );

                setInquiries(mine);
            } catch (err) {
                console.error('Failed to fetch my projects:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchMyInquiries();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-6">
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    if (inquiries.length === 0) {
        return (
            <div className="text-center py-6">
                <div className="text-3xl mb-2 opacity-40">📁</div>
                <p className="text-slate-500 text-sm mb-3">No project inquiries yet</p>
                <a
                    href={`${devUrl}/contact`}
                    className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                >
                    + Start a New Project
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-3 relative">
            {selectedInquiry && (
                <div className="absolute inset-0 z-10 bg-slate-900/95 rounded-xl border border-cyan-500/20 p-4 flex flex-col justify-start overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white flex-1">{selectedInquiry.clientName}</h3>
                        <button 
                            onClick={() => setSelectedInquiry(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-slate-400 text-xs mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-cyan-400">
                                    {STATUS_LABELS[selectedInquiry.status] || selectedInquiry.status}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-slate-400 text-xs mb-1">Project Types</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedInquiry.projectTypes.map(pt => (
                                    <span key={pt} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 text-xs text-white">
                                        {TYPE_ICONS[pt] || '📦'} {pt.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {selectedInquiry.projectDescription && (
                            <div>
                                <p className="text-slate-400 text-xs mb-1">Description</p>
                                <p className="text-slate-300 leading-relaxed bg-white/5 p-2 rounded text-xs break-words whitespace-pre-wrap">
                                    {selectedInquiry.projectDescription}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-700">
                            <span>{selectedInquiry.estimatedWeeks ? `~${selectedInquiry.estimatedWeeks} weeks` : 'TBD timeline'}</span>
                            <span>{new Date(selectedInquiry.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {inquiries.map(inq => {
                const currentStep = STATUS_STEPS.indexOf(inq.status);
                const progress = inq.status === 'cancelled' ? 0
                    : currentStep >= 0 ? ((currentStep + 1) / STATUS_STEPS.length) * 100 : 10;

                return (
                    <button
                        key={inq.id}
                        onClick={() => setSelectedInquiry(inq)}
                        className="block w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex gap-0.5">
                                {inq.projectTypes?.slice(0, 2).map(pt => (
                                    <span key={pt} className="text-sm">{TYPE_ICONS[pt] || '📦'}</span>
                                ))}
                            </div>
                            <span className="text-white text-sm font-medium flex-1 truncate group-hover:text-cyan-400 transition-colors">
                                {inq.clientName}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {new Date(inq.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {STATUS_LABELS[inq.status] || inq.status}
                            </span>
                        </div>
                    </button>
                );
            })}

            <a
                href={`${devUrl}/contact`}
                className="block text-center text-cyan-400 text-xs hover:text-cyan-300 pt-2"
            >
                + Start New Project
            </a>
        </div>
    );
}
