'use client';

import { useState } from 'react';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import Link from 'next/link';

const CATEGORIES = [
    { id: 'all', labelEn: 'All', labelAr: 'الكل' },
    { id: 'branding', labelEn: 'Branding', labelAr: 'العلامة التجارية' },
    { id: 'web', labelEn: 'Web', labelAr: 'الويب' },
    { id: 'mobile', labelEn: 'Mobile', labelAr: 'الموبايل' },
    { id: 'campaign', labelEn: 'Campaigns', labelAr: 'الحملات' },
];

const PROJECTS = [
    {
        id: 1,
        titleEn: 'Aura Finance Rebrand',
        titleAr: 'إعادة تصميم هوية Aura Finance',
        descEn: 'Complete brand identity overhaul for a fintech startup including logo, visual system, and marketing collateral.',
        descAr: 'إعادة تصميم شاملة للهوية البصرية لشركة تكنولوجيا مالية ناشئة تشمل الشعار والنظام البصري والمواد التسويقية.',
        category: 'branding',
        tags: ['Logo', 'Brand Identity', 'Print'],
        tagsAr: ['شعار', 'هوية بصرية', 'مطبوعات'],
        gradient: 'from-purple-600/40 to-indigo-600/40',
        accentColor: 'purple',
    },
    {
        id: 2,
        titleEn: 'GreenLeaf E-Commerce',
        titleAr: 'متجر GreenLeaf الإلكتروني',
        descEn: 'Full-stack e-commerce platform with product management, payment integration, and real-time inventory tracking.',
        descAr: 'منصة تجارة إلكترونية متكاملة مع إدارة المنتجات ودمج الدفع وتتبع المخزون في الوقت الفعلي.',
        category: 'web',
        tags: ['Next.js', 'Stripe', 'E-Commerce'],
        tagsAr: ['Next.js', 'Stripe', 'تجارة إلكترونية'],
        gradient: 'from-emerald-600/40 to-teal-600/40',
        accentColor: 'emerald',
    },
    {
        id: 3,
        titleEn: 'FitTrack Mobile App',
        titleAr: 'تطبيق FitTrack للموبايل',
        descEn: 'Cross-platform fitness tracking app with workout plans, nutrition logging, and social features built with React Native.',
        descAr: 'تطبيق تتبع لياقة بدنية متعدد المنصات مع خطط تمرين وتسجيل التغذية وميزات اجتماعية مبني بـ React Native.',
        category: 'mobile',
        tags: ['React Native', 'iOS', 'Android'],
        tagsAr: ['React Native', 'iOS', 'Android'],
        gradient: 'from-cyan-600/40 to-sky-600/40',
        accentColor: 'cyan',
    },
    {
        id: 4,
        titleEn: 'Bloom Cosmetics Campaign',
        titleAr: 'حملة Bloom للمكياج',
        descEn: 'Multi-channel digital marketing campaign spanning Instagram, TikTok, and Google Ads with 4x ROAS within 60 days.',
        descAr: 'حملة تسويق رقمي متعددة القنوات عبر Instagram و TikTok و Google Ads بعائد 4 أضعاف خلال 60 يومًا.',
        category: 'campaign',
        tags: ['Social Media', 'Google Ads', 'Content'],
        tagsAr: ['سوشيال ميديا', 'إعلانات جوجل', 'محتوى'],
        gradient: 'from-pink-600/40 to-rose-600/40',
        accentColor: 'pink',
    },
    {
        id: 5,
        titleEn: 'TechVentures Corporate Site',
        titleAr: 'موقع TechVentures الرسمي',
        descEn: 'Modern corporate website with dynamic blog, team pages, investor relations portal, and multi-language support.',
        descAr: 'موقع مؤسسي حديث مع مدونة ديناميكية وصفحات الفريق وبوابة علاقات المستثمرين ودعم متعدد اللغات.',
        category: 'web',
        tags: ['Next.js', 'CMS', 'Corporate'],
        tagsAr: ['Next.js', 'نظام إدارة محتوى', 'مؤسسي'],
        gradient: 'from-amber-600/40 to-orange-600/40',
        accentColor: 'amber',
    },
    {
        id: 6,
        titleEn: 'NovaCraft Brand Launch',
        titleAr: 'إطلاق هوية NovaCraft',
        descEn: 'End-to-end branding for an artisan craft marketplace — from naming and logo to packaging and social templates.',
        descAr: 'علامة تجارية متكاملة لسوق حرف يدوية — من التسمية والشعار إلى التغليف وقوالب السوشيال ميديا.',
        category: 'branding',
        tags: ['Naming', 'Logo', 'Packaging'],
        tagsAr: ['تسمية', 'شعار', 'تغليف'],
        gradient: 'from-violet-600/40 to-fuchsia-600/40',
        accentColor: 'violet',
    },
    {
        id: 7,
        titleEn: 'QuickBite Delivery App',
        titleAr: 'تطبيق QuickBite للتوصيل',
        descEn: 'Food delivery mobile app with real-time GPS tracking, in-app payments, and a restaurant management dashboard.',
        descAr: 'تطبيق توصيل طعام مع تتبع GPS في الوقت الفعلي ودفع داخل التطبيق ولوحة تحكم لإدارة المطاعم.',
        category: 'mobile',
        tags: ['Flutter', 'Firebase', 'Maps'],
        tagsAr: ['Flutter', 'Firebase', 'خرائط'],
        gradient: 'from-red-600/40 to-orange-600/40',
        accentColor: 'red',
    },
    {
        id: 8,
        titleEn: 'Horizon Real Estate Campaign',
        titleAr: 'حملة Horizon العقارية',
        descEn: 'Integrated lead-generation campaign for luxury real estate. Included virtual tours, landing pages, and retargeting ads.',
        descAr: 'حملة متكاملة لجذب العملاء المحتملين للعقارات الفاخرة. تضمنت جولات افتراضية وصفحات هبوط وإعلانات إعادة استهداف.',
        category: 'campaign',
        tags: ['Lead Gen', 'Video', 'Retargeting'],
        tagsAr: ['جذب عملاء', 'فيديو', 'إعادة استهداف'],
        gradient: 'from-sky-600/40 to-blue-600/40',
        accentColor: 'sky',
    },
];

