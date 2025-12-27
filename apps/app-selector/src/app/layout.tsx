import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'Njaz Apps | Dashboard',
    description: 'Access all your Njaz applications from one central dashboard.',
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
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
