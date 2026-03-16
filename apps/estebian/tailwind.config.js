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
                sans: ['Cairo', 'system-ui', 'sans-serif'],
                display: ['Manrope', 'Cairo', 'system-ui', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                },
                'stitch-primary': '#38CDDF',
                'background-dark': '#191022',
                'slate-glass': 'rgba(33, 28, 39, 0.7)',
            },
            backgroundImage: {
                'futuristic-grid': 'linear-gradient(rgba(56, 205, 223, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 205, 223, 0.03) 1px, transparent 1px)',
            },
            backgroundSize: {
                'grid': '40px 40px',
            },
        },
    },
    plugins: [],
};
