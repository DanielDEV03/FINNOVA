/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Dark mode palette
                'dark-bg': '#030712',
                'dark-surface': '#0a1628',
                'dark-elevated': '#0f1f38',
                'dark-border': 'rgba(255,255,255,0.07)',
                // Brand
                brand: {
                    DEFAULT: '#10b981',
                    light: '#34d399',
                    dim: 'rgba(16,185,129,0.15)',
                },
            },
            backgroundImage: {
                'dark-gradient': 'linear-gradient(135deg, #030712 0%, #0a1628 100%)',
                'brand-gradient': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            },
            boxShadow: {
                'dark-sm': '0 1px 3px rgba(0,0,0,0.4)',
                'dark-md': '0 4px 12px rgba(0,0,0,0.5)',
                'dark-lg': '0 8px 24px rgba(0,0,0,0.6)',
                'glow': '0 0 20px rgba(16,185,129,0.25)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease',
                'slide-up': 'slideUp 0.3s ease',
                'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                bounceIn: {
                    '0%': { transform: 'scale(0.3) translateX(100%)', opacity: '0' },
                    '50%': { transform: 'scale(1.05) translateX(0)' },
                    '70%': { transform: 'scale(0.9) translateX(0)' },
                    '100%': { transform: 'scale(1) translateX(0)', opacity: '1' },
                },
                pulseGlow: {
                    '0%,100%': { boxShadow: '0 0 5px rgba(139,92,246,0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(139,92,246,0.8)' },
                },
            },
        },
    },
    plugins: [],
}
