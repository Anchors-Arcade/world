const BUTTONS = [
  ['🗺️', 'Map', 'map', 'Phase 5'], ['🎒', 'Wardrobe', 'wardrobe'], ['🧥', 'Look', 'avatar'], ['👥', 'Friends', 'friends', 'Phase 6'],
  ['💬', 'Chat', 'chat', 'Phase 6'], ['😄', 'Emotes', 'emotes', 'Phase 6'], ['🛍️', 'Shop', 'shop', 'Phase 5'], ['🚪', 'Log out', 'logout'],
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
      <div class="pill"><small id="hp2">👥 1 here</small></div>
    </div>
    <div class="prompt" id="hp"></div>
    <nav class="dock">${BUTTONS.map(([i, l]) => `<button><span>${i}</span>${l}</button>`).join('')}</nav>`;
  root.appendChild(el);
  const q = (s) => el.querySelector(s);
  q('#hn').textContent = profile.display_name;
  const setCoins = (n) => (q('#hc').textContent = n.toLocaleString());
  setCoins(profile.coins);

  q('#hd').onclick = () => onAction('daily');
  el.querySelectorAll('.dock button').forEach((b, i) => (b.onclick = () => {
    const [, label, key, soon] = BUTTONS[i];
    if (key === 'logout') { if (confirm(profile.guest ? 'Leave the guest session?' : 'Log out?')) onAction('logout'); }
    else if (soon) toast(`${label} arrives in ${soon}`);
    else onAction(key);
  }));

  return {
    setCoins,
    setLocation: (t) => (q('#hl').textContent = t),
    setPlayers: (n) => (q('#hp2').textContent = `👥 ${n} here`),
    setPrompt: (t) => { const p = q('#hp'); p.textContent = t || ''; p.classList.toggle('on', !!t); },
    destroy: () => el.remove(),
  };
}
