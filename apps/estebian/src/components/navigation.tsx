'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';

interface NavigationActionProps {
    href?: string;
    onClick?: () => void;
    label: string;
    action?: 'back' | 'forward';
    className?: string;
}

export function NavigationAction({
    href,
    onClick,
    label,
    action = 'back',
    className = '',
}: NavigationActionProps) {
    const { direction } = useLanguage();
    const router = useRouter();

    const isBack = action === 'back';
    // Under LTR: back = left arrow, forward = right arrow
    // Under RTL: back = right arrow, forward = left arrow
    const iconName = isBack
        ? (direction === 'rtl' ? 'arrow_forward' : 'arrow_back')
        : (direction === 'rtl' ? 'arrow_back' : 'arrow_forward');

    const buttonClass = `
        inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
        bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50
        text-slate-300 hover:text-white transition-all duration-300 backdrop-blur-md
        shadow-[0_0_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]
        ${className}
    `;

    const content = (
        <>
            {isBack && <span className="material-symbols-outlined text-lg">{iconName}</span>}
            <span>{label}</span>
            {!isBack && <span className="material-symbols-outlined text-lg">{iconName}</span>}
        </>
    );

    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.preventDefault();
            onClick();
            return;
        }

        if (href) {
            e.preventDefault();
            router.push(href);
            return;
        }

        if (isBack) {
            // If we have browser history to go back to, use it
            if (typeof window !== 'undefined' && window.history.length > 1) {
                e.preventDefault();
                router.back();
                return;
            }
        }
    };

    return (
        <a href={href || '#'} onClick={handleClick} className={buttonClass} style={{ cursor: 'pointer' }}>
            {content}
        </a>
    );
}

export function SubNavbar() {
    const { t } = useLanguage();
    const pathname = usePathname();

    // Do not show on responses or respond page or landing page
    if (pathname.includes('/respond/') || pathname === '/') return null;

    const navItems = [
        {
            path: '/surveys',
            label: t('Surveys', 'الاستبيانات'),
            icon: 'ballot',
            match: (p: string) => p.startsWith('/surveys')
        },
        {
            path: '/scales',
            label: t('Scale Library', 'مكتبة المقاييس'),
            icon: 'psychology',
            match: (p: string) => p.startsWith('/scales')
        },
        {
            path: '/reports',
            label: t('Reports', 'التقارير'),
            icon: 'analytics',
            match: (p: string) => p.startsWith('/reports')
        }
    ];

    return (
        <>
            {/* Desktop Top SubNavbar */}
            <div className="hidden md:block fixed top-24 left-0 right-0 z-40 px-8">
                <div className="max-w-7xl mx-auto flex justify-center">
                    <nav className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-900/60 rounded-2xl backdrop-blur-md shadow-2xl shadow-black/40">
                        {navItems.map((item) => {
                            const isActive = item.match(pathname);
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider
                                        transition-all duration-300
                                        ${isActive 
                                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'}
                                    `}
                                >
                                    <span className="material-symbols-outlined text-base">{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Mobile Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-900/60 backdrop-blur-lg pb-safe-bottom shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <nav className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = item.match(pathname);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`
                                    flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all duration-300
                                    ${isActive 
                                        ? 'text-cyan-400 font-extrabold transform -translate-y-0.5' 
                                        : 'text-slate-500 hover:text-slate-300'}
                                `}
                            >
                                <span className={`
                                    material-symbols-outlined text-xl mb-0.5 transition-all
                                    ${isActive ? 'text-cyan-400 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : ''}
                                `}>
                                    {item.icon}
                                </span>
                                <span className="truncate max-w-[80px]">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}
