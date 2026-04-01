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
    { href: '/admin/board', labelEn: 'Board', labelAr: 'لوحة المهام', icon: '📌' },
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
                    {/* Admin Nav Bar */}
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 mr-2">
                            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                                {t('Admin', 'إدارة')}
                            </span>
                        </div>
                        {ADMIN_NAV.map(nav => {
                            const isActive = pathname === nav.href || (nav.href !== '/admin' && pathname.startsWith(nav.href));
                            return (
                                <Link
                                    key={nav.href}
                                    href={nav.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                                    }`}
                                >
                                    <span>{nav.icon}</span>
                                    <span>{t(nav.labelEn, nav.labelAr)}</span>
                                </Link>
                            );
                        })}
                        {isAdmin && (
                            <Link
                                href="/admin/users"
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                    pathname.startsWith('/admin/users')
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                                }`}
                            >
                                <span>🛡️</span>
                                <span>{t('Users', 'المستخدمين')}</span>
                            </Link>
                        )}
                    </div>

                    {/* Page Content */}
                    {children}
                </div>
            </div>

            <SharedFooter direction={direction} t={t} />
        </div>
    );
}
