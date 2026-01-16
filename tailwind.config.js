/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#2a8c4a',
          DEFAULT: '#64c27b',
          light: '#9bfab0',
          'very-light': '#d0fdd7',
        },
      },
    },
  },
  plugins: [],
}
