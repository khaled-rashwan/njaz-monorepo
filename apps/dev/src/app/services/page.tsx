'use client';

import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import Link from 'next/link';

const SERVICES = [
    {
        icon: '🎨',
        titleEn: 'Logo Design',
        titleAr: 'تصميم الشعارات',
        descEn: 'Create a unique, memorable logo that captures your brand essence. We deliver multiple concepts, revisions, and a complete brand mark package.',
        descAr: 'تصميم شعار فريد ولا يُنسى يعكس جوهر علامتك التجارية. نقدم مفاهيم متعددة ومراجعات وحزمة علامة تجارية كاملة.',
        featuresEn: ['Custom vector logo', 'Multiple concepts', 'Unlimited revisions', 'All file formats'],
        featuresAr: ['شعار فيكتور مخصص', 'مفاهيم متعددة', 'مراجعات غير محدودة', 'جميع صيغ الملفات'],
        color: 'purple',
    },
    {
        icon: '🏷️',
        titleEn: 'Brand Identity',
        titleAr: 'الهوية البصرية',
        descEn: 'Comprehensive brand identity system including color palette, typography, imagery style, stationery design, and brand guidelines document.',
        descAr: 'نظام هوية بصرية شامل يتضمن لوحة الألوان والخطوط وأسلوب الصور وتصميم القرطاسية ودليل العلامة التجارية.',
        featuresEn: ['Brand guidelines', 'Color palette', 'Typography system', 'Stationery design'],
        featuresAr: ['دليل العلامة التجارية', 'لوحة الألوان', 'نظام الخطوط', 'تصميم القرطاسية'],
        color: 'pink',
    },
    {
        icon: '🌐',
        titleEn: 'Website Development',
        titleAr: 'تطوير المواقع',
        descEn: 'Modern, responsive websites built with the latest technologies. From landing pages to complex web applications with admin dashboards.',
        descAr: 'مواقع حديثة ومتجاوبة مبنية بأحدث التقنيات. من صفحات الهبوط إلى تطبيقات الويب المعقدة مع لوحات التحكم.',
        featuresEn: ['Responsive design', 'SEO optimized', 'CMS integration', 'Performance tuning'],
        featuresAr: ['تصميم متجاوب', 'محسن لمحركات البحث', 'دمج نظام إدارة المحتوى', 'تحسين الأداء'],
        color: 'cyan',
    },
    {
        icon: '📱',
        titleEn: 'Mobile App Development',
        titleAr: 'تطوير تطبيقات الموبايل',
        descEn: 'Native iOS and Android apps, or cross-platform solutions using React Native and Flutter. Full lifecycle from design to App Store launch.',
        descAr: 'تطبيقات iOS و Android أصلية أو حلول متعددة المنصات باستخدام React Native و Flutter. دورة حياة كاملة من التصميم حتى الإطلاق.',
        featuresEn: ['iOS & Android', 'Cross-platform', 'UI/UX design', 'App Store deployment'],
        featuresAr: ['iOS و Android', 'متعدد المنصات', 'تصميم UI/UX', 'نشر في متجر التطبيقات'],
        color: 'emerald',
    },
    {
        icon: '📢',
        titleEn: 'Social Media Campaigns',
        titleAr: 'حملات التواصل الاجتماعي',
        descEn: 'Strategic social media management and advertising campaigns. Content creation, audience targeting, and performance analytics included.',
        descAr: 'إدارة استراتيجية لوسائل التواصل الاجتماعي وحملات إعلانية. يشمل إنشاء المحتوى واستهداف الجمهور وتحليل الأداء.',
        featuresEn: ['Content strategy', 'Ad management', 'Audience targeting', 'Monthly reports'],
        featuresAr: ['استراتيجية المحتوى', 'إدارة الإعلانات', 'استهداف الجمهور', 'تقارير شهرية'],
        color: 'amber',
    },
    {
        icon: '🔍',
        titleEn: 'SEO & SEM',
        titleAr: 'تحسين محركات البحث',
        descEn: 'Boost your organic rankings and run targeted search engine ads. Technical SEO audits, keyword research, and Google Ads management.',
        descAr: 'تعزيز ترتيبك العضوي وتشغيل إعلانات محركات البحث المستهدفة. تدقيق SEO تقني وبحث الكلمات المفتاحية وإدارة Google Ads.',
        featuresEn: ['Technical audit', 'Keyword research', 'Google Ads', 'Analytics setup'],
        featuresAr: ['تدقيق تقني', 'بحث الكلمات المفتاحية', 'إعلانات جوجل', 'إعداد التحليلات'],
        color: 'sky',
    },
    {
        icon: '🎬',
        titleEn: 'Video & Motion Graphics',
        titleAr: 'الفيديو والموشن جرافيك',
        descEn: 'Engaging promotional videos, explainer animations, and motion graphics that tell your brand story in a captivating way.',
        descAr: 'فيديوهات ترويجية جذابة ورسوم متحركة توضيحية وموشن جرافيك تروي قصة علامتك التجارية بأسلوب آسر.',
        featuresEn: ['Explainer videos', 'Social media reels', 'Motion graphics', 'Brand storytelling'],
        featuresAr: ['فيديوهات توضيحية', 'ريلز السوشيال ميديا', 'موشن جرافيك', 'سرد قصصي للعلامة'],
        color: 'rose',
    },
    {
        icon: '☁️',
        titleEn: 'Cloud & DevOps',
        titleAr: 'السحابة و DevOps',
        descEn: 'Scalable cloud infrastructure on AWS, Azure, or GCP. CI/CD pipelines, containerization, monitoring, and 24/7 support.',
        descAr: 'بنية تحتية سحابية قابلة للتوسع على AWS و Azure و GCP. خطوط CI/CD والحاويات والمراقبة والدعم على مدار الساعة.',
        featuresEn: ['AWS / Azure / GCP', 'CI/CD pipelines', 'Docker & Kubernetes', '24/7 monitoring'],
        featuresAr: ['AWS / Azure / GCP', 'خطوط CI/CD', 'Docker و Kubernetes', 'مراقبة على مدار الساعة'],
        color: 'indigo',
    },
];

