'use client';

import Image from 'next/image';
import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter, NJAZ_APPS, FuturisticPanel } from '@njaz/ui-components';
import { getAppUrl } from '@njaz/shared-auth';

export default function LandingPage() {
    const { t, language, direction } = useLanguage();

    // Filter out admin app for display
    const displayApps = NJAZ_APPS.filter(app => app.id !== 'admin');

    return (
        <main className="min-h-screen flex flex-col hero-section futuristic-bg">
            {/* Shared Header */}
            <SharedHeader showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            {/* Main Content - Fits screen without scrolling */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-4 relative z-0">

                {/* Compact Message / Tagline */}
                <div className="text-center mb-6 relative z-10">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-white to-slate-300 tracking-tight leading-relaxed pb-2">
                        {language === 'ar' ? (
                            <span className="gradient-text">الهندسة المُنجَزة</span>
                        ) : (
                            <>Engineering <span className="gradient-text">Accomplished.</span></>
                        )}
                    </h1>
                    <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto mt-3">
                        {t(
                            'Unified platform for surveys, control, development & design.',
                            'منصة موحدة للاستبيانات والتحكم والتطوير والتصميم.'
                        )}
                    </p>
                </div>

                {/* Central Hub with Apps - Compact */}
                <div className="relative w-full max-w-4xl mx-auto flex-1 flex items-center justify-center">
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">

                        {/* Top Left App */}
                        <a href={getAppUrl(displayApps[0]?.id) || displayApps[0]?.href} className="group">
                            <FuturisticPanel glowColor="cyan" size="sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Image src={displayApps[0]?.icon || ''} alt={displayApps[0]?.name || ''} width={36} height={36} className="object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">{displayApps[0]?.name}</h3>
                                        <p className="text-xs text-cyan-400/70">{displayApps[0]?.nameAr}</p>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        </a>

                        {/* Center Hub */}
                        <div className="flex items-center justify-center order-first md:order-none py-4 md:py-0">
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: 'radial-gradient(circle, rgba(56,205,223,0.15) 0%, transparent 70%)',
                                        transform: 'scale(1.4)',
                                        animation: 'pulse-glow 3s ease-in-out infinite',
                                    }}
                                />
                                <div className="absolute inset-0 rounded-full border border-cyan-500/20" style={{ transform: 'scale(1.2)' }} />
                                <div
                                    className="relative w-full h-full rounded-full flex items-center justify-center border-2 border-cyan-500/50"
                                    style={{
                                        background: 'radial-gradient(circle, rgba(56,205,223,0.1) 0%, rgba(10,15,26,0.95) 100%)',
                                        boxShadow: '0 0 30px rgba(56,205,223,0.3)',
                                    }}
                                >
                                    <Image src="/images/njaz-logo.svg" alt="Njaz" width={52} height={52} className="drop-shadow-[0_0_15px_rgba(56,205,223,0.5)]" />
                                </div>
                            </div>
                        </div>

                        {/* Top Right App */}
                        <a href={getAppUrl(displayApps[1]?.id) || displayApps[1]?.href} className="group">
                            <FuturisticPanel glowColor="gold" size="sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Image src={displayApps[1]?.icon || ''} alt={displayApps[1]?.name || ''} width={36} height={36} className="object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">{displayApps[1]?.name}</h3>
                                        <p className="text-xs text-amber-400/70">{displayApps[1]?.nameAr}</p>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        </a>

                        {/* Bottom Left App */}
                        <a href={getAppUrl(displayApps[2]?.id) || displayApps[2]?.href} className="group">
                            <FuturisticPanel glowColor="purple" size="sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Image src={displayApps[2]?.icon || ''} alt={displayApps[2]?.name || ''} width={36} height={36} className="object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">{displayApps[2]?.name}</h3>
                                        <p className="text-xs text-purple-400/70">{displayApps[2]?.nameAr}</p>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        </a>

                        {/* Empty center */}
                        <div className="hidden md:block" />

                        {/* Bottom Right App */}
                        <a href={getAppUrl(displayApps[3]?.id) || displayApps[3]?.href} className="group">
                            <FuturisticPanel glowColor="green" size="sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Image src={displayApps[3]?.icon || ''} alt={displayApps[3]?.name || ''} width={36} height={36} className="object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-white truncate">{displayApps[3]?.name}</h3>
                                        <p className="text-xs text-emerald-400/70">{displayApps[3]?.nameAr}</p>
                                    </div>
                                </div>
                            </FuturisticPanel>
                        </a>
                    </div>
                </div>
            </div>

            {/* Shared Footer */}
            <SharedFooter direction={direction} t={t} />
        </main>
    );
}
