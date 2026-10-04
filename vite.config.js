import { defineConfig } from 'vite';

// GitHub Pages serves from /<repo-name>/. The deploy workflow sets VITE_BASE.
// Locally it falls back to './' (relative paths work anywhere).
export default defineConfig({
  base: process.env.VITE_BASE || './',
  build: { chunkSizeWarningLimit: 1600 },
});
