import { ROOMS } from '../maps/rooms.js';
import { Avatar } from '../entities/Avatar.js';
import { toast } from '../ui/hud.js';
import { RemotePlayers } from '../multiplayer/RemotePlayers.js';

const DOOR_W = 70, DOOR_H = 56;

export class RoomScene extends Phaser.Scene {
  constructor() { super('Room'); }

  init(data) {
    this.roomId = ROOMS[data.roomId] ? data.roomId : 'snowy_plaza';
    this.fromRoom = data.from || null;
    this.leaving = false; this.target = null; this.pendingDoor = null; this.stuck = 0;
  }

  create() {
    const room = ROOMS[this.roomId], profile = this.registry.get('profile');
    this.room = room; this.doors = [];
    this.cameras.main.setBackgroundColor(0x0e2238).fadeIn(250);
    this.physics.world.setBounds(0, 0, room.w, room.h);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor(room);
    (room.buildings || []).forEach((b) => this.addBuilding(b));
    (room.props || []).forEach((p) => p.type === 'pond' && this.addPond(p));
    (room.blocks || []).forEach((b) => this.addBlock(b));
    (room.trees || []).forEach(([x, y]) => this.addTree(x, y));
    (room.portals || []).forEach((p) => this.addPortal(p));
    if (room.indoor) this.addWall(0, 0, room.w, 150, 0x7a4f2f);

    const s = this.spawnPoint(room);
    this.player = new Avatar(this, s.x, s.y, profile.avatar_data, profile.display_name);
    this.physics.add.collider(this.player.hitbox, this.walls);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.w, room.h).startFollow(this.player.hitbox, true, 0.12, 0.12);

    if (!room.indoor) this.addSnowfall();
    this.setupInput();

