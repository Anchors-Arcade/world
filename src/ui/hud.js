// [icon, label, key]. Every dock button is live as of Phase 6.
const BUTTONS = [
  ['🗺️', 'Map', 'map'], ['🎒', 'Wardrobe', 'wardrobe'], ['🧥', 'Look', 'avatar'], ['🏠', 'My Room', 'home'], ['👥', 'Friends', 'friends'],
  ['💬', 'Chat', 'chat'], ['😄', 'Emotes', 'emotes'], ['🛍️', 'Shop', 'shop'], ['⚙️', 'Settings', 'settings'], ['🚪', 'Log out', 'logout'],
];

export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.getElementById('ui').appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

export function mountHUD(root, profile, { onAction }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="hud-top">
      <div class="pill"><b id="hn"></b><small id="hl">Snowy Plaza</small></div>
      <div class="pill coins"><span class="coin">⚓</span><span id="hc">0</span></div>
      <button class="pill gift" id="hd" title="Daily reward">🎁 Daily</button>
      <button class="pill gift deco" id="hb" title="Decorate your room" hidden>🛠️ Decorate</button>
      <div class="pill"><small id="hp2">👥 1 here</small></div>
    </div>
    <div class="prompt" id="hp"></div>
    <nav class="dock">${BUTTONS.map(([i, l, k]) => `<button data-key="${k}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
  root.appendChild(el);
  const q = (s) => el.querySelector(s);
  q('#hn').textContent = profile.display_name;
  const setCoins = (n) => (q('#hc').textContent = n.toLocaleString());
  setCoins(profile.coins);

  q('#hd').onclick = () => onAction('daily');
  q('#hb').onclick = () => onAction('decorate');
  el.querySelectorAll('.dock button').forEach((b, i) => (b.onclick = () => {
    const key = BUTTONS[i][2];
    if (key === 'logout') { if (confirm(profile.guest ? 'Leave the guest session?' : 'Log out?')) onAction('logout'); }
    else onAction(key);
  }));

  return {
    setCoins,
    // small red counter on a dock button (friend requests, unread chat); 0 hides it
    setBadge: (key, n) => {
      const b = el.querySelector(`.dock button[data-key="${key}"]`); if (!b) return;
      let i = b.querySelector('.badge');
      if (!n) return i?.remove();
      if (!i) { i = document.createElement('i'); i.className = 'badge'; b.appendChild(i); }
      i.textContent = n > 9 ? '9+' : n;
    },
    setLocation: (t) => (q('#hl').textContent = t),
    setDecorate: (on) => { q('#hb').hidden = !on; },
    setPlayers: (n) => (q('#hp2').textContent = `👥 ${n} here`),
    setPrompt: (t) => { const p = q('#hp'); p.textContent = t || ''; p.classList.toggle('on', !!t); },
    destroy: () => el.remove(),
  };
}