const GLOW_COLORS: Record<string, string> = {
    purple: 'border-purple-500/30 hover:border-purple-500/50',
    pink: 'border-pink-500/30 hover:border-pink-500/50',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/50',
    amber: 'border-amber-500/30 hover:border-amber-500/50',
    sky: 'border-sky-500/30 hover:border-sky-500/50',
    rose: 'border-rose-500/30 hover:border-rose-500/50',
    indigo: 'border-indigo-500/30 hover:border-indigo-500/50',
};

const BG_COLORS: Record<string, string> = {
    purple: 'from-purple-500/20 to-purple-600/5',
    pink: 'from-pink-500/20 to-pink-600/5',
    cyan: 'from-cyan-500/20 to-cyan-600/5',
    emerald: 'from-emerald-500/20 to-emerald-600/5',
    amber: 'from-amber-500/20 to-amber-600/5',
    sky: 'from-sky-500/20 to-sky-600/5',
    rose: 'from-rose-500/20 to-rose-600/5',
    indigo: 'from-indigo-500/20 to-indigo-600/5',
};

const CHECK_COLORS: Record<string, string> = {
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    sky: 'text-sky-400',
    rose: 'text-rose-400',
    indigo: 'text-indigo-400',
};

export default function ServicesPage() {
    const { t, language, direction } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-4">
                        <Link href="/" className="futuristic-btn inline-flex items-center gap-2 text-sm mb-4 !py-2 !px-3">
                            {direction === 'rtl' ? (
                                <>{t('Back', 'رجوع')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> {t('Back', 'رجوع')}</>
                            )}
                        </Link>
                    </div>

                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                            {t('Our Services', 'خدماتنا')}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t(
                                'Comprehensive digital solutions tailored to elevate your brand and grow your business.',
                                'حلول رقمية شاملة مصممة خصيصًا لرفع مستوى علامتك التجارية وتنمية أعمالك.'
                            )}
                        </p>
                    </div>

                    {/* Services Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {SERVICES.map((service, index) => (
                            <div
                                key={index}
                                className={`service-card futuristic-card p-8 rounded-xl ${GLOW_COLORS[service.color]} group`}
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${BG_COLORS[service.color]} flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        {service.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                            {t(service.titleEn, service.titleAr)}
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            {t(service.descEn, service.descAr)}
                                        </p>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="grid grid-cols-2 gap-2">
                                    {(language === 'ar' ? service.featuresAr : service.featuresEn).map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <svg className={`w-4 h-4 flex-shrink-0 ${CHECK_COLORS[service.color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-slate-300">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Process Section */}
                    <div className="mt-20">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">
                            {t('Our Process', 'آلية العمل')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { step: '01', titleEn: 'Discovery', titleAr: 'الاكتشاف', descEn: 'We learn about your business, goals, audience, and competitors.', descAr: 'نتعرف على عملك وأهدافك وجمهورك ومنافسيك.' },
                                { step: '02', titleEn: 'Strategy', titleAr: 'الاستراتيجية', descEn: 'We create a tailored plan with clear milestones and deliverables.', descAr: 'نضع خطة مخصصة بمعالم واضحة ومخرجات محددة.' },
                                { step: '03', titleEn: 'Execution', titleAr: 'التنفيذ', descEn: 'Our team brings the plan to life with precision and creativity.', descAr: 'فريقنا يحول الخطة إلى واقع بدقة وإبداع.' },
                                { step: '04', titleEn: 'Launch & Grow', titleAr: 'الإطلاق والنمو', descEn: 'We launch, measure results, and continuously optimize for growth.', descAr: 'نطلق ونقيس النتائج ونحسّن باستمرار للنمو.' },
                            ].map((phase, index) => (
                                <div key={index} className="relative futuristic-card p-6 rounded-xl text-center group hover:border-cyan-500/40 transition-all">
                                    <div className="text-4xl font-extrabold gradient-text mb-3">{phase.step}</div>
                                    <h3 className="text-white font-bold text-lg mb-2">{t(phase.titleEn, phase.titleAr)}</h3>
                                    <p className="text-slate-400 text-sm">{t(phase.descEn, phase.descAr)}</p>
                                    {/* Connector line (hidden on last item and mobile) */}
                                    {index < 3 && (
                                        <div className="hidden md:block absolute top-1/2 ltr:-right-3 rtl:-left-3 w-6 h-[2px] bg-gradient-to-r from-cyan-500/40 to-transparent" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-20 text-center">
                        <FuturisticPanel glowColor="cyan" size="lg">
                            <div className="py-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                    {t('Have a Project in Mind?', 'هل لديك مشروع في ذهنك؟')}
                                </h2>
                                <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                                    {t(
                                        'Tell us about your vision and we\'ll craft a custom solution that fits your budget and timeline.',
                                        'أخبرنا عن رؤيتك وسنصمم حلاً مخصصًا يناسب ميزانيتك وجدولك الزمني.'
                                    )}
                                </p>
                                <Link href="/contact" className="futuristic-btn-primary text-lg px-8 py-3">
                                    {t('Request a Quote', 'اطلب عرض سعر')}
                                </Link>
                            </div>
                        </FuturisticPanel>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
