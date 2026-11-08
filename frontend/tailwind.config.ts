import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0B3A5B',
        sky: '#38BDF8',
        pink: '#FF2E93',
        pale: '#E0F2FE',
        green: '#17885B',
        amber: '#C77B12',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        display: ['Fraunces_600SemiBold'],
      },
    },
  },
  plugins: [],
} satisfies Config;
