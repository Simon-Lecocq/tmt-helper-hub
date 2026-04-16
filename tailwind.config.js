/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50:  '#eef2fb',
          100: '#d5dff5',
          200: '#aabfeb',
          300: '#7a97de',
          400: '#4f72d0',
          500: '#2e53be',
          600: '#2242a3',
          700: '#1c3587',
          800: '#162969',
          900: '#0B1F4E',
          950: '#07122e',
        },
        gold: {
          50:  '#fdf8ec',
          100: '#faefd0',
          200: '#f4db9e',
          300: '#edc262',
          400: '#e6aa35',
          500: '#C8A84B',
          600: '#a8891b',
          700: '#876c17',
          800: '#6e5618',
          900: '#5c4718',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
