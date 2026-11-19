/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FFFDF9',
          100: '#FDF8F0', // Primary background
          200: '#F7EFE1', // Warm secondary
          300: '#EFE2CB',
          400: '#E4CFAB'
        },
        maroon: {
          50: '#FBF2F2',
          100: '#F7DFDF',
          600: '#8E1B1B',
          700: '#6E1414', // Deep Temple Maroon
          800: '#540F0F',
          900: '#3D0A0A',
          950: '#260606'
        },
        saffron: {
          50: '#FFF8F1',
          100: '#FEEDDC',
          400: '#F58634',
          500: '#E66A1F', // Sacred Saffron / Terracotta
          600: '#CF5711',
          700: '#B0440B'
        },
        gold: {
          50: '#FAF6EB',
          100: '#F3E8C9',
          300: '#DFBE7C',
          400: '#D5AD5E',
          500: '#C89D54', // Antique Temple Gold
          600: '#B5883C',
          700: '#946A29'
        },
        espresso: {
          DEFAULT: '#23120B',
          light: '#3E2419',
          muted: '#5F463B'
        }
      },
      fontFamily: {
        serif: ['var(--font-cinzel)', 'Cinzel', 'Cormorant Garamond', 'serif'],
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -5px rgba(110, 20, 20, 0.08), 0 4px 12px -2px rgba(200, 157, 84, 0.12)',
        'luxury-hover': '0 20px 40px -8px rgba(110, 20, 20, 0.16), 0 8px 20px -3px rgba(200, 157, 84, 0.22)',
        'gold-glow': '0 0 25px rgba(200, 157, 84, 0.35)',
      }
    },
  },
  plugins: [],
}
