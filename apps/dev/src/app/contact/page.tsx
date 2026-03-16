'use client';

import { useState } from 'react';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, FuturisticPanel } from '@njaz/ui-components';
import Link from 'next/link';

const SERVICE_OPTIONS = [
    { valueEn: 'branding', labelEn: 'Brand Identity & Logo', labelAr: 'الهوية البصرية والشعار' },
    { valueEn: 'web', labelEn: 'Website Development', labelAr: 'تطوير المواقع' },
    { valueEn: 'mobile', labelEn: 'Mobile App Development', labelAr: 'تطوير تطبيقات الموبايل' },
    { valueEn: 'campaign', labelEn: 'Digital Marketing Campaign', labelAr: 'حملة تسويق رقمي' },
    { valueEn: 'seo', labelEn: 'SEO & Analytics', labelAr: 'تحسين محركات البحث والتحليلات' },
    { valueEn: 'cloud', labelEn: 'Cloud & DevOps', labelAr: 'السحابة و DevOps' },
    { valueEn: 'other', labelEn: 'Other', labelAr: 'أخرى' },
];

export default function ContactPage() {
    const { t, language, direction } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service: '',
        budget: '',
        message: '',
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In production, this would send to an API
        console.log('Form submitted:', formData);
        setIsSubmitted(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

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
                            {t('Get in Touch', 'تواصل معنا')}
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                            {t(
                                'Ready to start your next project? Fill out the form below and we\'ll get back to you within 24 hours.',
                                'مستعد لبدء مشروعك القادم؟ املأ النموذج أدناه وسنعود إليك خلال 24 ساعة.'
                            )}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <FuturisticPanel glowColor="cyan" size="lg">
                                {isSubmitted ? (
                                    <div className="text-center py-16">
                                        <div className="text-5xl mb-4">✅</div>
                                        <h2 className="text-2xl font-bold text-white mb-3">
                                            {t('Message Sent!', 'تم إرسال الرسالة!')}
                                        </h2>
                                        <p className="text-slate-400 mb-6">
                                            {t(
                                                'Thank you for reaching out. Our team will contact you within 24 hours.',
                                                'شكرًا لتواصلك معنا. فريقنا سيتصل بك خلال 24 ساعة.'
                                            )}
                                        </p>
                                        <button
                                            onClick={() => { setIsSubmitted(false); setFormData({ name: '', email: '', phone: '', service: '', budget: '', message: '' }); }}
                                            className="futuristic-btn"
                                        >
                                            {t('Send Another Message', 'إرسال رسالة أخرى')}
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6 p-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-slate-300 text-sm font-medium mb-2">
                                                    {t('Full Name', 'الاسم الكامل')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    required
                                                    className="futuristic-input"
                                                    placeholder={t('John Doe', 'أحمد محمد')}
                                                    dir={direction}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-300 text-sm font-medium mb-2">
                                                    {t('Email Address', 'البريد الإلكتروني')} *
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="futuristic-input"
                                                    placeholder="name@company.com"
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-slate-300 text-sm font-medium mb-2">
                                                    {t('Phone Number', 'رقم الهاتف')}
                                                </label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="futuristic-input"
                                                    placeholder="+966 5XX XXX XXXX"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-300 text-sm font-medium mb-2">
                                                    {t('Service Needed', 'الخدمة المطلوبة')} *
                                                </label>
                                                <select
                                                    name="service"
                                                    value={formData.service}
                                                    onChange={handleChange}
                                                    required
                                                    className="futuristic-select"
                                                    dir={direction}
                                                >
                                                    <option value="">{t('Select a service...', 'اختر خدمة...')}</option>
                                                    {SERVICE_OPTIONS.map((opt) => (
                                                        <option key={opt.valueEn} value={opt.valueEn}>
                                                            {t(opt.labelEn, opt.labelAr)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                                {t('Estimated Budget', 'الميزانية التقديرية')}
                                            </label>
                                            <select
                                                name="budget"
                                                value={formData.budget}
                                                onChange={handleChange}
                                                className="futuristic-select"
                                                dir={direction}
                                            >
                                                <option value="">{t('Select a range...', 'اختر نطاقًا...')}</option>
                                                <option value="small">{t('$1,000 - $5,000', '١٬٠٠٠$ - ٥٬٠٠٠$')}</option>
                                                <option value="medium">{t('$5,000 - $15,000', '٥٬٠٠٠$ - ١٥٬٠٠٠$')}</option>
                                                <option value="large">{t('$15,000 - $50,000', '١٥٬٠٠٠$ - ٥٠٬٠٠٠$')}</option>
                                                <option value="enterprise">{t('$50,000+', '٥٠٬٠٠٠$+')}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-slate-300 text-sm font-medium mb-2">
                                                {t('Project Details', 'تفاصيل المشروع')} *
                                            </label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                className="futuristic-textarea"
                                                placeholder={t(
                                                    'Tell us about your project, goals, timeline, and any specific requirements...',
                                                    'أخبرنا عن مشروعك وأهدافك والجدول الزمني وأي متطلبات محددة...'
                                                )}
                                                dir={direction}
                                                rows={5}
                                            />
                                        </div>

                                        <button type="submit" className="futuristic-btn-primary w-full text-lg py-4">
                                            {t('Send Message', 'إرسال الرسالة')}
                                        </button>
                                    </form>
                                )}
                            </FuturisticPanel>
                        </div>

                        {/* Contact Info Sidebar */}
                        <div className="space-y-6">
                            {/* Email */}
                            <div className="futuristic-card p-6 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-xl">📧</div>
                                    <h3 className="text-white font-bold">{t('Email Us', 'راسلنا')}</h3>
                                </div>
                                <a href="mailto:hello@dev.njaz.org" className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm" dir="ltr">
                                    hello@dev.njaz.org
                                </a>
                            </div>

                            {/* Phone */}
                            <div className="futuristic-card p-6 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xl">📞</div>
                                    <h3 className="text-white font-bold">{t('Call Us', 'اتصل بنا')}</h3>
                                </div>
                                <a href="tel:+966500000000" className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm" dir="ltr">
                                    +966 50 000 0000
                                </a>
                            </div>

                            {/* Location */}
                            <div className="futuristic-card p-6 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-xl">📍</div>
                                    <h3 className="text-white font-bold">{t('Visit Us', 'زرنا')}</h3>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {t(
                                        'King Fahad Road, Riyadh, Saudi Arabia',
                                        'طريق الملك فهد، الرياض، المملكة العربية السعودية'
                                    )}
                                </p>
                            </div>

                            {/* Working Hours */}
                            <div className="futuristic-card p-6 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl">🕐</div>
                                    <h3 className="text-white font-bold">{t('Working Hours', 'ساعات العمل')}</h3>
                                </div>
                                <div className="text-slate-400 text-sm space-y-1">
                                    <p>{t('Sun - Thu: 9:00 AM - 6:00 PM', 'الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م')}</p>
                                    <p>{t('Fri - Sat: Closed', 'الجمعة - السبت: مغلق')}</p>
                                </div>
                            </div>

                            {/* Social Media */}
                            <div className="futuristic-card p-6 rounded-xl">
                                <h3 className="text-white font-bold mb-4">{t('Follow Us', 'تابعنا')}</h3>
                                <div className="flex gap-3">
                                    {['Twitter/X', 'LinkedIn', 'Instagram', 'Dribbble'].map((platform) => (
                                        <a
                                            key={platform}
                                            href="#"
                                            className="w-10 h-10 rounded-lg border border-slate-700 hover:border-cyan-500/40 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all text-xs font-bold"
                                            title={platform}
                                        >
                                            {platform.charAt(0)}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
