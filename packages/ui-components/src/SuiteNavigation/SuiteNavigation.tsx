'use client';

import React, { useState, useRef, useEffect } from 'react';

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
        id: 'estebian',
        name: 'Estebian',
        nameAr: 'استبيان',
        icon: '/images/estebian.png',
        href: 'https://estebian.njaz.org',
        color: '#6366f1',
        accentClass: 'cyan',
        description: 'Arabic-first survey platform for collecting meaningful insights from your audience.',
        descriptionAr: 'منصة استبيانات عربية أولاً لجمع رؤى مفيدة من جمهورك.',
        shortDescription: 'Arabic Surveys',
        requiredGroup: 'estebian-access',
    },
    {
        id: 'pid',
        name: 'PID Controller',
        nameAr: 'التحكم الصناعي',
        icon: '/images/process.png',
        href: 'https://pid.njaz.org',
        color: '#10b981',
        accentClass: 'gold',
        description: 'Industrial process control simulation with real-time monitoring and tuning.',
        descriptionAr: 'محاكاة التحكم في العمليات الصناعية مع المراقبة والضبط في الوقت الفعلي.',
        shortDescription: 'Industrial Control',
        requiredGroup: 'pid-access',
    },
    {
        id: 'dev',
        name: 'Dev Platform',
        nameAr: 'منصة التطوير',
        icon: '/images/dev.png',
        href: 'https://dev.njaz.org',
        color: '#f59e0b',
        accentClass: 'purple',
        description: 'Digital transformation solutions and modern web development services.',
        descriptionAr: 'حلول التحول الرقمي وخدمات تطوير الويب الحديثة.',
        shortDescription: 'Digital Transformation',
        requiredGroup: 'devplatform-access',
    },
    {
        id: 'interior',
        name: 'Interior Design',
        nameAr: 'التصميم الداخلي',
        icon: '/images/interior.png',
        href: 'https://interior.njaz.org',
        color: '#ec4899',
        accentClass: 'pink',
        description: 'Design visualization and project management for interior designers.',
        descriptionAr: 'تصور التصميم وإدارة المشاريع للمصممين الداخليين.',
        shortDescription: 'Design Platform',
        requiredGroup: 'interior-access',
    },
    {
        id: 'admin',
        name: 'Admin',
        nameAr: 'الإدارة',
        icon: '/images/logo.svg',
        href: 'https://admin.njaz.org',
        color: '#64748b',
        accentClass: 'slate',
        description: 'Platform administration and user management.',
        descriptionAr: 'إدارة المنصة وإدارة المستخدمين.',
        shortDescription: 'Platform Admin',
        requiredGroup: 'admins',
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
            ? NJAZ_APPS.filter((app) => app.id !== 'admin')
            : NJAZ_APPS.filter(
                (app) =>
                    !app.requiredGroup ||
                    userGroups.includes(app.requiredGroup) ||
                    userGroups.includes('admins')
            );

    const handleAppClick = (app: NjazApp) => {
        if (onNavigate) {
            onNavigate(app);
        } else {
            window.location.href = app.href;
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
                            background: 'linear-gradient(180deg, rgba(20, 28, 40, 0.98) 0%, rgba(10, 15, 26, 0.99) 100%)',
                            borderRadius: '12px',
                            border: '1px solid rgba(56, 205, 223, 0.2)',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 205, 223, 0.1)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-cyan-500/10">
                            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70">
                                Njaz Apps
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
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {visibleApps.map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => handleAppClick(app)}
                                    className={`
                                        flex flex-col items-center gap-2 p-3 rounded-xl 
                                        transition-all duration-200 
                                        hover:bg-cyan-500/10 hover:scale-105
                                        ${currentApp === app.id ? 'bg-cyan-500/20 border border-cyan-500/30' : 'border border-transparent'}
                                    `}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{
                                            backgroundColor: `${app.color}15`,
                                            boxShadow: `0 0 20px ${app.color}20`,
                                        }}
                                    >
                                        <img
                                            src={app.icon}
                                            alt={app.name}
                                            className="w-8 h-8 object-contain"
                                        />
                                    </div>
                                    <span className="text-xs text-slate-300 text-center">{app.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-cyan-500/10 text-center">
                            <a
                                href="https://njaz.org"
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                More from Njaz →
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
