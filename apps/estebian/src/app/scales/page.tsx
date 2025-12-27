'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Scale } from '@/lib/types';
import { getPublicScales, getScales } from '@/lib/storage';

export default function ScalesPage() {
    const { t, language, direction } = useLanguage();
    const [scales, setScales] = useState<Scale[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [filterLang, setFilterLang] = useState<'all' | 'ar' | 'en'>('all');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const user = await getCurrentUser();
            setUserId(user.username);

            // Get all scales (public + user's private)
            const allScales = getScales();
            const visibleScales = allScales.filter(
                s => s.isPublic || s.createdBy === user.username
            );
            setScales(visibleScales);
        } catch {
            // Not logged in - show only public
            setScales(getPublicScales());
        } finally {
            setIsLoading(false);
        }
    }

    const filteredScales = scales.filter(scale => {
        // Language filter
        if (filterLang !== 'all' && scale.language !== filterLang) {
            return false;
        }
        // Search filter
        const query = searchQuery.toLowerCase();
        return (
            scale.title.toLowerCase().includes(query) ||
            scale.description.toLowerCase().includes(query)
        );
    });

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                        <div>
                            <Link
                                href="/"
                                className="futuristic-btn inline-flex items-center gap-2 text-sm mb-3"
                            >
                                {direction === 'rtl' ? (
                                    <>
                                        {t('Back to Home', 'العودة للرئيسية')}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        {t('Back to Home', 'العودة للرئيسية')}
                                    </>
                                )}
                            </Link>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {t('Scale Library', 'مكتبة المقاييس')}
                            </h1>
                            <p className="text-slate-400">
                                {t(
                                    'Browse validated psychometric scales or create your own',
                                    'تصفح المقاييس النفسية المعتمدة أو أنشئ مقياسك الخاص'
                                )}
                            </p>
                        </div>
                        <Link
                            href="/scales/new"
                            className="group relative px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-3 justify-center
                                       bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-500
                                       text-slate-900 shadow-lg shadow-cyan-500/30
                                       hover:shadow-xl hover:shadow-cyan-500/50 hover:scale-105
                                       transition-all duration-300 overflow-hidden"
                        >
                            {/* Animated Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                           translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="relative z-10">{t('Create New Scale', 'إنشاء مقياس جديد')}</span>
                        </Link>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder={t('Search scales...', 'البحث في المقاييس...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="futuristic-input pr-10 w-full"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterLang('all')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${filterLang === 'all'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : 'text-slate-400 border border-slate-600 hover:border-slate-500'
                                    }`}
                            >
                                {t('All', 'الكل')}
                            </button>
                            <button
                                onClick={() => setFilterLang('ar')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${filterLang === 'ar'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : 'text-slate-400 border border-slate-600 hover:border-slate-500'
                                    }`}
                            >
                                العربية
                            </button>
                            <button
                                onClick={() => setFilterLang('en')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${filterLang === 'en'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                    : 'text-slate-400 border border-slate-600 hover:border-slate-500'
                                    }`}
                            >
                                English
                            </button>
                        </div>
                    </div>

                    {/* Scales Grid */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">{t('Loading scales...', 'جاري تحميل المقاييس...')}</p>
                        </div>
                    ) : filteredScales.length === 0 ? (
                        <FuturisticPanel glowColor="cyan" size="lg">
                            <div className="text-center py-12">
                                <svg className="w-20 h-20 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {searchQuery || filterLang !== 'all'
                                        ? t('No scales found', 'لم يتم العثور على مقاييس')
                                        : t('No scales yet', 'لا توجد مقاييس بعد')
                                    }
                                </h3>
                                <p className="text-slate-400 mb-6">
                                    {searchQuery
                                        ? t('Try a different search term', 'جرب مصطلح بحث مختلف')
                                        : t('Be the first to create a scale!', 'كن أول من ينشئ مقياساً!')
                                    }
                                </p>
                                {!searchQuery && filterLang === 'all' && (
                                    <Link
                                        href="/scales/new"
                                        className="futuristic-btn-primary inline-flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        {t('Create First Scale', 'إنشاء أول مقياس')}
                                    </Link>
                                )}
                            </div>
                        </FuturisticPanel>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredScales.map(scale => (
                                <Link key={scale.id} href={`/scales/${scale.id}`} className="group">
                                    <FuturisticPanel
                                        glowColor={scale.createdBy === userId ? 'purple' : 'cyan'}
                                        size="md"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Language badge */}
                                                <span className={`text-xs px-2 py-1 rounded ${scale.language === 'ar'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-orange-500/20 text-orange-400'
                                                    }`}>
                                                    {scale.language === 'ar' ? 'عربي' : 'EN'}
                                                </span>
                                                {scale.createdBy === userId && (
                                                    <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                                                        {t('Mine', 'خاص')}
                                                    </span>
                                                )}
                                                {scale.isPublic && (
                                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                                        {t('Public', 'عام')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1" dir={scale.language === 'ar' ? 'rtl' : 'ltr'}>
                                            {scale.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 line-clamp-2 mb-4" dir={scale.language === 'ar' ? 'rtl' : 'ltr'}>
                                            {scale.description || t('No description', 'بدون وصف')}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>
                                                {scale.dimensions.length} {t('dimensions', 'أبعاد')}
                                            </span>
                                            <span>
                                                {scale.dimensions.reduce((sum, d) => sum + d.statements.length, 0)} {t('statements', 'عبارات')}
                                            </span>
                                        </div>
                                    </FuturisticPanel>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
