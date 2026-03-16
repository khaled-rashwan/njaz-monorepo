'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';

const SERVICES = [
    {
        icon: '🎨',
        titleEn: 'Brand Identity',
        titleAr: 'الهوية البصرية',
        descEn: 'Craft a compelling visual identity with logos, color palettes, typography, and brand guidelines that make your business stand out.',
        descAr: 'صياغة هوية بصرية مميزة تشمل الشعارات ولوحات الألوان والخطوط وإرشادات العلامة التجارية التي تجعل عملك متميزًا.',
        color: 'from-purple-500/20 to-purple-600/10',
        borderColor: 'border-purple-500/30',
        glowColor: 'hover:shadow-purple-500/20',
    },
    {
        icon: '🌐',
        titleEn: 'Web Development',
        titleAr: 'تطوير المواقع',
        descEn: 'Build modern, responsive websites and web applications with cutting-edge technology and pixel-perfect design.',
        descAr: 'بناء مواقع وتطبيقات ويب حديثة ومتجاوبة باستخدام أحدث التقنيات وتصميم دقيق.',
        color: 'from-cyan-500/20 to-cyan-600/10',
        borderColor: 'border-cyan-500/30',
        glowColor: 'hover:shadow-cyan-500/20',
    },
    {
        icon: '📱',
        titleEn: 'Mobile Apps',
        titleAr: 'تطبيقات الموبايل',
        descEn: 'Native and cross-platform mobile applications that deliver seamless experiences on iOS and Android.',
        descAr: 'تطبيقات موبايل أصلية ومتعددة المنصات توفر تجارب سلسة على iOS و Android.',
        color: 'from-emerald-500/20 to-emerald-600/10',
        borderColor: 'border-emerald-500/30',
        glowColor: 'hover:shadow-emerald-500/20',
    },
    {
        icon: '📢',
        titleEn: 'Digital Campaigns',
        titleAr: 'الحملات الرقمية',
        descEn: 'Strategic digital marketing campaigns across social media, search engines, and display networks that drive real results.',
        descAr: 'حملات تسويق رقمي استراتيجية عبر وسائل التواصل الاجتماعي ومحركات البحث وشبكات العرض تحقق نتائج حقيقية.',
        color: 'from-amber-500/20 to-amber-600/10',
        borderColor: 'border-amber-500/30',
        glowColor: 'hover:shadow-amber-500/20',
    },
    {
        icon: '🔍',
        titleEn: 'SEO & Analytics',
        titleAr: 'تحسين محركات البحث',
        descEn: 'Data-driven SEO strategies and comprehensive analytics to boost your online visibility and track performance.',
        descAr: 'استراتيجيات SEO مبنية على البيانات وتحليلات شاملة لتعزيز ظهورك الرقمي وتتبع الأداء.',
        color: 'from-pink-500/20 to-pink-600/10',
        borderColor: 'border-pink-500/30',
        glowColor: 'hover:shadow-pink-500/20',
    },
    {
        icon: '☁️',
        titleEn: 'Cloud Solutions',
        titleAr: 'الحلول السحابية',
        descEn: 'Scalable cloud infrastructure, DevOps automation, and software deployment solutions for enterprise needs.',
        descAr: 'بنية تحتية سحابية قابلة للتوسع وأتمتة DevOps وحلول نشر البرمجيات لاحتياجات المؤسسات.',
        color: 'from-sky-500/20 to-sky-600/10',
        borderColor: 'border-sky-500/30',
        glowColor: 'hover:shadow-sky-500/20',
    },
];

const STATS = [
    { valueEn: '150+', valueAr: '+١٥٠', labelEn: 'Projects Delivered', labelAr: 'مشروع منجز' },
    { valueEn: '80+', valueAr: '+٨٠', labelEn: 'Happy Clients', labelAr: 'عميل سعيد' },
    { valueEn: '12+', valueAr: '+١٢', labelEn: 'Years Experience', labelAr: 'سنة خبرة' },
    { valueEn: '25+', valueAr: '+٢٥', labelEn: 'Team Members', labelAr: 'عضو فريق' },
];

const TESTIMONIALS = [
    {
        nameEn: 'Ahmed Al-Rashid',
        nameAr: 'أحمد الرشيد',
        roleEn: 'CEO, TechVentures',
        roleAr: 'المدير التنفيذي، تيك فنتشرز',
        textEn: 'Dev transformed our brand completely. The new website and digital campaigns increased our leads by 300% in just three months.',
        textAr: 'حوّلت Dev علامتنا التجارية بالكامل. الموقع الجديد والحملات الرقمية زادت عملائنا المحتملين بنسبة 300% خلال ثلاثة أشهر فقط.',
    },
    {
        nameEn: 'Sara Al-Khatib',
        nameAr: 'سارة الخطيب',
        roleEn: 'Marketing Director, Bloom Co.',
        roleAr: 'مديرة التسويق، بلوم',
        textEn: 'Professional, creative, and always on time. They understood our vision and delivered beyond expectations.',
        textAr: 'محترفون ومبدعون ودائمًا في الموعد. فهموا رؤيتنا وقدموا ما يفوق التوقعات.',
    },
    {
        nameEn: 'Omar Hassan',
        nameAr: 'عمر حسن',
        roleEn: 'Founder, GreenLeaf',
        roleAr: 'مؤسس شركة جرين ليف',
        textEn: 'From logo design to launching our e-commerce site, Dev handled everything with excellence. Highly recommended!',
        textAr: 'من تصميم الشعار إلى إطلاق موقع التجارة الإلكترونية، تعاملت Dev مع كل شيء بتميز. أنصح بهم بشدة!',
    },
];

