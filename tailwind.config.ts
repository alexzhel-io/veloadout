import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#13111c',
          card: '#1c1a2e',
          input: '#252340',
          hover: '#2e2b47',
        },
        accent: {
          DEFAULT: '#6d4aff',
          hover: '#7c5dfa',
          muted: '#3d2f99',
          glow: 'rgba(109,74,255,0.15)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          accent: 'rgba(109,74,255,0.4)',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9590c0',
          muted: '#5c587a',
        },
        success: '#44c37f',
        warning: '#f0a400',
        danger: '#f03d3d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        accent: '0 0 20px rgba(109,74,255,0.3)',
        glow: '0 0 40px rgba(109,74,255,0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
