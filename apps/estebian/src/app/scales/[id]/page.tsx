'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { Scale } from '@/lib/types';
import { getScaleById } from '@/lib/storage';
import { NavigationAction } from '@/components/navigation';

export default function ScaleDetailPage() {
    const { id } = useParams() as { id: string };
    const { t, direction } = useLanguage();
    const router = useRouter();
    const [scale, setScale] = useState<Scale | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadScale();
        }
    }, [id]);

    async function loadScale() {
        try {
            const data = await getScaleById(id);
            if (data) {
                setScale(data);
            }
        } catch (error) {
            console.error('Error loading scale:', error);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading scale...', 'جاري تحميل المقياس...')}</p>
                </div>
            </div>
        );
    }

    if (!scale) {
        return (
            <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
                <SharedHeader currentApp="estebian" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />
                <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
                    <FuturisticPanel glowColor="gold" size="lg">
                        <div className="text-center py-12 px-6">
                            <h2 className="text-2xl font-bold text-white mb-3">{t('Scale Not Found', 'المقياس غير موجود')}</h2>
                            <p className="text-slate-400 mb-6">{t('The scale you are looking for does not exist or has been removed.', 'المقياس الذي تبحث عنه غير موجود أو تم حذفه.')}</p>
                            <NavigationAction href="/scales" label={t('Back to Library', 'العودة للمكتبة')} />
                        </div>
                    </FuturisticPanel>
                </main>
                <SharedFooter direction={direction} t={t} />
            </div>
        );
    }

    const isRtl = scale.language === 'ar';

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 md:pt-36 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <NavigationAction
                            href="/scales"
                            label={t('Back to Library', 'العودة للمكتبة')}
                            className="mb-4"
                        />
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2" dir={isRtl ? 'rtl' : 'ltr'}>
                                    {scale.title}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2 py-1 rounded ${scale.language === 'ar' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                        {scale.language === 'ar' ? 'العربية' : 'English'}
                                    </span>
                                    {scale.isPublic && (
                                        <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                                            {t('Public', 'عام')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {/* Description */}
                        {scale.description && (
                            <FuturisticPanel glowColor="cyan" size="md">
                                <h3 className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">
                                    {t('Description', 'الوصف')}
                                </h3>
                                <p className="text-lg text-slate-300 leading-relaxed" dir={isRtl ? 'rtl' : 'ltr'}>
                                    {scale.description}
                                </p>
                            </FuturisticPanel>
                        )}

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                                <p className="text-2xl font-bold text-cyan-400">{scale.dimensions.length}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">{t('Dimensions', 'أبعاد')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                                <p className="text-2xl font-bold text-purple-400">{scale.statements.length}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">{t('Statements', 'عبارات')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
                                <p className="text-2xl font-bold text-amber-400">{scale.options.length}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-tighter">{t('Answer Options', 'خيارات الإجابة')}</p>
                            </div>
                        </div>

                        {/* Statements */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </span>
                                {t('Scale Statements', 'عبارات المقياس')}
                            </h2>

                            <div className="space-y-3">
                                {scale.statements.map((statement, idx) => {
                                    const dimension = scale.dimensions.find(d => d.id === statement.dimensionId);
                                    return (
                                        <div key={statement.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-4">
                                            <span className="mt-1 w-6 h-6 rounded bg-slate-900 flex-shrink-0 flex items-center justify-center text-xs text-slate-500">
                                                {idx + 1}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-slate-200 mb-2" dir={isRtl ? 'rtl' : 'ltr'}>
                                                    {statement.text}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {dimension && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                            {dimension.name}
                                                        </span>
                                                    )}
                                                    {statement.isReversed && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                            {t('Reversed', 'عكسي')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Answer Options */}
                        <FuturisticPanel glowColor="green" size="md">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                {t('Answer Scale', 'مقياس الإجابة')}
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {scale.options.map(option => (
                                    <div key={option.id} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center min-w-[80px]">
                                        <span className="text-lg font-bold text-emerald-400">{option.value}</span>
                                        <span className="text-xs text-slate-400" dir={isRtl ? 'rtl' : 'ltr'}>{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        </FuturisticPanel>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
