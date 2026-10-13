import { defineConfig } from 'vite';

// Relative base, so the built site works from any folder or sub-path (GitHub Pages, a CDN prefix, file preview).
export default defineConfig({
  base: './',
  build: { target: 'es2022', assetsInlineLimit: 0 },
  server: { host: '127.0.0.1' },
});
