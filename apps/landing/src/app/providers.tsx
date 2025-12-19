'use client';

import { LanguageProvider } from '@/components/LanguageContext';
import { AmplifyProvider } from '@/components/AmplifyProvider';
import { ReactNode } from 'react';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <AmplifyProvider>
            <LanguageProvider defaultLanguage="en">
                {children}
            </LanguageProvider>
        </AmplifyProvider>
    );
}
