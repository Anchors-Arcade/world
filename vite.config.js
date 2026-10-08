import { defineConfig } from 'vite';

// Relative asset URLs are required for GitHub Pages project sites, which live at
// https://<user>.github.io/<repository>/ rather than at the domain root.
//
// The build/dev entry is index.src.html, NOT index.html: the root index.html is the DEPLOYED page
// (a built artifact pointing at hashed files in assets/), and building from it would just
// re-minify the previous deploy. index.src.html is the true source entry; scripts/sync-pages.mjs
// copies the finished build over index.html and assets/ after `npm run build`.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: 'index.src.html' },
  },
  server: { open: '/index.src.html' },
});
