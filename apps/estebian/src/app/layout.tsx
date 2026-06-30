'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { useLanguage } from '@/components/LanguageContext';
import { useEffect } from 'react';

import { SubNavbar } from '@/components/navigation';

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { direction, language } = useLanguage();

    // Update HTML dir attribute when language changes
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('dir', direction);
            document.documentElement.setAttribute('lang', language);
        }
    }, [direction, language]);

    // Register Service Worker for PWA
    useEffect(() => {
        if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
                    .catch((err) => console.warn('Service Worker registration failed:', err));
            });
        }
    }, []);

    return (
        <>
            <SubNavbar />
            {children}
        </>
    );
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl" suppressHydrationWarning>
            <head>
                <title>استبيان | Estebian - منصة الاستبيانات والمقاييس</title>
                <meta name="description" content="منصة عربية متكاملة لإنشاء الاستبيانات والمقاييس النفسية وجمع البيانات وتحليلها" />
                <meta name="keywords" content="استبيان, مقاييس, بحث علمي, تحليل بيانات, survey, scales, research" />
                <meta name="theme-color" content="#7C5DFA" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
                <link rel="icon" href="/images/favicon.png" />
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

