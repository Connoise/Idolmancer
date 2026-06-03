import preset from '@idolmancer/tokens/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Tools are bundled into the shell, so their classes must be scanned too.
    '../../tools/*/src/**/*.{ts,tsx}',
  ],
};
