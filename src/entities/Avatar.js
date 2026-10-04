import { SPEED } from '../config/game.js';
import { SLOTS, LAYOUT, BODY_TYPES, normalizeAvatar } from '../shops/items.js';
import { EMOTE_BY_KEY, EMOTE_MS } from '../social/emotes.js';

// Layered avatar. Draw order (back -> front):
// back, feet, body(tinted), pants, belly, shirt, accessory, eyes, beak, face, hat, hand.
// Every cosmetic is a separate sprite, so outfits are just texture keys. `remote` avatars have no physics
// and glide toward network targets instead of being driven by input.
export class Avatar {
  constructor(scene, x, y, data, name, { remote = false } = {}) {
    this.scene = scene; this.dir = 'down'; this.moving = false; this.remote = remote;
    this.tx = x; this.ty = y; this.remoteMoving = false; this._dir = null;
    this.fx = { dy: 0, rot: 0, sy: 1 };                 // emote body offsets, tweened; update() adds them on top of walking
    this.bubble = null; this.bubbleTimer = null; this.emoteIcon = null; this.emoteTimer = null; this.emoteTweens = [];

    this.hitbox = scene.add.rectangle(x, y, 26, 14, 0x000000, 0);
    if (!remote) { scene.physics.add.existing(this.hitbox); this.hitbox.body.setCollideWorldBounds(true); }

    this.shadow = scene.add.ellipse(x, y, 36, 12, 0x1b3350, 0.25);
    const img = (key) => scene.add.image(0, 0, key);
    this.s = {};
    for (const slot of SLOTS) if (slot !== 'shoes') this.s[slot] = img('av_belly').setVisible(false);
    this.feetL = img('av_foot'); this.feetR = img('av_foot');
    this.body = img('av_body'); this.belly = img('av_belly'); this.beak = img('av_beak');
    const s = this.s;
    this.root = scene.add.container(x, y, [s.back, this.feetL, this.feetR, this.body, s.pants, this.belly, s.shirt, s.accessory, s.eyes, this.beak, s.face, s.hat, s.hand]);
    this.label = scene.add.text(x, y, name, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#16304a', strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(1e6);
    this.setOutfit(data);
  }

  get x() { return this.hitbox.x; }
  get y() { return this.hitbox.y; }

  setOutfit(data) {
    const d = (this.data = normalizeAvatar(data));
    const [sx, sy] = BODY_TYPES[d.bodyType];
    this.body.setTint(Phaser.Display.Color.HexStringToColor(d.color).color).setScale(sx, sy).setY(-2 - 24 * sy);
    this.headDy = -48 * (sy - 1);                       // heads move with the body's height
    for (const slot of SLOTS) {
      if (slot === 'shoes') continue;
      const spr = this.s[slot];
      if (d[slot]) spr.setTexture(d[slot]).setVisible(true); else spr.setVisible(false);
    }
    const shoe = d.shoes || 'av_foot';
    this.feetL.setTexture(shoe); this.feetR.setTexture(shoe);
    this._dir = null;                                    // force a layout refresh
  }

  move(vx, vy) {
    const len = Math.hypot(vx, vy);
    if (len > 0) { vx = (vx / len) * SPEED; vy = (vy / len) * SPEED; }
    this.hitbox.body.setVelocity(vx, vy);
    this.moving = len > 0;
    if (this.moving) this.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
  }

  setRemoteTarget(x, y, dir, moving) { this.tx = x; this.ty = y; if (dir) this.dir = dir; this.remoteMoving = !!moving; }

  update(time, reduceMotion = false, delta = 16) {
    if (this.remote) {                                    // exponential smoothing: no teleporting between packets
      const dx = this.tx - this.hitbox.x, dy = this.ty - this.hitbox.y;
      if (Math.hypot(dx, dy) > 500) { this.hitbox.x = this.tx; this.hitbox.y = this.ty; }
      else { const k = 1 - Math.exp(-14 * (delta / 1000)); this.hitbox.x += dx * k; this.hitbox.y += dy * k; }
      this.moving = this.remoteMoving || Math.hypot(dx, dy) > 2;
    }
    const { x, y } = this.hitbox, t = time, d = this.dir;
    const bob = this.moving && !reduceMotion ? -Math.abs(Math.sin(t * 0.016)) * 4 : 0;
    const sway = this.moving && !reduceMotion ? Math.sin(t * 0.016) * 0.09 : 0;
    this.root.setPosition(x, y + bob + this.fx.dy).setRotation(sway + this.fx.rot).setScale(1, this.fx.sy).setDepth(y);
    this.shadow.setPosition(x, y - 2).setDepth(y - 1);
    this.label.setPosition(x, y - 78 + (this.headDy || 0));
    if (this.emoteIcon) this.emoteIcon.setPosition(x, this.label.y - 20);
    if (this.bubble) this.bubble.setPosition(x, this.label.y - 20 - (this.emoteIcon ? 44 : 0));
    const step = this.moving && !reduceMotion ? Math.sin(t * 0.016) * 4 : 0;
    this.feetL.setPosition(-8, -4 - step); this.feetR.setPosition(8, -4 + step);

    if (d === this._dir) return;                          // layout only changes when facing changes
    this._dir = d;
    const back = d === 'up', side = d === 'left' ? -1 : d === 'right' ? 1 : 0, hy = this.headDy || 0, s = this.s;
    s.back.setPosition(LAYOUT.back.x, LAYOUT.back.y);
    s.pants.setPosition(0, LAYOUT.pants.y); s.shirt.setPosition(0, LAYOUT.shirt.y);
    this.belly.setPosition(side * 3, -20).setVisible(!back);
    s.accessory.setPosition(0, LAYOUT.accessory.y + hy * 0.3);
    s.eyes.setPosition(side * 8, LAYOUT.eyes.y + hy).setVisible(!back);
    this.beak.setPosition(side * 8, -28 + hy).setVisible(!back);
    s.face.setPosition(side * 8, LAYOUT.face.y + hy).setVisible(!back && !!this.data.face);
    s.hat.setPosition(side * 2, LAYOUT.hat.y + hy);
    s.hand.setPosition(side === -1 ? -LAYOUT.hand.x : LAYOUT.hand.x, LAYOUT.hand.y);
    if (back) this.root.bringToTop(s.back); else this.root.sendToBack(s.back);
  }

  // ---------- Phase 6: speech bubble + emotes (visual only; nothing here touches the network) ----------
  say(text, ms) {
    if (this.bubble) { this.bubble.destroy(); clearTimeout(this.bubbleTimer); }
    this.bubble = this.scene.add.text(this.x, this.y, text, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#16304a', backgroundColor: '#f4fbff',
      padding: { x: 9, y: 5 }, align: 'center', wordWrap: { width: 190 },
    }).setOrigin(0.5, 1).setDepth(1e6 + 2).setAlpha(0.97);
    this.bubbleTimer = setTimeout(() => { this.bubble?.destroy(); this.bubble = null; }, ms || Math.min(7000, 2600 + text.length * 55));
  }

