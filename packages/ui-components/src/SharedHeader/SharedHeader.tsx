'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { SuiteNavigation, NJAZ_APPS } from '../SuiteNavigation/SuiteNavigation';

interface SharedHeaderProps {
    currentApp?: string;
    showLanguageSwitcher?: boolean;
    LanguageSwitcher?: React.ComponentType<{ className?: string }>;
}

interface User {
    username: string;
    email?: string;
}

/**
 * Get dashboard URL - uses environment variable first for SSR compatibility
 */
function getDashboardUrl() {
    if (process.env.NEXT_PUBLIC_DASHBOARD_URL) {
        return process.env.NEXT_PUBLIC_DASHBOARD_URL;
    }
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://dashboard.njaz.org';
        }
    }
    return 'http://localhost:3001';
}

/**
 * Shared Header Component - Futuristic Command Center Style
 * Supports RTL layout and displays current app logo in center
 */
export function SharedHeader({ currentApp, showLanguageSwitcher = false, LanguageSwitcher }: SharedHeaderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuthState();
    }, []);

    async function checkAuthState() {
        try {
            const currentUser = await getCurrentUser();
            setUser({
                username: currentUser.username,
                email: currentUser.signInDetails?.loginId,
            });
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            await signOut();
            setUser(null);
            setIsMenuOpen(false);
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    const dashboardUrl = getDashboardUrl();

    // Get current app info for center logo
    const currentAppInfo = currentApp ? NJAZ_APPS.find(app => app.id === currentApp) : null;

    return (
        <header className="fixed top-0 left-0 right-0 z-[100]">
            {/* Header Container - no clip-path so dropdowns are visible */}
            <div className="relative mx-4 mt-4">
                {/* Background Frame with beveled corners (visual only) */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(180deg, rgba(30, 40, 55, 0.95) 0%, rgba(20, 28, 40, 0.98) 100%)',
                        borderRadius: '8px',
                        border: '1px solid rgba(56, 205, 223, 0.2)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
                    }}
                />

                {/* Corner Accents (inside the background frame) */}
                <div className="absolute top-0 left-0 w-16 h-[2px] bg-gradient-to-r from-cyan-400/60 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-[2px] h-12 bg-gradient-to-b from-cyan-400/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-16 h-[2px] bg-gradient-to-l from-cyan-400/60 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[2px] h-12 bg-gradient-to-t from-cyan-400/60 to-transparent pointer-events-none" />

                {/* Content Layer - not clipped */}
                <div className="relative px-4 sm:px-6 py-3 flex items-center justify-between">
                    {/* Logo - Left Side (RTL: appears on right) */}
                    <a href="/" className="flex items-center gap-3 group">
                        <div
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-2 flex items-center justify-center flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, rgba(30, 40, 55, 0.9) 0%, rgba(15, 22, 35, 0.95) 100%)',
                                border: '2px solid rgba(56, 205, 223, 0.4)',
                                boxShadow: '0 0 15px rgba(56, 205, 223, 0.2), inset 0 0 10px rgba(56, 205, 223, 0.1)',
                            }}
                        >
                            <img
                                src="/images/logo.svg"
                                alt="Njaz"
                                className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,205,223,0.5)]"
                            />
                        </div>
                    </a>

                    {/* Center - Current App Logo & Name (if on an app page) */}
                    {currentAppInfo && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                            {currentAppInfo.id === 'estebian' ? (
                                <div className="flex items-center">
                                    {/* Custom Estebian Logo Presentation */}
                                    <div className="relative h-10 w-10 flex items-center justify-center">
                                        <img
                                            src="/images/estebian-e.png"
                                            alt="Estebian"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{
                                            backgroundColor: `${currentAppInfo.color}20`,
                                        }}
                                    >
                                        <img
                                            src={currentAppInfo.icon}
                                            alt={currentAppInfo.name}
                                            className="w-6 h-6 object-contain"
                                        />
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-white">
                                        {currentAppInfo.name}
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Right Side Controls (RTL: appears on left) */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Language Switcher - NOW VISIBLE ON MOBILE */}
                        {showLanguageSwitcher && LanguageSwitcher && (
                            <LanguageSwitcher className="flex" />
                        )}

                        {/* Suite Navigation */}
                        <SuiteNavigation currentApp={currentApp} />

                        {/* Auth Buttons / User Menu */}
                        {!isLoading && (
                            <>
                                {!user ? (
                                    /* Logged Out State */
                                    <a
                                        href={dashboardUrl}
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="hidden sm:inline">Sign In</span>
                                    </a>
                                ) : (
                                    /* Logged In State */
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                                            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(30, 40, 55, 0.8) 0%, rgba(20, 28, 40, 0.9) 100%)',
                                            }}
                                        >
                                            {/* User Avatar */}
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold text-xs">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            {/* Truncated Username */}
                                            <span className="hidden sm:block text-sm text-slate-300 max-w-24 truncate">
                                                {user.username.length > 8 ? user.username.slice(0, 8) + '...' : user.username}
                                            </span>
                                        </button>

                                        {/* Dropdown Menu - RTL-aware positioning */}
                                        {isMenuOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-[140]"
                                                    onClick={() => setIsMenuOpen(false)}
                                                />
                                                <div
                                                    className="absolute mt-2 w-56 rounded-lg shadow-2xl z-[150] overflow-hidden ltr:right-0 rtl:left-0"
                                                    style={{
                                                        background: 'linear-gradient(180deg, rgba(30, 40, 55, 0.98) 0%, rgba(15, 22, 35, 0.99) 100%)',
                                                        border: '1px solid rgba(56, 205, 223, 0.2)',
                                                    }}
                                                >
                                                    <div className="p-3 border-b border-cyan-500/10">
                                                        <p className="text-sm font-medium text-white">{user.username}</p>
                                                        {user.email && (
                                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                        )}
                                                    </div>
                                                    <div className="py-2">
                                                        <a
                                                            href={dashboardUrl}
                                                            className="block px-4 py-2 text-sm text-white/90 hover:bg-cyan-500/10 transition-colors"
                                                        >
                                                            Dashboard
                                                        </a>
                                                        <button
                                                            onClick={handleSignOut}
                                                            className="w-full text-start px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            Sign Out
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
