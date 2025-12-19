'use client';

import { useAuth } from '../components/AuthContext';
import { AuthForm } from '../components/AuthForm';
import { NJAZ_APPS } from '@njaz/ui-components';

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

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show auth form
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Njaz</h1>
                    <p className="text-slate-500">Engineering Platform</p>
                </div>

                <AuthForm />

                {/* Back to landing */}
                <a
                    href="http://localhost:3000"
                    className="mt-8 text-sm text-slate-500 hover:text-slate-400"
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
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="sidebar hidden lg:flex flex-col">
                {/* Logo */}
                <div className="mb-8">
                    <a href="/" className="flex items-center gap-3">
                        <span className="text-2xl font-bold gradient-text">Njaz</span>
                    </a>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    <a href="#" className="sidebar-link active">
                        <span>🏠</span>
                        <span>Dashboard</span>
                    </a>
                    <a href="#apps" className="sidebar-link">
                        <span>📱</span>
                        <span>Apps</span>
                    </a>
                    <a href="#activity" className="sidebar-link">
                        <span>📋</span>
                        <span>Activity</span>
                    </a>
                    <a href="#settings" className="sidebar-link">
                        <span>⚙️</span>
                        <span>Settings</span>
                    </a>
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* User Profile at bottom */}
                <div className="mt-auto pt-4">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold">
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
                            className="mt-3 w-full py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-10">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between mb-8">
                    <span className="text-2xl font-bold gradient-text">Njaz</span>
                    <button
                        onClick={() => signOut()}
                        className="px-3 py-1.5 text-sm text-slate-400 border border-slate-700 rounded-lg"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Welcome Section */}
                <div className="mb-10">
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                        Welcome back, <span className="gradient-text">{user?.email?.split('@')[0]}</span>
                    </h1>
                    <p className="text-slate-400">Access your engineering tools and manage your projects.</p>

                    {/* User Groups Badge */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {user?.groups.map((group) => (
                            <span
                                key={group}
                                className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300"
                            >
                                {group}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-3">
                        {quickActions.map((action) => (
                            <button
                                key={action.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
                            >
                                <span>{action.icon}</span>
                                <span className="text-sm font-medium">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Apps Grid */}
                <section id="apps" className="mb-12">
                    <h2 className="text-lg font-semibold text-white mb-6">Your Apps</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {accessibleApps.map((app) => (
                            <a
                                key={app.id}
                                href={app.href}
                                className="app-card group"
                            >
                                {/* Colored glow */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-3xl blur-xl"
                                    style={{ background: app.color }}
                                />

                                <div className="relative">
                                    {/* App Icon */}
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110 duration-300"
                                        style={{ backgroundColor: `${app.color}20` }}
                                    >
                                        {app.icon}
                                    </div>

                                    {/* App Info */}
                                    <h3 className="text-lg font-semibold text-white mb-1">
                                        {app.name}
                                    </h3>
                                    {app.nameAr && (
                                        <p className="text-sm text-slate-500 font-arabic mb-2">{app.nameAr}</p>
                                    )}
                                    <p className="text-sm text-slate-400">{app.description}</p>

                                    {/* Open indicator */}
                                    <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                        <span className="text-white text-sm">→</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>

                {/* Recent Activity */}
                <section id="activity">
                    <h2 className="text-lg font-semibold text-white mb-6">Recent Activity</h2>
                    <div className="space-y-3">
                        {recentActivity.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-lg">
                                    {activity.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white">
                                        <span className="font-medium">{activity.action}</span>{' '}
                                        <span className="text-slate-400">·</span>{' '}
                                        <span className="text-slate-300">{activity.item}</span>
                                    </p>
                                    <p className="text-xs text-slate-500">{activity.app} · {activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