export default function PortfolioPage() {
    const { t, language, direction } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredProjects = selectedCategory === 'all'
        ? PROJECTS
        : PROJECTS.filter(p => p.category === selectedCategory);

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <Link href="/" className="futuristic-btn inline-flex items-center gap-2 text-sm !py-2 !px-3">
                            {direction === 'rtl' ? (
                                <>{t('Back', 'رجوع')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> {t('Back', 'رجوع')}</>
                            )}
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                            {t('Our Portfolio', 'أعمالنا')}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t(
                                'A showcase of projects we\'re proud of. Each one represents a unique challenge and a creative solution.',
                                'معرض لأعمال نفخر بها. كل مشروع يمثل تحديًا فريدًا وحلاً إبداعيًا.'
                            )}
                        </p>
                    </div>

                    {/* Category Filters */}
                    <div className="flex flex-wrap justify-center gap-3 mb-12">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                                    selectedCategory === cat.id
                                        ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                                        : 'border border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400'
                                }`}
                            >
                                {t(cat.labelEn, cat.labelAr)}
                            </button>
                        ))}
                    </div>

                    {/* Projects Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProjects.map((project) => (
                            <div
                                key={project.id}
                                className="portfolio-card futuristic-card rounded-xl overflow-hidden group cursor-pointer"
                            >
                                {/* Visual header area */}
                                <div className={`relative h-48 bg-gradient-to-br ${project.gradient} flex items-center justify-center`}>
                                    <div className="text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all">
                                        {project.category === 'branding' ? '🎨' :
                                         project.category === 'web' ? '🌐' :
                                         project.category === 'mobile' ? '📱' : '📢'}
                                    </div>
                                    {/* Overlay on hover */}
                                    <div className="portfolio-overlay absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="futuristic-btn-primary px-6 py-2 text-sm">
                                            {t('View Details', 'عرض التفاصيل')}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {(language === 'ar' ? project.tagsAr : project.tags).map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                                        {t(project.titleEn, project.titleAr)}
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {t(project.descEn, project.descAr)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty state */}
                    {filteredProjects.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-slate-500 text-lg">{t('No projects in this category yet.', 'لا توجد مشاريع في هذه الفئة بعد.')}</p>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="mt-16 text-center">
                        <div className="futuristic-card rounded-xl p-8 md:p-12 border-cyan-500/20">
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                {t('Want to Be Our Next Success Story?', 'هل تريد أن تكون قصة نجاحنا القادمة؟')}
                            </h2>
                            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                                {t(
                                    'Let\'s work together to create something amazing for your brand.',
                                    'دعنا نعمل معًا لإنشاء شيء مذهل لعلامتك التجارية.'
                                )}
                            </p>
                            <Link href="/contact" className="futuristic-btn-primary text-lg px-8 py-3">
                                {t('Start Your Project', 'ابدأ مشروعك')}
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
