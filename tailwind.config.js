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
        brand: {
          dark: '#1a5c2e',      // Text headers, navbar links
          DEFAULT: '#2a8c4a',   // Primary buttons
          light: '#85BB65',     // Secondary buttons, "Available" badges
          accent: '#228D57',    // Price text
          bg: '#e8f5eb',        // Light background
          border: '#d0fdd7',    // Light borders
          text: '#3E3E3C',      // General text
          'text-muted': '#6b7280',
          'card-bg': '#f5f5e6', // Inner cards
          'card-border': '#d4d4c4',
        },
      },
    },
  },
  plugins: [],
}
