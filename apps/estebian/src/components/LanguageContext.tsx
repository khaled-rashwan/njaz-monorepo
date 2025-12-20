'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Language = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
    language: Language;
    direction: Direction;
    setLanguage: (lang: Language) => void;
    t: (en: string, ar: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    // Arabic as default language
    const [language, setLanguageState] = useState<Language>('ar');

    const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('estebian-language', lang);
        }
    }, []);

    // Initialize from localStorage
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('estebian-language') as Language | null;
            if (saved && (saved === 'ar' || saved === 'en')) {
                setLanguageState(saved);
            }
        }
    }, []);

    const t = useCallback((en: string, ar: string) => {
        return language === 'ar' ? ar : en;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, direction, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Language Switcher Component
export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`
                flex items-center justify-center min-w-[36px] h-9 px-2 rounded-lg 
                border border-cyan-500/20 hover:border-cyan-500/40 
                bg-gradient-to-br from-slate-800 to-slate-900
                text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 
                transition-all font-bold text-sm
                ${className}
            `}
            title={language === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
        >
            {language === 'ar' ? 'EN' : 'ع'}
        </button>
    );
}
