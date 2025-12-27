'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getAppUrl } from '@njaz/shared-auth';

interface NjazApp {
    id: string;
    name: string;
    nameAr: string;
    icon: string;
    href: string;
    color: string;
    accentClass: string;
    description: string;
    descriptionAr: string;
    shortDescription: string;
    requiredGroup?: string;
}

const NJAZ_APPS: NjazApp[] = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        nameAr: 'لوحة التحكم',
        icon: '/images/njaz-logo.svg',
        href: 'https://dashboard.njaz.org',
        color: '#38CDDF',
        accentClass: 'cyan',
        description: 'Command center to manage all your Njaz applications and activity.',
        descriptionAr: 'مركز القيادة لإدارة جميع تطبيقات إنجاز ونشاطاتك.',
        shortDescription: 'Command Center',
    },
    {
        id: 'estebian',
        name: 'Estebian',
        nameAr: 'استبيان',
        icon: '/images/estebian-logo.png',
        href: 'https://estebian.njaz.org',
        color: '#6366f1',
        accentClass: 'cyan',
        description: 'Arabic-first survey platform for collecting meaningful insights from your audience.',
        descriptionAr: 'منصة استبيانات عربية أولاً لجمع رؤى مفيدة من جمهورك.',
        shortDescription: 'Arabic Surveys',
        requiredGroup: 'estebian-access',
    },
    {
        id: 'dev',
        name: 'Dev',
        nameAr: 'تطوير',
        icon: '/images/dev-logo.png',
        href: 'https://dev.njaz.org',
        color: '#0ea5e9',
        accentClass: 'cyan',
        description: 'Developer workspace for building and managing projects.',
        descriptionAr: 'مساحة المطورين لبناء وإدارة المشاريع.',
        shortDescription: 'Developer Hub',
        requiredGroup: 'dev-access',
    },
    {
        id: 'process',
        name: 'Process',
        nameAr: 'عمليات',
        icon: '/images/process-logo.png',
        href: 'https://process.njaz.org',
        color: '#10b981',
        accentClass: 'cyan',
        description: 'Process management and automation tools.',
        descriptionAr: 'أدوات إدارة العمليات والأتمتة.',
        shortDescription: 'Process Automation',
        requiredGroup: 'process-access',
    },
];

interface SuiteNavigationProps {
    userGroups?: string[];
    currentApp?: string;
    onNavigate?: (app: NjazApp) => void;
}

export function SuiteNavigation({
    userGroups = [],
    currentApp,
    onNavigate,
}: SuiteNavigationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter apps based on user groups
    const visibleApps =
        userGroups.length === 0
            ? NJAZ_APPS.filter((app) => !['admin', 'dashboard'].includes(app.id))
            : NJAZ_APPS.filter(
                (app) =>
                    !app.requiredGroup ||
                    userGroups.includes(app.requiredGroup) ||
                    userGroups.includes('admins')
            );

    // Ensure Dashboard is always first if authenticated (userGroups.length > 0)
    // or just add it to the visible list if we want it there for everyone
    const dashboardApp = NJAZ_APPS.find(app => app.id === 'dashboard');
    if (dashboardApp && !visibleApps.find(app => app.id === 'dashboard')) {
        visibleApps.unshift(dashboardApp);
    }

    const handleAppClick = (app: NjazApp) => {
        if (onNavigate) {
            onNavigate(app);
        } else {
            // Use centralized URL helper
            const finalHref = getAppUrl(app.id) || app.href;
            window.location.href = finalHref;
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            {/* Futuristic Apps Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                style={{
                    background: 'linear-gradient(135deg, rgba(30, 40, 55, 0.8) 0%, rgba(20, 28, 40, 0.9) 100%)',
                }}
                aria-label="Open app menu"
                aria-expanded={isOpen}
            >
                {/* Grid Icon */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-cyan-400">
                    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="1" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span className="text-sm text-slate-300 hidden sm:inline">Apps</span>
            </button>

            {/* Dropdown Menu - Futuristic Style with RTL-aware positioning */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[140] md:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    <div
                        ref={menuRef}
                        className="fixed md:absolute inset-x-4 md:inset-x-auto top-20 md:top-full md:mt-2 z-[150] w-auto md:w-80 ltr:md:right-0 rtl:md:left-0"
                        style={{
                            background: 'linear-gradient(180deg, rgba(20, 40, 60, 0.98) 0%, rgba(10, 15, 26, 0.99) 100%)',
                            borderRadius: '12px',
                            border: '1px solid rgba(56, 205, 223, 0.2)',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 205, 223, 0.1)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-cyan-500/10">
                            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70">
                                Njaz Ecosystem
                            </span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="md:hidden text-slate-400 hover:text-white p-1"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Apps Grid */}
                        <div className="p-3 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {visibleApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={`
                                        flex flex-col items-start gap-2 p-3 rounded-xl 
                                        transition-all duration-200 
                                        hover:bg-cyan-500/10 group
                                        ${currentApp === app.id ? 'bg-cyan-500/20 border border-cyan-500/30' : 'border border-transparent hover:border-cyan-500/20'}
                                    `}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                        style={{
                                            backgroundColor: `${app.color}15`,
                                            boxShadow: `0 0 15px ${app.color}15`,
                                        }}
                                    >
                                        <img
                                            src={app.icon}
                                            alt={app.name}
                                            className="w-7 h-7 object-contain"
                                        />
                                    </div>
                                    <div className="text-start">
                                        <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors uppercase tracking-wider">{app.name}</div>
                                        <div className="text-[10px] text-slate-500 line-clamp-1">{app.shortDescription}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer - Unified Command Hub link */}
                        <div className="p-3 border-t border-cyan-500/10">
                            <a
                                href={getAppUrl('landing') || 'https://njaz.org'}
                                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cyan-500/5 text-xs text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all border border-cyan-500/10"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                Return to njaz.org
                            </a>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export { NJAZ_APPS };
export type { NjazApp, SuiteNavigationProps };
