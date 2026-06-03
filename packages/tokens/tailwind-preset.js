// Shared Tailwind preset for the single dark theme. Consumed by every app/tool's
// tailwind.config so the visual language stays in one place. Keep the palette in
// sync with ./src/index.ts (the typed counterpart used in code).
export default {
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        surface: '#141821',
        'surface-2': '#1d2330',
        border: '#2a3140',
        fg: '#e6e9ef',
        muted: '#8a93a6',
        accent: '#7c9cff',
      },
    },
  },
};
