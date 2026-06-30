'use client';

import './globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from './providers';
import { useLanguage } from '@/components/LanguageContext';
import { useEffect } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { direction, language } = useLanguage();

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', direction);
            document.documentElement.setAttribute('lang', language);
        }
    }, [direction, language]);

    return <>{children}</>;
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <head>
                <title>Scholar | Njaz — Academic Writing Platform</title>
                <meta name="description" content="Block-based academic writing with AI co-authoring, literature survey, and sandboxed code execution." />
                <meta name="keywords" content="academic writing, research, literature review, block editor, AI writing, scholar, njaz" />
                <meta name="theme-color" content="#f59e0b" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </head>
            <body className="antialiased" suppressHydrationWarning>
                <Providers>
                    <LayoutContent>
                        {children}
                    </LayoutContent>
                </Providers>
            </body>
        </html>
    );
}
