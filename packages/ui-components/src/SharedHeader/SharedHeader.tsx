'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { SuiteNavigation } from '../SuiteNavigation/SuiteNavigation';

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
    // Environment variable takes priority (works in SSR)
    if (process.env.NEXT_PUBLIC_DASHBOARD_URL) {
        return process.env.NEXT_PUBLIC_DASHBOARD_URL;
    }
    // Fallback: Check hostname on client
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.endsWith('.njaz.org') || hostname === 'njaz.org') {
            return 'https://dashboard.njaz.org';
        }
    }
    // Development default
    return 'http://localhost:3001';
}

/**
 * Shared Header Component
 * 
 * Adapts based on authentication state:
 * - Logged out: Shows "Sign In" and "Get Started" buttons
 * - Logged in: Shows user menu with avatar and dropdown
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
        } catch (error) {
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
            // Redirect to landing page
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    const dashboardUrl = getDashboardUrl();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/10">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <a href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-surface-900/50 rounded-xl p-2 border border-white/10 group-hover:border-njaz-500/50 transition-all">
                            <img
                                src="/images/logo.svg"
                                alt="Njaz"
                                className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,205,223,0.3)]"
                            />
                        </div>
                        <span className="text-xl font-bold gradient-text">Njaz</span>
                    </a>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {/* Language Switcher */}
                        {showLanguageSwitcher && LanguageSwitcher && (
                            <LanguageSwitcher className="hidden sm:flex" />
                        )}

                        {/* Suite Navigation */}
                        <SuiteNavigation currentApp={currentApp} />

                        {/* Auth Buttons / User Menu */}
                        {!isLoading && (
                            <>
                                {!user ? (
                                    /* Logged Out State */
                                    <div className="flex items-center gap-3">
                                        <a
                                            href={dashboardUrl}
                                            className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
                                        >
                                            Sign In
                                        </a>
                                        <a
                                            href={dashboardUrl}
                                            className="btn-gold text-sm px-5 py-2"
                                        >
                                            Get Started
                                        </a>
                                    </div>
                                ) : (
                                    /* Logged In State */
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-njaz-500/50 transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-njaz-400 to-njaz-600 flex items-center justify-center text-white font-semibold text-sm">
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="hidden sm:block text-sm text-white/90">{user.username}</span>
                                            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isMenuOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setIsMenuOpen(false)}
                                                />
                                                <div className="absolute right-0 mt-2 w-56 bg-surface-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                    <div className="p-3 border-b border-white/10">
                                                        <p className="text-sm font-medium text-white">{user.username}</p>
                                                        {user.email && (
                                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                        )}
                                                    </div>
                                                    <div className="py-2">
                                                        <a
                                                            href={dashboardUrl}
                                                            className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5 transition-colors"
                                                        >
                                                            Dashboard
                                                        </a>
                                                        <button
                                                            onClick={handleSignOut}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
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
