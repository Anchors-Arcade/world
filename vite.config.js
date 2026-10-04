// Vite is optional for Anchors World (the game ships as plain files for GitHub Pages), but it powers `npm run dev`,
// `npm run build` and the headless smoke test. index.html loads Phaser from a CDN and src/config/supabase.js imports
// supabase-js from one; the transform below points both at node_modules during a local run, so `npm run dev` works
// offline and the production files stay CDN-only.
const CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export default {
  plugins: [{
    name: 'anchors-cdn-to-local',
    enforce: 'pre',
    apply: 'serve',          // dev only: a production build keeps the CDN import, exactly as index.html expects
    transform(code, id) {
      if (!id.includes('/src/') || !code.includes(CDN_SUPABASE)) return null;
      return { code: code.replaceAll(CDN_SUPABASE, '@supabase/supabase-js'), map: null };
    },
  }],
};
