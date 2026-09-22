/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app.vue',
    './pages/**/*.vue',
    './components/**/*.vue',
    './layouts/**/*.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -30px rgba(9, 53, 91, 0.35)',
      },
      maxWidth: {
        page: '88rem',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        kompcards: {
          primary: '#0d4775',
          'primary-content': '#ffffff',
          secondary: '#e8f0f5',
          'secondary-content': '#0b3458',
          accent: '#d89437',
          'accent-content': '#142f48',
          neutral: '#173a58',
          'neutral-content': '#fdfbf6',
          'base-100': '#fdfbf6',
          'base-200': '#f5f3ed',
          'base-300': '#e3e6e6',
          'base-content': '#163650',
          info: '#3e87b3',
          'info-content': '#ffffff',
          success: '#3b8c62',
          'success-content': '#ffffff',
          warning: '#d58b2c',
          'warning-content': '#2f2415',
          error: '#b74343',
          'error-content': '#ffffff',
          '--rounded-box': '0.75rem',
          '--rounded-btn': '0.5rem',
          '--rounded-badge': '9999px',
          '--animation-btn': '0.2s',
          '--btn-focus-scale': '0.98',
          '--border-btn': '1px',
        },
      },
    ],
    darkTheme: 'kompcards',
  },
}
