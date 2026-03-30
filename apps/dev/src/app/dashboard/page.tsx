'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * /dashboard — Smart redirect:
 *   - Admins/Devs → /admin (full management console)
 *   - Regular users → app-selector (where MyProjectsPanel lives)
 *   - Not authenticated → show login prompt
 */
export default function DashboardPage() {
    const { t, direction } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        async function checkAndRedirect() {
            try {
                await getCurrentUser();
                const session = await fetchAuthSession();
                const groups = (session.tokens?.accessToken?.payload['cognito:groups'] as string[]) || [];

                if (groups.includes('admins') || groups.includes('devplatform-access') || groups.includes('engineers')) {
                    router.replace('/admin');
                } else {
                    // Regular users: redirect to the centralized dashboard (app-selector)
                    // which now has the "My Projects" panel
                    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
                    const dashboardUrl = isLocal ? 'http://localhost:3001' : 'https://dashboard.njaz.org';
                    window.location.href = dashboardUrl;
                }
            } catch {
                // Not authenticated
            }
        }
        checkAndRedirect();
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
            <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Redirecting...', 'جاري التحويل...')}</p>
                </div>
            </main>
            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
