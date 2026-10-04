// Data-driven rooms. To add a room: add an entry here, then link a door/portal to it.
// building: { id,label,x,y,w,h,wall,roof,to }  -> collidable; door zone is auto-placed below it.
// portal:   { label,x,y,w,h,to,spawn }          -> walk-in zone (edges, interior exits).
// blocks:   [{x,y,w,h}]                         -> invisible/visible collision rectangles.
export const ROOMS = {
  snowy_plaza: {
    name: 'Snowy Plaza', w: 1800, h: 1100, floor: 'snow', spawn: { x: 900, y: 860 },
    buildings: [
      { label: 'Library',       x: 90,   y: 130, w: 230, h: 190, wall: 0x8c5a3a, roof: 0x3d5a80, to: 'library' },
      { label: 'School',        x: 370,  y: 140, w: 250, h: 180, wall: 0xc9553d, roof: 0x2e4057, to: 'school' },
      { label: 'Town Hall',     x: 720,  y: 70,  w: 360, h: 250, wall: 0xd8c9a3, roof: 0x4a6fa5, to: 'town_hall' },
      { label: 'Arcade',        x: 1180, y: 140, w: 250, h: 180, wall: 0x6a4fb3, roof: 0x2d2a5e, to: 'arcade' },
      { label: 'Café',          x: 1480, y: 150, w: 220, h: 170, wall: 0xb5703f, roof: 0xe8483c, to: 'cafe' },
      { label: 'Clothing Shop', x: 250,  y: 560, w: 220, h: 170, wall: 0x2a9d8f, roof: 0x1d6f66, to: 'clothing_shop' },
      { label: 'Furniture Shop',x: 1330, y: 560, w: 230, h: 170, wall: 0xe9a23b, roof: 0x9c5f12, to: 'furniture_shop' },
      { label: 'My Home',       x: 780,  y: 780, w: 240, h: 150, wall: 0x7fa6c9, roof: 0x34506b, to: 'home' },
    ],
    portals: [
      { label: 'Forest ▸', x: 0,    y: 440, w: 60, h: 220, to: 'forest', spawn: { x: 120, y: 550 } },
      { label: '◂ Beach',  x: 1740, y: 440, w: 60, h: 220, to: 'beach',  spawn: { x: 1680, y: 550 } },
    ],
    props: [{ type: 'pond', x: 900, y: 500, rx: 150, ry: 80 }],
    trees: [[60,60],[190,420],[640,430],[1160,430],[1650,430],[130,900],[420,950],[1400,930],[1680,880],[1720,1040],[60,1040],[640,980],[1130,1010],[560,720],[1240,720]],
  },
  cafe: {
    name: 'Café', w: 1000, h: 700, floor: 'wood', indoor: true, spawn: { x: 500, y: 560 },
    blocks: [
      { x: 60, y: 200, w: 120, h: 70, label: '☕' }, { x: 300, y: 260, w: 120, h: 70, label: '☕' },
      { x: 580, y: 260, w: 120, h: 70, label: '🍰' }, { x: 800, y: 200, w: 120, h: 70, label: '☕' },
      { x: 330, y: 440, w: 340, h: 50, label: 'Counter', color: 0x6b4428 },
    ],
    portals: [{ label: 'Exit ▾', x: 420, y: 650, w: 160, h: 50, to: 'snowy_plaza', spawn: { x: 500, y: 560 } }],
  },
  // Shops: walk to the counter and press E (or click it) to open the storefront.
  clothing_shop: {
    name: 'Snowy Threads', w: 1000, h: 700, floor: 'wood', indoor: true, spawn: { x: 500, y: 580 },
    blocks: [
      { x: 60, y: 230, w: 150, h: 60, label: '🧥 Coats', color: 0x2a9d8f }, { x: 250, y: 230, w: 150, h: 60, label: '👕 Shirts', color: 0x2a9d8f },
      { x: 600, y: 230, w: 150, h: 60, label: '👖 Pants', color: 0x2a9d8f }, { x: 790, y: 230, w: 150, h: 60, label: '🎩 Hats', color: 0x2a9d8f },
      { x: 80, y: 440, w: 90, h: 120, label: '👟', color: 0x1d6f66 }, { x: 830, y: 440, w: 90, h: 120, label: '🧣', color: 0x1d6f66 },
    ],
    kiosks: [{ label: 'Clothing Shop', x: 400, y: 300, w: 200, h: 60, action: 'clothing', icon: '🛍️ Try things on' }],
    portals: [{ label: 'Exit ▾', x: 420, y: 650, w: 160, h: 50, to: 'snowy_plaza', spawn: { x: 500, y: 580 } }],
  },
  furniture_shop: {
    name: 'Cozy Corner', w: 1000, h: 700, floor: 'wood', indoor: true, spawn: { x: 500, y: 580 },
    blocks: [
      { x: 60, y: 230, w: 150, h: 60, label: '🛋️ Sofas', color: 0xe9a23b }, { x: 250, y: 230, w: 150, h: 60, label: '🛏️ Beds', color: 0xe9a23b },
      { x: 600, y: 230, w: 150, h: 60, label: '💡 Lamps', color: 0xe9a23b }, { x: 790, y: 230, w: 150, h: 60, label: '🪴 Plants', color: 0xe9a23b },
      { x: 80, y: 440, w: 90, h: 120, label: '📚', color: 0x9c5f12 }, { x: 830, y: 440, w: 90, h: 120, label: '🧶', color: 0x9c5f12 },
    ],
    kiosks: [{ label: 'Furniture Shop', x: 400, y: 300, w: 200, h: 60, action: 'furniture', icon: '🛋️ Browse furniture' }],
    portals: [{ label: 'Exit ▾', x: 420, y: 650, w: 160, h: 50, to: 'snowy_plaza', spawn: { x: 500, y: 580 } }],
  },
  // The Arcade: walk up to a cabinet and press E (or click it) to pick a game; the board on the right opens the leaderboards.
  // Cabinets are data (`cabinets`): add a game by adding an entry here + in minigames/registry.js.
  arcade: {
    name: 'Arcade', w: 1100, h: 720, floor: 'arcade_floor', indoor: true, wallColor: 0x2d2a5e, spawn: { x: 550, y: 600 }, sign: 'ANCHOR ARCADE',
    cabinets: [
      { label: 'Snow Dash',      icon: '🏁', x: 90,  y: 160, w: 150, h: 150, color: 0x3f8fc9, action: 'arcade:snow_dash' },
      { label: 'Coin Catcher',   icon: '🪙', x: 290, y: 160, w: 150, h: 150, color: 0xe9a23b, action: 'arcade:coin_catcher' },
      { label: 'Snowball Arena', icon: '☃️', x: 490, y: 160, w: 150, h: 150, color: 0xd9546a, action: 'arcade:snowball_arena' },
      { label: 'Leaderboards',   icon: '🏆', x: 720, y: 160, w: 290, h: 150, color: 0x6a4fb3, action: 'arcade:leaderboard', board: true, verb: 'view' },
    ],
    blocks: [
      { x: 60,  y: 440, w: 130, h: 80, label: '🧸', color: 0x6a4fb3 }, { x: 910, y: 440, w: 130, h: 80, label: '🎈', color: 0x6a4fb3 },
      { x: 60,  y: 560, w: 130, h: 80, label: '🎟️', color: 0x3f8fc9 }, { x: 910, y: 560, w: 130, h: 80, label: '🏀', color: 0x3f8fc9 },
    ],
    portals: [{ label: 'Exit ▾', x: 470, y: 670, w: 160, h: 50, to: 'snowy_plaza', spawn: { x: 550, y: 600 } }],
  },
  // Player room TEMPLATE: one definition, loaded for any owner. The scene builds the floor/walls/furniture from the
  // owner's saved room (see rooms/HomeRoom.js), so every player gets their own layout without separate map code.
  home: {
    name: 'My Room', type: 'home', w: 960, h: 680, floor: 'wood', indoor: true, spawn: { x: 480, y: 560 },
    portals: [{ label: 'Exit ▾', x: 400, y: 630, w: 160, h: 50, to: 'snowy_plaza', spawn: { x: 480, y: 560 } }],
  },
};
