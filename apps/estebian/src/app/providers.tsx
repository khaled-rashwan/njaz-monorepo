'use client';

import { LanguageProvider } from '@/components/LanguageContext';
import { AmplifyProvider } from '@/components/AmplifyProvider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AmplifyProvider>
            <LanguageProvider>
                {children}
            </LanguageProvider>
        </AmplifyProvider>
    );
}
