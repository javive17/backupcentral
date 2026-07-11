import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  base: '/backupcentral/',
  server: {
    proxy: {
      '/api': 'http://localhost:3080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
