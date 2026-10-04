import Phaser from 'phaser';
import { SPEED } from '../config/game.js';

// Layered avatar: feet -> body(tinted) -> belly -> shirt -> face -> hat. Each layer is its own sprite,
// so clothing/items from the inventory (Phase 4) just swap texture keys.
export class Avatar {
  constructor(scene, x, y, data, name) {
    this.scene = scene; this.data = data; this.dir = 'down'; this.moving = false;

    // Invisible physics hitbox at the avatar's feet; visuals follow it.
    this.hitbox = scene.add.rectangle(x, y, 26, 14, 0x000000, 0);
    scene.physics.add.existing(this.hitbox);
    this.hitbox.body.setCollideWorldBounds(true);

    this.shadow = scene.add.ellipse(x, y, 36, 12, 0x1b3350, 0.25);
    this.feetL = scene.add.image(-8, -3, 'av_foot');
    this.feetR = scene.add.image(8, -3, 'av_foot');
    this.body = scene.add.image(0, -26, 'av_body').setTint(Phaser.Display.Color.HexStringToColor(data.color).color);
    this.belly = scene.add.image(0, -20, 'av_belly');
    this.shirt = data.shirt ? scene.add.image(0, -14, 'shirt_' + data.shirt) : null;
    this.face = scene.add.image(0, -33, 'face_' + (data.eyes || 0));
    this.hat = data.hat ? scene.add.image(0, -50, 'hat_' + data.hat) : null;
    this.root = scene.add.container(x, y, [this.feetL, this.feetR, this.body, this.belly, this.shirt, this.face, this.hat].filter(Boolean));
    this.label = scene.add.text(x, y, name, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#fff', stroke: '#16304a', strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(1e6);
  }

  get x() { return this.hitbox.x; }
  get y() { return this.hitbox.y; }

  move(vx, vy) {
    const len = Math.hypot(vx, vy);
    if (len > 0) { vx = (vx / len) * SPEED; vy = (vy / len) * SPEED; }
    this.hitbox.body.setVelocity(vx, vy);
    this.moving = len > 0;
    if (this.moving) this.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
  }

  update(time, reduceMotion = false) {
    const { x, y } = this.hitbox, d = this.dir, t = time;
    const bob = this.moving && !reduceMotion ? -Math.abs(Math.sin(t * 0.016)) * 4 : 0;
    const sway = this.moving && !reduceMotion ? Math.sin(t * 0.016) * 0.09 : 0;
    const breathe = !this.moving && !reduceMotion ? 1 + Math.sin(t * 0.003) * 0.025 : 1;
    this.root.setPosition(x, y + bob).setRotation(sway).setDepth(y);
    this.body.setScale(1, breathe);
    this.shadow.setPosition(x, y - 2).setDepth(y - 1);
    this.label.setPosition(x, y - 76);

    const step = this.moving && !reduceMotion ? Math.sin(t * 0.016) * 4 : 0;
    this.feetL.y = -3 - step; this.feetR.y = -3 + step;

    // facing: back view hides the face; side views shift it toward the facing side
    const back = d === 'up', side = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    this.face.setVisible(!back).setX(side * 8);
    this.belly.setVisible(!back).setX(side * 3);
    if (this.hat) this.hat.setX(side * 2);
  }

  destroy() { [this.hitbox, this.shadow, this.root, this.label].forEach((o) => o.destroy()); }
}
