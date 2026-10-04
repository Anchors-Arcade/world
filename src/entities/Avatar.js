import { SPEED } from '../config/game.js';
import { SLOTS, LAYOUT, BODY_TYPES, normalizeAvatar } from '../shops/items.js';

// Layered avatar. Draw order (back -> front):
// back, feet, body(tinted), pants, belly, shirt, accessory, eyes, beak, face, hat, hand.
// Every cosmetic is a separate sprite, so outfits are just texture keys. `remote` avatars have no physics
// and glide toward network targets instead of being driven by input.
export class Avatar {
  constructor(scene, x, y, data, name, { remote = false } = {}) {
    this.scene = scene; this.dir = 'down'; this.moving = false; this.remote = remote;
    this.tx = x; this.ty = y; this.remoteMoving = false; this._dir = null;

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
    this.root.setPosition(x, y + bob).setRotation(sway).setDepth(y);
    this.shadow.setPosition(x, y - 2).setDepth(y - 1);
    this.label.setPosition(x, y - 78 + (this.headDy || 0));
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

  destroy() { [this.hitbox, this.shadow, this.root, this.label].forEach((o) => o.destroy()); }
}
