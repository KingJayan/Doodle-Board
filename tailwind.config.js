/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['Patrick Hand', 'cursive'],
        marker: ['Permanent Marker', 'cursive'],
      },
      zIndex: {
        'card-float': '60',
        'overlay': '100',
        'toast': '150',
      },
      colors: {
        brand: 'var(--accent)',
        'theme-paper': '#fdfbf7',
        'theme-dark': '#2b3035',
        'theme-blueprint': '#1e408a',
        'accent-yellow': '#ffd93d',
        'note-yellow': '#ffeb3b',
        'note-blue': '#e1f5fe',
        'note-green': '#c8e6c9',
      }
    },
  },
  plugins: [],
}
