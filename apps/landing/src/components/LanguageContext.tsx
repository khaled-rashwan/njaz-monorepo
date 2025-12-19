'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
    language: Language;
    direction: Direction;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (en: string, ar: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    defaultLanguage?: Language;
}

export function LanguageProvider({ children, defaultLanguage = 'en' }: LanguageProviderProps) {
    const [language, setLanguageState] = useState<Language>(defaultLanguage);
    const [direction, setDirection] = useState<Direction>(defaultLanguage === 'ar' ? 'rtl' : 'ltr');

    useEffect(() => {
        // Check localStorage for saved preference
        const saved = localStorage.getItem('njaz-language') as Language | null;
        if (saved && (saved === 'en' || saved === 'ar')) {
            setLanguageState(saved);
            setDirection(saved === 'ar' ? 'rtl' : 'ltr');
        }
    }, []);

    useEffect(() => {
        // Update document direction and lang attribute
        document.documentElement.dir = direction;
        document.documentElement.lang = language;

        // Save to localStorage
        localStorage.setItem('njaz-language', language);
    }, [language, direction]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        setDirection(lang === 'ar' ? 'rtl' : 'ltr');
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'ar' : 'en');
    };

    // Simple translation helper
    const t = (en: string, ar: string): string => {
        return language === 'ar' ? ar : en;
    };

    return (
        <LanguageContext.Provider value={{ language, direction, setLanguage, toggleLanguage, t }}>
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

// Language switcher component
export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-medium ${className}`}
            aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
            <span className="text-white/70">{language === 'en' ? '🌍' : '🌐'}</span>
            <span className="text-white/90">
                {language === 'en' ? 'عربي' : 'EN'}
            </span>
        </button>
    );
}
