'use client';

import Image from 'next/image';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SuiteNavigation } from '@njaz/ui-components';

// Platform apps data with accent colors and logo images
const apps = [
    {
        id: 'estebian',
        name: 'Estebian',
        nameAr: 'استبيان',
        description: 'Arabic-first survey platform for collecting meaningful insights from your audience.',
        descriptionAr: 'منصة استبيانات عربية أولاً لجمع رؤى مفيدة من جمهورك.',
        logo: '/images/survey.png',
        accent: 'cyan',
        href: '#',
    },
    {
        id: 'pid',
        name: 'PID Controller',
        nameAr: 'التحكم الصناعي',
        description: 'Industrial process control simulation with real-time monitoring and tuning.',
        descriptionAr: 'محاكاة التحكم في العمليات الصناعية مع المراقبة والضبط في الوقت الفعلي.',
        logo: '/images/process.png',
        accent: 'gold',
        href: '#',
    },
    {
        id: 'dev',
        name: 'Dev Platform',
        nameAr: 'منصة التطوير',
        description: 'Digital transformation solutions and modern web development services.',
        descriptionAr: 'حلول التحول الرقمي وخدمات تطوير الويب الحديثة.',
        logo: '/images/dev.png',
        accent: 'purple',
        href: '#',
    },
    {
        id: 'interior',
        name: 'Interior Design',
        nameAr: 'التصميم الداخلي',
        description: 'Design visualization and project management for interior designers.',
        descriptionAr: 'تصور التصميم وإدارة المشاريع للمصممين الداخليين.',
        logo: '/images/interior.png',
        accent: 'pink',
        href: '#',
    },
];

// Features data
const features = [
    {
        title: 'Unified Authentication',
        titleAr: 'مصادقة موحدة',
        description: 'Single sign-on across all platform applications with role-based access control.',
        descriptionAr: 'تسجيل دخول موحد عبر جميع تطبيقات المنصة مع التحكم في الوصول القائم على الأدوار.',
        icon: '🔐',
    },
    {
        title: 'Arabic First Design',
        titleAr: 'تصميم عربي أولاً',
        description: 'Built with RTL support and Arabic UX patterns from the ground up.',
        descriptionAr: 'مبني بدعم RTL وأنماط تجربة المستخدم العربية من الأساس.',
        icon: '🌍',
    },
    {
        title: 'Cloud Native',
        titleAr: 'سحابي بالكامل',
        description: 'Powered by AWS Amplify with real-time sync, offline support, and infinite scale.',
        descriptionAr: 'مدعوم من AWS Amplify مع المزامنة الفورية ودعم وضع عدم الاتصال والتوسع اللانهائي.',
        icon: '☁️',
    },
];

