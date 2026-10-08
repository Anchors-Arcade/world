import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
// The build entry is index.src.html; the deployed page is the same file renamed to index.html
// (scripts/sync-pages.mjs does this for the repo root). Do the same here so `npm run test:pages`
// works on a fresh build without the sync step.
const built = path.join(root, 'index.src.html');
if (existsSync(built) && !existsSync(path.join(root, 'index.html'))) {
  writeFileSync(path.join(root, 'index.html'), await readFile(built, 'utf8'));
}
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.match(html, /<div id="game"><\/div>/, 'game mount point is present');
assert.match(html, /<div id="ui"><\/div>/, 'UI mount point is present');

const referencedAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((url) => !/^(?:https?:|data:|#)/i.test(url));
assert.ok(referencedAssets.length > 0, 'built HTML references local assets');
for (const asset of referencedAssets) {
  assert.ok(!asset.startsWith('/'), `asset path must be relative for project Pages sites: ${asset}`);
  await stat(path.resolve(root, asset));
}

const files = await readdir(path.join(root, 'assets'));
const jsFiles = files.filter((name) => name.endsWith('.js'));
assert.ok(jsFiles.length, 'Vite emitted a JavaScript bundle');
const bundles = await Promise.all(jsFiles.map((name) => readFile(path.join(root, 'assets', name), 'utf8')));
const js = bundles.join('\n');
assert.ok(js.includes('Anchors World failed to start'), 'the guarded bootstrap is in the built app');
assert.ok(!/from["']https:\/\/cdn\.jsdelivr\.net\/npm\/(?:phaser|@supabase)/i.test(js),
  'Phaser and Supabase must be bundled locally, not fetched from a CDN');
assert.ok(await stat(path.join(root, '.nojekyll')), '.nojekyll is included in the Pages artifact');

console.log('ok - GitHub Pages build uses relative local assets, bundles dependencies, and includes .nojekyll');
