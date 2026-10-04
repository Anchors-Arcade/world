import { ROOMS } from '../maps/rooms.js';
import { Avatar } from '../entities/Avatar.js';
import { toast } from '../ui/hud.js';
import { RemotePlayers } from '../multiplayer/RemotePlayers.js';
import { HomeRoom } from '../rooms/HomeRoom.js';
import { RoomEditor } from '../rooms/RoomEditor.js';
import { ROOM, rectOf } from '../rooms/roomRules.js';
import { fetchRoom } from '../database/rooms.js';

const DOOR_W = 70, DOOR_H = 56;

export class RoomScene extends Phaser.Scene {
  constructor() { super('Room'); }

  init(data) {
    this.roomId = ROOMS[data.roomId] ? data.roomId : 'snowy_plaza';
    this.fromRoom = data.from || null;
    // 'home' is a template: the owner decides whose layout loads. Presence channel is per owner so every room is separate.
    const profile = this.registry.get('profile');
    this.ownerId = this.roomId === 'home' ? (data.ownerId || profile.id) : null;
    this.channelId = this.ownerId ? `home:${this.ownerId}` : this.roomId;
    this.editing = false; this.uiLocked = false; this.editor = null; this.home = null; this.loadToken = 0;
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
    (room.kiosks || []).forEach((k) => this.addKiosk(k));
    if (room.indoor) { const wall = this.addWall(0, 0, room.w, 150, 0x7a4f2f); if (room.type === 'home') wall.setAlpha(0); }   // homes draw their own themed wall

    const s = this.spawnPoint(room);
    this.player = new Avatar(this, s.x, s.y, profile.avatar_data, profile.display_name);
    this.physics.add.collider(this.player.hitbox, this.walls);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.w, room.h).startFollow(this.player.hitbox, true, 0.12, 0.12);

    if (!room.indoor) this.addSnowfall();
    this.setupInput();