export default function LandingPage() {
    const { t, language, direction } = useLanguage();

    return (
        <main className="min-h-screen">
            {/* Navigation */}
            <nav className="nav-container">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <a href="/" className="flex items-center gap-3">
                        <Image
                            src="/images/logo.svg"
                            alt="Njaz"
                            width={40}
                            height={40}
                            className="w-10 h-10"
                        />
                        <span className="text-xl font-bold text-white">
                            {t('Njaz', 'إنجاز')}
                        </span>
                    </a>

                    {/* Nav Links - Desktop */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#apps" className="text-white/60 hover:text-white transition-colors font-medium">
                            {t('Our Suite', 'منتجاتنا')}
                        </a>
                        <a href="#features" className="text-white/60 hover:text-white transition-colors font-medium">
                            {t('Why Njaz?', 'لماذا إنجاز؟')}
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {/* Language Switcher */}
                        <LanguageSwitcher />

                        {/* Suite Navigation - Waffle Menu */}
                        <SuiteNavigation />

                        <a href="http://localhost:3001" className="btn-outline hidden sm:flex">
                            {t('Login', 'دخول')}
                        </a>
                        <a href="http://localhost:3001" className="bg-amber-500 hover:bg-amber-400 text-[#0a0f1a] text-sm font-semibold py-2 px-4 rounded-md transition-all">
                            {t('Register', 'تسجيل')}
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
                    <div className="max-w-5xl mx-auto text-center">
                        {/* Logo with glow */}
                        <div className="mb-10 animate-float">
                            <div className="inline-block animate-pulse-glow rounded-full p-4">
                                <Image
                                    src="/images/logo.svg"
                                    alt="Njaz Logo"
                                    width={140}
                                    height={140}
                                    className="w-28 h-28 md:w-36 md:h-36"
                                    priority
                                />
                            </div>
                        </div>

                        {/* Arabic Tagline */}
                        <p className="text-lg md:text-xl text-njaz-400 font-arabic mb-6 tracking-wide">
                            {t('Njaz - Integrated Engineering Platform', 'إنجاز - منصة الهندسة المتكاملة')}
                        </p>

                        {/* Main Headline */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
                            {language === 'ar' ? (
                                <>
                                    <span className="gradient-text">الهندسة</span>
                                    <span className="block mt-2">المُنجَزة.</span>
                                </>
                            ) : (
                                <>
                                    Engineering
                                    <span className="block gradient-text mt-2">Accomplished.</span>
                                </>
                            )}
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
                            {t(
                                'A unified platform for surveys, industrial control, web development, and design. Built for engineers who demand excellence.',
                                'منصة موحدة للاستبيانات والتحكم الصناعي وتطوير الويب والتصميم. مصممة للمهندسين الذين يطلبون التميز.'
                            )}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                            <a href="http://localhost:3001" className="btn-gold">
                                {t('Get Started Free', 'ابدأ مجاناً')}
                            </a>
                        </div>

                        {/* Secondary CTAs */}
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <a href="#apps" className="btn-cyan">
                                <span>⚙️</span>
                                {t('Explore PID Tuner', 'استكشف أداة PID')}
                            </a>
                            <a href="#apps" className="btn-purple">
                                <span>📊</span>
                                {t('Try Estebian Surveys', 'جرب استبيانات استبيان')}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="pb-10 text-center">
                    <a href="#apps" className="inline-flex flex-col items-center text-white/30 hover:text-white/50 transition-colors">
                        <span className="text-xs uppercase tracking-widest mb-2">{t('Scroll', 'تصفح')}</span>
                        <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </a>
                </div>
            </section>

            {/* Apps Section */}
            <section id="apps" className="section-dark py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                            {language === 'ar' ? (
                                <><span className="gradient-text">منتجاتنا</span></>
                            ) : (
                                <>Our <span className="gradient-text">Suite</span></>
                            )}
                        </h2>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto">
                            {t(
                                'A comprehensive toolkit designed for modern engineering workflows.',
                                'مجموعة أدوات شاملة مصممة لسير العمل الهندسي الحديث.'
                            )}
                        </p>
                    </div>

                    {/* Apps Grid - 2x2 on desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {apps.map((app) => (
                            <a
                                key={app.id}
                                href={app.href}
                                className={`glass-card glass-card-${app.accent} group`}
                            >
                                <div className={`flex items-start gap-5 ${direction === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    {/* Logo Image */}
                                    <div className="flex-shrink-0 w-32 h-32 rounded-2xl bg-white/5 flex items-center justify-center p-3 group-hover:scale-105 transition-transform overflow-hidden">
                                        <Image
                                            src={app.logo}
                                            alt={app.name}
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {language === 'ar' ? app.nameAr : app.name}
                                        </h3>
                                        <p className="text-sm text-njaz-400 font-arabic mb-3">
                                            {language === 'ar' ? app.name : app.nameAr}
                                        </p>
                                        <p className="text-white/50 leading-relaxed">
                                            {language === 'ar' ? app.descriptionAr : app.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Hover Arrow */}
                                <div className={`absolute bottom-6 ${direction === 'rtl' ? 'left-6' : 'right-6'} w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform ${direction === 'rtl' ? '-translate-x-2 group-hover:translate-x-0' : 'translate-x-2 group-hover:translate-x-0'}`}>
                                    <span className="text-white text-lg">{direction === 'rtl' ? '←' : '→'}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="section-darker py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                            {language === 'ar' ? (
                                <>لماذا <span className="gradient-text-gold">إنجاز</span>؟</>
                            ) : (
                                <>Why <span className="gradient-text-gold">Njaz</span>?</>
                            )}
                        </h2>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto">
                            {t(
                                'Enterprise-grade features with a modern developer experience.',
                                'ميزات على مستوى المؤسسات مع تجربة مطور حديثة.'
                            )}
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                        {features.map((feature, index) => (
                            <div key={index} className="text-center group">
                                <div className="feature-icon mx-auto group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">
                                    {language === 'ar' ? feature.titleAr : feature.title}
                                </h3>
                                <p className="text-white/50 leading-relaxed">
                                    {language === 'ar' ? feature.descriptionAr : feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section-dark py-24 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        {language === 'ar' ? (
                            <>هل أنت مستعد <span className="gradient-text">لتحويل</span> سير عملك؟</>
                        ) : (
                            <>Ready to <span className="gradient-text">transform</span> your workflow?</>
                        )}
                    </h2>
                    <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                        {t(
                            'Join engineers and designers who trust Njaz for their daily work.',
                            'انضم إلى المهندسين والمصممين الذين يثقون بإنجاز في عملهم اليومي.'
                        )}
                    </p>
                    <a href="http://localhost:3001" className="btn-gold text-lg">
                        {t('Create Free Account', 'أنشئ حساباً مجانياً')}
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="section-darker py-12 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${direction === 'rtl' ? 'md:flex-row-reverse' : ''}`}>
                        {/* Logo & Copyright */}
                        <div className={`flex items-center gap-4 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                            <Image
                                src="/images/logo.svg"
                                alt="Njaz"
                                width={36}
                                height={36}
                                className="w-9 h-9"
                            />
                            <div className={direction === 'rtl' ? 'text-right' : ''}>
                                <span className="font-bold text-white">{t('Njaz', 'إنجاز')}</span>
                                <p className="text-sm text-white/30">
                                    {t('© 2024 Njaz Engineering Platform', '© 2024 منصة إنجاز الهندسية')}
                                </p>
                            </div>
                        </div>

                        {/* Arabic Tagline */}
                        <p className="text-lg text-njaz-500 font-arabic">
                            {t('Njaz - Building the Future', 'إنجاز - نصنع المستقبل')}
                        </p>

                        {/* Links */}
                        <div className="flex items-center gap-6 text-sm text-white/40">
                            <a href="#" className="hover:text-white transition-colors">{t('Privacy', 'الخصوصية')}</a>
                            <a href="#" className="hover:text-white transition-colors">{t('Terms', 'الشروط')}</a>
                            <a href="#" className="hover:text-white transition-colors">{t('Contact', 'اتصل بنا')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}
