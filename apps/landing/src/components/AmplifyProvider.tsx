'use client';

import { ReactNode, useEffect, useState } from 'react';
import { configureAmplifyAuth } from '@njaz/shared-auth';

// Configure Amplify at module level
let configured = false;

interface AmplifyProviderProps {
    children: ReactNode;
}

// Get the path based on build environment
async function loadAmplifyConfig() {
    try {
        // The amplify_outputs.json is in the app root (copied from shared-backend)
        const outputs = await import('../../amplify_outputs.json');
        console.log('✅ ampliify_outputs.json loaded successfully');
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
 */
export function AmplifyProvider({ children }: AmplifyProviderProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function configure() {
            if (!configured) {
                console.log('🔧 Loading Amplify configuration...');
                const config = await loadAmplifyConfig();
                if (config) {
                    configureAmplifyAuth(config);
                    configured = true;
                } else {
                    console.error('❌ Failed to configure Amplify - config is null');
                }
            } else {
                console.log('ℹ️ Amplify already configured');
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
