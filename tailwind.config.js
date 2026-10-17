/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(148,163,184,0.15), 0 18px 50px rgba(15,23,42,0.38)',
      },
      colors: {
        midnight: '#060b1a',
        panel: '#0f172a',
        panelSoft: '#111c2f',
        accent: '#8b5cf6',
        cyan: '#22d3ee',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
