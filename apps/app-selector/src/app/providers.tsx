'use client';

import { AmplifyProvider } from '../components/AmplifyProvider';
import { AuthProvider } from '../components/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AmplifyProvider>
            <AuthProvider>{children}</AuthProvider>
        </AmplifyProvider>
    );
}
