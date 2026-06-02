import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Relative base so the built app loads correctly from the Tauri file:// context.
  base: './',
});
