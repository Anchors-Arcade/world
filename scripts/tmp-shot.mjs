// Dev-only visual check: drives a headless Chrome through the guest flow, then screenshots
//  1) the Town Hall (picture wall state) and  2) the plaza penguin in a full starter outfit.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:5173/';
const outDir = process.argv[3] || 'scripts/tmp-shots';
mkdirSync(outDir, { recursive: true });
const candidates = [
  process.env.CHROME_BIN, process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const browser = candidates.find(existsSync);
if (!browser) { console.error('no chrome/edge found'); process.exit(1); }

const profile = mkdtempSync(path.join(os.tmpdir(), 'anchors-shot-'));
const child = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-extensions',
  '--window-size=1280,800',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, url,
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let socket;
const errors = [];
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 15000;
  while (!existsSync(portFile) && Date.now() < deadline) child.exitCode === null && await sleep(100);
  const port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page' && t.url.startsWith(url));
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); });
  let nextId = 0; const pending = new Map();
  socket.addEventListener('message', (event) => {
    const m = JSON.parse(event.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const id = ++nextId; pending.set(id, (m) => (m.error ? rej(new Error(m.error.message)) : res(m)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed');
    return r.result.result.value;
  };
  const shot = async (name) => {
    const img = await cdp('Page.captureScreenshot', { format: 'png' });
    const data = img?.result?.data ?? img?.data;
    if (!data) { console.log(`FAILED ${name}:`, JSON.stringify(img).slice(0, 300)); return; }
    writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
    console.log(`saved ${name}`);
  };
  await cdp('Runtime.enable'); await cdp('Page.enable');

  // guest in
  const ready = Date.now() + 20000;
  while (Date.now() < ready) {
    if (await evalJs(`Boolean(document.querySelector('#g'))`)) break;
    await sleep(100);
  }
  await evalJs(`document.querySelector('#g')?.click()`);
  let inGame = false;
  while (Date.now() < ready && !inGame) {
    await sleep(250);
    inGame = await evalJs(`Boolean(window.__aw?.game?.scene?.getScene?.('Room')?.player && !document.querySelector('.loading-veil'))`);
  }
  console.log('in game:', inGame);
  if (!inGame) {
    const state = await evalJs(`JSON.stringify({
      guestBtn: !!document.querySelector('#g'), veil: !!document.querySelector('.loading-veil'),
      canvases: document.querySelectorAll('#game canvas').length,
      aw: typeof window.__aw, err: document.querySelector('.startup-error')?.textContent || null,
      title: document.title,
    })`);
    console.log('page state:', state);
    console.log('runtime errors:', errors.length ? errors.join('\n') : 'none');
    process.exit(1);
  }
  await sleep(500);

  // ---- Town Hall: hall renders, gallery slots exist, picture pipeline runs (fake picture -> broken-icon path)
  await evalJs(`(() => { __aw.game.scene.getScene('Room').scene.restart({ roomId: 'town_hall' }); return null; })()`);
  await sleep(2500);
  const hall = await evalJs(`JSON.stringify({
    room: __aw.game.scene.getScene('Room').roomId,
    slots: __aw.game.scene.getScene('Room').gallery?.slots?.length,
    err: __aw.game.scene.getScene('Room').gallery?.error || null,
  })`);
  console.log('town hall:', hall);
  await shot('townhall-hall.png');
  await evalJs(`(() => {
    const g = __aw.game.scene.getScene('Room').gallery;
    g.pictures = [{ id: 't1', path: 'testuser/pic.jpg', caption: 'Test picture', display_name: 'Tester', w: 100, h: 100 }];
    g.hangKnown();
  })()`);
  await sleep(4000); // let the fake picture load -> 404 -> showBroken
  const pipe = await evalJs(`JSON.stringify(__aw.game.scene.getScene('Room').gallery.slots.slice(0, 3).map((s) => ({ state: s.state, hasArt: !!s.art })))`);
  console.log('pipeline states:', pipe);
  await shot('townhall-pipeline.png');

  // ---- Plaza: buildings (old texture) + dressed penguin close-up
  await evalJs(`(() => { __aw.game.scene.getScene('Room').scene.restart({ roomId: 'snowy_plaza' }); return null; })()`);
  await sleep(2000);
  await shot('plaza-wide.png');
  await evalJs(`(() => {
    const s = __aw.game.scene.getScene('Room');
    s.player.setOutfit({ bodyType: 'round', color: '#4aa8ff', eyes: 'eyes_0', face: 'face_blush',
      hat: 'hat_beanie', accessory: 'accessory_scarf', shirt: 'shirt_stripe', pants: 'pants_jeans', shoes: 'shoes_boots' });
    s.cameras.main.setZoom(2.4);
  })()`);
  await sleep(700);
  await shot('penguin-clothed.png');
  await evalJs(`(() => {
    const s = __aw.game.scene.getScene('Room');
    s.player.setOutfit({ bodyType: 'round', color: '#4aa8ff', eyes: 'eyes_0' });
  })()`);
  await sleep(700);
  await shot('penguin-plain.png');
  // chubby body type with clothes, to check the fit under scaling
  await evalJs(`(() => {
    const s = __aw.game.scene.getScene('Room');
    s.player.setOutfit({ bodyType: 'chubby', color: '#ff7a8a', eyes: 'eyes_3', hat: 'hat_earmuffs',
      shirt: 'shirt_puffer', pants: 'pants_snow', shoes: 'shoes_boots', back: 'back_backpack' });
  })()`);
  await sleep(700);
  await shot('penguin-chubby.png');

  console.log('runtime errors:', errors.length ? errors.join('\n') : 'none');
} finally {
  try { await cdp?.('Browser.close'); } catch {}
  socket?.close(); child.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}
