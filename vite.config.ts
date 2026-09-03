import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'demo',
  plugins: [react()],
  resolve: {
    alias: {
      'color-selector': new URL('./src/index.ts', import.meta.url).pathname,
    },
  },
});
