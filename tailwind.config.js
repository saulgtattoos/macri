/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0e0e0d',
        surface: '#161614',
        surface2: '#1e1e1b',
        gold: '#c9a96e',
        text: '#e8e6df',
        muted: '#7a786f',
        success: '#7aab8f',
      },
      fontFamily: {
        heading: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
