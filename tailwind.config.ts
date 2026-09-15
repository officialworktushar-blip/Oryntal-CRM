import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#0d1230',
          darker: '#06070f',
          lighter: '#141a3a',
          accent: {
            DEFAULT: '#c9a84c',
            light: '#f0d080',
            dark: '#8b6914',
          },
        },
        background: '#F8F9FA',
        foreground: '#0d1230',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0d1230',
        },
        muted: {
          DEFAULT: '#F1F3F5',
          foreground: '#6B7280',
        },
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#0d1230',
        primary: {
          DEFAULT: '#0d1230',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#F1F3F5',
          foreground: '#0d1230',
        },
        accent: {
          DEFAULT: '#c9a84c',
          foreground: '#06070f',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;