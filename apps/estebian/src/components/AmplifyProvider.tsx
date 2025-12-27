'use client';

import { ReactNode, useEffect, useState } from 'react';
import { configureAmplifyAuth } from '@njaz/shared-auth';

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

