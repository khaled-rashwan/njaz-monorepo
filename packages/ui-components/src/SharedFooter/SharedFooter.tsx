'use client';

interface SharedFooterProps {
    language?: 'en' | 'ar';
    direction?: 'ltr' | 'rtl';
    t?: (en: string, ar: string) => string;
}

/**
 * Shared Footer Component - Futuristic Command Center Style
 * 
 * Minimal metallic bar with Njaz branding
 */
export function SharedFooter({ language = 'en', direction = 'ltr', t }: SharedFooterProps) {
    const translate = t || ((en: string, ar: string) => language === 'ar' ? ar : en);

    return (
        <footer className="relative mt-auto">
            {/* Futuristic Footer Bar */}
            <div
                className="relative mx-4 mb-4 px-6 py-3 flex items-center justify-center"
                style={{
                    background: 'linear-gradient(180deg, rgba(235, 245, 255, 0.95) 0%, rgba(215, 225, 240, 0.98) 100%)',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 205, 223, 0.4)',
                    boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                }}
            >
                {/* Corner Accents */}
                <div className="absolute top-0 right-0 w-12 h-[2px] bg-gradient-to-l from-cyan-400/60 to-transparent" />
                <div className="absolute top-0 right-0 w-[2px] h-8 bg-gradient-to-b from-cyan-400/60 to-transparent" />
                <div className="absolute bottom-0 left-0 w-12 h-[2px] bg-gradient-to-r from-cyan-400/60 to-transparent" />
                <div className="absolute bottom-0 left-0 w-[2px] h-8 bg-gradient-to-t from-cyan-400/60 to-transparent" />

                {/* Center Content */}
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="h-6 sm:h-7 flex items-center justify-center flex-shrink-0 transition-all duration-300">
                        <img
                            src="/images/logo.png"
                            alt="Njaz"
                            className="h-full w-auto object-contain drop-shadow-[0_0_8px_rgba(56,205,223,0.3)] style-logo-blend"
                        />
                    </div>
                </div>

                {/* Decorative Star (like in reference) */}
                <div className="absolute right-6 opacity-40">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
                        <path
                            d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
            </div>
        </footer>
    );
}
