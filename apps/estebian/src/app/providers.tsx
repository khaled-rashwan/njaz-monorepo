'use client';

import { useEffect } from 'react';
import { LanguageProvider } from '@/components/LanguageContext';
import { configureAmplifyAuth } from '@njaz/shared-auth';
import amplifyConfig from '../../amplify_outputs.json';

export function Providers({ children }: { children: React.ReactNode }) {
    // Configure Amplify with cookie storage on client side
    useEffect(() => {
        configureAmplifyAuth(amplifyConfig);
    }, []);

    return (
        <LanguageProvider>
            {children}
        </LanguageProvider>
    );
}
