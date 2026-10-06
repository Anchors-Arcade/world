import { BootScene } from './scenes/BootScene.js';
import { RoomScene } from './scenes/RoomScene.js';
import { mountAuth } from './ui/authUI.js';
import { mountHUD, toast, toggleFullscreen, fsSupported } from './ui/hud.js';
import { createWardrobe } from './ui/wardrobe.js';
import { createShop } from './ui/shop.js';
import * as auth from './database/auth.js';
import { fetchInventory, setInventory, recordPurchase, claimDaily } from './database/inventory.js';
import { createChat } from './ui/chat.js';
import { createFriends } from './ui/friends.js';
import { createSettings } from './ui/settings.js';
import { createMapPanel } from './ui/mapPanel.js';
import { createEmoteMenu } from './ui/emoteMenu.js';
import { createArcade } from './ui/arcade.js';
import { createJournal } from './ui/journal.js';
import { createWorldDialog } from './ui/worldDialog.js';
import { createWallPanel } from './ui/wallPanel.js';
import { setWallState } from './database/wallCache.js';
import { ExplorationState } from './world/ExplorationState.js';
import { MINIGAME_SCENES, MinigameManager } from './minigames/index.js';
import { SocialState } from './social/SocialState.js';
import { Network } from './multiplayer/Network.js';
import { normalizeAvatar, ITEM_BY_ID } from './shops/items.js';
import { isConfigured, supabase } from './config/supabase.js';
import { ROOMS } from './maps/rooms.js';

const ui = document.getElementById('ui');
let game = null, hud = null, wardrobe = null, shop = null, net = null, social = null, chat = null, friends = null, settings = null, mapPanel = null, emotes = null, arcade = null, minigames = null;
let explore = null, journal = null, worldDialog = null, wallPanel = null;   // Phase 8: exploration state + journal + interaction cards

