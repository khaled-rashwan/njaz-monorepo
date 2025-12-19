'use client';

import React, { useState, useRef, useEffect } from 'react';

interface NjazApp {
    id: string;
    name: string;
    nameAr?: string;
    icon: string;
    href: string;
    color: string;
    description: string;
    requiredGroup?: string;
}

const NJAZ_APPS: NjazApp[] = [
    {
        id: 'estebian',
        name: 'Estebian',
        nameAr: 'استبيان',
        icon: '/images/survey.png',
        href: 'https://surveys.njaz.org',
        color: '#6366f1',
        description: 'Arabic Surveys',
        requiredGroup: 'estebian-access',
    },
    {
        id: 'pid',
        name: 'PID Controller',
        nameAr: 'التحكم الصناعي',
        icon: '/images/process.png',
        href: 'https://pid.njaz.org',
        color: '#10b981',
        description: 'Industrial Control',
        requiredGroup: 'pid-access',
    },
    {
        id: 'dev',
        name: 'Dev Hub',
        nameAr: 'منصة التطوير',
        icon: '/images/dev.png',
        href: 'https://dev.njaz.org',
        color: '#f59e0b',
        description: 'Digital Transformation',
        requiredGroup: 'devplatform-access',
    },
    {
        id: 'interior',
        name: 'Interior',
        nameAr: 'تصميم',
        icon: '/images/interior.png',
        href: 'https://interior.njaz.org',
        color: '#ec4899',
        description: 'Design Platform',
        requiredGroup: 'interior-access',
    },
    {
        id: 'admin',
        name: 'Admin',
        icon: '/images/logo.svg',
        href: 'https://admin.njaz.org',
        color: '#64748b',
        description: 'Platform Admin',
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

    // Filter apps based on user groups (if no groups provided, show all for landing page)
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
        <div className="suite-nav-container">
            {/* Waffle Menu Button */}
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="suite-nav-trigger"
                aria-label="Open app menu"
                aria-expanded={isOpen}
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white/70 hover:text-white transition-colors"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.5 4.5C4.5 3.67157 5.17157 3 6 3H18C18.8284 3 19.5 3.67157 19.5 4.5V19.5C19.5 20.3284 18.8284 21 18 21H6C5.17157 21 4.5 20.3284 4.5 19.5V4.5ZM9 7.5H15V9H9V7.5ZM9 12H15V13.5H9V12ZM9 16.5H15V18H9V16.5Z"
                        fill="currentColor"
                        fillOpacity="0.2"
                    />
                    <circle cx="5" cy="5" r="2" fill="currentColor" />
                    <circle cx="12" cy="5" r="2" fill="currentColor" />
                    <circle cx="19" cy="5" r="2" fill="currentColor" />
                    <circle cx="5" cy="12" r="2" fill="currentColor" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                    <circle cx="19" cy="12" r="2" fill="currentColor" />
                    <circle cx="5" cy="19" r="2" fill="currentColor" />
                    <circle cx="12" cy="19" r="2" fill="currentColor" />
                    <circle cx="19" cy="19" r="2" fill="currentColor" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div ref={menuRef} className="suite-nav-menu">
                    <div className="suite-nav-header">
                        <span className="suite-nav-title">Njaz Apps</span>
                    </div>
                    <div className="suite-nav-grid">
                        {visibleApps.map((app) => (
                            <button
                                key={app.id}
                                onClick={() => handleAppClick(app)}
                                className={`suite-nav-app ${currentApp === app.id ? 'active' : ''}`}
                                title={app.description}
                            >
                                <div
                                    className="p-4 rounded-2xl group-hover:scale-105 transition-transform duration-300 shadow-lg relative overflow-hidden"
                                    style={{ backgroundColor: `${app.color}15` }}
                                >
                                    <div className="relative w-16 h-16">
                                        <img
                                            src={app.icon}
                                            alt={app.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>

                            </button>
                        ))}
                    </div>
                    <div className="suite-nav-footer">
                        <a href="https://njaz.org" className="suite-nav-link">
                            More from Njaz →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

export { NJAZ_APPS };
export type { NjazApp, SuiteNavigationProps };
