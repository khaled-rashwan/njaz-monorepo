'use client';

import { useAuth } from '../components/AuthContext';
import { AuthForm } from '../components/AuthForm';
import {
    NJAZ_APPS,
    FuturisticPanel,
    BigNumber,
    MiniBarChart,
    MiniLineChart,
    ActionButton,
    ActivityItem,
} from '@njaz/ui-components';
import { getLandingUrl } from '@njaz/shared-auth';

// Quick actions for the dashboard
const quickActions = [
    { id: 'new-survey', label: 'Survey', icon: '📝', color: 'purple' as const },
    { id: 'new-controller', label: 'Controller', icon: '⚙️', color: 'gold' as const },
    { id: 'new-project', label: 'Project', icon: '📁', color: 'cyan' as const },
    { id: 'upload-design', label: 'Design', icon: '🎨', color: 'green' as const },
];

// Recent activity mock data
const recentActivity = [
    { timestamp: '03:08:20', action: 'Survey completed: Employee Satisfaction', status: 'completed' as const },
    { timestamp: '03:06:15', action: 'Controller tuned: Temperature PID', status: 'completed' as const },
    { timestamp: '03:03:26', action: 'Project created: E-commerce Platform', status: 'completed' as const },
    { timestamp: '02:58:13', action: 'Design uploaded: Villa Modern', status: 'pending' as const },
    { timestamp: '02:45:08', action: 'Survey started: Customer Feedback', status: 'completed' as const },
];

// Mock chart data
const barChartData = [30, 55, 40, 80, 65, 45, 70];
const lineChartData = [20, 35, 28, 45, 38, 52, 48, 55, 62, 58, 72, 68];

export default function AppSelectorDashboard() {
    const { user, isLoading, isAuthenticated, signOut } = useAuth();
    const landingUrl = getLandingUrl();
    const initial = user?.email?.charAt(0).toUpperCase() || 'U';

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
                <div className="mb-6 flex items-center gap-4 animate-fade-in">
                    <div className="w-14 h-14 bg-surface-900/50 rounded-2xl p-3 border border-white/10 backdrop-blur-md shadow-lg shadow-cyan-500/20">
                        <img src="/images/logo.svg" alt="Njaz" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(56,205,223,0.4)]" />
                    </div>
                    <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Njaz</h1>
                </div>
                <AuthForm />
                <a href={landingUrl} className="mt-6 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
                    ← Back to njaz.org
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

    return (
        <div className="min-h-screen hero-section futuristic-bg flex flex-col">
            {/* Fixed Header Bar */}
            <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-xl border-b border-cyan-500/20">
                {/* Left - Logo & Title */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <img src="/images/logo.svg" alt="Njaz" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(56,205,223,0.4)]" />
                        <div>
                            <span className="text-xl font-bold gradient-text tracking-wide">NJAZ</span>
                            <span className="hidden sm:inline text-xs text-cyan-400/60 ml-2 tracking-widest">COMMAND CENTER</span>
                        </div>
                    </div>
                </div>

                {/* Right - User Info */}
                <div className="flex items-center gap-4">
                    {/* User Avatar & Name */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border border-cyan-400/30 shadow-lg shadow-cyan-500/20">
                            {initial}
                        </div>
                        <div className="hidden md:block">
                            <div className="text-sm font-medium text-white">{user?.email?.split('@')[0]}</div>
                            <div className="text-xs text-slate-400">{user?.groups?.length || 0} groups</div>
                        </div>
                    </div>
                    {/* Disconnect Button */}
                    <button
                        onClick={() => signOut()}
                        className="px-4 py-2 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all tracking-wide"
                    >
                        DISCONNECT
                    </button>
                </div>
            </header>

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
                            <div className="grid grid-cols-4 gap-2">
                                {quickActions.map((action) => (
                                    <ActionButton
                                        key={action.id}
                                        icon={action.icon}
                                        label={action.label}
                                        color={action.color}
                                    />
                                ))}
                            </div>
                        </FuturisticPanel>

                        {/* Your Apps - Takes 2 columns */}
                        <FuturisticPanel title="Your Apps" glowColor="purple" className="lg:col-span-2">
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                {accessibleApps.map((app) => (
                                    <a
                                        key={app.id}
                                        href={app.href}
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

                    {/* Bottom Row - Activity */}
                    <div className="grid grid-cols-1 gap-6">
                        <FuturisticPanel title="Recent Activity" glowColor="cyan">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                                {recentActivity.map((activity, i) => (
                                    <ActivityItem
                                        key={i}
                                        timestamp={activity.timestamp}
                                        action={activity.action}
                                        status={activity.status}
                                    />
                                ))}
                            </div>
                        </FuturisticPanel>
                    </div>
                </div>
            </main>

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
