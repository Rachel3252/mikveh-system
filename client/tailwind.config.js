/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 24px 80px rgba(15, 23, 42, 0.08)',
        glow: '0 30px 80px rgba(251, 207, 216, 0.28)',
      },
      backgroundImage: {
        'soft-gradient': 'radial-gradient(circle at top left, rgba(255, 241, 228, 0.45), transparent 27%), radial-gradient(circle at bottom right, rgba(252, 214, 210, 0.24), transparent 25%)',
      },
      colors: {
        cream: {
          50: '#fff7f0',
          100: '#fff0e5',
          200: '#fce3d6',
          300: '#f4d0c0',
          400: '#e7b8a5',
          500: '#d69d86',
        },
        blush: {
          100: '#fff0f0',
          200: '#fbd9db',
          300: '#f3bfc3',
          400: '#e39aa8',
          500: '#cf737e',
        },
      },
    },
  },
  plugins: [],
};
