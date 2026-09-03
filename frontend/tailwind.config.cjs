/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app.vue',
    './pages/**/*.vue',
    './components/**/*.vue',
    './layouts/**/*.vue',
  ],
  plugins: [require('daisyui')],
  // daisyUI-Theme etc. werden im zweiten Schritt (Design) ergänzt.
}
