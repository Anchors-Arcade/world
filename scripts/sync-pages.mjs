// Publishes a finished build to the repo root, which IS the GitHub Pages artifact
// (upload the contents of world-main/ and the site works — no npm on the other end).
//
//   npm run build          -> dist/index.src.html + dist/assets/*
//   node scripts/sync-pages.mjs  -> root index.html + root assets/
//
// Root index.html stays a BUILT page (it must load bundled files, not src/), while the
// build entry remains index.src.html — so syncing can never break the next build again.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const builtHtml = path.join(dist, 'index.src.html');
if (!existsSync(builtHtml)) {
  console.error('dist/index.src.html is missing — run `npm run build` first.');
  process.exit(1);
}

// The Pages artifact and the preview server expect the page at index.html.
const html = await readFile(builtHtml, 'utf8');
writeFileSync(path.join(dist, 'index.html'), html);

// Replace the deployed assets wholesale so no stale hashed bundles linger.
const assets = path.join(root, 'assets');
rmSync(assets, { recursive: true, force: true });
mkdirSync(assets);
cpSync(path.join(dist, 'assets'), assets, { recursive: true });
cpSync(builtHtml, path.join(root, 'index.html'));

const n = readdirSync(assets).length;
console.log(`ok - deployed ${n} asset file${n === 1 ? '' : 's'} and index.html to the repo root`);
if (!existsSync(path.join(root, '.nojekyll'))) console.warn('warning: .nojekyll is missing from the root');
