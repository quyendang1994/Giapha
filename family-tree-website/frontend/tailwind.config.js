/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        heritage: {
          gold: '#D4AF37',
          darkGold: '#B8860B',
          red: '#8B0000',
          darkRed: '#5D0000',
          cream: '#FDF5E6',
          brown: '#5C4033',
          lightBrown: '#A67B5B',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}