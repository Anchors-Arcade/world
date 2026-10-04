import Phaser from 'phaser';
import './ui/style.css';
import { BootScene } from './scenes/BootScene.js';
import { RoomScene } from './scenes/RoomScene.js';
import { mountAuth } from './ui/authUI.js';
import { mountHUD } from './ui/hud.js';
import * as auth from './database/auth.js';
import { isConfigured, supabase } from './config/supabase.js';

const ui = document.getElementById('ui');
let game = null, hud = null;

function startGame(profile) {
  hud = mountHUD(ui, profile, { onLogout: logout });
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#0e2238',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, RoomScene],
    callbacks: { preBoot: (g) => { g.registry.set('profile', profile); g.registry.set('reduceMotion', matchMedia('(prefers-reduced-motion: reduce)').matches); } },
  });
  game.events.on('room-entered', (id, name) => {
    hud.setLocation(name);
    // Persist location (throttled by nature: only on room change). Guests are never saved.
    if (!profile.guest && id !== profile.current_room) { profile.current_room = id; auth.savePlayerLocation(profile.id, id); }
  });
  game.events.on('door-prompt', (t) => hud.setPrompt(t));
}

async function logout() {
  game?.destroy(true); hud?.destroy(); game = hud = null;
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
