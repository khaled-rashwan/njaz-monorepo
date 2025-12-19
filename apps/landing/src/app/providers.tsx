'use client';

import { LanguageProvider } from '@/components/LanguageContext';
import { ReactNode } from 'react';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <LanguageProvider defaultLanguage="en">
            {children}
        </LanguageProvider>
    );
}
