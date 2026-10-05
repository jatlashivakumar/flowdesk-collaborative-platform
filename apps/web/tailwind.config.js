export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 50:'#eef2ff',100:'#e0e7ff',500:'#6366f1',600:'#4f46e5',700:'#4338ca',900:'#312e81' } },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      animation: { 'slide-in': 'slideIn 0.2s ease-out', 'fade-in': 'fadeIn 0.15s ease-out' },
      keyframes: {
        slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      }
    }
  },
  plugins: [],
};
