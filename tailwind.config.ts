import type { Config } from 'tailwindcss';
import lineClamp from '@tailwindcss/line-clamp';

export default {
  content: [
    './app.vue',
    './components/**/*.{vue,js,ts}',
    './composables/**/*.{js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './stores/**/*.{js,ts}',
    './utils/**/*.{js,ts}'
  ],
  theme: {
    extend: {}
  },
  plugins: [lineClamp]
} satisfies Config;
