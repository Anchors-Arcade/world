// Recover the pre-Phase-21 buildingTexture body from the previous session transcript.
import fs from 'node:fs';

const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split('\n');
const hits = [];
const walk = (o) => {
  if (!o || typeof o !== 'object') return;
  if (o.type === 'tool_use' && o.name === 'Edit' && String(o.input?.file_path || '').includes('worldArt')) {
    const old = o.input.old_string || '';
    if (old.includes('bld_') || old.includes('buildingTexture')) hits.push(old);
  }
  for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
};
for (const line of lines) {
  if (!line.includes('worldArt')) continue;
  let obj; try { obj = JSON.parse(line); } catch { continue; }
  walk(obj);
}
for (const h of hits) {
  console.log('===== EDIT old_string =====');
  console.log(h);
  console.log('===== END =====');
}