    // multiplayer (no-op for guests) + live outfit changes from the wardrobe
    this.mp = new RemotePlayers(this, this.registry.get('net'), profile, this.roomId);
    this.onOutfit = (av) => { this.player.setOutfit(av); this.mp.outfit(av); };
    this.game.events.on('outfit-changed', this.onOutfit);
    this.events.once('shutdown', () => { this.game.events.off('outfit-changed', this.onOutfit); this.mp.destroy(); });
    this.game.events.emit('room-entered', this.roomId, room.name);
  }

  // ---------- world building ----------
  drawFloor(room) {
    this.add.tileSprite(0, 0, room.w, room.h, room.floor).setOrigin(0).setDepth(-1000);
    if (room.floor === 'snow') {
      const g = this.add.graphics().setDepth(-999);
      g.fillStyle(0xcfe6f4, 0.7); g.fillRoundedRect(room.w / 2 - 140, 300, 280, room.h - 300, 40);   // main path
      g.fillRoundedRect(150, 430, room.w - 300, 110, 50);                                           // cross path
      g.lineStyle(6, 0xb4d4e6, 0.6); g.strokeRoundedRect(150, 430, room.w - 300, 110, 50);
    }
  }

  addWall(x, y, w, h, color) {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, color).setDepth(-500);
    this.walls.add(r);
    return r;
  }

  addBlock(b) {
    const r = this.add.rectangle(b.x + b.w / 2, b.y + b.h / 2, b.w, b.h, b.color || 0xe9d3b0).setStrokeStyle(4, 0x6b4428).setDepth(b.y + b.h);
    this.walls.add(r);
    this.add.text(r.x, r.y, b.label || '', { fontSize: '24px', color: '#fff' }).setOrigin(0.5).setDepth(b.y + b.h + 1);
  }

  addBuilding(b) {
    const { x, y, w, h } = b, g = this.add.graphics().setDepth(y + h);
    g.fillStyle(0x16304a, 0.18); g.fillEllipse(x + w / 2, y + h + 4, w + 30, 34);                       // shadow
    g.fillStyle(b.wall); g.fillRoundedRect(x, y + 44, w, h - 44, 8);                                     // walls
    g.fillStyle(0x000000, 0.12); g.fillRect(x, y + h - 14, w, 14);
    g.fillStyle(b.roof); g.fillTriangle(x - 14, y + 50, x + w / 2, y - 8, x + w + 14, y + 50);          // roof
    g.fillRect(x - 14, y + 40, w + 28, 14);
    g.fillStyle(0xffffff); g.fillEllipse(x + w / 2, y + 2, w * 0.45, 20); g.fillRoundedRect(x - 18, y + 36, w + 36, 12, 6); // snow cap
    const winY = y + 84, n = Math.max(2, Math.floor(w / 90));
    for (let i = 0; i < n; i++) {                                                                       // warm windows
      const wx = x + (w / (n + 1)) * (i + 1) - 17;
      if (Math.abs(wx + 17 - (x + w / 2)) < 36) continue;
      g.fillStyle(0xfff0b0); g.fillRoundedRect(wx, winY, 34, 34, 6); g.lineStyle(3, 0x5a3b22); g.strokeRoundedRect(wx, winY, 34, 34, 6);
      g.lineBetween(wx + 17, winY, wx + 17, winY + 34); g.lineBetween(wx, winY + 17, wx + 34, winY + 17);
    }
    g.fillStyle(0x5a3b22); g.fillRoundedRect(x + w / 2 - 24, y + h - 62, 48, 62, { tl: 22, tr: 22, bl: 0, br: 0 });  // door
    g.fillStyle(0xffc247); g.fillCircle(x + w / 2 + 14, y + h - 30, 3);
    this.add.text(x + w / 2, y + h + 22, b.label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#16304a', backgroundColor: '#f4fbffee', padding: { x: 8, y: 3 } })
      .setOrigin(0.5).setDepth(y + h + 2);
    this.walls.add(this.add.rectangle(x + w / 2, y + 40 + (h - 40) / 2, w, h - 40, 0, 0));
    this.doors.push({ label: b.label, to: b.to, spawn: b.spawn, zone: new Phaser.Geom.Rectangle(x + w / 2 - DOOR_W / 2, y + h + 2, DOOR_W, DOOR_H), body: new Phaser.Geom.Rectangle(x, y, w, h), below: true });
  }

  addPortal(p) {
    this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0xffffff, 0.35).setStrokeStyle(3, 0x7fb8d8).setDepth(-900);
    this.add.text(p.x + p.w / 2, p.y + p.h / 2, p.label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#16304a', backgroundColor: '#f4fbffee', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(-800);
    const zone = new Phaser.Geom.Rectangle(p.x, p.y, p.w, p.h);
    this.doors.push({ label: p.label.replace(/[▸◂▾]/g, '').trim(), to: p.to, spawn: p.spawn, zone, body: zone, below: false });
  }

  addPond(p) {
    const g = this.add.graphics().setDepth(-998);
    g.fillStyle(0xffffff); g.fillEllipse(p.x, p.y + 6, p.rx * 2 + 24, p.ry * 2 + 24);
    g.fillStyle(0x8fd3f0); g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
    g.lineStyle(3, 0xd9f2ff, 0.9); g.lineBetween(p.x - 60, p.y - 10, p.x - 10, p.y - 24); g.lineBetween(p.x + 20, p.y + 20, p.x + 80, p.y + 6);
    const r = this.add.ellipse(p.x, p.y, p.rx * 2, p.ry * 1.6, 0, 0); this.walls.add(r);
  }

  addTree(x, y) {
    this.add.image(x, y, 'pine').setOrigin(0.5, 0.97).setDepth(y);
    this.walls.add(this.add.rectangle(x, y - 8, 22, 14, 0, 0));
  }

  addSnowfall() {
    const w = this.scale.width;
    this.add.particles(0, -10, 'flake', {
      x: { min: 0, max: w }, lifespan: 7000, speedY: { min: 30, max: 75 }, speedX: { min: -25, max: 25 },
      scale: { min: 0.4, max: 1.2 }, alpha: { min: 0.5, max: 0.95 }, frequency: 90, quantity: 1,
    }).setScrollFactor(0).setDepth(2e6);
  }

  // ---------- input ----------
  setupInput() {
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E');
    this.input.on('pointerdown', (p) => {
      if (this.leaving || p.event?.target?.tagName !== 'CANVAS') return;
      const hit = this.doors.find((d) => Phaser.Geom.Rectangle.Contains(d.body, p.worldX, p.worldY));
      if (hit) { this.pendingDoor = hit; this.target = new Phaser.Math.Vector2(hit.zone.centerX, hit.zone.centerY); }
      else { this.pendingDoor = null; this.target = new Phaser.Math.Vector2(p.worldX, p.worldY); }
      this.stuck = 0;
    });
    this.keys.E.on('down', () => this.nearDoor && this.enter(this.nearDoor));
  }

  update(time, delta) {
    if (this.leaving) return;
    const k = this.keys;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (vx || vy) { this.target = null; this.pendingDoor = null; }
    else if (this.target) {
      const dx = this.target.x - this.player.x, dy = this.target.y - this.player.y;
      if (Math.hypot(dx, dy) < 8) this.target = null;
      else { vx = dx; vy = dy; this.stuck = this.player.hitbox.body.speed < 20 ? this.stuck + delta : 0; if (this.stuck > 350) this.target = null; }
    }
    this.player.move(vx, vy);
    this.player.update(time, this.registry.get('reduceMotion'));
    this.mp.update(time, delta, this.registry.get('reduceMotion'));

    this.nearDoor = this.doors.find((d) => Phaser.Geom.Rectangle.Contains(d.zone, this.player.x, this.player.y)) || null;
    this.game.events.emit('door-prompt', this.nearDoor ? `Press E to enter ${this.nearDoor.label}` : '');
    if (this.nearDoor && this.pendingDoor === this.nearDoor) this.enter(this.nearDoor);
  }

  spawnPoint(room) {
    if (this.fromRoom) {
      const d = this.doors.find((d) => d.to === this.fromRoom);
      if (d) return d.spawn || { x: d.zone.centerX, y: d.zone.bottom + 40 };
    }
    return room.spawn;
  }

  enter(door) {
    if (this.leaving) return;
    if (!ROOMS[door.to]) { this.target = null; this.pendingDoor = null; toast(`${door.label} is coming soon!`); this.nearDoor = null; this.player.move(0, 0); this.bounce(door); return; }
    this.leaving = true; this.player.move(0, 0);
    this.cameras.main.fadeOut(220);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ roomId: door.to, from: this.roomId }));
  }

  // move the player just clear of a "coming soon" door so the toast doesn't repeat
  bounce(door) {
    const p = door.spawn || { x: door.zone.centerX, y: door.zone.bottom + 70 };
    this.player.hitbox.setPosition(p.x, p.y);
  }
}
