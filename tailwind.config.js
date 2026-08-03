/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eefaff',
          100: '#d9f4fd',
          200: '#b7eafa',
          300: '#7edcf5',
          400: '#39c6ef',
          500: '#0eaee8',
          600: '#028dc5',
          700: '#08719f',
          800: '#0d5d82',
          900: '#124d6c',
          950: '#082f45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
