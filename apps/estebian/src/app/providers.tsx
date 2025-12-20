'use client';

import { Amplify } from 'aws-amplify';
import { LanguageProvider } from '@/components/LanguageContext';
import amplifyConfig from '../../amplify_outputs.json';

// Configure Amplify
Amplify.configure(amplifyConfig as any, { ssr: true });

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            {children}
        </LanguageProvider>
    );
}
