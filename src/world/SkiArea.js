import { routeFor, sledScore } from './skiAreas.js';
import { toast } from '../ui/hud.js';
import { startRun, submitRun, guestResult } from '../minigames/scoreSystem.js';

// =====================================================================
// PHASE 12 — ski lifts and sled rides, inside the ordinary world rooms.
//
// Deliberately NOT a minigame scene: there is no start screen, no countdown, no arcade frame. You are in a room,
// you walk onto a lift, you ride up, you sled down, and you arrive somewhere else in the world. RoomScene builds
// this from room data exactly like it builds props and portals, and keeps its own update loop running the whole
// time — so multiplayer, outfits, chat and emotes carry on untouched.
//
// Room data:
//   lift: { x, y, label, to, spawn, towers: [[x,y]...], seconds }   -> a boarding station
//   sled: 'slope_forest'                                             -> this room IS a sled route (see skiAreas.js)
// =====================================================================

const SLED_DEPTH = 5000;

export class SkiArea {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.lift = null;          // { zone, ... } boarding station in this room
    this.route = room.sled ? routeFor(room.sled) : null;
    this.mode = 'walk';        // 'walk' | 'lift' | 'sled' | 'done'
    this.sled = null;
    this.bodies = [];          // obstacle/ramp/coin sprites we own, for cleanup
  }

  // ---------------------------------------------------------------
  // build
  // ---------------------------------------------------------------
  build() {
    if (this.room.lift) this.buildLift(this.room.lift);
    if (this.route) this.buildRoute(this.route);
  }

  buildLift(def) {
    const s = this.scene;
    const towers = def.towers || [];
    const g = s.add.graphics().setDepth(-50);

    // cable: a slack line between consecutive towers, drawn behind everything
    g.lineStyle(3, 0x24364a, 0.9);
    for (let i = 0; i < towers.length - 1; i++) {
      const [x1, y1] = towers[i], [x2, y2] = towers[i + 1];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 26;      // sag
      g.beginPath();
      g.moveTo(x1, y1 - 120);
      g.lineTo(mx, my - 120);
      g.lineTo(x2, y2 - 120);
      g.strokePath();
    }

    // towers: a post, a crossbar and a footing shadow. Collidable so you cannot stand inside one.
    for (const [tx, ty] of towers) {
      const t = s.add.graphics().setDepth(ty);
      t.fillStyle(0x16304a, 0.2); t.fillEllipse(tx, ty + 6, 70, 20);
      t.fillStyle(0x59707f); t.fillRect(tx - 9, ty - 150, 18, 150);
      t.fillStyle(0x6f8a9c); t.fillRect(tx - 46, ty - 150, 92, 14);
      t.fillStyle(0xffffff, 0.75); t.fillRect(tx - 46, ty - 152, 92, 5);
      s.walls.add(s.add.rectangle(tx, ty - 6, 26, 22, 0, 0));
    }

    // boarding platform + sign
    const bx = def.x, by = def.y;
    const p = s.add.graphics().setDepth(by);
    p.fillStyle(0x16304a, 0.2); p.fillEllipse(bx, by + 10, 190, 34);
    p.fillStyle(0x6b4428); p.fillRoundedRect(bx - 86, by - 26, 172, 40, 8);
    p.fillStyle(0x8c5a3a); p.fillRoundedRect(bx - 86, by - 32, 172, 12, 6);
    p.fillStyle(0xffffff, 0.85); p.fillRoundedRect(bx - 86, by - 36, 172, 6, 3);

    s.add.text(bx, by - 76, `🚡 ${def.label}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: '#eaf6ff',
      backgroundColor: '#16304acc', padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(by + 1);

    this.lift = { ...def, zone: new Phaser.Geom.Rectangle(bx - 95, by - 40, 190, 90) };
  }

  // Draw the sled course. Everything is a graphics primitive and a plain rectangle hit test —
  // no physics bodies, because a long route with hundreds of colliders is exactly the kind of
  // thing that makes these rooms stutter.
  buildRoute(route) {
    const s = this.scene;

    // trail edges: snowbanks, drawn once into a single graphics object
    const edge = s.add.graphics().setDepth(-900);
    edge.fillStyle(0xdfeefb, 0.9);
    for (const [bx, by] of route.banks) edge.fillEllipse(bx, by, 86, 40);
    edge.fillStyle(0xffffff, 0.55);
    for (const [bx, by] of route.banks) edge.fillEllipse(bx, by - 6, 70, 26);

    // groomed trail surface, a touch brighter than the room floor
    const trail = s.add.graphics().setDepth(-950);
    trail.fillStyle(0xf2fbff, 0.55);
    for (let y = route.startY; y < route.finishY; y += 40) {
      const { cx, half } = route.trailAt(y);
      trail.fillRect(cx - half, y, half * 2, 42);
    }

    // obstacles
    this.obstacles = [];
    const og = s.add.graphics().setDepth(-800);
    for (const o of route.obstacles) {
      if (o.kind === 'tree') {
        og.fillStyle(0x16304a, 0.18); og.fillEllipse(o.x, o.y + 10, 54, 16);
        og.fillStyle(0x6b4428); og.fillRect(o.x - 5, o.y - 10, 10, 22);
        og.fillStyle(0x1f6b4f); og.fillTriangle(o.x, o.y - 74, o.x - 30, o.y - 4, o.x + 30, o.y - 4);
        og.fillStyle(0x2d8a68); og.fillTriangle(o.x, o.y - 96, o.x - 23, o.y - 40, o.x + 23, o.y - 40);
        og.fillStyle(0xffffff, 0.8); og.fillTriangle(o.x, o.y - 96, o.x - 11, o.y - 66, o.x + 11, o.y - 66);
        this.obstacles.push({ x: o.x, y: o.y - 20, rx: 26, ry: 26 });
      } else {
        og.fillStyle(0x16304a, 0.18); og.fillEllipse(o.x, o.y + 8, 62, 18);
        og.fillStyle(0x7d8c97); og.fillEllipse(o.x, o.y - 8, 56, 42);
        og.fillStyle(0xffffff, 0.85); og.fillEllipse(o.x, o.y - 22, 42, 18);
        this.obstacles.push({ x: o.x, y: o.y - 8, rx: 30, ry: 22 });
      }
    }

    // ramps
    this.ramps = [];
    const rg = s.add.graphics().setDepth(-850);
    for (const r of route.ramps) {
      rg.fillStyle(0x16304a, 0.16); rg.fillEllipse(r.x, r.y + 16, 120, 24);
      rg.fillStyle(0xcfe6f5); rg.fillTriangle(r.x - 58, r.y + 18, r.x + 58, r.y + 18, r.x + 58, r.y - 26);
      rg.fillStyle(0xffffff); rg.fillTriangle(r.x - 58, r.y + 12, r.x + 58, r.y + 12, r.x + 58, r.y - 26);
      rg.fillStyle(0x8fd0f0, 0.8); rg.fillRect(r.x - 58, r.y + 12, 116, 6);
      this.ramps.push({ x: r.x, y: r.y, rx: 60, ry: 30, used: false });
    }

    // timing gates
    this.gates = [];
    for (const gt of route.gates) {
      const gg = s.add.graphics().setDepth(-820);
      gg.fillStyle(0xd9546a); gg.fillRect(gt.x - 104, gt.y - 4, 10, 60);
      gg.fillStyle(0x4f9fd8); gg.fillRect(gt.x + 94, gt.y - 4, 10, 60);
      gg.fillStyle(0xffffff, 0.5); gg.fillRect(gt.x - 104, gt.y - 10, 208, 8);
      this.gates.push({ x: gt.x, y: gt.y, passed: false });
    }

    // coins — one graphics object per coin so we can hide them individually on pickup
    this.coins = route.coins.map(([cx, cy]) => {
      const c = this.scene.add.graphics().setDepth(-810);
      c.fillStyle(0xe9a23b); c.fillCircle(cx, cy, 13);
      c.fillStyle(0xffd27a); c.fillCircle(cx - 3, cy - 3, 8);
      return { x: cx, y: cy, g: c, taken: false };
    });

    // finish banner
    const fy = route.finishY;
    const fg = s.add.graphics().setDepth(-700);
    fg.fillStyle(0x2f9e7b, 0.85); fg.fillRect(0, fy, route.w, 10);
    s.add.text(route.w / 2, fy - 34, '🏁 FINISH', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#eaf6ff',
      backgroundColor: '#14543fcc', padding: { x: 14, y: 6 },
    }).setOrigin(0.5).setDepth(-699);
  }

  // ---------------------------------------------------------------
  // lift
  // ---------------------------------------------------------------
  nearLift() {
    if (!this.lift || this.mode !== 'walk') return false;
    const p = this.scene.player;
    return Phaser.Geom.Rectangle.Contains(this.lift.zone, p.x, p.y);
  }

  boardLift() {
    if (!this.nearLift()) return;
    const s = this.scene, def = this.lift, p = s.player;
    this.mode = 'lift';
    s.target = null; s.pendingDoor = null;
    p.move(0, 0);
    p.hitbox.body.enable = false;

    const towers = def.towers || [];
    const pts = towers.length >= 2 ? towers : [[def.x, def.y], [def.x, def.y - 600]];
    const seconds = def.seconds || 7;

    // the chair: a hanger, a seat and a safety bar, so the ride reads as a real lift
    const chair = s.add.graphics().setDepth(SLED_DEPTH);
    const drawChair = (x, y) => {
      chair.clear();
      chair.lineStyle(3, 0x24364a, 1); chair.lineBetween(x, y - 118, x, y - 46);
      chair.fillStyle(0x4f9fd8); chair.fillRoundedRect(x - 28, y - 46, 56, 10, 4);
      chair.fillStyle(0x3b7fae); chair.fillRoundedRect(x - 28, y - 14, 56, 12, 4);
      chair.fillStyle(0x6f8a9c); chair.fillRect(x - 30, y - 34, 60, 5);
    };

    const ride = { t: 0 };
    toast('🚡 Riding up — enjoy the view');
    s.game.events.emit('door-prompt', '');

    s.tweens.add({
      targets: ride, t: 1, duration: seconds * 1000, ease: 'Sine.InOut',
      onUpdate: () => {
        const n = pts.length - 1;
        const f = Phaser.Math.Clamp(ride.t, 0, 0.9999) * n;
        const i = Math.floor(f), k = f - i;
        const [x1, y1] = pts[i], [x2, y2] = pts[Math.min(i + 1, n)];
        const x = Phaser.Math.Linear(x1, x2, k);
        const y = Phaser.Math.Linear(y1, y2, k) - 120 + Math.sin(ride.t * Math.PI * 6) * 3;  // gentle sway
        drawChair(x, y);
        p.setPosition(x, y - 6);
        p.hitbox.setPosition(x, y - 6);
      },
      onComplete: () => {
        chair.destroy();
        this.mode = 'done';
        s.leaving = true;
        s.cameras.main.fadeOut(260);
        s.cameras.main.once('camerafadeoutcomplete', () =>
          s.scene.restart({ roomId: def.to, from: s.roomId }));
      },
    });
  }

  // ---------------------------------------------------------------
  // sled
  // ---------------------------------------------------------------
  startSled() {
    const s = this.scene, route = this.route;
    if (!route || this.mode === 'sled') return;
    this.mode = 'sled';
    this.sled = { vx: 0, vy: 120, coins: 0, hits: 0, t0: s.time.now, invuln: 0, sessionId: null, airT: 0 };

    s.player.hitbox.body.enable = false;              // we drive the transform ourselves
    s.player.setPosition(route.trailAt(route.startY).cx, route.startY);

    // the sled under the player
    this.board = s.add.graphics().setDepth(SLED_DEPTH - 1);

    // server-timed session, same call the arcade uses. Guests simply skip it.
    const guest = !!this.scene.registry.get('profile')?.guest;
    if (!guest) {
      startRun(route.id).then((r) => { if (this.sled) this.sled.sessionId = r?.session_id ?? r?.id ?? null; })
        .catch(() => {});
    }

    toast('🛷 Steer with A / D — reach the bottom!');
  }

  updateSled(delta) {
    const s = this.scene, route = this.route, sl = this.sled, p = s.player;
    const dt = Math.min(delta, 50) / 1000;
    const k = s.keys;

    // steering + gravity down the fall line
    const steer = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    sl.vx = Phaser.Math.Linear(sl.vx, steer * route.steer, 0.16);
    sl.vy = Math.min(route.maxSpeed, sl.vy + route.accel * dt);

    let nx = p.x + sl.vx * dt;
    const ny = p.y + sl.vy * dt;

    // trail edges push you back instead of hard-stopping — hitting the bank costs speed
    const { cx, half } = route.trailAt(ny);
    const limit = half - 26;
    if (nx < cx - limit) { nx = cx - limit; sl.vx = Math.abs(sl.vx) * 0.3; sl.vy *= 0.97; }
    if (nx > cx + limit) { nx = cx + limit; sl.vx = -Math.abs(sl.vx) * 0.3; sl.vy *= 0.97; }

    p.setPosition(nx, ny);
    p.hitbox.setPosition(nx, ny);
    p.dir = sl.vx > 30 ? 'right' : sl.vx < -30 ? 'left' : 'down';
    p.moving = true;

    if (sl.invuln > 0) sl.invuln -= delta;
    if (sl.airT > 0) sl.airT -= delta;

    // --- ramps ---
    for (const r of this.ramps) {
      if (Math.abs(ny - r.y) < r.ry && Math.abs(nx - r.x) < r.rx) {
        if (!r.used) {
          r.used = true;
          sl.vy = Math.min(route.maxSpeed + 120, sl.vy + 150);
          sl.airT = 620; sl.invuln = 620;
          p.hop();
          s.cameras.main.shake(90, 0.003);
        }
      }
    }

    // --- obstacles (skipped while airborne) ---
    if (sl.airT <= 0 && sl.invuln <= 0) {
      for (const o of this.obstacles) {
        if (Math.abs(ny - o.y) < o.ry && Math.abs(nx - o.x) < o.rx) {
          sl.hits++;
          sl.vy *= 0.42;
          sl.vx *= -0.5;
          sl.invuln = 700;
          s.cameras.main.shake(140, 0.008);
          s.cameras.main.flash(90, 255, 180, 180);
          break;
        }
      }
    }

    // --- coins ---
    for (const c of this.coins) {
      if (c.taken) continue;
      if (Math.abs(ny - c.y) < 30 && Math.abs(nx - c.x) < 30) {
        c.taken = true; c.g.setVisible(false); sl.coins++;
      }
    }

    // --- gates ---
    for (const g of this.gates) {
      if (!g.passed && ny > g.y) { g.passed = true; sl.vy = Math.min(route.maxSpeed, sl.vy + 25); }
    }

    // sled graphic under the player, tilted into the turn
    const lean = Phaser.Math.Clamp(sl.vx / route.steer, -1, 1);
    const lift = sl.airT > 0 ? 10 : 0;
    this.board.clear();
    this.board.fillStyle(0x16304a, 0.22);
    this.board.fillEllipse(nx, ny + 16, 56, 14);
    this.board.fillStyle(0xb5703f);
    this.board.fillRoundedRect(nx - 26, ny + 4 - lift, 52, 12, 5);
    this.board.fillStyle(0x8c5a3a);
    this.board.fillRoundedRect(nx - 26 + lean * 5, ny + 12 - lift, 52, 5, 3);

    // live HUD line, reusing the existing prompt channel rather than a new overlay
    const secs = (s.time.now - sl.t0) / 1000;
    s.game.events.emit('door-prompt',
      `🛷 ${sl.coins} coins · ${secs.toFixed(1)}s · ${Math.round(sl.vy)} km/h`);

    if (ny >= route.finishY) this.finishSled(secs);
  }

  async finishSled(seconds) {
    const s = this.scene, route = this.route, sl = this.sled;
    if (this.mode !== 'sled') return;
    this.mode = 'done';
    this.board?.destroy();
    s.game.events.emit('door-prompt', '');

    const score = sledScore({ coins: sl.coins, seconds, hits: sl.hits, par: route.par });

    // personal best time, kept locally — a time is not a score and does not belong in the leaderboard table
    const bestKey = `aw:besttime:${route.id}`;
    const prev = parseFloat(localStorage.getItem(bestKey) || '0');
    const isBest = !prev || seconds < prev;
    if (isBest) localStorage.setItem(bestKey, seconds.toFixed(2));

    // reuse the existing scoring path; the server decides the coin payout, exactly as the arcade does
    let coinsEarned = 0;
    try {
      if (sl.sessionId) {
        const res = await submitRun({
          sessionId: sl.sessionId, gameId: route.id, score,
          durationMs: Math.round(seconds * 1000),
          stats: { coins: sl.coins, hits: sl.hits, seconds: +seconds.toFixed(2) },
        });
        coinsEarned = res?.coins_awarded ?? 0;
      } else {
        coinsEarned = guestResult(route.id, score)?.coins ?? 0;
      }
    } catch { /* offline or game not registered yet: the run still counts locally */ }

    const bestLine = isBest ? ' · 🏅 new best time!' : '';
    toast(`🏁 ${seconds.toFixed(1)}s · ${sl.coins} coins · ${score} pts${coinsEarned ? ` · +${coinsEarned} 🪙` : ''}${bestLine}`);

    s.leaving = true;
    s.cameras.main.fadeOut(300);
    s.cameras.main.once('camerafadeoutcomplete', () =>
      s.scene.restart({ roomId: route.to, from: s.roomId }));
  }

  // ---------------------------------------------------------------
  // per-frame hook. Returns true when it has taken over player control.
  // ---------------------------------------------------------------
  update(time, delta) {
    if (this.mode === 'lift' || this.mode === 'done') return true;

    if (this.mode === 'sled') { this.updateSled(delta); return true; }

    // In a slope room you can still walk about at the top; pushing off starts the run.
    // Returning false keeps normal movement alive, so the gate never feels like a cutscene.
    if (this.route) {
      const k = this.scene.keys;
      if (k.S.isDown || k.DOWN.isDown) { this.startSled(); return true; }
      return false;
    }

    return false;
  }

  // A prompt for RoomScene to show when no door is in range.
  hint() {
    if (this.mode === 'sled' || this.mode === 'lift' || this.mode === 'done') return null;
    if (this.nearLift()) return `Press E to ride the ${this.lift.label}`;
    if (this.route) return '🛷 Press S / ↓ to push off';
    return null;
  }

  destroy() {
    this.board?.destroy();
    this.coins?.forEach((c) => c.g.destroy());
  }
}