function startGame(profile) {
  profile.avatar_data = normalizeAvatar(profile.avatar_data);
  profile.owned = new Set(); profile.inv = new Map();     // inv: item id -> quantity (furniture stacks)
  net = new Network(profile);
  social = new SocialState(profile, net);                 // Phase 6: friends / blocks / presence (inert for guests)
  explore = new ExplorationState(profile);                // Phase 8: collectibles / secrets / achievements (local-only for guests)

  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0e2238',
    render: { powerPreference: 'high-performance', antialias: true, batchSize: 4096, clearBeforeRender: true },   // one fast WebGL context; the camera zooms to fill the window
    fps: { target: 60, smoothStep: true },
    disableContextMenu: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, RoomScene, ...MINIGAME_SCENES],       // Phase 7: minigames are registered scenes, launched on demand by MinigameManager
    callbacks: { preBoot: (g) => {
      g.registry.set('profile', profile); g.registry.set('net', net); g.registry.set('social', social);
      g.registry.set('exploration', explore);
      g.registry.set('reduceMotion', matchMedia('(prefers-reduced-motion: reduce)').matches);
    } },
  });

  const veil = document.createElement('div'); veil.className = 'loading-veil'; veil.innerHTML = '<div class="ld-ring"></div><div class="ld-text">Entering Anchors World…</div>'; ui.appendChild(veil);
  game.events.once('room-entered', () => { veil.classList.add('gone'); setTimeout(() => veil.remove(), 500); });
  hud = mountHUD(ui, profile, { onAction });
  wardrobe = createWardrobe(ui, { game, profile, onCoins: (n) => hud.setCoins(n) });
  shop = createShop(ui, { game, profile, wardrobe, onCoins: (n) => hud.setCoins(n) });

  // Phase 6: social UI. The right-hand drawers (wardrobe, friends, settings, map) are mutually exclusive.
  const closeDrawers = () => [wardrobe, friends, settings, mapPanel, journal].forEach((d) => d?.close?.());
  const sp = { game, profile, social, closeOthers: closeDrawers };
  friends = createFriends(ui, sp);
  settings = createSettings(ui, sp);
  mapPanel = createMapPanel(ui, { ...sp, explore });
  chat = createChat(ui, { game, profile, social, onUnread: (n) => hud.setBadge('chat', n) });
  emotes = createEmoteMenu(ui, { game });
  social.on(() => hud.setBadge('friends', social.incoming.length));
  social.start().catch((e) => toast('Friends & chat unavailable: ' + e.message));

  // Phase 8: exploration. ONE request at sign-in fills the journal, the world map and the hidden-room gates;
  // after that the state is kept fresh by the return values of collect / find_clue / visit_room.
  journal = createJournal(ui, { game, profile, explore, closeOthers: closeDrawers });
  worldDialog = createWorldDialog(ui, { game, explore });

  // Phase 15: the Town Hall picture wall. One panel for adding a picture and for looking at one; the hall itself
  // keeps its own state, and the cached total is what lets the room size itself the moment you walk in.
  wallPanel = createWallPanel(ui, { game, profile });
  game.events.on('open-wall', (what) => wallPanel.open(what));
  game.events.on('wall-state', (st) => setWallState(st));
  game.events.on('wall-changed', () => game.scene.getScene('Room')?.gallery?.refresh?.());
  let unseen = 0;
  const bumpJournal = () => hud.setBadge('journal', ++unseen);
  explore.on((ev) => {
    if (ev.type === 'collected') {
      if (typeof ev.balance === 'number') { profile.coins = ev.balance; hud.setCoins(ev.balance); }
      toast(ev.coins ? `⭐ ${ev.name} found! +${ev.coins} Anchor Coins` : `⭐ ${ev.name} found!`);
      bumpJournal();
    } else if (ev.type === 'clue') {
      if (typeof ev.balance === 'number' && ev.coins) { profile.coins = ev.balance; hud.setCoins(ev.balance); }
      if (ev.new) bumpJournal();
    } else if (ev.type === 'achievement') {
      toast(`${ev.icon || '🏅'} Achievement unlocked: ${ev.name}${ev.coins ? ` (+${ev.coins} ⚓)` : ''}`);
      bumpJournal();
      // a cosmetic reward lands straight in the wardrobe (the server put it in the inventory)
      if (ev.item && !profile.guest) fetchInventory().then((m) => { setInventory(profile, m); wardrobe.refresh(); }).catch(() => {});
    } else if (ev.type === 'discovered') {
      toast(`🗺️ New place discovered: ${ROOMS[ev.room]?.name || ev.room}`);
    }
  });
  explore.start().catch(() => {});

  // Phase 7: Arcade + minigames. Games run as extra Phaser scenes while the Room scene is paused (networking stays connected).
  minigames = new MinigameManager(game);
  arcade = createArcade(ui, { game, profile, manager: minigames });
  game.events.on('open-arcade', (what) => arcade.open(what));
  game.events.on('minigame-play', (id) => minigames.start(id));
  // Phase 14: a claimed founder item lands in the inventory server-side; refresh so it is wearable right away.
  game.events.on('founder-claimed', () => {
    if (profile.guest) return;
    fetchInventory().then((m) => { setInventory(profile, m); wardrobe.refresh(); game.events.emit('inventory-changed'); })
      .catch(() => {});
  });       // Phase 10: activity stands out in the world
  game.events.on('minigame-start', () => { closeDrawers(); chat.close(); emotes.close(); ui.classList.add('in-minigame'); });
  game.events.on('minigame-end', () => ui.classList.remove('in-minigame'));
  game.events.on('coins-changed', (n) => { profile.coins = n; hud.setCoins(n); });     // reward from the server -> wallet/HUD immediately

  game.events.on('room-entered', (id, name) => {
    hud.setLocation(name);
    explore?.visit(id);                                      // Phase 8: first visits light up the world map
    if (!profile.guest && id !== profile.current_room) { profile.current_room = id; auth.savePlayerLocation(profile.id, id); }
  });
  game.events.on('door-prompt', (t) => hud.setPrompt(t));
  game.events.on('room-players', (n) => hud.setPlayers(n));
  // Phase 5: shops + rooms
  game.events.on('open-shop', (kind) => shop.open(kind));
  game.events.on('home-ready', ({ isOwner, guest }) => hud.setDecorate(isOwner && !guest));
  game.events.on('home-left', () => hud.setDecorate(false));
  game.events.on('room-title', (t) => hud.setLocation(t));

  if (!profile.guest) fetchInventory().then((m) => { setInventory(profile, m); wardrobe.refresh(); game.events.emit('inventory-changed'); })
    .catch((e) => toast('Could not load inventory: ' + e.message));

  // Phase 10: the dock shows which panel is open.
  const syncDock = () => {
    const open = { wardrobe: wardrobe?.isOpen?.(), friends: friends?.isOpen?.(), chat: chat?.isOpen?.(),
      settings: settings?.isOpen?.(), map: mapPanel?.isOpen?.(), journal: journal?.isOpen?.(), emotes: emotes?.isOpen?.() };
    for (const [k, v] of Object.entries(open)) hud.setOn(k, !!v);
    hud.setOn('avatar', !!open.wardrobe);
  };

  async function onAction(key) {
    queueMicrotask(syncDock);
    if (key === 'logout') return logout();
    if (key === 'wardrobe' || key === 'avatar') { if (!wardrobe.isOpen()) closeDrawers(); return wardrobe.toggle(key === 'avatar' ? 'look' : undefined); }
    if (key === 'friends') return friends.toggle();
    if (key === 'chat') return chat.toggle();
    if (key === 'emotes') return emotes.toggle();
    if (key === 'settings') return settings.toggle();
    if (key === 'fullscreen') {
      const ok = await toggleFullscreen();
      if (!ok) toast(fsSupported() ? 'Your browser would not go fullscreen.' : 'On iPhone, use Share ▸ Add to Home Screen for fullscreen.');
      return;
    }
    if (key === 'map') return mapPanel.toggle();
    if (key === 'journal') { unseen = 0; hud.setBadge('journal', 0); return journal.toggle(); }
    if (key === 'shop') return shop.open('clothing');
    if (key === 'home') return game.scene.getScene('Room')?.goHome?.();
    if (key === 'decorate') return game.scene.getScene('Room')?.startEdit?.();
    if (key === 'daily') {
      if (profile.guest) return toast('Create an account to claim daily rewards');
      try {
        const r = await claimDaily();
        profile.coins = r.balance; hud.setCoins(r.balance);
        if (r.item) { recordPurchase(profile, r.item); wardrobe.refresh(); }
        toast(r.item ? `Day ${r.day}: you got ${ITEM_BY_ID[r.item]?.name}!` : `Day ${r.day}: +${r.coins} Anchor Coins!`);
      } catch (e) { toast(e.message); }
    }
  }
}

async function logout() {
  [chat, friends, settings, mapPanel, emotes, social, arcade, minigames, journal, worldDialog, wallPanel, explore].forEach((x) => x?.destroy());
  ui.classList.remove('in-minigame');
  net?.destroy(); shop?.destroy(); wardrobe?.destroy(); hud?.destroy(); game?.destroy(true);
  game = hud = wardrobe = shop = net = social = chat = friends = settings = mapPanel = emotes = arcade = minigames = null;
  explore = journal = worldDialog = wallPanel = null;
  if (isConfigured) await auth.logout();
  mountAuth(ui, startGame);
}

(async function init() {
  const back = isConfigured ? auth.readAuthRedirect() : { confirmed: false, error: null };   // returning from the e-mail confirmation link?
  if (isConfigured) {
    const session = await auth.getSession();
    if (session) {
      try { const p = await auth.fetchProfile(session.user.id); startGame(p); if (back.confirmed) toast('Email confirmed — welcome to Anchors World!'); return; }
      catch { await supabase.auth.signOut(); }
    }
  }
  mountAuth(ui, startGame, back.error ? { notice: back.error } : back.confirmed ? { notice: 'Email confirmed! Log in to enter the world.', noticeOk: true } : {});
})();
