import { useState, useEffect } from 'react';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { SuiteNavigation, NJAZ_APPS } from '../SuiteNavigation/SuiteNavigation';
import { getDashboardUrl, getCurrentUrl, getAppUrl } from '@njaz/shared-auth';

interface SharedHeaderProps {
    currentApp?: string;
    showLanguageSwitcher?: boolean;
    LanguageSwitcher?: React.ComponentType<{ className?: string }>;
    // Allow external auth state for apps like Dashboard
    externalUser?: User | null;
    externalLogout?: () => Promise<void>;
    userAvatar?: string;
}

interface User {
    username: string;
    email?: string;
    isAdmin?: boolean;
}

/**
 * Shared Header Component - Futuristic Command Center Style
 * Supports RTL layout and displays current app logo in center
 */
export function SharedHeader({
    currentApp,
    showLanguageSwitcher = false,
    LanguageSwitcher,
    externalUser,
    externalLogout,
    userAvatar
}: SharedHeaderProps) {
    const [internalUser, setInternalUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Use external user if provided, otherwise internal
    const user = externalUser !== undefined ? externalUser : internalUser;

    useEffect(() => {
        if (externalUser === undefined) {
            checkAuthState();
        } else {
            setIsLoading(false);
        }
    }, [externalUser]);

    async function checkAuthState() {
        try {
            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();
            const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];
            const isAdmin = groups.includes('admins') || groups.includes('devplatform-access') || groups.includes('engineers');

            setInternalUser({
                username: currentUser.username,
                email: currentUser.signInDetails?.loginId,
                isAdmin: isAdmin,
            });
        } catch {
            setInternalUser(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            if (externalLogout) {
                await externalLogout();
            } else {
                await signOut();
                setInternalUser(null);
                window.location.href = '/';
            }
            setIsMenuOpen(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    // Get current URL for redirection
    const currentUrl = getCurrentUrl();
    const dashboardUrl = getDashboardUrl(currentUrl);

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
                        background: 'linear-gradient(180deg, rgba(235, 245, 255, 0.95) 0%, rgba(215, 225, 240, 0.98) 100%)',
                        borderRadius: '8px',
                        border: '1px solid rgba(56, 205, 223, 0.4)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
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
                        {currentAppInfo ? (
                            <div
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full p-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(30, 40, 55, 0.9) 0%, rgba(15, 22, 35, 0.95) 100%)',
                                    border: `2px solid ${currentAppInfo.color}60`,
                                    boxShadow: `0 0 15px ${currentAppInfo.color}30, inset 0 0 10px ${currentAppInfo.color}20`,
                                }}
                            >
                                <img
                                    src={currentAppInfo.icon}
                                    alt={currentAppInfo.name}
                                    className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,205,223,0.5)]"
                                />
                            </div>
                        ) : (
                            <div className="h-10 sm:h-12 flex items-center justify-center flex-shrink-0 transition-all duration-300">
                                <img
                                    src="/images/logo.png"
                                    alt="Njaz"
                                    className="h-full w-auto object-contain drop-shadow-[0_0_8px_rgba(56,205,223,0.3)] style-logo-blend"
                                />
                            </div>
                        )}
                    </a>



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
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(30, 40, 55, 0.8) 0%, rgba(20, 28, 40, 0.9) 100%)',
                                        }}
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
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-semibold text-xs overflow-hidden border border-cyan-400/30">
                                                {userAvatar ? (
                                                    <img src={userAvatar} alt={user.username} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.username.charAt(0).toUpperCase()
                                                )}
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
                                                        {user.isAdmin && (
                                                            <a
                                                                href={getAppUrl('dev') ? `${getAppUrl('dev')}/admin` : '/admin'}
                                                                className="block px-4 py-2 text-sm text-cyan-400 font-medium hover:bg-cyan-500/10 transition-colors"
                                                            >
                                                                Admin Panel
                                                            </a>
                                                        )}
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
