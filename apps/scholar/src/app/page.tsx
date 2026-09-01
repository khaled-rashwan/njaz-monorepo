'use client';

import Link from 'next/link';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';

export default function ScholarLandingPage() {
    const { t, direction } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col futuristic-bg text-slate-100" dir={direction}>
            <SharedHeader currentApp="scholar" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <main className="flex-1 flex flex-col items-center justify-center pt-28 pb-16 px-4 max-w-6xl mx-auto text-center">
                {/* Hero Section */}
                <div className="space-y-6 max-w-3xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20">
                        ✨ {t('AI-Powered Academic Writing', 'كتابة أكاديمية مدعومة بالذكاء الاصطناعي')}
                    </span>
                    
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
                        {t('Njaz Scholar', 'إنجاز باحث')}
                    </h1>
                    
                    <p className="text-lg sm:text-xl text-slate-400 font-light leading-relaxed">
                        {t(
                            'Evolve your research lifecycle with block-based authoring, sandboxed Python visualizations, and dynamic literature synthesis.',
                            'طور دورتك البحثية بكتابة بنظام البلوكات، ومحاكاة رسومية بلغة بايثون، ودمج ديناميكي للأدبيات العلمية.'
                        )}
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link 
                            href="/projects" 
                            className="futuristic-btn-primary px-8 py-3 text-base shadow-lg shadow-amber-500/10 w-full sm:w-auto"
                        >
                            {t('Go to Workspace', 'الذهاب إلى مساحة العمل')}
                        </Link>
                        <Link 
                            href="/survey" 
                            className="futuristic-btn px-8 py-3 text-base border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                            <span>🔬</span>
                            <span>{t('Literature Survey Workbench', 'بيئة تحليل ومسح الأدبيات')}</span>
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full text-left">
                    <div className="futuristic-card p-6 space-y-3">
                        <div className="text-2xl">🖋️</div>
                        <h3 className="text-lg font-bold text-white">
                            {t('Block-Based Editor', 'محرر البلوكات')}
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t(
                                'Write structured papers seamlessly. Insert headings, paragraphs, standard LaTeX equations, and figures in seconds.',
                                'اكتب أوراقاً منظمة بسلاسة. أدرج العناوين، الفقرات، معادلات لاتكس القياسية، والرسوم التوضيحية في ثوانٍ معدودة.'
                            )}
                        </p>
                    </div>

                    <div className="futuristic-card p-6 space-y-3">
                        <div className="text-2xl">📚</div>
                        <h3 className="text-lg font-bold text-white">
                            {t('Literature Synthesizer', 'استعراض الأدبيات')}
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t(
                                'Search OpenAlex and Semantic Scholar directly. Add references instantly and let the pipeline compile your bibliography.',
                                'ابحث في قواعد البيانات العلمية مباشرة. أضف مراجعك فوراً ودع النظام يقوم بجمع وصياغة المراجع تلقائياً.'
                            )}
                        </p>
                    </div>

                    <div className="futuristic-card p-6 space-y-3">
                        <div className="text-2xl">📊</div>
                        <h3 className="text-lg font-bold text-white">
                            {t('Statistical Sandbox', 'محاكاة إحصائية')}
                        </h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t(
                                'Inject Python runtime execution directly in the canvas. Generate rich charts powered by a shared analytics engine.',
                                'قم بتنفيذ أكواد بايثون البرمجية مباشرة في بيئة العمل. أنشئ رسوماً بيانية غنية مدعومة بمحرك تحليل البيانات المشترك.'
                            )}
                        </p>
                    </div>
                </div>
            </main>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
