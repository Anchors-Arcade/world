// Procedural placeholder art for every cosmetic. Replace any entry with a loaded image of the same key later.
const INK = 0x1b2a41;
const ART = {};
const add = (id, w, h, fn) => (ART[id] = [w, h, fn]);

add('av_beak', 12, 9, (g) => { g.fillStyle(INK); g.fillTriangle(0, 0, 12, 0, 6, 9); g.fillStyle(0xff9a3c); g.fillTriangle(2, 1, 10, 1, 6, 7); });

// eyes (30x14)
const eyeBase = (g) => { g.fillStyle(0xffffff); g.fillCircle(8, 7, 6); g.fillCircle(22, 7, 6); };
add('eyes_0', 30, 14, (g) => { eyeBase(g); g.fillStyle(INK); g.fillCircle(9, 8, 3); g.fillCircle(21, 8, 3); });
add('eyes_1', 30, 14, (g) => { g.lineStyle(3, INK); [8, 22].forEach((x) => { g.beginPath(); g.arc(x, 10, 5, Math.PI, 0, false); g.strokePath(); }); });
add('eyes_2', 30, 14, (g) => { g.lineStyle(3, INK); g.lineBetween(3, 8, 13, 8); g.lineBetween(17, 8, 27, 8); g.lineBetween(3, 8, 1, 11); g.lineBetween(27, 8, 29, 11); });
add('eyes_3', 30, 14, (g) => { eyeBase(g); g.fillStyle(INK); g.fillCircle(8, 7, 4.5); g.fillCircle(22, 7, 4.5); g.fillStyle(0xffffff); g.fillCircle(6.5, 5.5, 1.8); g.fillCircle(20.5, 5.5, 1.8); g.fillCircle(9.5, 9, 1); g.fillCircle(23.5, 9, 1); });

// face extras (36x20; eyes sit at y=7)
add('face_blush', 36, 20, (g) => { g.fillStyle(0xff7f96, 0.75); g.fillEllipse(5, 15, 9, 5); g.fillEllipse(31, 15, 9, 5); });
add('face_freckles', 36, 20, (g) => { g.fillStyle(0x8a5a36); [[4, 14], [8, 16], [6, 12], [32, 14], [28, 16], [30, 12]].forEach(([x, y]) => g.fillCircle(x, y, 1.2)); });
add('face_glasses', 36, 20, (g) => { g.lineStyle(2.5, 0x2b2b2b); g.strokeCircle(11, 7, 7.5); g.strokeCircle(25, 7, 7.5); g.lineBetween(18, 6, 18, 6); g.lineBetween(17.5, 6, 18.5, 6); });
add('face_sunglasses', 36, 20, (g) => { g.fillStyle(0x15151c); g.fillRoundedRect(2, 1, 15, 11, 4); g.fillRoundedRect(19, 1, 15, 11, 4); g.fillRect(16, 3, 4, 2); g.fillStyle(0xffffff, 0.35); g.fillRect(5, 3, 4, 2); g.fillRect(22, 3, 4, 2); });

// hats (anchored at y=-50)
const beanie = (color) => (g) => {
  g.fillStyle(INK); g.fillEllipse(20, 20, 40, 32); g.fillStyle(color); g.fillEllipse(20, 19, 35, 28);
  g.fillStyle(0xffffff); g.fillRoundedRect(2, 19, 36, 9, 4); g.fillStyle(color); [8, 18, 28].forEach((x) => g.fillRect(x, 20, 4, 7));
  g.fillStyle(0xffffff); g.fillCircle(20, 4, 5);
};
add('hat_beanie', 40, 30, beanie(0xe8483c));
add('hat_beanie_blue', 40, 30, beanie(0x3b82d9));
add('hat_earmuffs', 54, 30, (g) => { g.lineStyle(4, 0x3a3f4b); g.beginPath(); g.arc(27, 26, 21, Math.PI, 0, false); g.strokePath(); g.fillStyle(INK); g.fillCircle(6, 24, 8); g.fillCircle(48, 24, 8); g.fillStyle(0xff7a8a); g.fillCircle(6, 24, 6); g.fillCircle(48, 24, 6); });
add('hat_party', 28, 38, (g) => { g.fillStyle(INK); g.fillTriangle(14, 0, -1, 38, 29, 38); g.fillStyle(0xc44fd8); g.fillTriangle(14, 4, 3, 36, 25, 36); g.fillStyle(0xffe066); g.fillRect(7, 22, 14, 4); g.fillRect(10, 12, 8, 4); g.fillCircle(14, 3, 4); });
add('hat_tophat', 38, 36, (g) => { g.fillStyle(0x20222b); g.fillRoundedRect(7, 2, 24, 26, 3); g.fillEllipse(19, 30, 38, 9); g.fillStyle(0xe8483c); g.fillRect(7, 20, 24, 5); });
add('hat_crown', 36, 26, (g) => { g.fillStyle(INK); g.fillRect(2, 8, 32, 17); g.fillTriangle(2, 8, 2, -1, 11, 8); g.fillTriangle(13, 8, 18, -1, 23, 8); g.fillTriangle(25, 8, 34, -1, 34, 8); g.fillStyle(0xffc247); g.fillRect(4, 10, 28, 13); g.fillTriangle(4, 10, 4, 2, 11, 10); g.fillTriangle(14, 10, 18, 2, 22, 10); g.fillTriangle(25, 10, 32, 2, 32, 10); g.fillStyle(0x66d9ff); g.fillCircle(18, 17, 3); g.fillStyle(0xff6b8a); g.fillCircle(8, 17, 2); g.fillCircle(28, 17, 2); });

