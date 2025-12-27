import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Njaz - Engineering Platform | إنجاز',
    description: 'A collaborative engineering platform featuring Arabic surveys, industrial control tools, digital transformation services, and interior design solutions.',
    keywords: ['engineering', 'platform', 'surveys', 'PID controller', 'digital transformation', 'interior design', 'Arabic', 'Kuwait'],
    authors: [{ name: 'Njaz Team' }],
    openGraph: {
        title: 'Njaz - Engineering Platform',
        description: 'Professional engineering tools and services under one unified platform.',
        url: 'https://njaz.org',
        siteName: 'Njaz',
        locale: 'en_US',
        type: 'website',
    },
    icons: {
        icon: '/images/favicon.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <body className="bg-gradient-animated noise-overlay">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
