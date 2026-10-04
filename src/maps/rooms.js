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
      { label: 'Player Homes',  x: 780,  y: 780, w: 240, h: 150, wall: 0x7fa6c9, roof: 0x34506b, to: 'homes' },
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
};
