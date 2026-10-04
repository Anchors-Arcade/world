import { ROOMS } from '../maps/rooms.js';
import { esc } from './dom.js';

const ICON = { snowy_plaza: '❄️', cafe: '☕', clothing_shop: '🧥', furniture_shop: '🛋️', arcade: '🕹️' };

// World map drawer: pick a place and walk there. Shows how many of your friends are in each room (from the shared
// presence data, no extra subscriptions). Rooms that are not built yet simply do not appear.
export function createMapPanel(root, { game, profile, social, closeOthers }) {
  const el = document.createElement('aside');
  el.className = 'drawer'; el.hidden = true; root.appendChild(el);
  let here = 'snowy_plaza';

  function render() {
    if (el.hidden) return;
    const places = Object.entries(ROOMS).filter(([k]) => k !== 'home');
    el.innerHTML = `<header><h2>World Map</h2><button class="x" data-go="" aria-label="Close">✕</button></header>
      <div class="body">${places.map(([k, r]) => {
        const n = social.friendsIn(k);
        return `<button class="place ${k === here ? 'here' : ''}" data-go="${k}" ${k === here ? 'disabled' : ''}><span class="pi">${ICON[k] || '📍'}</span>
          <span class="nm"><b>${esc(r.name)}</b><small>${k === here ? 'You are here' : r.indoor ? 'Indoors' : 'Outdoors'}${n ? ` · 🟢 ${n} friend${n > 1 ? 's' : ''}` : ''}</small></span></button>`;
      }).join('')}
        <button class="place" data-go="home"><span class="pi">🏠</span><span class="nm"><b>My Room</b><small>Your own space</small></span></button></div>
      <footer>More places are coming soon!</footer>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
    const k = b.dataset.go; close();
    if (k) game.events.emit('join-room', k === 'home' ? { room: 'home', ownerId: profile.id } : { room: k });
  });
  const onRoom = (id) => { here = id; render(); };
  game.events.on('room-entered', onRoom);
  const off = social.on((ev) => ev.type === 'presence' && render());
  const close = () => { el.hidden = true; };
  const onEsc = (e) => e.key === 'Escape' && close();
  addEventListener('keydown', onEsc);

  return {
    open() { closeOthers?.(); el.hidden = false; render(); },
    toggle() { el.hidden ? this.open() : close(); }, close, isOpen: () => !el.hidden,
    destroy() { off(); removeEventListener('keydown', onEsc); game.events.off('room-entered', onRoom); el.remove(); },
  };
}
