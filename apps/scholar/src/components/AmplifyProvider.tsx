'use client';

import { ReactNode, useEffect, useState } from 'react';
import { configureAmplifyAuth, clearAuthAndSignOut } from '@njaz/shared-auth';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

interface AmplifyProviderProps {
    children: ReactNode;
}

async function loadAmplifyConfig() {
    try {
        const outputs = await import('../../amplify_outputs.json');
        return outputs.default || outputs;
    } catch (e) {
        console.error('❌ Failed to load amplify_outputs.json:', e);
        console.error('Run npm run sync-amplify first');
        return null;
    }
}

async function verifyAuthSession(): Promise<void> {
    try {
        await getCurrentUser();
        const session = await fetchAuthSession();
        if (!session.tokens?.accessToken) {
            throw new Error('No active tokens in Cognito session');
        }
        console.log('✅ Auth session and tokens are valid');
    } catch (error: any) {
        const message = error?.message || '';
        // If there's any sign of credentials/tokens issues, clear stale tokens to avoid corrupt state
        console.warn('⚠️ Stale or invalid auth session found, clearing tokens:', message);
        await clearAuthAndSignOut();
    }
}

/**
 * Amplify Provider for Scholar
 * 
 * Configures Amplify with cookie-based storage for cross-domain SSO.
 * Identical to estebian's AmplifyProvider — shared auth pattern.
 */
export function AmplifyProvider({ children }: AmplifyProviderProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function configure() {
            const config = await loadAmplifyConfig();
            if (config) {
                configureAmplifyAuth(config);
                await verifyAuthSession();
            } else {
                console.error('❌ Failed to configure Amplify - config is null');
            }
            setIsReady(true);
        }
        configure();
    }, []);

    if (!isReady) {
        return null;
    }

    return <>{children}</>;
}
