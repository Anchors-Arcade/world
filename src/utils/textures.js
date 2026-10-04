import { makeItemTextures } from './itemArt.js';
import { makeFurnitureTextures } from './furnitureArt.js';

// All art is generated procedurally so the game runs with zero external assets.
// To use real artwork later, load images in BootScene.preload() under the same keys.
export function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const gen = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
  const INK = 0x1b2a41;

  // --- avatar layers (body is white so it can be tinted with the player's colour) ---
  gen('av_body', 44, 48, (g) => { g.fillStyle(INK); g.fillEllipse(22, 26, 44, 48); g.fillStyle(0xffffff); g.fillEllipse(22, 26, 39, 43); });
  gen('av_belly', 26, 28, (g) => { g.fillStyle(0xf4fbff); g.fillEllipse(13, 14, 26, 28); });
  gen('av_foot', 16, 8, (g) => { g.fillStyle(INK); g.fillEllipse(8, 4, 16, 8); g.fillStyle(0xff9a3c); g.fillEllipse(8, 4, 13, 6); });
  // --- world ---
  gen('snow', 64, 64, (g) => {
    g.fillStyle(0xe9f4fb); g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 26; i++) { g.fillStyle(i % 3 ? 0xffffff : 0xcfe4f2); g.fillCircle(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 2); }
  });
  gen('wood', 64, 64, (g) => {
    g.fillStyle(0xb9814f); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x9c693c); for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
    g.fillRect(20, 0, 2, 16); g.fillRect(44, 16, 2, 16); g.fillRect(12, 32, 2, 16); g.fillRect(36, 48, 2, 16);
  });
  gen('arcade_floor', 64, 64, (g) => {
    g.fillStyle(0x2b2757); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x34306a); g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
    g.fillStyle(0x5bb6e8, 0.55); g.fillCircle(16, 48, 2); g.fillCircle(48, 16, 2);
    g.fillStyle(0xff6fae, 0.45); g.fillCircle(48, 48, 1.6); g.fillCircle(16, 16, 1.6);
  });
  gen('pine', 96, 140, (g) => {
    g.fillStyle(0x6b4428); g.fillRect(42, 110, 12, 28);
    [[4, 70, 60], [18, 50, 50], [32, 30, 36]].forEach(([top, y, hw], i) => {
      const cy = 18 + i * 34;
      g.fillStyle(0x1f6b4f); g.fillTriangle(48, cy, 48 - hw / 1.2 - 12, cy + 52, 48 + hw / 1.2 + 12, cy + 52);
      g.fillStyle(0xffffff); g.fillTriangle(48, cy, 48 - 14 - i * 4, cy + 22, 48 + 14 + i * 4, cy + 22);
    });
  });
  gen('flake', 6, 6, (g) => { g.fillStyle(0xffffff); g.fillCircle(3, 3, 3); });
  g.destroy();
  makeItemTextures(scene);
  makeFurnitureTextures(scene);
}
