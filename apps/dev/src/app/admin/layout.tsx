'use client';

import { useLanguage, LanguageSwitcher } from '@/components/LanguageContext';
import { SharedHeader, SharedFooter } from '@njaz/ui-components';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminUser } from '@/lib/admin/hooks';

const ADMIN_NAV = [
    { href: '/admin', labelEn: 'Dashboard', labelAr: 'لوحة التحكم', icon: '📊' },
    { href: '/admin/campaigns', labelEn: 'Campaigns', labelAr: 'الحملات', icon: '📢' },
    { href: '/admin/leads', labelEn: 'Leads', labelAr: 'عملاء محتملين', icon: '🎯' },
    { href: '/admin/quotations', labelEn: 'Quotes', labelAr: 'عروض أسعار', icon: '💰' },
    { href: '/admin/inquiries', labelEn: 'Projects', labelAr: 'المشاريع', icon: '📋' },
    { href: '/admin/board', labelEn: 'Tasks', labelAr: 'لوحة المهام', icon: '📌' },
    { href: '/admin/team', labelEn: 'Team', labelAr: 'الفريق', icon: '👥' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { t, direction } = useLanguage();
    const pathname = usePathname();
    const { isAdmin } = useAdminUser();

    return (
        <div className="min-h-screen flex flex-col futuristic-bg" dir={direction}>
            <SharedHeader currentApp="dev" showLanguageSwitcher={true} LanguageSwitcher={LanguageSwitcher} />

            <div className="flex-1 pt-24 pb-16 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* ── Admin Nav Bar (Wrapped Chips) ─────────────── */}
                    <div className="mb-8 w-full">
                        <div className="flex flex-wrap items-center gap-2 px-1 pb-2 select-none">
                            {/* Label / Brand */}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                                <span className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    {t('Admin', 'إدارة')}
                                </span>
                            </div>

                            {/* Nav Links */}
                            {ADMIN_NAV.map(nav => {
                                const isActive = pathname === nav.href || (nav.href !== '/admin' && pathname.startsWith(nav.href));
                                return (
                                    <Link
                                        key={nav.href}
                                        href={nav.href}
                                        className={`
                                            flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all
                                            ${isActive
                                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(56,205,223,0.15)]'
                                                : 'bg-slate-800/30 text-slate-500 hover:text-white hover:bg-slate-800/60 border border-slate-700/50'
                                            }
                                        `}
                                    >
                                        <span className={`text-base ${isActive ? 'scale-110' : 'grayscale opacity-70'} transition-transform`}>{nav.icon}</span>
                                        <span>{t(nav.labelEn, nav.labelAr)}</span>
                                    </Link>
                                );
                            })}

                            {/* Admin Users Link */}
                            {isAdmin && (
                                <Link
                                    href="/admin/users"
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all
                                        ${pathname.startsWith('/admin/users')
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_20px_rgba(56,205,223,0.15)]'
                                            : 'bg-slate-800/30 text-slate-500 hover:text-white hover:bg-slate-800/60 border border-slate-700/50'
                                        }
                                    `}
                                >
                                    <span className={`text-base ${pathname.startsWith('/admin/users') ? 'scale-110' : 'grayscale opacity-70'} transition-transform`}>🛡️</span>
                                    <span>{t('Users', 'المستخدمين')}</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Page Content */}
                    {children}
                </div>
            </div>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
