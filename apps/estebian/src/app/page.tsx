'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';

interface User {
    username: string;
    email?: string;
}

export default function DashboardPage() {
    const { t, language, direction } = useLanguage();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const currentUser = await getCurrentUser();
            setUser({
                username: currentUser.username,
                email: currentUser.signInDetails?.loginId,
            });
        } catch {
            // Redirect to login if not authenticated
            window.location.href = 'https://dashboard.njaz.org';
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center futuristic-bg">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">{t('Loading...', 'جاري التحميل...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader
                currentApp="estebian"
                showLanguageSwitcher={true}
                LanguageSwitcher={LanguageSwitcher}
            />

            <main className="flex-1 pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Welcome Section */}
                    <div className="mb-8 animate-fade-in">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            {t('Welcome to Estebian', 'مرحباً في استبيان')}
                        </h1>
                        <p className="text-slate-400">
                            {t(
                                'Create surveys, manage scales, and analyze your research data.',
                                'أنشئ استبيانات، أدر المقاييس، وحلل بيانات بحثك.'
                            )}
                        </p>
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Scales Library */}
                        <Link href="/scales" className="group">
                            <FuturisticPanel glowColor="cyan" size="md">
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {t('Scale Library', 'مكتبة المقاييس')}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {t('Browse and create scales', 'تصفح وأنشئ مقاييس')}
                                    </p>
                                </div>
                            </FuturisticPanel>
                        </Link>

                        {/* My Surveys */}
                        <Link href="/surveys" className="group">
                            <FuturisticPanel glowColor="purple" size="md">
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {t('My Surveys', 'استبياناتي')}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {t('Manage your surveys', 'أدر استبياناتك')}
                                    </p>
                                </div>
                            </FuturisticPanel>
                        </Link>

                        {/* Create New Survey */}
                        <Link href="/surveys/new" className="group">
                            <FuturisticPanel glowColor="green" size="md">
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {t('New Survey', 'استبيان جديد')}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {t('Create a new survey', 'أنشئ استبيان جديد')}
                                    </p>
                                </div>
                            </FuturisticPanel>
                        </Link>

                        {/* Reports */}
                        <Link href="/reports" className="group">
                            <FuturisticPanel glowColor="gold" size="md">
                                <div className="text-center py-4">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {t('Reports', 'التقارير')}
                                    </h3>
                                    <p className="text-sm text-slate-400">
                                        {t('View analytics & reports', 'عرض التحليلات والتقارير')}
                                    </p>
                                </div>
                            </FuturisticPanel>
                        </Link>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <FuturisticPanel glowColor="cyan" size="sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-cyan-400">0</span>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t('Total Surveys', 'إجمالي الاستبيانات')}</p>
                                    <p className="text-white font-medium">{t('Active', 'نشط')}</p>
                                </div>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel glowColor="purple" size="sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-purple-400">0</span>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t('Total Responses', 'إجمالي الاستجابات')}</p>
                                    <p className="text-white font-medium">{t('This month', 'هذا الشهر')}</p>
                                </div>
                            </div>
                        </FuturisticPanel>

                        <FuturisticPanel glowColor="gold" size="sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-amber-400">0</span>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">{t('Reports Generated', 'التقارير المُنشأة')}</p>
                                    <p className="text-white font-medium">{t('Total', 'الإجمالي')}</p>
                                </div>
                            </div>
                        </FuturisticPanel>
                    </div>

                    {/* Recent Activity */}
                    <FuturisticPanel glowColor="cyan" size="md">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {t('Recent Activity', 'النشاط الأخير')}
                        </h2>
                        <div className="text-center py-8 text-slate-400">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p>{t('No recent activity', 'لا يوجد نشاط حديث')}</p>
                            <p className="text-sm mt-2">
                                {t('Create your first survey to get started!', 'أنشئ استبيانك الأول للبدء!')}
                            </p>
                        </div>
                    </FuturisticPanel>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
