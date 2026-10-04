import { BootScene } from './scenes/BootScene.js';
import { RoomScene } from './scenes/RoomScene.js';
import { mountAuth } from './ui/authUI.js';
import { mountHUD, toast } from './ui/hud.js';
import { createWardrobe } from './ui/wardrobe.js';
import { createShop } from './ui/shop.js';
import * as auth from './database/auth.js';
import { fetchInventory, setInventory, recordPurchase, claimDaily } from './database/inventory.js';
import { Network } from './multiplayer/Network.js';
import { normalizeAvatar, ITEM_BY_ID } from './shops/items.js';
import { isConfigured, supabase } from './config/supabase.js';

const ui = document.getElementById('ui');
let game = null, hud = null, wardrobe = null, shop = null, net = null;

function startGame(profile) {
  profile.avatar_data = normalizeAvatar(profile.avatar_data);
  profile.owned = new Set(); profile.inv = new Map();     // inv: item id -> quantity (furniture stacks)
  net = new Network(profile);

  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0e2238',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, RoomScene],
    callbacks: { preBoot: (g) => {
      g.registry.set('profile', profile); g.registry.set('net', net);
      g.registry.set('reduceMotion', matchMedia('(prefers-reduced-motion: reduce)').matches);
    } },
  });

  hud = mountHUD(ui, profile, { onAction });
  wardrobe = createWardrobe(ui, { game, profile, onCoins: (n) => hud.setCoins(n) });
  shop = createShop(ui, { game, profile, wardrobe, onCoins: (n) => hud.setCoins(n) });

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
    if (key === 'wardrobe') return wardrobe.toggle();
    if (key === 'shop') return shop.open('clothing');
    if (key === 'home') return game.scene.getScene('Room')?.goHome?.();
    if (key === 'decorate') return game.scene.getScene('Room')?.startEdit?.();
    if (key === 'avatar') return wardrobe.toggle('look');
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
  net?.leave(); shop?.destroy(); wardrobe?.destroy(); hud?.destroy(); game?.destroy(true);
  game = hud = wardrobe = shop = net = null;
  if (isConfigured) await auth.logout();
  mountAuth(ui, startGame);
}

(async function init() {
  if (isConfigured) {
    const session = await auth.getSession();
    if (session) { try { return startGame(await auth.fetchProfile(session.user.id)); } catch { await supabase.auth.signOut(); } }
  }
  mountAuth(ui, startGame);
})();
