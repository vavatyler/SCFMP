/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#1C3829',
          light: '#2F5240',
          dark: '#122419',
        },
        gold: {
          DEFAULT: '#C99A3D',
          light: '#E0BC6F',
          dark: '#A87D28',
        },
        clay: {
          DEFAULT: '#8B4A3C',
          light: '#A8695A',
        },
        paper: '#F6F2E9',
        sand: '#E8E1D1',
        ink: '#23201B',
        'ink-soft': '#5A5548',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(35, 32, 27, 0.06), 0 1px 8px rgba(35, 32, 27, 0.04)',
      },
    },
  },
  plugins: [],
};
