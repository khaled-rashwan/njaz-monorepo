'use client';

import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import Link from 'next/link';

const TEAM = [
    {
        nameEn: 'Khaled Al-Rashwan',
        nameAr: 'خالد الرشوان',
        roleEn: 'Founder & CEO',
        roleAr: 'المؤسس والمدير التنفيذي',
        bioEn: 'Visionary leader with 15+ years in digital transformation and brand strategy.',
        bioAr: 'قائد صاحب رؤية مع أكثر من 15 عامًا في التحول الرقمي واستراتيجية العلامات التجارية.',
        gradient: 'from-cyan-500 to-blue-600',
    },
    {
        nameEn: 'Lina Mansour',
        nameAr: 'لينا منصور',
        roleEn: 'Creative Director',
        roleAr: 'المديرة الإبداعية',
        bioEn: 'Award-winning designer with a passion for crafting unforgettable brand experiences.',
        bioAr: 'مصممة حائزة على جوائز بشغف لصياغة تجارب علامات تجارية لا تُنسى.',
        gradient: 'from-purple-500 to-pink-600',
    },
    {
        nameEn: 'Faisal Al-Otaibi',
        nameAr: 'فيصل العتيبي',
        roleEn: 'Head of Engineering',
        roleAr: 'رئيس الهندسة',
        bioEn: 'Full-stack architect specializing in cloud-native applications and scalable systems.',
        bioAr: 'مهندس متكامل متخصص في التطبيقات السحابية والأنظمة القابلة للتوسع.',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        nameEn: 'Nora Al-Zahrani',
        nameAr: 'نورة الزهراني',
        roleEn: 'Marketing Strategist',
        roleAr: 'خبيرة استراتيجية التسويق',
        bioEn: 'Data-driven marketer who turns insights into high-performing campaigns.',
        bioAr: 'متخصصة تسويق تعتمد على البيانات تحول الأفكار إلى حملات عالية الأداء.',
        gradient: 'from-amber-500 to-orange-600',
    },
];

const VALUES = [
    {
        icon: '🎯',
        titleEn: 'Results-Driven',
        titleAr: 'نتائج ملموسة',
        descEn: 'Every project is measured by the impact it creates. We don\'t just deliver — we deliver results.',
        descAr: 'كل مشروع يُقاس بالأثر الذي يحدثه. لا نكتفي بالتسليم — بل نقدم نتائج.',
    },
    {
        icon: '💎',
        titleEn: 'Quality First',
        titleAr: 'الجودة أولاً',
        descEn: 'We hold ourselves to the highest standards. Every pixel, every line of code matters.',
        descAr: 'نلتزم بأعلى المعايير. كل بكسل وكل سطر كود له أهمية.',
    },
    {
        icon: '🤝',
        titleEn: 'True Partnership',
        titleAr: 'شراكة حقيقية',
        descEn: 'We become an extension of your team, deeply understanding your business and goals.',
        descAr: 'نصبح امتدادًا لفريقك، مع فهم عميق لعملك وأهدافك.',
    },
    {
        icon: '🚀',
        titleEn: 'Innovation',
        titleAr: 'الابتكار',
        descEn: 'We stay at the cutting edge, leveraging the latest tools and trends to give you an advantage.',
        descAr: 'نبقى في الطليعة، ونستفيد من أحدث الأدوات والاتجاهات لمنحك ميزة تنافسية.',
    },
];

