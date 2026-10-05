import { interactionsIn } from './interactions.js';
import { RARITY } from './collectibles.js';

// Phase 8 — everything exploration-related inside ONE room, built when the room is entered and thrown away when it
// is left. Nothing is loaded for rooms you are not standing in, there is no polling and no extra realtime channel.
//
// It adds two kinds of thing to the room the scene already built:
//   * interactive objects (src/world/interactions.js) — registered in the scene's existing `doors` list with an
//     action of `world:<id>`, so the E prompt, the click-to-walk handler and the mobile tap all work unchanged.
//   * collectibles — floating sparkles for the items the server says are still uncollected here; walking into one
//     collects it through ExplorationState (the server decides the reward).
const PICKUP = 46;

export class WorldLayer {
  constructor(scene, exploration) {
    this.scene = scene; this.ex = exploration; this.roomId = scene.roomId;
    this.sprites = new Map();          // collectible id -> container
    this.marks = new Map();            // interaction id -> { glow, label } (so a solved clue can dim)
    this.busy = new Set();             // collectibles mid-request: never sent twice
    this.destroyed = false;

    this.buildInteractions();
    this.syncCollectibles();
    this.off = this.ex.on((ev) => this.onExploration(ev));
  }

  // ---------- interactive objects ----------
  buildInteractions() {
    for (const o of interactionsIn(this.roomId)) this.addObject(o);
  }

