// Phase 22 — the small drawing kit every job module shares. Everything it creates goes through
// sys.keep(...), so a shift's art disappears wholesale the moment the shift ends — win, lose,
// leave the room, it makes no difference. All Phaser-native (graphics + text + tweens), matching
// the hand-drawn look of the rest of the world (see RoomScene.addProp / WorldLayer.addObject).

// A speech bubble anchored above a point (an order at the counter, a fish on the ice…).
// Returns the Phaser text inside; setText() reflows it, the bubble redraws around whatever it says.
export function bubble(sys, x, y, text, opts = {}) {
  const s = sys.scene, w = opts.w || 168;
  const t = s.add.text(x, y - 14, text, {
    fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${opts.size || 13}px`, fontStyle: 'bold',
    color: opts.color || '#16304a', align: 'center', wordWrap: { width: w - 18 },
  }).setOrigin(0.5, 1).setDepth(y + 400);
  const g = s.add.graphics().setDepth(t.depth - 1);
  const tail = s.add.graphics().setDepth(t.depth - 1);
  sys.keep(t); sys.keep(g); sys.keep(tail);
  const draw = () => {
    const b = t.getBounds();
    g.clear(); tail.clear();
    g.fillStyle(0xf4fbff, 0.97); g.fillRoundedRect(b.x - 8, b.y - 6, b.width + 16, b.height + 12, 12);
    g.lineStyle(2.5, 0x5b8bb0, 0.9); g.strokeRoundedRect(b.x - 8, b.y - 6, b.width + 16, b.height + 12, 12);
    tail.fillStyle(0xf4fbff, 0.97); tail.fillTriangle(b.centerX - 7, b.bottom + 5, b.centerX + 7, b.bottom + 5, b.centerX, b.bottom + 16);
  };
  t.redraw = () => { draw(); };
  draw();
  return t;
}

// A pulsing "stand here / aim here" spot on the floor. The world's standing spots are quiet
// trodden ovals, so this is too — just gold and gently breathing.
export function spot(sys, x, y, color = 0xffc247) {
  const s = sys.scene, calm = s.registry.get('reduceMotion');
  const cont = s.add.container(x, y).setDepth(y - 900);
  const ring = s.add.ellipse(0, 0, 96, 44, color, 0.32).setBlendMode(Phaser.BlendModes.ADD);
  const core = s.add.ellipse(0, 0, 54, 24, 0xffffff, 0.22);
  cont.add([ring, core]);
  sys.keep(cont);
  if (!calm) s.tweens.add({ targets: ring, scaleX: 1.25, scaleY: 1.2, alpha: 0.18, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return cont;
}

// A floating icon/emoji (a drink above a table, a parcel over the player's head…).
// Pass follow:'player' to have the kit do the following, or move it yourself in tick().
export function floatIcon(sys, x, y, str, opts = {}) {
  const s = sys.scene, calm = s.registry.get('reduceMotion');
  const t = s.add.text(x, y, str, { fontSize: `${opts.size || 30}px` }).setOrigin(0.5, 1).setDepth((opts.depth ?? y) + 300);
  sys.keep(t);
  if (!calm && !opts.still) s.tweens.add({ targets: t, y: y - 7, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  t.followPlayer = !!opts.followPlayer;
  t.baseY = y;
  return t;
}

// A little arrow that points down at a target from above — "go here next".
export function pointer(sys, x, y, color = 0xffc247) {
  const s = sys.scene, calm = s.registry.get('reduceMotion');
  const g = s.add.graphics().setDepth(y + 800);
  g.fillStyle(color, 0.95); g.fillTriangle(x - 11, y - 96, x + 11, y - 96, x, y - 74);
  sys.keep(g);
  if (!calm) s.tweens.add({ targets: g, y: y + 8, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return g;
}

// The timing bar for press-E-in-the-zone moments (brewing, tightening bolts…).
// The marker sweeps [0..1]; call setZone(x, w) to place the green zone, marker(t) to move it.
export function timingBar(sys, x, y, opts = {}) {
  const s = sys.scene, w = opts.w || 190, h = 18;
  const cont = s.add.container(x, y).setDepth((opts.depth ?? y) + 500);
  const g = s.add.graphics();
  const label = s.add.text(0, -18, opts.label || '', {
    fontFamily: 'Trebuchet MS, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#16304a',
    backgroundColor: '#f4fbffdd', padding: { x: 7, y: 2 },
  }).setOrigin(0.5, 1);
  cont.add([label, g]);
  sys.keep(cont);
  const zone = { x: 0.4, w: 0.24 };
  const api = {
    cont,
    setZone(zx, zw) { zone.x = zx; zone.w = zw; },
    marker: 0,
    draw() {
      g.clear();
      g.fillStyle(0x16304a, 0.85); g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 10);
      g.fillStyle(0xe9f1f8); g.fillRoundedRect(-w / 2, -h / 2, w, h, 7);
      g.fillStyle(0x2f9e5b); g.fillRoundedRect(-w / 2 + zone.x * w, -h / 2, zone.w * w, h, 6);
      g.fillStyle(0x16304a); g.fillCircle(-w / 2 + this.marker * w, 0, h / 2 - 1);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(-w / 2 + this.marker * w - 1.5, -1.5, h / 4 - 1);
    },
    inZone(inner = false) {
      const m = this.marker;
      return inner ? m >= zone.x + zone.w * 0.28 && m <= zone.x + zone.w * 0.72 : m >= zone.x && m <= zone.x + zone.w;
    },
    show(v) { cont.setVisible(!!v); },
  };
  api.draw();
  return api;
}

// A book / parcel / litter-style pickup-able world object: a shadow, some hand-drawn art (a
// callback that draws into a graphics object, same style as RoomScene.addProp) and an optional
// emoji on top. Walkable — the module decides when it can be picked up.
export function prop(sys, x, y, draw, opts = {}) {
  const s = sys.scene;
  const depth = opts.depth ?? y;
  const g = s.add.graphics().setDepth(depth);
  g.fillStyle(0x16304a, 0.16); g.fillEllipse(x, y + 4, (opts.w || 40) * 1.5, 14);   // soft ground shadow
  draw(g, x, y, opts.w || 40, opts.h || 30);
  let icon = null;
  if (opts.icon) icon = s.add.text(x, y - (opts.h || 30) / 2 - 2, opts.icon, { fontSize: `${opts.iconSize || 17}px` }).setOrigin(0.5, 1).setDepth(depth + 1);
  sys.keep(g); if (icon) sys.keep(icon);
  return { g, icon };
}

// Poof! — the standard "it is gone" flourish for a picked-up / cleared / repaired object.
export function poof(sys, x, y, color = 0xffffff) {
  const s = sys.scene;
  if (s.registry.get('reduceMotion')) return;
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const p = s.add.circle(x + (i % 3 - 1) * 8, y - 6 + (Math.floor(i / 3) - 0.5) * 8, 5 + (i % 2) * 3, color, 0.85).setDepth(5000);
    parts.push(p);
    s.tweens.add({ targets: p, x: x + (i % 3 - 1) * 34, y: y - 26 - (i % 2) * 14, scale: 0.2, alpha: 0, duration: 460, ease: 'Quad.Out', onComplete: () => p.destroy() });
  }
}

// Shorthand: a rounded chunk of text used for captions and counters around the shift.
export function note(sys, x, y, str, color = '#16304a', size = 13) {
  const s = sys.scene;
  const t = s.add.text(x, y, str, {
    fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color,
    backgroundColor: '#f4fbffcc', padding: { x: 7, y: 3 },
  }).setOrigin(0.5).setDepth(y + 450);
  sys.keep(t);
  return t;
}
