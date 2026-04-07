'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { useLanguage } from '@/components/LanguageContext';
import { useEffect } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { direction, language } = useLanguage();

    // Update HTML dir attribute when language changes
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', direction);
            document.documentElement.setAttribute('lang', language);
        }
    }, [direction, language]);

    return children;
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl" suppressHydrationWarning>
            <head>
                <title>Dev | تطوير - حلول التسويق الرقمي والبرمجيات</title>
                <meta name="description" content="وكالة متكاملة للتسويق الرقمي وتطوير البرمجيات - تصميم الهوية البصرية والمواقع والحملات الإعلانية" />
                <meta name="keywords" content="تسويق رقمي, تصميم مواقع, هوية بصرية, حملات إعلانية, تطوير برمجيات, digital marketing, web development, branding" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
                <link rel="icon" href="/images/favicon.png" />
            </head>
            <body className="antialiased">
                <Providers>
                    <LayoutContent>
                        {children}
                    </LayoutContent>
                </Providers>
            </body>
        </html>
    );
}