export default function HomePage() {
    const { t, language, direction } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1">
                {/* ===== Hero Section ===== */}
                <section className="relative pt-32 pb-20 px-4 md:px-8 overflow-hidden">
                    {/* Animated background elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl animate-float" />
                        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />
                    </div>

                    <div className="max-w-6xl mx-auto relative z-10">
                        <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-8">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                <span className="text-cyan-400 text-sm font-medium">
                                    {t('Digital Marketing & Software Solutions', 'حلول التسويق الرقمي والبرمجيات')}
                                </span>
                            </div>

                            {/* Headline */}
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
                                {t('We Build ', 'نبني ')}
                                <span className="gradient-text">
                                    {t('Brands', 'علامات تجارية')}
                                </span>
                                <br />
                                {t('That Stand Out', 'تترك أثرًا')}
                            </h1>

                            {/* Subtitle */}
                            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                                {t(
                                    'From stunning logos to high-performance websites and data-driven campaigns — we are your one-stop digital partner.',
                                    'من الشعارات المميزة إلى المواقع عالية الأداء والحملات المبنية على البيانات — نحن شريكك الرقمي الشامل.'
                                )}
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/contact" className="futuristic-btn-primary text-lg px-8 py-4 text-center">
                                    {t('Start Your Project', 'ابدأ مشروعك')}
                                </Link>
                                <Link href="/portfolio" className="futuristic-btn text-lg px-8 py-4 text-center">
                                    {t('View Our Work', 'شاهد أعمالنا')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== Services Section ===== */}
                <section className="py-20 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                {t('Our Services', 'خدماتنا')}
                            </h2>
                            <p className="text-slate-400 text-lg max-w-xl mx-auto">
                                {t(
                                    'End-to-end solutions to grow your digital presence and scale your business.',
                                    'حلول شاملة لتنمية حضورك الرقمي وتوسيع أعمالك.'
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {SERVICES.map((service, index) => (
                                <div
                                    key={index}
                                    className={`service-card futuristic-card p-6 rounded-xl ${service.borderColor} ${service.glowColor} hover:shadow-lg cursor-pointer group`}
                                >
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                                        {service.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                        {t(service.titleEn, service.titleAr)}
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {t(service.descEn, service.descAr)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-12">
                            <Link href="/services" className="futuristic-btn inline-flex items-center gap-2">
                                {t('Explore All Services', 'استكشف جميع الخدمات')}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'rtl' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ===== Stats Section ===== */}
                <section className="py-16 px-4 md:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {STATS.map((stat, index) => (
                                <div key={index} className="text-center p-6 rounded-xl border border-cyan-500/10 bg-cyan-500/5">
                                    <div className="text-3xl md:text-4xl font-extrabold gradient-text mb-2">
                                        {t(stat.valueEn, stat.valueAr)}
                                    </div>
                                    <div className="text-slate-400 text-sm font-medium">
                                        {t(stat.labelEn, stat.labelAr)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== Testimonials Section ===== */}
                <section className="py-20 px-4 md:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                {t('What Our Clients Say', 'ماذا يقول عملاؤنا')}
                            </h2>
                            <p className="text-slate-400 text-lg">
                                {t('Real stories from real partners.', 'قصص حقيقية من شركاء حقيقيين.')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {TESTIMONIALS.map((testimonial, index) => (
                                <div key={index} className="futuristic-card p-6 rounded-xl relative">
                                    {/* Quote icon */}
                                    <div className="text-cyan-500/20 text-5xl font-serif absolute top-4 ltr:right-4 rtl:left-4">"</div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-6 relative z-10">
                                        {t(testimonial.textEn, testimonial.textAr)}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {/* Avatar placeholder */}
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                            {t(testimonial.nameEn, testimonial.nameAr).charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-semibold">
                                                {t(testimonial.nameEn, testimonial.nameAr)}
                                            </div>
                                            <div className="text-slate-500 text-xs">
                                                {t(testimonial.roleEn, testimonial.roleAr)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== CTA Banner ===== */}
                <section className="py-20 px-4 md:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="relative rounded-2xl overflow-hidden">
                            {/* Background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-pink-600/20" />
                            <div className="absolute inset-0 backdrop-blur-sm" />

                            <div className="relative z-10 p-8 md:p-12 text-center border border-cyan-500/20 rounded-2xl">
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                    {t('Ready to Transform Your Brand?', 'مستعد لتحويل علامتك التجارية؟')}
                                </h2>
                                <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
                                    {t(
                                        'Let\'s discuss your project and create something extraordinary together.',
                                        'دعنا نناقش مشروعك ونبتكر شيئًا استثنائيًا معًا.'
                                    )}
                                </p>
                                <Link href="/contact" className="futuristic-btn-primary text-lg px-10 py-4">
                                    {t('Get in Touch', 'تواصل معنا')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
