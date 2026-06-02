// Idolmancer design tokens — single dark theme.
// The same palette is exposed as a Tailwind preset (./tailwind-preset.js) for
// utility classes and as typed constants here for use in code (e.g. canvas
// colours in the future analysis tools).
export const colors = {
  bg: '#0b0d12',
  surface: '#141821',
  surface2: '#1d2330',
  border: '#2a3140',
  fg: '#e6e9ef',
  muted: '#8a93a6',
  accent: '#7c9cff',
} as const;

export type ColorToken = keyof typeof colors;
