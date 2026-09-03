/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0a0b0e',
          panel: 'rgba(18, 20, 29, 0.82)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#38bdf8',
          accentGlow: 'rgba(56, 189, 248, 0.25)',
          codex: '#10b981',
          codexGlow: 'rgba(16, 185, 129, 0.25)',
          amber: '#f59e0b',
          rose: '#f43f5e'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
}
