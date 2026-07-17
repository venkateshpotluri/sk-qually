import { defineConfig } from 'vite';

// Served from GitHub Pages at https://<user>.github.io/sk-qually/
export default defineConfig({
  base: process.env.QUALLY_BASE ?? '/sk-qually/',
  build: {
    target: 'es2022',
  },
});
