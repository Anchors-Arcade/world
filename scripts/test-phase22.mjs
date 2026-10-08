// node scripts/test-phase22.mjs : end-to-end Phase 22 job test, in a real headless browser.
// Serves the BUILT dist/ (exactly what GitHub Pages will ship), enters as a guest, and drives
// every job from start → gameplay → completion → result: the worldDialog offer card and its
// "Start shift" button for one job, the job-start event for the rest, then the actual gameplay
// (teleporting the player and pressing E exactly the way a player would) until each shift pays.
// Guests skip the server, so the run asserts the guest result path; the paid path is the same
// Phase 7 pipeline the arcade games already use in production.
//
// Needs a Chrome/Chromium on PATH or at the usual Windows location (same as smoke-pages-browser).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// pick a free port every run: a leftover preview server from an aborted earlier run must never
// silently answer for us (vite --strictPort exits, and the poll would hit the stale server)
const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  srv.on('error', reject);
});
const PORT = await freePort();

// ---------- 1. serve the built dist/ ----------
// NB: spawn the vite CLI through node itself — Node ≥ 18.20/24 on Windows refuses to launch
// .cmd shims like npx.cmd without a shell (CVE-2024-27980 hardening), which throws EINVAL.
// --host 127.0.0.1 pins IPv4: vite may otherwise bind ::1 only, which the poll below cannot reach.
const serverOut = [];
const server = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', `--port=${PORT}`, '--strictPort', '--host', '127.0.0.1'], { cwd: root });
server.stdout.on('data', (d) => serverOut.push(String(d)));
server.stderr.on('data', (d) => serverOut.push(String(d)));
const up = async () => { for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); return true; } catch { await new Promise((r) => setTimeout(r, 250)); } } return false; };
if (!await up()) { server.kill(); throw new Error('vite preview never came up on :' + PORT + '\n  ' + (serverOut.join('').trim() || '(no output — is dist/ built?)')); }

