import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'demo',
  // Relative asset paths so the build works when served from a subpath (a GitHub Pages
  // project page, e.g. https://<user>.github.io/color-selector/), not just from a domain root.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'color-selector': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
