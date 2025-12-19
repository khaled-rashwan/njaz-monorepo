'use client';

import { Amplify } from 'aws-amplify';
import { ReactNode, useEffect, useState } from 'react';

// Configure Amplify at module level
let configured = false;

interface AmplifyProviderProps {
    children: ReactNode;
}

// Get the path based on build environment
// In production, this will be bundled. In dev, we load dynamically.
async function loadAmplifyConfig() {
    // The amplify_outputs.json is in the app root (copied from shared-backend)
    // This dynamic import works with Next.js bundling
    try {
        // Try loading from the app's root (where sync-amplify copies it)
        const outputs = await import('../../amplify_outputs.json');
        return outputs.default || outputs;
    } catch (e) {
        console.error('Failed to load amplify_outputs.json - run npm run sync-amplify first');
        return null;
    }
}

/**
 * Amplify Provider for Next.js apps
 * 
 * Configures Amplify with the outputs from the shared backend.
 * This component should wrap your app's root layout.
 */
export function AmplifyProvider({ children }: AmplifyProviderProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        async function configure() {
            if (!configured) {
                const config = await loadAmplifyConfig();
                if (config) {
                    Amplify.configure(config);
                    configured = true;
                }
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