    // multiplayer (no-op for guests) + live outfit changes from the wardrobe
    this.mp = new RemotePlayers(this, this.registry.get('net'), profile, this.channelId);
    this.onOutfit = (av) => { this.player.setOutfit(av); this.mp.outfit(av); };
    this.game.events.on('outfit-changed', this.onOutfit);
    this.onLock = (v) => { this.uiLocked = v; if (v) { this.target = null; this.pendingDoor = null; this.player.move(0, 0); } };
    this.game.events.on('ui-lock', this.onLock);
    this.events.once('shutdown', () => {
      this.game.events.off('outfit-changed', this.onOutfit); this.game.events.off('ui-lock', this.onLock);
      this.editor?.dispose(); this.editor = null; this.home?.destroy(); this.loadToken++;
      this.mp.destroy();
      this.game.events.emit('home-left');
    });
    this.game.events.emit('room-entered', this.roomId, room.name);
    if (room.type === 'home') this.setupHome(profile);
  }

  // ---------- player rooms ----------
  async setupHome(profile) {
    const isOwner = this.ownerId === profile.id, token = ++this.loadToken;
    this.home = new HomeRoom(this, { ownerId: this.ownerId, isOwner });
    this.home.setTitle(isOwner ? 'My Room' : 'Room');
    this.game.events.emit('home-ready', { isOwner, guest: !!profile.guest });
    if (profile.guest) { this.home.loaded = true; return toast('Guest rooms are empty and not saved. Create an account to decorate!'); }
    try {
      const data = await fetchRoom(this.ownerId);                                   // own room, or (later) a friend's
      if (token !== this.loadToken || this.home.destroyed) return;                  // scene changed while loading
      this.home.load(data);
      const owner = data.room.owner_name || 'Player', title = data.is_owner ? 'My Room' : `${owner}'s Room`;
      this.home.setTitle(title);
      this.game.events.emit('room-title', title);
    } catch (e) { toast('Could not load the room: ' + e.message); }
  }

  startEdit() {
    const profile = this.registry.get('profile');
    if (!this.home || !this.home.isOwner || this.editing || this.leaving || this.uiLocked) return;
    if (profile.guest) return toast('Create an account to decorate your room');
    if (!this.home.loaded) return toast('Your room is still loading…');
    this.editing = true; this.target = null; this.pendingDoor = null; this.player.move(0, 0);
    this.game.events.emit('edit-mode', true);
    this.editor = new RoomEditor(this, this.home, { profile, onClose: () => {
      this.editing = false; this.editor = null; this.rescuePlayer();
      this.game.events.emit('edit-mode', false);
    } });
  }

  // If a freshly placed piece landed on top of the avatar, put the avatar back in the (always clear) doorway strip.
  rescuePlayer() {
    const p = this.player, hb = new Phaser.Geom.Rectangle(p.x - 13, p.y - 7, 26, 14);
    const stuck = this.home.pieces.some((pc) => {
      const it = this.home.itemOf(pc.furniture_id); if (it.walkable) return false;
      const r = rectOf(pc, it);
      return Phaser.Geom.Intersects.RectangleToRectangle(hb, new Phaser.Geom.Rectangle(r.l, r.t, r.r - r.l, r.b - r.t));
    });
    if (stuck) p.hitbox.body.reset(ROOM.w / 2, ROOM.floorBottom + 35);
  }

  goHome() {
    const profile = this.registry.get('profile');
    if (this.leaving || this.editing || this.uiLocked) return;
    if (this.roomId === 'home' && this.ownerId === profile.id) return toast("You're already home");
    this.leaving = true; this.player.move(0, 0);
    this.cameras.main.fadeOut(220);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ roomId: 'home', from: this.roomId, ownerId: profile.id }));
  }

  // ---------- world building ----------
  drawFloor(room) {
    if (room.type === 'home') return;                       // HomeRoom draws the themed floor and walls
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

  // A shop counter: solid, with a "browse" zone in front. Entering the zone + E (or clicking the counter) opens the storefront.
  addKiosk(k) {
    const r = this.add.rectangle(k.x + k.w / 2, k.y + k.h / 2, k.w, k.h, 0xe9d3b0).setStrokeStyle(4, 0x6b4428).setDepth(k.y + k.h);
    this.walls.add(r);
    this.add.text(r.x, r.y, k.icon || k.label, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#4a3200' }).setOrigin(0.5).setDepth(k.y + k.h + 1);
    this.add.text(r.x, k.y + 10, '🐧', { fontSize: '38px' }).setOrigin(0.5, 1).setDepth(k.y + k.h - 1);             // shopkeeper behind the counter
    const zone = new Phaser.Geom.Rectangle(k.x + k.w / 2 - 70, k.y + k.h + 2, 140, DOOR_H);
    this.add.rectangle(zone.centerX, zone.centerY, zone.width, zone.height, 0xffc247, 0.18).setStrokeStyle(2, 0xffc247, 0.6).setDepth(-900);
    this.doors.push({ label: k.label, action: k.action, zone, body: new Phaser.Geom.Rectangle(k.x, k.y, k.w, k.h), below: true });
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
      if (this.leaving || this.editing || this.uiLocked || p.event?.target?.tagName !== 'CANVAS') return;
      const hit = this.doors.find((d) => Phaser.Geom.Rectangle.Contains(d.body, p.worldX, p.worldY));
      if (hit) { this.pendingDoor = hit; this.target = new Phaser.Math.Vector2(hit.zone.centerX, hit.zone.centerY); }
      else { this.pendingDoor = null; this.target = new Phaser.Math.Vector2(p.worldX, p.worldY); }
      this.stuck = 0;
    });
    this.keys.E.on('down', () => this.nearDoor && !this.editing && !this.uiLocked && this.enter(this.nearDoor));
  }

  update(time, delta) {
    if (this.leaving) return;
    if (this.editing || this.uiLocked) {                    // editing / shopping: avatar stands still, others keep moving
      this.player.move(0, 0);
      this.player.update(time, this.registry.get('reduceMotion'));
      this.mp.update(time, delta, this.registry.get('reduceMotion'));
      this.game.events.emit('door-prompt', '');
      return;
    }
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
    const nd = this.nearDoor;
    this.game.events.emit('door-prompt', nd ? `Press E to ${nd.action ? 'browse' : 'enter'} ${nd.label}` : '');
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
    if (door.action) {                                        // shop counter: open the storefront, stay in the room
      this.target = null; this.pendingDoor = null; this.player.move(0, 0);
      this.game.events.emit('open-shop', door.action);
      return;
    }
    if (!ROOMS[door.to]) { this.target = null; this.pendingDoor = null; toast(`${door.label} is coming soon!`); this.nearDoor = null; this.player.move(0, 0); this.bounce(door); return; }
    this.leaving = true; this.player.move(0, 0);
    this.cameras.main.fadeOut(220);
    const next = { roomId: door.to, from: this.roomId };
    if (door.to === 'home') next.ownerId = door.ownerId || this.registry.get('profile').id;   // friend rooms later: door.ownerId = friend's id
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(next));
  }

  // move the player just clear of a "coming soon" door so the toast doesn't repeat
  bounce(door) {
    const p = door.spawn || { x: door.zone.centerX, y: door.zone.bottom + 70 };
    this.player.hitbox.setPosition(p.x, p.y);
  }
}
