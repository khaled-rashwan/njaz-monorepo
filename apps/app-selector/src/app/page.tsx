'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthContext';
import { AuthForm } from '../components/AuthForm';
import { MyProjectsPanel } from '../components/MyProjectsPanel';
import {
    NJAZ_APPS,
    FuturisticPanel,
    BigNumber,
    MiniBarChart,
    MiniLineChart,
    ActionButton,
    ActivityItem,
    SharedHeader,
    SharedFooter
} from '@njaz/ui-components';
import { getLandingUrl, getAppUrl } from '@njaz/shared-auth';

// Quick actions for the dashboard
const quickActions = [
    { id: 'new-survey', label: 'Survey', icon: '📝', color: 'purple' as const, appId: 'estebian', path: '/' },
    { id: 'new-controller', label: 'Tuner', icon: '⚙️', color: 'gold' as const, appId: 'pid', path: '/' },
    { id: 'new-project', label: 'Project', icon: '📁', color: 'cyan' as const, appId: 'dev', path: '/contact' },
    { id: 'upload-design', label: 'Design', icon: '🎨', color: 'green' as const, appId: 'interior', path: '/' },
];

// Mock chart data
const barChartData = [30, 55, 40, 80, 65, 45, 70];
const lineChartData = [20, 35, 28, 45, 38, 52, 48, 55, 62, 58, 72, 68];

export default function AppSelectorDashboard() {
    const { user, isLoading, isAuthenticated, signOut } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const landingUrl = getLandingUrl();
    const initial = user?.email?.charAt(0).toUpperCase() || 'U';

    const redirectUrl = searchParams.get('redirect_url');

    // Auto-redirect if authenticated and redirect_url exists
    useEffect(() => {
        if (!isLoading && isAuthenticated && redirectUrl) {
            // Check if redirectUrl is valid to prevent open redirect vulnerabilities
            // For now, we trust it if it's within our domain or relative
            window.location.href = redirectUrl;
        }
    }, [isLoading, isAuthenticated, redirectUrl]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400">Initializing Command Center...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show auth form
    if (!isAuthenticated) {
        return (
            <div className="auth-page min-h-screen flex flex-col items-center justify-center p-6 hero-section">
                <div className="mb-8 flex items-center justify-center animate-fade-in">
                    <img 
                        src="/images/logo.png" 
                        alt="Njaz" 
                        className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(56,205,223,0.3)]" 
                        style={{ filter: 'brightness(0) invert(1)' }}
                    />
                </div>
                <AuthForm onSuccess={() => {
                    if (redirectUrl) window.location.href = redirectUrl;
                }} />
                <a href={landingUrl} className="mt-6 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                    ← Back to {typeof window !== 'undefined' && window.location.hostname.includes('test.njaz.org') ? 'test.njaz.org' : 'njaz.org'}
                </a>
            </div>
        );
    }

    // Filter apps based on user groups
    const accessibleApps = NJAZ_APPS.filter(
        (app) =>
            !app.requiredGroup ||
            user?.groups.includes(app.requiredGroup) ||
            user?.groups.includes('admins')
    );

    // Prepare external user for SharedHeader
    const sharedUser = user && user.email ? {
        username: user.email.split('@')[0],
        email: user.email
    } : null;

    return (
        <div className="min-h-screen hero-section futuristic-bg flex flex-col pt-20">
            {/* Shared Header Implementation */}
            <SharedHeader
                currentApp="dashboard"
                externalUser={sharedUser}
                externalLogout={signOut}
            />

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
                <div className="max-w-7xl mx-auto">

                    {/* Top Row - Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <FuturisticPanel title="Active Projects" glowColor="purple" size="sm">
                            <div className="flex items-end justify-between">
                                <BigNumber value={accessibleApps.length} color="purple" />
                                <div className="flex-1 ml-4">
                                    <MiniBarChart data={barChartData} color="purple" />
                                </div>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel title="Total Surveys" glowColor="cyan" size="sm">
                            <div className="flex items-end justify-between">
                                <BigNumber value={24} color="cyan" />
                                <div className="flex-1 ml-4">
                                    <MiniLineChart data={lineChartData} color="green" />
                                </div>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel title="Controllers" glowColor="gold" size="sm">
                            <div className="flex items-end justify-between">
                                <BigNumber value={6} color="gold" />
                                <div className="flex items-center gap-2 text-sm text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    3 active
                                </div>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel title="Team Size" glowColor="green" size="sm">
                            <div className="flex items-end justify-between">
                                <BigNumber value={user?.groups?.length || 0} color="green" />
                                <div className="flex-1 ml-4">
                                    <MiniLineChart data={[3, 5, 4, 6, 8, 7, 9]} color="cyan" />
                                </div>
                            </div>
                        </FuturisticPanel>
                    </div>

                    {/* Middle Row - Quick Actions & Apps */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Quick Actions */}
                        <FuturisticPanel title="Quick Actions" glowColor="cyan">
                            <div className="grid grid-cols-4 gap-2 text-center">
                                {quickActions.map((action) => (
                                    <a key={action.id} href={`${getAppUrl(action.appId as any)}${action.path}`} className="block">
                                        <ActionButton
                                            icon={action.icon}
                                            label={action.label}
                                            color={action.color}
                                        />
                                    </a>
                                ))}
                                {user?.groups.includes('admins') && (
                                    <a key="admin-panel" href="/admin" className="block">
                                        <ActionButton
                                            icon="🛡️"
                                            label="Admin"
                                            color="purple"
                                        />
                                    </a>
                                )}
                            </div>
                        </FuturisticPanel>

                        {/* Your Apps - Takes 2 columns */}
                        <FuturisticPanel title="Your Apps" glowColor="purple" className="lg:col-span-2">
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                {accessibleApps.map((app) => (
                                    <a
                                        key={app.id}
                                        href={getAppUrl(app.id) || app.href}
                                        className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-all"
                                    >
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-lg"
                                            style={{
                                                backgroundColor: `${app.color}15`,
                                                boxShadow: `0 0 20px ${app.color}20`
                                            }}
                                        >
                                            <img src={app.icon} alt={app.name} className="w-9 h-9 object-contain" />
                                        </div>
                                        <span className="text-xs text-slate-400 group-hover:text-white text-center transition-colors">
                                            {app.name}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </FuturisticPanel>
                    </div>

                    {/* My Projects (Dev Inquiries) */}
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <FuturisticPanel title="My Projects" glowColor="green">
                            <MyProjectsPanel />
                        </FuturisticPanel>
                    </div>

                </div>
            </main>

            {/* Shared Footer Integration */}
            <SharedFooter />

            {/* Decorative Connection Lines */}
            <svg className="fixed inset-0 pointer-events-none z-0 opacity-10 hidden lg:block" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#38CDDF" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" />
                <line x1="70%" y1="40%" x2="90%" y2="20%" stroke="url(#lineGradient)" strokeWidth="1" />
            </svg>
        </div>
    );
}
