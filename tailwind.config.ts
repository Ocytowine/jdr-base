import type { Config } from 'tailwindcss';

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
  plugins: []
} satisfies Config;
