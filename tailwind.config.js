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
        indie: ['Indie Flower', 'cursive']
      }
    },
  },
  plugins: [],
}
