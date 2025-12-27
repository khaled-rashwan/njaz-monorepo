'use client';

import { ReactNode, useEffect, useState } from 'react';
import { configureAmplifyAuth, clearAuthAndSignOut } from '@njaz/shared-auth';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

interface AmplifyProviderProps {
    children: ReactNode;
}

// Get the path based on build environment
async function loadAmplifyConfig() {
    try {
        // The amplify_outputs.json is in the app root (copied from shared-backend)
        const outputs = await import('../../amplify_outputs.json');
        return outputs.default || outputs;
    } catch (e) {
        console.error('❌ Failed to load amplify_outputs.json:', e);
        console.error('Run npm run sync-amplify first');
        return null;
    }
}

/**
 * Verify auth session and handle revoked tokens
 */
async function verifyAuthSession(): Promise<void> {
    try {
        // Try to get current user - this will use the stored tokens
        await getCurrentUser();
        console.log('✅ Auth session is valid');
    } catch (error: any) {
        const message = error?.message || '';
        // Check if token was revoked
        if (message.includes('revoked') || message.includes('NotAuthorizedException')) {
            console.warn('⚠️ Auth token revoked - clearing stale tokens');
            await clearAuthAndSignOut();
        } else if (message.includes('UserUnAuthenticatedException') || message.includes('not authenticated')) {
            // User is simply not logged in - this is fine
            console.log('ℹ️ User not authenticated');
        } else {
            console.log('ℹ️ Auth check:', message);
        }
    }
}

/**
 * Amplify Provider for Next.js apps
 * 
 * Configures Amplify with cookie-based storage for cross-domain SSO.
 * This component should wrap your app's root layout.
 * 
 * NOTE: We intentionally reconfigure Amplify on every page load to ensure
 * the cookie storage is properly initialized for cross-subdomain auth.
 */
export function AmplifyProvider({ children }: AmplifyProviderProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function configure() {
            console.log('🔧 Configuring Amplify...');
            const config = await loadAmplifyConfig();
            if (config) {
                configureAmplifyAuth(config);
                console.log('✅ Amplify configured successfully');

                // Verify auth session after configuration
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