  playEmote(key, reduceMotion = false) {
    const def = EMOTE_BY_KEY[key]; if (!def) return;
    const sc = this.scene;
    this.clearEmote();
    this.emoteIcon = sc.add.text(this.x, this.y, def.icon, { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(1e6 + 1).setScale(0.2);
    this.emoteTweens.push(sc.tweens.add({ targets: this.emoteIcon, scale: 1, duration: 260, ease: 'Back.Out' }));
    this.emoteTimer = setTimeout(() => this.clearEmote(), EMOTE_MS);
    if (reduceMotion) return;                                            // icon only for people who prefer less motion
    const b = def.body;
    if (b) {
      const to = { dy: b.dy ?? 0, rot: b.rot ?? 0, sy: b.sy ?? 1 };
      this.emoteTweens.push(sc.tweens.add({
        targets: this.fx, ...to, duration: b.ms, yoyo: true, repeat: b.repeat, ease: 'Sine.InOut',
        onComplete: () => { this.fx.dy = 0; this.fx.rot = 0; this.fx.sy = 1; },
      }));
    }
    const f = def.fx;
    if (f) for (let i = 0; i < f.n; i++) {
      const ch = f.chars[i % f.chars.length], a = (i / f.n) * Math.PI * 2, r = Phaser.Math.Between(20, 60);
      const sx = this.x + (f.mode === 'burst' ? 0 : Phaser.Math.Between(-34, 34)), sy = this.y - (f.mode === 'fall' ? 120 : 40);
      const t = sc.add.text(sx, sy, ch, { fontSize: `${Phaser.Math.Between(14, 22)}px` }).setOrigin(0.5).setDepth(1e6).setAlpha(0);
      const tw = f.mode === 'burst' ? { x: sx + Math.cos(a) * r * 1.6, y: sy - 30 + Math.sin(a) * r }
        : f.mode === 'fall' ? { x: sx + Phaser.Math.Between(-20, 20), y: this.y - 10 } : { x: sx + Phaser.Math.Between(-18, 18), y: sy - 70 };
      sc.tweens.add({
        targets: t, ...tw, alpha: { from: 1, to: 0 }, duration: f.slow ? 2200 : 1400, delay: i * (f.slow ? 450 : 90), ease: 'Sine.Out',
        onStart: () => t.setAlpha(1), onComplete: () => t.destroy(),
      });
    }
  }

  clearEmote() {
    clearTimeout(this.emoteTimer);
    this.emoteTweens.forEach((t) => t.remove()); this.emoteTweens = [];
    this.fx.dy = 0; this.fx.rot = 0; this.fx.sy = 1;
    this.emoteIcon?.destroy(); this.emoteIcon = null;
  }

  destroy() {
    clearTimeout(this.bubbleTimer); this.bubble?.destroy(); this.clearEmote();
    [this.hitbox, this.shadow, this.root, this.label].forEach((o) => o.destroy());
  }
}
