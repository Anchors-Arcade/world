import { ROOMS } from '../maps/rooms.js';
import { Avatar } from '../entities/Avatar.js';
import { toast } from '../ui/hud.js';
import { RemotePlayers } from '../multiplayer/RemotePlayers.js';
import { HomeRoom } from '../rooms/HomeRoom.js';
import { RoomEditor } from '../rooms/RoomEditor.js';
import { ROOM, rectOf } from '../rooms/roomRules.js';
import { fetchRoom } from '../database/rooms.js';
import { WorldLayer } from '../world/WorldLayer.js';

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
    this.world = null; this.secretPortals = new Set();                      // Phase 8: exploration layer + revealed secret doors
    this.leaving = false; this.target = null; this.pendingDoor = null; this.stuck = 0;
  }

  create() {
    const room = ROOMS[this.roomId], profile = this.registry.get('profile');
    this.room = room; this.doors = [];
    this.explore = this.registry.get('exploration') || null;                // Phase 8: collectibles / secrets / achievements
    this.cameras.main.setBackgroundColor(0x0e2238).fadeIn(250);
    this.physics.world.setBounds(0, 0, room.w, room.h);
    this.walls = this.physics.add.staticGroup();

    this.drawFloor(room);
    (room.buildings || []).forEach((b) => this.addBuilding(b));
    (room.props || []).forEach((p) => this.addProp(p));                                            // Phase 8: ice, rocks, crystals, docks
    (room.blocks || []).forEach((b) => this.addBlock(b));
    (room.trees || []).forEach(([x, y]) => this.addTree(x, y));
    // Phase 8: a portal with `secret` is a hidden entrance — it exists only once that secret has been discovered.
    (room.portals || []).forEach((p) => { if (!p.secret) this.addPortal(p); else if (this.explore?.isRoomUnlocked(p.to)) this.addSecretPortal(p, true); });
    (room.kiosks || []).forEach((k) => this.addKiosk(k));
    (room.cabinets || []).forEach((c) => this.addCabinet(c));                                   // Phase 7: arcade machines + leaderboard board
    if (room.indoor) { const wall = this.addWall(0, 0, room.w, 150, room.wallColor ?? 0x7a4f2f); if (room.type === 'home') wall.setAlpha(0); }   // homes draw their own themed wall

    const s = this.spawnPoint(room);
    this.player = new Avatar(this, s.x, s.y, profile.avatar_data, profile.display_name);
    this.physics.add.collider(this.player.hitbox, this.walls);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, room.w, room.h).startFollow(this.player.hitbox, true, 0.12, 0.12);

    if (room.sign) this.addSign(room);
    if (!room.indoor) this.addSnowfall();
    this.setupInput();

    // Phase 8: build THIS room's interactive objects and collectibles (and nothing from any other room).
    if (this.explore && room.type !== 'home') this.world = new WorldLayer(this, this.explore);

    // Phase 6: tell the social layer where I am (friends see it only if my privacy setting allows)
    this.registry.get('social')?.setLocation(this.roomId, this.ownerId);

    // multiplayer (no-op for guests) + live outfit changes from the wardrobe
    this.mp = new RemotePlayers(this, this.registry.get('net'), profile, this.channelId);
    this.onOutfit = (av) => { this.player.setOutfit(av); this.mp.outfit(av); };
    this.game.events.on('outfit-changed', this.onOutfit);
    this.onLock = (v) => { this.uiLocked = v; if (v) { this.target = null; this.pendingDoor = null; this.player.move(0, 0); } };
    this.game.events.on('ui-lock', this.onLock);
    // Phase 6: typing in chat must not walk the avatar (Phaser would also swallow WASD/E keystrokes from the text box)
    this.onTyping = (v) => {
      const kb = this.input.keyboard; if (!kb) return;
      if (v) { kb.enabled = false; kb.disableGlobalCapture(); kb.resetKeys(); } else { kb.enabled = true; kb.enableGlobalCapture(); }
    };
    this.onEmote = (key) => !this.leaving && !this.editing && this.mp.myEmote(key);
    this.onJoinRoom = (req) => this.joinRoom(req);
    this.game.events.on('typing', this.onTyping); this.game.events.on('emote', this.onEmote); this.game.events.on('join-room', this.onJoinRoom);
    this.events.once('shutdown', () => {
      this.game.events.off('outfit-changed', this.onOutfit); this.game.events.off('ui-lock', this.onLock);
      this.game.events.off('typing', this.onTyping); this.game.events.off('emote', this.onEmote); this.game.events.off('join-room', this.onJoinRoom);
      this.input.keyboard && (this.input.keyboard.enabled = true);
      this.editor?.dispose(); this.editor = null; this.home?.destroy(); this.loadToken++;
      this.world?.destroy(); this.world = null;
      this.mp.destroy();
      this.game.events.emit('home-left');
    });
    this.game.events.emit('room-entered', this.roomId, room.name, this.channelId);
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
    } catch (e) {
      toast('Could not load the room: ' + e.message);
      if (!isOwner && token === this.loadToken) this.leaveTo('snowy_plaza');       // not allowed in (private / blocked / visits off): back to the plaza
    }
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

  // Phase 6: travel to a room by key (Map, or "Join" on a friend). For another player's home the SERVER decides
  // (get_room -> can_view_room: friends/visibility/blocks/"allow visits"), and we check BEFORE leaving so a refusal costs nothing.
  async joinRoom({ room, ownerId = null } = {}) {
    const profile = this.registry.get('profile');
    if (this.leaving || this.editing || this.uiLocked) return;
    if (!ROOMS[room]) return toast('That place is not open yet');
    const own = room === 'home' ? (ownerId || profile.id) : null;
    if (room === this.roomId && own === this.ownerId) return toast("You're already here");
    if (room === 'home' && own !== profile.id) {
      if (profile.guest) return toast('Create an account to visit rooms');
      try { await fetchRoom(own); } catch (e) { return toast(e.message || 'You cannot enter that room'); }
      if (this.leaving || !this.scene.isActive()) return;
    }
    this.leaveTo(room, own);
  }

  leaveTo(room, ownerId = null) {
    if (this.leaving) return;
    this.leaving = true; this.target = null; this.pendingDoor = null; this.player.move(0, 0);
    this.cameras.main.fadeOut(220);
    const next = { roomId: room };                              // no `from`: the player spawns at the room's default spawn point
    if (room === 'home') next.ownerId = ownerId || this.registry.get('profile').id;
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(next));
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

  // Phase 7: an arcade cabinet (or, with `board`, the wide leaderboard screen). Solid, glowing, with a play zone on the floor in front.
  addCabinet(c) {
    const { x, y, w, h } = c, cx = x + w / 2, g = this.add.graphics().setDepth(y + h), calm = this.registry.get('reduceMotion');
    const glow = this.add.rectangle(cx, y + h / 2, w + 36, h + 36, c.color, 0.2).setDepth(y + h - 2);
    if (!calm) this.tweens.add({ targets: glow, alpha: 0.07, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    g.fillStyle(0x16304a, 0.2); g.fillEllipse(cx, y + h + 4, w + 24, 28);
    g.fillStyle(c.color); g.fillRoundedRect(x, y, w, h, 14);
    g.fillStyle(0x000000, 0.18); g.fillRoundedRect(x, y + h - 28, w, 28, { tl: 0, tr: 0, bl: 14, br: 14 });
    g.fillStyle(0xffc247); g.fillRoundedRect(x + 8, y + 6, w - 16, 24, 8);
    g.fillStyle(0x16304a); g.fillRoundedRect(x + 12, y + 36, w - 24, h - 76, 10);
    g.fillStyle(c.board ? 0x1b2a41 : 0x0b1a2a); g.fillRoundedRect(x + 18, y + 42, w - 36, h - 88, 8);
    if (!c.board) {
      g.fillStyle(0xe8483c); g.fillCircle(x + 34, y + h - 15, 6); g.fillStyle(0xffffff); g.fillCircle(x + w - 50, y + h - 15, 5); g.fillStyle(0x6fd08c); g.fillCircle(x + w - 30, y + h - 15, 5);
    }
    const t = (str, size, color, px, py, o = 0.5) => this.add.text(px, py, str, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color }).setOrigin(o).setDepth(y + h + 1);
    t(c.label, 13, '#4a3200', cx, y + 18);
    if (c.board) {
      t('🏆  TOP SCORES', 20, '#ffc247', cx, y + 62);
      t('🏁 Snow Dash   🪙 Coin Catcher   ☃️ Snowball Arena', 11.5, '#cfeaf7', cx, y + 92);
      t('Press E to see who is #1', 12, '#8ff0b3', cx, y + 114);
    } else {
      const icon = t(c.icon, 46, '#fff', cx, y + 38 + (h - 82) / 2);
      if (!calm) this.tweens.add({ targets: icon, scale: 1.14, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      t('PLAY', 11, '#ffc247', cx, y + h - 60);
    }
    this.walls.add(this.add.rectangle(cx, y + h / 2, w, h, 0, 0));
    const zone = new Phaser.Geom.Rectangle(cx - Math.min(80, w / 2), y + h + 2, Math.min(160, w), DOOR_H);
    this.add.rectangle(zone.centerX, zone.centerY, zone.width, zone.height, 0xffc247, 0.16).setStrokeStyle(2, 0xffc247, 0.6).setDepth(-900);
    this.doors.push({ label: c.label, action: c.action, verb: c.verb || 'play', zone, body: new Phaser.Geom.Rectangle(x, y, w, h), below: true });
  }

  // neon sign on an indoor back wall
  addSign(room) {
    const s = this.add.text(room.w / 2, 70, room.sign, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#ffffff', stroke: '#ff6fae', strokeThickness: 7 })
      .setOrigin(0.5).setDepth(-400).setShadow(0, 0, '#ff6fae', 18, true, true);
    if (!this.registry.get('reduceMotion')) this.tweens.add({ targets: s, alpha: 0.72, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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

  // Phase 8: scenery. One switch, so a new prop type is a few lines and never a new room system.
  addProp(p) {
    if (p.type === 'pond') return this.addPond(p);
    if (p.type === 'ice') {                                    // a sheet of smoother ice: looks different, walks the same
      const g = this.add.graphics().setDepth(-997);
      g.fillStyle(0xbfe4f6, 0.85); g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.lineStyle(3, 0xffffff, 0.6); g.strokeEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.lineBetween(p.x - p.rx * 0.5, p.y - p.ry * 0.3, p.x + p.rx * 0.2, p.y + p.ry * 0.5);
      return;
    }
    if (p.type === 'rock') {
      const r = p.r || 40, g = this.add.graphics().setDepth(p.y + r);
      g.fillStyle(0x16304a, 0.18); g.fillEllipse(p.x, p.y + r * 0.5, r * 2.2, r * 0.6);
      g.fillStyle(0x7d8c97); g.fillEllipse(p.x, p.y, r * 2, r * 1.5);
      g.fillStyle(0x9aa9b4); g.fillEllipse(p.x - r * 0.2, p.y - r * 0.25, r * 1.2, r * 0.8);
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(p.x, p.y - r * 0.55, r * 1.5, r * 0.5);
      this.walls.add(this.add.rectangle(p.x, p.y + r * 0.25, r * 1.7, r * 0.8, 0, 0));
      return;
    }
    if (p.type === 'crystal') {
      const s = p.s || 1, h = 90 * s, w = 34 * s, g = this.add.graphics().setDepth(p.y);
      g.fillStyle(0x16304a, 0.2); g.fillEllipse(p.x, p.y + 6, w * 2.2, 18 * s);
      g.fillStyle(0x8f6fe0, 0.95); g.fillTriangle(p.x, p.y - h, p.x - w, p.y, p.x + w, p.y);
      g.fillStyle(0xc7aaff, 0.95); g.fillTriangle(p.x, p.y - h, p.x - w * 0.3, p.y, p.x + w * 0.25, p.y);
      g.fillStyle(0xffffff, 0.55); g.fillTriangle(p.x - w * 0.1, p.y - h * 0.85, p.x - w * 0.35, p.y - h * 0.1, p.x, p.y - h * 0.1);
      this.walls.add(this.add.rectangle(p.x, p.y - 6, w * 1.4, 18 * s, 0, 0));
      return;
    }
    if (p.type === 'dock') {                                   // walkable boardwalk
      const g = this.add.graphics().setDepth(-996);
      g.fillStyle(0x8a6240); g.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 8);
      g.lineStyle(3, 0x6b4428, 0.8);
      for (let x = p.x - p.w / 2 + 20; x < p.x + p.w / 2; x += 40) g.lineBetween(x, p.y - p.h / 2 + 4, x, p.y + p.h / 2 - 4);
    }
  }

  // Phase 8: reveal a hidden entrance. Called while building the room (silent) or the moment its secret is cracked.
  addSecretPortal(p, silent = false) {
    if (this.secretPortals.has(p.to)) return;
    this.secretPortals.add(p.to);
    this.addPortal(p);
    if (!silent) {
      const name = ROOMS[p.to]?.name || p.label;
      toast(`A way into ${name} just opened!`);
      if (!this.registry.get('reduceMotion')) this.cameras.main.flash(260, 255, 240, 180);
    }
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
      const who = this.mp.hit(p.worldX, p.worldY);
      if (who) return this.game.events.emit('open-profile', who);
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

    this.world?.update();                                   // Phase 8: collectible pickups (a few distance checks)

    this.nearDoor = this.doors.find((d) => Phaser.Geom.Rectangle.Contains(d.zone, this.player.x, this.player.y)) || null;
    const nd = this.nearDoor;
    this.game.events.emit('door-prompt', nd ? `Press E to ${nd.verb || (nd.action ? 'browse' : 'enter')} ${nd.label}` : '');
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
      if (door.action.startsWith('arcade:')) this.game.events.emit('open-arcade', door.action.slice(7));   // Phase 7
      else if (door.action.startsWith('world:')) this.game.events.emit('world-interact', door.world);       // Phase 8
      else this.game.events.emit('open-shop', door.action);
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