// neck accessories (anchored at y=-16)
add('accessory_scarf', 44, 22, (g) => { g.fillStyle(0xd7392e); g.fillRoundedRect(2, 0, 40, 10, 5); g.fillRoundedRect(26, 6, 9, 15, 3); g.fillStyle(0xffffff); [8, 18, 28, 36].forEach((x) => g.fillRect(x, 1, 3, 8)); g.fillRect(26, 12, 9, 3); });
add('accessory_bowtie', 22, 12, (g) => { g.fillStyle(INK); g.fillTriangle(0, 0, 0, 12, 11, 6); g.fillTriangle(22, 0, 22, 12, 11, 6); g.fillStyle(0xe8483c); g.fillTriangle(1.5, 2, 1.5, 10, 9, 6); g.fillTriangle(20.5, 2, 20.5, 10, 13, 6); g.fillCircle(11, 6, 3); });
add('accessory_bell', 30, 18, (g) => { g.fillStyle(0x2f9e5b); g.fillRoundedRect(0, 0, 30, 6, 3); g.fillStyle(INK); g.fillCircle(15, 11, 7); g.fillStyle(0xffc247); g.fillCircle(15, 11, 5.5); g.fillStyle(INK); g.fillRect(14, 12, 2, 4); });

// shirts (38x22)
add('shirt_stripe', 38, 22, (g) => { g.fillStyle(0x2f6fb5); g.fillRoundedRect(0, 0, 38, 22, 9); g.fillStyle(0xffffff); g.fillRect(0, 6, 38, 4); g.fillRect(0, 14, 38, 4); });
add('shirt_hoodie', 38, 22, (g) => { g.fillStyle(0x6d7a8c); g.fillRoundedRect(0, 0, 38, 22, 9); g.fillStyle(0x56627a); g.fillRoundedRect(9, 11, 20, 9, 3); g.fillStyle(0xffffff); g.fillRect(14, 1, 2, 8); g.fillRect(22, 1, 2, 8); });
add('shirt_sweater', 38, 22, (g) => { g.fillStyle(0x2b3a67); g.fillRoundedRect(0, 0, 38, 22, 9); g.fillStyle(0xffffff); for (let x = 4; x < 36; x += 8) { g.fillTriangle(x, 11, x + 4, 6, x + 8, 11); g.fillTriangle(x, 11, x + 4, 16, x + 8, 11); } g.fillStyle(0xe8483c); g.fillRect(0, 1, 38, 2); });
add('shirt_tux', 38, 22, (g) => { g.fillStyle(0x20222b); g.fillRoundedRect(0, 0, 38, 22, 9); g.fillStyle(0xffffff); g.fillTriangle(12, 0, 26, 0, 19, 14); g.fillStyle(0xe8483c); g.fillCircle(19, 14, 2.5); });

// pants (36x14)
const pants = (color, seam) => (g) => { g.fillStyle(color); g.fillRoundedRect(0, 0, 36, 14, { tl: 2, tr: 2, bl: 7, br: 7 }); g.fillStyle(seam); g.fillRect(17, 2, 2, 12); };
add('pants_jeans', 36, 14, pants(0x3b5b92, 0x2a4270));
add('pants_cargo', 36, 14, (g) => { pants(0x5b7a3a, 0x465f2c)(g); g.fillStyle(0x465f2c); g.fillRect(4, 6, 8, 5); g.fillRect(24, 6, 8, 5); });
add('pants_snow', 36, 14, (g) => { pants(0xff7a3c, 0xd95d22)(g); g.fillStyle(0xffffff); g.fillRect(0, 9, 36, 2); });

