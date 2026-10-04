import { BootScene } from './scenes/BootScene.js';
import { RoomScene } from './scenes/RoomScene.js';
import { mountAuth } from './ui/authUI.js';
import { mountHUD, toast } from './ui/hud.js';
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
import { MINIGAME_SCENES, MinigameManager } from './minigames/index.js';
import { SocialState } from './social/SocialState.js';
import { Network } from './multiplayer/Network.js';
import { normalizeAvatar, ITEM_BY_ID } from './shops/items.js';
import { isConfigured, supabase } from './config/supabase.js';

const ui = document.getElementById('ui');
let game = null, hud = null, wardrobe = null, shop = null, net = null, social = null, chat = null, friends = null, settings = null, mapPanel = null, emotes = null, arcade = null, minigames = null;

function startGame(profile) {
  profile.avatar_data = normalizeAvatar(profile.avatar_data);
  profile.owned = new Set(); profile.inv = new Map();     // inv: item id -> quantity (furniture stacks)
  net = new Network(profile);
  social = new SocialState(profile, net);                 // Phase 6: friends / blocks / presence (inert for guests)

  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0e2238',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, RoomScene, ...MINIGAME_SCENES],       // Phase 7: minigames are registered scenes, launched on demand by MinigameManager
    callbacks: { preBoot: (g) => {
      g.registry.set('profile', profile); g.registry.set('net', net); g.registry.set('social', social);
      g.registry.set('reduceMotion', matchMedia('(prefers-reduced-motion: reduce)').matches);
    } },
  });

  hud = mountHUD(ui, profile, { onAction });
  wardrobe = createWardrobe(ui, { game, profile, onCoins: (n) => hud.setCoins(n) });
  shop = createShop(ui, { game, profile, wardrobe, onCoins: (n) => hud.setCoins(n) });

  // Phase 6: social UI. The right-hand drawers (wardrobe, friends, settings, map) are mutually exclusive.
  const closeDrawers = () => [wardrobe, friends, settings, mapPanel].forEach((d) => d?.close?.());
  const sp = { game, profile, social, closeOthers: closeDrawers };
  friends = createFriends(ui, sp);
  settings = createSettings(ui, sp);
  mapPanel = createMapPanel(ui, sp);
  chat = createChat(ui, { game, profile, social, onUnread: (n) => hud.setBadge('chat', n) });
  emotes = createEmoteMenu(ui, { game });
  social.on(() => hud.setBadge('friends', social.incoming.length));
  social.start().catch((e) => toast('Friends & chat unavailable: ' + e.message));

  // Phase 7: Arcade + minigames. Games run as extra Phaser scenes while the Room scene is paused (networking stays connected).
  minigames = new MinigameManager(game);
  arcade = createArcade(ui, { game, profile, manager: minigames });
  game.events.on('open-arcade', (what) => arcade.open(what));
  game.events.on('minigame-start', () => { closeDrawers(); chat.close(); emotes.close(); ui.classList.add('in-minigame'); });
  game.events.on('minigame-end', () => ui.classList.remove('in-minigame'));
  game.events.on('coins-changed', (n) => { profile.coins = n; hud.setCoins(n); });     // reward from the server -> wallet/HUD immediately

  game.events.on('room-entered', (id, name) => {
    hud.setLocation(name);
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

  async function onAction(key) {
    if (key === 'logout') return logout();
    if (key === 'wardrobe' || key === 'avatar') { if (!wardrobe.isOpen()) closeDrawers(); return wardrobe.toggle(key === 'avatar' ? 'look' : undefined); }
    if (key === 'friends') return friends.toggle();
    if (key === 'chat') return chat.toggle();
    if (key === 'emotes') return emotes.toggle();
    if (key === 'settings') return settings.toggle();
    if (key === 'map') return mapPanel.toggle();
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
  [chat, friends, settings, mapPanel, emotes, social, arcade, minigames].forEach((x) => x?.destroy());
  ui.classList.remove('in-minigame');
  net?.destroy(); shop?.destroy(); wardrobe?.destroy(); hud?.destroy(); game?.destroy(true);
  game = hud = wardrobe = shop = net = social = chat = friends = settings = mapPanel = emotes = arcade = minigames = null;
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
