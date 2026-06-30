/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui-components/src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
                display: ['Manrope', 'Cairo', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            colors: {
                primary: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
                scholar: {
                    amber: '#f59e0b',
                    gold: '#fbbf24',
                    warm: '#fef3c7',
                },
                'background-dark': '#0a0e1a',
                'slate-glass': 'rgba(20, 25, 35, 0.75)',
            },
            backgroundImage: {
                'futuristic-grid': 'linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid': '40px 40px',
            },
            animation: {
                'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
                'slide-in': 'slide-in 0.3s ease-out',
                'fade-up': 'fade-up 0.4s ease-out',
            },
            keyframes: {
                'glow-pulse': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)' },
                    '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.3)' },
                },
                'slide-in': {
                    from: { opacity: '0', transform: 'translateX(10px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
