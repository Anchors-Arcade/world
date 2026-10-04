const BUTTONS = [
  ['🗺️', 'Map', 'Phase 5'], ['🎒', 'Items', 'Phase 4'], ['🧥', 'Avatar', 'Phase 4'], ['👥', 'Friends', 'Phase 6'],
  ['💬', 'Chat', 'Phase 6'], ['😄', 'Emotes', 'Phase 6'], ['🛍️', 'Shop', 'Phase 5'], ['⚙️', 'Log out', 'logout'],
];

export function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.getElementById('ui').appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

export function mountHUD(root, profile, { onLogout }) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="hud-top">
      <div class="pill"><b id="hn"></b><small id="hl">Snowy Plaza</small></div>
      <div class="pill coins"><span class="coin">⚓</span><span id="hc">0</span></div>
    </div>
    <div class="prompt" id="hp"></div>
    <nav class="dock">${BUTTONS.map(([i, l]) => `<button><span>${i}</span>${l}</button>`).join('')}</nav>`;
  root.appendChild(el);
  el.querySelector('#hn').textContent = profile.display_name;
  el.querySelector('#hc').textContent = profile.coins.toLocaleString();

  el.querySelectorAll('.dock button').forEach((b, i) => (b.onclick = () => {
    if (BUTTONS[i][2] === 'logout') { if (confirm(profile.guest ? 'Leave the guest session?' : 'Log out?')) onLogout(); }
    else toast(`${BUTTONS[i][1]} arrives in ${BUTTONS[i][2]}`);
  }));

  return {
    setLocation: (t) => (el.querySelector('#hl').textContent = t),
    setPrompt: (t) => { const p = el.querySelector('#hp'); p.textContent = t || ''; p.classList.toggle('on', !!t); },
    destroy: () => el.remove(),
  };
}
