/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        verity: {
          dark: '#080A12',
          darker: '#0B0D17',
          card: '#191D2D',
          cardHover: '#20253A',
          border: 'rgba(255, 255, 255, 0.09)',
          pink: '#FF477E',
          coral: '#FF6B8B',
          purple: '#8657FF',
          violet: '#8657FF',
          cyan: '#36CFFF',
          accent: '#FF477E',
          text: '#F4F5FF',
          muted: '#A0A8BE',
        },
        kids: {
          bg: '#E2E8F0',
          card: '#F4F7FB',
          primary: '#4D96FF',
          secondary: '#FFD93D',
          mint: '#6BCB77',
          coral: '#FF6B6B',
          purple: '#8657FF',
          text: '#0F172A',
          border: '#CBD5E1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        kids: ['Quicksand', 'Fredoka', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.88', transform: 'scale(1.02)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