// shoes (18x10) — drawn for each foot
add('shoes_boots', 18, 10, (g) => { g.fillStyle(INK); g.fillRoundedRect(0, 0, 18, 10, 4); g.fillStyle(0x8a5a36); g.fillRoundedRect(1.5, 1.5, 15, 6, 3); g.fillStyle(0x3a2616); g.fillRect(1.5, 7.5, 15, 2); });
add('shoes_sneakers', 18, 10, (g) => { g.fillStyle(INK); g.fillRoundedRect(0, 0, 18, 10, 4); g.fillStyle(0xffffff); g.fillRoundedRect(1.5, 1.5, 15, 7, 3); g.fillStyle(0xe8483c); g.fillRect(3, 4, 12, 2); });
add('shoes_skates', 18, 12, (g) => { g.fillStyle(INK); g.fillRoundedRect(0, 0, 18, 8, 4); g.fillStyle(0xffffff); g.fillRoundedRect(1.5, 1.5, 15, 5, 3); g.fillStyle(0xb8c4d0); g.fillRect(0, 9, 18, 2); g.fillRect(2, 7, 2, 3); g.fillRect(14, 7, 2, 3); });

// back items (behind body)
add('back_backpack', 52, 40, (g) => { g.fillStyle(INK); g.fillRoundedRect(0, 0, 52, 40, 12); g.fillStyle(0x8a5a36); g.fillRoundedRect(2, 2, 48, 36, 10); g.fillStyle(0x6b4428); g.fillRoundedRect(14, 22, 24, 14, 4); g.fillStyle(0xffc247); g.fillRect(24, 8, 4, 6); });
add('back_cape', 60, 54, (g) => { g.fillStyle(INK); g.fillPoints([{ x: 12, y: 0 }, { x: 48, y: 0 }, { x: 60, y: 54 }, { x: 0, y: 54 }], true); g.fillStyle(0xd7392e); g.fillPoints([{ x: 14, y: 3 }, { x: 46, y: 3 }, { x: 56, y: 50 }, { x: 4, y: 50 }], true); g.fillStyle(0xffc247); g.fillRect(8, 48, 44, 3); });
add('back_wings', 76, 48, (g) => { [[16, 1], [60, -1]].forEach(([cx]) => { g.fillStyle(INK); g.fillEllipse(cx, 24, 32, 46); g.fillStyle(0xe9f8ff); g.fillEllipse(cx, 24, 28, 42); g.fillStyle(0xa9dcf5); g.fillEllipse(cx, 28, 18, 28); }); });

// hand items (anchored right of body)
add('hand_snowball', 15, 15, (g) => { g.fillStyle(0xaac8dd); g.fillCircle(7.5, 7.5, 7.5); g.fillStyle(0xffffff); g.fillCircle(6.5, 6.5, 6); });
add('hand_icecream', 16, 30, (g) => { g.fillStyle(0xd9a05b); g.fillTriangle(2, 14, 14, 14, 8, 29); g.fillStyle(0xff9fc1); g.fillCircle(8, 9, 7); g.fillStyle(0xfff0f5); g.fillCircle(6, 7, 2); });
add('hand_balloon', 24, 56, (g) => { g.lineStyle(1.5, 0x666666); g.lineBetween(12, 30, 8, 55); g.fillStyle(INK); g.fillEllipse(12, 14, 24, 28); g.fillStyle(0xe8483c); g.fillEllipse(12, 14, 21, 25); g.fillStyle(0xffffff, 0.5); g.fillEllipse(8, 8, 5, 8); g.fillStyle(0xe8483c); g.fillTriangle(8, 31, 16, 31, 12, 26); });
add('hand_umbrella', 42, 44, (g) => { g.lineStyle(3, 0x555b66); g.lineBetween(21, 14, 21, 42); g.fillStyle(INK); g.fillEllipse(21, 14, 42, 26); g.fillStyle(0x3b82d9); g.fillEllipse(21, 14, 38, 22); g.fillStyle(0xffffff); g.fillRect(19, 3, 4, 12); g.fillStyle(0x3b82d9); g.fillRect(0, 14, 42, 12); });

export function makeItemTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  for (const [key, [w, h, fn]] of Object.entries(ART)) { g.clear(); fn(g); g.generateTexture(key, w, h); }
  g.destroy();
}
