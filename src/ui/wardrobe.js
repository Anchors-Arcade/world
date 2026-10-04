import { ITEMS, BODY_TYPES, BODY_COLORS, RARITY, normalizeAvatar } from '../shops/items.js';
import { saveAvatar, purchaseItem } from '../database/inventory.js';
import { toast } from './hud.js';

const TABS = [['look', 'Look'], ['hat', 'Hats'], ['accessory', 'Neck'], ['shirt', 'Shirts'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['back', 'Back'], ['hand', 'Hand'], ['face', 'Face']];
const BODY_LABEL = { round: 'Round', tall: 'Tall', chubby: 'Chubby' };

// Wardrobe = inventory + avatar editor. Equipping updates the world instantly (optimistic) and saves
// through the validating save_avatar() function; on failure it rolls back to the last saved outfit.
export function createWardrobe(root, { game, profile, onCoins }) {
  const el = document.createElement('aside');
  el.className = 'drawer'; el.hidden = true; root.appendChild(el);
  let tab = 'look', timer = null, lastSaved = { ...profile.avatar_data }, busy = false;
  const icons = new Map();

  const icon = (asset) => {
    if (!icons.has(asset) && game.textures.exists(asset)) {
      const src = game.textures.get(asset).getSourceImage(), c = document.createElement('canvas');
      c.width = c.height = 64;
      const k = Math.min(54 / src.width, 54 / src.height, 1.8);
      c.getContext('2d').drawImage(src, (64 - src.width * k) / 2, (64 - src.height * k) / 2, src.width * k, src.height * k);
      icons.set(asset, c.toDataURL());
    }
    return icons.get(asset) || '';
  };
  const owned = (it) => it.starter || profile.owned.has(it.id);

  function apply(av) {
    profile.avatar_data = normalizeAvatar(av);
    game.events.emit('outfit-changed', profile.avatar_data);
    render();
    if (profile.guest) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { lastSaved = { ...(await saveAvatar(profile.avatar_data)) }; }
      catch (e) { toast(e.message); profile.avatar_data = normalizeAvatar(lastSaved); game.events.emit('outfit-changed', profile.avatar_data); render(); }
    }, 600);
  }

  async function buy(it) {
    if (profile.guest) return toast('Create an account to buy items');
    if (busy) return; busy = true;
    try {
      const bal = await purchaseItem(it.id);
      profile.coins = bal; profile.owned.add(it.id); onCoins(bal);
      toast(`Bought ${it.name}!`);
      apply({ ...profile.avatar_data, [it.category]: it.id });
    } catch (e) { toast(e.message); }
    busy = false; render();
  }

  function card(it, equipped) {
    const ok = owned(it);
    const foot = equipped ? 'Wearing' : ok ? 'Wear' : `<span class="coin sm">⚓</span> ${it.price}`;
    return `<button class="item r-${it.rarity} ${equipped ? 'eq' : ''} ${ok ? '' : 'locked'}" data-id="${it.id}" title="${it.description} (${RARITY[it.rarity]})">
      <img src="${icon(it.asset)}" alt=""><b>${it.name}</b><small>${foot}</small></button>`;
  }

  function render() {
    const av = profile.avatar_data;
    const items = (cat) => ITEMS.filter((i) => i.category === cat);
    let body;
    if (tab === 'look') {
      body = `<h3>Body</h3><div class="row">${Object.keys(BODY_TYPES).map((b) => `<button class="chip ${av.bodyType === b ? 'on' : ''}" data-body="${b}">${BODY_LABEL[b]}</button>`).join('')}</div>
        <h3>Colour</h3><div class="row">${BODY_COLORS.map((c) => `<button class="sw ${av.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
        <h3>Eyes</h3><div class="grid">${items('eyes').map((i) => card(i, av.eyes === i.id)).join('')}</div>`;
    } else {
      body = `<div class="grid"><button class="item none ${av[tab] ? '' : 'eq'}" data-none="${tab}"><b>None</b><small>${av[tab] ? 'Take off' : 'Nothing on'}</small></button>
        ${items(tab).map((i) => card(i, av[tab] === i.id)).join('')}</div>`;
    }
    el.innerHTML = `<header><h2>Wardrobe</h2><button class="x" aria-label="Close">✕</button></header>
      <nav class="tabs2">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</nav>
      <div class="body">${body}</div>
      <footer>${profile.guest ? 'Guest mode: free items only, nothing is saved.' : 'Locked items cost Anchor Coins. Prices are checked on the server.'}</footer>`;
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const av = profile.avatar_data;
    if (t.classList.contains('x')) return close();
    if (t.dataset.tab) { tab = t.dataset.tab; return render(); }
    if (t.dataset.body) return apply({ ...av, bodyType: t.dataset.body });
    if (t.dataset.color) return apply({ ...av, color: t.dataset.color });
    if (t.dataset.none) return apply({ ...av, [t.dataset.none]: null });
    if (t.dataset.id) {
      const it = ITEMS.find((i) => i.id === t.dataset.id);
      if (!owned(it)) return buy(it);
      const equipped = av[it.category] === it.id;
      apply({ ...av, [it.category]: equipped && it.category !== 'eyes' ? null : it.id });
    }
  });
  const close = () => { el.hidden = true; };
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  return {
    open(t) { if (t) tab = t; render(); el.hidden = false; },
    toggle(t) { el.hidden ? this.open(t) : close(); },
    refresh: () => !el.hidden && render(),
    // used by the shop: equip an owned item / take a slot off. Same validated save path as the wardrobe itself.
    equip(it) { if (owned(it)) apply({ ...profile.avatar_data, [it.category]: it.id }); },
    unequip(slot) { apply({ ...profile.avatar_data, [slot]: null }); },
    destroy() { clearTimeout(timer); el.remove(); },
  };
}