  addObject(o) {
    const s = this.scene, { x, y, w, h } = o, cx = x + w / 2, cy = y + h / 2;
    const solved = o.secret && this.ex.hasClue(o.secret, o.clue);
    const depth = y + h;

    if (o.flat) {                                        // a mark on the floor (a bubble in the ice, a cut hole)
      const e = s.add.ellipse(cx, cy, w, h, o.color ?? 0xbfe8fb, 0.75).setStrokeStyle(3, 0xffffff, 0.8).setDepth(-940);
      this.marks.set(o.id, { art: e });
    } else {
      const g = s.add.graphics().setDepth(depth);
      g.fillStyle(0x16304a, 0.18); g.fillEllipse(cx, y + h + 3, w + 18, 20);
      g.fillStyle(o.color ?? 0x8c5a3a); g.fillRoundedRect(x, y, w, h, 10);
      g.fillStyle(0xffffff, 0.22); g.fillRoundedRect(x + 4, y + 4, w - 8, Math.max(8, h * 0.28), 8);
      g.lineStyle(3, 0x16304a, 0.35); g.strokeRoundedRect(x, y, w, h, 10);
      g.fillStyle(0xffffff); g.fillEllipse(cx, y + 2, w * 0.86, 13);                       // a cap of snow on everything outdoors
      g.fillStyle(0x16304a, 0.1); g.fillRoundedRect(x + 4, y + h - 12, w - 8, 10, 5);      // base shadow
      s.add.text(cx, cy + 4, o.icon || '❔', { fontSize: `${Math.min(40, Math.max(24, h * 0.62))}px` }).setOrigin(0.5).setDepth(depth + 1);
      if (!o.walkable) s.walls.add(s.add.rectangle(cx, cy, w, h, 0, 0));
      this.marks.set(o.id, { art: g });
    }

    // A clue object glows until its clue has been found, so exploring feels guided but never automatic.
    if (o.secret) {
      const glow = s.add.rectangle(cx, cy, w + 26, h + 26, 0xffc247, solved ? 0.06 : 0.22).setDepth(depth - 2);
      if (!solved && !s.registry.get('reduceMotion')) {
        s.tweens.add({ targets: glow, alpha: 0.07, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      this.marks.get(o.id).glow = glow;
    }

    const zone = new Phaser.Geom.Rectangle(cx - Math.min(80, w / 2 + 20), y + h + 2, Math.min(170, w + 40), 54);
    s.add.rectangle(zone.centerX, zone.centerY, zone.width, zone.height, 0xffc247, 0.12).setStrokeStyle(2, 0xffc247, 0.45).setDepth(-930);
    s.doors.push({
      label: o.label, action: `world:${o.id}`, verb: 'look at', world: o,
      zone, body: new Phaser.Geom.Rectangle(x, y, w, h), below: true,
    });
  }

  // Dim a clue object once its clue is in the journal.
  markSolved(id) {
    const m = this.marks.get(id); if (!m?.glow) return;
    this.scene.tweens.killTweensOf(m.glow);
    m.glow.setAlpha(0.06);
  }

  // ---------- collectibles ----------
  syncCollectibles() {
    if (this.destroyed) return;
    const wanted = new Map(this.ex.pendingIn(this.roomId).map((c) => [c.id, c]));
    for (const [id, cont] of this.sprites) if (!wanted.has(id)) { cont.destroy(); this.sprites.delete(id); }
    for (const [id, c] of wanted) if (!this.sprites.has(id)) this.sprites.set(id, this.addCollectible(c));
  }

  addCollectible(c) {
    const s = this.scene, tint = RARITY[c.rarity]?.glow ?? 0xffffff, calm = s.registry.get('reduceMotion');
    const cont = s.add.container(c.x, c.y).setDepth(c.y + 2);
    const halo = s.add.image(0, 0, 'sparkle').setTint(tint).setAlpha(0.35).setScale(1.9);
    const star = s.add.image(0, 0, 'sparkle').setTint(tint);
    const shadow = s.add.ellipse(0, 16, 26, 10, 0x16304a, 0.18);
    cont.add([shadow, halo, star]);
    if (!calm) {
      s.tweens.add({ targets: cont, y: c.y - 9, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      s.tweens.add({ targets: star, angle: 360, duration: 6000, repeat: -1 });
      s.tweens.add({ targets: halo, scale: 2.5, alpha: 0.12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    cont.setData('c', c);
    return cont;
  }

  // Called from the scene's update loop: a handful of distance checks, no physics bodies.
  update() {
    if (this.destroyed || !this.sprites.size) return;
    const p = this.scene.player;
    for (const [id, cont] of this.sprites) {
      const c = cont.getData('c');
      if (this.busy.has(id)) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) > PICKUP) continue;
      this.busy.add(id);
      this.pop(cont);
      this.sprites.delete(id);
      this.ex.collect(id).finally(() => this.busy.delete(id));
    }
  }

  pop(cont) {
    const s = this.scene;
    if (s.registry.get('reduceMotion')) return cont.destroy();
    s.tweens.add({ targets: cont, y: cont.y - 46, alpha: 0, scale: 1.7, duration: 420, ease: 'Quad.Out', onComplete: () => cont.destroy() });
  }

  // ---------- reacting to exploration changes ----------
  onExploration(ev) {
    if (this.destroyed) return;
    if (ev.type === 'loaded' || ev.type === 'changed') { this.syncCollectibles(); this.revealPortals(); return; }
    if (ev.type === 'clue') {
      const o = interactionsIn(this.roomId).find((x) => x.secret === ev.secret && ev.clue === x.clue);
      if (o) this.markSolved(o.id);
      if (ev.just_discovered) { this.syncCollectibles(); this.revealPortals(); }
    }
  }

  // A secret room's entrance appears the moment its secret is discovered, without reloading the room.
  revealPortals() {
    for (const p of this.scene.room.portals || []) {
      if (!p.secret || this.scene.secretPortals?.has(p.to)) continue;
      if (!this.scene.secretOpen(p)) continue;              // unlocked room OR the secret itself being found
      this.scene.addSecretPortal(p);
    }
  }

  destroy() {
    this.destroyed = true; this.off?.();
    for (const cont of this.sprites.values()) cont.destroy();
    this.sprites.clear(); this.marks.clear(); this.busy.clear();
  }
}
