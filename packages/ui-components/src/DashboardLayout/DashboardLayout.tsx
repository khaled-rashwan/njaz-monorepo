'use client';

import { ReactNode } from 'react';
import { getLandingUrl } from '@njaz/shared-auth';

interface NavItem {
    id: string;
    label: string;
    icon: string;
    href: string;
    isActive?: boolean;
}

interface DashboardLayoutProps {
    children: ReactNode;
    user: {
        email?: string;
        username?: string;
        groups?: string[];
    } | null;
    onSignOut: () => void;
    navItems?: NavItem[];
    showMobileLogo?: boolean;
}

/**
 * Dashboard Layout Component
 * 
 * Reusable layout with sidebar navigation and user profile for authenticated apps.
 * Encapsulates the sidebar, topbar, and main content area.
 */
export function DashboardLayout({
    children,
    user,
    onSignOut,
    navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '#', isActive: true },
        { id: 'apps', label: 'Apps', icon: '📱', href: '#apps' },
        { id: 'activity', label: 'Activity', icon: '📋', href: '#activity' },
        { id: 'settings', label: 'Settings', icon: '⚙️', href: '#settings' },
    ],
    showMobileLogo = true,
}: DashboardLayoutProps) {
    const landingUrl = getLandingUrl();

    return (
        <div className="h-screen flex overflow-hidden hero-section">
            {/* Sidebar */}
            <aside className="sidebar hidden lg:flex flex-col flex-shrink-0 w-72 border-r border-white/5 bg-surface-900/60 backdrop-blur-xl p-6 overflow-y-auto">
                {/* Logo */}
                <a href={landingUrl} className="mb-10 flex items-center gap-3 group flex-shrink-0">
                    <div className="w-10 h-10 bg-surface-900/50 rounded-xl p-2 border border-white/10 group-hover:border-njaz-500/50 transition-all">
                        <img src="/images/logo.svg" alt="Njaz" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-2xl font-bold gradient-text">Njaz</span>
                </a>

                {/* Navigation */}
                <nav className="space-y-2 flex-shrink-0">
                    {navItems.map((item) => (
                        <a
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.isActive
                                    ? 'bg-njaz-500/10 border border-njaz-500/20 text-njaz-400 font-medium'
                                    : 'hover:bg-white/5 text-slate-400 hover:text-white'
                                }`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* User Profile at bottom */}
                {user && (
                    <div className="mt-auto pt-6 border-t border-white/5 flex-shrink-0">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-njaz-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-njaz-500/20">
                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={onSignOut}
                                className="w-full py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                {showMobileLogo && (
                    <div className="lg:hidden flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <img src="/images/logo.svg" alt="Njaz" className="w-8 h-8" />
                            <span className="text-2xl font-bold gradient-text">Njaz</span>
                        </div>
                        {user && (
                            <button
                                onClick={onSignOut}
                                className="px-3 py-1.5 text-sm text-slate-400 border border-white/10 rounded-lg bg-surface-900/50"
                            >
                                Sign Out
                            </button>
                        )}
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
