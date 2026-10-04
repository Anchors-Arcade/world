import { BODY_TYPES, LAYOUT, normalizeAvatar } from '../shops/items.js';
import { THEMES, hex } from '../rooms/themes.js';
import { DEFAULT_THEME } from '../rooms/roomRules.js';

// 2D-canvas twin of entities/Avatar.js (front view) so shop previews need no extra Phaser objects.
// Same layer order and offsets as Avatar: back, feet, body(tinted), pants, belly, shirt, accessory, eyes, beak, face, hat, hand.
const tintCache = new WeakMap();   // source image -> Map(colour -> tinted canvas)
function tinted(im, color) {
  let byColor = tintCache.get(im);
  if (!byColor) tintCache.set(im, (byColor = new Map()));
  if (byColor.has(color)) return byColor.get(color);
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0);
  byColor.set(color, c);
  return c;
}

export function drawAvatarPreview(game, canvas, data, scale = 2.6) {
  const d = normalizeAvatar(data), ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const ox = canvas.width / 2, oy = canvas.height - 26;
  const [sx, sy] = BODY_TYPES[d.bodyType], hy = -48 * (sy - 1);
  const src = (key) => (game.textures.exists(key) ? game.textures.get(key).getSourceImage() : null);
  const put = (img, x, y, kx = 1, ky = 1) => {
    if (!img) return;
    const w = img.width * kx * scale, h = img.height * ky * scale;
    ctx.drawImage(img, ox + x * scale - w / 2, oy + y * scale - h / 2, w, h);
  };
  const L = LAYOUT;
  // ground shadow
  ctx.fillStyle = 'rgba(27,51,80,.25)'; ctx.beginPath(); ctx.ellipse(ox, oy - 2, 20 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.fill();
  if (d.back) put(src(d.back), L.back.x, L.back.y);
  const shoe = src(d.shoes || 'av_foot'); put(shoe, -8, -4); put(shoe, 8, -4);
  const body = src('av_body'); if (body) put(tinted(body, d.color), 0, -2 - 24 * sy, sx, sy);
  if (d.pants) put(src(d.pants), 0, L.pants.y);
  put(src('av_belly'), 0, -20);
  if (d.shirt) put(src(d.shirt), 0, L.shirt.y);
  if (d.accessory) put(src(d.accessory), 0, L.accessory.y + hy * 0.3);
  put(src(d.eyes), 0, L.eyes.y + hy);
  put(src('av_beak'), 0, -28 + hy);
  if (d.face) put(src(d.face), 0, L.face.y + hy);
  if (d.hat) put(src(d.hat), 0, L.hat.y + hy);
  if (d.hand) put(src(d.hand), L.hand.x, L.hand.y);
}

// Furniture preview: the piece sitting on a swatch of the player's room floor.
export function drawFurniturePreview(game, canvas, item, themeKey = DEFAULT_THEME) {
  const ctx = canvas.getContext('2d'), th = THEMES[themeKey] || THEMES[DEFAULT_THEME], W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = hex(th.floorA); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = hex(th.floorB);
  for (let y = 0; y < H; y += 36) { ctx.fillRect(0, y, W, 3); for (let x = (y / 36) % 2 ? 40 : 100; x < W; x += 120) ctx.fillRect(x, y, 3, 36); }
  const img = game.textures.exists(item.asset) ? game.textures.get(item.asset).getSourceImage() : null;
  if (!img) return;
  const k = Math.min((W * 0.7) / img.width, (H * 0.7) / img.height, 2.6), w = img.width * k, h = img.height * k;
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(W / 2, H / 2 + h / 2 + 2, w / 2.1, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}
