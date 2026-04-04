'use client';

import React from 'react';
import { getLandingUrl, getDashboardUrl } from '@njaz/shared-auth';
import { SuiteNavigation } from '../SuiteNavigation';

interface HeaderProps {
    logoText?: string;
    showNav?: boolean;
    showActions?: boolean;
    currentApp?: string;
    userGroups?: string[];
}

export function Header({
    logoText = 'Njaz',
    showNav = true,
    showActions = true,
    currentApp,
    userGroups = [],
}: HeaderProps) {
    return (
        <header className="njaz-header">
            <a href={getLandingUrl()} className="njaz-header-logo">
                <span className="njaz-header-logo-text">{logoText}</span>
            </a>

            {showNav && (
                <nav className="njaz-header-nav">
                    <div className="njaz-header-nav-links">
                        <a href="#apps" className="njaz-header-nav-link">
                            Apps
                        </a>
                        <a href="#features" className="njaz-header-nav-link">
                            Features
                        </a>
                        <a href="#about" className="njaz-header-nav-link">
                            About
                        </a>
                    </div>
                </nav>
            )}

            <div className="njaz-header-actions">
                {showActions && (
                    <>
                        <a href={`${getDashboardUrl()}/login`} className="njaz-btn njaz-btn-ghost">
                            Sign In
                        </a>
                        <a href={`${getDashboardUrl()}/register`} className="njaz-btn njaz-btn-primary">
                            Get Started
                        </a>
                    </>
                )}
                <SuiteNavigation currentApp={currentApp} userGroups={userGroups} />
            </div>
        </header>
    );
}

export type { HeaderProps };
