'use client';

import { useAuth } from '../components/AuthContext';
import { AuthForm } from '../components/AuthForm';
import { NJAZ_APPS } from '@njaz/ui-components';
import { getLandingUrl } from '@njaz/shared-auth';

// Quick actions for the dashboard
const quickActions = [
    { id: 'new-survey', label: 'New Survey', icon: '📝', app: 'estebian' },
    { id: 'new-controller', label: 'New Controller', icon: '🔧', app: 'pid' },
    { id: 'new-project', label: 'New Project', icon: '📁', app: 'dev' },
    { id: 'upload-design', label: 'Upload Design', icon: '🎨', app: 'interior' },
];

// Recent activity mock data
const recentActivity = [
    { id: 1, action: 'Created survey', item: 'Employee Satisfaction Q4', app: 'Estebian', time: '2 hours ago', icon: '📊' },
    { id: 2, action: 'Updated controller', item: 'Temperature Control PID', app: 'PID', time: '5 hours ago', icon: '🔧' },
    { id: 3, action: 'Completed project', item: 'E-commerce Platform', app: 'Dev Hub', time: '1 day ago', icon: '💻' },
    { id: 4, action: 'Added photos', item: 'Villa Modern Design', app: 'Interior', time: '2 days ago', icon: '🏠' },
];

export default function AppSelectorDashboard() {
    const { user, isLoading, isAuthenticated, signOut } = useAuth();
    const landingUrl = getLandingUrl();

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-njaz-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400">Loading Njaz Platform...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show auth form
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 hero-section">
                {/* Compact Logo + Branding */}
                <div className="mb-6 flex items-center gap-4 animate-fade-in">
                    <div className="w-14 h-14 bg-surface-900/50 rounded-2xl p-3 border border-white/10 backdrop-blur-md shadow-lg shadow-njaz-500/20">
                        <img
                            src="/images/logo.svg"
                            alt="Njaz"
                            className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(56,205,223,0.4)]"
                        />
                    </div>
                    <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Njaz</h1>
                </div>

                <AuthForm />

                {/* Back to landing */}
                <a
                    href={landingUrl}
                    className="mt-6 text-sm text-slate-500 hover:text-njaz-400 transition-colors"
                >
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
        <div className="min-h-screen flex hero-section">
            {/* Sidebar */}
            <aside className="sidebar hidden lg:flex flex-col w-72 border-r border-white/5 bg-surface-900/60 backdrop-blur-xl p-6">
                {/* Logo */}
                <a href={landingUrl} className="mb-10 flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-surface-900/50 rounded-xl p-2 border border-white/10 group-hover:border-njaz-500/50 transition-all">
                        <img src="/images/logo.svg" alt="Njaz" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-2xl font-bold gradient-text">Njaz</span>
                </a>

                {/* Navigation */}
                <nav className="space-y-2">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-njaz-500/10 border border-njaz-500/20 text-njaz-400 font-medium">
                        <span>🏠</span>
                        <span>Dashboard</span>
                    </a>
                    <a href="#apps" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                        <span>📱</span>
                        <span>Apps</span>
                    </a>
                    <a href="#activity" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                        <span>📋</span>
                        <span>Activity</span>
                    </a>
                    <a href="#settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                        <span>⚙️</span>
                        <span>Settings</span>
                    </a>
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* User Profile at bottom */}
                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-njaz-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-njaz-500/20">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.email?.split('@')[0] || 'User'}
                                </p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="w-full py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-10 overflow-auto">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <img src="/images/logo.svg" alt="Njaz" className="w-8 h-8" />
                        <span className="text-2xl font-bold gradient-text">Njaz</span>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="px-3 py-1.5 text-sm text-slate-400 border border-white/10 rounded-lg bg-surface-900/50"
                    >
                        Sign Out
                    </button>
                </div>

                <div className="max-w-7xl mx-auto">
                    {/* Welcome Section */}
                    <div className="mb-12 animate-fade-in">
                        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                            Welcome back, <span className="gradient-text">{user?.email?.split('@')[0]}</span>
                        </h1>
                        <p className="text-slate-400 text-lg">Access your engineering tools and manage your projects.</p>

                        {/* User Groups Badge */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {user?.groups.map((group) => (
                                <span
                                    key={group}
                                    className="px-3 py-1 text-xs rounded-full bg-njaz-500/10 text-njaz-300 border border-njaz-500/20"
                                >
                                    {group}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <section className="mb-12">
                        <div className="flex flex-wrap gap-3">
                            {quickActions.map((action) => (
                                <button
                                    key={action.id}
                                    className="glass-card flex items-center gap-3 py-3 px-5 !p-3 !rounded-xl hover:!scale-105"
                                >
                                    <span className="text-xl">{action.icon}</span>
                                    <span className="text-sm font-medium text-slate-200">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Apps Grid */}
                    <section id="apps" className="mb-12">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-njaz-400">⚡</span> Your Apps
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {accessibleApps.map((app) => (
                                <a
                                    key={app.id}
                                    href={app.href}
                                    className="glass-card glass-card-cyan !p-6 group cursor-pointer"
                                >
                                    <div className="relative">
                                        {/* App Icon */}
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 shadow-lg"
                                            style={{ backgroundColor: `${app.color}15` }}
                                        >
                                            <div className="w-10 h-10 relative">
                                                <img
                                                    src={app.icon}
                                                    alt={app.name}
                                                    className="w-full h-full object-contain drop-shadow-md"
                                                />
                                            </div>
                                        </div>

                                        {/* App Info */}
                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-njaz-400 transition-colors">
                                            {app.name}
                                        </h3>
                                        {app.nameAr && (
                                            <p className="text-sm text-slate-500 font-arabic mb-3">{app.nameAr}</p>
                                        )}
                                        <p className="text-sm text-slate-400 leading-relaxed">{app.description}</p>

                                        {/* Open indicator */}
                                        <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-njaz-400">
                                            ↗
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>

                    {/* Recent Activity */}
                    <section id="activity">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="text-amber-400">🕒</span> Recent Activity
                        </h2>
                        <div className="glass-card !p-0 overflow-hidden">
                            {recentActivity.map((activity, index) => (
                                <div
                                    key={activity.id}
                                    className={`flex items-center gap-4 p-5 hover:bg-white/5 transition-colors ${index !== recentActivity.length - 1 ? 'border-b border-white/5' : ''
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center text-lg border border-white/5">
                                        {activity.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white">
                                            <span className="font-medium text-njaz-400">{activity.action}</span>{' '}
                                            <span className="text-slate-500 mx-1">·</span>{' '}
                                            <span className="text-slate-300">{activity.item}</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">{activity.app} · {activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