// ---------- 2. headless Chrome over CDP ----------
const candidates = [
  process.env.CHROME_BIN, process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const browser = candidates.find((c) => existsSync(c)) || candidates.find((c) => c.startsWith('/'));
const profileDir = mkdtempSync(path.join(os.tmpdir(), 'anchors-jobs-'));
const child = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-extensions',
  '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, `http://127.0.0.1:${PORT}/`,
], { stdio: 'ignore' });
const exited = new Promise((resolve) => child.once('exit', resolve));
let socket;
const errors = [];
try {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + 15000;
  while (!existsSync(portFile) && Date.now() < deadline && child.exitCode === null) await new Promise((r) => setTimeout(r, 100));
  assert.ok(existsSync(portFile), 'Chrome did not start its DevTools endpoint');
  const port = Number(readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes(`127.0.0.1:${PORT}`));
  assert.ok(page, 'Chrome did not open the preview');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0; const pending = new Map();
  socket.addEventListener('message', (event) => {
    const m = JSON.parse(event.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  await cdp('Runtime.enable');
  const run = async (expression) => {
    const out = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (out.result.exceptionDetails) throw new Error(out.result.exceptionDetails.exception?.description || 'page-side error');
    return out.result.result.value;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- 3. guest enters the world ----------
  let guestButtonReady = false;
  for (let i = 0; i < 300 && !guestButtonReady; i++) { await sleep(100); guestButtonReady = await run(`Boolean(document.querySelector('#g'))`); }
  if (!guestButtonReady) {
    const diag = await run(`JSON.stringify({ err: document.querySelector('.startup-error')?.textContent || null, body: document.body.children.length, title: document.title })`);
    assert.ok(false, `title screen did not render its guest-play button: ${diag}`);
  }
  await run(`document.querySelector('#g').click()`);
  for (let i = 0; i < 120; i++) {
    if (await run(`Boolean(__aw?.game?.scene?.getScene?.('Room')?.player)`)) break;
    await sleep(250);
  }
  assert.ok(await run(`Boolean(__aw.game.scene.getScene('Room').player)`), 'guest flow never entered the world');
  assert.equal(await run(`document.querySelector('.startup-error')?.textContent || null`), null, 'bootstrap reported a startup failure');

  // ---------- 4. page-side driver helpers + result collectors ----------
  await run(`(() => {
    window.RESULTS = []; window.HUDS = 0; window.PANELS = 0; window.TOASTS = [];
    const g = __aw.game;
    g.events.on('job-result', (r) => window.RESULTS.push({ id: r.job.id, points: r.points, guest: !!r.out.guest, coins: r.out.coins || 0 }));
    g.events.on('job-hud', (d) => { if (d.on) window.HUDS++; });
    g.events.on('job-panel', (d) => { if (d.on) window.PANELS++; });
    const ui = document.getElementById('ui');
    new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.classList?.contains('toast')) window.TOASTS.push(n.textContent); }).observe(ui, { childList: true });
    window.T = {
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      scene: () => __aw.game.scene.getScene('Room'),
      tp(x, y) { T.scene().player.setPosition(x, y); },
      E() { const j = T.scene().jobs; return j.active ? j.active.job.onE(j) : false; },
      async goto(room) {
        if (T.scene().roomId === room) return;
        T.scene().scene.restart({ roomId: room });
        for (let i = 0; i < 100; i++) { await T.sleep(100); const s = T.scene(); if (s.roomId === room && s.player && s.jobs) return; }
        throw new Error('room never loaded: ' + room);
      },
      async start(jobId) {
        __aw.game.events.emit('job-start', jobId);
        for (let i = 0; i < 100; i++) { await T.sleep(50); if (T.scene().jobs.active) return; }
        throw new Error('shift never began: ' + jobId);
      },
      async done() {
        for (let i = 0; i < 300; i++) { await T.sleep(100); if (!T.scene().jobs.active) return; }
        throw new Error('shift never finished');
      },
    };
    return true;
  })()`);

  // ---------- 5. drive all 8 jobs ----------
  const shift = {                                 // each driver: teleports + E presses, exactly what a player does
    // started via the board's dialog card — the full discovery path a player uses
    cleanup: `(async () => {
      await T.goto('snowy_plaza');
      const door = T.scene().doors.find((d) => d.action === 'world:job_cleanup');
      if (!door) throw new Error('the cleanup board is not in the world');
      __aw.game.events.emit('world-interact', door.world);
      for (let i = 0; i < 50 && !document.querySelector('.wd-go'); i++) await T.sleep(50);
      const btn = document.querySelector('.wd-go');
      if (!btn) throw new Error('the board dialog had no Start shift button');
      btn.click();
      for (let i = 0; i < 50; i++) { await T.sleep(50); if (T.scene().jobs.active) break; }
      if (!T.scene().jobs.active) throw new Error('the Start shift button did not start the shift');
      if (document.querySelector('.wd-go')) throw new Error('the dialog is still open after starting');
      for (let g = 0; g < 40 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (st.carry.length >= 3 || !st.items.some((i) => !i.gone)) { T.tp(620, 700); T.E(); }
        else { const it = st.items.find((i) => !i.gone); T.tp(it.x, it.y + 20); T.E(); }
        await T.sleep(40);
      }
      await T.done();
      return true;
    })()`,
    delivery: `(async () => {
      await T.start('delivery');
      for (let g = 0; g < 30 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (!st.carry) { T.tp(615, 640); T.E(); }
        else { T.tp(st.dest.x, st.dest.y + 24); T.E(); }
        await T.sleep(40);
      }
      await T.done();
      return true;
    })()`,
    maintenance: `(async () => {
      await T.start('maintenance');
      for (let g = 0; g < 900 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (st.repair) { if (st.repair.inZone(true)) T.E(); await T.sleep(10); }
        else { const it = st.items.find((i) => !i.fixed); if (it) { T.tp(it.x, it.y + 40); T.E(); } await T.sleep(30); }
      }
      await T.done();
      return true;
    })()`,
    tour: `(async () => {
      await T.start('tour');
      for (let g = 0; g < 30 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        T.tp(st.dest.x, st.dest.y + 24);
        for (let i = 0; i < 200; i++) { if (Math.hypot(st.tourist.x - st.dest.x, st.tourist.y - st.dest.y) < 100) break; await T.sleep(50); }
        T.E();
        await T.sleep(80);
      }
      await T.done();
      return true;
    })()`,
    fishing: `(async () => {
      await T.goto('frozen_lake');
      await T.start('fishing');
      for (let g = 0; g < 600 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (!st.cast) { const h = st.spots.find((x) => x.open); if (h) { T.tp(h.x, h.y + 24); T.E(); } await T.sleep(40); }
        else if (st.cast.phase === 'bite') { T.E(); await T.sleep(40); }
        else await T.sleep(20);
      }
      await T.done();
      return true;
    })()`,
    snow: `(async () => {
      await T.goto('mountain_village');
      await T.start('snow');
      const piles = T.scene().jobs.active.st.piles;
      for (const p of piles) {
        if (!T.scene().jobs.active) break;
        T.tp(p.x, p.y + 30);
        T.scene().keys.E.isDown = true;
        for (let i = 0; i < 300 && !p.cleared; i++) await T.sleep(30);
        T.scene().keys.E.isDown = false;
        if (!p.cleared) throw new Error('a snow pile never cleared');
      }
      await T.done();
      return true;
    })()`,
    cafe: `(async () => {
      await T.goto('cafe');
      await T.start('cafe');
      for (let g = 0; g < 400 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (st.state === 'await') { T.tp(500, 544); T.E(); await T.sleep(30); }
        else if (st.state === 'mixing') { for (const ing of st.drink.ings) __aw.game.events.emit('job-panel-click', ing); await T.sleep(30); }
        else if (st.state === 'brewing') { if (st.brew && st.brew.inZone(true)) T.E(); await T.sleep(10); }
        else if (st.state === 'carrying') { const seat = st.tableArt.seat; T.tp(seat.x, seat.y + 24); T.E(); await T.sleep(30); }
      }
      await T.done();
      return true;
    })()`,
    library: `(async () => {
      await T.goto('library');
      await T.start('library');
      for (let g = 0; g < 60 && T.scene().jobs.active; g++) {
        const st = T.scene().jobs.active.st;
        if (!st.carry) { T.tp(535, 560); T.E(); }
        else { T.tp(st.book.x, st.book.y + 40); T.E(); }
        await T.sleep(40);
      }
      await T.done();
      return true;
    })()`,
  };

  const expect = {                       // every shift's points, worked out from the module's scoring
    cleanup: 120,                        // 8 binned × 10 + 40 all-clear bonus
    delivery: 120,                        // 4 legs × 30 (all inside the fast-par)
    maintenance: 150,                    // 9 bolts × 15 perfect + 3 × 5 finished repair
    tour: [90, 110],                     // 3 stops × 30 + tip if inside the par window
    fishing: [64, 152],                  // 4 perfect catches × (fish value + 8)
    snow: 120,                           // 5 piles × 20 + 20 all-lanes bonus
    cafe: 120,                           // 4 serves × (20 + 10 perfect pour)
    library: 120,                        // 5 books × 18 + 30 librarian bonus
  };

  const order = ['cleanup', 'delivery', 'maintenance', 'tour', 'fishing', 'snow', 'cafe', 'library'];
  let n = 0;
  for (const id of order) {
    const t0 = Date.now();
    assert.ok(await run(shift[id]), `${id}: the driver bailed`);
    const r = await run(`window.RESULTS[window.RESULTS.length - 1]`);
    assert.equal(r?.id, id, `${id}: wrong/missing job-result — got ${JSON.stringify(r)}`);
    assert.equal(r.guest, true, `${id}: guest run came back non-guest`);
    const want = expect[id];
    if (Array.isArray(want)) assert.ok(r.points >= want[0] && r.points <= want[1], `${id}: points ${r.points} outside [${want[0]}, ${want[1]}]`);
    else assert.equal(r.points, want, `${id}: points`);
    n++;
    console.log(`ok - ${id}: shift complete, ${r.points} points, paid out as a guest result (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  // ---------- 6. the shift reached the UI and the world still works ----------
  assert.equal(await run(`window.RESULTS.length`), 8, 'expected exactly 8 job results');
  assert.ok(await run(`window.HUDS > 10`), 'the job HUD never rendered shift state');
  assert.ok(await run(`window.PANELS > 0`), 'the café ingredient strip never appeared');
  assert.ok(await run(`!document.querySelector('.jobhud').classList.contains('on')`), 'the job HUD stayed on screen after the shifts');
  assert.ok(await run(`window.TOASTS.some((t) => t.includes('complete'))`), 'no completion toast was ever shown');
  // the player can still walk: input, physics and the avatar loop survived 8 shifts + 5 room loads
  await run(`(async () => {
    const s = T.scene();
    s.player.setPosition(900, 620); s.keys.W.isDown = true;
    await T.sleep(500); s.keys.W.isDown = false;
    return true;
  })()`);
  const walked = await run(`T.scene().player.y`);
  assert.ok(walked < 620, `the player did not walk after the shifts (y=${walked})`);
  console.log(`ok - the world still works: HUD panels shown, toasts fired, player walks (y=${walked})`);
  assert.deepEqual(errors, [], `browser reported runtime errors:\n${errors.join('\n')}`);
  console.log(`\n${n} shifts passed end-to-end`);
} finally {
  // on Windows a plain kill() only orphans the grandchildren, taking the port with it
  const tree = (p) => { if (p.exitCode === null) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }); };
  if (process.platform !== 'win32') { child.kill(); server.kill(); }
  else { tree(child); tree(server); }
  await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
  socket?.close();
  try { rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
}