export default function AboutPage() {
    const { t, language, direction } = useLanguage();

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

                    {/* Hero / Mission */}
                    <section className="text-center mb-20">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                            {t('About ', 'عن ')}
                            <span className="gradient-text">Dev</span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
                            {t(
                                'We are a full-service digital agency passionate about helping businesses succeed in the digital world. Founded with a mission to bridge the gap between creative design and cutting-edge technology, we\'ve helped over 80 clients across the Middle East and beyond transform their digital presence.',
                                'نحن وكالة رقمية متكاملة الخدمات شغوفة بمساعدة الشركات على النجاح في العالم الرقمي. تأسسنا بمهمة سد الفجوة بين التصميم الإبداعي والتكنولوجيا المتطورة، وساعدنا أكثر من 80 عميلاً عبر الشرق الأوسط وخارجه في تحويل حضورهم الرقمي.'
                            )}
                        </p>
                    </section>

                    {/* Values */}
                    <section className="mb-20">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">
                            {t('Our Values', 'قيمنا')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {VALUES.map((value, index) => (
                                <div key={index} className="futuristic-card p-6 rounded-xl text-center group hover:border-cyan-500/40 transition-all">
                                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{value.icon}</div>
                                    <h3 className="text-white font-bold text-lg mb-2">{t(value.titleEn, value.titleAr)}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{t(value.descEn, value.descAr)}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Team */}
                    <section className="mb-20">
                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            {t('Meet the Team', 'تعرّف على الفريق')}
                        </h2>
                        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
                            {t(
                                'Talented professionals who bring your vision to life.',
                                'محترفون موهوبون يحولون رؤيتك إلى واقع.'
                            )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {TEAM.map((member, index) => (
                                <div key={index} className="futuristic-card p-6 rounded-xl text-center group hover:border-cyan-500/40 transition-all">
                                    {/* Avatar */}
                                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.gradient} mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform shadow-lg`}>
                                        {t(member.nameEn, member.nameAr).charAt(0)}
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-1">
                                        {t(member.nameEn, member.nameAr)}
                                    </h3>
                                    <p className="text-cyan-400 text-sm font-medium mb-3">
                                        {t(member.roleEn, member.roleAr)}
                                    </p>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        {t(member.bioEn, member.bioAr)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Why Choose Us */}
                    <section className="mb-20">
                        <FuturisticPanel glowColor="purple" size="lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-white mb-4">
                                        {t('Why Choose Dev?', 'لماذا تختار Dev؟')}
                                    </h2>
                                    <ul className="space-y-4">
                                        {[
                                            { en: '12+ years of industry experience', ar: 'أكثر من 12 عامًا من الخبرة في المجال' },
                                            { en: 'Bilingual team (Arabic & English)', ar: 'فريق ثنائي اللغة (عربي وإنجليزي)' },
                                            { en: 'End-to-end project delivery', ar: 'تسليم مشاريع شامل من البداية للنهاية' },
                                            { en: 'Transparent pricing, no hidden fees', ar: 'أسعار شفافة، بدون رسوم مخفية' },
                                            { en: 'Post-launch support & maintenance', ar: 'دعم وصيانة بعد الإطلاق' },
                                            { en: 'Dedicated project manager for each client', ar: 'مدير مشروع مخصص لكل عميل' },
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-3">
                                                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-slate-300 text-sm">{t(item.en, item.ar)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-cyan-500/20">
                                            <div className="text-center">
                                                <div className="text-5xl font-extrabold gradient-text">150+</div>
                                                <div className="text-slate-400 text-sm mt-1">{t('Projects', 'مشروع')}</div>
                                            </div>
                                        </div>
                                        <div className="absolute -top-3 -right-3 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/20 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-300">98%</div>
                                                <div className="text-[8px] text-slate-400">{t('Satisfaction', 'رضا')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </FuturisticPanel>
                    </section>

                    {/* CTA */}
                    <section className="text-center">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            {t('Let\'s Build Something Great', 'لنبنِ شيئًا عظيمًا معًا')}
                        </h2>
                        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                            {t(
                                'Whether you need a brand refresh, a new website, or a full digital strategy — we\'re here for you.',
                                'سواء كنت بحاجة لتجديد علامتك التجارية أو موقع جديد أو استراتيجية رقمية شاملة — نحن هنا من أجلك.'
                            )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/contact" className="futuristic-btn-primary text-lg px-8 py-3">
                                {t('Contact Us', 'تواصل معنا')}
                            </Link>
                            <Link href="/portfolio" className="futuristic-btn text-lg px-8 py-3">
                                {t('See Our Work', 'شاهد أعمالنا')}
                            </Link>
                        </div>
                    </section>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
