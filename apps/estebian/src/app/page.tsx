'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import { getDashboardUrl, getCurrentUrl } from '@njaz/shared-auth';
import { getSurveys, getResponses, getReports } from '@/lib/storage';

interface User {
    username: string;
    email?: string;
}

export default function DashboardPage() {
    const { t, language, direction } = useLanguage();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ surveys: 0, responses: 0, reports: 0 });

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
            loadStats();
        } catch {
            setUser(null);
            setIsLoading(false);
        }
    }

    async function loadStats() {
        try {
            const surveys = await getSurveys();
            
            // Collect all response counts
            let totalResponses = 0;
            await Promise.all(surveys.map(async (s) => {
                const res = await getResponses(s.id);
                totalResponses += res.length;
            }));

            const reports = await getReports("");
            
            setStats({
                surveys: surveys.length,
                responses: totalResponses,
                reports: reports.length
            });
        } catch (error) {
            console.error("Error loading dashboard stats:", error);
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
                    {!user ? (
                        // Welcome page for unauthenticated users
                        <div className="space-y-16 py-8">
                            {/* Hero Section */}
                            <div className="text-center animate-fade-in">
                                <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    <span className="text-sm text-cyan-400">{t('Research Made Simple', 'البحث أصبح بسيطاً')}</span>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                                    <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        {t('Estebian', 'إستبيان')}
                                    </span>
                                </h1>
                                <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
                                    {t(
                                        'The Professional Survey Platform for Researchers',
                                        'المنصة الاحترافية للاستبيانات للباحثين'
                                    )}
                                </p>
                                <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                                    {t(
                                        'Create psychological scales, build comprehensive surveys, collect responses, and generate detailed analytical reports - all in one powerful platform.',
                                        'أنشئ مقاييس نفسية، وابنِ استبيانات شاملة، واجمع الاستجابات، وأنشئ تقارير تحليلية مفصلة - كل ذلك في منصة واحدة قوية.'
                                    )}
                                </p>
                                <a
                                    href={getDashboardUrl(getCurrentUrl())}
                                    className="futuristic-btn-primary inline-flex items-center gap-3 text-lg px-8 py-4"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    {t('Get Started Free', 'ابدأ مجاناً')}
                                </a>
                            </div>

                            {/* Workflow Steps */}
                            <div className="relative">
                                <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
                                    {t('How It Works', 'كيف يعمل')}
                                </h2>

                                {/* Steps Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                                    {/* Connecting Lines - Desktop */}
                                    <div className="hidden md:block absolute top-1/2 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-pink-500/50 -translate-y-1/2 z-0" />

                                    {/* Step 1: Create Scales */}
                                    <div className="relative z-10">
                                        <FuturisticPanel glowColor="cyan" size="md">
                                            <div className="text-center py-6">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/50">
                                                    1
                                                </div>
                                                <div className="w-16 h-16 mx-auto mb-4 mt-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {t('Create Scales', 'أنشئ المقاييس')}
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    {t(
                                                        'Build psychological scales with dimensions, statements, and custom response options',
                                                        'ابنِ مقاييس نفسية بأبعاد وعبارات وخيارات استجابة مخصصة'
                                                    )}
                                                </p>
                                            </div>
                                        </FuturisticPanel>
                                        {/* Arrow - Mobile */}
                                        <div className="md:hidden flex justify-center py-4">
                                            <svg className="w-8 h-8 text-cyan-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Step 2: Build Surveys */}
                                    <div className="relative z-10">
                                        <FuturisticPanel glowColor="purple" size="md">
                                            <div className="text-center py-6">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/50">
                                                    2
                                                </div>
                                                <div className="w-16 h-16 mx-auto mb-4 mt-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {t('Build Surveys', 'ابنِ الاستبيانات')}
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    {t(
                                                        'Combine scales, add demographics, and customize your survey instruments',
                                                        'ادمج المقاييس وأضف البيانات الديموغرافية وخصص أداة الاستبيان'
                                                    )}
                                                </p>
                                            </div>
                                        </FuturisticPanel>
                                        {/* Arrow - Mobile */}
                                        <div className="md:hidden flex justify-center py-4">
                                            <svg className="w-8 h-8 text-purple-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Step 3: Collect Responses */}
                                    <div className="relative z-10">
                                        <FuturisticPanel glowColor="green" size="md">
                                            <div className="text-center py-6">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/50">
                                                    3
                                                </div>
                                                <div className="w-16 h-16 mx-auto mb-4 mt-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {t('Collect Responses', 'اجمع الاستجابات')}
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    {t(
                                                        'Share your survey link and collect responses from participants worldwide',
                                                        'شارك رابط الاستبيان واجمع استجابات المشاركين من جميع أنحاء العالم'
                                                    )}
                                                </p>
                                            </div>
                                        </FuturisticPanel>
                                        {/* Arrow - Mobile */}
                                        <div className="md:hidden flex justify-center py-4">
                                            <svg className="w-8 h-8 text-emerald-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Step 4: Generate Reports */}
                                    <div className="relative z-10">
                                        <FuturisticPanel glowColor="gold" size="md">
                                            <div className="text-center py-6">
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-amber-500/50">
                                                    4
                                                </div>
                                                <div className="w-16 h-16 mx-auto mb-4 mt-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                                                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-2">
                                                    {t('Generate Reports', 'أنشئ التقارير')}
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    {t(
                                                        'Get detailed statistical analysis, reliability metrics, and exportable reports',
                                                        'احصل على تحليل إحصائي مفصل ومعاملات ثبات وتقارير قابلة للتصدير'
                                                    )}
                                                </p>
                                            </div>
                                        </FuturisticPanel>
                                    </div>
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
                                    {t('Powerful Features', 'ميزات قوية')}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('Arabic & English', 'عربي وإنجليزي')}</h3>
                                        <p className="text-sm text-slate-400">{t('Full RTL support with bilingual interface for seamless research', 'دعم كامل للاتجاه من اليمين لليسار مع واجهة ثنائية اللغة')}</p>
                                    </div>
                                    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('Statistical Analysis', 'التحليل الإحصائي')}</h3>
                                        <p className="text-sm text-slate-400">{t('Cronbach Alpha, descriptive statistics, and comprehensive reliability metrics', 'معامل ألفا كرونباخ والإحصاء الوصفي ومعاملات الثبات الشاملة')}</p>
                                    </div>
                                    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-colors">
                                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{t('Secure & Private', 'آمن وخاص')}</h3>
                                        <p className="text-sm text-slate-400">{t('Enterprise-grade security with AWS infrastructure for your research data', 'أمان على مستوى المؤسسات مع بنية AWS لبيانات بحثك')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Section */}
                            <div className="text-center">
                                <FuturisticPanel glowColor="cyan" size="lg">
                                    <div className="py-8 px-6">
                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                            {t('Ready to Transform Your Research?', 'جاهز لتحويل أبحاثك؟')}
                                        </h2>
                                        <p className="text-slate-400 max-w-xl mx-auto mb-6">
                                            {t(
                                                'Join researchers worldwide who trust Estebian for their survey research needs.',
                                                'انضم إلى الباحثين حول العالم الذين يثقون في إستبيان لاحتياجاتهم البحثية.'
                                            )}
                                        </p>
                                        <a
                                            href={getDashboardUrl(getCurrentUrl())}
                                            className="futuristic-btn-primary inline-flex items-center gap-3 text-lg px-8 py-4"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                            </svg>
                                            {t('Sign In to Get Started', 'سجل دخولك للبدء')}
                                        </a>
                                    </div>
                                </FuturisticPanel>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Welcome Section */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
                                <div>
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
                                <Link 
                                    href="/admin" 
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-white text-sm font-bold transition-all shadow-lg shadow-rose-500/5"
                                >
                                    ⚙️ {t('Admin Control Center', 'مركز تحكم الإدارة')}
                                </Link>
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <FuturisticPanel glowColor="cyan" size="sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-cyan-400">{stats.surveys}</span>
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
                                            <span className="text-2xl font-bold text-purple-400">{stats.responses}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400">{t('Total Responses', 'إجمالي الاستجابات')}</p>
                                            <p className="text-white font-medium">{t('All time', 'كل الوقت')}</p>
                                        </div>
                                    </div>
                                </FuturisticPanel>

                                <FuturisticPanel glowColor="gold" size="sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-amber-400">{stats.reports}</span>
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
                        </>
                    )}
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
